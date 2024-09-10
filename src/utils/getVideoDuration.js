const fs = require('fs')

//gets video duration in (seconds)
const getVideoDuration = async (filepath)=>{
    const fsp = fs.promises

    const  buff = Buffer.alloc(100)
    const fileHandle = await fsp.open(filepath, 'r')
    const { buffer } = await fileHandle.read(buff, 0, 100, 0)
    await fileHandle.close()

    const start = buffer.indexOf(Buffer.from('mvhd')) + 16
    const timeScale = buffer.readUInt32BE(start, 4)
    const duration = buffer.readUInt32BE(start + 4, 4)
    const videoLength = Math.floor(duration/timeScale * 1000) / 1000

    return videoLength
}

module.exports = getVideoDuration