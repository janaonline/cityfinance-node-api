const Ulb = require('../../models/Ulb');
const UlbFinancialData = require('../../models/UlbFinancialData');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const Response = require('../../service').response;
const Service = require('../../service');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment');
const AnnualAccountData = require('../../models/AnnualAccounts')
const Year = require('../../models/Year')
const { years } = require("../../service/years");


module.exports.create = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (user.role == 'ULB') {
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
        let ulb = await Ulb.findOne({ _id: user.ulb }, '_id name code').lean();
        if (!ulb) {
            return Response.BadRequest(res, {}, `Ulb not found.`);
        }
        let audited =
            typeof data.audited == 'boolean'
                ? data.audited
                : typeof data.audited == 'string' && data.audited == 'true';
        data.referenceCode = `${ulb.code}_${data.financialYear}_${audited ? 'Audited' : 'Unaudited'
            }`;
        data.ulb = user.ulb;
        let checkData = await UlbFinancialData.count({
            ulb: data.ulb,
            financialYear: data.financialYear,
            audited: true,
        });
        if (checkData) {
            return Response.BadRequest(
                res,
                {},
                `Audited data already been uploaded for ${data.financialYear}.`
            );
        }
        data.actionTakenBy = ObjectId(user._id);
        let ulbUpdateRequest = new UlbFinancialData(data);
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
                try {
                    await Service.emailTemplate.sendULBFinancialDataStatusEmail(
                        dt._id,
                        'UPLOAD'
                    );
                } catch (error) {
                    console.error(
                        'Failed to send email for ULB Data Upload on creation: \n',
                        error
                    );
                }
                return Response.OK(res, dt, 'Request accepted.');
            }
        });
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
                                select: '_id name code',
                            },
                        },
                        {
                            path: 'actionTakenBy',
                            select: '_id name email role',
                        },
                    ])
                    .populate([
                        {
                            path: 'history.actionTakenBy',
                            model: User,
                            select: '_id name email role',
                        },
                        {
                            path: 'history.ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code',
                            },
                        },
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
                                select: '_id name code',
                            },
                        },
                        {
                            path: 'actionTakenBy',
                            select: '_id name email role',
                        },
                    ])
                    .populate([
                        {
                            path: 'history.actionTakenBy',
                            model: User,
                            select: '_id name email role',
                        },
                        {
                            path: 'history.ulb',
                            select: '_id name code state',
                            populate: {
                                path: 'state',
                                select: '_id name code',
                            },
                        },
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
                    data: data,
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

        let status = 'PENDING';
        if (user.role == 'ULB') {
            status = 'REJECTED';
        }

        console.log(status);

        if (actionAllowed.indexOf(user.role) > -1) {
            let q = [
                {
                    $match: { overallReport: null },
                },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType',
                    },
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy',
                    },
                },
                { $unwind: '$ulb' },
                { $unwind: '$ulbType' },
                { $unwind: '$state' },
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $addFields: {
                        priority: {
                            $cond: {
                                if: { $eq: ['$status', `${status}`] },
                                then: 2,
                                else: 1,
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        audited: 1,
                        priority: 1,
                        auditStatus: {
                            $cond: {
                                if: '$audited',
                                then: 'Audited',
                                else: 'Unaudited',
                            },
                        },
                        completeness: 1,
                        correctness: 1,
                        status: 1,
                        financialYear: 1,
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        actionTakenByUserName: '$actionTakenBy.name',
                        actionTakenByUserRole: '$actionTakenBy.role',
                        isActive: '$isActive',
                        createdAt: '$createdAt',
                    },
                },
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
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }

            if (sort && Object.keys(sort).length) {
                q.push({ $sort: sort });
            } else {
                q.push({ $sort: { createdAt: -1 } });
                q.push({ $sort: { priority: -1 } });
            }

            if (csv) {
                let arr = await UlbFinancialData.aggregate(q).exec();
                let xlsData = await Service.dataFormating(arr, {
                    ulbName: 'ULB name',
                    ulbCode: 'ULB Code',
                    financialYear: 'Financial Year',
                    auditStatus: 'Audit Status',
                    status: 'Status',
                });
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
                    // return res.json(q)
                    let arr = await UlbFinancialData.aggregate(q).exec();
                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: 'Ulb update request list',
                        data: arr,
                        total: total,
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
function csvData() {

    return field = {
        stateName: 'State name',
        ulbName: 'ULB name',
        ulbType: 'ULB Type',
        populationType: 'Population Type',
        censusCode: 'Census Code',
        sbCode: 'ULB Code',
        //financialYear: 'Financial Year',
        //auditStatus: 'Audit Status',
        status: 'Status',
        'baeline_waterSuppliedPerDay_2020_21': 'Baseline 2020-21_Water supplied in litre per day(lpcd)',
        'target_waterSuppliedPerDay_2021_22': 'Target 2021-22_Water supplied in litre per day(lpcd)',
        'target_waterSuppliedPerDay_2022_23': 'Target 2022-23_Water supplied in litre per day(lpcd)',
        'target_waterSuppliedPerDay_2023_24': 'Target 2023-24_Water supplied in litre per day(lpcd)',
        'target_waterSuppliedPerDay_2024_25': 'Target 2024_25_Water supplied in litre per day(lpcd)',

        'baseline_reduction_2020_21': 'Baseline 2020-21_Reduction in non-water revenue',
        'target_reduction_2021_22': 'Target 2021-22_Reduction in non-water revenue',
        'target_reduction_2022_23': 'Target 2022-23_Reduction in non-water revenue',
        'target_reduction_2023_24': 'Target 2023-24_Reduction in non-water revenue',
        'target_reduction_2024_25': 'Target 2024_25_Reduction in non-water revenue',

        'baeline_houseHoldCoveredWithSewerage_2020_21': 'Baseline 2020-21_% of households covered with sewerage/septage services',
        'target_houseHoldCoveredWithSewerage_2021_22': 'Target 2021-22_% of households covered with sewerage/septage services',
        'target_houseHoldCoveredWithSewerage_2022_23': 'Target 2022-23_% of households covered with sewerage/septage services',
        'target_houseHoldCoveredWithSewerage_2023_24': 'Target 2023-24_% of households covered with sewerage/septage services',
        'target_houseHoldCoveredWithSewerage_2024_25': 'Target 2024_25_% of households covered with sewerage/septage services',

        'baeline_houseHoldCoveredPipedSupply_2020_21': 'Baseline 2020-21_% of households covered with piped water supply',
        'target_houseHoldCoveredPipedSupply_2021_22': 'Target 2021-22_% of households covered with piped water supply',
        'target_houseHoldCoveredPipedSupply_2022_23': 'Target 2022-23_% of households covered with piped water supply',
        'target_houseHoldCoveredPipedSupply_2023_24': 'Target 2023-24_% of households covered with piped water supply',
        'target_houseHoldCoveredPipedSupply_2024_25': 'Target 2024_25_% of households covered with piped water supply',

        'garbageFreeCities': 'Plan for garbage free star rating of the cities',
        'waterSupplyCoverage': 'Plan for coverage of water supply for public/community toilets',
        'cityPlan': 'City Plan DPR',
        'waterBalancePlan': 'Water Balance Plan',
        'serviceLevelPlan': 'Service Level Improvement Plan',
        'solidWastePlan': 'Solid Waste Management Plan'
    };
}
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
                { $match: { ulb: ObjectId(req.params._id) } },
                {
                    $project: {
                        history: {
                            $concatArrays: [
                                [
                                    {
                                        _id: '$_id',
                                        referenceCode: '$referenceCode',
                                        audited: '$audited',
                                        overallReport: '$overallReport',
                                        completeness: '$completeness',
                                        correctness: '$correctness',
                                        status: '$status',
                                        modifiedAt: '$modifiedAt',
                                        createdAt: '$createdAt',
                                        isActive: '$isActive',
                                        balanceSheet: '$balanceSheet',
                                        schedulesToBalanceSheet:
                                            '$schedulesToBalanceSheet',
                                        incomeAndExpenditure:
                                            '$incomeAndExpenditure',
                                        schedulesToIncomeAndExpenditure:
                                            '$schedulesToIncomeAndExpenditure',
                                        trialBalance: '$trialBalance',
                                        financialYear: '$financialYear',
                                        ulb: '$ulb',
                                        actionTakenBy: '$actionTakenBy',
                                    },
                                ],
                                '$history',
                            ],
                        },
                    },
                },
                { $unwind: '$history' },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'history.ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbType',
                    },
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'ulb.state',
                        foreignField: '_id',
                        as: 'state',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'history.actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenBy',
                    },
                },
                { $unwind: { path: '$ulb', preserveNullAndEmptyArrays: true } },
                {
                    $unwind: {
                        path: '$ulbType',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: '$state',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $project: {
                        _id: 1,
                        audited: '$history.audited',
                        completeness: '$history.completeness',
                        correctness: '$history.correctness',
                        status: '$history.status',
                        financialYear: '$history.financialYear',
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        actionTakenByUserName: '$actionTakenBy.name',
                        actionTakenByUserRole: '$actionTakenBy.role',
                        modifiedAt: '$history.modifiedAt',
                    },
                },
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
                q.push({ $sort: sort });
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
                return res.status(200).json({
                    timestamp: moment().unix(),
                    success: true,
                    message: 'Ulb update request list',
                    data: arr,
                    total: total,
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
        let data = await UlbFinancialData.findOne(query, '-history').exec();
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: 'Ulb update request list',
            data: data,
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
        'auditReport',
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

                if (user.role == 'ULB') {
                    if (data.balanceSheet) {
                        if (
                            data.balanceSheet.pdfUrl == '' ||
                            data.balanceSheet.pdfUrl == null ||
                            data.balanceSheet.excelUrl == '' ||
                            data.balanceSheet.excelUrl == null
                        ) {
                            return Response.BadRequest(
                                res,
                                {},
                                `balanceSheet must be provided`
                            );
                        }
                    }
                    if (data.incomeAndExpenditure) {
                        if (
                            data.incomeAndExpenditure.pdfUrl == '' ||
                            data.incomeAndExpenditure.pdfUrl == null ||
                            data.incomeAndExpenditure.excelUrl == '' ||
                            data.incomeAndExpenditure.excelUrl == null
                        ) {
                            return Response.BadRequest(
                                res,
                                {},
                                `incomeAndExpenditure must be provided`
                            );
                        }
                    }
                    if (data.trialBalance) {
                        if (
                            data.trialBalance.pdfUrl == '' ||
                            data.trialBalance.pdfUrl == null ||
                            data.trialBalance.excelUrl == '' ||
                            data.trialBalance.excelUrl == null
                        ) {
                            return Response.BadRequest(
                                res,
                                {},
                                `trialBalance must be provided`
                            );
                        }
                    }
                    if (data.audited == true) {
                        if (
                            !data.auditReport ||
                            data.auditReport.pdfUrl == '' ||
                            data.auditReport.pdfUrl == null
                        ) {
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
                    _id: prevState._id,
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
        'auditReport',
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

                if (user.role == 'ULB') {
                    if (
                        !data.balanceSheet ||
                        data.balanceSheet.pdfUrl != '' ||
                        data.balanceSheet.pdfUrl != null ||
                        data.balanceSheet.excelUrl != '' ||
                        data.balanceSheet.excelUrl != null
                    ) {
                        return Response.BadRequest(
                            res,
                            {},
                            `balanceSheet must be provided`
                        );
                    }
                    if (
                        !data.incomeAndExpenditure ||
                        data.incomeAndExpenditure.pdfUrl != '' ||
                        data.incomeAndExpenditure.pdfUrl != null ||
                        data.incomeAndExpenditure.excelUrl != '' ||
                        data.incomeAndExpenditure.excelUrl != null
                    ) {
                        return Response.BadRequest(
                            res,
                            {},
                            `incomeAndExpenditure must be provided`
                        );
                    }
                    if (
                        !data.trialBalance ||
                        data.trialBalance.pdfUrl != '' ||
                        data.trialBalance.pdfUrl != null ||
                        data.trialBalance.excelUrl != '' ||
                        data.trialBalance.excelUrl != null
                    ) {
                        return Response.BadRequest(
                            res,
                            {},
                            `trialBalance must be provided`
                        );
                    }
                    if (data.audited == true) {
                        if (
                            !data.auditReport ||
                            data.auditReport.pdfUrl != '' ||
                            data.auditReport.pdfUrl != null
                        ) {
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
                    _id: prevState._id,
                }).exec();

                if (
                    prevState.status == 'REJECTED' ||
                    prevState.status == 'APPROVED'
                ) {
                    try {
                        let email = await Service.emailTemplate.sendULBFinancialDataStatusEmail(
                            prevState._id,
                            'ACTION'
                        );
                    } catch (error) {
                        console.log(
                            `Failed to send email on ULB Upload Data- completeness taking action ${prevState.status}\n`,
                            error
                        );
                    }
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
        'auditReport',
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
                    _id: prevState._id,
                }).exec();

                if (
                    prevState.status == 'REJECTED' ||
                    prevState.status == 'APPROVED'
                ) {
                    try {
                        let email = await Service.emailTemplate.sendULBFinancialDataStatusEmail(
                            prevState._id,
                            'ACTION'
                        );
                    } catch (error) {
                        console.log(
                            `Failed to send email on ULB Upload Data - correctness taking action ${prevState.status}\n`,
                            error
                        );
                    }
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
                    as: 'ulb',
                },
            },
            {
                $lookup: {
                    from: 'ulbtypes',
                    localField: 'ulb.ulbType',
                    foreignField: '_id',
                    as: 'ulbType',
                },
            },
            {
                $lookup: {
                    from: 'states',
                    localField: 'ulb.state',
                    foreignField: '_id',
                    as: 'state',
                },
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
                    stateCode: '$state.code',
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
                },
            },
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
                status: 'Status',
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
                total: total,
            });
        }
    } catch (e) {
        return Response.BadRequest(res, e, e.message);
    }
};

