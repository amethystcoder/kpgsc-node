const websocket = require("ws")
const generateUniqueId = require("../utils/generateUniqueId")

//add the websocket connection to send ffmpeg conversion process
const webSocketServer = new websocket.Server({
    port:3200
})

const clients = new Map()
const activeVideoConnections = new Map()

webSocketServer.on("connection",(websock)=>{

    //add the client to a map to store for later
    websock.on("message",(data,isBinary)=>{
        //only messages to come through here are messages to persist connection to a particular client using their persistence id
        let Message = JSON.parse(data.toString())

        if (Message.type){
            const id = generateUniqueId();
            const metadata = { id, persistenceId:Message.persistenceId }

            if (Message.type == "conversionTrack") clients.set(websock, metadata)
            if (Message.type == "p2pconnection") {}
            if (Message.type == "vidWatchconnection") activeVideoConnections.set(websock, metadata)
        }
    })

    websock.on("close",(code,reason)=>{
        //we need to remove the client from the map
        console.log("connection closed")
        clients.delete(websock)
        activeVideoConnections.delete(websock)
    })
    
    websock.on("error",(err)=>{
        console.log(err)
    })

})

module.exports = {webSocketServer,clients,activeVideoConnections}