const fluentFfmpeg = require('fluent-ffmpeg')
const Ffmpeg = require('@ffmpeg-installer/ffmpeg')
const fs = require('fs')
const {webSocketServer,clients} = require("../routes/websocket")
const getVideoDuration = require("./getVideoDuration")
const {convertTimeStampToSeconds} = require("./timeStamps")

fluentFfmpeg.setFfmpegPath(Ffmpeg.path)

async function createHlsFiles(filePath,fileName,LinkTitle) {
    let result = ""
    try {
        if (!fs.existsSync(`./uploads/videos/${fileName}`)) {
            fs.mkdirSync(`./uploads/videos/${fileName}`)
        }
        //check if file exists in server
        if (!fs.existsSync(filePath)) throw Error("file could not be found")

        //get the total timemark of the video to create the percentage
        const VideoDurationInSeconds = await getVideoDuration(`${filePath}`)

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
            //convert the timeMark to seconds and calculate the percent if progress.percent is undefined
            const timeStampConvertedToSeconds = convertTimeStampToSeconds(progress.timemark)
            const progressInPercent = (timeStampConvertedToSeconds/VideoDurationInSeconds) * 100

            //send the progress back to the client (through websockets or another way)
            webSocketServer.clients.forEach((client)=>{
                if(client.readyState === 1){
                    client.send({
                        progress:progressInPercent,
                        message:`progress: ${progressInPercent}%`,
                        completed:false,
                        fileId:fileName,
                        name:LinkTitle
                    })
                }
            })
        }).on('end', () => {
            //send the progress back to the client (through websockets or another way)
            webSocketServer.clients.forEach((client)=>{
                if(client.readyState === 1){
                    client.send({
                        progress:100,
                        message:`progress: 100%`,
                        completed:true,
                        fileId:fileName,
                        name:LinkTitle
                    })
                }
            })
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