/* Checking if the ulbId is valid or not. and send to next for getting documents*/
module.exports.findFiles = async (req, res, next) => {
    let _id = ObjectId(req.params._id);
    try {
        let ulbId = await UlbFinancialData.find({ ulb: _id }, { _id: 1 }).exec();
        if (!ulbId) throw new Error("Ulb Id is invalid!");

        req.params._id = ulbId.map(l => l._id).join(",");
        next();
    } catch (error) {
        return Response.BadRequest(res, error, error.message);
    }
}

module.exports.sourceFiles = async (req, res) => {
    // mongoose.set('debug', true);
    try {
        if (req.decoded) {
            let lh_id = ObjectId(req.decoded.lh_id); // Login history id
        }

        let allId = req.params._id.split(",");
        let ulbId = allId.map(el => ObjectId(el))
        let condition = { ulb: { $in: allId } };
        let obj = {}
        let year = req.query.financialYear;
        Object.assign(obj, { ulb: ulbId })
        if (req.query.financialYear) {
            condition['financialYear'] = req.query.financialYear;

        }
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
            'overallReport.excelUrl': 1,
        };

        let data;
        let result = [];
        const yearSplit = Number(year.split('-')[0]);
        // less than year 2019 data present in UlbFinancialData
        if (yearSplit < 2019) {
            data = await UlbFinancialData.find(condition, select).exec();

            for (const objectData of data) {
                const { pdf, excel } = getSourceFiles(objectData, year);
                if (pdf.length || excel.length) {
                    result.push({ pdf, excel });
                }
            }
        } else {
            result = await getAnnualAccounts(ulbId, year);
        }

        return Response.OK(res, result);
    } catch (e) {
        return Response.DbError(res, e);
    }
};

