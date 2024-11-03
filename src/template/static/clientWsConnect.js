window.addEventListener("DOMContentLoaded",(ev)=>{

    let persistenceId = sessionStorage.getItem("persistenceId")
    if(!persistenceId){
        //create a new persistenceId (or request from serverSide)
        persistenceId = generateId(50)
        sessionStorage.setItem("persistenceId",persistenceId)
    }

    //get the persistence connections from the serverside
    let persitenceLinks = sessionStorage.getItem("persistenceLinks")
    if (persitenceLinks) {
        persitenceLinks = persistenceLinks.split(";")
        persitenceLinks.forEach(persitenceLink => {
            const websocketConnection = new WebSocket(persitenceLink)

            websocketConnection.addEventListener("open",(ev)=>{
                console.log("connected")
                //create a persistence ID if one does not already exist in local storage
                websocketConnection.send(JSON.stringify({persistenceId:persistenceId,type:"conversionTrack"}))
            })
            websocketConnection.addEventListener("close",(ev)=>{
                console.log("connection closed")
            })
            websocketConnection.addEventListener("message",(ev)=>{
                const data = JSON.parse(ev.data)
                let getHLSProcesses = sessionStorage.getItem("getHLSProcesses") || "[]"
                let HLSProcesses = JSON.parse(getHLSProcesses)
                let isExistent = false
                //check if the data coming in is for a hls file already being shown
                for (let index = 0; index < HLSProcesses.length; index++) {
                    if (HLSProcesses[index].fileId == data.fileId) {
                        HLSProcesses[index] = data
                        isExistent = true
                        if(data.completed){
                            HLSProcesses.splice(HLSProcesses.indexOf(HLSProcesses[index]))
                        }
                    }
                }
                //if it is not, add it to the array
                if(!isExistent){
                    HLSProcesses.push(data)
                }
                //save data in sessionStorage
                sessionStorage.setItem("getHLSProcesses",JSON.stringify(HLSProcesses))

                if (HLSProcesses.length != 0) {
                    const body = document.body
                    let exisingProgressCont = document.querySelector(".hls-progress-cont")
                    if (exisingProgressCont) {
                        body.removeChild(exisingProgressCont)
                    }
                    let progressCont = exisingProgressCont || document.createElement("div")
                    //remove all the children of progress container
                    while (progressCont.firstChild) {
                        progressCont.removeChild(progressCont.lastChild);
                    }
                    progressCont.classList.add("hls-progress-cont","glassy")

                    let allProgressBoxes = ""
                    //create a container to show this data
                    HLSProcesses.forEach((hlsprocess)=>{
                        let progressBox = `
                        <div class="progress-box">
                            <h2 class="progress-title">${hlsprocess.name}</h2>
                            <p class="progress-slug">${hlsprocess.fileId}</p>
                            <span class="barr">
                                <span class="progress-bar-container">
                                    <span class="progress-bar" style="width:${hlsprocess.progress ? Math.round(hlsprocess.progress) : 100}%;background-color:${hlsprocess.progress ? 'rgb(27, 27, 148)' : 'red'};"></span>
                                </span>
                                <p class="percent">${hlsprocess.progress ? Math.round(hlsprocess.progress) + '%' : 'An error occured during conversion'}</p>
                            </span>
                        </div>
                        `
                        allProgressBoxes += progressBox
                    })
                    progressCont.innerHTML = allProgressBoxes
                    body.appendChild(progressCont)
                }
            })
            websocketConnection.addEventListener("error",(ev)=>{
                console.log(ev)
            })
        });
    }
    
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

/**
 * saves a persister link for tracking hls conversion status
 * 
 * @param {string} persisterLink 
 */
function addPersister(persisterLink){
    if (persisterLink) {
        let persistenceLinks = sessionStorage.getItem("persistenceLinks")
        if (persistenceLinks) {
            let splitPersistenceLinks = persistenceLinks.split(";")
            if (!splitPersistenceLinks.includes(persisterLink)) splitPersistenceLinks.push(persisterLink)
            sessionStorage.setItem("persistenceLinks",splitPersistenceLinks.join(";"))
        }
    }
    
}