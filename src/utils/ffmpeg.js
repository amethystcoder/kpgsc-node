const fluentFfmpeg = require('fluent-ffmpeg')
const Ffmpeg = require('@ffmpeg-installer/ffmpeg')
const fs = require('fs')
const websocketConnection = require("../routes/websocket")

fluentFfmpeg.setFfmpegPath(Ffmpeg.path)

//Alot of work to be done on this funtion
//filePath could/should be a link 
function createHlsFiles(filePath,fileName) {
    let result = ""
    try {
        if (!fs.existsSync(`./uploads/videos/${fileName}`)) {
            fs.mkdirSync(`./uploads/videos/${fileName}`)   
        }
        //check if file exists in server
        if (!fs.existsSync(filePath)) throw Error("file could not be found")

        //attempt to convert file to m3u8
        fluentFfmpeg(`${filePath}`, {timeout: 43200}).addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 20',
            '-hls_list_size 0',
            '-f hls'
        ]).output(`./uploads/videos/${fileName}/${fileName}.m3u8`)
        .on('error', (err, stdout, stderr) => {
            if (err) {
                console.log(err.message);
                console.log("stderr:\n" + stderr);
            }
        }).on('progress', (progress) => {
            //TODO: find a way to send the progress back to the client (through websockets or another way)
            websocketConnection.clients.forEach((client)=>{
                if(client.readyState === websocket.OPEN){
                    client.send(`progress: ${progress.frames} frames`)
                }
            })
            console.log(`progress: ${progress.frames} frames`)
        }).on('end', () => {
            console.log('processing completed')
            result = "successful"
        }).run()   
    } catch (error) {
        console.log(error)
        result = error
    }

    return result
}

//createHlsFiles("../uploads/WKim6lktPmBanpLzxBjQxYmwvRaNL4JeNBE6Q8B5kqIxd1VSBX.mp4","WKim6lktPmBanpLzxBjQxYmwvRaNL4JeNBE6Q8B5kqIxd1VSBX")

module.exports = {
    createHlsFiles
}