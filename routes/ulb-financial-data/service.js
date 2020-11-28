const Ulb = require('../../models/Ulb');
const UlbFinancialData = require('../../models/UlbFinancialData');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const State = require('../../models/State');
const Response = require('../../service').response;
const Service = require('../../service');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
const { JsonWebTokenError } = require('jsonwebtoken');
const waterManagementKeys = [
    "serviceLevel",
    "houseHoldCoveredPipedSupply",
    "waterSuppliedPerDay",
    "reduction",
    "houseHoldCoveredWithSewerage"
]
const solidWasteManagementKeys = [
    "garbageFreeCities",
    "waterSupplyCoverage",
]
const millionPlusCitiesKeys = [
    "cityPlan",
    "waterBalancePlan",
    "serviceLevelPlan",
    "solidWastePlan"
]
const mappingKeys = {
    "serviceLevel":"serviceLevel",
    "houseHoldCoveredPipedSupply":"Household Covered Piped Water Supply",
    "waterSuppliedPerDay":"Water Supplied in litre per day(lpcd)",
    "reduction":"Reduction in non-water revenue",
    "houseHoldCoveredWithSewerage":"Household Covered with sewerage/septage services",
    "garbageFreeCities":"Garbage free star rating of the cities",
    "waterSupplyCoverage":"Coverage of water supply for public/community toilets",
    "cityPlan":"City Plan DPR",
    "waterBalancePlan":"City Plan DPR",
    "serviceLevelPlan":"Service Level Improvement Plan",
    "solidWastePlan":"Solid Waste Management Plan"
}

