const fs = require('fs')
const fsPromises = fs.promises
const path = require('path')
const sources = require("../sources/sources")
const getIdFromUrl = require("../utils/getIdFromUrl")

const streamVideoFile = (fileId,type,start)=>{
    //parse the start argument if not done already
    const chunkSize = 1024 * 1000 * 1000 //Take 1mb from the videofile
    const videoSize = fs.statSync(`../uploads/${fileId}.mp4`).size
    //start and end: ranges of the video file to cut out
    const end = Math.min(start + chunkSize, videoSize) 

    let videoStream = fs.createReadStream(`../uploads/${fileId}.mp4`,{
        start:start,end:end
    })

    const contentLength = end-start
    const headers = {
        "Accept-Ranges":"bytes",
        "Content-Type":"video/mp4",
        "Content-Length":`${contentLength}`,
        "Content-Range":`bytes ${start}-${end}/${videoSize}`
    } 
    return {headers,videoStream}
}

/**
 * gets the hls files depending on the id and returns their data
 * @param {string} id - the id of the hls file or m3u8 file
 * @param {boolean} part - whether we are sending the main m3u8 file or the ts files
 */
const getHlsDataFile = async (id,part = false)=>{
    //write code to get file name.
    let fileName;

    //check if the file exists
    if (!part) {
        //read contents of the m3u8 file and return
        let fileContents = await fsPromises.readFile(path.join(__dirname,`../utils/split_vid/videos/${id}.m3u8`))
        fileContents = fileContents.toString("utf-8")
        return fileContents
    }
    //read contents of the m3u8 file and return
    let fileContents = await fsPromises.readFile(path.join(__dirname,`../utils/split_vid/videos/${id}`))
    return fileContents
    
}

const getStream = (type,link) => {
    if (type == "") getIdFromUrl(link,type)
    sources.Direct.downloadStream()
    sources.GoogleDrive.downloadStreamFile()
    sources.Yandex.downloadStreamVid()
}

module.exports = {
    streamVideoFile,getHlsDataFile,getStream
}