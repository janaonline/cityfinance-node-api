
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const Config = require('../../../config/app_config');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.changePassword = async (req, res) => {
    let msg = '';
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
    return res.json({ token: token });
};