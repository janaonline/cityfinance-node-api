const Ulb = require('../../models/Ulb');
const UlbFinancialData = require('../../models/UlbFinancialData');
const XVFCGrantULBData = require('../../models/XVFcGrantForm');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const State = require('../../models/State');
const XVStateForm = require('../../models/XVStateForm');
const Response = require('../../service').response;
const Service = require('../../service');
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('moment');
const { JsonWebTokenError } = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
var AdmZip = require('adm-zip');
const { strict } = require('assert');
const { MongooseDocument } = require('mongoose');
const dir = 'uploads';
const subDir = '/source';
const date = moment().format('DD-MMM-YY');
const Year = require('../../models/Year');
const { findOne } = require('../../models/LedgerLog');
const { UpdateMasterSubmitForm } = require('../../service/updateMasterForm')
async function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}
module.exports.createDir = function (req, res, next) {
    if (!fs.existsSync(dir + subDir + '_' + date)) {
        fs.mkdirSync(dir + subDir + '_' + date);
        console.log('Created subDir', dir + subDir + '_' + date);
    }
    next();
};
module.exports.unzip = async (req, res, next) => {
    let user = req.decoded;
    var destinationPath = req.file.path;
    var zip = new AdmZip(destinationPath);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
    let error = [];
    fs.unlinkSync(destinationPath);
    for (let zipEntry of zipEntries) {
        let st = zipEntry.entryName.split('/');
        let filename = st[st.length - 1];
        st = st[st.length - 1].split('_');
        let st1 = st[1].split('.'); // fetch extension of file
        let resp = st1[0].split('');
        let year = '20' + resp[0] + resp[1] + '-' + resp[2] + resp[3];
        let ulb = await Ulb.findOne({ code: st[0] }, { _id: 1, code: 1 });
        if (ulb) {
            let query = {
                financialYear: year,
                referenceCode: st[0] + '_' + year + '_Audited',
                ulb: ObjectId(ulb._id),
            };
            let ulbFobj = await UlbFinancialData.findOne(query);
            let dataObj = ulbFobj ? ulbFobj : obj();
            dataObj['referenceCode'] = st[0] + '_' + year + '_Audited';
            dataObj['financialYear'] = year;
            dataObj['ulb'] = ObjectId(ulb._id);
            console.log(ulb.code, st1);
            if (st1[1] == 'pdf') {
                dataObj['overallReport']['pdfUrl'] =
                    req.protocol +
                    '://' +
                    req.headers.host +
                    '/source_' +
                    date +
                    '/' +
                    filename;
            }
            if (st1[1] == 'xlsx') {
                dataObj['overallReport']['excelUrl'] =
                    req.protocol +
                    '://' +
                    req.headers.host +
                    '/source_' +
                    date +
                    '/' +
                    zipEntry.entryName;
            }
            dataObj['actionTakenBy'] = ObjectId(user._id);
            let up = await UlbFinancialData.update(query, dataObj, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            });
            zip.extractEntryTo(
                zipEntry.entryName,
                'uploads/source_' + date + '/',
                false,
                true
            );
        } else {
            error.push(`ulb code: ${st[0]} not exist`);
        }
    }
    res.send({ message: 'success', error: error });
};

const obj = () => {
    let obj = {
        tag: 'BULKMIGRATION',
        referenceCode: '',
        audited: true,
        financialYear: '',
        completeness: 'APPROVED',
        correctness: 'APPROVED',
        status: 'APPROVED',
        modifiedAt: new Date(),
        createdAt: new Date(),
        isActive: false,
        balanceSheet: {
            completeness: 'NA',
            correctness: 'NA',
            message: '',
            pdfUrl: '',
            excelUrl: '',
        },
        schedulesToBalanceSheet: {
            completeness: 'NA',
            correctness: 'NA',
            message: '',
            pdfUrl: '',
            excelUrl: '',
        },
        incomeAndExpenditure: {
            completeness: 'NA',
            correctness: 'NA',
            message: '',
            pdfUrl: '',
            excelUrl: '',
        },
        schedulesToIncomeAndExpenditure: {
            completeness: 'NA',
            correctness: 'NA',
            message: '',
            pdfUrl: '',
            excelUrl: '',
        },
        trialBalance: {
            completeness: 'NA',
            correctness: 'NA',
            message: null,
            pdfUrl: '',
            excelUrl: '',
        },
        auditReport: {
            completeness: 'NA',
            correctness: 'NA',
            message: null,
            pdfUrl: '',
        },
        ulb: '',
        overallReport: {
            completeness: 'APPROVED',
            correctness: 'APPROVED',
            message: null,
            pdfUrl: '',
            excelUrl: '',
        },
    };
    return obj;
};

const waterManagementKeys = [
    'serviceLevel',
    'houseHoldCoveredPipedSupply',
    'waterSuppliedPerDay',
    'reduction',
    'houseHoldCoveredWithSewerage',
];
const solidWasteManagementKeys = ['garbageFreeCities', 'waterSupplyCoverage'];
const millionPlusCitiesKeys = [
    'cityPlan',
    'waterBalancePlan',
    'serviceLevelPlan',
    'solidWastePlan',
];
const mappingKeys = {
    serviceLevel: 'serviceLevel',
    houseHoldCoveredPipedSupply:
        '% of households covered with piped water supply',
    waterSuppliedPerDay: 'Water Supplied in litre per day(lpcd)',
    reduction: 'Reduction in non-water revenue',
    houseHoldCoveredWithSewerage:
        '% of household covered with sewerage/septage services',
    garbageFreeCities: 'Plan for garbage free star rating of the cities',
    waterSupplyCoverage:
        'Plan for coverage of water supply for public/community toilets',
    cityPlan: 'City Plan DPR',
    waterBalancePlan: 'Water Balance Plan',
    serviceLevelPlan: 'Service Level Improvement Plan',
    solidWastePlan: 'Solid Waste Management Plan',
};

const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};


