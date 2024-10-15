import {Response} from 'express'

/**
 * 
 * @param {Error} err 
 * @param {Response} res
 */
const HandleError = (err,res,message)=>{
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
    if (err instanceof SyntaxError) res.status(500).send("An Error Occured")
}

module.exports = {HandleError} 