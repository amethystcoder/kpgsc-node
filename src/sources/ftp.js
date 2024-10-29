//const ftp = require('ftp-client')
const ftpServe = require('ftp')
const fs = require('fs')

const ftpClient = new ftpServe()


const connectToFTP = (host,user,password)=>{
    /* const Client = new ftp(
        {host: ip_address,port: 21,user: username, password: password},
        {logging: 'debug'}
    )//assumes port is 21
    Client.ftp.connect()
    return Client.ftp */
    
    ftpClient.connect( {
        'host': host,
        'user': user,
        'password': password
    } );
    return ftpClient
}

const downloadFile = (fileloc,fileName) => {
    //connect to ftp server
    let FTPServer = connectToFTP()
    FTPServer.on( 'ready', () => {
        FTPServer.get(fileloc,(err,stream)=>{
            if (err) throw err;
            stream.once('close', function() { FTPServer.end(); });
            stream.pipe(fs.createWriteStream('../uploads/'+fileName+'.mp4'));
        })
    } );
    return true
}

const listFiles = () => {
    //connect to ftp server
    let fileListing = []
    let FTPServer = connectToFTP()
    FTPServer.on( 'ready', () => {
        FTPServer.list("/",(err,listing)=>{
            if (err) console.log(err)
            if (listing) {
                fileListing = listing 
                FTPServer.end();
            }
        })
    } );
    return listing
}


module.exports = {listFiles,downloadFile}