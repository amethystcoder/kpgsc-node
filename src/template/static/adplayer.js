class AdLoader {
    /**
     * 
     * @param {string} playerId 
     * @param {Array} ads 
     */
    constructor (playerId,ads){
        this.videoElement = document.getElementById(playerId)
        this.videoElement.classList.add("vid-elem")
        this.AdElement = this.initializeAdContainer()
        this.skipButtonElement = this.createSkipButton()
        this.skipButtonElement.classList.add("skip-elem")
        this.adList = ads
        this.beginAdPlay()
    }

    videoElement;
    AdElement;
    skipButtonElement;

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

    createSkipButton(){
        let body = document.querySelector("body")
        let skip = document.createElement("button")
        skip.id = "skip-button"
        skip.style.display = "none"
        skip.addEventListener("click",this.skipAd)
        body.appendChild(skip);
        return skip
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

    beginAdPlay(){
        this.videoElement.addEventListener("play",async (ev)=>{
            let AdcheckInterval = setInterval(async ()=>{
                for (let index = 0; index < this.adList.length; index++) {
                    if (this.adList[index].offset <= this.videoElement.currentTime) {
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
            },2000)
        })
    }
}