const time = ()=>{
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt
}
module.exports.create = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (user.role == 'ULB') {
        // for (k in data) {
        //     if (
        //         data[k] &&
        //         typeof data[k] == 'object' &&
        //         Object.keys(data[k]).length
        //     ) {
        //         if (!(data[k].pdfUrl || data[k].excelUrl)) {
        //             data[k].completeness = 'NA';
        //             data[k].correctness = 'NA';
        //         } else {
        //             data[k].completeness = 'PENDING';
        //             data[k].correctness = 'PENDING';
        //         }
        //     }
        // }
        let ulb = await Ulb.findOne({ _id: user.ulb }, '_id name code').lean();
        if (!ulb) {
            return Response.BadRequest(res, {}, `Ulb not found.`);
        }
        let audited =
            typeof data.audited == 'boolean'
                ? data.audited
                : typeof data.audited == 'string' && data.audited == 'true';
        data.referenceCode = `${ulb.code}_${data.financialYear}_${
            audited ? 'Audited' : 'Unaudited'
        }`;
        data.ulb = user.ulb;
        data.modifiedAt = time()
        let checkData = await UlbFinancialData.count({
            ulb: data.ulb,
            financialYear: data.financialYear,
            audited: true
        });
        if (checkData) {
            return Response.BadRequest(
                res,
                {},
                `Audited data already been uploaded for ${data.financialYear}.`
            );
        }
        console.log('checkData', checkData);
        data.actionTakenBy = ObjectId(user._id);
        console.log(JSON.stringify(data, 0, 3));
        let ulbUpdateRequest = new UlbFinancialData(data);
        /**Now**/
        let query = {}
        req.body["overallReport"] = null;
        req.body["status"] = 'PENDING';
        query["ulb"] = ObjectId(data.ulb);
        let ulbData = await UlbFinancialData.findOne({ulb:query["ulb"]});
        if(ulbData && ulbData.status=='PENDING'){
            if(ulbData.isCompleted){
                return Response.BadRequest(res,{},`Form is already submitted`);
            }
        }
        if(ulbData && ulbData.isCompleted==true){
            req.body["history"] = [...ulbData.history];
            ulbData.history=[]
            req.body["history"].push(ulbData);
        }
        Service.put(query,req.body,UlbFinancialData,async function(response,value){
            if(response){
                let ulbData = await UlbFinancialData.findOne({ulb:query["ulb"]});
                if(ulbData.isCompleted){
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
                        ulbData._id,
                        'UPLOAD'
                    );
                }
                return res.status(response ? 200 : 400).send(value);
            }
            else{
                return Response.DbError(res, err, 'Failed to create entry');
            }
        });
        /****/
        
        /*** before 
        ulbUpdateRequest.save(async (err, dt) => {
            if (err) {
                if (err.code == 11000) {
                    return Response.DbError(
                        res,
                        err,
                        `Data for - ${ulb.name}(${ulb.code}) of ${data.financialYear} already been uploaded.`
                    );
                } else {
                    return Response.DbError(res, err, 'Failed to create entry');
                }
            } else {
                // let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
                //     dt._id,
                //     'UPLOAD'
                // );
                return Response.OK(res, dt, 'Request accepted.');
            }
        });
        */
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by ULB'
        );
    }
};
module.exports.get = async (req, res) => {
    let user = req.decoded,
        filter = req.body.filter,
        sort = req.body.sort,
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    if (actionAllowed.indexOf(user.role) > -1) {
        if (req.query._id) {
            try {
                let query = { _id: ObjectId(req.query._id) };
                let data = await UlbFinancialData.findOne(query)
                    .populate([
                        {
                            path: 'ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code'
                            }
                        },
                        {
                            path: 'actionTakenBy',
                            select: '_id name email role'
                        }
                    ])
                    .populate([
                        {
                            path: 'history.actionTakenBy',
                            model: User,
                            select: '_id name email role'
                        },
                        {
                            path: 'history.ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code'
                            }
                        }
                    ])
                    .lean()
                    .exec();
                return Response.OK(res, data, 'Request fetched.');
            } catch (e) {
                console.log('Exception:', e);
                return Response.DbError(res, e, e.message);
            }
        } else {
            let ulbs;
            if (user.role == 'STATE') {
                try {
                    let stateId = ObjectId(user.state);
                    ulbs = await Ulb.distinct('_id', { state: stateId });
                } catch (e) {
                    console.log('Exception:', e);
                    return Response.DbError(res, e, e.message);
                }
            } else if (user.role == 'ULB') {
                ulbs = [ObjectId(user.ulb)];
            }
            try {
                let query = ulbs ? { ulb: { $in: ulbs } } : {};
                let total = undefined;
                if (filter) {
                    for (key in filter) {
                        if (
                            (typeof filter[key] == 'string' && filter[key]) ||
                            typeof filter[key] == 'boolean'
                        ) {
                            query[key] =
                                typeof filter[key] == 'string'
                                    ? { $regex: filter[key] }
                                    : filter[key];
                        }
                    }
                }
                if (!skip) {
                    total = await UlbFinancialData.count(query);
                }
                let data = await UlbFinancialData.find(query)
                    .sort(sort ? sort : { modifiedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate([
                        {
                            path: 'ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code'
                            }
                        },
                        {
                            path: 'actionTakenBy',
                            select: '_id name email role'
                        }
                    ])
                    .populate([
                        {
                            path: 'history.actionTakenBy',
                            model: User,
                            select: '_id name email role'
                        },
                        {
                            path: 'history.ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code'
                            }
                        }
                    ])
                    .lean()
                    .exec();
                for (s of data) {
                    s['status'] = getStatus(s);
                }
                return res.status(200).json({
                    success: true,
                    message: 'data',
                    total: total,
                    data: data
                });
            } catch (e) {
                console.log('Exception:', e);
                return Response.DbError(res, e, e.message);
            }
            function getStatus() {
                if (s.correctness == 'PENDING' && s.completeness == 'PENDING') {
                    return 'PENDING';
                } else if (
                    s.correctness == 'APPROVED' &&
                    s.completeness == 'APPROVED'
                ) {
                    return 'APPROVED';
                } else if (s.completeness == 'PENDING') {
                    return 'PENDING';
                } else if (s.correctness == 'PENDING') {
                    return 'PENDING';
                } else {
                    return 'REJECTED';
                }
            }
        }
    } else {
        return Response.BadRequest(res, {}, 'Action not allowed.');
    }
};
module.exports.getAll = async (req, res) => {
    try {

        let statusFilter = {
            "1":{"status":"PENDING","isCompleted":false,actionTakenByUserRole:"ULB"},
            "2":{"status":"PENDING","isCompleted":true,actionTakenByUserRole:"ULB"},
            "3":{"status":"APPROVED",actionTakenByUserRole:"STATE"},
            "4":{"status":"REJECTED",actionTakenByUserRole:"STATE"},
            "5":{"status":"REJECTED",actionTakenByUserRole:"MoHUA"},
            "6":{"status":"APPROVED",actionTakenByUserRole:"MoHUA"},
        }

        let user = req.decoded,
            filter =
                req.query.filter && !req.query.filter != 'null'
                    ? JSON.parse(req.query.filter)
                    : req.body.filter
                    ? req.body.filter
                    : {},
            sort =
                req.query.sort && !req.query.sort != 'null'
                    ? JSON.parse(req.query.sort)
                    : req.body.sort
                    ? req.body.sort
                    : {},
            skip = req.query.skip ? parseInt(req.query.skip) : 0,
            limit = req.query.limit ? parseInt(req.query.limit) : 50,
            csv = req.query.csv,
            actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
            let status = 'PENDING'
            // if(user.role=='ULB'){
            //     status = 'REJECTED'
            // }
            let cond = {"priority":1}
            if(user.role=='STATE'){
                cond["priority"] = {$cond: [{
                    $and : [ 
                        { $eq: [ "$actionTakenBy.role", 'ULB'] },
                        { $eq: [ "$isCompleted",true] }
                    ] 
                    },
                    1,
                    0 
                ]}
            }
            if(user.role=='MoHUA'){
                cond["priority"] = {$cond: [{
                    $and : [ 
                        { $eq: [ "$actionTakenBy.role", 'STATE'] },
                        { $eq: [ "$status","APPROVED"] }
                    ] 
                    },
                    1,
                    0 
                ]}
            }

        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                {
                    $match: { overallReport: null }
                },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb'
                    }
                },
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType'
                    }
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy'
                    }
                },
                { $unwind: '$ulb' },
                { $unwind: '$ulbType' },
                { $unwind: '$state' },
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields:cond
                },
                {
                    $project: {
                        _id: 1,
                        audited: 1,
                        priority: 1,
                        // auditStatus: {
                        //     $cond: {
                        //         if: '$audited',
                        //         then: 'Audited',
                        //         else: 'Unaudited'
                        //     }
                        // },
                        waterManagement:1,
                        solidWasteManagement:1,
                        millionPlusCities:1,
                        completeness: 1,
                        correctness: 1,
                        isCompleted:1,
                        status: 1,
                        role: "$actionTakenBy.role",
                        //financialYear: 1,
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        sbCode:'$ulb.sbCode',
                        censusCode:'$ulb.censusCode',
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        actionTakenByUserName: '$actionTakenBy.name',
                        actionTakenByUserRole: '$actionTakenBy.role',
                        isActive: '$isActive',
                        createdAt: '$createdAt',
                        modifiedAt:'$modifiedAt'
                    }
                }    
            ];
 
            let newFilter = await Service.mapFilter(filter);
            let total = undefined;
            if (user.role == 'STATE') {
                newFilter['state'] = ObjectId(user.state);
            }
            if (user.role == 'ULB') {
                newFilter['ulb'] = ObjectId(user.ulb);
            }
            newFilter['isActive'] = true;
            if(newFilter['status']){
                Object.assign(newFilter,statusFilter[newFilter['status']])
                //delete newFilter['status'];
                
            }   
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }

            if (sort && Object.keys(sort).length) {
                q.push({ $sort: sort });
            } else {
                q.push({ $sort: { modifiedAt: -1 } });
                q.push({ $sort: { priority: -1 } });
            }

            if (csv) {
                let arr = await UlbFinancialData.aggregate(q).exec();
                for(d of arr){
                    if(d.status=="PENDING" && d.isCompleted==false && d.actionTakenByUserRole=="ULB"){
                        d.status = "Saved as Draft"
                    }if(d.status=="PENDING" && d.isCompleted==true && d.actionTakenByUserRole=="ULB"){
                        d.status = "Under Review by State"
                    }if(d.status=="APPROVED" && d.actionTakenByUserRole=="STATE"){    
                        d.status= "Under Review by MoHUA"
                    }if(d.status=="REJECTED" && d.actionTakenByUserRole=="STATE"){
                        d.status = "Rejected by STATE"
                    }if(d.status=="REJECTED" && d.actionTakenByUserRole=="MoHUA"){
                        d.status = "Rejected by MoHUA"
                    }if(d.status=="APPROVED" && d.actionTakenByUserRole=="MoHUA"){        
                        d.status = "Approval Completed"
                    }
                }
                let field = {
                    stateName : 'State name',
                    ulbName: 'ULB name',
                    ulbType:'ULB Type',
                    sbCode: 'ULB Code',
                    censusCode: 'Census Code',
                    //financialYear: 'Financial Year',
                    //auditStatus: 'Audit Status',
                    status: 'Status'
                }
                if(user.role=='STATE'){ delete field.stateName }
                let xlsData = await Service.dataFormating(arr,field);
                return res.xls('financial-data.xlsx', xlsData);
            } else {
                try {
                    if (!skip) {
                        let qrr = [...q, { $count: 'count' }];
                        let d = await UlbFinancialData.aggregate(qrr);

                        total = d.length ? d[0].count : 0;
                    }
                    q.push({ $skip: skip });
                    q.push({ $limit: limit });
                    let arr = await UlbFinancialData.aggregate(q).exec();
                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: 'Ulb update request list',
                        data: arr,
                        total: total
                    });
                } catch (e) {
                    console.log('exception', e);
                    return Response.DbError(res, q);
                }
            }
        } else {
            return Response.BadRequest(res, {}, 'Action not allowed.');
        }
    } catch (e) {
        return Response.BadRequest(res, e, e.message);
    }
};
module.exports.getHistories = async (req, res) => {
    try {
        let user = req.decoded,
            filter = req.query.filter
                ? JSON.parse(req.query.filter)
                : req.body.filter
                ? req.body.filter
                : {},
            sort = req.query.sort
                ? JSON.parse(req.query.sort)
                : req.body.sort
                ? req.body.sort
                : { modifiedAt: -1 },
            skip = req.query.skip ? parseInt(req.query.skip) : 0,
            limit = req.query.limit ? parseInt(req.query.limit) : 50,
            csv = req.query.csv,
            actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                { $match: { _id: ObjectId(req.params._id) } },
                {
                    $project: {
                        history: {
                            $concatArrays: [
                                [
                                    {
                                        _id: '$_id',
                                        referenceCode: '$referenceCode',
                                        isCompleted:'$isCompleted',
                                        audited: '$audited',
                                        overallReport: '$overallReport',
                                        //completeness: '$completeness',
                                        //correctness: '$correctness',
                                        status: '$status',
                                        modifiedAt: '$modifiedAt',
                                        createdAt: '$createdAt',
                                        isActive: '$isActive',
                                        //balanceSheet: '$balanceSheet',
                                        //schedulesToBalanceSheet:
                                        //    '$schedulesToBalanceSheet',
                                        //incomeAndExpenditure:
                                        //    '$incomeAndExpenditure',
                                        //schedulesToIncomeAndExpenditure:
                                        //    '$schedulesToIncomeAndExpenditure',
                                        //trialBalance: '$trialBalance',
                                        //financialYear: '$financialYear',
                                        ulb: '$ulb',
                                        actionTakenBy: '$actionTakenBy'
                                    }
                                ],
                                '$history'
                            ]
                        }
                    }
                },
                { $unwind: '$history' },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'history.ulb',
                        foreignField: '_id',
                        as: 'ulb'
                    }
                },
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType'
                    }
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'history.actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy'
                    }
                },
                { $unwind: { path: '$ulb', preserveNullAndEmptyArrays: true } },
                {
                    $unwind: {
                        path: '$ulbType',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$state',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        isCompleted:'$history.isCompleted',
                        audited: '$history.audited',
                        //completeness: '$history.completeness',
                        //correctness: '$history.correctness',
                        status: '$history.status',
                        //financialYear: '$history.financialYear',
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        actionTakenByUserName: '$actionTakenBy.name',
                        actionTakenByUserRole: '$actionTakenBy.role',
                        modifiedAt: '$history.modifiedAt'
                    }
                }
            ];
            let newFilter = await Service.mapFilter(filter);
            let total = undefined;
            if (user.role == 'STATE') {
                newFilter['state'] = ObjectId(user.state);
            }
            if (user.role == 'ULB') {
                newFilter['ulb'] = ObjectId(user.ulb);
            }
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }
            if (sort && Object.keys(sort).length) {
                //q.push({ $sort: sort });
            }
            if (csv) {
                let arr = await UlbFinancialData.aggregate(q).exec();
                return res.xls('financial-data-history.xlsx', arr);
            } else {
                q.push({ $skip: skip });
                q.push({ $limit: limit });
                if (!skip) {
                    let qrr = [...q, { $count: 'count' }];
                    let d = await UlbFinancialData.aggregate(qrr);
                    total = d.length ? d[0].count : 0;
                }
                let arr = await UlbFinancialData.aggregate(q).exec();
                arr.push(arr.shift());
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: 'Ulb update request list',
                    data: arr,
                    total: total
                });
            }
        } else {
            return Response.BadRequest(res, {}, 'Action not allowed.');
        }
    } catch (e) {
        return Response.BadRequest(res, e, e.message);
    }
};
module.exports.getDetails = async (req, res) => {
    let user = req.decoded,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];
    if (actionAllowed.indexOf(user.role) > -1) {
        let query = { _id: ObjectId(req.params._id) };
        let data = await UlbFinancialData.aggregate([
        {
            $match :query
        },
        {
            $lookup: {
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulb'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'actionTakenBy',
                foreignField: '_id',
                as: 'actionTakenBy'
            }
        },
        { $unwind: '$ulb' },
        {
            $unwind: {
                path: '$actionTakenBy',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,               
                waterManagement:1,
                solidWasteManagement:1,
                millionPlusCities:1,
                isCompleted:1,
                status: 1,
                ulb: '$ulb._id',
                ulbName: '$ulb.name',
                ulbCode: '$ulb.code',
                actionTakenByUserName: '$actionTakenBy.name',
                actionTakenByUserRole: '$actionTakenBy.role',
                isActive: '$isActive',
                createdAt: '$createdAt'
            }
        }
        ]).exec();
        let history = {"histroy":""}
        if(user.role=='MoHUA'){
            let historyData = await commonQuery(query)    
            if(historyData.length >0){
                history['histroy'] = resetDataStatus(historyData[historyData.length-1],false)
                let rejectReasonKeys = await getRejectedStatusKey(history['histroy'].data)
                let newData = await getRejectedStatusKey(data[0],rejectReasonKeys)
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: 'Ulb update request list',
                    data: newData
                });
            }
        }
        let finalData = data[0]
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: 'Ulb update request list',
            data: finalData
        });
    } else {
        return Response.BadRequest(res, {}, 'Action not allowed.');
    }
};
module.exports.update = async (req, res) => {
    let user = req.decoded,
        data = req.body,
        _id = ObjectId(req.params._id);
    let actionAllowed = ['ULB'];
    let keys = [
        'audited',
        'balanceSheet',
        'schedulesToBalanceSheet',
        'incomeAndExpenditure',
        'schedulesToIncomeAndExpenditure',
        'trialBalance',
        'auditReport'
    ];
    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            for (k in data) {
                if (
                    data[k] &&
                    typeof data[k] == 'object' &&
                    Object.keys(data[k]).length
                ) {
                    if (!(data[k].pdfUrl || data[k].excelUrl)) {
                        data[k].completeness = 'NA';
                        data[k].correctness = 'NA';
                    } else {
                        data[k].completeness = 'PENDING';
                        data[k].correctness = 'PENDING';
                    }
                }
            }

            let prevState = await UlbFinancialData.findOne(
                { _id: _id },
                '-history'
            ).lean();

            let history = Object.assign({}, prevState);
            if (!prevState) {
                return Response.BadRequest(
                    res,
                    {},
                    'Requested record not found.'
                );
            } else if (
                prevState.completeness == 'REJECTED' ||
                prevState.correctness == 'REJECTED'
            ) {
                for (let key of keys) {
                    if (
                        data[key] &&
                        typeof data[key] == 'object' &&
                        Object.keys(data[key]).length
                    ) {
                        if (
                            !(data[key].pdfUrl || data[key].excelUrl) ||
                            data[key].pdfUrl === '' ||
                            data[key].excelUrl === ''
                        ) {
                            prevState[key].completeness = 'NA';
                            prevState[key].correctness = 'NA';
                            if (data[key].pdfUrl === '') {
                                prevState[key].pdfUrl = '';
                            }
                            if (data[key].excelUrl === '') {
                                prevState[key].excelUrl = '';
                            }
                            if (
                                data[key].pdfUrl === '' &&
                                data[key].excelUrl === ''
                            ) {
                                prevState[key].message = '';
                            }
                        } else {
                            if (key == 'auditReport' && prevState.audited) {
                                Object.assign(prevState[key], data[key]);
                                prevState[key]['completeness'] = 'PENDING';
                                prevState[key]['correctness'] = 'PENDING';
                            } else if (key != 'auditReport') {
                                Object.assign(prevState[key], data[key]);
                                prevState[key]['completeness'] = 'PENDING';
                                prevState[key]['correctness'] = 'PENDING';
                            }
                        }
                    }
                }

                prevState['completeness'] = 'PENDING';
                prevState['correctness'] = 'PENDING';
                prevState['status'] = 'PENDING';
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy = user._id;

                if(user.role=="ULB"){
                    if(data.balanceSheet){
                        if(data.balanceSheet.pdfUrl=="" || data.balanceSheet.pdfUrl==null  || data.balanceSheet.excelUrl=="" || data.balanceSheet.excelUrl==null){

                            return Response.BadRequest(
                                res,
                                {},
                                `balanceSheet must be provided`
                            );
                        }   
                    }
                    if(data.incomeAndExpenditure){
                    
                        if(data.incomeAndExpenditure.pdfUrl=="" || data.incomeAndExpenditure.pdfUrl==null || data.incomeAndExpenditure.excelUrl=="" || data.incomeAndExpenditure.excelUrl==null){
                            return Response.BadRequest(
                                res,
                                {},
                                 `incomeAndExpenditure must be provided`
                            );
                        }
                    }
                    if(data.trialBalance){
                        if(data.trialBalance.pdfUrl=="" || data.trialBalance.pdfUrl==null || data.trialBalance.excelUrl=="" || data.trialBalance.excelUrl==null){

                            return Response.BadRequest(
                                res,
                                {},
                                `trialBalance must be provided`
                            );
                        }
                    }
                    if(data.audited==true){

                        if(!data.auditReport || data.auditReport.pdfUrl=="" || data.auditReport.pdfUrl==null){
                            return Response.BadRequest(
                                res,
                                {},
                                `auditReport must be provided`
                            );
                        }
                    }
                }


                let du = await UlbFinancialData.update(
                    { _id: prevState._id },
                    { $set: prevState, $push: { history: history } }
                );
                let ulbFinancialDataobj = await UlbFinancialData.findOne({
                    _id: prevState._id
                }).exec();

                return Response.OK(
                    res,
                    ulbFinancialDataobj,
                    `completeness status changed to ${prevState.completeness}`
                );
            } else {
                return Response.BadRequest(res, {}, 'Update not allowed.');
            }
        } catch (e) {
            console.log(e);
            return Response.DbError(
                res,
                e.message,
                'Caught Database Exception'
            );
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            `This action is only allowed by ${actionAllowed.join()}`
        );
    }
};
module.exports.action = async(req,res)=>{
    try {
        let user = req.decoded
        data = req.body,
        _id = ObjectId(req.params._id)
        let prevState = await UlbFinancialData.findOne(
            { _id: _id },
            '-history'
        ).lean();
        let prevUser = await User.findOne({_id:ObjectId(prevState.actionTakenBy)}).exec();
        if(prevState.status == 'APPROVED' && prevUser.role=='MoHUA' ) {
            return Response.BadRequest(res, {}, 'Already approved By MoHUA User.');
        }if(prevState.status == 'REJECTED' && prevUser.role=='MoHUA') {
            return Response.BadRequest(res, {}, 'Already Rejected By MoHUA User.');
        }if(prevState.status == 'APPROVED' && user.role=='STATE' && prevUser.role=='STATE' ) {
            return Response.BadRequest(res, {}, 'Already approved By STATE User.');
        }if(prevState.status == 'REJECTED' && user.role=='STATE' && prevUser.role=='STATE') {
            return Response.BadRequest(res, {}, 'Already Rejected By State User.');
        }
        let flag =  overAllStatus(data); 
        flag.then(async value=>{
            data["status"] = value.status ? 'REJECTED':'APPROVED'
            let actionAllowed = ['MoHUA','STATE'];
            if (actionAllowed.indexOf(user.role) > -1) {
                if (user.role == 'STATE') {
                    let ulb = await Ulb.findOne({ _id: ObjectId(data.ulb) }).exec();
                    if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
                        let message = !ulb
                            ? 'Ulb not found.'
                            : 'State is not matching.';
                        return Response.BadRequest(res, {}, message);
                    }
                }
                let history = Object.assign({}, prevState);
                if (!prevState) {
                    return Response.BadRequest(
                        res,
                        {},
                        'Requested record not found.'
                    );
                }
                data["actionTakenBy"] = user._id;
                data["ulb"] = prevState.ulb;
                data["modifiedAt"] = time()
                let du = await UlbFinancialData.update(
                    { _id: ObjectId(prevState._id) },
                    { $set:data,$push: { history: history } }
                );
                let ulbFinancialDataobj = await UlbFinancialData.findOne({
                    _id: ObjectId(prevState._id)
                }).exec();
                let ulbUser = await User.findOne({ulb:ObjectId(ulbFinancialDataobj.ulb),isDeleted:false,role:"ULB"})
                .populate([
                    {
                        path: 'state',
                        model: State,
                        select: '_id name'
                    }
                ])
                .exec()

                if (
                    data["status"] == 'APPROVED' &&
                    user.role == 'MoHUA'
                ) {
                    let mailOptions = {
                        to: '',
                        subject: '',
                        html: ''
                    };
                    /** ULB TRIGGER */
                    let ulbEmails = []
                    let UlbTemplate = await Service.emailTemplate.xvUploadApprovalMoHUA(
                        ulbUser.name,
                    );
                    ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                    ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail): '';
                    mailOptions.to =  ulbEmails.join(),
                    mailOptions.subject = UlbTemplate.subject,
                    mailOptions.html = UlbTemplate.body
                    Service.sendEmail(mailOptions);
                    /** STATE TRIGGER */
                    let stateEmails = []
                    let stateUser = await User.find({state:ObjectId(ulbUser.state._id),isDeleted:false,role:"STATE"}).exec()
                    for(let d of stateUser){
                        sleep(700)
                        d.email ? stateEmails.push(d.email) : '';
                        d.departmentEmail ? stateEmails.push(d.departmentEmail): '';
                        let stateTemplate = await Service.emailTemplate.xvUploadApprovalByMoHUAtoState(
                            ulbUser.name,
                            d.name
                        );
                        mailOptions.to = stateEmails.join();
                        mailOptions.subject = stateTemplate.subject;
                        mailOptions.html = stateTemplate.body;
                        Service.sendEmail(mailOptions);
                    }
                }
                if (
                    data["status"] == 'APPROVED' &&
                    user.role == 'STATE'
                ) {
                    let mailOptions = {
                        to: '',
                        subject: '',
                        html: ''
                    };
                    /** STATE TRIGGER */
                    let MohuaUser = await User.find({isDeleted:false,role:"MoHUA"}).exec();
                    for(let d of MohuaUser){
                        sleep(700)
                        let MohuaTemplate = await Service.emailTemplate.xvUploadApprovalState(
                            d.name,
                            ulbUser.name,
                            ulbUser.state.name
                        );
                        mailOptions.to =  d.email,
                        mailOptions.subject = MohuaTemplate.subject,
                        mailOptions.html = MohuaTemplate.body
                        Service.sendEmail(mailOptions);
                    }

                    let historyData = await commonQuery({ _id: _id })   
                    if(historyData.length >0){
                        let du = await UlbFinancialData.update(
                            { _id: ObjectId(prevState._id) },
                            { $set:data}
                        );
                    }else{
                        let newData = resetDataStatus(data);
                        let du = await UlbFinancialData.update(
                            { _id: ObjectId(prevState._id) },
                            { $set:newData}
                        );
                    }
                }
                if (
                    data["status"] == 'REJECTED' &&
                    user.role == 'MoHUA'
                ) {
                    let mailOptions = {
                        to: '',
                        subject: '',
                        html: ''
                    };
                    /** ULB TRIGGER */
                    let ulbEmails = []
                    let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                        ulbUser.name,
                        value.reason,
                        "MoHUA"
                    );
                    ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                    ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail): '';
                    mailOptions.to =  ulbEmails.join(),
                    mailOptions.subject = UlbTemplate.subject,
                    mailOptions.html = UlbTemplate.body
                    Service.sendEmail(mailOptions);
                    
                    /** STATE TRIGGER */
                    let stateEmails = []
                    let stateUser = await User.find({state:ObjectId(ulbUser.state._id),isDeleted:false,role:"STATE"}).exec()
                    for(let d of stateUser){
                        sleep(700)
                        d.email ? stateEmails.push(d.email) : '';
                        d.departmentEmail ? stateEmails.push(d.departmentEmail): '';
                        let stateTemplate = await Service.emailTemplate.xvUploadRejectState(
                            ulbUser.name,
                            d.name,
                            value.reason
                        );
                        mailOptions.to = stateEmails.join();
                        mailOptions.subject = stateTemplate.subject;
                        mailOptions.html = stateTemplate.body;
                        Service.sendEmail(mailOptions);
                    }
                }

                if (
                    data["status"] == 'REJECTED' &&
                    user.role == 'STATE'
                ) {
                    let mailOptions = {
                        to: '',
                        subject: '',
                        html: ''
                    };
                    /** ULB TRIGGER */
                    let ulbEmails = []
                    let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                        ulbUser.name,
                        value.reason,
                        "STATE"
                    );
                    ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                    ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail): '';
                    mailOptions.to =  ulbEmails.join(),
                    mailOptions.subject = UlbTemplate.subject,
                    mailOptions.html = UlbTemplate.body
                    Service.sendEmail(mailOptions);
                }
                return Response.OK(
                    res,
                    ulbFinancialDataobj,
                    ``
                );
            }else {
                return Response.BadRequest(
                    res,
                    {},
                    `This action is only allowed by ${actionAllowed.join()}`
                );
            }
        },rejectError=>{
            return Response.BadRequest(res,{},rejectError);
        }).catch(caughtError=>{
            console.log("final caughtError",caughtError);
        }); 
    }
    catch (e) {
        console.log('Exception', e);
    }
}
async function commonQuery(query){
    let historyData = await UlbFinancialData.aggregate([
        {
            $match :query
        },
        { $unwind: {
            path:'$history',
            preserveNullAndEmptyArrays: true
            } 
        },
        {
            $lookup: {
                from: 'users',
                localField: 'history.actionTakenBy',
                foreignField: '_id',
                as: 'user'
            }
        },
        {$match:{"user.role":'MoHUA','history.status':'REJECTED'}},
        {$project:
            {
                data:'$history'
            }
        }
    ]).exec();  
    return historyData;
}
async function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
/** 
 * @param{data}  - type Object
 * @param{check} - type Boolean  
*/
function resetDataStatus(data,check=false){
    for(key in data){
        if(typeof data[key] === 'object'  && data[key] !== null ){
            if(key=='waterManagement'){
                for(let objKey of waterManagementKeys){
                    if(data[key][objKey]){

                        if(check){
                            if(data[key][objKey]["status"]=='REJECTED'){
                                data[key][objKey]["status"]= '';
                                data[key][objKey]["rejectReason"]= '';
                            }
                        }
                        else{
                            data[key][objKey]["status"]= '';
                            data[key][objKey]["rejectReason"]= '';
                        }
                    }
                }   
                // for(let d of data[key]["documents"]["wasteWaterPlan"]){
                   
                //     if(check){
                //         if(d.status=='REJECTED'){
                //             d.status='NA';
                //             d.rejectReason = '';
                //         }
                //     }
                //     else{
                //         d.status='NA';
                //         d.rejectReason = '';
                //     }
                // }
            }
            if(key=='solidWasteManagement'){
                for(let objKey of solidWasteManagementKeys){
                    if(data[key]["documents"][objKey]){
                        for(let d of data[key]["documents"][objKey]){
                            if(check){
                                if(d.status=='REJECTED'){
                                    d.status='';
                                    d.rejectReason = '';
                                }
                            }
                            else{
                                d.status='';
                                d.rejectReason = '';
                            }
                        }
                    }
                }
            }
            if(key=='millionPlusCities'){
                for(let objKey of millionPlusCitiesKeys){
                    if(data[key]["documents"][objKey]){
                        for(let d of data[key]["documents"][objKey]){
                            if(check){
                                if(d.status=='REJECTED'){
                                    d.status='';
                                    d.rejectReason = '';
                                }
                            }
                            else{
                                d.status='';
                                d.rejectReason = '';
                            }
                        }
                    }
                }
            }
        }else{
            data["status"]='APPROVED'
        }
    }
    return data;
}

