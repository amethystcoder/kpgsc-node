const DB = require('../db/DBs')
let fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
 
/**
 * 
 * @param {string} email 
 * @param {string} persistenceId 
 * @param {string} linkId 
 * @returns 
 */
const sendHlsRequest = async (email,persistenceId,linkId)=>{
    //select a random server from the database
    let Activeservers = await DB.serversDB.getActiveservers()
    //select a random server
    let chosenServer = Activeservers[Math.floor(Math.random() * Activeservers.length)]
    const response = await fetch(chosenServer.domain+"/api/convert/hls",{
        method:"POST",
        headers: {'Content-Type': 'application/json'},
        body:JSON.stringify({
            email,persistenceId,linkId:linkId,server_id:chosenServer.id
        })
    })
    return await response.json()
}

/**
 * 
 * @param {string} email 
 * @param {string} persistenceId 
 * @param {string[]} servers 
 * @param {string[]} links 
 * @returns 
 */
const sendMultipleHlsRequest = async (email,persistenceId,servers,links)=>{
    const data = []
    let availableServers = await DB.serversDB.getServerUsingId(servers[0],servers.slice(1))
        let rateLimitSize = (await DB.settingsDB("rateLimit"))[0].var
        rateLimitSize = parseInt(rateLimitSize)
        req.session.rateLimit += links.length
        for (let index = 0; index < availableServers.length; index++) {
            const response = await fetch(availableServers[index].domain+"/api/hls/bulkconvert/",{
                method:"POST",
                headers: {'Content-Type': 'application/json'},
                body:{
                    email,persistenceId,links:links
                }
            })
            data.push(await response.json())
        }
        return data
}

module.exports = {sendHlsRequest,sendMultipleHlsRequest}