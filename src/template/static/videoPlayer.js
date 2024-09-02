class GDPlyr{

    /**
     * 
     * @param {string} videoId 
     * @param {string | Array<string> | Array<{
     * src:string,
     * title:string,
     * subtitle:Array<string> | string,
     * ads:Array<{}>
     * }>} sourceData relative metadata for the video, including sources, title e.t.c
     */
    constructor( videoId, sourceData = {} ) {
        //get video element and add appropriate classes
        //if it cannot find an element with the id provided, it would try to look for any video elements present
        //if none is found, it would try to create one
        this.videoElement = document.getElementById(videoId)
        if (!this.videoElement) {
            let checkForVideo = document.querySelector("video")
            this.videoElement = checkForVideo ? checkForVideo : document.createElement("video")
            if (!checkForVideo) document.body.appendChild(this.videoElement)
        }
        //surround the videoElement with a container div
        this.videoElementContainer = document.createElement("div")
        this.videoElement.classList.add("gd-video")
        this.videoElementContainer.classList.add("gd-video-container")
        this.videoElement.parentNode.insertBefore(this.videoElementContainer,this.videoElement)
        this.videoElementContainer.appendChild(this.videoElement)

        this.videoElementContainer.addEventListener("mousemove",()=>{
            this.controlBar.ControlBarContainer.display = "block"
            setTimeout(()=>{
                this.controlBar.ControlBarContainer.display = "none"
            },3000)
        })

        this.sources =  sourceData.sources

        this.controlBar = new ControlBar(this)
        this.initializeSources()
        this.initializeKeypressEvents()
    }

    initializeSources(){
        if (typeof this.sources == "string") this.videoElement.src = this.sources
        if(Array.isArray(this.sources)){
            if(typeof this.sources[0] == "string") this.videoElement.src = this.sources[0]
            else{
                if (this.sources[0].src && typeof this.sources[0].src == "string") this.videoElement.src = this.sources[0].src
                //take care of title and subtitles later
                this.subtitles = new Subtitles(this,this.sources[0].subtitle)
            }
        }
        this.videoElement.load()
        this.controlBar.beginVideoTracking()
    }

    controlBar;

    videoElementContainer;

    videoElement;

    videoTitle;

    Ads;

    sources;

    subtitles;

    initializeKeypressEvents(){
       const body = document.body
       body.addEventListener("keyup",(ev)=>{
        ev.preventDefault()
            if (ev.key == "ArrowLeft") this.controlBar.backward(10)
            if (ev.key == "ArrowDown") ""
            if (ev.key == "ArrowUp") ""
            if (ev.key == "ArrowRight") this.controlBar.forward(10)
            if (ev.key == " ") this.controlBar.togglePlayPause()
            //if (ev.key == "") ""
       })
    }

    playVideo(){
        if (this.videoElement.paused) return this.videoElement.play()
        return this.videoElement.pause()
    }

}

