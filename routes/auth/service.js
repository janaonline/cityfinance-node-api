const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const LoginHistory = require('../../models/LoginHistory');
const VisitSession = require('../../models/VisitSession');
const Config = require('../../config/app_config');
const Constants = require('../../_helper/constants');
const Service = require('../../service');
const Response = require('../../service').response;
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.register = async (req, res)=>{
    try{
        let data = req.body;
        data.role = data.role ? data.role : Constants.USER.DEFAULT_ROLE;
        if(data.role == "ULB"){
            data.status = "PENDING";
            if(data.commissionerEmail && data.ulb){
                let user = await User.findOne({ulb:ObjectId(data.ulb), role:data.role, isDeleted:false}).lean().exec();
                if(user){
                    return Response.BadRequest(res, {data},`Already an user is registered with requested ulb.`)
                }
            }else{
                return  Response.BadRequest(res, {data},`Commissioner Email and Ulb is required field.`)
            }
            data["isActive"] = false;
            data["email"] = data.commissionerEmail;
            data["password"] = Service.getRndInteger(10000,99999).toString();
        }
        let newUser = new User(data);
        let ud = await newUser.validate();
        newUser.password = await Service.getHash(newUser.password);
        newUser.save(async (err, user)=>{
            if(err){
                console.log("Err",err)
                return Response.BadRequest(res, err, err.code == 11000 ? 'Email already in use.':'Failed to register user');
                //return res.json({success:false, msg: err.code == 11000 ? 'Duplicate entry.':'Failed to register user'});
            }else{
                let link  =  await Service.emailVerificationLink(user._id,req.currentUrl);
                if(data.role == "ULB"){
                    let template = Service.emailTemplate.ulbSignup(user.name);
                    let mailOptionsCommisioner = {
                        to: user.email,
                        subject: template.subject,
                        html: template.body
                    };
                    Service.sendEmail(mailOptionsCommisioner);

                    /*let templateAcountant = Service.emailTemplate.ulbSignupAccountant(user.accountantName);
                    let mailOptionsAccountant = {
                        to: user.accountantEmail, // list of receivers
                        subject: templateAcountant.subject,
                        html: templateAcountant.body
                    };
                    Service.sendEmail(mailOptionsAccountant);*/

                }else{
                    let template = Service.emailTemplate.userSignup(user.name, link);
                    let mailOptions = {
                        to: user.email,
                        subject: template.subject,
                        html: template.body
                    };
                    Service.sendEmail(mailOptions);
                }
                return  Response.OK(res, user, `User registered`);
            }
        });
    }catch (e) {
        console.log("Exception",e);
        if(e.errors && Object.keys(e.errors).length){
            let o = {};
            for(k in e.errors){
                o[k] = e.errors[k].message
            }
            return Response.DbError(res, o,"Validation error")
        }else {
            return Response.DbError(res, e,"Validation error")
        }
    }
};
module.exports.login = async (req, res)=>{
    User.findOne({email: req.body.email}, async (err, user)=>{
        if(err){
            return Response.BadRequest(res, err,'Db Error');
        }else if(!user){
            return Response.BadRequest(res, err,'User not found');
        }else if(!user.isEmailVerified){
            return Response.BadRequest(res, err,'Email not verified yet.');
        } else if(user.isDeleted){
            return Response.BadRequest(res, err,'User is deleted.');
        }else if(user.status == "PENDING"){
            return Response.BadRequest(res, {},'Waiting for admin action on request.');
        }else if(user.status == "REJECTED"){
            return Response.BadRequest(res, {},`Your request has been rejected. Reason: ${user.message}`);
        }else {
            try{
                let isMatch = await Service.compareHash(req.body.password, user.password);
                if (isMatch) {
                    let keys  = ["_id","email","role","name",'ulb','state','isActive'];
                    let data = {};
                    for(k in user){
                        if(keys.indexOf(k)>-1){
                            data[k] = user[k];
                        }
                    }
                    let loginHistory = new LoginHistory({user:user._id, loggedInAt: new Date()});
                    let lh = await loginHistory.save();
                    data['purpose'] = 'WEB';
                    data['lh_id'] = lh._id;
                    const token = jwt.sign(data, Config.JWT.SECRET, {
                        expiresIn: Config.JWT.TOKEN_EXPIRY
                    });
                    return res.status(200).json({
                        success: true,
                        token: token,
                        user: {
                            name: user.name,
                            email: user.email,
                            isActive: user.isActive,
                            role:user.role
                        }
                    });
                } else {
                    return Response.BadRequest(res, {}, `Invalid username or password`);
                }
            }catch (e) {
                console.log("Error",e.message, e);
                return Response.BadRequest(res, {}, `Erorr while comparing password.`);
            }
        }
    })
};
module.exports.verifyToken = (req, res, next)=>{
    var token = req.body.token || req.query.token || req.params.token || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, function(err, decoded) {
            if (err) {
                console.log("verify-token jwt.verify : ",err.message);
                return Response.UnAuthorized(res, {},`Failed to authenticate token.`);
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({ success: false,message: 'No token provided.'});
    }
};
module.exports.resendVerificationLink = async (req, res)=>{
    try{
        let keys  = ["_id","email","role","name"];
        let user = await User.findOne({email:req.body.email}, keys.join(" ")).exec();
        if(user){
            let link  =  await Service.emailVerificationLink(user._id,req.currentUrl);
            let mailOptions = {
                to: user.email, //list of receivers
                subject: "Email Verification", //Subject line
                html: `
                    <b>Hi ${user.name},</b>
                    <p>Please verify link.</p>
                    <a href="${link}">click to activate</a>
                ` // html body
            };
            Service.sendEmail(mailOptions);
            return Response.OK(res, user, `Email verification link sent to ${user.email}.`);
        }else{
            return Response.BadRequest(res, req.body, `Email not found.`)
        }
    }catch (e) {
        return Response.BadRequest(res, req.body, `Exception occurred.`)
    }
};
module.exports.emailVerification = async (req, res)=>{
    try{
        let ud = {isEmailVerified:true};
        if(req.decoded.role == "USER"){
            ud.isActive = true;
        }
        let keys  = ["_id","email","role","name",'ulb','state'];
        let query = {_id:ObjectId(req.decoded._id)};
        console.log(query);
        let user = await User.findOne(query,keys.join(" ")).exec();
        let du = await User.update(query,{$set:ud});
        let data = {};
        for(k in user){
            if(keys.indexOf(k)>-1){
                data[k] = user[k];
            }
        }
        data['purpose'] = 'WEB';
        const token = jwt.sign(data, Config.JWT.SECRET, {
            expiresIn: Config.JWT.TOKEN_EXPIRY
        });
        let pageRoute = req.decoded.role == "USER" && !req.decoded.forgotPassword ? "login" : "password/request";
        let queryStr = `token=${token}&name=${user.name}&email=${user.email}&role=${user.role}&message=Email verified.`
        let url = `${process.env.HOSTNAME}/${pageRoute}?${queryStr}`;
        return res.redirect(url);
    }catch (e) {
        return res.send(`<h1>Error Occurred:</h1><p>${e.message}</p>`);
    }
};
module.exports.forgotPassword = async (req, res)=>{
    try{
        let user = await User.findOne({email: req.body.email}).exec();
        if(user){
            if(user.isDeleted){
                return Response.BadRequest(res, {},`Requested email:${req.body.email} is not registered.`);
            }else if(!user.isActive){
                return Response.BadRequest(res, {},`Requested email:${req.body.email} is not activated.`);
            }else {
                let newPassword = Service.getRndInteger(10000,99999).toString();
                let passwordHash = await Service.getHash(newPassword);
                try{
                    let du = await User.update({_id:user._id},{$set:{password:passwordHash}});
                    let keys  = ["_id","email","role","name"];
                    let data = {};
                    for(k in user){
                        if(keys.indexOf(k)>-1){
                            data[k] = user[k];
                        }
                    }
                    data['purpose'] = 'EMAILVERFICATION';
                    data["forgotPassword"] = true;
                    const token = jwt.sign(data, Config.JWT.SECRET, {
                        expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
                    });
                    let link  =  await Service.emailVerificationLink(user._id,req.currentUrl);
                    let template = Service.emailTemplate.userForgotPassword(user.name,link);
                    let mailOptions = {
                        to: user.email,
                        subject: template.subject,
                        html:template.body
                    };
                    Service.sendEmail(mailOptions);
                    return Response.OK(res, {},`Link sent to email ${user.email}`);
                }catch (e) {
                    return Response.BadRequest(res, {},`Exception: ${e.message}.`);
                }
            }
        }else{
            return Response.BadRequest(res, {},`Requested email:${req.body.email} is not registered.`);
        }
    }catch (e) {
        return Response.BadRequest(res, {},`Exception:${e.message}`);
    }
};
module.exports.resetPassword = async (req, res)=>{
    try{
        if(req.body.password){
            let user = req.decoded;
            let passwordHash = await Service.getHash(req.body.password);
            console.log("passwordHash",passwordHash);
            let du = await User.update({_id:ObjectId(user._id)},{$set:{password:passwordHash, isEmailVerified:true}});
            return Response.OK(res, {},'Password reset');
        }else{
            return Response.BadRequest(res, {},`Password is required field.`);
        }
    }catch (e) {
        return Response.BadRequest(res, {},`Exception:${e.message}`);
    }
};
module.exports.startSession = (req, res)=>{
    let visitSession = new VisitSession();
    visitSession.save((err, data)=>{
        if(err){
            return Response.DbError(res, err);
        }else{
            return Response.OK(res,{_id:data._id});
        }
    });
}
module.exports.endSession = async(req, res)=>{
    try{
        let visitSession = await VisitSession.update({_id:ObjectId(req.params._id)},{$set:{isActive:false}});
        return Response.OK(res, visitSession);
    }catch (e) {
        return Response.DbError(res, e);
    }
}
