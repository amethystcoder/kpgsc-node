/**
 * This module deals with the routes that describe the client side 
 * and the templates to display
 */

const expressapp = require('express')
const router = expressapp.Router({mergeParams:true,strict:false,caseSensitive:true})
const DBs = require('../db/DBs')
const sources = require("../sources/sources")
const initializeDB = require('../db/configs/initializeDB')
const getSource = require('../utils/getSourceName')
const { json } = require('body-parser')
const { default: axios } = require('axios')
const fs = require('fs')
const {firewall,authClient} = require("./middlewares")

router.get('/',firewall,authClient,(req,res)=>{
    try {
        res.redirect('./dashboard')
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

/* router.get("/initialize",async (req,res)=>{
    try {
        //const newDb = await initializeDB();
        res.render('../template/configuration',{})
    } catch (error) {
        res.json({error})
    }
}) */

router.get('/login',firewall,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let iscaptcha = (await DBs.settingsDB.getConfig("allowCaptcha"))[0].var
        res.render('../template/login',{
            logo,favicon,iscaptcha
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/dashboard',firewall,authClient,async (req,res)=>{
    try {
        let totalLinks = await DBs.linksDB.getAllLinks(true)
        let totalServers = await DBs.serversDB.getAllservers(true)
        let totalDriveAccounts = await DBs.driveAuthDB.getAlldrive_auth(true)
        let Links = await DBs.linksDB.getAllLinks()
        let proxies = await DBs.proxyStore.getProxies()
        let brokenproxies = await DBs.proxyStore.getBrokenProxies()
        let linkviews = 0
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        for (let index = 0; index < Links.length; index++) {
            linkviews += Links[index].views
        }
        let linknums = {}
        for (let index = 0; index < Links.length; index++) {
            if (linknums[getSource(Links[index].main_link)] ) {
                linknums[getSource(Links[index].main_link)] += 1
            }
            else{
                linknums[getSource(Links[index].main_link)] = 1
            }
        }
        let analytics = {
            totalLinks: totalLinks[0]["COUNT(*)"],
            totalServers: totalServers[0]["COUNT(*)"],
            totalDriveAccounts: totalDriveAccounts[0]["COUNT(*)"],
            proxies:proxies.length,
            brokenproxies:brokenproxies.length,
            linktypes:linknums,
            views:linkviews
        }
        let links = await DBs.linksDB.getActiveLinks()
        let totalViews = 0
        for (let index = 0; index < links.length; index++) {
            totalViews += links[index].views
        }
        analytics.totalViews = totalViews
        res.render('../template/dashboard',{
            analytics:analytics,
            links:links,logo,favicon
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/settings',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        res.render('../template/settings',{logo,favicon})
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/settings/:section',firewall,authClient,async (req,res)=>{
    try {
        let section = req.params.section
        let acquiredSettings = await DBs.settingsDB.getAllsettings()
        let settings = {}
        for (let index = 0; index < acquiredSettings.length; index++) {
            settings[acquiredSettings[index].config] = acquiredSettings[index].var
        }
        let logo = settings.logo
        let favicon = settings.favicon
        settings.sublist = JSON.parse(settings.sublist).join(",")
        switch (section) {
            case "video":
                res.render('../template/settings/video',{
                    settings,logo,favicon
                })
                break;
            case "general":
                res.render('../template/settings/general',{
                    settings,logo,favicon
                })
                break;
            case "security":
                res.render('../template/settings/security',{
                    settings,logo,favicon
                })
                break;
            case "proxy":
                let proxies = (await DBs.proxyStore.getProxies()).map(proxy => proxy.trim())
                let brokenProxies = (await DBs.proxyStore.getBrokenProxies()).map(proxy => proxy.trim())
                res.render('../template/settings/proxy',{
                    settings,proxies,brokenProxies,logo,favicon
                })
                break;
            case "gdriveAuth":
                let driveAuths = await DBs.driveAuthDB.getAlldrive_auth()
                res.render('../template/settings/gdriveAuth',{
                    settings,driveAuths,logo,favicon
                })
                break;
            default:
                res.render('../template/settings',{
                    settings,logo,favicon
                })
                break;
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})


//video player
router.get('/video/:slug',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let drm = (await DBs.settingsDB.getConfig("drm"))[0].var
        const type = req.query.type || ""
        let slug = req.params.slug
        let isHls = (type == "hls")
        let videoLink = type == "hls" ? `../api/hls/${slug}/${slug}` : `../api/stream/${slug}` //check if `drm` is on, then use direct m3u8 link
        if (isHls && drm == "0") {
            videoLink = `../videos/${slug}/${slug}.m3u8`
        }
        let videoMime = type == "hls" ? `application/x-mpegURL` : `video/mp4`
        //get all available link Data
        let linkData = (await DBs.linksDB.getLinkUsingSlug(slug))[0] //might be more than one link with the same ?slug?
        let OtherSources = await DBs.hlsLinksDB.getHlsLinkUsinglinkId(linkData.id)
        OtherSources = OtherSources.filter((othsrc)=>othsrc)
        let sources = [linkData,...OtherSources]
        sources = sources.map((source)=>{
            return {...source,link:`${req.url.split("?")[0]}${source.server_id ? '?sId='+source.server_id : ''}${!source.slug ? '&type=hls': ''}`}
        })
        //othersources might also be several when it is in microservices architechture
        let player = await DBs.settingsDB.getConfig("player")
        res.render(`../template/players/${player[0].var}`,{
            slug:slug,videoLink:videoLink,isHls:isHls,
            videoMime:videoMime,subtitles:linkData.subtitles,
            preview_img:linkData.preview_img,title:linkData.title,
            logo:logo,favicon:favicon,sources:sources
        })
    } catch (error) {
        console.log(error)
        res.render('../template/error',{
            error
        })
    }
})

router.get('/links/:type',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let type = req.params.type
        let linkData = []
        if (type == "all") linkData = await DBs.linksDB.getAllLinks()
        if (type == "active") linkData = await DBs.linksDB.getActiveLinks()
        if (type == "paused") linkData = await DBs.linksDB.getPausedLinks()
        if (type == "broken") linkData = await DBs.linksDB.getBrokenLinks()
        res.render('../template/links',{
            type:type,linkData:linkData,logo,favicon
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/link/new',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let accounts = await DBs.driveAuthDB.getAlldrive_auth()
        accounts = accounts.map(account => account.email)
        let title = "New Link"
        res.render('../template/linkcreate',{
            title:title,logo,favicon,emails:accounts
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/link/:linkid',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let accounts = await DBs.driveAuthDB.getAlldrive_auth()
        accounts = accounts.map(account => account.email)
        const linkId = req.params.linkid
        const linkData = await DBs.linksDB.getLinkUsingId(linkId)
        const hlsData = await DBs.hlsLinksDB.getHlsLinkUsinglinkId(linkId)
        let title = `Edit link ${linkId}`
        res.render('../template/linkedit',{
            title:title,
            data:linkData[0],
            emails:accounts,logo,favicon
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/servers',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let serverData = await DBs.serversDB.getAllservers()
        res.render('../template/servers',{
            servers:serverData,logo,favicon
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/ads',firewall, authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let ads = await DBs.adsDB.getAllads();
        let popups = await DBs.popupsDB.getAllPopUpAds();
        res.render('../template/ads',{
            ads,logo,favicon,popups
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/hls/:type',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        let accounts = await DBs.driveAuthDB.getAlldrive_auth()
        accounts = accounts.map(account => account.email)
        let hlsData = [];
        let type = req.params.type
        if (type == "all"){
            hlsData = await DBs.hlsLinksDB.getAllhls_links()
            for (let index = 0; index < hlsData.length; index++) {
                let linkData = await DBs.linksDB.getLinkUsingId(hlsData[index].link_id)
                linkData[0].hls_id = hlsData[index].id
                linkData[0].serverId = hlsData[index].server_id
                linkData[0].file_size = hlsData[index].file_size
                hlsData[index] = linkData[0]
            }
        }
        if (type == "bulk") {
            let links = await DBs.linksDB.getAllLinks()
            let hlsLinks = await DBs.hlsLinksDB.getAllhls_links()
            let linkIds = hlsLinks.map(hlsLink => hlsLink.link_id)
            hlsData = links.filter(link=>!linkIds.includes(link.id))
        }
        if (type == "failed") hlsData = await DBs.hlsLinksDB.getFailedhls_links(false,true)
        if (type == "broken") {
            let links = await DBs.linksDB.getBrokenLinks()
            let hlsLinks = await DBs.hlsLinksDB.getAllhls_links()
            let linkIds = hlsLinks.map(hlsLink => hlsLink.link_id)
            hlsData = links.filter(link=>linkIds.includes(link.id))
        }
        res.render('../template/hls',{
            type,hlsData,logo,favicon,emails:accounts
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/bulk',firewall,authClient,async (req,res)=>{
    try {
        let logo = (await DBs.settingsDB.getConfig("logo"))[0].var
        let favicon = (await DBs.settingsDB.getConfig("favicon"))[0].var
        //get the emails of all active auths
        let driveEmails = await DBs.driveAuthDB.getDistinct("email","status=true")
        res.render('../template/bulk',{
            driveEmails,logo,favicon
        })
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})


module.exports = router