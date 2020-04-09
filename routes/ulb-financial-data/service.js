const Ulb = require("../../models/Ulb");
const UlbFinancialData = require("../../models/UlbFinancialData");
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
                return Response.DbError(res,err, err.message);
            }else {
                return Response.OK(res,dt, 'Request accepted.');
            }
        })
    }else{
        return Response.BadRequest(res,{},'This action is only allowed by ULB');
    }
}
module.exports.get = async (req, res)=>{
    let user = req.decoded;
    let actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE','ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        if(req.query._id){
            try{
                let condition = {_id : ObjectId(req.query._id) };
                let data = await UlbFinancialData.findOne(condition).sort({modifiedAt: -1}).populate("actionTakenBy","_id name email role").lean().exec();
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
                let condition = ulbs ? {ulb:{$in:ulbs}} : {};
                let data = await UlbFinancialData.find(condition).sort({modifiedAt: -1}).populate("actionTakenBy","_id name email role").lean().exec();
                for(s of data){
                    s["status"] = getStatus(s);
                }
                return Response.OK(res,data, 'Request list.')
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
            let d = await UlbFinancialData.findOne({_id:_id}).lean();
            if(!d){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(d.completeness == "APPROVED" || d.correctness == "APPROVED"){
                return Response.BadRequest(res,{}, "Already approved.")
            }else{
                let prevState = JSON.parse(JSON.stringify(d));
                for(let key of keys){
                    if(data[key]){
                        prevState[key] = data[key];
                    }
                }
                prevState["completeness"] = "PENDING";
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState});
                delete d.history;
                let duu = await UlbFinancialData.update({_id:d._id},{$push:{history:d}});
                return Response.OK(res,du,`completeness status changed to ${prevState.completeness}`);
            }
        }catch (e) {
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
            let d = await UlbFinancialData.findOne({_id:_id}).lean();
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
                    }
                }
                prevState["completeness"] = pending.length ? "PENDING" : (rejected.length ? "REJECTED" : "APPROVED");
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState});
                delete d.history;
                let duu = await UlbFinancialData.update({_id:d._id},{$push:{history:d}});
                return Response.OK(res,du,`completeness status changed to ${prevState.completeness}`);
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