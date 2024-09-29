const dbInstance = require('../db/configs/dbConfig')

//A list of common functions for CRUD on the ads database
//Feel free to add more as needed

const table = "ads";

const tableColumnNames = 'id,title,type,xml_file,start_offset';

/**
 * gets the number of items in the table
 * @argument {string} restOfQuery are the other conditions in the query to look for 
 */
let getCount = async (restOfQuery = '')=>{
    let where = restOfQuery && restOfQuery != '' ? 'WHERE' : ''
    let [result] = await dbInstance.query(`SELECT COUNT(*) FROM ${table} ${where} ${restOfQuery}`)
    return result;
}

/**
 * gets the items in the table
 * @argument {string} restOfQuery are the other conditions in the query to look for 
 */
let get = async (restOfQuery = '')=>{
    let where = restOfQuery && restOfQuery != '' ? 'WHERE' : ''
    let [result] = await dbInstance.query(`SELECT * FROM ${table} ${where} ${restOfQuery}`)
    return result;
}

let deletion = async (restOfQuery = '')=>{
    let where = restOfQuery && restOfQuery != '' ? 'WHERE' : ''
    let [result] = await dbInstance.query(`DELETE FROM ${table} ${where} ${restOfQuery}`)
    return result;
}

let update = async (set = '',restOfQuery = '')=>{
    let where = restOfQuery && restOfQuery != '' ? 'WHERE' : ''
    let [result] = await dbInstance.query(`UPDATE ${table} ${set} ${where} ${restOfQuery}`)
    return result;
}

/**
 * gets a distinct column from the table
 * @param {string} name the name of the column
 * @param {string} restOfQuery are the other conditions in the query to look for 
 */
let getDistinct = async (name,restOfQuery = '')=>{
    name = name ? name : "*"
    let where = restOfQuery && restOfQuery != '' ? 'WHERE' : ''
    let [result] = await dbInstance.query(`SELECT ${name} FROM ${table} ${where} ${restOfQuery}`)
    return result;
}

/**
 * gets all available ads
 * @argument {boolean} number determines whether to just send the number of items in storage 
 */
let getAllads = async (number=false)=>{
    if (number) return await getCount()
    return await get()
}

//
/**
 * gets all active ads
 * @argument {boolean} number determines whether to just send the number of items in storage 
 */
let getActiveads = async (number=false)=>{
    if (number) return await getCount("status = 'active'")
    return await get("status = 'active'")
}

//
/**
 * gets all pop ads
 * @argument {boolean} number determines whether to just send the number of items in storage 
 */
let getpopads = async (number=false)=>{
    if (number) return await getCount("type = 'popad'")
    return await get("type = 'popad'")
}

/**
 * @argument {string} id
 */
let getadUsingId = async (adsId)=>{
    return await get(`id = '${dbInstance.escape(adsId)}'`)
}


/**
 * create a new ads in the database
 * @argument {Object} adsData object containing ads data to be stored... properties include
 * title,type,code
 */
let createNewAd = async (adsData)=>{
    if (typeof adsData != 'object') throw TypeError("argument type is not correct, it should be an object")
    //TODO some other checks here to be strict with the type of data coming in
    let result = await dbInstance.query(`INSERT INTO ${table} (title,type,xml_file,start_offset) VALUES (?,?,?,?)`, [adsData.title,adsData.type,adsData.xml_file,adsData.start_offset])
    return result;
}

/**
 * @argument {string} id 
 * @argument {Array | string} column colunms to check. If it is an array, then the `value` argument must also be 
 * an array, same for when it is a string 
 * @argument {Array | string} value type and size must always correlate with `column` argument 
 */
let updateUsingId = async (id,column,value)=>{
    let updateColumnBlacklists = ["id"];//coulumns that cannot be updated
    let queryConditional = `id = '${id}'`
    let set = 'SET '
    if (Array.isArray(column) && Array.isArray(value)) {
        for (let index = 0; index < column.length; index++) {
            if (!updateColumnBlacklists.includes(column[index])) {
                set += `${column[index]} = '${value[index]}',`
            }
        }
        set = set.substring(0,set.length - 1)
        return await update(set,queryConditional)
    }
    if (typeof column == 'string' && typeof value == 'string'){
        if (!updateColumnBlacklists.includes(column)) {
            set += `${column} = '${value}'`;
            return await update(set,queryConditional)   
        }
    }
    throw TypeError("arguments are not of the right type "+ typeof column + typeof value)
}

/**
 * deletes a ads using its ID
 */
let deleteUsingId = async (id)=>{
    return await deletion(`id = '${id}'`);
}

/**
 * performs a custom delete on the db based on a number of conditions
 * @argument {Array | string} column colunms to check. If it is an array, then the `value` argument must also be 
 * an array, same for when it is a string 
 * @argument {Array | string} value type and size must always correlate with `column` argument 
 */
let customDelete = async (column,value)=>{
    let queryConditions = ""
    if (Array.isArray(column) && Array.isArray(value)) {
        queryConditions = `'${column[0]}' = '${value[0]}'`;
        for (let index = 1; index < column.length; index++) {
            queryConditions += `AND ${column[index]} = '${value[index]}'`;
        }
        return await deletion(queryConditions)
    }
    if (typeof column == 'string' && typeof value == 'string') {
        queryConditions = `${column} = '${value}'`;
        return await deletion(queryConditions)
    }
    throw TypeError("arguments are not of the right type "+ typeof column + typeof value)
}

module.exports = {
    getDistinct,
    getActiveads,
    getAllads,
    getadUsingId,
    getpopads,
    createNewAd,
    updateUsingId,
    deleteUsingId,
    customDelete,
}