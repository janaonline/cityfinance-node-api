const jwt = require('jsonwebtoken');
const Config = require('../config/app_config');
const Response = require('./response');
const User = require('../models/User');

module.exports = async function (req, res, next) {

    var token = req.body.token || req.query.token || req.params.token || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, async function (err, decoded) {
            if (err) {
                return Response.UnAuthorized(res, {}, `Failed to authenticate token.`);
            } else {
                // get user id from token and get user details and attach to req object
                const userId = decoded._id;
                const user = await User.findOne({ _id: userId }, { role: 1, ulb: 1, state: 1, isActive: 1, isDeleted: 1 });
                if (!user) {
                    return Response.UnAuthorized(res, {}, `User not found.`);
                }
                req.user = user;
                req.decoded = { ...decoded, ...user.toObject() };

                console.log("Decoded Token :: ", req.decoded)

                if (req.decoded["passwordExpires"] && req.decoded["passwordExpires"] < Date.now()) {
                    return Response.UnAuthorized(res, {}, `Please reset your password.`);
                }
                next();
            }
        });
    } else {
        return Response.UnAuthorized(res, { sessionExpired: true }, `Session Expired!`);

    }
};