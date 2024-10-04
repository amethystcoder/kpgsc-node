const sql = require('mysql2');
require('dotenv').config()

//create a function that will put arguments into the sql pool
/**
 * 
 * @param {string} host 
 * @param {string} user 
 * @param {string} password 
 * @param {string} database 
 * @returns 
 */
const connectionPool = (host,user,password,database)=>{
    return sql.createPool({
        connectionLimit:20,host,user,password, database,
        waitForConnections:true,
        flags:'IGNORE_SPACE'
    })
}

const dbInstance = sql.createPool({
    connectionLimit:20,
    host:"localhost",
    user:"root",
    password:"",
    database: "videodb",
    waitForConnections:true,
    flags:'IGNORE_SPACE'
}).promise()

// add other functions as necessary, error handling and event listeners

module.exports = {connectionPool, dbInstance}
