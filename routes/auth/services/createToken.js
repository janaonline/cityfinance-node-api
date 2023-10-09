const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const LoginHistory = require('../../../models/LoginHistory');
const Config = require('../../../config/app_config');
const Helper = require('../../../_helper/constants');
const ObjectId = require('mongoose').Types.ObjectId;


module.exports.createToken = (user, sessionId, body) => {
    return new Promise(async (resolve, reject) => {
        try {
            let keys = [
                '_id',
                'email',
                'role',
                'name',
                'ulb',
                'state',
                'isActive',
                'isRegistered',
            ];
            let data = {};
            for (k in user) {
                if (keys.indexOf(k) > -1) {
                    data[k] = user[k];
                }
            }

            let inactiveTime = Date.now() + Helper.INACTIVETIME.TIME;

            let loginHistory = new LoginHistory({
                user: user._id,
                loggedInAt: new Date(),
                visitSession: ObjectId(sessionId),
                inactiveSessionTime: inactiveTime,
                loginType: body?.type ? body?.type : "15thFC"
            });

            let lh = await loginHistory.save();
            data['purpose'] = 'WEB';
            data['lh_id'] = lh._id;
            data['sessionId'] = sessionId;
            data['passwordExpires'] = user.passwordExpires;
            data['passwordHistory'] = user.passwordHistory;
            const token = jwt.sign(data, Config.JWT.SECRET, {
                expiresIn: Config.JWT.TOKEN_EXPIRY,
            });
            var updates = {
                $set: { loginAttempts: 0 },
            };
            if (!user.emailFlag) {
                user.email = user.accountantEmail;
            }
            await User.update({ ulb: ObjectId(user.ulb), role: 'ULB' }, updates).exec(); // set
            resolve(token)
        } catch (error) {
            reject({ message: error.message })
        }
    });
}
