const fs = require('fs')
const crypto = require('crypto')
const Stream = require('stream')

/**
 * Encrypts a video stream using AES-256-CBC encryption.
 * 
 * @param {stream.Readable} readStream - Node.js ReadStream of the video file.
 * @param {string} encryptionKey - 32-byte encryption key.
 * @param {string} iv - 16-byte initialization vector.
 * @returns {Promise<Stream.Readable>} - Encrypted video data.
 */
const encryptVideoStream = (readStream, encryptionKey, iv) => {
    return new Promise((resolve, reject) => {
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), Buffer.from(iv));
        const encryptedChunks = [];

        readStream.on('data', (chunk) => {
            encryptedChunks.push(cipher.update(chunk));
        });

        readStream.on('end', () => {
            encryptedChunks.push(cipher.final());
            const encryptedData = Buffer.concat(encryptedChunks);
            const readable = new Stream.Readable();
            readable.push(encryptedData);
            readable.push(null); // Signals the end of the stream
            resolve(readable);
        });

        readStream.on('error', (err) => {
            reject(err);
        });
    });
}



module.exports = {
    encryptVideoStream
}