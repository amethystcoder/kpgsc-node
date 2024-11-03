let express = require('express')
const router = express.Router()
const fs = require('fs');
const crypto = require('crypto')
const path = require('path')
const sources = require("../sources/sources")
const getSourceName = require("../utils/getSourceName")
const DB = require('../db/DBs')
const generateUniqueId = require('../utils/generateUniqueId')
const Streamer = require('../services/streamer')
const bcrypt = require('bcryptjs')
const getGdriveData = require("../services/getGdriveData");
const getIdFromUrl = require('../utils/getIdFromUrl');
const parseFileSizeToReadable = require('../utils/parseFileSizesToReadable');
const {convertVideo} = require('../utils/convertUnusableCodec')
const {encryptVideoStream} = require('../utils/encryptMediaFile')
const {auth,firewall,upload,rateLimit} = require("./middlewares");
const {sendHlsRequest,sendMultipleHlsRequest} = require('../services/sendHlsRequest');
let fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

let captchas = []

router.get("/health",(req,res)=>{
    try {
        res.json({data:"ok"})
    } catch (error) {
        res.json({error})
    }
})

router.post("/convert/hls",firewall, auth, rateLimit, async (req,res)=>{
    try {
        let {email,linkId, persistenceId} = req.body
        const data = await sendHlsRequest(email,persistenceId,linkId)
        req.session.rateLimit++
        res.status(202).send({success:true,message:"successful",data:data})
    } catch (error) {
        console.log(error);
        res.json({error})
    }
})

