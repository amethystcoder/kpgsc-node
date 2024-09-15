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
const firewall = (req,res,next) => {
    try {
        if (req) {
            next()
        } else {
            res.status(401).send({success:false,message:"unauthorized"})
        }
    } catch (error) {
        res.status(401).send({success:false,message:"unauthorized"})
    }
}

const authClient = (req,res,next) => {
    try {
        if (req.session.username) {
            next()
        } else {
            res.redirect('./login') 
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