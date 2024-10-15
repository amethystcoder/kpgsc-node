class AdLoader {
    /**
     * 
     * @param {string} playerId 
     * @param {Array} ads 
     * @param {Array} popads 
     */
    constructor (playerId,ads,popads){
        this.videoElement = document.getElementById(playerId)
        this.videoElement.classList.add("vid-elem")
        this.AdElement = this.initializeAdContainer()
        this.popAdElement = this.initializePopAdContainer()
        this.skipButtonElement = this.createSkipButton()
        this.skipButtonElement.classList.add("skip-elem")
        this.cancelButtonElement = this.createCancelButton()
        this.cancelButtonElement.classList.add("cancel-elem")
        //add type of pop to ads
        this.adList = ads
        this.adList = [...this.initializePopAds(popads),...this.adList]
        this.randomizeOffsets()
        this.beginAdPlay()
    }

    videoElement;
    popAdElement;
    AdElement;
    skipButtonElement;
    cancelButtonElement;

    adList = []

    /**
     * 
     * @param {string} fileContent 
     * @returns 
     */
    extractvideolink(fileContent) {
        if(typeof fileContent == "string" && fileContent != ""){
            let parser = new DOMParser()
            let xmltree = parser.parseFromString(fileContent,"text/xml")
            let adVideo = xmltree.getElementsByTagName("MediaFile")
            let adTime = xmltree.getElementsByTagName("Duration")
            return {
                adMediaLink:adVideo[0].innerHTML,
                adMediaMime:adVideo[0].getAttribute("type") || "video/mp4",
                adDuration:adTime[0].innerHTML
            }
        }
        return {
                adMediaLink:"",
                adMediaMime:"video/mp4",
                adDuration:0
            }
    }

    /**
     * 
     * @param {any[]} popAds 
     */
    initializePopAds(popAds){
        for (let index = 0; index < popAds.length; index++) {
            popAds[index].type = "popads"
        }
        return popAds
    }

    /**
     * 
     * @param {string | URL} url 
     * @returns 
     */
    async getAd(url){
        try {
            let response = await fetch(url);

            if(!response.ok) return ""
            let data = await response.text();
            return data
        } catch (error) {
            return ""
        }
    }

    playAd(adLink) {
        try {
            if (this.videoElement) {
                this.videoElement.pause()
                this.videoElement.style.display = "none"
                if(document.fullscreenEnabled && document.fullscreenElement){
                    this.AdElement.requestFullscreen()
                }
                this.AdElement.style.display = "block"
                this.skipButtonElement.style.display = "block"
                this.AdElement.addEventListener("ended",this.skipAd)
                this.AdElement.src = adLink
                this.AdElement.load()
                this.AdElement.play()
                return true
            }
            return false;
        } catch (error) {
            skipAd()
            return false
        }
    }

    displayPopAd(popad){
        if (this.videoElement) {
            this.videoElement.pause()
            //get all elements and set their content
            this.popAdElement.href = popad.link
            let poptitle = document.querySelector(".pop-ad-title")
            poptitle.innerHTML = popad.title
            let popimage = document.querySelector(".pop-ad-image")
            popimage.src = popad.image
            let popbody = document.querySelector(".pop-ad-body")
            popbody.innerHTML = popad.content
            this.cancelButtonElement.style.display = "block"
            this.popAdElement.style.display = "block"
            //add an X button to remove the ad
        }
    }

    createSkipButton(){
        let body = document.querySelector("body")
        let skip = document.createElement("button")
        skip.id = "skip-button"
        skip.style.display = "none"
        skip.addEventListener("click",this.skipAd)
        body.appendChild(skip);
        return skip
    }

    createCancelButton(){
        let body = document.querySelector("body")
        let cancel = document.createElement("button")
        cancel.innerHTML = "X"
        cancel.id = "cancel-button"
        cancel.style.display = "none"
        cancel.addEventListener("click",this.cancelPopAd)
        body.appendChild(cancel);
        return cancel
    }

    determineSkip(offset) {
        if (offset > this.videoElement.duration) offset = this.videoElement.duration
        let timeRemaining = offset
        let adContdown = setInterval(() => {
            if (timeRemaining > 0) {
                this.skipButtonElement.innerHTML = `Skip ad in ${timeRemaining}s`
                this.skipButtonElement.setAttribute("disabled","true")
                timeRemaining--
            }
            else{
                clearInterval(adContdown)
                this.skipButtonElement.innerHTML = `Skip ad`
                this.skipButtonElement.removeAttribute("disabled")
            }
        }, (1000));
    }

    skipAd() {
        let AdBlock = document.querySelector(".video-ad-cont")
        AdBlock.style.display = "none"
        AdBlock.pause()
        let vidBlock = document.querySelector(".vid-elem")
        vidBlock.style.display = "block"
        vidBlock.play()
        let skipElem = document.querySelector(".skip-elem")
        skipElem.style.display = "none"
    }

    cancelPopAd(){
        let AdBlock = document.querySelector(".pop-ad-cont")
        AdBlock.style.display = "none"
        let vidBlock = document.querySelector(".vid-elem")
        vidBlock.style.display = "block"
        vidBlock.play()
        let cancelElem = document.querySelector(".cancel-elem")
        cancelElem.style.display = "none"
    }

    /**
     * 
     * @returns {HTMLVideoElement}
     */
    initializeAdContainer() {
        let body = document.querySelector("body")
        const video = document.createElement("video")
        video.style.display = "none"
        video.classList.add("video-ad-cont")
        body.appendChild(video)
        return video
    }

    /**
     * 
     * @returns {HTMLAnchorElement}
     */
    initializePopAdContainer(){
        let body = document.querySelector("body")
        const link = document.createElement("a")
        link.style.display = "none"
        link.classList.add("pop-ad-cont")
        const popCont = document.createElement("div")
        popCont.classList.add("main-pop-container")
        const popImg = document.createElement("img")
        popImg.classList.add("pop-ad-image")
        const title = document.createElement("h2")
        title.classList.add("pop-ad-title")
        const content = document.createElement("p")
        content.classList.add("pop-ad-body")
        popCont.appendChild(popImg)
        popCont.appendChild(title)
        popCont.appendChild(content)
        link.appendChild(popCont)
        body.appendChild(link)
        return link
    }

    randomizeOffsets(){
        const videoDuration = this.videoElement.duration
        let adListLength = this.adList.length
        let adSpaces = videoDuration / adListLength
        let presentOffset = 0
        for(let i = 0; i < this.adList.length; i++){
            //we also need to make sure that the ad offset is smaller than the video duration
            this.adList[i].offset = Math.floor(Math.random() * (presentOffset + adSpaces)) + presentOffset
            presentOffset += adSpaces
        }
    }

    beginAdPlay(){
        this.videoElement.addEventListener("play",async (ev)=>{
            let AdcheckInterval = setInterval(async ()=>{
                for (let index = 0; index < this.adList.length; index++) {
                    if (this.adList[index].offset <= this.videoElement.currentTime) {
                        if (this.adList[index].type == "popads") {
                            console.log("popad displayed")
                            //display the popads directly
                            this.displayPopAd(this.adList[index])
                            this.adList.splice(index,1);
                        }
                        else{
                            console.log("vastad displayed")
                            let adContent = await this.getAd(this.adList[index].tag)
                            let adDetails = this.extractvideolink(adContent)
                            if(adDetails.adMediaLink){
                                this.playAd(adDetails.adMediaLink)
                                this.determineSkip(this.adList[index].skipoffset || 5)
                            }
                            let indx = this.adList.indexOf(this.adList[index].tag);
                            this.adList.splice(indx,1);   
                        }
                    }
                }
            },2000)
        })
    }
}