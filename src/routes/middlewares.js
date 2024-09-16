const { settingsDB } = require("../db/DBs")

//auth middleware
const auth = (req,res,next) => {
    try {
        if (req.session.username) {
            next()
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.status(401).send({success:false,message:"unauthorized"})
    }
}

//firewall middleware
const firewall = async (req,res,next) => {
    try {
        const allowedDomains = (await settingsDB.getConfig("acceptedDomains"))[0].var
        let acceptedDomainList = allowedDomains.split(",")
        if (acceptedDomainList.includes(req.protocol+"://"+req.headers.host)) {
            next()
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        console.log(error)
        res.status(401).send({success:false,message:"unauthorized"})
    }
}

const authClient = (req,res,next) => {
    try {
        if (req.session.username) {
            next()
        } else {
            res.redirect('../login') 
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
    }
}

module.exports = {
    auth,authClient,firewall
}