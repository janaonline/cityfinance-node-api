const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const Config = require('../../../config/app_config');
const ObjectId = require('mongoose').Types.ObjectId;


module.exports.emailVerification = async (req, res) => {
    try {
        console.log(req.decoded)
        let msg = req.decoded.forgotPassword ? '' : 'Email verified';
        let ud = { isEmailVerified: true };
        if (req.decoded.role == 'USER') {
            if (req.decoded.forgotPassword) {
                ud['isEmailVerified'] = true;
            }
            ud.isActive = true;
        }
        let keys = [
            '_id',
            'accountantEmail',
            'email',
            'role',
            'name',
            'ulb',
            'state',
            'isEmailVerified',
            'isPasswordResetInProgress',
        ];
        let query = { _id: ObjectId(req.decoded._id) };
        let user = await User.findOne(query, keys.join(' ')).exec();
        console.log(user)
        if (user.role != 'USER') {
            ud.isEmailVerified = user.isEmailVerified;
        }
        if (user.role == 'ULB') {
            user.email = user.accountantEmail;
        }
        let du = await User.update(query, { $set: ud });
        let data = {};
        for (k in user) {
            if (keys.indexOf(k) > -1) {
                data[k] = user[k];
            }
        }
        data['purpose'] = 'WEB';
        const token = jwt.sign(data, Config.JWT.SECRET, {
            expiresIn: Config.JWT.TOKEN_EXPIRY,
        });
        // if(user.isEmailVerified==false){
        //     req.decoded.forgotPassword = user.role=="USER" ? false : true;
        // }
        if (user.isPasswordResetInProgress && req.decoded.forgotPassword) {
            req.decoded.forgotPassword = false;
            msg = 'Password is already reset';
        }
        let pageRoute = req.decoded.forgotPassword
            ? 'password/request'
            : 'login';

        let queryStr = `token=${token}&name=${user.name}&email=${user.email}&role=${user.role}&message=${msg}`;
        let url = `${process.env.HOSTNAME}/${pageRoute}?${queryStr}`;
        return res.redirect(url);
    } catch (e) {
        return res.send(`<h1>Error Occurred:</h1><p>${e.message}</p>`);
    }
};