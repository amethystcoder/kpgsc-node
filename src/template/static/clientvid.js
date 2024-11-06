window.addEventListener("load",async ()=>{
    try {
        let firstAttempt = true
        let totalVideoBytes = 0
        let presentVideoByteLocation = 0
        //try to slow down the speed at which the client side asks for data
        //we can use set timeout for this
        while (firstAttempt || (totalVideoBytes != presentVideoByteLocation)) {
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
           /*  //we know the data should be a buffer array, so we will treat it as such
            //get the data and console.log it
            let data = await response.arrayBuffer()
            console.log(data)
            //get the encryption key from the headers and decrypt the arrayBuffer
            const encData = responseHeaders.get("imp-data")
            const encDataSplit = encData.split(";")
            const name = encDataSplit[2] // how it usually is in the db
            const key = await importKey(strToArrbuf(atob(encDataSplit[0])),name)
            let textEncoder = new TextEncoder()
            const iv = textEncoder.encode(atob(encDataSplit[1])); 
            const length = Number(encDataSplit[3])
            console.log(iv)
            let decrypter = await crypto.subtle.decrypt({
                iv:iv,//set iv here. IV, encryption name and key must be gotten from the server side
                name:name//set algorithm name here
            },key,data) *///get key from server side
        }   
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
        encName,
        true,
        ["encrypt", "decrypt"]
    );
    return key;
}