window.addEventListener("load",async ()=>{
    try {

        // Set up the MediaSource and SourceBuffer
        const videoElement = document.getElementById("test-vid");
        const mediaSource = new MediaSource();
        videoElement.src = URL.createObjectURL(mediaSource);

        let firstAttempt = true
        let totalVideoBytes = 0
        let presentVideoByteLocation = 0
        //try to slow down the speed at which the client side asks for data
        //we can use set timeout for this

        mediaSource.addEventListener('sourceopen', async () => {
            // The mediaSource is open and ready to receive a sourceBuffer
            const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"');

            sourceBuffer.addEventListener("updateend", async () => {
                console.log("finished a segment")
                // Keep appending the next segment after each update
                console.log(mediaSource.readyState)
                if (mediaSource.readyState === "open") {
                    await fetchData()
                }
            });

            async function fetchData() {
                if (mediaSource.readyState !== "open" || sourceBuffer.updating) {
                    return;
                }
                //include the required headers
                const headers = new Headers()
                headers.append("range",`bytes ${presentVideoByteLocation}-`)
                //add header data
                //send a fetch request to the server
                let response = await fetch("../api/stream/XiQQEukA54ntFqh5XDRIaI2hHzwhxtImHsY8T9TXzGnzYWUH1r",{
                    method:"GET",
                    headers:headers
                })
                let responseHeaders = response.headers
                //find the length of the video set it for future requests
                //set total video length
                const contentRange = responseHeaders.get("content-range")
                if (contentRange) {
                    //determine the next range or amount of ranges
                    let VideoBytesSplitbyDash = contentRange.split("-")
                    let presentByteLocationOverTotalBytes = VideoBytesSplitbyDash[VideoBytesSplitbyDash.length - 1]
                    let presentByteLocationOverTotalBytesSplit = presentByteLocationOverTotalBytes.split("/")
                    totalVideoBytes = Number(presentByteLocationOverTotalBytesSplit[presentByteLocationOverTotalBytesSplit.length - 1])
                    presentVideoByteLocation = Number(presentByteLocationOverTotalBytesSplit[0])
                    firstAttempt = false
                }
                //we know the data should be a buffer array, so we will treat it as such
                //get the data and console.log it
                let data = await response.arrayBuffer()
                //get the encryption key from the headers and decrypt the arrayBuffer
                /* const encData = responseHeaders.get("impdata")
                const encDataSplit = encData.split(";")
                const name = encDataSplit[2] // how it usually is in the db
                const key = await importKey(strToArrbuf(atob(encDataSplit[0])),name)
                const iv = strToArrbuf(atob(encDataSplit[1])); 
                const length = Number(encDataSplit[3])
                let decrypter = await crypto.subtle.decrypt({
                    iv:iv,//set iv here. IV, encryption name and key must be gotten from the server side
                    name:name,//set algorithm name here
                    tagLength:length
                },key,data)//get key from server side
                console.log(decrypter) */
                if (presentVideoByteLocation === totalVideoBytes) { //Check if this is the last segment
                    console.log("ending stream")
                    mediaSource.endOfStream();
                }
                sourceBuffer.appendBuffer(data);
                console.log(mediaSource.readyState)
                console.log("adding source")
            }
            await fetchData()
        });

    } catch (error) {
        console.log(error)
    }
})

function strToArrbuf(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

async function importKey(rawKey,encName) {
    var key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        {name:encName},
        false,
        ["encrypt", "decrypt"]
    );
    return key;
}

async function appendNextSegment(mediaSource,sourceBuffer,data,complete) {
    try {
        const segmentData = data;
        
        //If the video is fully buffered, signal the end of the stream
        /* if (complete) { //Check if this is the last segment
            mediaSource.endOfStream();
        } */
    } catch (error) {
        console.error("Error fetching or appending segment:", error);
    }
}