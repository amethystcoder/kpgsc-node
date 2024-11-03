const fluentFfmpeg = require('fluent-ffmpeg')
const Ffmpeg = require('@ffmpeg-installer/ffmpeg')
const fs = require('fs/promises')
const path = require("path")

fluentFfmpeg.setFfmpegPath(Ffmpeg.path)

/**
 * 
 * @param {string} filePath 
 */
const convertVideo = (filePath)=>{
    try {
        const acceptedVideoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'flv']
        const lastDotOccurence = filePath.lastIndexOf(".")
        let fileExtension = filePath.slice(lastDotOccurence + 1)
        let filewithoutExtension = filePath.slice(0,lastDotOccurence)
        if (acceptedVideoExtensions.includes(fileExtension)) {
            fluentFfmpeg(`${path.join(__dirname,filePath)}`,{timeout:4200}).output(path.join(__dirname,`${filewithoutExtension}.mp4`)).on("end",()=>{
                console.log("done")
                fs.unlink(path.join(__dirname,filePath))
                //add code here to delete the mkv or other file
            })
            .on("progress",(progress)=>{
                console.log(progress)
            })
            .on("error",(err,stdout,stderr)=>{
                console.log(err)
                console.log(stderr)
                console.log(stdout)
            }).run()   
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = {
    convertVideo
}