class ControlBar{
    /**
     * 
     * @param {GDPlyr} Video
     */
    constructor(Video){
        this.videoClass = Video

        //all initializations
        this.ControlBarContainer = document.createElement("div")
        this.ControlBarContainer.classList.add("control-bar-container")

        this.totalvideolenghtContainer = document.createElement("div")
        this.totalvideolenghtContainer.classList.add("total-video-length-cont")
        this.totalvideolenght = document.createElement("span")
        this.totalvideolenght.classList.add("total-video-length")
        this.totalvideolenghtContainer.addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const trackerWidth = this.totalvideolenghtContainer.offsetWidth
            this.goto((x / trackerWidth) * 100)
        });
        this.progressedVideoLenght = document.createElement("span")
        this.progressedVideoLenght.classList.add("progressed-video-lenght")

        this.totalvideolenghtContainer.appendChild(this.totalvideolenght)
        this.totalvideolenghtContainer.appendChild(this.progressedVideoLenght)

        //create container for all buttons (play, forward, movie name, e.t.c)
        this.containerForButtonFunctions = document.createElement("div")
        this.containerForButtonFunctions.classList.add("container-for-button-functions")

        //all buttons
        this.playButton = document.createElement("button")
        this.playButton.classList.add("play-button")
        this.playButton.addEventListener("click",()=>{this.togglePlayPause()})

        let volumeSpan = document.createElement("div")
        volumeSpan.classList.add("volume-cont")

        this.volumeButton = document.createElement("button")
        this.volumeButton.classList.add("volume-button")
        
        //this would depend on the volume state of the video (states are full,half and mute)
        this.volumeButton.classList.add("volume-full")
        this.volumeButton.addEventListener("click",()=>{this.toggleMute()})

        this.volumeControl = document.createElement("input")
        this.volumeControl.classList.add("volume-control")
        this.volumeControl.setAttribute("type","range")
        this.volumeControl.setAttribute("min","0.0")
        this.volumeControl.setAttribute("max","100.0")
        this.volumeControl.addEventListener("change",(ev)=>{
            ev.preventDefault()
            this.videoClass.videoElement.volume = parseFloat(this.volumeControl.value) / 100
        })

        volumeSpan.appendChild(this.volumeButton)
        volumeSpan.appendChild(this.volumeControl)

        this.currentTimeCont = document.createElement("span")
        this.currentTimeCont.classList.add("current-time")
        this.currentTimeCont.innerHTML = "-/-"

        this.forwardButton = document.createElement("button")
        this.forwardButton.classList.add("forward-button")
        this.forwardButton.addEventListener("click",()=>{this.forward(10)})

        this.backwardButton = document.createElement("button")
        this.backwardButton.classList.add("backward-button")
        this.backwardButton.addEventListener("click",()=>{this.backward(10)})

        this.fullscreenButton = document.createElement("button")
        this.fullscreenButton.classList.add("fullscreen-button")
        this.fullscreenButton.addEventListener("click",()=>{this.toggleFullscreen()})

        this.sourcesButton = document.createElement("button")
        this.sourcesButton.classList.add("sources-button")
        this.sourcesButton.addEventListener("click",()=>{this.toggleSourceViewOpen()})

        this.sourcesContainer = document.createElement('div')
        this.sourcesContainer.classList.add("sources-container")
        this.addsources()
        this.sourcesButton.appendChild(this.sourcesContainer)

        this.optionsButton = document.createElement("button")
        this.optionsButton.classList.add("options-button")

        this.settingsContainer = document.createElement('div')
        this.settingsContainer.classList.add("settings-container")
        let playbackheading = document.createElement("details")
        playbackheading.classList.add("playback-heading")
        let playbackSummary = document.createElement("summary")
        playbackSummary.innerHTML = "Playback Speed"
        playbackheading.appendChild(playbackSummary)
        for (let index = 0; index < this.playbacks.length; index++) {
            let playbackButton = document.createElement("div")
            playbackButton.classList.add("playback-button")
            playbackButton.innerHTML = `${this.playbacks[index]}x`
            playbackButton.addEventListener("click",()=>{
                this.changePlaybackSpeed(this.playbacks[index])
            })
            playbackheading.appendChild(playbackButton)
        }
        this.settingsContainer.appendChild(playbackheading)

        this.optionsButton.appendChild(this.settingsContainer)


        this.leftCont = document.createElement("div")
        this.rightCont = document.createElement("div")

        this.leftCont.classList.add("bar")
        this.rightCont.classList.add("bar")

        this.leftCont.appendChild(this.playButton)
        this.leftCont.appendChild(volumeSpan)
        this.leftCont.appendChild(this.currentTimeCont)
        this.rightCont.appendChild(this.backwardButton)
        this.rightCont.appendChild(this.forwardButton)
        this.rightCont.appendChild(this.sourcesButton)
        this.rightCont.appendChild(this.optionsButton)
        this.rightCont.appendChild(this.fullscreenButton)

        this.containerForButtonFunctions.appendChild(this.leftCont)
        this.containerForButtonFunctions.appendChild(this.rightCont)

        //add all elements to the main container
        this.ControlBarContainer.appendChild(this.totalvideolenghtContainer)
        this.ControlBarContainer.appendChild(this.containerForButtonFunctions)

        this.videoClass.videoElementContainer.appendChild(this.ControlBarContainer)

    }

    playButton;
    volumeButton;
    volumeControl;
    forwardButton;
    backwardButton;
    fullscreenButton;
    sourcesButton;
    optionsButton;

    currentTimeCont;
    sourcesContainer;
    settingsContainer;
    
    totalvideolenghtContainer;
    totalvideolenght;
    progressedVideoLenght;

    leftCont;
    rightCont;
    containerForButtonFunctions;

    ControlBarContainer;

    playbacks = [0.25,0.5,1.0,2.0,5.0]

    videoClass;

    togglePlayPause(){
        this.videoClass.subtitles.destroy()
        this.videoClass.playVideo()
        if(this.videoClass.videoElement.paused) this.playButton.style.backgroundImage = "url(../static/icons/play-svgrepo-com.svg)"
        else this.playButton.style.backgroundImage = "url(../static/icons/pause-svgrepo-com.svg)"
    }

    addsources(){
        if (typeof this.videoClass.sources == "string") {
            let sourcediv = document.createElement("div")
            sourcediv.classList.add("source-div")
            sourcediv.innerHTML = this.videoClass.sources
            sourcediv.addEventListener("click",()=>{this.switchSources(this.videoClass.sources)})
            this.sourcesContainer.appendChild(sourcediv)
        }
        if (Array.isArray(this.videoClass.sources)) {
            for (let index = 0; index < this.videoClass.sources.length; index++) {
                if (typeof this.videoClass.sources[index] == "string") {
                    let sourcediv = document.createElement("div")
                    sourcediv.classList.add("source-div")
                    sourcediv.innerHTML = this.videoClass.sources[index]
                    sourcediv.addEventListener("click",()=>{this.switchSources(this.videoClass.sources[index])})
                    this.sourcesContainer.appendChild(sourcediv)
                }
                if (typeof this.videoClass.sources[index] == "object" && this.videoClass.sources[index] != null) {
                    let sourcediv = document.createElement("div")
                    sourcediv.classList.add("source-div")
                    sourcediv.innerHTML = this.videoClass.sources[index].title || this.videoClass.sources[index].src
                    sourcediv.addEventListener("click",()=>{this.switchSources(this.videoClass.sources[index])})
                    this.sourcesContainer.appendChild(sourcediv)
                }
            }
        }
    }

    toggleSourceViewOpen(){
        if (this.sourcesContainer.style.display == "none") this.sourcesContainer.style.display = "block"
        else this.sourcesContainer.style.display = "none"
    }

    switchSources(source){
        this.videoClass.videoElement.src = source.src
        this.videoClass.subtitles.destroy()
        this.videoClass.subtitles = new Subtitles(this.videoClass,source.subtitle)
        this.videoClass.videoElement.load()
        this.togglePlayPause()
    }

    changePlaybackSpeed(value){
        this.videoClass.videoElement.playbackRate = value
    }

    addAdSections(){}

    toggleMute(){
        this.videoClass.videoElement.muted = !this.videoClass.videoElement.muted
        if (this.videoClass.videoElement.muted) {
            this.volumeButton.classList.remove("volume-full")
            this.volumeButton.classList.add("volume-mute")
        }else{
            this.volumeButton.classList.remove("volume-mute")
            this.volumeButton.classList.add("volume-full")
        }
    }

    toggleFullscreen(){
        if (document.fullscreenElement) {
            document.exitFullscreen().then(d=>console.log(d))
        }
        else{
            this.videoClass.videoElementContainer.requestFullscreen().then(d=>console.log(d))
        }
    }

    forward(time){
        this.videoClass.videoElement.currentTime += time
    }

    backward(time){
        this.videoClass.videoElement.currentTime -= time
    }

    goto(seekedPercent){
        let timeToBeSeeked = (seekedPercent / 100) * this.videoClass.videoElement.duration
        this.videoClass.videoElement.currentTime = timeToBeSeeked
    }

    beginVideoTracking(){
        setInterval(()=>{
            let duration = this.videoClass.videoElement.duration
            let currentTime = this.videoClass.videoElement.currentTime
            this.videoClass.subtitles.displaySubtitles(currentTime)
            this.progressedVideoLenght.style.width = `${(currentTime / duration) * 100}%`
            //TODO Work on this
            this.currentTimeCont.innerHTML = `${Math.trunc(currentTime/60)}:${Math.round(currentTime%60) < 10 ? "0":""}${Math.round(currentTime%60)}/${Math.trunc(duration/60)}:${Math.round(duration%60)}`
        },1000)
    }
}

