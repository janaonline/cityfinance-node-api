const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;
const User = require('../../models/User');
const Ulb = require('../../models/Ulb');
const Config = require('../../config/app_config');
const bcrypt = require('bcryptjs');
const Constants = require('../../_helper/constants');
const Service = require('../../service');
const Response = require('../../service').response;
const moment = require("moment");
module.exports.get = async (req, res)=> {
    let user = req.decoded; role = req.body.role, filter = req.body.filter, sort=  req.body.sort;
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 50;
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    let access = Constants.USER.LEVEL_ACCESS;
    if(!role){
        Response.BadRequest(res, req.body, 'Role is required field.');
    }else if(!(access[user.role] && access[user.role].indexOf(role) > -1) ){
        Response.BadRequest(res, req.body, `Action not allowed for the role:${role} by the role:${user.role}`);
    }else{
        try {
            let query = {role:role};
            let f = await Service.mapFilter(filter);
            Object.assign(query, f);
            let total = undefined;
            if(user.role == "STATE"){
                let ulbs = await Ulb.distinct("_id",{state:ObjectId(user.state)}).exec();
                if(ulbs){
                    query["ulb"] = {$in:ulbs};
                }
            }
            if(!skip) {
                total = await User.count(query);
            }
            let users = await User.find(query).sort(sort?sort:{modifiedAt:-1}).skip(skip).limit(limit).exec();
            return  res.status(200).json({
                timestamp:moment().unix(),
                success:true,
                message:"User list",
                data:users,
                total:total
            });
        }  catch (e) {
            Response.DbError(res, e, e.message);
        }
    }
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
    console.log(user);
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
    let obj = {}; let _id = req.query._id; let user = req.decoded;
    let keyObj = {
        USER:{
            select:"role name email mobile designation organization"
        },
        ULB: {
            populate:{
                path:"ulb",
                select:"_id name code wards area population ulbType",
                populate:[
                    {
                        path:"state",
                        select:"_id code name"
                    },
                    {
                        path:"ulbType",
                        select:"_id name"
                    }
                ]
            },
            select:"role ulb name email mobile accountantConatactNumber accountantEmail accountantName commissionerConatactNumber commissionerEmail commissionerName"
        },
        STATE:{
            select:"role name state",
            populate:{
                path:"state",
                select:"_id name"
            }
        }
    }
    let role = req.query.role ? req.query.role : user.role;
    let select = keyObj[role] ? keyObj[role].select : "_id name email role";
    let _condition = {_id : _id ? ObjectId(_id) :ObjectId(user._id)};
    let uModel = User.findOne(_condition, select);
    if(keyObj[role] && keyObj[role].populate){
        uModel.populate(keyObj[role].populate);
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
            let password = Service.getRndInteger(10000,99999).toString(); // dummy password for user creation.
            newUser.password = await Service.getHash(password);
            let ud = await newUser.validate();
            newUser.isActive = true;
            newUser.commissionerEmail ? newUser.email = newUser.commissionerEmail:"";
            newUser.createdBy = user._id;
            newUser.isEmailVerified = true; //@todo need to remove on production
            console.log(newUser)
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
                    let baseUrl = process.env.HOSTNAME; //req.protocol+"://"+req.headers.host+"/api/v1";
                    let mailOptions = {
                        to: user.email, // list of receivers
                        subject: "Registration successfull", // Subject line
                        text: 'Registration completed', // plain text body
                        html: `
                                    <b>Hi ${user.name},</b>
                                    <p>Registration is completed.</p>
                                    <p>
                                        Credentials: <br>
                                        email:${user.email}
                                    </p>
                                    <a href="${baseUrl}/password/request?token=${token}">click to reset password.</a>
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
module.exports.delete = async (req, res) =>{
    let user = req.decoded; role = req.body.role, filter = req.body.filter, sort = req.body.sort;
    let access = Constants.USER.LEVEL_ACCESS;
    try {
        let condition = {_id:ObjectId(req.params._id)};
        let userData = await User.findOne(condition).lean();
        if(userData){
            if(access[user.role].indexOf(userData.role)){
                try {
                    let newEmail = `${userData.email}.deleted.${moment().unix()}`;
                    let u = await User.update(condition,{$set:{isDeleted:true,email:newEmail}});
                    Response.OK(res, u, `deleted successfully.`);
                }catch (e) {
                    Response.DbError(res, e, `Something went wrong.`)
                }
            }else{
                Response.BadRequest(res, req.body, `Action not allowed for the role:${userData.role} by the role:${user.role}`);
            }
        }else {
            Response.BadRequest(res,{},`User not found.`)
        }
    }catch (e) {
        Response.BadRequest(res, e,`Something went wrong.`)
    }
};