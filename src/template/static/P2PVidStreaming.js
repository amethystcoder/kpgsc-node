class P2PStreamer {

    mediaConstraints = {
        audio: true,
        video: true
    };

    WRTCConnection;
    DataChannel;
    MediaElement;

    starterServer;

    localStream;
    remoteStream;// = new MediaStream()

    /**
     * 
     * @param {HTMLMediaElement} MediaElement 
     * @param {String[]} stunServers
     * @param {string} starterServer the websocket server to communicate the sdp connection to
     * @param {number} [iceCandidatePoolSize=10]   
     */
    constructor (MediaElement,starterServer,stunServers,iceCandidatePoolSize = 10){
        //Before we start a connection, we check for the stream from a video file.
        //If there is a stream, only then shall we attempt to establish a connection

        this.MediaElement = MediaElement

        this.starterServer = new WebSocket(starterServer)

        //TODO: When we establish a connection but do not receive anything from recipents, attempt to broadcast
        this.localStream = MediaElement.captureStream() //type of MediaStream
        this.remoteStream = new MediaStream()

        //this.MediaElement.srcObject = this.remoteStream

        //start by initializing a new webrtc connection 
        this.WRTCConnection = new RTCPeerConnection({
            iceServers:[{
                urls:stunServers
            }],iceCandidatePoolSize:iceCandidatePoolSize
        })

        /* this.DataChannel = this.WRTCConnection.createDataChannel("p2pchannel")

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
        }) */

        //add event listeners for wrtc connection
        this.WRTCConnection.addEventListener("icecandidate",(ev)=>{
            ev.candidate //check if this exists and save it to the database
        })
        this.WRTCConnection.addEventListener("connectionstatechange",(ev)=>{})
        this.WRTCConnection.addEventListener("datachannel",(ev)=>{})
        this.WRTCConnection.addEventListener("icecandidateerror",(ev)=>{})
        this.WRTCConnection.addEventListener("iceconnectionstatechange",(ev)=>{})
        this.WRTCConnection.addEventListener("icegatheringstatechange",(ev)=>{})
        this.WRTCConnection.addEventListener("negotiationneeded",(ev)=>{})
        this.WRTCConnection.addEventListener("signalingstatechange",(ev)=>{})
        this.WRTCConnection.addEventListener("track",(ev)=>{
            ev.streams[0].getTracks().forEach((track)=>{
                //we need to do something about the tracks
                this.remoteStream.addTrack()
            })
        })

        //let answer = this.WRTCConnection.createAnswer()

        let offer = this.WRTCConnection.createOffer().then((offerdesc)=>{
            offerdesc.sdp
            offerdesc.type
            //this data needs to be saved to the database
        })
        this.WRTCConnection.setLocalDescription(offer)
        //this.WRTCConnection.setRemoteDescription() checks for any answer from the socket connection
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