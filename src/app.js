const cluster = require('cluster')
const os = require('os')
const express = require('express')
const expressApp = require('./hls_server/server')
const path = require('path')
const websocket = require("websocket")
const ws = require("ws")

const cpus = os.cpus();

if (cpus.length > 0) {
    
}

//add the websocket connection to send ffmpeg conversion process
const webSocketServer = new ws.Server({
    noServer:true
})

webSocketServer.on("connection",(websock)=>{
    websock.on("message",(data,isBinary)=>{
    })

    websock.on("close",(code,reason)=>{
        console.log(reason)
    })
    
    websock.on("error",(err)=>{
        console.log(err)
    })

})

expressApp.use(express.static(path.join(__dirname,'template')))
expressApp.use(express.static(path.join(__dirname,'utils')))
expressApp.use(express.static(path.join(__dirname,'uploads')))

const apiRoutes = require('./routes/Apiroutes');
expressApp.use('/api',apiRoutes);

const clientRoutes = require('./routes/clientRoutes')
expressApp.use('/',clientRoutes)

const PORT = 3000

expressApp.listen(PORT,()=>{
    console.log("listening on port",PORT)
})