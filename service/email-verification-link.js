const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Config = require('../config/app_config');
module.exports = (_id, currentUrl)=>{
    return new Promise(async (resolve, reject)=>{
        let select  = ["_id","email","role","name"].join(" ");
        try {
            let user  = await User.findOne({_id:_id},select).lean();
            user['purpose'] = 'EMAILVERFICATION';
            const token = jwt.sign(user, Config.JWT.SECRET, {
                expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
            });
            let link  =  `${currentUrl}/email_verification?token=${token}`;
            resolve(link)
        }catch (e) {
            reject(e);
        }
    });
}