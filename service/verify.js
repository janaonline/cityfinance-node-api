const jwt = require('jsonwebtoken');
const Config = require('../config/app_config');
const Response = require('./response');

module.exports = function(req, res, next) {

    var token = req.body.token || req.query.token || req.params.token || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, function(err, decoded) {
            if (err) {
                return Response.UnAuthorized(res, {},`Failed to authenticate token.`);
            } else {
                req.decoded = decoded;

                if (req.decoded["passwordExpires"] && req.decoded["passwordExpires"] < Date.now()) {
                  return Response.UnAuthorized(res, {},`Please reset your password.`);
                }
                next();
            }
        });
    } else {
       
        return Response.UnAuthorized(res, {},`No token provided`);

    }
};