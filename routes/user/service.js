const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/User');
const Config = require('../../config/app_config');
const bcrypt = require('bcryptjs');
const Constants = require('../../_helper/constants');
const Service = require('../../service');
module.exports.getAll = function (req, res) {
    User.find({}, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};
module.exports.update = function (req, res) {
    User.updateOne({_id: req.body._id}, req.body, (err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }
        res.json({success: true, msg: 'Success', data: out });
    })
};
module.exports.profileUpdate =  (req, res) =>{
    let obj = {}; let body = req.body; let user = req.decoded;
    // ["mobile", "designation", "organization", "isActive", "isDeleted", "_id", "role", "email", "password", "name", "accountantConatactNumber", "accountantEmail", "accountantName", "commissionerConatactNumber", "commissionerEmail", "commissionerName", "ulb", "createdAt", "updatedAt", "__v"]
    let keyObj = {
        USER:["name","mobile", "designation", "organization"],
        ULB:["name", "accountantConatactNumber", "accountantEmail", "accountantName", "commissionerConatactNumber", "commissionerEmail", "commissionerName"],
        STATE:["name"]
    }
    console.log(user)
    if(Object.keys(keyObj).indexOf(user.role) < 0 ){
        return res.status(400).json({
            success:false,
            message:"User role not supported."
        });
    }
    for(key in body){
        if(body[key] && keyObj[user.role].indexOf(key) > -1){
            obj[key] = req.body[key];
        }
    }
    User.updateOne({_id:ObjectId(user._id)}, {$set:obj}, (err, out) => {
        if (err) {
            return res.status(400).json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }else if(!out.n){
            return res.status(200).json({success: true, msg: 'No matching key', data: out });
        }else{
            return res.status(200).json({success: true, msg: 'Success', data: out });
        }
    })
};
module.exports.profileGet = async (req, res) =>{
    let obj = {}; let body = req.body; let user = req.decoded;
    let keyObj = {
        USER:{
            select:"name email mobile designation organization"
        },
        ULB: {
            populate:{
                path:"ulb",
                select:"_id name",
                populate:{
                    path:"state",
                    select:"_id code name"
                }
            },
            select:"ulb name email mobile accountantConatactNumber accountantEmail accountantName commissionerConatactNumber commissionerEmail commissionerName"
        },
        STATE:{
            select:"name state",
            populate:{
                path:"state",
                select:"_id name"
            }
        }
    }
    let select = keyObj[user.role] ? keyObj[user.role].select : "";
    let uModel = User.findOne({_id:ObjectId(user._id)}, select);
    if(keyObj[user.role] && keyObj[user.role].populate){
        uModel.populate(keyObj[user.role].populate)
    }
    uModel.exec((err, out) => {
        if (err) {
            res.json({success: false, msg: 'Invalid Payload', data: err.toString() });
        }else{
            res.json({success: true, msg: 'Success', data: out });
        }
    })
};
module.exports.create = async (req, res)=>{
    let user = req.decoded; let data = req.body;
    if(Constants.USER.LEVEL_ACCESS[user.role].indexOf(data.role) > -1){
        try{
            let newUser = new User(data);
            let ud = await newUser.validate();
            newUser.password = await Service.getHash(newUser.password);
            newUser.isActive = true;
            newUser.createdBy = user._id;
            newUser.isEmailVerified = true; //@todo need to remove on production
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
                                    <p>
                                        Credentials: <br>
                                        email:${user.email},<br>
                                        password:${data.password}
                                    </p>
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
    }else{
        return res.status(400).json({
            success:false,
            message:`Unauthorized to create user of role:${data.role}`
        });
    }
}