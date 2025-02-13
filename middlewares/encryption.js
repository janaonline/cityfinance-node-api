
var CryptoJS = require("crypto-js");


const decryptPassword = (password)=>{
    try{
        let key = process.env.ENCRYPTION_STRING
        let bytes  = CryptoJS.AES.decrypt(password, key);
        let decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
        return decryptedPassword
    }
    catch(err){
        console.log("error in decryptPassword :: ",err.message)
    }
}
module.exports.getDecryptedPassword = (req,res,next)=>{
    try{
        let {password,confirmPassword} = req.body
        req.body.password = decryptPassword(password)
        if(confirmPassword){
            req.body.confirmPassword = confirmPassword
        }
        console.log(req.body)
    }
    catch(err){
        console.log(err)
        console.log("error in getDecryptedPassword :: ",err.message)
    }
    next()
}