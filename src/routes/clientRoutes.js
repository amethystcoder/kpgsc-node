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

router.get('/',(req,res)=>{
    try {
        if (req.session.username) {
            res.redirect('./dashboard')
        }
        else{
            res.redirect('./login') 
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get("/initialize",async (req,res)=>{
    try {
        const newDb = await initializeDB();
        console.log(newDb)
        res.status(202).send('Database created successfully')
    } catch (error) {
        res.json({error})
    }
})

router.get('/login',(req,res)=>{
    try {
        res.render('../template/login')
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/dashboard',async (req,res)=>{
    try {
        if (req.session.username) {
            let totalLinks = await DBs.linksDB.getAllLinks(true)
            let totalServers = await DBs.serversDB.getAllservers(true)
            let totalDriveAccounts = await DBs.driveAuthDB.getAlldrive_auth(true)
            let Links = await DBs.linksDB.getAllLinks()
            let proxies = await DBs.proxyStore.getProxies()
            let brokenproxies = await DBs.proxyStore.getBrokenProxies()
            let linkviews = 0
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
                links:links
            })
        } else{
            res.redirect('./login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/settings',(req,res)=>{
    try {
        if (req.session.username) {
            res.render('../template/settings')
        } else{
            res.redirect('./login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/settings/:section',async (req,res)=>{
    try {
        if (req.session.username) {
            let section = req.params.section
            let acquiredSettings = await DBs.settingsDB.getAllsettings()
            let settings = {}
            for (let index = 0; index < acquiredSettings.length; index++) {
                settings[acquiredSettings[index].config] = acquiredSettings[index].var
            }
            settings.sublist = JSON.parse(settings.sublist).join(",")
            switch (section) {
                case "video":
                    res.render('../template/settings/video',{
                        settings
                    })
                    break;
                case "general":
                    res.render('../template/settings/general',{
                        settings
                    })
                    break;
                case "proxy":
                    let proxies = (await DBs.proxyStore.getProxies()).map(proxy => proxy.trim())
                    let brokenProxies = (await DBs.proxyStore.getBrokenProxies()).map(proxy => proxy.trim())
                    res.render('../template/settings/proxy',{
                        settings,proxies,brokenProxies
                    })
                    break;
                case "gdriveAuth":
                    let driveAuths = await DBs.driveAuthDB.getAlldrive_auth()
                    res.render('../template/settings/gdriveAuth',{
                        settings,driveAuths
                    })
                    break;
                default:
                    res.render('../template/settings',{
                        settings
                    })
                    break;
            }
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})


//video player
router.get('/video/:slug',async (req,res)=>{
    try {
        if (req.session.username) {
            let routeData = {}
            const type = req.query.type || ""
            let slug = req.params.slug
            let isHls = (type == "hls")
            let videoLink = type == "hls" ? `../api/hls/${slug}` : `../api/stream/${slug}`
            let videoMime = type == "hls" ? `application/x-mpegURL` : `video/mp4`
            //get all available link Data
            let linkData = (await DBs.linksDB.getLinkUsingSlug(slug))[0]
            let player = await DBs.settingsDB.getConfig("player")
            res.render(`../template/players/${player[0].var}`,{
                slug:slug,videoLink:videoLink,isHls:isHls,videoMime:videoMime,subtitles:linkData.subtitles,preview_img:linkData.preview_img,title:linkData.title
            })
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/links/:type',async (req,res)=>{
    try {
        if (req.session.username) {
            let type = req.params.type
            let linkData = []
            if (type == "all") linkData = await DBs.linksDB.getAllLinks()
            if (type == "active") linkData = await DBs.linksDB.getActiveLinks()
            if (type == "paused") linkData = await DBs.linksDB.getPausedLinks()
            if (type == "broken") linkData = await DBs.linksDB.getBrokenLinks()
            res.render('../template/links',{
                type:type,linkData:linkData
            })
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/link/new',(req,res)=>{
    try {
        if (req.session.username) {
            let title = "New Link"
            res.render('../template/linkcreate',{
                title:title
            })
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/link/:linkid',async (req,res)=>{
    try {
        if (req.session.username) {
            let accounts = await DBs.driveAuthDB.getAlldrive_auth()
            accounts = accounts.map(account => account.email)
            const linkId = req.params.linkid
            const linkData = await DBs.linksDB.getLinkUsingId(linkId)
            let title = `Edit link ${linkId}`
            res.render('../template/linkedit',{
                title:title,
                data:linkData[0],
                emails:accounts
            })
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/servers',async (req,res)=>{
    try {
        if (req.session.username) {
            let serverData = await DBs.serversDB.getAllservers()
            res.render('../template/servers',{
                servers:serverData
            })
        } else{
            res.redirect('./login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/ads', async (req,res)=>{
    try {
        if (req.session.username) {
            let ads = await DBs.adsDB.getAllads();
            res.render('../template/ads',{
                ads
            })
        } else{
            res.redirect('./login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/hls/:type',async (req,res)=>{
    try {
        if (req.session.username) {
            let hlsData = [];
            let type = req.params.type
            if (type == "all") hlsData = await DBs.hlsLinksDB.getAllhls_links(false,true)
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
                type,hlsData
            })
        } else{
            res.redirect('../login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})

router.get('/bulk',async (req,res)=>{
    try {
        if (req.session.username) {
            //get the emails of all active auths
            let driveEmails = await DBs.driveAuthDB.getDistinct("email","status=true")
            res.render('../template/bulk',{
                driveEmails
            })
        } else{
            res.redirect('./login')
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
})


module.exports = router