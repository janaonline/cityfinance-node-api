const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Config = require('../../config/app_config');
const Constants = require('../../_helper/constants');
const Service = require('../../service')
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.register = async (req, res)=>{
    try{
        let data = req.body;
        data.role = data.role ? data.role : Constants.USER.DEFAULT_ROLE;
        let newUser = new User(data);
        let ud = await newUser.validate();
        newUser.password = await Service.getHash(newUser.password);
        newUser.save((err, user)=>{
            if(err){
                console.log("Err",err)
                return res.json({success:false, msg: err.code == 11000 ? 'Duplicate entry.':'Failed to register user'});
            }else{
                let keys  = ["_id","email","role","name"];
                let data = {};
                for(k in user){
                    if(keys.indexOf(k)>-1){
                        data[k] = user[k];
                    }
                }
                data['purpose'] = 'EMAILVERFICATION';
                const token = jwt.sign(data, Config.JWT.SECRET, {
                    expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
                });
                let baseUrl  =  req.protocol+"://"+req.headers.host+"/api/v1";
                let mailOptions = {
                    to: user.email, // list of receivers
                    subject: "Registration successfull", // Subject line
                    text: 'Registration completed', // plain text body
                    html: `
                                    <b>Hi ${user.name},</b>
                                    <p>Registration is completed.</p>
                                    <a href="${baseUrl}/email_verification?token=${token}">click to activate</a>
                                ` // html body
                };
                Service.sendEmail(mailOptions);
                return  res.json({success:true, msg:'User registered',data:user})
            }
        });
    }catch (e) {
        console.log("Exception",e);
        if(e.errors && Object.keys(e.errors).length){
            let o = {};
            for(k in e.errors){
                o[k] = e.errors[k].message
            }
            return res.status(400).json({
                success:false,
                message:"Validation error",
                errors:o
            });
        }else {
            return res.status(400).json({
                success:false,
                message:"Validation error",
                errors:e
            });
        }
    }
};
module.exports.login = async (req, res)=>{
    User.findOne({email: req.body.email}, async (err, user)=>{
        if(err){
            return res.status(400).json({success: false, msg:'Db Error'});
        }else if(!user){
            return res.status(400).json({success: false, msg:'User not found'});
        }else if(!user.isEmailVerified){
            return res.status(400).json({success: false, msg:'Email not verified yet.'});
        }else {
            try{
                let isMatch = await Service.compareHash(req.body.password, user.password);
                if (isMatch) {
                    let keys  = ["_id","email","role","name",'ulb','state'];
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
                    return res.json({
                        success: true,
                        token: token,
                        user: {
                            name: user.name,
                            email: user.email,
                            role:user.role
                        }
                    });
                } else {
                    return res.status(400).json({success: false, msg: 'Invalid username or password'});
                }
            }catch (e) {
                console.log("Error",e.message, e);
                return res.status(400).json({success: false, msg: 'Erorr while comparing password.'});
            }
        }
    })
}
module.exports.verifyToken = (req, res, next)=>{
    var token = req.body.token || req.query.token || req.params.token || req.headers['x-access-token'];
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, Config.JWT.SECRET, function(err, decoded) {
            if (err) {
                console.log("verify-token jwt.verify : ",err);
                return res.status(401).send({ success: false, message: 'Failed to authenticate token.',err:err });
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
}
module.exports.emailVerification = async (req, res)=>{
    try{
        let ud = {isEmailVerified:true};
        if(req.decoded.role == "USER"){
            ud.isActive = true;
        }
        let du = await User.update({_id:ObjectId(req.decoded._id)},{$set:ud});
        if(du.n){
            return res.send(`<h1>Email verified</h1>`)
        }else{
            return res.send(`<h1>Record not found.</h1>`)
        }

    }catch (e) {
        return res.send(`<h1>Error Occurred:</h1><p>${e.message}</p>`);
    }
}
module.exports.forgotPassword = async (req, res)=>{
    try{
        let user = await User.findOne({email: req.body.email}).exec();
        if(user){
            if(user.isDeleted){
                return res.status(400).json({
                    success:false,
                    message:`Requested email:${req.body.email} is not registered.`
                })
            }else if(!user.isActive){
                return res.status(400).json({
                    success:false,
                    message:`Requested email:${req.body.email} is not activated.`
                });
            }else {
                let newPassword = Service.getRndInteger(10000,99999).toString();
                let passwordHash = await Service.getHash(newPassword);
                try{
                    let du = await User.update({_id:user._id},{$set:{password:passwordHash}});
                    let mailOptions = {
                        to: user.email, // list of receivers
                        subject: "CityFinance", // Subject line
                        text: '', // plain text body
                        html: `
                                    <b>Hi ${user.name},</b>
                                    <p>You new password is <b title="${newPassword}">********</b>. Hover to see.</p>
                                ` // html body
                    };
                    Service.sendEmail(mailOptions);
                    return  res.status(200).json({success:true, msg:'User reset'})
                }catch (e) {
                    console.log("Exception",e);
                    return res.status(400).json({
                        success:false,
                        message:`Exception: ${e.message}.`
                    })
                }
            }
        }else{
            return res.status(400).json({
                success:false,
                message:`Requested email:${req.body.email} is not registered.`
            })
        }
    }catch (e) {
        return res.status(400).json({
            success:false,
            message:`Exception:${e.message}`
        })
    }
}
module.exports.resetPassword = async (req, res)=>{
    try{
        if(req.body.password){
            let user = req.decoded;
            let passwordHash = await Service.getHash(req.body.password);
            console.log("passwordHash",passwordHash);
            let du = await User.update({_id:ObjectId(user._id)},{$set:{password:passwordHash, isEmailVerified:true}});
            let mailOptions = {
                to: user.email, // list of receivers
                subject: "CityFinance", // Subject line
                text: '', // plain text body
                html: ` <b>Hi ${user.name},</b>
                        <p>Your password has been changed.</p>
                    ` // html body
            };
            Service.sendEmail(mailOptions);
            return  res.json({success:true, msg:'User reset'})
        }else{
            return res.status(400).json({
                success:false,
                message:`Password is required field.`
            })
        }
    }catch (e) {
        return res.status(400).json({
            success:false,
            message:`Exception:${e.message}`
        })
    }
}