module.exports.create = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (user.role == 'ULB') {
        let design_year = data.design_year;
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found!'
            })
        }
        let ulb = await Ulb.findOne({ _id: user.ulb }, '_id name code').lean();
        if (!ulb) {
            return Response.BadRequest(res, {}, `Ulb not found.`);
        }
        if (data?.water_index && (!data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url || data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url === "")) {
            return res.status(400).json({
                success: false,
                message: 'Must Submit Water Potability Plan (PDF Format)'
            })
        } else if (!data?.water_index && (data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url || data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url != "")) {
            return res.status(400).json({
                success: false,
                message: 'Water Potability Plan Cannot be Submitted.'
            })
        }

        data.ulb = user.ulb;
        req.body['createdAt'] = time();
        data.modifiedAt = time();
        data.actionTakenBy = ObjectId(user._id);
        let ulbUpdateRequest = new XVFCGrantULBData(data);
        /**Now**/
        let query = {};
        req.body['overallReport'] = null;
        req.body['status'] = 'PENDING';
        query['ulb'] = ObjectId(data.ulb);

        if (design_year && design_year != "") {
            Object.assign(query, { design_year: ObjectId(design_year) })
        }
        let ulbData = await XVFCGrantULBData.findOne(query);
        if (ulbData && !data.isOldForm) {
            req.body['history'] = [...ulbData.history];
            ulbData.history = undefined;
            req.body['history'].push(ulbData);
        }
        if (ulbData && ulbData.status == 'PENDING' && data.isOldForm) {
            if (ulbData.isCompleted) {
                return Response.BadRequest(
                    res,
                    {},
                    `Form is already submitted`
                );
            }
        }
        if (ulbData && ulbData.isCompleted == true && data.isOldForm) {
            req.body['history'] = [...ulbData.history];
            ulbData.history = undefined;
            req.body['history'].push(ulbData);
        }
        Service.put(query, req.body, XVFCGrantULBData, async function (
            response,
            value
        ) {
            if (response) {
                let ulbData = await XVFCGrantULBData.findOne(query);
                if (ulbData.isCompleted) {
                    if (!ulbData?.isOldForm) {
                        await UpdateMasterSubmitForm(req, "slbForWaterSupplyAndSanitation");
                    }
                    let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
                        ulbData._id,
                        'UPLOAD'
                    );
                }
                return res.status(response ? 200 : 400).send(value);
            } else {
                return Response.DbError(res, err, 'Failed to create entry');
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
        design_year = req.query.design_year,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE', 'ULB'];

    if (!design_year || design_year === "") {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found!'
        })
    }

    if (actionAllowed.indexOf(user.role) > -1) {
        if (req.query._id) {
            try {
                let query = { _id: ObjectId(req.query._id) };

                let data = await XVFCGrantULBData.findOne(query)
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
                if (design_year && design_year != "") {
                    Object.assign(query, { design_year: ObjectId(design_year) })
                }

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
                    total = await XVFCGrantULBData.count(query);
                }

                let data = await XVFCGrantULBData.find(query)
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
        let statusFilter = {
            1: {
                status: 'PENDING',
                isCompleted: false,
                actionTakenByUserRole: 'ULB',
            },
            2: {
                $or: [
                    {
                        status: 'PENDING',
                        isCompleted: true,
                        actionTakenByUserRole: 'ULB',
                    },
                    { isCompleted: false, actionTakenByUserRole: 'STATE' },
                ],
            },
            3: {
                $or: [
                    { status: 'APPROVED', actionTakenByUserRole: 'STATE' },
                    { isCompleted: false, actionTakenByUserRole: 'MoHUA' },
                ],
            },
            4: { status: 'REJECTED', actionTakenByUserRole: 'STATE' },
            5: { status: 'REJECTED', actionTakenByUserRole: 'MoHUA' },
            6: { status: 'APPROVED', actionTakenByUserRole: 'MoHUA' },
        };

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
        let design_year = req.query?.design_year;
        let status = 'PENDING';
        // if(user.role=='ULB'){
        //     status = 'REJECTED'
        // }
        let priority = false;
        let cond = { priority: 0 };
        if (user.role == 'STATE') {
            priority = true;
            cond['priority'] = {
                $cond: [
                    {
                        $and: [
                            { $eq: ['$actionTakenByUserRole', 'ULB'] },
                            { $eq: ['$isCompleted', true] },
                        ],
                    },
                    1,
                    0,
                ],
            };
            cond['priority_1'] = {
                $cond: [
                    {
                        $and: [
                            { $eq: ['$actionTakenByUserRole', 'STATE'] },
                            { $eq: ['$isCompleted', false] },
                        ],
                    },
                    1,
                    0,
                ],
            };
        }
        if (user.role == 'MoHUA') {
            priority = true;
            cond['priority'] = {
                $cond: [
                    {
                        $and: [
                            { $eq: ['$actionTakenByUserRole', 'STATE'] },
                            { $eq: ['$status', 'APPROVED'] },
                        ],
                    },
                    1,
                    0,
                ],
            };

            cond['priority_1'] = {
                $cond: [
                    {
                        $and: [
                            { $eq: ['$actionTakenByUserRole', 'MoHUA'] },
                            { $eq: ['$isCompleted', false] },
                        ],
                    },
                    1,
                    0,
                ],
            };
        }

        if (actionAllowed.indexOf(user.role) > -1) {
            let match = {
                $match: { overallReport: null, isActive: true },
            };


            if (design_year) {

                match = {
                    $match: { overallReport: null, isActive: true, design_year: ObjectId(design_year) },
                };
            }
            let q = [

                match,

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
                { $unwind: '$actionTakenBy' },
                {
                    $project: {
                        _id: 1,
                        audited: 1,
                        priority: 1,
                        priority_1: 1,
                        // auditStatus: {
                        //     $cond: {
                        //         if: '$audited',
                        //         then: 'Audited',
                        //         else: 'Unaudited'
                        //     }
                        // },

                        baeline_waterSuppliedPerDay_2020_21: "$waterManagement.waterSuppliedPerDay.baseline.2021",
                        baseline_reduction_2020_21: "$waterManagement.reduction.baseline.2021",
                        baeline_houseHoldCoveredWithSewerage_2020_21: "$waterManagement.houseHoldCoveredWithSewerage.baseline.2021",
                        baeline_houseHoldCoveredPipedSupply_2020_21: "$waterManagement.houseHoldCoveredPipedSupply.baseline.2021",

                        target_waterSuppliedPerDay_2021_22: "$waterManagement.waterSuppliedPerDay.target.2122",
                        target_reduction_2021_22: "$waterManagement.reduction.target.2122",
                        target_houseHoldCoveredWithSewerage_2021_22: "$waterManagement.houseHoldCoveredWithSewerage.target.2122",
                        target_houseHoldCoveredPipedSupply_2021_22: "$waterManagement.houseHoldCoveredPipedSupply.target.2122",

                        target_waterSuppliedPerDay_2022_23: "$waterManagement.waterSuppliedPerDay.target.2223",
                        target_reduction_2022_23: "$waterManagement.reduction.target.2223",
                        target_houseHoldCoveredWithSewerage_2022_23: "$waterManagement.houseHoldCoveredWithSewerage.target.2223",
                        target_houseHoldCoveredPipedSupply_2022_23: "$waterManagement.houseHoldCoveredPipedSupply.target.2223",

                        target_waterSuppliedPerDay_2023_24: "$waterManagement.waterSuppliedPerDay.target.2324",
                        target_reduction_2023_24: "$waterManagement.reduction.target.2324",
                        target_houseHoldCoveredWithSewerage_2023_24: "$waterManagement.houseHoldCoveredWithSewerage.target.2324",
                        target_houseHoldCoveredPipedSupply_2023_24: "$waterManagement.houseHoldCoveredPipedSupply.target.2324",

                        target_waterSuppliedPerDay_2024_25: "$waterManagement.waterSuppliedPerDay.target.2425",
                        target_reduction_2024_25: "$waterManagement.reduction.target.2425",
                        target_houseHoldCoveredWithSewerage_2024_25: "$waterManagement.houseHoldCoveredWithSewerage.target.2425",
                        target_houseHoldCoveredPipedSupply_2024_25: "$waterManagement.houseHoldCoveredPipedSupply.target.2425",

                        garbageFreeCities: "$solidWasteManagement.documents.garbageFreeCities",
                        waterSupplyCoverage: "$solidWasteManagement.documents.waterSupplyCoverage",

                        cityPlan: "$millionPlusCities.documents.cityPlan",
                        waterBalancePlan: "$millionPlusCities.documents.waterBalancePlan",
                        serviceLevelPlan: "$millionPlusCities.documents.serviceLevelPlan",
                        solidWastePlan: "$millionPlusCities.documents.solidWastePlan",

                        waterManagement: 1,
                        solidWasteManagement: 1,
                        millionPlusCities: 1,
                        completeness: 1,
                        correctness: 1,
                        status: 1,
                        //financialYear: 1,
                        ulbType: '$ulbType.name',
                        ulb: '$ulb._id',
                        ulbName: '$ulb.name',
                        ulbCode: '$ulb.code',
                        sbCode: '$ulb.sbCode',
                        censusCode: '$ulb.censusCode',
                        isMillionPlus: '$ulb.isMillionPlus',
                        populationType: {
                            $cond: {
                                if: { $eq: ['$ulb.isMillionPlus', 'Yes'] },
                                then: 'Million Plus',
                                else: 'Non Million',
                            },
                        },
                        state: '$state._id',
                        stateName: '$state.name',
                        stateCode: '$state.code',
                        actionTakenByUserName: '$actionTakenBy.name',
                        actionTakenByUserRole: '$actionTakenBy.role',
                        isCompleted: 1,
                        isActive: '$isActive',
                        createdAt: '$createdAt',
                        modifiedAt: '$modifiedAt',
                    },
                },
                {
                    $addFields: cond,
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
            if (newFilter['status']) {
                Object.assign(newFilter, statusFilter[newFilter['status']]);
                if (newFilter['status'] == '2' || newFilter['status'] == '3') { delete newFilter['status']; }
            }
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }
            if (sort && Object.keys(sort).length) {
                q.push({ $sort: sort });
            } else {
                if (priority) {
                    sort = {
                        $sort: { priority: -1, priority_1: -1, modifiedAt: -1 },
                    };
                } else {
                    sort = { $sort: { createdAt: -1 } };
                }
                q.push(sort);
            }
            if (csv) {
                let arr = await XVFCGrantULBData.aggregate(q).exec();
                for (d of arr) {
                    if (
                        d.status == 'PENDING' &&
                        d.isCompleted == false &&
                        d.actionTakenByUserRole == 'ULB'
                    ) {
                        d.status = 'Saved as Draft';
                    }
                    if (
                        d.status == 'PENDING' &&
                        d.isCompleted == true &&
                        d.actionTakenByUserRole == 'ULB'
                    ) {
                        d.status = 'Under Review by State';
                    }
                    if (
                        d.status == 'PENDING' &&
                        d.isCompleted == false &&
                        d.actionTakenByUserRole == 'STATE'
                    ) {
                        d.status = 'Under Review by State';
                    }
                    if (
                        d.status == 'APPROVED' &&
                        d.actionTakenByUserRole == 'STATE'
                    ) {
                        d.status = 'Under Review by MoHUA';
                    }
                    if (
                        d.status == 'PENDING' &&
                        d.actionTakenByUserRole == 'STATE' &&
                        d.isCompleted == false
                    ) {
                        d.status = 'Under Review by MoHUA';
                    }
                    if (
                        d.status == 'REJECTED' &&
                        d.actionTakenByUserRole == 'STATE'
                    ) {
                        d.status = 'Rejected by STATE';
                    }
                    if (
                        d.status == 'REJECTED' &&
                        d.actionTakenByUserRole == 'MoHUA'
                    ) {
                        d.status = 'Rejected by MoHUA';
                    }
                    if (
                        d.status == 'APPROVED' &&
                        d.actionTakenByUserRole == 'MoHUA'
                    ) {
                        d.status = 'Approval Completed';
                    }

                    (
                        d.garbageFreeCities = d.garbageFreeCities && d.garbageFreeCities.length > 0 ? d.garbageFreeCities[0]["url"] : '',
                        d.waterSupplyCoverage = d.waterSupplyCoverage && d.waterSupplyCoverage.length > 0 ? d.waterSupplyCoverage[0]["url"] : '',
                        d.cityPlan = d.cityPlan && d.cityPlan.length > 0 ? d.cityPlan[0]["url"] : '',
                        d.waterBalancePlan = d.waterBalancePlan && d.waterBalancePlan.length > 0 ? d.waterBalancePlan[0]["url"] : '',
                        d.serviceLevelPlan = d.serviceLevelPlan && d.serviceLevelPlan.length > 0 ? d.serviceLevelPlan[0]["url"] : '',
                        d.solidWastePlan = d.solidWastePlan && d.solidWastePlan.length > 0 ? d.solidWastePlan[0]["url"] : ''
                    )
                }
                let field = csvData();
                if (user.role == 'STATE') {
                    delete field.stateName;
                }
                let xlsData = await Service.dataFormating(arr, field);
                let filename =
                    '15th-FC-Form' +
                    moment().format('DD-MMM-YY HH:MM:SS') +
                    '.xlsx';
                return res.xls(filename, xlsData);
            } else {
                try {
                    if (!skip) {
                        let qrr = [...q, { $count: 'count' }];
                        let d = await XVFCGrantULBData.aggregate(qrr);
                        total = d.length ? d[0].count : 0;
                    }
                    q.push({ $skip: skip });
                    q.push({ $limit: limit });

                    let arr = await XVFCGrantULBData.aggregate(q).exec();
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
                    : { modifiedAt: 1 },
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
                                        isCompleted: '$isCompleted',
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
                        isCompleted: '$history.isCompleted',
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
                        modifiedAt: '$history.modifiedAt',
                    },
                },
                {
                    $match: {
                        $or: [
                            {
                                actionTakenByUserRole: {
                                    $nin: ['STATE', 'MoHUA'],
                                },
                            },
                            { isCompleted: { $ne: false } },
                        ],
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
                let arr = await XVFCGrantULBData.aggregate(q).exec();
                return res.xls('financial-data-history.xlsx', arr);
            } else {
                q.push({ $skip: skip });
                q.push({ $limit: limit });
                if (!skip) {
                    let qrr = [...q, { $count: 'count' }];
                    let d = await XVFCGrantULBData.aggregate(qrr);
                    total = d.length ? d[0].count : 0;
                }
                let arr = await XVFCGrantULBData.aggregate(q).exec();
                if (arr.length > 0 && arr[0]["isCompleted"] == false && arr[0]["actionTakenByUserRole"] == 'ULB') {
                    arr.push(arr.shift());
                }
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
        let CASE = null;
        let query = { _id: ObjectId(req.params._id) };
        let data = await XVFCGrantULBData.aggregate([
            {
                $match: query,
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
                    from: 'users',
                    localField: 'actionTakenBy',
                    foreignField: '_id',
                    as: 'actionTakenBy',
                },
            },
            { $unwind: '$ulb' },
            {
                $unwind: {
                    path: '$actionTakenBy',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    waterManagement: 1,
                    solidWasteManagement: 1,
                    millionPlusCities: 1,
                    isCompleted: 1,
                    status: 1,
                    ulb: '$ulb._id',
                    ulbName: '$ulb.name',
                    ulbCode: '$ulb.code',
                    actionTakenByUserName: '$actionTakenBy.name',
                    actionTakenByUserRole: '$actionTakenBy.role',
                    isActive: '$isActive',
                    createdAt: '$createdAt',
                },
            },
        ]).exec();

        if (user.role == 'ADMIN' ||
            user.role == 'PARTNER' ||
            user.role == 'ULB' ||
            user.role == 'MoHUA') {
            if (
                data[0].isCompleted == false &&
                data[0].actionTakenByUserRole == 'STATE'
            ) {
                CASE = 'STATE';
                var ULBdata = await draftQuery(query, 'PENDING', 'ULB');
            }
        }

        if (user.role == 'PARTNER' ||
            user.role == 'ULB' ||
            user.role == 'STATE' ||
            user.role == 'ADMIN') {
            if (
                data[0].isCompleted == false &&
                data[0].actionTakenByUserRole == 'MoHUA'
            ) {
                CASE = 'MOHUA';
                var StateData = await draftQuery(query, 'APPROVED', 'STATE');
            }
        }
        // Match from history
        let rejectedDataFromHistory = await XVFCGrantULBData.aggregate([
            {
                $match: query,
            },
            { $unwind: '$history' },
            { $match: { 'history.status': 'REJECTED' } },
        ]).exec();

        // match from data

        //if(rejectedDataFromHistory.length == 0){
        var rejectedData = await XVFCGrantULBData.aggregate([
            {
                $match: query,
            },
            { $match: { status: 'REJECTED' } },
        ]).exec();
        //}

        let firstSubmitedFromHistory = await XVFCGrantULBData.aggregate([
            {
                $match: query,
            },
            { $unwind: '$history' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'history.actionTakenBy',
                    foreignField: '_id',
                    as: 'actionTakenBy',
                },
            },
            {
                $unwind: {
                    path: '$actionTakenBy',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $match: {
                    'actionTakenBy.role': 'ULB',
                    'history.isCompleted': true,
                },
            },
        ]).exec();

        let firstSubmited = await XVFCGrantULBData.aggregate([
            {
                $match: query,
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'actionTakenBy',
                    foreignField: '_id',
                    as: 'actionTakenBy',
                },
            },
            {
                $unwind: {
                    path: '$actionTakenBy',
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $match: { 'actionTakenBy.role': 'ULB', isCompleted: true } },
        ]).exec();

        let firstSubmitedAt =
            firstSubmitedFromHistory.length > 0
                ? firstSubmitedFromHistory[0].history.createdAt
                : firstSubmited.length > 0
                    ? firstSubmited[firstSubmited.length - 1].createdAt
                    : null;
        let rejectedAt =
            rejectedData.length > 0
                ? rejectedData[rejectedData.length - 1].modifiedAt
                : rejectedDataFromHistory.length > 0
                    ? rejectedDataFromHistory[rejectedDataFromHistory.length - 1]
                        .history.modifiedAt
                    : null;
        let history = { histroy: '' };
        let finalData = Object.assign(data[0], {
            rejectedAt: rejectedAt,
            firstSubmitedAt: firstSubmitedAt,
        });

        if (CASE == 'STATE') {
            finalData = Object.assign(ULBdata, {
                rejectedAt: rejectedAt,
                firstSubmitedAt: firstSubmitedAt,
            });
        }
        if (CASE == 'MOHUA') {
            finalData = Object.assign(StateData, {
                rejectedAt: rejectedAt,
                firstSubmitedAt: firstSubmitedAt,
            });
        }

        if (user.role == 'MoHUA') {
            if (
                data[0]['actionTakenByUserRole'] == 'STATE' &&
                data[0]['status'] == 'APPROVED'
            ) {
                let historyData = await commonQuery(query);
                if (historyData.length > 0) {
                    history['histroy'] = resetDataStatus(
                        historyData[historyData.length - 1],
                        false
                    );
                    let rejectReasonKeys = await getRejectedStatusKey(
                        history['histroy'].data
                    );
                    let newData = await getRejectedStatusKey(
                        data[0],
                        rejectReasonKeys
                    );
                    newData = Object.assign(data[0], {
                        rejectedAt: rejectedAt,
                        firstSubmitedAt: firstSubmitedAt,
                    });

                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: 'Ulb update request list',
                        data: newData,
                    });
                } else {
                    let newData = resetDataStatus(data[0]);
                    let finalData = Object.assign(newData, {
                        rejectedAt: rejectedAt,
                        firstSubmitedAt: firstSubmitedAt,
                    });
                    return res.status(200).json({
                        timestamp: moment().unix(),
                        success: true,
                        message: 'Ulb update request list',
                        data: finalData,
                    });
                }
            }
        }

        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: 'Ulb update request list',
            data: finalData,
        });
    } else {
        return Response.BadRequest(res, {}, 'Action not allowed.');
    }
};

