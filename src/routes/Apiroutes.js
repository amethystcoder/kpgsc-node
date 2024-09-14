let express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs');
const HlsConverter = require("../utils/ffmpeg")
const sources = require("../sources/sources")
const getSourceName = require("../utils/getSourceName")
const DB = require('../db/DBs')
const generateUniqueId = require('../utils/generateUniqueId')
const Streamer = require('../services/streamer')
const bcrypt = require('bcryptjs')
const getGdriveData = require("../services/getGdriveData");
const getIdFromUrl = require('../utils/getIdFromUrl');
const path = require('path');
const parseFileSizeToReadable = require('../utils/parseFileSizesToReadable');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads');  // 'uploads/' is the directory
    },
    filename: function (req, file, cb) {
      cb(null, generateUniqueId(25) + path.extname(file.originalname));
    }
  });
const upload = multer({storage:storage})

//auth middleware
const auth = (req,res,next) => {
    try {
        if (req.session.username) {
            next()
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.status(401).send({success:false,message:"unauthorized"})
    }
}

router.get("/health",(req,res)=>{
    try {
        res.json({data:"ok"})
    } catch (error) {
        res.json({error})
    }
})

router.post("/convert/hls", async (req,res)=>{
    try {
        if (req.session.username) {
            let {email,linkId, persistenceId} = req.body
            let linkData = await DB.linksDB.getLinkUsingId(linkId)
            let linkSource = getSourceName(linkData[0].main_link)
            if (!linkSource || linkSource == '') throw EvalError("Incorrect link provided. Check that the link is either a GDrive, Yandex, Box, OkRu or Direct link")
            const sourceId = getIdFromUrl(linkData[0].main_link,linkSource)
            // from the source type, determine how to convert it to hls
            let downloadFile;
            if(linkSource == "GoogleDrive"){
                let authData = await DB.driveAuthDB.getAuthUsingEmail(email)
                downloadFile = await sources.GoogleDrive.downloadGdriveVideo(authData[0],sourceId,linkData[0].slug)} 
            if(linkSource == "Direct") downloadFile = await sources.Direct.downloadFile(linkData[0].main_link,linkData[0].slug)
            const convert = await HlsConverter.createHlsFiles(`./uploads/${linkData[0].slug}.mp4`,linkData[0].slug,linkData[0].title,persistenceId)
            let fileSize = parseFileSizeToReadable((await fs.promises.stat(`./uploads/${linkData[0].slug}.mp4`)).size)
            let result = DB.hlsLinksDB.createNewHlsLink({
                link_id:linkId,server_id:'35',file_id:linkData[0].slug,status:true,file_size:fileSize
            })//get server id later
            //servers would be selected randomly for the first part
            res.status(202).send({success:true,message:"successful",data:convert})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        console.log(error);
        res.json({error})
    }
})

router.post("/hls/bulkconvert",async (req,res)=>{
    try {
        if (req.session.username) {
            //Attempt to finish up later
            let {email, persistenceId} = req.body
            let authData = await DB.driveAuthDB.getAuthUsingEmail(email)
            let servers = req.body.serverIds.split(',')
            let links = req.body.links.split(',')
            let availableServers = await DB.serversDB.getServerUsingType("hls")
            for (let index = 0; index < links.length; index++) {
                let linkData = await DB.linksDB.getLinkUsingId(links[index])
                let linkSource = getSourceName(linkData[0].main_link)
                if (!linkSource || linkSource == '') throw EvalError("Incorrect link provided. Check that the link is either a GDrive, Yandex, Box, OkRu or Direct link")
                const sourceId = getIdFromUrl(linkData[0].main_link,linkSource)
                // from the source type, determine how to convert it to hls
                let downloadFile;
                if(linkSource == "GoogleDrive"){
                    downloadFile = await sources.GoogleDrive.downloadGdriveVideo(authData[0],sourceId,linkData[0].slug)}
                if(linkSource == "Direct") downloadFile = await sources.Direct.downloadFile(linkData[0].main_link,linkData[0].slug)
                const convert = await HlsConverter.createHlsFiles(`./uploads/${linkData[0].slug}.mp4`,linkData[0].slug,linkData[0].title,persistenceId)
                let fileSize = parseFileSizeToReadable((await fs.promises.stat(`./uploads/${linkData[0].slug}.mp4`)).size)
                let result = DB.hlsLinksDB.createNewHlsLink({
                    link_id:links[index],server_id:'35',file_id:linkData[0].slug,status:true,file_size:fileSize
                })//get server id later
            }
            res.status(202).send({message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.post("/link/create",upload.fields([{name:'video_file',maxCount:1},
    {name:'subtitles',maxCount:1},{name:'preview_img',maxCount:1}]),async (req,res)=>{
    try {
        if (req.session.username) {
            let main_link = ""
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
                main_link = req.protocol+"://"+req.headers.host+"/"+video_file[0].filename
            }
            const subtitles = req.files.subtitles ? req.protocol+"://"+req.headers.host+"/"+req.files.subtitles[0].filename : ""
            const preview_img = req.files.preview_img ? req.protocol+"://"+req.headers.host+"/"+req.files.preview_img[0].filename : ""
            //Write code to save files to upload folder
            let linkSource = getSourceName(main_link)
            let type = linkSource
            let slug = generateUniqueId(50)
            let data = ""
            if (linkSource == "GoogleDrive") {
                let linkId = getIdFromUrl(main_link,type)
                data = await getGdriveData(linkId)
            }
            let linkdata = {title,main_link,alt_link,subtitles:subtitles,preview_img:preview_img,type,slug,data:JSON.stringify(data)}
            if (!linkSource || linkSource == '') throw EvalError("Incorrect link provided. Check that the link is either a GDrive, Yandex, Box, OkRu or Direct link")
            let newLinkCreate = await DB.linksDB.createNewLink(linkdata) 
            res.status(201).json({success:true,message:newLinkCreate})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.delete("/link/delete/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const linkid = req.params.id
            //delete all files relating to link
            const link = await DB.linksDB.getLinkUsingId(linkid)
            //deletable items include subtitle and preview image
            if (link[0].subtitles && link[0].subtitles != "") {
                fs.unlink(`../uploads/${subtitles}`, (err) => { if (err) throw err;}); //determine this later
            }
            if (link[0].preview_img && link[0].preview_img != "") {
                fs.unlink(`../uploads/${preview_img}`, (err) => { if (err) throw err;}); //determine this later
            }
            const newLinkDelete = await DB.linksDB.deleteUsingId(linkid)
            res.status(201).json({success:true,message:newLinkDelete})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/link/deleteMult/:ids",async (req,res)=>{
    try {
        if (req.session.username) {
            let LinkDeletes = []
            const linkids = req.params.ids.split("-")
            for (let index = 0; index < linkids.length; index++) {
                //delete all files relating to link
                const link = await DB.linksDB.getLinkUsingId(linkids[index])
                //deletable items include subtitle and preview image
                if (link[0].subtitles && link[0].subtitles != "") {
                    fs.unlink(`../uploads/${subtitles}`, (err) => { if (err) throw err;}); //determine this later
                }
                if (link[0].preview_img && link[0].preview_img != "") {
                    fs.unlink(`../uploads/${preview_img}`, (err) => { if (err) throw err;}); //determine this later
                }
                let linkdel = await DB.linksDB.deleteUsingId(linkids[index])
                LinkDeletes.push(linkdel)
            }
            res.status(201).json({success:true,message:LinkDeletes})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/login", async (req,res)=>{
    try {
        const username = req.body.username.toLowerCase()
        const password = req.body.password
        let loggedIn = false
        let userExists = false
        let users = await DB.usersDB.getAllusers()
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
        res.json({error})
    }
})

router.get("/logout",async (req,res)=>{
    try {
        req.session.destroy()
        res.status(200).json({message:"successfully logged out",success:true})
    } catch (error) {
        res.json({error})
    }
})

router.get("/stream/:slug",async (req,res)=>{
    try {
        if (req.session.username) {
            //get all required data from headers and check if they are correct
            let range = req.headers.range
            const slug = req.params.slug
            if (!range) res.status(400).send("Cannot Stream. Range not included in headers")

            //get link for streaming using id
            const linkData = await DB.linksDB.getLinkUsingSlug(slug)
            let source = getSourceName(linkData[0].main_link)
            
            //set headers
            range = Number(range.replace(/\D/g,""));

            let streamingData = Streamer.streamVideoFile(slug,source,range)//we need to be able to determine the kind of source
            res.writeHead(206,streamingData.headers)
            streamingData.videoStream.pipe(res)
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        console.log(error)
        res.json({error})
    }
})

router.get("/hls/:slug",async (req,res)=>{
    try {
        if (req.session.username) {
            let slug = req.params.slug
            let splitVid = slug.split(".")
            let vidExt = splitVid[splitVid.length - 1]
            let hlsStreamData;
            if (vidExt && vidExt == "ts") {
                hlsStreamData = await Streamer.getHlsDataFile(slug,true)
            }
            else{
                hlsStreamData = await Streamer.getHlsDataFile(slug)
            }
            res.status(200).send(hlsStreamData)
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/server/create",async (req,res)=>{
    try {
        if (req.session.username) {
            const {name, domain, type} = req.body
            let createServer = await DB.serversDB.createNewServer({name,domain,type})
            res.status(201).json({success:true,message:createServer})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.put("/server/edit/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            const {name, domain, type} = req.body
            let updateServer = await DB.serversDB.updateUsingId(id,["name","domain","type"],[name,domain,type])
            res.status(201).json({success:true})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.patch("/server/edit/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            const {value,name} = req.body
            let updateServer = await DB.serversDB.updateUsingId(id,[name],[value])
            res.status(201).json({success:true})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/server/delete/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            let DeleteServer = await DB.serversDB.deleteUsingId(id)
            res.status(201).json({success:true,message:DeleteServer})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/p2pstats/create",(req,res)=>{
    try {
        if (req.session.username) {
            const {upload,download,peers} = req.body
            const ipAddress = (req.ip 
            || req.socket.remoteAddress // incase `trust proxy did not work for some reason` 
            || req.headers['x-forwarded-for']);
            const country = "";//get from client
            const device = "";//get from client
            const date = new Date().toUTCString();
            DB.p2pStatsDB.createNewP2PData({upload,download,peers,country,date,device,ipAddress})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/ads/create",async (req,res)=>{
    try {
        if (req.session.username) {
            const {title,type} = req.body
            let createAd = await DB.adsDB.createNewAd({title,type})
            res.status(201).send({message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.put("/ads/edit/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            const {title,type} = req.body
            let EditAd = await DB.adsDB.updateUsingId(id,["title","type"],[title,type])
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.patch("/ads/edit/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            const {name,value} = req.body
            let EditAd = await DB.adsDB.updateUsingId(id,[name],[value])
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/ads/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            let deleteAd = await DB.adsDB.deleteUsingId(id);
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/pop_ads/create",upload.single("pop_img"),async (req,res)=>{
    try {
        if (req.session.username) {
            const {title,content,link,start_offset} = req.body
            const pop_img = req.file ? req.protocol+"://"+req.headers.host+"/"+req.file.filename : ""
            DB.popupsDB.createNewAd({title,content,link,start_offset,image:pop_img})
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/pop_ads/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const id = req.params.id
            let deleteAd = await DB.popupsDB.deleteUsingId(id);
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/vast_ads/create",async (req,res)=>{
    try {
        if (req.session.username) {
            const {title,type,xml_file,start_offset} = req.body
            DB.adsDB.createNewAd({title,type,xml_file,start_offset})
            res.status(201).send({success:true,message:"successful"})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/bulk",async (req,res)=>{
    try {
        if (req.session.username) {
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
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/proxies/create",async (req,res)=>{
    try {
        if (req.session.username) {
            let results = await DB.proxyStore.AddProxies(req.body.proxies)
            res.status(202).send({success:true,message:results})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/proxies/delete",async (req,res)=>{
    try {
        if (req.session.username) {
            let results = await DB.proxyStore.removeProxies(req.body.proxy)
            res.status(202).send({success:true,message:results})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/brokenproxies/create",async (req,res)=>{
    try {
        if (req.session.username) {
            let results = await DB.proxyStore.AddBrokenProxies(req.body.proxies)
            res.status(202).send({success:true,message:results})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/brokenproxies/delete",async (req,res)=>{
    try {
        if (req.session.username) {
            let results = await DB.proxyStore.removeBrokenProxies(req.body.proxy)
            res.status(202).send({success:true,message:results})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/auth/gauth/create",async (req,res)=>{
    try {
        if (req.session.username) {
            const {client_id,client_secret,refresh_token,email} = req.body;
            let result = await DB.driveAuthDB.createNewAuth({client_id,client_secret,refresh_token,email,access_token:generateUniqueId(20)})
            let redirectUri = "http://localhost:3000/settings/gdriveAuth" //need to determine this to know where to go back to after google has authorised the user
            let OAuth = sources.GoogleDrive.generateOauth(client_id,client_secret,redirectUri)
            let AuthUrl = sources.GoogleDrive.generateGoogleAuthUrl(OAuth)
            res.status(202).send({success:true,message:result,link:AuthUrl,client_id:client_id})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/auth/gdriveAuth",async (req,res)=>{
    try {
        if (req.session.username) {
            const {client_id,code,scopes} = req.body
            let authData = await DB.driveAuthDB.getAuthUsingClientID(client_id)
            let OAuth = sources.GoogleDrive.generateOauth(client_id,authData[0].client_secret,"http://localhost:3000/settings/gdriveAuth")
            const { tokens } = await OAuth.getToken(code)
            const accessToken = tokens.access_token;
            const refreshToken = tokens.refresh_token;
            OAuth.setCredentials({access_token:accessToken,refresh_token:refreshToken})
            const result = DB.driveAuthDB.updateUsingId(authData[0].id,["access_token","refresh_token"],[accessToken,refreshToken])
            res.status(202).send({success:true,result})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.delete("/auth/gauth/delete/:id",async (req,res)=>{
    try {
        if (req.session.username) {
            const driverAuthId = req.params.id
            let deleteComplete = await DB.driveAuthDB.deleteUsingId(driverAuthId)
            res.status(202).send({success:true,message:deleteComplete})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.post("/proxyauth",async (req,res)=>{
    try {
        if (req.session.username) {
            let {proxy_server_username,proxy_server_password} = req.body
            const result = await DB.settingsDB.updateSettings(['proxyUser','proxyPass'],[proxy_server_username,proxy_server_password])
            res.status(202).send({success:true,message:result})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.patch("/settings/edit",async (req,res)=>{
    try {
        if (req.session.username) {
            let {name,value} = req.body
            const result = await DB.settingsDB.updateSettings(name,value)
            res.status(202).send({success:true,message:result})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})

router.patch("/settings/upload_edit",upload.single("filename"),async (req,res)=>{
    try {
        if (req.session.username) {
            let {name} = req.body
            const video_file = req.protocol+"://"+req.headers.host+"/"+req.file.filename
            const result = await DB.settingsDB.updateSettings(name,video_file)
            res.status(202).send({success:true})
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.json({error})
    }
})



module.exports = router;