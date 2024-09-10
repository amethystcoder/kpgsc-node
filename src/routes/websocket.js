const websocket = require("ws")
const generateUniqueId = require("../utils/generateUniqueId")

//add the websocket connection to send ffmpeg conversion process
const webSocketServer = new websocket.Server({
    port:3200
})

const clients = new Map()

webSocketServer.on("connection",(websock)=>{
    const id = generateUniqueId();
    const metadata = { id }

    //add the client to a map to store for later
    clients.set(websock, metadata)
    console.log("websocket connected")
    websock.on("message",(data,isBinary)=>{
        webSocketServer.clients.forEach((client)=>{
            clients.get(client)
        })
    })

    websock.on("close",(code,reason)=>{
        console.log(reason)
    })
    
    websock.on("error",(err)=>{
        console.log(err)
    })

})

module.exports = {webSocketServer,clients}