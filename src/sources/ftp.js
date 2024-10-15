const ftp = require('ftp-client')
const ftpServe = require('ftp')


const connectToFTP = ()=>{
    /* const Client = new ftp(
        {host: ip_address,port: 21,user: username, password: password},
        {logging: 'debug'}
    )//assumes port is 21
    Client.ftp.connect()
    return Client.ftp */
    const ftpClient = new ftpServe()
    ftpClient.on( 'ready', function() {
        ftpClient.put( './prueba.jpg', '/www/img/prueba.jpg', function( err, list ) {
            if ( err ) throw err;
            ftpClient.end();
        } );
    } );
    
    ftpClient.connect( {
        'host': '*****************',
        'user': '***************',
        'password': '**************'
    } );
}

const downloadFile = () => {
    //connect to ftp server
    let FTPServer = connectToFTP()
    FTPServer.list("/",(err,listing)=>{
        if (err) console.log(err)
        console.log(listing)
    })
}