async function getRejectedStatusKey(data,keyArray=[]){
        let rejectReason = []
        let keyFLag = keyArray && keyArray.length >0 ? true:false; 
        let status = keyFLag ? 'APPROVED' : 'REJECTED'
        for(key in data){
            if(typeof data[key] === 'object'  && data[key] !== null ){
                if(key=='waterManagement'){
                    for(let objKey of waterManagementKeys){
                        if(data[key][objKey] && data[key][objKey]["status"]==status){
                            if(keyFLag && keyArray.includes(objKey)){
                                data[key][objKey]["status"] = ''
                                data[key][objKey]["rejectReason"] = ''
                            }
                            else{
                                rejectReason.push(objKey)
                            }
                        }
                    }   
                    // for(let d of data[key]["documents"]["wasteWaterPlan"]){
                    //     if(d.status==status){
                    //         if(keyFLag && keyArray.includes('wasteWaterPlan')){
                    //             d.status = ''
                    //             d.rejectReason = ''
                    //         }
                    //         else{
                    //             rejectReason.push('wasteWaterPlan')
                    //         }
                    //     }
                    // }
                }
                if(key=='solidWasteManagement'){
                    for(let objKey of solidWasteManagementKeys){
                        if(data[key]["documents"][objKey]){
                            for(let d of data[key]["documents"][objKey]){
                                if(d.status==status){
                                    if(keyFLag && keyArray.includes(objKey)){
                                        d.status = ''
                                        d.rejectReason = ''
                                    }
                                    else{
                                        rejectReason.push(objKey)
                                    }
                                }
                            }
                        }
                    }
                }
                if(key=='millionPlusCities'){
                    for(let objKey of millionPlusCitiesKeys){
                        for(let d of data[key]["documents"][objKey]){
                            if(d.status==status){
                                if(keyFLag && keyArray.includes(objKey)){
                                    d.status = ''
                                    d.rejectReason = ''
                                }
                                else{
                                    rejectReason.push(objKey)
                                }
                            }
                        }                        
                    }
                }
            }else{
                if(data["status"]=='REJECTED'){
                    rejected = true;
                }
            }
        }
        /** Concat reject reason string */
        return keyFLag ? data : rejectReason
}

