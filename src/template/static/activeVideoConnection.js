window.addEventListener("DOMContentLoaded",(ev)=>{

    let persistenceId = sessionStorage.getItem("persistenceId")
    if(!persistenceId){
        //create a new persistenceId (or request from serverSide)
        persistenceId = generateId(50)
        sessionStorage.setItem("persistenceId",persistenceId)
    }

    const webSocketServer = new WebSocket("ws://localhost:3200")

    webSocketServer.addEventListener("open",(ev)=>{
        console.log("connected")
        //create a persistence ID if one does not already exist in local storage
        webSocketServer.send(JSON.stringify({persistenceId:persistenceId,type:"vidWatchconnection"}))
    })
    webSocketServer.addEventListener("close",(ev)=>{
        console.log("connection closed")
    })
    webSocketServer.addEventListener("message",(ev)=>{
        const data = JSON.parse(ev.data)
    })
    webSocketServer.addEventListener("error",(ev)=>{
        console.log(ev)
    })

})

function generateId(amount) {
    //We might need to generate a way to make the id more random
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    let result = ``
    for (let index = 0; index < amount; index++) {
       result += characters[Math.floor(Math.random() * (characters.length - 1))] 
    }
    return result
}