const websocket = require("ws")

//add the websocket connection to send ffmpeg conversion process
const webSocketServer = new websocket.Server({
    noServer:true
})

webSocketServer.on("connection",(websock)=>{
    console.log("websocket connected")
    websock.on("message",(data,isBinary)=>{
        webSocketServer.clients.forEach((client)=>{
            if(client.readyState === websocket.OPEN){
                client.send(data.toString())
            }
        })
    })

    websock.on("close",(code,reason)=>{
        console.log(reason)
    })
    
    websock.on("error",(err)=>{
        console.log(err)
    })

})