class Subtitles {

    /**
     * @param {GDPlyr} Video
     * @param {Array | string} subtitle 
     */
    constructor(Video,subtitle) {
        //TODO: check type of subtitle files and what they look like
        if (Array.isArray(subtitle)) {
            
        }
        if (typeof subtitle == "string" && subtitle.includes(".")) {
            let splitName = subtitle.split(".")
            let extension = splitName[splitName.length - 1]
            if (this.acceptedSubtitleFiles.includes(extension)) {
                this.subtitleType = extension
                this.videoClass = Video
                Video.videoElement.addEventListener("play",async ()=>{
                    this.subtitleMash = await this.getSubtitleFile(subtitle)
                    this.subtitleList = this.parseSubtitles(this.subtitleMash)
                    this.subtitleCont = this.initializeSubtitleSpace()
                    Video.videoElementContainer.appendChild(this.subtitleCont)
                })
            }
        }
    }

    videoClass;    

    acceptedSubtitleFiles = ["srt","vtt"]

    subtitleList;

    subtitleMash;

    subtitleType;

    subtitleCont;

    async getSubtitleFile(fileLink){
        try {
            let response = await fetch(fileLink);

            if(!response.ok) return ""
            let data = await response.text();
            return data
        } catch (error) {
            return ""
        }
    }