router.post("/hls/bulkconvert",firewall, auth, rateLimit,async (req,res)=>{
    try {
        //Attempt to finish up later
        let {email, persistenceId} = req.body
        let servers = req.body.serverIds.split(',')
        let links = req.body.links.split(',')
        const data = await sendMultipleHlsRequest(email,persistenceId,servers,links)
        res.status(202).send({message:"successful",data:data})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.delete("/hls/delete/:id",firewall,auth,async (req,res)=>{
    try {
        //get hls data from the database
        let hlsData = (await DB.hlsLinksDB.getHlsLinkUsingId(req.params.id))[0]
        const hlsServerId = hlsData.server_id
        //get serverData
        let serverData = (await DB.serversDB.getServerUsingId(hlsServerId))[0]
        const serverDomain = serverData.domain
        const response = await fetch(serverDomain+"/api/hls/delete/"+hlsServerId,{
            method:"DELETE",
            headers: {'Content-Type': 'application/json'}
        })
        const data = await response.json()   
        res.status(202).send({message:"successful",data:data})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.delete("/hls/Multidelete/:ids",async (req,res)=>{
    try {
        let ids = req.params.ids.split("-")
        //get the respective ids of the server and server data for each hls Link
        let allServers = await DB.serversDB.getAllservers()
        //for each server id, pack the hls id for them and send all to the hls
        const hlsDatas = await DB.hlsLinksDB.getHlsLinkUsingId(ids[0],ids.slice(1))
        let serverWTData = allServers.map((server)=>{
            return {
                hlsData: hlsDatas.filter((hlsdata)=>hlsdata.server_id == server.id).map((hlsdata)=> hlsdata.id),
                domain: server.domain,
                id: server.id
            }
        })
        for (let index = 0; index < serverWTData.length; index++) {
            if (serverWTData[index].hlsData.length > 0) {
                const response = await fetch(serverWTData[index].domain+"/api/hls/Multidelete/"+serverWTData[index].hlsData.join("-"),{
                    method:"DELETE",
                    headers: {'Content-Type': 'application/json'}
                })
                const data = await response.json()
            }
        }
        res.status(202).send({message:"successful"})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.post("/link/create",firewall,auth,upload.fields([{name:'video_file',maxCount:1},
    {name:'subtitles',maxCount:1},{name:'preview_img',maxCount:1}]),async (req,res)=>{
        //find a way to get the video file name. either from the slug or the file itself
    try {
        let main_link = ""
        let slug = ""
        const {title,alt_link} = req.body
        if(req.body.link_select == "link"){
            main_link = req.body.main_link
            if (!main_link || main_link == '') throw EvalError("Main Link was not provided. Please provide main Link")
        }
        if (req.body.link_select == "ftp") {
            const {ip_address,username,password,file_name} = req.body
            main_link = "https://ftp_link.com"
        }
        if (req.body.link_select == "upload") {
            const {video_file} = req.files
            const allowedMimes = ["video/mp4"]
            if (!video_file || video_file.length == 0) throw EvalError("Please Upload a video and try again")
            main_link = req.protocol+"://"+req.headers.host+"/api/getmediafile/"+video_file[0].filename
            slug = video_file[0].filename.slice(0,video_file[0].lastIndexOf(".")) //without the extensions
            //multer takes care of uploading the files from here
        }
        const subtitles = req.files.subtitles ? req.protocol+"://"+req.headers.host+"/api/getmediafile/"+req.files.subtitles[0].filename : ""
        const preview_img = req.body.preview_img_link ? req.body.preview_img_link : req.files.preview_img ? req.protocol+"://"+req.headers.host+"/api/getmediafile/"+req.files.preview_img[0].filename : ""
        //Write code to save files from links like gdrive to upload folder
        let linkSource = getSourceName(main_link)
        let type = linkSource
        slug = slug == "" ? slug : generateUniqueId(50) //check if the slug has already been set i.e by an uploaded file
        let data = ""
        if (linkSource == "GoogleDrive") {
            let linkId = getIdFromUrl(main_link,type)
            data = await getGdriveData(linkId) //this gets the stream paths from google dirve that are usually saved in `data`
        }
        let linkdata = {title,main_link,alt_link,subtitles:subtitles,preview_img:preview_img,type,slug,data:JSON.stringify(data)}
        if (!linkSource || linkSource == '') throw EvalError("Incorrect link provided. Check that the link is either a GDrive, Yandex, Box, OkRu or Direct link")
        let newLinkCreate = await DB.linksDB.createNewLink(linkdata)
        //convert file to mp4
        //let convertedFile = await convertVideo("../uploads/"+slug)//get the file extension somehow
        //get settings
        let autoConvert = (await DB.settingsDB.getConfig("autoConvert"))[0].var
        if (autoConvert == "1") {
            let {email, persistenceId} = req.body
            //get link through slug
            let linkId = (await DB.linksDB.getLinkUsingSlug(slug))[0].id
            const data = await sendHlsRequest(email,persistenceId,linkId)
            req.session.rateLimit++
        }
        res.status(201).json({success:true,message:newLinkCreate})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.delete("/link/delete/:id",firewall,auth,async (req,res)=>{
    try {
        const linkid = req.params.id
        //delete all files relating to link
        const link = await DB.linksDB.getLinkUsingId(linkid)
        //deletable items include subtitle and preview image
        if (link[0].subtitles && link[0].subtitles != "") {
            fs.unlink(path.join(__dirname,`../uploads/${subtitles}`), (err) => { if (err) throw err;}); //determine this later
        }
        if (link[0].preview_img && link[0].preview_img != "") {
            fs.unlink(path.join(__dirname,`../uploads/${preview_img}`), (err) => { if (err) throw err;}); //determine this later
        }
        const newLinkDelete = await DB.linksDB.deleteUsingId(linkid)
        res.status(201).json({success:true,message:newLinkDelete})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/link/deleteMult/:ids",firewall,auth,async (req,res)=>{
    try {
        let LinkDeletes = []
        const linkids = req.params.ids.split("-")
        for (let index = 0; index < linkids.length; index++) {
            //delete all files relating to link
            const link = await DB.linksDB.getLinkUsingId(linkids[index])
            //deletable items include subtitle and preview image
            if (link[0].subtitles && link[0].subtitles != "") {
                fs.unlink(path.join(__dirname,`../uploads/${subtitles}`), (err) => { if (err) throw err;}); //determine this later
            }
            if (link[0].preview_img && link[0].preview_img != "") {
                fs.unlink(path.join(__dirname,`../uploads/${preview_img}`), (err) => { if (err) throw err;}); //determine this later
            }
            let linkdel = await DB.linksDB.deleteUsingId(linkids[index])
            LinkDeletes.push(linkdel)
        }
        res.status(201).json({success:true,message:LinkDeletes})
    } catch (error) {
        res.json({error})
    }
})

router.post("/login",firewall, async (req,res)=>{
    try {
        const username = req.body.username.toLowerCase()
        const password = req.body.password
        const captcha = req.body.captcha
        let loggedIn = false
        let userExists = false
        let users = await DB.usersDB.getAllusers()
        let iscaptcha = (await DB.settingsDB.getConfig("allowCaptcha"))[0].var
        if (iscaptcha == "1") {
            if (!captchas.includes(captcha)) throw Error("captcha is not valid")
            captchas.splice(captchas.indexOf(captcha))   
        }
        for (let index = 0; index < users.length; index++) {
            if (users[index].username == username) {
                userExists = true
                loggedIn = await bcrypt.compare(password,users[index].password)
                if (loggedIn){
                    req.session.username = users[index].username
                    req.session.id = users[index].id
                    req.session.requestsMade = 0
                    req.session.loginTime = Date.now()
                    break;
                }
            }
        }
        res.json({success:true,userExists:userExists,loggedIn:loggedIn})   
    } catch (error) {
        res.json({error:error})
    }
})

/* router.get("/initialize",async (req,res)=>{
    try {
        //
    } catch (error) {
        res.json({error})
    }
}) */

router.get("/logout",firewall,async (req,res)=>{
    try {
        req.session.destroy()
        res.status(200).json({message:"successfully logged out",success:true})
    } catch (error) {
        res.json({error})
    }
})

router.get("/captcha/code",firewall,async (req,res)=>{
    try {
        let captchaCode = generateUniqueId(5)
        captchas.push(captchaCode)
        //set expiry for captcha after 6mins
        setTimeout(()=>{
            captchas.splice(captchas.indexOf(captchaCode))
        },360000)
        res.status(200).json({message:captchaCode,success:true})
    } catch (error) {
        res.json({error})
    }
})

router.get("/stream/:slug",firewall,auth,async (req,res)=>{
    try {
        //get all required data from headers and check if they are correct
        let range = req.headers.range
        const slug = req.params.slug
        if (!range) throw Error("Cannot Stream. Range not included in headers")

        //get link for streaming using id
        const linkData = await DB.linksDB.getLinkUsingSlug(slug)
        let source = getSourceName(linkData[0].main_link)
        
        //set headers
        range = Number(range.replace(/\D/g,""));

        let streamingData = Streamer.streamVideoFile(slug,source,range)//we need to be able to determine the kind of source
        //encrypt video data
        res.writeHead(206,streamingData.headers)
        /* let encryptedStream = await encryptVideoStream(streamingData.videoStream,crypto.randomBytes(32),crypto.randomBytes(16))//note to create code for getting the key e.t.c
        encryptedStream.pipe(res) */
        streamingData.videoStream.pipe(res)
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.get("/hls/:slug/:slugId",firewall,auth,async (req,res)=>{
    try {
        const listOfAcceptableSegmentExtensions = ["ts","js","png","jpg"]
        let slug = req.params.slug
        let slugId = req.params.slugId
        let splitVid = slugId.split(".")
        let vidExt = splitVid[splitVid.length - 1]
        let hlsStreamData;
        hlsStreamData = await Streamer.getHlsFileData(slug,listOfAcceptableSegmentExtensions.filter((validExtension)=>validExtension == vidExt).length > 0,slugId)
        res.status(200).send(hlsStreamData)
    } catch (error) {
        console.log(error)
        res.send({error:error})
    }
})

router.post("/server/create",firewall,auth,async (req,res)=>{
    try {
        // we need to test the server that it is working properly
        const {name, domain, type} = req.body
        let status = false
        //send a request to the servers health route
        const response = await fetch(`${domain}/api/health`,{
            method:"GET"
        }).catch(err => console.log(err))//this is the defining factor apparently
        let data = null
        if (response) data = await response.json()
        if (data && data.data == "ok") status = true
        let createServer = await DB.serversDB.createNewServer({name,domain,type,status})
        res.status(201).json({success:true,message:createServer})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.put("/server/edit/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        const {name, domain, type} = req.body
        let updateServer = await DB.serversDB.updateUsingId(id,["name","domain","type"],[name,domain,type])
        res.status(201).json({success:true})
    } catch (error) {
        res.json({error})
    }
})

router.patch("/server/edit/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        const {value,name} = req.body
        let updateServer = await DB.serversDB.updateUsingId(id,[name],[value])
        res.status(201).json({success:true})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/server/delete/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        let DeleteServer = await DB.serversDB.deleteUsingId(id)
        res.status(201).json({success:true,message:DeleteServer})
    } catch (error) {
        res.json({error})
    }
})

router.post("/p2pstats/create",firewall,auth,(req,res)=>{
    try {
        const {upload,download,peers} = req.body
        const ipAddress = (req.ip 
        || req.socket.remoteAddress // incase `trust proxy did not work for some reason` 
        || req.headers['x-forwarded-for']);
        const country = "";//get from client
        const device = "";//get from client
        const date = new Date().toUTCString();
        DB.p2pStatsDB.createNewP2PData({upload,download,peers,country,date,device,ipAddress})
    } catch (error) {
        res.json({error})
    }
})

router.post("/ads/create",firewall,auth,async (req,res)=>{
    try {
        const {title,type} = req.body
        let createAd = await DB.adsDB.createNewAd({title,type})
        res.status(201).send({message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.get("/ads/request",firewall,auth,async (req,res)=>{
    try {
        let popUpAds = await DB.popupsDB.getAllPopUpAds()
        let vastAds = await DB.adsDB.getAllads()
        res.status(201).send({successful:true,popUpAds,vastAds})
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.put("/ads/edit/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        const {title,type} = req.body
        let EditAd = await DB.adsDB.updateUsingId(id,["title","type"],[title,type])
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.patch("/ads/edit/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        const {name,value} = req.body
        let EditAd = await DB.adsDB.updateUsingId(id,[name],[value])
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/ads/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        let deleteAd = await DB.adsDB.deleteUsingId(id);
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.post("/pop_ads/create",firewall,auth,upload.single("pop_img"),async (req,res)=>{
    try {
        const {title,content,link,start_offset} = req.body
        const pop_img = req.file ? req.protocol+"://"+req.headers.host+"/"+req.file.filename : ""
        DB.popupsDB.createNewAd({title,content,link,start_offset,image:pop_img})
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/pop_ads/:id",firewall,auth,async (req,res)=>{
    try {
        const id = req.params.id
        let deleteAd = await DB.popupsDB.deleteUsingId(id);
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.post("/vast_ads/create",firewall,auth,async (req,res)=>{
    try {
        const {title,type,xml_file,start_offset} = req.body
        DB.adsDB.createNewAd({title,type,xml_file,start_offset})
        res.status(201).send({success:true,message:"successful"})
    } catch (error) {
        res.json({error})
    }
})

router.post("/bulk",firewall,auth,async (req,res)=>{
    try {
        const {links,email} = req.body
        let results = []
        console.log(req.body)
        for (let index = 0; index < links.length; index++) {
            data = {
                main_link:links[index],
                title:"untitled"+Date.now(),
                slug:generateUniqueId(50),
                type:getSourceName(links[index])
            }
            let result = await DB.linksDB.createNewLink(data)
            results.push(result) 
        }
        res.status(202).send({success:true,message:results})
    } catch (error) {
        res.json({error})
    }
})

router.post("/proxies/create",firewall,auth,async (req,res)=>{
    try {
        let results = await DB.proxyStore.AddProxies(req.body.proxies)
        res.status(202).send({success:true,message:results})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/proxies/delete",firewall,auth,async (req,res)=>{
    try {
        let results = await DB.proxyStore.removeProxies(req.body.proxy)
        res.status(202).send({success:true,message:results})
    } catch (error) {
        res.json({error})
    }
})

router.post("/brokenproxies/create",firewall,auth,async (req,res)=>{
    try {
        let results = await DB.proxyStore.AddBrokenProxies(req.body.proxies)
        res.status(202).send({success:true,message:results})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/brokenproxies/delete",firewall,auth,async (req,res)=>{
    try {
        let results = await DB.proxyStore.removeBrokenProxies(req.body.proxy)
        res.status(202).send({success:true,message:results})
    } catch (error) {
        res.json({error})
    }
})

router.post("/auth/gauth/create",firewall,auth,async (req,res)=>{
    try {
        const {client_id,client_secret,refresh_token,email} = req.body;
        let result = await DB.driveAuthDB.createNewAuth({client_id,client_secret,refresh_token,email,access_token:generateUniqueId(20)})
        let redirectUri = "http://localhost:3000/settings/gdriveAuth" //need to determine this to know where to go back to after google has authorised the user
        let OAuth = sources.GoogleDrive.generateOauth(client_id,client_secret,redirectUri)
        let AuthUrl = sources.GoogleDrive.generateGoogleAuthUrl(OAuth)
        res.status(202).send({success:true,message:result,link:AuthUrl,client_id:client_id})
    } catch (error) {
        res.json({error})
    }
})

router.post("/auth/gdriveAuth",firewall,auth,async (req,res)=>{
    try {
        const {client_id,code,scopes} = req.body
        let authData = await DB.driveAuthDB.getAuthUsingClientID(client_id)
        let OAuth = sources.GoogleDrive.generateOauth(client_id,authData[0].client_secret,"http://localhost:3000/settings/gdriveAuth")
        const { tokens } = await OAuth.getToken(code)
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        OAuth.setCredentials({access_token:accessToken,refresh_token:refreshToken})
        const result = DB.driveAuthDB.updateUsingId(authData[0].id,["access_token","refresh_token"],[accessToken,refreshToken])
        res.status(202).send({success:true,result})
    } catch (error) {
        res.json({error})
    }
})

router.delete("/auth/gauth/delete/:id",firewall,auth,async (req,res)=>{
    try {
        const driverAuthId = req.params.id
        let deleteComplete = await DB.driveAuthDB.deleteUsingId(driverAuthId)
        res.status(202).send({success:true,message:deleteComplete})
    } catch (error) {
        res.json({error})
    }
})

router.post("/proxyauth",firewall,auth,async (req,res)=>{
    try {
        let {proxy_server_username,proxy_server_password} = req.body
        const result = await DB.settingsDB.updateSettings(['proxyUser','proxyPass'],[proxy_server_username,proxy_server_password])
        res.status(202).send({success:true,message:result})
    } catch (error) {
        res.json({error})
    }
})

router.patch("/settings/edit",firewall,auth,async (req,res)=>{
    try {
        let {name,value} = req.body
        const result = await DB.settingsDB.updateSettings(name,value)
        res.status(202).send({success:true,message:result})
    } catch (error) {
        res.json({error})
    }
})

router.get("/getmediafile/:filename",firewall, auth, async (req,res)=>{
    try {
        const fileName = req.params.filename
        res.sendFile(path.join(__dirname,`../uploads/${fileName}`))
    } catch (error) {
        res.json({error})
    }
})

router.patch("/settings/upload_edit",firewall,auth,upload.single("filename"),async (req,res)=>{
    try {
        let {name} = req.body
        //we have to check if there is any already in the database and delete it if it is not the default
        const existingFileLocationInDB = (await DB.settingsDB.getConfig(name))[0].var
        //get the file location from the database
        //check if it is the default file i.e from static, if not, delete the existing logo
        if(!existingFileLocationInDB.includes("/static/icons")){
            let fileNameFromDBSplit = existingFileLocationInDB.split("/")
            let fileNameFromDB = fileNameFromDBSplit[fileNameFromDBSplit.length - 1]
            fs.unlink(path.join(__dirname,`../uploads/${fileNameFromDB}`),(err)=>console.log(err))
        }
        const video_file = req.protocol+"://"+req.headers.host+"/api/getmediafile/"+req.file.filename
        const result = await DB.settingsDB.updateSettings(name,video_file)
        res.status(202).send({success:true})
    } catch (error) {
        res.json({error})
    }
})

router.post('signalP2P',async (req,res)=>{
    
})

module.exports = router;