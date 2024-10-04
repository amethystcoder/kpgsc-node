const ftp = require('ftp-client')


const connectToFTP = ()=>{
    const Client = new ftp(
        {host: ip_address,port: 21,user: username, password: password},
        {logging: 'debug'}
    )//assumes port is 21
    Client.ftp.connect()
    return Client.ftp
}

const downloadFile = () => {
    //connect to ftp server
    let FTPServer = connectToFTP()
    FTPServer.list("/",(err,listing)=>{
        if (err) console.log(err)
        console.log(listing)
    })
}