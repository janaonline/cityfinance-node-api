const Ulb = require("../../models/Ulb");
const UlbFinancialData = require("../../models/UlbFinancialData");
const LoginHistory = require("../../models/LoginHistory");
const User = require("../../models/User");
const Response = require("../../service").response;
const Service = require("../../service");
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
module.exports.create = async (req, res)=>{
    let user = req.decoded;
    let data = req.body;
    if(user.role == "ULB"){
        for(k in data){
            if(data[k] && typeof data[k] == 'object' && Object.keys(data[k]).length){
                if(!(data[k].pdfUrl || data[k].excelUrl)){
                    data[k].completeness = "NA";
                    data[k].correctness = "NA";
                }else{
                    data[k].completeness = "PENDING";
                    data[k].correctness = "PENDING";
                }
            }
        }
        let ulb = await Ulb.findOne({_id:user.ulb},"_id name code").lean();
        if(!ulb){
            return Response.BadRequest(res,{}, `Ulb not found.`)
        }
        let audited = typeof data.audited == "boolean" ? data.audited : (typeof data.audited == "string" && data.audited == "true");
        data.referenceCode = `${ulb.code}_${data.financialYear}_${ audited ? "Audited":"Unaudited"}`;
        data.ulb = user.ulb;
        data.actionTakenBy = ObjectId(user._id);
        let ulbUpdateRequest = new UlbFinancialData(data);
        ulbUpdateRequest.save(async (err, dt)=>{
            if(err){
                if(err.code == 11000){
                    return Response.DbError(res,err, `Data for - ${ulb.name}(${ulb.code}) of ${data.financialYear} already benn uploaded.`);
                }else{
                    return Response.DbError(res,err, 'Failed to create entry');
                }
            }else {
                let email = await Service.emailTemplate.sendFinancialDataStatusEmail(dt._id,"UPLOAD");
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
                let data = await UlbFinancialData
                    .findOne(query)
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
module.exports.getAll = async (req, res)=>{
    try {
        let user = req.decoded,
        filter = req.query.filter && !req.query.filter != 'null' ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort  && !req.query.sort != 'null' ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        csv = req.query.csv,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                {
                    $lookup: {
                        from: "ulbs",
                        localField: "ulb",
                        foreignField: "_id",
                        as: "ulb"
                    }
                },
                {
                    $lookup: {
                        from: "ulbtypes",
                        localField: "ulb.ulbType",
                        foreignField: "_id",
                        as: "ulbType"
                    }
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "ulb.state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "actionTakenBy",
                        foreignField: "_id",
                        as: "actionTakenBy"
                    }
                },
                {$unwind: "$ulb"},
                {$unwind: "$ulbType"},
                {$unwind: "$state"},
                {$unwind: {path:"$actionTakenBy",preserveNullAndEmptyArrays:true}},
                {
                    $project: {
                        _id: 1,
                        audited: 1,
                        auditStatus: {$cond:{if:"$audited",then:"Audited", else: "Unaudited"}},
                        completeness: 1,
                        correctness: 1,
                        status: 1,
                        financialYear: 1,
                        ulbType: "$ulbType.name",
                        ulb: "$ulb._id",
                        ulbName: "$ulb.name",
                        ulbCode: "$ulb.code",
                        state: "$state._id",
                        stateName: "$state.name",
                        stateCode: "$state.code",
                        actionTakenByUserName: "$actionTakenBy.name",
                        actionTakenByUserRole: "$actionTakenBy.role"
                    }
                }
            ]
            let newFilter = await Service.mapFilter(filter);
            let total = undefined;
            if (user.role == "STATE") {
                newFilter["state"] = ObjectId(user.state);
            }
            if (user.role == "ULB") {
                newFilter["ulb"] = ObjectId(user.ulb);
            }
            if (newFilter && Object.keys(newFilter).length) {
                q.push({$match: newFilter});
            }
            if (sort && Object.keys(sort).length) {
                q.push({$sort: sort});
            }

            if (csv) {
                let arr = await UlbFinancialData.aggregate(q).exec();
                let xlsData = await Service.dataFormating(arr,{
                    ulbName:"ULB name",
                    ulbCode:"ULB Code",
                    financialYear:"Financial Year",
                    auditStatus:"Audit Status",
                    status:"Status"
                });
                return res.xls('financial-data.xlsx', xlsData);
            } else {
                try {
                    if (!skip) {
                        let qrr = [...q, {$count: "count"}]
                        let d = await UlbFinancialData.aggregate(qrr);

                        total = d.length ? d[0].count : 0;
                    }
                    q.push({$skip: skip});
                    q.push({$limit: limit});
                    let arr = await UlbFinancialData.aggregate(q).exec();
                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: "Ulb update request list",
                        data: arr,
                        total: total
                    });
                }catch (e) {
                    console.log("exception",e);
                    return Response.DbError(res,q);
                }
            }
        } else {
            return Response.BadRequest(res, {}, 'Action not allowed.')
        }
    }catch (e) {
        return Response.BadRequest(res,e,e.message);
    }
}
module.exports.getHistories = async (req, res)=>{
    try {
        let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        csv = req.query.csv,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                {$match: {_id: ObjectId(req.params._id)}},
                {$unwind: "$history"},
                {
                    $lookup: {
                        from: "ulbs",
                        localField: "history.ulb",
                        foreignField: "_id",
                        as: "ulb"
                    }
                },
                {
                    $lookup: {
                        from: "ulbtypes",
                        localField: "ulb.ulbType",
                        foreignField: "_id",
                        as: "ulbType"
                    }
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "ulb.state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "history.actionTakenBy",
                        foreignField: "_id",
                        as: "actionTakenBy"
                    }
                },
                {$unwind: {path: "$ulb", preserveNullAndEmptyArrays: true}},
                {$unwind: {path: "$ulbType", preserveNullAndEmptyArrays: true}},
                {$unwind: {path: "$state", preserveNullAndEmptyArrays: true}},
                {$unwind: {path: "$actionTakenBy", preserveNullAndEmptyArrays: true}},
                {
                    $project: {
                        _id: 1,
                        audited: "$history.audited",
                        completeness: "$history.completeness",
                        correctness: "$history.correctness",
                        status: "$history.status",
                        financialYear: "$history.financialYear",
                        ulbType: "$ulbType.name",
                        ulb: "$ulb._id",
                        ulbName: "$ulb.name",
                        ulbCode: "$ulb.code",
                        state: "$state._id",
                        stateName: "$state.name",
                        stateCode: "$state.code",
                        actionTakenByUserName: "$actionTakenBy.name",
                        actionTakenByUserRole: "$actionTakenBy.role",
                        modifiedAt: "$history.modifiedAt"
                    }
                }
            ]
            let newFilter = await Service.mapFilter(filter);
            let total = undefined;
            if (user.role == "STATE") {
                newFilter["state"] = ObjectId(user.state);
            }
            if (user.role == "ULB") {
                newFilter["ulb"] = ObjectId(user.ulb);
            }
            if (newFilter && Object.keys(newFilter).length) {
                q.push({$match: newFilter});
            }
            if (sort && Object.keys(sort).length) {
                q.push({$sort: sort});
            }
            if(csv){
                let arr = await UlbFinancialData.aggregate(q).exec();
                return res.xls('financial-data-history.xlsx', arr);
            }else{
                q.push({$skip: skip});
                q.push({$limit: limit});
                if (!skip) {
                    let qrr = [...q, {$count: "count"}]
                    let d = await UlbFinancialData.aggregate(qrr);
                    total = d.length ? d[0].count : 0;
                }
                let arr = await UlbFinancialData.aggregate(q).exec();
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: "Ulb update request list",
                    data: arr,
                    total: total
                });
            }
        } else {
            return Response.BadRequest(res, {}, 'Action not allowed.')
        }
    }catch (e) {
        return Response.BadRequest(res,e,e.message);
    }
}
module.exports.getDetails = async (req, res)=>{
    let user = req.decoded,
    actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE','ULB'];
    if(actionAllowed.indexOf(user.role) > -1){
        let query = {_id:ObjectId(req.params._id)};
        let data = await UlbFinancialData.findOne(query,"-history").exec();
        return  res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb update request list",
            data:data
        });
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
            for(k in data){
                if(data[k] && typeof data[k] == 'object' && Object.keys(data[k]).length){
                    if(!(data[k].pdfUrl || data[k].excelUrl)){
                        data[k].completeness = "NA";
                        data[k].correctness = "NA";
                    }else{
                        data[k].completeness = "PENDING";
                        data[k].correctness = "PENDING";
                    }
                }
            }

            let prevState = await UlbFinancialData.findOne({_id:_id}, "-history").lean();
            let history = Object.assign({}, prevState);
            if(!prevState){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(prevState.completeness == "REJECTED" || prevState.correctness == "REJECTED"){
                for(let key of keys){
                    if(data[key] && typeof data[key] == 'object' && Object.keys(data[key]).length){
                        if(!(data[key].pdfUrl || data[key].excelUrl)){
                            data[key].completeness = "NA";
                            data[key].correctness = "NA";
                        }else{
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
                }
                prevState["completeness"] = "PENDING";
                prevState["correctness"] = "PENDING";
                prevState["status"] = "PENDING";
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState,$push:{history:history}});
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
            let prevState = await UlbFinancialData.findOne({_id:_id},"-history").lean();
            let history = Object.assign({},prevState);
            if(!prevState){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(prevState.completeness == "APPROVED"){
                return Response.BadRequest(res,{}, "Already approved.")
            }else{
                let rejected = keys.filter(key=>{
                    return data[key] && data[key].completeness && data[key].completeness == "REJECTED";
                })
                let pending = keys.filter(key=>{
                    return data[key] && data[key].completeness && data[key].completeness == "PENDING";
                });
                console.log(rejected.length,pending.length);
                for(let key of keys){
                    if(data[key] && data[key].completeness){
                        prevState[key].completeness = data[key].completeness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState["completeness"] = pending.length ? "PENDING" : (rejected.length ? "REJECTED" : "APPROVED");
                prevState["status"] = prevState["completeness"] == "REJECTED" ? "REJECTED" : "PENDING";
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState, $push:{history:history}});
                if(prevState.status == "REJECTED" || prevState.status == "APPROVED"){
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(prevState._id,"ACTION");
                }
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
            let prevState = await UlbFinancialData.findOne({_id:_id},"-history").lean();
            let history = Object.assign({},prevState);
            if(!prevState){
                return Response.BadRequest(res,{}, "Requested record not found.")
            }else if(prevState.completeness != "APPROVED"){
                return Response.BadRequest(res,{}, "Completeness is on allowed after correctness.")
            }else if(prevState.correctness == "APPROVED"){
                return Response.BadRequest(res,{}, "Already approved.")
            }else{
                let rejected = keys.filter(key=>{
                    return data[key] && data[key].correctness && data[key].correctness == "REJECTED";
                })
                let pending = keys.filter(key=>{
                    return data[key] && data[key].correctness && data[key].correctness == "PENDING";
                });
                console.log(rejected.length,pending.length);
                for(let key of keys){
                    if(data[key] && data[key].correctness){
                        prevState[key].correctness = data[key].correctness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState["correctness"] = pending.length ? "PENDING" : (rejected.length ? "REJECTED" : "APPROVED");
                prevState["status"] = prevState["correctness"];
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy  = user._id;
                let du = await UlbFinancialData.update({_id:prevState._id},{$set:prevState,$push:{history:history}});
                if(prevState.status == "REJECTED" || prevState.status == "APPROVED"){
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(prevState._id,"ACTION");
                }
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
module.exports.getApprovedFinancialData = async (req, res)=>{
    try {
        let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        csv = req.query.csv;
        let q = [
            {$match:{status :"APPROVED"}},
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            {
                $lookup: {
                    from: "ulbtypes",
                    localField: "ulb.ulbType",
                    foreignField: "_id",
                    as: "ulbType"
                }
            },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            {$unwind: "$ulb"},
            {$unwind: "$ulbType"},
            {$unwind: "$state"},
            {
                $project: {
                    _id: 1,
                    "audited": 1,
                    "financialYear": 1,
                    "ulbType": "$ulbType.name",
                    "ulb": "$ulb._id",
                    "ulbName": "$ulb.name",
                    "ulbCode": "$ulb.code",
                    "state": "$state._id",
                    "stateName": "$state.name",
                    "stateCode": "$state.code",
                    /*"balanceSheet.pdfUrl":1,
                    "balanceSheet.excelUrl":1,
                    "schedulesToBalanceSheet.pdfUrl":1,
                    "schedulesToBalanceSheet.excelUrl":1,
                    "incomeAndExpenditure.pdfUrl":1,
                    "incomeAndExpenditure.excelUrl":1,
                    "schedulesToIncomeAndExpenditure.pdfUrl":1,
                    "schedulesToIncomeAndExpenditure.excelUrl":1,
                    "trialBalance.pdfUrl":1,
                    "trialBalance.excelUrl":1,
                    "auditReport.pdfUrl":1,
                    "auditReport.excelUrl":1*/
                }
            }
        ];
        let newFilter = await Service.mapFilter(filter);
        let total = undefined;
        if (newFilter && Object.keys(newFilter).length) {
            q.push({$match: newFilter});
        }
        if (sort && Object.keys(sort).length) {
            q.push({$sort: sort});
        }
        if (csv) {
            let arr = await UlbFinancialData.aggregate(q).exec();
            let xlsData = await Service.dataFormating(arr,{
                stateName:"State",
                ulbName:"ULB name",
                ulbCode:"ULB Code",
                financialYear:"Financial Year",
                auditStatus:"Audit Status",
                status:"Status"
            });
            return res.xls('financial-data.xlsx', xlsData);
        } else {
            if (!skip) {
                let qrr = [...q, {$count: "count"}]
                let d = await UlbFinancialData.aggregate(qrr);
                total = d.length ? d[0].count : 0;
            }
           /* q.push({$skip: skip});
            q.push({$limit: limit});*/
            let arr = await UlbFinancialData.aggregate(q).exec();
            return res.status(200).json({
                timestamp: moment().unix(),
                success: true,
                message: "Ulb update request list",
                data: arr,
                total: total
            });
        }
    }catch (e) {
        return Response.BadRequest(res,e,e.message);
    }
}
module.exports.sourceFiles = async (req, res)=>{
    try{
        let lh_id = ObjectId(req.decoded.lh_id);// Login history id
        let _id = ObjectId(req.params._id);
        let select = {
            "balanceSheet.pdfUrl":1,"balanceSheet.excelUrl":1,
            "schedulesToBalanceSheet.pdfUrl":1,"schedulesToBalanceSheet.excelUrl":1,
            "incomeAndExpenditure.pdfUrl":1,"incomeAndExpenditure.excelUrl":1,
            "schedulesToIncomeAndExpenditure.pdfUrl":1,"schedulesToIncomeAndExpenditure.excelUrl":1,
            "trialBalance.pdfUrl":1,"trialBalance.excelUrl":1,
            "auditReport.pdfUrl":1,"auditReport.excelUrl":1,
            "overallReport.pdfUrl":1,"overallReport.excelUrl":1
        };
        let data = await UlbFinancialData.find({_id:_id},select).exec();
        let lh = await LoginHistory.update({_id:lh_id},{$push:{reports:_id}});
        return Response.OK(res, data.length ? getSourceFiles(data[0]) : {});
    }catch (e) {
        return Response.DbError(res,e);
    }
}
function getSourceFiles(obj) {
    let o = {
        pdf:[

        ],
        excel:[

        ]
    };
    obj.balanceSheet && obj.balanceSheet.pdfUrl ?  o.pdf.push({name:"Balance Sheet", url:obj.balanceSheet.pdfUrl}):'';
    obj.balanceSheet && obj.balanceSheet.excelUrl ?  o.excel.push({name:"Balance Sheet", url:obj.balanceSheet.excelUrl}):'';

    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.pdfUrl ?  o.pdf.push({name:"Schedules To Balance Sheet", url:obj.schedulesToBalanceSheet.pdfUrl}):'';
    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.excelUrl ?  o.excel.push({name:"Schedules To Balance Sheet", url:obj.schedulesToBalanceSheet.excelUrl}):'';

    obj.incomeAndExpenditure && obj.incomeAndExpenditure.pdfUrl ?  o.pdf.push({name:"Income And Expenditure", url:obj.incomeAndExpenditure.pdfUrl}):'';
    obj.incomeAndExpenditure && obj.incomeAndExpenditure.excelUrl ?  o.excel.push({name:"Income And Expenditure", url:obj.incomeAndExpenditure.excelUrl}):'';

    obj.schedulesToIncomeAndExpenditure && obj.schedulesToIncomeAndExpenditure.pdfUrl ?  o.pdf.push({name:"Schedules To Income And Expenditure", url:obj.schedulesToIncomeAndExpenditure.pdfUrl}):'';
    obj.schedulesToIncomeAndExpenditure && obj.schedulesToIncomeAndExpenditure.excelUrl ?  o.excel.push({name:"Schedules To Income And Expenditure", url:obj.schedulesToIncomeAndExpenditure.excelUrl}):'';

    obj.trialBalance && obj.trialBalance.pdfUrl ?  o.pdf.push({name:"Trial Balance", url:obj.trialBalance.pdfUrl}):'';
    obj.trialBalance && obj.trialBalance.excelUrl ?  o.excel.push({name:"Trial Balance", url:obj.trialBalance.excelUrl}):'';

    obj.auditReport && obj.auditReport.pdfUrl ?  o.pdf.push({name:"Audit Report", url:obj.auditReport.pdfUrl}):'';
    obj.auditReport && obj.auditReport.excelUrl ?  o.excel.push({name:"Audit Report", url:obj.auditReport.excelUrl}):'';

    obj.overallReport && obj.overallReport.pdfUrl ?  o.pdf.push({name:"Overall Report", url:obj.overallReport.pdfUrl}):'';
    obj.overallReport && obj.overallReport.excelUrl ?  o.excel.push({name:"Overall Report", url:obj.overallReport.excelUrl}):'';

    return o;
}
