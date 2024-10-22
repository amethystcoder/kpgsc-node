//const ftp = require('ftp-client')
const ftpServe = require('ftp')
const fs = require('fs')

const ftpClient = new ftpServe()

const connectToFTP = ()=>{
    /* const Client = new ftp(
        {host: ip_address,port: 21,user: username, password: password},
        {logging: 'debug'}
    )//assumes port is 21
    Client.ftp.connect()
    return Client.ftp */
    ftpClient.on( 'ready', () => {
    } );
    
    ftpClient.connect( {
        'host': 'ftp://127.0.0.1:21',
        'user': '',
        'password': ''
    } );
    return ftpClient
}

const downloadFile = (fileloc) => {
    //connect to ftp server
    let FTPServer = connectToFTP()
    FTPServer.on( 'ready', () => {
        FTPServer.get(fileloc,(err,stream)=>{
            if (err) throw err;
            stream.once('close', function() { FTPServer.end(); });
            stream.pipe(fs.createWriteStream('foo.local-copy.txt'));
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