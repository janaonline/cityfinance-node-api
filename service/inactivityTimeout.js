const jwt = require('jsonwebtoken');
const Config = require('../config/app_config');
const Response = require('./response');
const LoginHistory = require('../models/LoginHistory');
const Helper = require('../_helper/constants');
const ObjectId = require("mongoose").Types.ObjectId;

module.exports = async function(req, res, next) {

    var token = req.body.token || req.query.token || req.params.token || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, async function(err, decoded) {
            if (err) {
                return Response.UnAuthorized(res, {},`Failed to authenticate token.`);
            } else {
                req.decoded = decoded;
                if(req.decoded.sessionId)
                {   
                    userId = ObjectId(req.decoded._id);
                    let query = {user:ObjectId(userId),visitSession:ObjectId(req.decoded.sessionId)}
                    let login = await LoginHistory.findOne(query).sort({_id:-1}).exec();
                    if(login){

                        if(Date.now() >= login.inactiveSessionTime){
                            return Response.UnAuthorized(res, {},`The client's session has expired and must log in again.`,440);
                        }
                        let inactiveTime = Date.now()+ Helper.INACTIVETIME.TIME; 
                        let u = LoginHistory.update({"_id":ObjectId(login._id)},{$set:{inactiveSessionTime:inactiveTime}}).exec();                      
                    }
                    else{
                        return Response.UnAuthorized(res, {},`LoginHistory Not found`,400);
                    }
                }
                else{
                    return Response.UnAuthorized(res, {},`No sessionId provided`);
                }  
                
                next();
            }
        });
    } else {
       
        return Response.UnAuthorized(res, {},`No token provided`);

    }
};