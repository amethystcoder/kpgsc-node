class P2PStreamer {

    mediaConstraints = {
        audio: true,
        video: true
    };

    WRTCConnection;
    DataChannel;
    MediaElement;

    /**
     * 
     * @param {HTMLMediaElement} MediaElement 
     */
    constructor (MediaElement){
        //Before we start a connection, we check for the stream from a video file.
        //If there is a stream, only then shall we attempt to establish a connection


        //TODO: When we establish a connection but do not receive anything from recipents, attempt to broadcast
        this.MediaElement = MediaElement.captureStream() //type of MediaStream

        //start by initializing a new webrtc connection 
        this.WRTCConnection = new RTCPeerConnection({
            iceServers:[]
        })
        this.DataChannel = this.WRTCConnection.createDataChannel("p2pchannel")

        //add event listeners for data channel
        this.DataChannel.addEventListener("bufferedamountlow",()=>{})
        this.DataChannel.addEventListener("close",()=>{})
        this.DataChannel.addEventListener("closing",()=>{})
        this.DataChannel.addEventListener("error",()=>{})
        this.DataChannel.addEventListener("message",()=>{
            console.log("message has been sent through the data channel")
        })
        this.DataChannel.addEventListener("open",()=>{
            console.log("data channel has been opened")
        })

        //add event listeners for wrtc connection
        this.WRTCConnection.addEventListener("icecandidate",(ev)=>{})

        //let answer = this.WRTCConnection.createAnswer()

        let offer = this.WRTCConnection.createOffer()
        this.WRTCConnection.setLocalDescription()
        //this.WRTCConnection.setRemoteDescription()


    }

     /**
     * 
     * @param {Array<{
     *              track:MediaStreamTrack,
     *              stream:MediaStream
     *              }>} tracks
     */
    AddTracks(tracks) {
        tracks.forEach(track => this.WRTCConnection.addTrack(track.track,track.stream))
    }

    extractTracksfromVideoSource(){}
}