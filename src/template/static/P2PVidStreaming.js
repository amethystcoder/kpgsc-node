class P2PStreamer {

    mediaConstraints = {
        audio: true,
        video: true
    };

    WRTCConnection;
    DataChannel;
    MediaElement;

    signalingServer;

    localStream;
    remoteStream;// = new MediaStream()

    //basic steps for the p2p
    //connect to the webrtc connection and websocket connection as well
    //before trying to stream a video or hls file, check if another user on the p2p network is watching the same video at the time
    //if no one is watching the video, get video from the server using normal means, and set up webrtc to get offers from other potential connectors 
    //also send a websocket message to store your candidate in the database or storage as someone watching the video
    //on any case of failure, or disconnection to the websocket or a message of videoCancel is sent to the server, delete candidate from the database
    //if someone is watching, make an offer to that peer, and retreive his stream to watch. Attempt to make sure the stream starts from the begining

    /**
     * 
     * @param {HTMLMediaElement} MediaElement 
     * @param {string} Source 
     * @param {String[]} stunServers
     * @param {string} signalingServer the websocket server to communicate the sdp connection to
     * @param {number} [iceCandidatePoolSize=10]
     */
    constructor (MediaElement,Source,signalingServer,stunServers,iceCandidatePoolSize = 10){
        //Before we start a connection, we check for the stream from a video file.
        //If there is a stream, only then shall we attempt to establish a connection

        this.MediaElement = MediaElement

        this.signalingServer = new WebSocket(signalingServer)

        //add on message for the signalling server
        this.signalingServer.addEventListener("message",(event)=>{
            console.log(event.data)
            const data = JSON.parse(event.data)
            if (data.type == "VideoWatcherCandidates") {
                if (Array.isArray(data.candidates)) {
                    data.candidates.forEach((candidate)=>{
                        this.handleICECandidate(candidate)
                    })
                }
            }
        })

        //attempt to get details about the clients watching the video at the time
        this.sendSignal({
            type:'getVideoWatcherCandidates',
            video:Source
        })

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

        //add event listeners for wrtc connection
        this.WRTCConnection.addEventListener("icecandidate",(ev)=>{
            this.sendSignal({
                type:'iceCandidate',
                data:ev.candidate
            }) //check if this exists and save it to the database
        })

        this.WRTCConnection.addEventListener("track",(ev)=>{
            ev.streams[0].getTracks().forEach((track)=>{
                //we need to do something about the tracks
                this.remoteStream.addTrack()
            })
        })
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

    async createOffer() {
        const offer = await this.WRTCConnection.createOffer();
        await this.WRTCConnection.setLocalDescription(offer);
        sendSignal({ offer });
    }

    /**
     * 
     * @param {RTCSessionDescriptionInit} offer 
     */
    async handleOffer(offer) {
        await this.WRTCConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await this.WRTCConnection.createAnswer();
        await this.WRTCConnection.setLocalDescription(answer);
        sendSignal({ answer });
    }

    /**
     * 
     * @param {RTCSessionDescriptionInit} answer 
     */
    async handleAnswer(answer) {
        await this.WRTCConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    /**
     * 
     * @param {RTCIceCandidateInit} candidate 
     */
    async handleICECandidate(candidate) {
        await this.WRTCConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    /**
     * 
     * @param {*} message 
     */
    sendSignal(message) {
        signalingServer.send(JSON.stringify(message));
    }
      

    extractTracksfromVideoSource(){}
}

/* 
    this.WRTCConnection.addEventListener("connectionstatechange",(ev)=>{})
    this.WRTCConnection.addEventListener("datachannel",(ev)=>{})
    this.WRTCConnection.addEventListener("icecandidateerror",(ev)=>{})
    this.WRTCConnection.addEventListener("iceconnectionstatechange",(ev)=>{})
    this.WRTCConnection.addEventListener("icegatheringstatechange",(ev)=>{})
    this.WRTCConnection.addEventListener("negotiationneeded",(ev)=>{})
    this.WRTCConnection.addEventListener("signalingstatechange",(ev)=>{})
*/


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