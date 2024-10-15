const { settingsDB } = require("../db/DBs")
const multer = require('multer')
const generateUniqueId = require('../utils/generateUniqueId')
const path = require('path');

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

const rateLimit = async (req,res,next) => {
    try {
        //limit heavy requests in a session to just 10 or as specified
        //make this limit adjustable by the user i.e in settings
        //get the limit from the DB
        let rateLimit = (await settingsDB.getConfig("rateLimit"))[0].var
        rateLimit = parseInt(rateLimit)
        if (req.session.requestsMade < rateLimit) {
            next()
        } else {
            res.status(429).send({success:false,message:"You are doing some really hard work, while we do appreciate it, take a small and come back later"})
        }
    } catch (error) {
        res.render('../template/error',{
            error
        })
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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads');  // 'uploads/' is the directory
    },
    filename: function (req, file, cb) {
      cb(null, generateUniqueId(25) + path.extname(file.originalname));
    }
  });
const upload = multer({storage:storage})

module.exports = {
    auth,authClient,firewall,upload,rateLimit
}