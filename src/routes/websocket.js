const websocket = require("ws")
const generateUniqueId = require("../utils/generateUniqueId")

//add the websocket connection to send ffmpeg conversion process
const webSocketServer = new websocket.Server({
    port:3200
})

const clients = new Map()

webSocketServer.on("connection",(websock)=>{

    //add the client to a map to store for later
    websock.on("message",(data,isBinary)=>{
        //only messages to come through here are messages to persist connection to a particular client using their persistence id
        const id = generateUniqueId();
        const metadata = { id, persistenceId: data.toString() }
        clients.set(websock, metadata)
    })

    websock.on("close",(code,reason)=>{
        console.log("connection closed")
    })
    
    websock.on("error",(err)=>{
        console.log(err)
    })

})

module.exports = {webSocketServer,clients}