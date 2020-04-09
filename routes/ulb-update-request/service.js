const Ulb = require("../../models/Ulb");
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Config = require('../../config/app_config');
const UlbUpdateRequest = require("../../models/UlbUpdateRequest");
const Response = require("../../service").response;
const SendEmail = require("../../service").sendEmail;
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.create = async (req, res)=>{
    let user = req.decoded;
    let data = req.body;
    if(user.role == "ULB"){
        data.ulb = user.ulb;
        data.actionTakenBy = user._id;
        let ulbUpdateRequest = new UlbUpdateRequest(data);
        ulbUpdateRequest.ulb = user.ulb;
        ulbUpdateRequest.actionTakenBy = user._id;
        let getPrevStatus = await UlbUpdateRequest.findOne({ulb:ulbUpdateRequest.ulb, status:{$in:["PENDING","REJECTED"]}}).lean().exec();
        if(getPrevStatus){
            Object.assign(getPrevStatus,data);
            try{
                let du = await UlbUpdateRequest.update({_id:getPrevStatus._id},{$set:getPrevStatus});
                if(du.n){
                    return  Response.OK(res,du,'Successfully updated');
                }else{
                    return Response.BadRequest(res,getPrevStatus, 'Row not found! Something wring in code.');
                }
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }else{
            ulbUpdateRequest.save((err, dt)=>{
                if(err){
                    return Response.DbError(res,err, err.message)
                }else {
                    return Response.OK(res,dt, 'Request accepted.');
                }
            })
        }
    }else{
        return Response.BadRequest(res,{},'This action is only allowed by ULB');
    }
}
module.exports.get = async (req, res)=>{
    let user = req.decoded;
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE', 'ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        if(req.query._id){
            try{
                let condition = {_id : ObjectId(req.query._id) };
                let data = await UlbUpdateRequest.findOne(condition).sort({modifiedAt: -1}).lean().exec();
                return Response.OK(res,data, 'Request fetched.')
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }else {
            let ulbs;
            if(user.role == "STATE"){
                try{
                    let stateId = ObjectId(user.state);
                    ulbs = await Ulb.distinct("_id",{state:stateId});
                }catch (e) {
                    return Response.DbError(res,e, e.message);
                }
            }else if(user.role == "ULB"){
                ulbs = [ObjectId(user.ulb)];
            }
            try{
                let condition = ulbs ? {ulb:{$in:ulbs}} : {};
                let data = await UlbUpdateRequest.find(condition).sort({modifiedAt: -1}).lean().exec();
                return Response.OK(res,data, 'Request list.')
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }
    }else{
        return Response.BadRequest(res,{}, 'Action not allowed.')
    }
}
module.exports.action = async (req, res)=>{
    let user = req.decoded, data = req.body, _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    if(actionAllowed.indexOf(user.role) > -1){
        try{
            if(user.role == "STATE"){
                let ulb = await Ulb.findOne({_id:ObjectId(data.ulb)}).exec();
                if(!(ulb && ulb.state && ulb.state.toString() == user.state)){
                    let message = !ulb ? 'Ulb not found.' : 'State is not matching.'
                    return  Response.BadRequest(res,{}, message);
                }
            }
            try{
                let prevState = await UlbUpdateRequest.findOne({_id:_id});
                let updateData = {status:data.status, modifiedAt:new Date(), $push:{history:prevState}};
                if(!prevState){
                    return Response.BadRequest(res,{}, 'Requested record not found.')
                }else if(prevState.status == "APPROVED"){
                    return Response.BadRequest(res,{}, 'The record is already approved.')
                }else{
                    if(updateData.status == "APPROVED"){
                        updateData.isActive = false;
                        let keys = [
                            "name","regionalName","code","state","ulbType","natureOfUlb","wards",
                            "area","population","location","amrut"
                        ];
                        let obj = {};
                        for(key of keys){
                            if(updateData[key]){
                                obj[key] = updateData[key];
                            }
                        }
                        let dulb = await Ulb.update({_id:updateData.ulb},{$set:obj});
                        let profileKeys = ["name", "accountantConatactNumber", "accountantEmail", "accountantName", "commissionerConatactNumber", "commissionerEmail", "commissionerName"];
                        let pObj = {};
                        for(key of profileKeys){
                            if(updateData[key]){
                                pObj[key] = updateData[key];
                            }
                        }
                    }
                    if(pObj["commissionerEmail"]){
                        obj["email"] = pObj["commissionerEmail"];
                        pObj["isEmailVerified"] = false;
                        let data = await User.findOne({ulb:prevState.ulb, role:"ULB"},"_id,email,role,name").lean();
                        data['purpose'] = 'EMAILVERFICATION';
                        const token = jwt.sign(data, Config.JWT.SECRET, {
                            expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
                        });
                        let baseUrl  =  req.protocol+"://"+req.headers.host+"/api/v1";
                        let mailOptions = {
                            to: data.email, // list of receivers
                            subject: "Email changed successfull", // Subject line
                            html: `
                                    <b>Hi ${data.name},</b>
                                    <p>Registration is completed.</p>
                                    <a href="${baseUrl}/reset_password?token=${token}">click to activate</a>
                                ` // html body
                        };
                        SendEmail(mailOptions);
                    }

                    let du = await User.update({ulb:prevState.ulb, role:"ULB"},{$set:pObj});
                    if(du.n){
                        return Response.OK(res,du, 'Action updated.')
                    }else{
                        return Response.BadRequest(res,du, 'Requested record not found.')
                    }
                }
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }catch (e) {
            return Response.DbError(res,e.message, 'Caught Database Exception')
        }
    }else{
        return Response.BadRequest(res,{},'This action is only allowed by ULB');
    }
}