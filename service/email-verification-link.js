const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Config = require('../config/app_config');

/**
 *
 * @param {string} _id
 * @param {string} currentUrl
 * @param {boolean} forgotPassword
 */
module.exports = (_id, currentUrl,forgotPassword=false) => {
    return new Promise(async (resolve, reject) => {
        let select = ['_id', 'email', 'role', 'name'].join(' ');
        try {
            let link;
            // if (token) {
            //     link = `${currentUrl}/api/v1/email_verification?token=${token}`;
            //     return resolve(link);
            // }
            let user = await User.findOne({ _id: _id }, select).lean();
            let du = await User.update({_id:_id},{$set:{isPasswordResetInProgress:false}})
            user['purpose'] = 'EMAILVERFICATION';
            user['forgotPassword'] = forgotPassword;
            if(forgotPassword){
             user['url']='password/request' 
            }
            token = jwt.sign(user, Config.JWT.SECRET, {
                expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
            });
            link = `${currentUrl}/api/v1/email_verification?token=${token}`;
            resolve(link);
        } catch (e) {
            reject(e);
        }
    });
};
