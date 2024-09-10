window.addEventListener("DOMContentLoaded",(ev)=>{

    let persistenceId = sessionStorage.getItem("persistenceId")
    if(!persistenceId){
        //create a new persistenceId (or request from serverSide)
        persistenceId = generateId(50)
        sessionStorage.setItem("persistenceId",persistenceId)
    }

    const websocketConnection = new WebSocket("ws://localhost:3200")

    websocketConnection.addEventListener("open",(ev)=>{
        console.log("connected")
        //create a persistence ID if one does not already exist in local storage
        websocketConnection.send(persistenceId)
    })
    websocketConnection.addEventListener("close",(ev)=>{
        console.log("connection closed")
    })
    websocketConnection.addEventListener("message",(ev)=>{
        console.log(ev.data)
    })
    websocketConnection.addEventListener("error",(ev)=>{
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