/**
 * 
 * @param {object} data 
 */
function overAllStatus(data){
    return new Promise((resolve,reject)=>{
        let rejected = false
        let rejectReason = []
        let rejectDataSet = []
        for(key in data){
            if(typeof data[key] === 'object'  && data[key] !== null ){
                if(key=='waterManagement'){
                    for(let objKey of waterManagementKeys){
                        if(data[key][objKey] && data[key][objKey]["status"]=='REJECTED'){
                            if(!data[key][objKey]["rejectReason"]){
                                reject('reject reason is missing')
                            }
                            rejected=true;
                            let tab = "Water Supply & Waste-Water Management:"+mappingKeys[objKey]
                            let reason = {
                                [tab]:data[key][objKey]["rejectReason"]
                            }
                            rejectReason.push(reason)
                        }
                    }   
                    // for(let d of data[key]["documents"]["wasteWaterPlan"]){
                    //     if(d.status=='REJECTED'){
                    //         rejected=true;
                    //         let tab = "Water Supply & Waste-Water Management:Upload Documents"
                    //         if(!d.rejectReason){
                    //             reject('reject reason is missing')
                    //         }
                    //         let reason = {
                    //             [tab]:d.rejectReason
                    //         }
                    //         rejectReason.push(reason)
                    //     }
                    // }
                }
                if(key=='solidWasteManagement'){
                    for(let objKey of solidWasteManagementKeys){
                        if(data[key]["documents"][objKey]){
                            for(let d of data[key]["documents"][objKey]){
                                if(d.status=='REJECTED'){
                                    if(!d.rejectReason || d.rejectReason==''){
                                        reject('reject reason is missing')
                                    }
                                    rejected=true;
                                    let tab = "Solid Waste Management:"+mappingKeys[objKey]
                                    let reason = {
                                        [tab]:d.rejectReason
                                    }
                                    rejectReason.push(reason)
                                }
                            }
                        }
                    }
                }
                if(key=='millionPlusCities'){
                    for(let objKey of millionPlusCitiesKeys){
                        for(let d of data[key]["documents"][objKey]){
                            if(d.status=='REJECTED'){
                                if(!d.rejectReason || d.rejectReason==''){
                                    reject('reject reason is missing')
                                }
                                rejected=true;
                                let tab = "Million Plus Cities Only:"+mappingKeys[objKey]
                                let reason = {
                                    [tab]:d.rejectReason
                                }
                                rejectReason.push(reason)
                            }
                        }                        
                    }
                }
            }else{
                if(data["status"]=='REJECTED'){
                    rejected = true;
                }
            }
        }
        /** Concat reject reason string */
        if(rejectReason.length>0){
            let finalString = rejectReason.map((obj) => {
                let service = Object.keys(obj)[0];
                let reason = obj[service];
                service = `<strong>`+service+`</strong>` 
                return `<p> ${service + ` :`+ reason} </p>`
            });
            let x='';
            for(i of finalString ){
                x += i
            }
            resolve({status:rejected,"reason":x})
        }
        resolve({status:rejected,reason:''})
    })
}

