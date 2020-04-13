const Ulb = require("../../models/Ulb");
const UlbFinancialData = require("../../models/UlbFinancialData");
const User = require("../../models/User");
const Response = require("../../service").response;
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.create = async (req, res)=>{
    let user = req.decoded;
    let data = req.body;
    if(user.role == "ULB"){
        data.ulb = user.ulb;
        data.actionTakenBy = user._id;
        let ulbUpdateRequest = new UlbFinancialData(data);
        ulbUpdateRequest.save((err, dt)=>{
            if(err){
                return Response.DbError(res,err, err.code == 11000 ? 'Duplicate entry.':'Failed to create entry');
            }else {
                return Response.OK(res,dt, 'Request accepted.');
            }
        })
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
        if(req.query._id){
            try{
                let query = {_id : ObjectId(req.query._id) };
                let data = await UlbFinancialData.findOne(query).sort({modifiedAt: -1}).populate("actionTakenBy","_id name email role").lean().exec();
                return Response.OK(res,data, 'Request fetched.')
            }catch (e) {
                console.log("Exception:",e)
                return Response.DbError(res,e, e.message);
            }
        }else{
            let ulbs;
            if(user.role == "STATE"){
                try{
                    let stateId = ObjectId(user.state);
                    ulbs = await Ulb.distinct("_id",{state:stateId});
                }catch (e) {
                    console.log("Exception:",e)
                    return Response.DbError(res,e, e.message);
                }
            }else if(user.role == "ULB"){
                ulbs = [ObjectId(user.ulb)];
            }
            try{
                let query = ulbs ? {ulb:{$in:ulbs}} : {};
                let total = undefined;
                if(filter){
                    for(key in filter){
                        if( (typeof filter[key] == "string" && filter[key]) || typeof filter[key] == "boolean"){
                            query[key] = typeof filter[key] == "string" ? {$regex:filter[key]} : filter[key];
                        }
                    }
                }
                if(!skip) {
                    total = await UlbFinancialData.count(query);
                }
                let data = await UlbFinancialData
                    .find(query)
                    .sort(sort ? sort : {modifiedAt: -1})
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
                        }
                    ])
                    .lean().exec();
                for(s of data){
                    s["status"] = getStatus(s);
                }
                return res.status(200).json({
                    success:true,
                    message:"data",
                    total:total,
                    data:data
                })
            }catch (e) {
                console.log("Exception:",e)
                return Response.DbError(res,e, e.message);
            }
            function  getStatus() {
                if(s.correctness == "PENDING" && s.completeness == "PENDING"){
                    return "PENDING";
                }else if(s.correctness == "APPROVED" && s.completeness == "APPROVED"){
                    return "APPROVED";
                }else if(s.completeness == "PENDING"){
                    return "PENDING";
                }else if(s.correctness == "PENDING"){
                    return "PENDING";
                }else{
                    return "REJECTED";
                }
            }
        }

    }else{
        return Response.BadRequest(res,{}, 'Action not allowed.')
    }
}
module.exports.update = async (req, res)=>{
    let user = req.decoded, data = req.body, _id = ObjectId(req.params._id);
    let actionAllowed = ['ULB'];
    let keys = [
        "audited",
        "balanceSheet","schedulesToBalanceSheet","incomeAndExpenditure",
        "schedulesToIncomeAndExpenditure","trialBalance","auditReport"
    ];
    if(actionAllowed.indexOf(user.role) > -1){
        try{
            let d = await UlbFinancialData.findOne({_id:_id}, "-history").lean();
            if(!d){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(d.completeness == "REJECTED" || d.correctness == "REJECTED"){
                let prevState = JSON.parse(JSON.stringify(d));
                for(let key of keys){
                    if(data[key]){
                        if(key == "auditReport" && prevState.audited){
                            Object.assign(prevState[key],data[key]);
                            prevState[key]["completeness"] = "PENDING";
                            prevState[key]["correctness"] = "PENDING";
                        }else if(key != "auditReport"){
                            Object.assign(prevState[key],data[key]);
                            prevState[key]["completeness"] = "PENDING";
                            prevState[key]["correctness"] = "PENDING";
                        }
                    }
                }
                prevState["completeness"] = "PENDING";
                prevState["correctness"] = "PENDING";
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState});
                delete d.history;
                let duu = await UlbFinancialData.update({_id:d._id},{$push:{history:d}});
                return Response.OK(res,du,`completeness status changed to ${prevState.completeness}`);
            }else{
                return Response.BadRequest(res,{}, "Update not allowed.")
            }
        }catch (e) {
            console.log(e);
            return Response.DbError(res,e.message, 'Caught Database Exception')
        }
    }else{
        return Response.BadRequest(res,{},`This action is only allowed by ${actionAllowed.join()}`);
    }
}
module.exports.completeness = async (req, res)=>{
    let user = req.decoded, data = req.body, _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    let keys = [
        "balanceSheet","schedulesToBalanceSheet","incomeAndExpenditure",
        "schedulesToIncomeAndExpenditure","trialBalance","auditReport"
    ];
    if(actionAllowed.indexOf(user.role) > -1){
        try{
            if(user.role == "STATE"){
                let ulb = await Ulb.findOne({_id:ObjectId(data.ulb)}).exec();
                if(!(ulb && ulb.state && ulb.state.toString() == user.state)){
                    let message = !ulb ? 'Ulb not found.' : 'State is not matching.'
                    return  Response.BadRequest(res,{}, message)
                }
            }
            let d = await UlbFinancialData.findOne({_id:_id},"-history").lean();
            if(!d){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(d.completeness == "APPROVED"){
                return Response.BadRequest(res,{}, "Already approved.")
            }else{
                let prevState = JSON.parse(JSON.stringify(d));
                let rejected = keys.filter(key=>{
                    return data[key] && data[key].completeness == "REJECTED";
                })
                let pending = keys.filter(key=>{
                    return data[key] && data[key].completeness == "PENDING";
                });
                console.log(rejected.length,pending.length);
                for(let key of keys){
                    if(data[key]){
                        prevState[key].completeness = data[key].completeness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState["completeness"] = pending.length ? "PENDING" : (rejected.length ? "REJECTED" : "APPROVED");
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let duu = await UlbFinancialData.update({_id:d._id},{$set:prevState, $push:{history:d}});
                return Response.OK(res,duu,`completeness status changed to ${prevState.completeness}`);
            }
        }catch (e) {
            return Response.DbError(res,e.message, 'Caught Database Exception')
        }
    }else{
        return Response.BadRequest(res,{},`This action is only allowed by ${actionAllowed.join()}`);
    }
}
module.exports.correctness = async (req, res)=>{
    let user = req.decoded, data = req.body, _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    let keys = [
        "balanceSheet","schedulesToBalanceSheet","incomeAndExpenditure",
        "schedulesToIncomeAndExpenditure","trialBalance","auditReport"
    ];
    if(actionAllowed.indexOf(user.role) > -1){
        try{
            if(user.role == "STATE"){
                let ulb = await Ulb.findOne({_id:ObjectId(data.ulb)}).exec();
                if(!(ulb && ulb.state && ulb.state.toString() == user.state)){
                    let message = !ulb ? 'Ulb not found.' : 'State is not matching.'
                    return  Response.BadRequest(res,{}, message)
                }
            }
            let d = await UlbFinancialData.findOne({_id:_id}).lean();
            if(!d){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(d.completeness != "APPROVED"){
                return Response.BadRequest(res,{}, "Completeness is on allowed after correctness.")
            }else if(d.correctness == "APPROVED"){
                return Response.BadRequest(res,{}, "Already approved.")
            }else{
                let prevState = JSON.parse(JSON.stringify(d));
                let rejected = keys.filter(key=>{
                    return data[key] && data[key].correctness == "REJECTED";
                })
                let pending = keys.filter(key=>{
                    return data[key] && data[key].correctness == "PENDING";
                });
                console.log(rejected.length,pending.length);
                for(let key of keys){
                    if(data[key]){
                        prevState[key].correctness = data[key].correctness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState["correctness"] = pending.length ? "PENDING" : (rejected.length ? "REJECTED" : "APPROVED");
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:d._id},{$set:prevState});
                delete d.history;
                let duu = await UlbFinancialData.update({_id:d._id},{$push:{history:d}});
                return Response.OK(res,du,`correctness status changed to ${prevState.correctness}`);
            }
        }catch (e) {
            console.log(e);
            return Response.DbError(res, e.message, 'Caught Database Exception')
        }
    }else{
        return Response.BadRequest(res,{},`This action is only allowed by ULB ${actionAllowed.join()}`);
    }
}