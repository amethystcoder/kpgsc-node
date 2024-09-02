const fluentFfmpeg = require('fluent-ffmpeg')
const Ffmpeg = require('@ffmpeg-installer/ffmpeg')
const fs = require('fs')

fluentFfmpeg.setFfmpegPath(Ffmpeg.path)

//Alot of work to be done on this funtion
//fileName could/should be a link 
function createHlsFiles(fileName) {
    const result = ""
    try {
        //check if file exists in server

        //attempt to convert file to m3u8
        fluentFfmpeg(`${fileName}`, {timeout: 43200}).addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls'
        ]).output(`videos/${fileName}.m3u8`)
        .on('error', (err) => {
            console.log('an error occured processing the file.\n err:',err)
            result = err
        }).on('progress', (progress) => {
            console.log(`progress: ${progress.frames } frames`)
        }).on('end', () => {
            console.log('processing completed')
            result = "successful"
        }).run()   
    } catch (error) {
        result = error
    }
}

module.exports = {
    createHlsFiles
}