function getCond(ulbId, yearId, type) {
    let cond = {
        ulb: ulbId,
        [type + '.year']: ObjectId(yearId),
        ...(type === 'audited' && { 'audited.provisional_data.bal_sheet.pdf.url': { $ne: null } })
    };
    return cond;
}

async function getAnnualAccounts(ulbId, year) {
    const yearId = years[year];
    let doc;
    let type = 'audited';
    let res = await AnnualAccountData.findOne(getCond(ulbId, yearId, 'audited'), { audited: 1 })
        .lean().exec();
    if (res) {
        doc = res.audited?.provisional_data;
    }
    if (!res) {
        type = 'unAudited';
        let resUnAudited = await AnnualAccountData.findOne(getCond(ulbId, yearId, 'unAudited'), { unAudited: 1 })
            .lean().exec();
        doc = resUnAudited ? resUnAudited.unAudited?.provisional_data : null;
    }
    return getNewSourceFiles(doc, type);
}

function getNewSourceFiles(data, type) {
    let o = {
        pdf: [],
        excel: [],
        type
    };
    // data = (year == '2019-20') ? doc.audited.provisional_data : doc.unAudited.provisional_data;
    const formats = [
        { key: 'bal_sheet', name: 'Balance Sheet' },
        { key: 'bal_sheet_schedules', name: 'Schedules To Balance Sheet' },
        { key: 'inc_exp', name: 'Income And Expenditure' },
        { key: 'inc_exp_schedules', name: 'Schedules To Income And Expenditure' },
        { key: 'cash_flow', name: 'Cash Flow Statement' },
        { key: 'auditor_report', name: 'Auditor Report' },
    ];

    for (let file of formats) {
        if (data && data[file.key]) {
            if (data[file.key].pdf?.url) {
                o.pdf.push({ name: file.name, url: data[file.key].pdf?.url })
            }
            if (data[file.key].excel?.url) {
                o.excel.push({ name: file.name, url: data[file.key].excel?.url })
            }
        }
    }
    return o;
}
function getSourceFiles(obj, year) {
    let o = {
        pdf: [],
        excel: [],
    };
    obj.balanceSheet && obj.balanceSheet.pdfUrl
        ? o.pdf.push({ name: 'Balance Sheet', url: obj.balanceSheet.pdfUrl })
        : '';
    obj.balanceSheet && obj.balanceSheet.excelUrl
        ? o.excel.push({
            name: 'Balance Sheet',
            url: obj.balanceSheet.excelUrl,
        })
        : '';

    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.pdfUrl
        ? o.pdf.push({
            name: 'Schedules To Balance Sheet',
            url: obj.schedulesToBalanceSheet.pdfUrl,
        })
        : '';
    obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.excelUrl
        ? o.excel.push({
            name: 'Schedules To Balance Sheet',
            url: obj.schedulesToBalanceSheet.excelUrl,
        })
        : '';

    obj.incomeAndExpenditure && obj.incomeAndExpenditure.pdfUrl
        ? o.pdf.push({
            name: 'Income And Expenditure',
            url: obj.incomeAndExpenditure.pdfUrl,
        })
        : '';
    obj.incomeAndExpenditure && obj.incomeAndExpenditure.excelUrl
        ? o.excel.push({
            name: 'Income And Expenditure',
            url: obj.incomeAndExpenditure.excelUrl,
        })
        : '';

    obj.schedulesToIncomeAndExpenditure &&
        obj.schedulesToIncomeAndExpenditure.pdfUrl
        ? o.pdf.push({
            name: 'Schedules To Income And Expenditure',
            url: obj.schedulesToIncomeAndExpenditure.pdfUrl,
        })
        : '';
    obj.schedulesToIncomeAndExpenditure &&
        obj.schedulesToIncomeAndExpenditure.excelUrl
        ? o.excel.push({
            name: 'Schedules To Income And Expenditure',
            url: obj.schedulesToIncomeAndExpenditure.excelUrl,
        })
        : '';

    obj.trialBalance && obj.trialBalance.pdfUrl
        ? o.pdf.push({ name: 'Trial Balance', url: obj.trialBalance.pdfUrl })
        : '';
    obj.trialBalance && obj.trialBalance.excelUrl
        ? o.excel.push({
            name: 'Trial Balance',
            url: obj.trialBalance.excelUrl,
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
            url: obj.overallReport.excelUrl,
        })
        : '';

    return o;
}