    parseSubtitles(mash){
        if(this.subtitleType == "srt") return this.parseSrt(mash)
        if (this.subtitleType == "vtt") return this.parseVtt(mash)
        return []
    }

    /**
     * 
     * @param {string} mash 
     */
    parseSrt(mash){
        let list = mash.split("\n")
        let finalSubObj = {
            timeStamp:[],
            text:[]
        }
        let finList = []
        for (let index = 0; index < list.length; index++) {
            let item = this.checkIfTime(list[index]);
            if (Array.isArray(item)) finalSubObj.timeStamp = item
            if (typeof item == "string" && item != "" && isNaN(parseInt(item))) finalSubObj.text.push(item)
            if (typeof item == "string" && !isNaN(parseInt(item))){
                if (finalSubObj.timeStamp.length != 0) {
                    finList.push(finalSubObj)
                    finalSubObj = {
                        timeStamp:[],
                        text:[]
                    }
                }
            }
        }
        return finList
    }

    /**
     * 
     * @param {string} mash 
     */
    parseVtt(mash){}

    /**
     * splits the time signatures in the subtitle file and returns them in seconds
     * @param {string} str looks like this `00:14:27,181 --> 00:14:28,343` 
     */
    checkIfTime(str){
        let result = []
        if (str.includes("-->")) {
            str = str.split("-->") //separate them into an array
            for (let index = 0; index < str.length; index++) {
                //break each timestamp in the array into an array of individual number strings (hr,min,sec,millisecond)
                if (str[index].includes(":")) {
                    let timesign = str[index].split(":")
                    if (timesign[timesign.length - 1].includes(",")) {
                        let laststr = timesign.pop()
                        let laststrSplit = laststr.split(",")
                        timesign.push(laststrSplit[0],laststrSplit[1])
                    }
                    //convert each time in array (hr,min,sec,millisecond) to actual integers
                    //then convert them all into seconds and add them together
                    let full_seconds = 0
                    for (let j = 0; j < timesign.length; j++) {
                        if (j != 3) {
                            let nu =  2 - j
                            full_seconds += Number(timesign[j]) * (60 ** nu) 
                        } 
                        if (j == 3) full_seconds += Number(timesign[j]) / 1000 
                    }
                    result.push(full_seconds)
                }
            }
            return result
        }
        return str
    }

    addSubtitles(){}

    initializeSubtitleSpace(){
        let cont = document.createElement("span")
        cont.classList.add("sub-cont")
        cont.innerHTML = ""
        return cont
    }

    displaySubtitles(timestamp){
        try {
            let text = ""
            let presentSub = this.subtitleList.filter(sub=>timestamp >= sub.timeStamp[0] && timestamp <= sub.timeStamp[1])
            for (let index = 0; index < presentSub[0].text.length; index++) {
                text += presentSub[0].text[index] + "<br>"
            }
            this.subtitleCont.innerHTML = text   
        } catch (error) {
            
        }
    }

    destroy(){
        if (this.subtitleCont) {
            this.subtitleCont.remove()
        }
    }
}