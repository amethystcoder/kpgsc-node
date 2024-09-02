const fs = require("fs").promises
const axios = require("axios")
const path = require("path")
const https = require("https")


/**
 * 
 * @param {string} url 
 * @param {*} res 
 */
const downloadStream = async (url,res)=>{
    /* request = https.get(url,(response)=>{
        response.pipe(res)
    }) */
    const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream'
    })

    response.data.pipe(res)

    return new Promise((resolve, reject) => {
     response.data.on('end',()=>{
        resolve()
     })
     response.data.on('error',(err)=>{
        reject(err)
     })
    })
}


module.exports = {
    downloadStream
}