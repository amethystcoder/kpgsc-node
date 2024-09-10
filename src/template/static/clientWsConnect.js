window.addEventListener("DOMContentLoaded",(ev)=>{
    const websocketConnection = new WebSocket("ws://localhost:3200")

    websocketConnection.addEventListener("open",(ev)=>{
        console.log("connected")
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