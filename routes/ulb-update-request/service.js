const Ulb = require("../../models/Ulb");
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Config = require('../../config/app_config');
const UlbUpdateRequest = require("../../models/UlbUpdateRequest");
const Service = require("../../service");
const Response = require("../../service").response;
const SendEmail = require("../../service").sendEmail;
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.create = async (req, res)=>{
    let user = req.decoded;
    let data = req.body;
    delete data.ulb;
    if(user.role == "ULB"){
        data.ulb = user.ulb;
        data.actionTakenBy = user._id;
        let ulbUpdateRequest = new UlbUpdateRequest(data);
        ulbUpdateRequest.ulb = user.ulb;
        ulbUpdateRequest.actionTakenBy = user._id;

        if(ulbUpdateRequest.commissionerEmail){
            let emailCheck = await User.findOne({email:ulbUpdateRequest.commissionerEmail},"email commissionerEmail ulb role").lean().exec();
            if(emailCheck && (emailCheck.role != "ULB" || emailCheck.ulb.toString() != user._id.toString())){
                return Response.BadRequest(res, `Email:${emailCheck.email} already used by ${emailCheck.role} user.`)
            }
        }

        let getPrevStatus = await UlbUpdateRequest.findOne({ulb:ulbUpdateRequest.ulb, status:"PENDING"}).lean().exec();
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
    let user = req.decoded,
        filter= req.body.filter,
        sort=  req.body.sort,
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE','ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        let query = {};
        if(filter){
            let f = await Service.mapFilter(filter);
            Object.assign(query,f);
        }
        if(req.params._id){
            try{
                query["_id"] = ObjectId(req.params._id);
                if(user.role == "ULB"){
                    query["ulb"] = ObjectId(user.ulb);
                }
                let data = await UlbUpdateRequest
                    .findOne(query)
                    .sort(sort?sort:{modifiedAt: -1})
                    .populate("actionTakenBy","_id name email role")
                    .populate({
                        path:"history.actionTakenBy",
                        model:User,
                        select:"_id name email role"
                    })
                    .lean()
                    .exec();
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
                let total = undefined;
                if(ulbs){
                    query["ulb"] = {$in:ulbs};
                }
                if(!skip) {
                    total = await UlbUpdateRequest.count(query);
                }
                let data = await UlbUpdateRequest
                    .find(query)
                    .sort(sort?sort:{modifiedAt: -1})
                    .skip(skip)
                    .limit(limit)
                    .populate([
                        {
                            path:"ulb",
                            select:"_id name code state",
                            populate:{
                                path:"state",
                                select:"_id name code"
                            }
                        },
                        {
                            path:"actionTakenBy",
                            select:"_id name email role"
                        }
                    ])
                    .populate([
                        {
                            path:"history.actionTakenBy",
                            model:User,
                            select:"_id name email role"
                        },
                        {
                            path:"history.ulb",
                            select:"_id name code state",
                            populate:{
                                path:"state",
                                select:"_id name code"
                            }
                        },
                    ])
                    .lean().exec();
                return  res.status(200).json({
                    timestamp:moment().unix(),
                    success:true,
                    message:"request list",
                    data:data,
                    total:total
                });
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }
    }else{
        return Response.BadRequest(res,{}, 'Action not allowed.')
    }
}
module.exports.getAll = async (req, res)=>{
    let user = req.decoded,
        filter= req.body.filter,
        sort=  req.body.sort,
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE','ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        let q = [
            {
                $lookup:{
                    from:"ulbs",
                    localField:"ulb",
                    foreignField:"_id",
                    as : "ulb"
                }
            },
            {
                $lookup:{
                    from:"ulbtypes",
                    localField:"ulb.ulbType",
                    foreignField:"_id",
                    as : "ulbType"
                }
            },
            {
                $lookup:{
                    from:"states",
                    localField:"ulb.state",
                    foreignField:"_id",
                    as : "state"
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"actionTakenBy",
                    foreignField:"_id",
                    as : "actionTakenBy"
                }
            },
            {$unwind:"$ulb"},
            {$unwind:"$ulbType"},
            {$unwind:"$state"},
            {$unwind:"$actionTakenBy"},
            {
                $project:{
                    _id:1,
                    ulbType:"$ulbType.name",
                    ulb:"$ulb._id",
                    ulbName:"$ulb.name",
                    ulbCode:"$ulb.code",
                    state:"$state._id",
                    stateName:"$state.name",
                    stateCode:"$state.code",
                    status:1
                }
            }
        ]
        let newFilter = await Service.mapFilter(filter);
        let total = undefined;
        if(user.role == "STATE"){
            newFilter["state"] = ObjectId(user.state);
        }
        if(user.role == "STATE"){
            newFilter["state"] = ObjectId(user.state);
        }
        if(newFilter && Object.keys(newFilter).length){
            q.push({$match:newFilter});
        }
        if(Object.keys(sort).length){
            q.push({$sort:sort});
        }
        q.push({$skip:skip});
        q.push({$limit:limit});
        if(!skip) {
            let qrr = [...q,{$count:"count"}]
            let d = await UlbUpdateRequest.aggregate(qrr);
            total = d.length ? d[0].count : 0;
        }
        let arr = await UlbUpdateRequest.aggregate(q).exec();
        return  res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb update request list",
            data:arr,
            total:total
        });
    }else{
        return Response.BadRequest(res,{}, 'Action not allowed.')
    }
}
module.exports.getById = async (req, res)=>{
    let user = req.decoded, _id = req.params._id;
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE', 'ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        if(_id && ObjectId.isValid(_id)){
            try{
                let condition = {_id : ObjectId(_id) };
                let data = await UlbUpdateRequest
                        .findOne(condition)
                        .populate([
                            {
                                path:"state",
                                select:"_id name code"
                            },
                            {
                                path: "ulb",
                                select: "_id name code ulbType state",
                                populate:[
                                    {
                                        path:"ulbType",
                                        select:"_id name"
                                    },
                                    {
                                        path:"state",
                                        select:"_id name code"
                                    }
                                ]
                            },
                            {
                                path:"ulbType",
                                select:"_id name"
                            }
                        ])
                        .lean()
                        .exec();
                if(data){
                    let ulbuserkeys = ["commissionerName","commissionerEmail","commissionerConatactNumber","accountantName","accountantEmail","accountantConatactNumber"]
                    let ulbkeys = ["_id", "name", "ulbType", "natureOfUlb", "name","code","state","wards","area","population","location","amrut"];
                    let user = await User
                        .findOne({role:"ULB",ulb:data.ulb},ulbuserkeys.join(" "))
                        .populate({
                            path:"ulb",
                            select:ulbkeys.join(" "),
                            populate:[
                                {
                                    path:"ulbType",
                                    select:"_id name"
                                },
                                {
                                    path:"state",
                                    select: "_id name code"
                                }
                            ]
                        })
                        .lean()
                        .exec();
                    data["old"] = user;
                    return Response.OK(res,data, 'Request fetched.')
                }else{
                    return Response.BadRequest(res,{},`Not a valid request Id.`)
                }
            }catch (e) {
                return Response.DbError(res,e, e.message);
            }
        }else {
            return Response.BadRequest(res,{},`Not a valid request Id.`)
        }
    }else{
        return Response.BadRequest(res,{}, 'Action not allowed.')
    }
}
module.exports.action = async (req, res)=>{
    console.log(req.params._id);
    let user = req.decoded, data = req.body, _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE', 'ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        try{
            let prevState = await UlbUpdateRequest.findOne({_id:_id},"-history");
            let ulb = prevState ? await Ulb.findOne({_id:prevState.ulb},'_id name code state').populate({
                path:"state",
                select:"_id name code"
            }) : null;
            if(user.role == "STATE"){
                if(!(ulb && ulb.state && ulb.state._id.toString() == user.state)){
                    let message = !ulb ? 'Ulb not found.' : 'State is not matching.'
                    return  Response.BadRequest(res,{}, message);
                }
            }else if(user.role == "ULB"){
                if(!(ulb && ulb._id.toString() == user.ulb)){
                    let message = !ulb ? 'Ulb not found.' : 'Ulb is not matching.'
                    return  Response.BadRequest(res,{}, message);
                }else if(data.status != "CANCELLED"){
                    return  Response.BadRequest(res,{}, `Requested status(${data.status}) is not allowed.`);
                }
            }
            try{
                let updateData = {status:data.status, modifiedAt:new Date()};
                if(!prevState){
                    return Response.BadRequest(res,{}, 'Requested record not found.')
                }else if(prevState.status == "APPROVED"){
                    return Response.BadRequest(res,{}, 'The record is already approved.')
                }else if(prevState.status == "CANCELLED"){
                    return Response.BadRequest(res,{}, 'The record is already cancelled.')
                }else{
                    if(updateData.status == "APPROVED"){
                        updateData.isActive = false;
                        let keys = [
                            "name","regionalName","code","state","ulbType","natureOfUlb","wards",
                            "area","population","location","amrut"
                        ];
                        let obj = {};
                        for(key of keys){
                            if(prevState[key]){
                                obj[key] = prevState[key];
                            }
                        }
                        let profileKeys = ["name", "accountantConatactNumber", "accountantEmail", "accountantName", "commissionerConatactNumber", "commissionerEmail", "commissionerName"];
                        let pObj = {};
                        for(key of profileKeys){
                            if(prevState[key]){
                                pObj[key] = prevState[key];
                            }
                        }
                        if(pObj["commissionerEmail"]){
                            let emailCheck = await User.findOne({email:pObj.commissionerEmail},"email commissionerEmail ulb role").lean().exec();
                            if(emailCheck){
                                if(emailCheck.ulb.toString() != updateData.ulb.toString()){
                                    return Response.BadRequest(res,{}, `Email:${emailCheck.email} already used by ${emailCheck.role} user.`)
                                }
                            }
                            pObj["email"] = pObj["commissionerEmail"];
                            pObj["isEmailVerified"] = false;
                            let data = await User.findOne({ulb:prevState.ulb, role:"ULB"},"_id,email,role,name").lean();
                            data['purpose'] = 'EMAILVERFICATION';
                            const token = jwt.sign(data, Config.JWT.SECRET, {
                                expiresIn: Config.JWT.EMAIL_VERFICATION_EXPIRY
                            });
                            let baseUrl  =  req.protocol+"://"+req.headers.host+"/api/v1";
                            let mailOptions = {
                                to: data.email, // list of receivers
                                subject: "Approved: Email change request", // Subject line
                                text: 'Approved: Email change request.', // plain text body
                                html: `
                                    <b>Hi ${data.name},</b>
                                    <p>Reset password.</p>
                                    <a href="${baseUrl}/email_verification?token=${token}">click to reset password</a>
                                ` // html body
                            };
                            SendEmail(mailOptions);
                        }

                        console.log({_id:prevState.ulb},obj)
                        let dulb = await Ulb.update({_id:prevState.ulb},{$set:obj});
                        let du = await User.update({ulb:prevState.ulb, role:"ULB"},{$set:pObj});
                    }
                    /*let history = prevState.history ? JSON.parse(JSON.stringify(prevState.history)) :[];
                    let d = {};
                    for(k in prevState){
                        if(k != 'history'){
                            d[k] = prevState[k];
                        }
                    }
                    history.push(d);
                    updateData["history"] = history;*/
                    let uur = await UlbUpdateRequest.update({_id:_id},{$set:updateData,$push:{history:prevState}});
                    if(uur.n){
                        return Response.OK(res,uur, 'Action updated.')
                    }else{
                        return Response.BadRequest(res,uur, 'Requested record not found.')
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