async function draftQuery(query, status, role) {
    let data = await XVFCGrantULBData.aggregate([
        {
            $match: query,
        },
        {
            $lookup: {
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulb',
            },
        },
        { $unwind: '$history' },
        {
            $lookup: {
                from: 'users',
                localField: 'history.actionTakenBy',
                foreignField: '_id',
                as: 'actionTakenBy',
            },
        },
        {
            $unwind: {
                path: '$actionTakenBy',
                preserveNullAndEmptyArrays: true,
            },
        },
        { $unwind: '$ulb' },
        { $match: { 'history.status': status, 'actionTakenBy.role': role } },
        {
            $project: {
                _id: 1,
                waterManagement: '$history.waterManagement',
                solidWasteManagement: '$history.solidWasteManagement',
                millionPlusCities: '$history.millionPlusCities',
                isCompleted: '$history.isCompleted',
                status: '$history.status',
                ulb: '$ulb._id',
                ulbName: '$ulb.name',
                ulbCode: '$ulb.code',
                actionTakenByUserName: '$actionTakenBy.name',
                actionTakenByUserRole: '$actionTakenBy.role',
                isActive: '$isActive',
                createdAt: '$createdAt',
            },
        },
    ]).exec();
    return data.length > 0 ? data[data.length - 1] : data[0];
}

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

            let prevState = await XVFCGrantULBData.findOne(
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

                let du = await XVFCGrantULBData.update(
                    { _id: prevState._id },
                    { $set: prevState, $push: { history: history } }
                );
                let ulbFinancialDataobj = await XVFCGrantULBData.findOne({
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
module.exports.action = async (req, res) => {
    try {
        let user = req.decoded;
        (data = req.body), (_id = ObjectId(req.params._id));
        let design_year = await Year.findOne({ _id: ObjectId(data.design_year) })
        if (design_year.year === '2021-22') {
            delete data.waterManagement.houseHoldCoveredPipedSupply['status'];
            delete data.waterManagement.houseHoldCoveredPipedSupply['rejectReason'];
            delete data.waterManagement.waterSuppliedPerDay['status'];
            delete data.waterManagement.waterSuppliedPerDay['rejectReason'];
            delete data.waterManagement.reduction['status'];
            delete data.waterManagement.reduction['rejectReason'];
            delete data.waterManagement.houseHoldCoveredWithSewerage['status'];
            delete data.waterManagement.houseHoldCoveredWithSewerage['rejectReason'];
        } else {
            delete data.waterManagement['status'];
            delete data.waterManagement['rejectReason'];
        }


        let prevState = await XVFCGrantULBData.findOne(
            { _id: _id },
            '-history'
        ).lean();
        let prevUser = await User.findOne({
            _id: ObjectId(prevState.actionTakenBy),
        }).exec();

        if (prevState.status == 'APPROVED' && prevUser.role == 'MoHUA') {
            return Response.BadRequest(
                res,
                {},
                'Already approved By MoHUA User.'
            );
        }
        if (prevState.status == 'REJECTED' && prevUser.role == 'MoHUA') {
            return Response.BadRequest(
                res,
                {},
                'Already Rejected By MoHUA User.'
            );
        }
        if (
            prevState.status == 'APPROVED' &&
            user.role == 'STATE' &&
            prevUser.role == 'STATE'
        ) {
            return Response.BadRequest(
                res,
                {},
                'Already approved By STATE User.'
            );
        }
        if (
            prevState.status == 'REJECTED' &&
            user.role == 'STATE' &&
            prevUser.role == 'STATE'
        ) {
            return Response.BadRequest(
                res,
                {},
                'Already Rejected By State User.'
            );
        }
        let flag = overAllStatus(data);

        flag.then(
            async (value) => {
                data['status'] = value.status ? 'REJECTED' : 'APPROVED';
                if (!data['isCompleted']) {
                    data['status'] = 'PENDING';
                }
                let actionAllowed = ['MoHUA', 'STATE'];
                if (actionAllowed.indexOf(user.role) > -1) {
                    if (user.role == 'STATE') {
                        let ulb = await Ulb.findOne({
                            _id: ObjectId(data.ulb),
                        }).exec();

                        if (
                            !(
                                ulb &&
                                ulb.state &&
                                ulb.state.toString() == user.state
                            )
                        ) {
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
                    data['actionTakenBy'] = user._id;
                    data['ulb'] = prevState.ulb;
                    data['modifiedAt'] = time();
                    let du = await XVFCGrantULBData.update(
                        { _id: ObjectId(prevState._id) },
                        { $set: data, $push: { history: history } }
                    );
                    let ulbFinancialDataobj = await XVFCGrantULBData.findOne({
                        _id: ObjectId(prevState._id),
                    }).exec();
                    let ulbUser = await User.findOne({
                        ulb: ObjectId(ulbFinancialDataobj.ulb),
                        isDeleted: false,
                        role: 'ULB',
                    })
                        .populate([
                            {
                                path: 'state',
                                model: State,
                                select: '_id name',
                            },
                        ])
                        .exec();


                    if (data['status'] == 'APPROVED' && user.role == 'MoHUA') {
                        let mailOptions = {
                            to: '',
                            subject: '',
                            html: '',
                        };
                        /** ULB TRIGGER */
                        let ulbEmails = [];
                        let UlbTemplate = await Service.emailTemplate.xvUploadApprovalMoHUA(
                            ulbUser.name
                        );
                        ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                        ulbUser.accountantEmail
                            ? ulbEmails.push(ulbUser.accountantEmail)
                            : '';
                        (mailOptions.to = ulbEmails.join()),
                            (mailOptions.subject = UlbTemplate.subject),
                            (mailOptions.html = UlbTemplate.body);
                        Service.sendEmail(mailOptions);
                        /** STATE TRIGGER */
                        let stateEmails = [];
                        let stateUser = await User.find({
                            state: ObjectId(ulbUser.state._id),
                            isDeleted: false,
                            role: 'STATE',
                        }).exec();
                        for (let d of stateUser) {
                            sleep(700);
                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail
                                ? stateEmails.push(d.departmentEmail)
                                : '';
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
                    if (data['status'] == 'APPROVED' && user.role == 'STATE') {
                        let mailOptions = {
                            to: '',
                            subject: '',
                            html: '',
                        };

                        let UlbTemplate = await Service.emailTemplate.xvUploadApprovalByStateToUlb(
                            ulbUser.name
                        );
                        (mailOptions.to = ulbUser.email),
                            (mailOptions.subject = UlbTemplate.subject),
                            (mailOptions.html = UlbTemplate.body);
                        Service.sendEmail(mailOptions);
                        /** STATE TRIGGER */
                        let MohuaUser = await User.find({
                            isDeleted: false,
                            role: 'MoHUA',
                        }).exec();
                        for (let d of MohuaUser) {
                            sleep(700);
                            let MohuaTemplate = await Service.emailTemplate.xvUploadApprovalState(
                                d.name,
                                ulbUser.name,
                                ulbUser.state.name
                            );
                            (mailOptions.to = d.email),
                                (mailOptions.subject = MohuaTemplate.subject),
                                (mailOptions.html = MohuaTemplate.body);
                            Service.sendEmail(mailOptions);
                        }

                        /** STATE TRIGGER */
                        let stateEmails = [];
                        let stateUser = await User.find({
                            state: ObjectId(ulbUser.state._id),
                            isDeleted: false,
                            role: 'STATE',
                        }).exec();
                        for (let d of stateUser) {
                            sleep(700);
                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail
                                ? stateEmails.push(d.departmentEmail)
                                : '';
                            let stateTemplate = await Service.emailTemplate.xvUploadApprovalForState(
                                ulbUser.name,
                                d.name
                            );
                            mailOptions.to = stateEmails.join();
                            mailOptions.subject = stateTemplate.subject;
                            mailOptions.html = stateTemplate.body;
                            Service.sendEmail(mailOptions);
                        }

                        let historyData = await commonQuery({ _id: _id });
                        if (historyData.length > 0) {
                            let du = await XVFCGrantULBData.update(
                                { _id: ObjectId(prevState._id) },
                                { $set: data }
                            );
                        } else {
                            let newData = resetDataStatus(data);
                            let du = await XVFCGrantULBData.update(
                                { _id: ObjectId(prevState._id) },
                                { $set: newData }
                            );
                        }
                    }
                    if (data['status'] == 'REJECTED' && user.role == 'MoHUA') {
                        let mailOptions = {
                            to: '',
                            subject: '',
                            html: '',
                        };
                        /** ULB TRIGGER */
                        let ulbEmails = [];
                        let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                            ulbUser.name,
                            value.reason,
                            'MoHUA'
                        );
                        ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                        ulbUser.accountantEmail
                            ? ulbEmails.push(ulbUser.accountantEmail)
                            : '';
                        (mailOptions.to = ulbEmails.join()),
                            (mailOptions.subject = UlbTemplate.subject),
                            (mailOptions.html = UlbTemplate.body);
                        Service.sendEmail(mailOptions);

                        /** STATE TRIGGER */
                        let stateEmails = [];
                        let stateUser = await User.find({
                            state: ObjectId(ulbUser.state._id),
                            isDeleted: false,
                            role: 'STATE',
                        }).exec();
                        for (let d of stateUser) {
                            sleep(700);
                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail
                                ? stateEmails.push(d.departmentEmail)
                                : '';
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
                    if (data['status'] == 'REJECTED' && user.role == 'STATE') {
                        let mailOptions = {
                            to: '',
                            subject: '',
                            html: '',
                        };
                        /** ULB TRIGGER */
                        let ulbEmails = [];
                        let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                            ulbUser.name,
                            value.reason,
                            'STATE'
                        );
                        ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
                        ulbUser.accountantEmail
                            ? ulbEmails.push(ulbUser.accountantEmail)
                            : '';
                        (mailOptions.to = ulbEmails.join()),
                            (mailOptions.subject = UlbTemplate.subject),
                            (mailOptions.html = UlbTemplate.body);
                        Service.sendEmail(mailOptions);

                        /** STATE TRIGGER */
                        let stateEmails = [];
                        let stateUser = await User.find({
                            state: ObjectId(ulbUser.state._id),
                            isDeleted: false,
                            role: 'STATE',
                        }).exec();
                        for (let d of stateUser) {
                            sleep(700);
                            d.email ? stateEmails.push(d.email) : '';
                            d.departmentEmail
                                ? stateEmails.push(d.departmentEmail)
                                : '';
                            let stateTemplate = await Service.emailTemplate.xvUploadRejectByStateTrigger(
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
                    return Response.OK(res, ulbFinancialDataobj, ``);
                } else {
                    return Response.BadRequest(
                        res,
                        {},
                        `This action is only allowed by ${actionAllowed.join()}`
                    );
                }
            },
            (rejectError) => {
                return Response.BadRequest(res, {}, rejectError);
            }
        ).catch((caughtError) => {
            console.log('final caughtError', caughtError);
        });
    } catch (e) {
        console.log('Exception', e);
        res.json({
            message: e.message
        })
    }
};

module.exports.multipleApprove = async (req, res) => {
    let user = req.decoded;
    if (user.role == 'MoHUA') {
        _id = ObjectId(req.params._id);
        let prevState = await XVFCGrantULBData.findOne(
            { _id: _id },
            '-history'
        ).lean();

        let prevUser = await User.findOne({
            _id: ObjectId(prevState.actionTakenBy),
        }).exec();

        let ulbUser = await User.findOne({
            ulb: ObjectId(prevState.ulb),
            isDeleted: false,
            role: 'ULB',
        })
            .populate([
                {
                    path: 'state',
                    model: State,
                    select: '_id name',
                },
            ])
            .exec();
        let history = Object.assign({}, prevState);
        if (
            prevState.status == 'APPROVED' &&
            prevUser.role == 'MoHUA' &&
            prevState.isCompleted
        ) {
            return Response.BadRequest(
                res,
                {},
                'Already approved By MoHUA User.'
            );
        }
        let data = setFormStatus(prevState, { status: 'APPROVED' });
        data['actionTakenBy'] = user._id;
        data['status'] = 'APPROVED';
        data['modifiedAt'] = time();

        // return res.send({ prevState, prevUser, user });

        if (
            ((prevState['status'] == 'APPROVED' && prevUser.role === 'STATE') ||
                (!prevState.isCompleted && prevUser.role === 'MoHUA')) &&
            user.role == 'MoHUA'
        ) {
            let du = await XVFCGrantULBData.update(
                { _id: ObjectId(prevState._id) },
                { $set: data, $push: { history: history } }
            );
            let mailOptions = {
                to: '',
                subject: '',
                html: '',
            };
            /** ULB TRIGGER */
            let ulbEmails = [];
            let UlbTemplate = await Service.emailTemplate.xvUploadApprovalMoHUA(
                ulbUser.name
            );
            ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
            ulbUser.accountantEmail
                ? ulbEmails.push(ulbUser.accountantEmail)
                : '';
            (mailOptions.to = ulbEmails.join()),
                (mailOptions.subject = UlbTemplate.subject),
                (mailOptions.html = UlbTemplate.body);
            Service.sendEmail(mailOptions);
            /** STATE TRIGGER */
            let stateEmails = [];
            let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: 'STATE',
            }).exec();
            for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : '';
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : '';
                let stateTemplate = await Service.emailTemplate.xvUploadApprovalByMoHUAtoState(
                    ulbUser.name,
                    d.name
                );
                mailOptions.to = stateEmails.join();
                mailOptions.subject = stateTemplate.subject;
                mailOptions.html = stateTemplate.body;
                Service.sendEmail(mailOptions);
            }
            return Response.OK(res, {}, ``);
        } else {
            return Response.BadRequest(res, {}, 'Something went wrong!');
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by MoHUA'
        );
    }
};

module.exports.multipleReject = async (req, res) => {
    let user = req.decoded;
    if (user.role == 'MoHUA') {
        _id = ObjectId(req.params._id);
        let prevState = await XVFCGrantULBData.findOne(
            { _id: _id },
            '-history'
        ).lean();

        let prevUser = await User.findOne({
            _id: ObjectId(prevState.actionTakenBy),
        }).exec();

        let ulbUser = await User.findOne({
            ulb: ObjectId(prevState.ulb),
            isDeleted: false,
            role: 'ULB',
        })
            .populate([
                {
                    path: 'state',
                    model: State,
                    select: '_id name',
                },
            ])
            .exec();
        let history = Object.assign({}, prevState);
        if (prevState.status == 'APPROVED' && prevUser.role == 'MoHUA') {
            return Response.BadRequest(
                res,
                {},
                'Already approved By MoHUA User.'
            );
        }
        if (prevState.status == 'REJECTED' && prevUser.role == 'MoHUA') {
            return Response.BadRequest(
                res,
                {},
                'Already REJECTED By MoHUA User.'
            );
        }
        let data = setFormStatus(prevState, {
            status: 'REJECTED',
            rejectReason: req.body.rejectReason,
        });
        data['actionTakenBy'] = user._id;
        data['status'] = 'REJECTED';
        data['modifiedAt'] = time();

        if (
            (!prevState.isCompleted && prevUser.role === 'MoHUA') ||
            (prevState.isCompleted && prevUser.role === 'STATE')
        ) {
            let du = await XVFCGrantULBData.update(
                { _id: ObjectId(prevState._id) },
                { $set: data, $push: { history: history } }
            );
            let mailOptions = {
                to: '',
                subject: '',
                html: '',
            };
            /** ULB TRIGGER */
            let ulbEmails = [];
            let UlbTemplate = await Service.emailTemplate.xvUploadMultiRejectUlb(
                ulbUser.name,
                `<b>Reason for Rejection:</b> ${req.body.rejectReason}`,
                'MoHUA'
            );
            ulbUser.email ? ulbEmails.push(ulbUser.email) : '';
            ulbUser.accountantEmail
                ? ulbEmails.push(ulbUser.accountantEmail)
                : '';
            (mailOptions.to = ulbEmails.join()),
                (mailOptions.subject = UlbTemplate.subject),
                (mailOptions.html = UlbTemplate.body);
            console.log(mailOptions);
            Service.sendEmail(mailOptions);
            /** STATE TRIGGER */
            let stateEmails = [];
            let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: 'STATE',
            }).exec();
            for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : '';
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : '';
                let stateTemplate = await Service.emailTemplate.xvUploadMultiRejectState(
                    ulbUser.name,
                    d.name,
                    `<b>Reason for Rejection:</b> ${req.body.rejectReason}`
                );
                mailOptions.to = stateEmails.join();
                mailOptions.subject = stateTemplate.subject;
                mailOptions.html = stateTemplate.body;
                Service.sendEmail(mailOptions);
            }
            return Response.OK(res, {}, ``);
        } else {
            return Response.BadRequest(res, {}, 'Something went wrong!');
        }
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by MoHUA'
        );
    }
};

/**
 *
 * @param {{status: 'APPROVED'} | {status: 'REJECTED' , rejectReason: string}} option
 */
function setFormStatus(data, option) {
    const newData = { ...data };
    for (key in newData) {
        if (typeof newData[key] === 'object' && newData[key] !== null) {
            if (key == 'waterManagement') {
                for (let objKey of waterManagementKeys) {
                    if (newData[key][objKey]) {
                        newData[key][objKey]['status'] = option.status;
                        newData[key][objKey]['rejectReason'] =
                            option.rejectReason || '';
                    }
                }
            }
            if (key == 'solidWasteManagement') {
                for (let objKey of solidWasteManagementKeys) {
                    if (newData[key]['documents'][objKey]) {
                        for (let d of newData[key]['documents'][objKey]) {
                            d.status = option.status;
                            d.rejectReason = option.rejectReason || '';
                        }
                    }
                }
            }
            if (key == 'millionPlusCities') {
                for (let objKey of millionPlusCitiesKeys) {
                    if (newData[key]['documents'][objKey]) {
                        for (let d of newData[key]['documents'][objKey]) {
                            d.status = option.status;
                            d.rejectReason = option.rejectReason || '';
                        }
                    }
                }
            }
        } else {
            newData['status'] = option.status;
        }
    }
    newData['status'] = option.status;
    newData.isCompleted = true;
    return newData;
}

async function commonQuery(query) {
    let historyData = await XVFCGrantULBData.aggregate([
        {
            $match: query,
        },
        {
            $unwind: {
                path: '$history',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'history.actionTakenBy',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: {
                path: '$user',
                preserveNullAndEmptyArrays: true,
            },
        },
        { $match: { 'user.role': 'MoHUA', 'history.status': 'REJECTED' } },
        {
            $project: {
                data: '$history',
            },
        },
    ]).exec();
    return historyData;
}
async function sleep(millis) {
    return new Promise((resolve) => setTimeout(resolve, millis));
}
/**
 * @param{data}  - type Object
 * @param{check} - type Boolean
 */
function resetDataStatus(data, check = false) {
    for (key in data) {
        if (typeof data[key] === 'object' && data[key] !== null) {
            if (key == 'waterManagement') {
                for (let objKey of waterManagementKeys) {
                    if (data[key][objKey]) {
                        if (check) {
                            if (data[key][objKey]['status'] == 'REJECTED') {
                                data[key][objKey]['status'] = '';
                                data[key][objKey]['rejectReason'] = '';
                            }
                        } else {
                            data[key][objKey]['status'] = '';
                            data[key][objKey]['rejectReason'] = '';
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
            if (key == 'solidWasteManagement') {
                for (let objKey of solidWasteManagementKeys) {
                    if (data[key]['documents'][objKey]) {
                        for (let d of data[key]['documents'][objKey]) {
                            if (check) {
                                if (d.status == 'REJECTED') {
                                    d.status = '';
                                    d.rejectReason = '';
                                }
                            } else {
                                d.status = '';
                                d.rejectReason = '';
                            }
                        }
                    }
                }
            }
            if (key == 'millionPlusCities') {
                for (let objKey of millionPlusCitiesKeys) {
                    if (data[key]['documents'][objKey]) {
                        for (let d of data[key]['documents'][objKey]) {
                            if (check) {
                                if (d.status == 'REJECTED') {
                                    d.status = '';
                                    d.rejectReason = '';
                                }
                            } else {
                                d.status = '';
                                d.rejectReason = '';
                            }
                        }
                    }
                }
            }
        } else {
            data['status'] = 'APPROVED';
        }
    }
    return data;
}

async function getRejectedStatusKey(data, keyArray = []) {
    let rejectReason = [];
    let keyFLag = keyArray && keyArray.length > 0 ? true : false;
    let status = keyFLag ? 'APPROVED' : 'REJECTED';
    for (key in data) {
        if (typeof data[key] === 'object' && data[key] !== null) {
            if (key == 'waterManagement') {
                for (let objKey of waterManagementKeys) {
                    if (
                        data[key][objKey] &&
                        data[key][objKey]['status'] == status
                    ) {
                        if (keyFLag && keyArray.includes(objKey)) {
                            data[key][objKey]['status'] = '';
                            data[key][objKey]['rejectReason'] = '';
                        } else {
                            rejectReason.push(objKey);
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
            if (key == 'solidWasteManagement') {
                for (let objKey of solidWasteManagementKeys) {
                    if (data[key]['documents'][objKey]) {
                        for (let d of data[key]['documents'][objKey]) {
                            if (d.status == status) {
                                if (keyFLag && keyArray.includes(objKey)) {
                                    d.status = '';
                                    d.rejectReason = '';
                                } else {
                                    rejectReason.push(objKey);
                                }
                            }
                        }
                    }
                }
            }
            if (key == 'millionPlusCities') {
                for (let objKey of millionPlusCitiesKeys) {
                    for (let d of data[key]['documents'][objKey]) {
                        if (d.status == status) {
                            if (keyFLag && keyArray.includes(objKey)) {
                                d.status = '';
                                d.rejectReason = '';
                            } else {
                                rejectReason.push(objKey);
                            }
                        }
                    }
                }
            }
        } else {
            if (data['status'] == 'REJECTED') {
                rejected = true;
            }
        }
    }
    /** Concat reject reason string */
    return keyFLag ? data : rejectReason;
}

/**
 *
 * @param {object} data
 */
function overAllStatus(data) {
    return new Promise((resolve, reject) => {
        let rejected = false;
        let rejectReason = [];
        let rejectDataSet = [];
        for (key in data) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                if (key == 'waterManagement') {
                    for (let objKey of waterManagementKeys) {
                        if (
                            data[key][objKey] &&
                            data[key][objKey]['status'] == 'REJECTED'
                        ) {
                            if (
                                !data[key][objKey]['rejectReason'] &&
                                data['isCompleted']
                            ) {
                                reject('reject reason is missing');
                            }
                            rejected = true;
                            let tab =
                                'Service Level Indicators:' +
                                mappingKeys[objKey];
                            let reason = {
                                [tab]: data[key][objKey]['rejectReason'],
                            };
                            rejectReason.push(reason);
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

                if (key == 'solidWasteManagement') {
                    for (let objKey of solidWasteManagementKeys) {
                        if (data[key]['documents'][objKey]) {
                            for (let d of data[key]['documents'][objKey]) {
                                if (d.status == 'REJECTED') {
                                    if (
                                        (!d.rejectReason ||
                                            d.rejectReason == '') &&
                                        data['isCompleted']
                                    ) {
                                        reject('reject reason is missing');
                                    }
                                    rejected = true;
                                    let tab =
                                        'Upload Plans:' + mappingKeys[objKey];
                                    let reason = {
                                        [tab]: d.rejectReason,
                                    };
                                    rejectReason.push(reason);
                                }
                            }
                        }
                    }
                }
                if (key == 'millionPlusCities') {
                    for (let objKey of millionPlusCitiesKeys) {
                        for (let d of data[key]['documents'][objKey]) {
                            if (d.status == 'REJECTED') {
                                if (
                                    (!d.rejectReason || d.rejectReason == '') &&
                                    data['isCompleted']
                                ) {
                                    reject('reject reason is missing');
                                }
                                rejected = true;
                                let tab =
                                    'Upload Plans(Million+ City):' +
                                    mappingKeys[objKey];
                                let reason = {
                                    [tab]: d.rejectReason,
                                };
                                rejectReason.push(reason);
                            }
                        }
                    }
                }
            } else {
                if (data['status'] == 'REJECTED') {
                    rejected = true;
                }
            }
        }
        /** Concat reject reason string */

        if (rejectReason.length > 0) {
            let finalString = rejectReason.map((obj) => {
                let service = Object.keys(obj)[0];
                let reason = obj[service];
                let s = service.split(':');
                let arr = [...s, reason];
                return arr;
                // service = `<strong>` + service + `</strong>`;
                //return `<p> ${service + ` :` + reason} </p>`;
            });
            let x = `<table border='1'>
            <tr>
                <th>Tab Name</th>
                <th>Field Name</th>
                <th>Reason for Rejection</th>
            </tr>
            `;
            for (i of finalString) {
                x += `<tr>`;
                for (t of i) {
                    x += `<td>${t}</td>`;
                }
                x += `</tr>`;
            }
            x += `</table>`;
            resolve({ status: rejected, reason: x });
        }
        resolve({ status: rejected, reason: '' });
    });
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
        let year = req.query.year
            ? req.query.year.length
                ? req.query.year
                : null
            : null;
        let ulb = req.query.ulb
            ? req.query.ulb.length
                ? req.query.ulb
                : null
            : null;
        let condition = {};
        year = year ? year.split(',') : null;
        ulb = ulb ? ulb.split(',') : null;
        year ? (condition['financialYear'] = { $in: year }) : null;
        ulb = ulb ? ulb.map((x) => ObjectId(x)) : null;
        ulb ? (condition['ulb'] = { $in: ulb }) : null;

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
            { $match: condition },
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
            'overallReport.excelUrl': 1,
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

module.exports.XVFCStateForm = async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (user.role == 'STATE') {
        data.modifiedAt = time();
        let query = {};
        data['state'] = ObjectId(user.state);
        query['state'] = data['state'];
        Service.put(query, data, XVStateForm, async function (response, value) {
            if (response) {
                return res.status(response ? 200 : 400).send(value);
            } else {
                return Response.DbError(res, err, 'Failed to create entry');
            }
        });
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed by STATE'
        );
    }
};

module.exports.getXVFCStateForm = async (req, res) => {
    let user = req.decoded;
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let csv = req.query.csv;
    let query = {};
    query['isActive'] = true;
    query['$or'] = [
        { grantTransferCertificate: { $ne: null } },
        { serviceLevelBenchmarks: { $ne: null } },
        { utilizationReport: { $ne: null } },
    ];
    if (user.role == 'STATE') {
        query['state'] = ObjectId(user.state);
    }
    let actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
    if (actionAllowed.indexOf(user.role) > -1) {
        if (csv) {
            let field = {
                state: 'State Name',
                grantTransferCertificate:
                    'Grant transfer certificate signed by Principal secretary/ secretary(UD)',
                utilizationReport:
                    'Utilization report signed by Principal secretary/ secretary (UD)',
                serviceLevelBenchmarks:
                    'Letter signed by Principal secretary/ secretary (UD) confirming submission of service level benchmarks by all ULBs',
            };
            let q = [
                {
                    $match: query,
                },
                {
                    $lookup: {
                        from: 'states',
                        localField: 'state',
                        foreignField: '_id',
                        as: 'state',
                    },
                },
                { $unwind: '$state' },
                {
                    $project: {
                        state: '$state.name',
                        grantTransferCertificate: {
                            $arrayElemAt: ['$grantTransferCertificate', 0],
                        },
                        serviceLevelBenchmarks: {
                            $arrayElemAt: ['$serviceLevelBenchmarks', 0],
                        },
                        utilizationReport: {
                            $arrayElemAt: ['$utilizationReport', 0],
                        },
                    },
                },
                {
                    $project: {
                        state: 1,
                        grantTransferCertificate: {
                            $cond: {
                                if: {
                                    $eq: ['$grantTransferCertificate', null],
                                },
                                then: 'N/A',
                                else: '$grantTransferCertificate.url',
                            },
                        },
                        utilizationReport: {
                            $cond: {
                                if: { $eq: ['$utilizationReport', null] },
                                then: 'N/A',
                                else: '$utilizationReport.url',
                            },
                        },
                        serviceLevelBenchmarks: {
                            $cond: {
                                if: { $eq: ['$serviceLevelBenchmarks', null] },
                                then: 'N/A',
                                else: '$serviceLevelBenchmarks.url',
                            },
                        },
                    },
                },
            ];
            let arr = await XVStateForm.aggregate(q).exec();
            let xlsData = await Service.dataFormating(arr, field);
            let filename =
                'state-form' + moment().format('DD-MMM-YY HH:MM:SS') + '.xlsx';
            return res.xls(filename, xlsData);
        }

        let total = await XVStateForm.count(query).exec();
        let data = await XVStateForm.find(query)
            .populate([{ path: 'state', select: 'name' }])
            .skip(skip)
            .limit(limit)
            .exec();
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: 'list',
            data: data,
            total: total,
        });
    } else {
        return Response.BadRequest(res, {}, 'This action is only allowed');
    }
};

module.exports.getXVFCStateFormById = async (req, res) => {
    let user = req.decoded;
    actionAllowed = ['STATE', 'ADMIN', 'MoHUA', 'PARTNER'];
    if (actionAllowed.indexOf(user.role) > -1) {
        let query = {};
        query['state'] = req.params.state
            ? ObjectId(req.params.state)
            : ObjectId(user.state);
        let data = await XVStateForm.findOne(query)
            .populate([{ path: 'state', select: 'name' }])
            .exec();
        return Response.OK(res, data, 'Request fetched.');
    } else {
        return Response.BadRequest(
            res,
            {},
            'This action is only allowed for STATE User'
        );
    }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.state = async (req, res) => {
    console.dir(req.query);
    let q = [
        { $match: { isActive: true } },
        {
            $lookup: {
                from: 'users',
                localField: 'actionTakenBy',
                foreignField: '_id',
                as: 'actionTakenBy',
            },
        },
        {
            $lookup: {
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulb',
            },
        },
        { $unwind: '$ulb' },
        {
            $lookup: {
                from: 'states',
                localField: 'ulb.state',
                foreignField: '_id',
                as: 'state',
            },
        },
        { $unwind: '$state' },
        { $unwind: '$actionTakenBy' },
    ];
    if (req.query.formStatus === 'draft-by-MoHUA') {
        q.push({
            $match: { status: 'PENDING', 'actionTakenBy.role': 'MoHUA' },
        });
    } else if (req.query.formStatus === 'under-review-by-MoHUA') {
        q.push({
            $match: { status: 'APPROVED', 'actionTakenBy.role': 'STATE' },
        });
    } else {
        q.push({
            $match: {
                $or: [
                    { status: 'APPROVED', 'actionTakenBy.role': 'STATE' },
                    { status: 'PENDING', 'actionTakenBy.role': 'MoHUA' },
                ],
            },
        });
    }

    q.push({ $group: { _id: { name: '$state.name', _id: '$state._id' } } });
    q.push({
        $project: {
            name: '$_id.name',
            _id: '$_id._id',
        },
    });

    // return res.send({q})
    let arr = await XVFCGrantULBData.aggregate(q).exec();
    return res.status(200).json({
        timestamp: moment().unix(),
        success: true,
        message: 'list',
        data: arr,
    });
};
