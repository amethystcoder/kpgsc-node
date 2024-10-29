const fs = require('fs')
const crypto = require('crypto')


/**
 * 
 * @param {fs.ReadStream} MediaFile 
 */
const encryptFile = (MediaFile) => {
    //check if mediafile is correct 
    //encrypt media file
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    //add readStream into buffers 
    let buff = []
    while (MediaFile.readable && (MediaFile.readableAborted || MediaFile.readableEnded)) {
        let dt = MediaFile.read()
        buff.push(dt)
        console.log(dt)
    }
    buff = Buffer.concat(buff)
    //return encrypted media file
    return cipher.update(buff)
}


//test code
let stream = fs.createReadStream("../uploads/8iyv7MUjLBuIRdRL3IRonyUrWjyRNp8n2MjpY7HSrfRTJWLUXv.mp4")
console.log(encryptFile(stream))

module.exports = {
    encryptFile
}