module.exports.completeness = async (req, res) => {
    let user = req.decoded,
        data = req.body,
        _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
    let keys = [
        'balanceSheet',
        'schedulesToBalanceSheet',
        'incomeAndExpenditure',
        'schedulesToIncomeAndExpenditure',
        'trialBalance',
        'auditReport'
    ];
    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            if (user.role == 'STATE') {
                let ulb = await Ulb.findOne({ _id: ObjectId(data.ulb) }).exec();
                if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
                    let message = !ulb
                        ? 'Ulb not found.'
                        : 'State is not matching.';
                    return Response.BadRequest(res, {}, message);
                }
            }
            let prevState = await UlbFinancialData.findOne(
                { _id: _id },
                '-history'
            ).lean();
            let history = Object.assign({}, prevState);
            if (!prevState) {
                return Response.BadRequest(
                    res,
                    {},
                    'Requested record not found.'
                );
            } else if (prevState.completeness == 'APPROVED') {
                return Response.BadRequest(res, {}, 'Already approved.');
            } else {
                let rejected = keys.filter((key) => {
                    return (
                        data[key] &&
                        data[key].completeness &&
                        data[key].completeness == 'REJECTED'
                    );
                });
                let pending = keys.filter((key) => {
                    return (
                        data[key] &&
                        data[key].completeness &&
                        data[key].completeness == 'PENDING'
                    );
                });
                console.log(rejected.length, pending.length);
                for (let key of keys) {
                    if (data[key] && data[key].completeness) {
                        prevState[key].completeness = data[key].completeness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState['completeness'] = pending.length
                    ? 'PENDING'
                    : rejected.length
                    ? 'REJECTED'
                    : 'APPROVED';
                prevState['status'] =
                    prevState['completeness'] == 'REJECTED'
                        ? 'REJECTED'
                        : 'PENDING';
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy = user._id;

                if(user.role=="ULB"){
                    if( !data.balanceSheet || data.balanceSheet.pdfUrl!="" || data.balanceSheet.pdfUrl!=null  || data.balanceSheet.excelUrl!="" || data.balanceSheet.excelUrl!=null){
                            return Response.BadRequest(
                                res,
                                {},
                                `balanceSheet must be provided`
                            );
                    }
                    if( !data.incomeAndExpenditure || data.incomeAndExpenditure.pdfUrl!="" || data.incomeAndExpenditure.pdfUrl!=null || data.incomeAndExpenditure.excelUrl!="" || data.incomeAndExpenditure.excelUrl!=null){
                        return Response.BadRequest(
                            res,
                            {},
                             `incomeAndExpenditure must be provided`
                        );
                    }
                    if( !data.trialBalance || data.trialBalance.pdfUrl!="" || data.trialBalance.pdfUrl!=null || data.trialBalance.excelUrl!="" || data.trialBalance.excelUrl!=null){
                        return Response.BadRequest(
                            res,
                            {},
                            `trialBalance must be provided`
                        );
                    }
                    if(data.audited==true){

                        if( !data.auditReport || data.auditReport.pdfUrl!="" || data.auditReport.pdfUrl!=null){
                            return Response.BadRequest(
                                res,
                                {},
                                `auditReport must be provided`
                            );
                        }
                    }
                }

                let du = await UlbFinancialData.update(
                    { _id: prevState._id },
                    { $set: prevState, $push: { history: history } }
                );
                let ulbFinancialDataobj = await UlbFinancialData.findOne({
                    _id: prevState._id
                }).exec();

                if (
                    prevState.status == 'REJECTED' ||
                    prevState.status == 'APPROVED'
                ) {
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
                        prevState._id,
                        'ACTION'
                    );
                }
                return Response.OK(
                    res,
                    ulbFinancialDataobj,
                    `completeness status changed to ${prevState.completeness}`
                );
            }
        } catch (e) {
            return Response.DbError(
                res,
                e.message,
                'Caught Database Exception'
            );
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            `This action is only allowed by ${actionAllowed.join()}`
        );
    }
};
module.exports.correctness = async (req, res) => {
    let user = req.decoded,
        data = req.body,
        _id = ObjectId(req.params._id);
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
    let keys = [
        'balanceSheet',
        'schedulesToBalanceSheet',
        'incomeAndExpenditure',
        'schedulesToIncomeAndExpenditure',
        'trialBalance',
        'auditReport'
    ];
    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            if (user.role == 'STATE') {
                let ulb = await Ulb.findOne({ _id: ObjectId(data.ulb) }).exec();
                if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
                    let message = !ulb
                        ? 'Ulb not found.'
                        : 'State is not matching.';
                    return Response.BadRequest(res, {}, message);
                }
            }
            let prevState = await UlbFinancialData.findOne(
                { _id: _id },
                '-history'
            ).lean();
            let history = Object.assign({}, prevState);
            if (!prevState) {
                return Response.BadRequest(
                    res,
                    {},
                    'Requested record not found.'
                );
            } else if (prevState.completeness != 'APPROVED') {
                return Response.BadRequest(
                    res,
                    {},
                    'Completeness is on allowed after correctness.'
                );
            } else if (prevState.correctness == 'APPROVED') {
                return Response.BadRequest(res, {}, 'Already approved.');
            } else {
                let rejected = keys.filter((key) => {
                    return (
                        data[key] &&
                        data[key].correctness &&
                        data[key].correctness == 'REJECTED'
                    );
                });
                let pending = keys.filter((key) => {
                    return (
                        data[key] &&
                        data[key].correctness &&
                        data[key].correctness == 'PENDING'
                    );
                });
                console.log(rejected.length, pending.length);
                for (let key of keys) {
                    if (data[key] && data[key].correctness) {
                        prevState[key].correctness = data[key].correctness;
                        prevState[key].message = data[key].message;
                    }
                }
                prevState['correctness'] = pending.length
                    ? 'PENDING'
                    : rejected.length
                    ? 'REJECTED'
                    : 'APPROVED';
                prevState['status'] = prevState['correctness'];
                prevState.modifiedAt = new Date();
                prevState.actionTakenBy = user._id;
                let du = await UlbFinancialData.update(
                    { _id: prevState._id },
                    { $set: prevState, $push: { history: history } }
                );
                let ulbFinancialDataobj = await UlbFinancialData.findOne({
                    _id: prevState._id
                }).exec();

                if (
                    prevState.status == 'REJECTED' ||
                    prevState.status == 'APPROVED'
                ) {
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
                        prevState._id,
                        'ACTION'
                    );
                }
                return Response.OK(
                    res,
                    ulbFinancialDataobj,
                    `correctness status changed to ${prevState.correctness}`
                );
            }
        } catch (e) {
            console.log(e);
            return Response.DbError(
                res,
                e.message,
                'Caught Database Exception'
            );
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            `This action is only allowed by ULB ${actionAllowed.join()}`
        );
    }
};
module.exports.getApprovedFinancialData = async (req, res) => {
    try {
        let user = req.decoded,
            filter = req.query.filter
                ? JSON.parse(req.query.filter)
                : req.body.filter
                ? req.body.filter
                : {},
            sort = req.query.sort
                ? JSON.parse(req.query.sort)
                : req.body.sort
                ? req.body.sort
                : {},
            skip = req.query.skip ? parseInt(req.query.skip) : 0,
            limit = req.query.limit ? parseInt(req.query.limit) : 50,
            csv = req.query.csv;
        let q = [
            { $match: { status: 'APPROVED' } },
            {
                $lookup: {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulb'
                }
            },
            {
                $lookup: {
                    from: 'ulbtypes',
                    localField: 'ulb.ulbType',
                    foreignField: '_id',
                    as: 'ulbType'
                }
            },
            {
                $lookup: {
                    from: 'states',
                    localField: 'ulb.state',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            { $unwind: '$ulb' },
            { $unwind: '$ulbType' },
            { $unwind: '$state' },
            {
                $project: {
                    _id: 1,
                    audited: 1,
                    financialYear: 1,
                    ulbType: '$ulbType.name',
                    ulb: '$ulb._id',
                    ulbName: '$ulb.name',
                    ulbCode: '$ulb.code',
                    state: '$state._id',
                    stateName: '$state.name',
                    stateCode: '$state.code'
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
            q.push({ $match: newFilter });
        }
        if (sort && Object.keys(sort).length) {
            q.push({ $sort: sort });
        }
        if (csv) {
            let arr = await UlbFinancialData.aggregate(q).exec();
            let xlsData = await Service.dataFormating(arr, {
                stateName: 'State',
                ulbName: 'ULB name',
                ulbCode: 'ULB Code',
                financialYear: 'Financial Year',
                auditStatus: 'Audit Status',
                status: 'Status'
            });
            return res.xls('financial-data.xlsx', xlsData);
        } else {
            if (!skip) {
                let qrr = [...q, { $count: 'count' }];
                let d = await UlbFinancialData.aggregate(qrr);
                total = d.length ? d[0].count : 0;
            }
            /* q.push({$skip: skip});
            q.push({$limit: limit});*/
            let arr = await UlbFinancialData.aggregate(q).exec();
            return res.status(200).json({
                timestamp: moment().unix(),
                success: true,
                message: 'Ulb update request list',
                data: arr,
                total: total
            });
        }
    } catch (e) {
        return Response.BadRequest(res, e, e.message);
    }
};
module.exports.sourceFiles = async (req, res) => {
    try {
        let lh_id = ObjectId(req.decoded.lh_id); // Login history id
        let _id = ObjectId(req.params._id);
        let select = {
            'balanceSheet.pdfUrl': 1,
            'balanceSheet.excelUrl': 1,
            'schedulesToBalanceSheet.pdfUrl': 1,
            'schedulesToBalanceSheet.excelUrl': 1,
            'incomeAndExpenditure.pdfUrl': 1,
            'incomeAndExpenditure.excelUrl': 1,
            'schedulesToIncomeAndExpenditure.pdfUrl': 1,
            'schedulesToIncomeAndExpenditure.excelUrl': 1,
            'trialBalance.pdfUrl': 1,
            'trialBalance.excelUrl': 1,
            'auditReport.pdfUrl': 1,
            'auditReport.excelUrl': 1,
            'overallReport.pdfUrl': 1,
            'overallReport.excelUrl': 1
        };
        let data = await UlbFinancialData.find({ _id: _id }, select).exec();
        let lh = await LoginHistory.update(
            { _id: lh_id },
            { $push: { reports: _id } }
        );
        return Response.OK(res, data.length ? getSourceFiles(data[0]) : {});
    } catch (e) {
        return Response.DbError(res, e);
    }
};
function getSourceFiles(obj) {
    let o = {
        pdf: [],
        excel: []
    };
    obj.balanceSheet && obj.balanceSheet.pdfUrl
        ? o.pdf.push({ name: 'Balance Sheet', url: obj.balanceSheet.pdfUrl })
        : '';
    obj.balanceSheet && obj.balanceSheet.excelUrl
        ? o.excel.push({
              name: 'Balance Sheet',
              url: obj.balanceSheet.excelUrl
          })
        : '';

    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.pdfUrl
        ? o.pdf.push({
              name: 'Schedules To Balance Sheet',
              url: obj.schedulesToBalanceSheet.pdfUrl
          })
        : '';
    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.excelUrl
        ? o.excel.push({
              name: 'Schedules To Balance Sheet',
              url: obj.schedulesToBalanceSheet.excelUrl
          })
        : '';

    obj.incomeAndExpenditure && obj.incomeAndExpenditure.pdfUrl
        ? o.pdf.push({
              name: 'Income And Expenditure',
              url: obj.incomeAndExpenditure.pdfUrl
          })
        : '';
    obj.incomeAndExpenditure && obj.incomeAndExpenditure.excelUrl
        ? o.excel.push({
              name: 'Income And Expenditure',
              url: obj.incomeAndExpenditure.excelUrl
          })
        : '';

    obj.schedulesToIncomeAndExpenditure &&
    obj.schedulesToIncomeAndExpenditure.pdfUrl
        ? o.pdf.push({
              name: 'Schedules To Income And Expenditure',
              url: obj.schedulesToIncomeAndExpenditure.pdfUrl
          })
        : '';
    obj.schedulesToIncomeAndExpenditure &&
    obj.schedulesToIncomeAndExpenditure.excelUrl
        ? o.excel.push({
              name: 'Schedules To Income And Expenditure',
              url: obj.schedulesToIncomeAndExpenditure.excelUrl
          })
        : '';

    obj.trialBalance && obj.trialBalance.pdfUrl
        ? o.pdf.push({ name: 'Trial Balance', url: obj.trialBalance.pdfUrl })
        : '';
    obj.trialBalance && obj.trialBalance.excelUrl
        ? o.excel.push({
              name: 'Trial Balance',
              url: obj.trialBalance.excelUrl
          })
        : '';

    obj.auditReport && obj.auditReport.pdfUrl
        ? o.pdf.push({ name: 'Audit Report', url: obj.auditReport.pdfUrl })
        : '';
    obj.auditReport && obj.auditReport.excelUrl
        ? o.excel.push({ name: 'Audit Report', url: obj.auditReport.excelUrl })
        : '';

    obj.overallReport && obj.overallReport.pdfUrl
        ? o.pdf.push({ name: 'Overall Report', url: obj.overallReport.pdfUrl })
        : '';
    obj.overallReport && obj.overallReport.excelUrl
        ? o.excel.push({
              name: 'Overall Report',
              url: obj.overallReport.excelUrl
          })
        : '';

    return o;
}
