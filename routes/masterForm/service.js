const catchAsync = require('../../util/catchAsync')
const MasterFormData = require('../../models/MasterForm')
const ObjectId = require('mongoose').Types.ObjectId;
const Service = require('../../service')
const moment = require('moment');
module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded

    let { design_year, masterform_id } = req.params;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: 'Design Year Not Found'
        })
    }
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    let query = {
        "ulb": ObjectId(user.ulb),
        "design_year": ObjectId(design_year)
    }
    if (masterform_id && user.role != 'ULB') {
        query = [
            {
                $match: {
                    "_id": ObjectId(masterform_id)
                }
            },
            {
                $lookup: {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulbInfo'
                }
            },
            { $unwind: '$ulbInfo' },
            {
                $lookup: {
                    from: 'states',
                    localField: 'ulbInfo.state',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    "steps": "$steps",
                    "isUA": "$ulbInfo.isUA",
                    "isMillionPlus": "$ulbInfo.isMillionPlus",
                    "UA": "$ulbInfo.UA",
                    "status": "$status",
                    "isSubmit": "$isSubmit",
                    "modifiedAt": "$modifiedAt",
                    "createdAt": "$createdAt",
                    "isActive": "$isActive",
                    "ulb": "$ulb",
                    "ulbName": "$ulbInfo.name",
                    "actionTakenBy": "$actionTakenBy",
                    "state": "$state._id",
                    "stateName": "$state.name",
                    "design_year": "$design_year",

                }
            }

        ]


        let masterFormData = await MasterFormData.aggregate(query);
        if (!masterFormData || masterFormData.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Master Data Not Found for ' + user.name
            })
        } else {
            return res.status(200).json({
                success: true,
                message: 'Data Found Successfully!',
                response: masterFormData[0]
            })
        }
    }
    let masterFormData = await MasterFormData.findOne(query,
        '-history')
    if (!masterFormData) {
        return res.status(500).json({
            success: false,
            message: 'Master Data Not Found for ' + user.name
        })
    } else {
        return res.status(200).json({
            success: true,
            message: 'Data Found Successfully!',
            response: masterFormData
        })
    }
})


module.exports.getAll = catchAsync(async (req, res) => {
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
        csv = req.query.csv,
        limit = req.query.limit ? parseInt(req.query.limit) : 50;

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found!'
        })
    }
    if (user.role === 'ADMIN' || 'MoHUA' || 'PARTNER' || 'USER' || 'STATE') {
        let { design_year } = req.params;
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: 'Design Year Not Found'
            })
        }
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found'
            })
        }

        let match = {
            $match:
            {
                design_year: ObjectId(design_year)
            }
        }

        if (user.role === 'STATE') {
            match = {
                $match:
                {
                    design_year: ObjectId(design_year),
                    state: ObjectId(user.state)
                }
            }
        }

        let query = [
            match,
            {
                $lookup:
                {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulb'

                }
            },
            { $unwind: "$ulb" },
            {
                $lookup:
                {
                    from: 'ulbtypes',
                    localField: 'ulb.ulbType',
                    foreignField: '_id',
                    as: 'ulb.ulbType'
                }
            },
            { $unwind: "$ulb.ulbType" },
            {
                $lookup: {
                    from: 'states',
                    localField: 'ulb.state',
                    foreignField: '_id',
                    as: 'state'

                }
            },
            { $unwind: "$state" },
            {
                $lookup: {
                    from: 'users',
                    localField: 'actionTakenBy',
                    foreignField: '_id',
                    as: 'actionTakenBy',
                },
            },
            { $unwind: '$actionTakenBy' },

            {
                $lookup: {
                    from: 'uas',
                    localField: 'ulb.UA',
                    foreignField: '_id',
                    as: 'ulb.UA',

                }
            },
            // { $unwind: '$ulb.UA' },
            {
                $project: {
                    "state": '$state.name',
                    "ulbName": "$ulb.name",
                    "censusCode": "$ulb.censusCode",
                    "sbCode": "$ulb.sbCode",
                    "populationType": {
                        $cond: {
                            if: { $eq: ['$ulb.isMillionPlus', 'Yes'] },
                            then: 'Million Plus',
                            else: 'Non Million',
                        },
                    },
                    "UA": {
                        $cond: {
                            if: { $eq: ['$ulb.isUA', 'Yes'] },
                            then: { $arrayElemAt: ['$ulb.UA.name', 0] },
                            else: 'NA',
                        },
                    },
                    "ulbType": '$ulb.ulbType.name',
                    "actionTakenByUserRole": '$actionTakenBy.role',
                    "status": {
                        $cond: {
                            if: { $eq: ['$status', 'NA'] },
                            then: 'Not Started',
                            else: '$status',
                        }
                    },
                    "createdAt": '$createdAt',
                    "modifiedAt": '$modifiedAt'
                }
            }

        ]

        let newFilter = await Service.mapFilter(filter);
        let total = undefined;
        let priority = false;

        if (newFilter['status']) {
            Object.assign(newFilter, statusFilter[newFilter['status']]);
            if (newFilter['status'] == '2' || newFilter['status'] == '3') { delete newFilter['status']; }
        }
        if (newFilter && Object.keys(newFilter).length) {
            query.push({ $match: newFilter });
        }
        if (sort && Object.keys(sort).length) {
            query.push({ $sort: sort });
        } else {
            if (priority) {
                sort = {
                    $sort: { priority: -1, priority_1: -1, modifiedAt: -1 },
                };
            } else {
                sort = { $sort: { createdAt: -1 } };
            }
            query.push(sort);
        }

        if (csv) {
            let arr = await MasterFormData.aggregate(query).exec();
            for (d of arr) {
                if (
                    d.status == 'PENDING' &&
                    d.isSubmit == false &&
                    d.actionTakenByUserRole == 'ULB'
                ) {
                    d.status = 'Saved as Draft';
                }
                if (
                    d.status == 'PENDING' &&
                    d.isSubmit == true &&
                    d.actionTakenByUserRole == 'ULB'
                ) {
                    d.status = 'Under Review by State';
                }
                if (
                    d.status == 'PENDING' &&
                    d.isSubmit == false &&
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
                    d.isSubmit == false
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
        }
        else {
            if (!skip) {
                let qrr = [...query, { $count: 'count' }];
                let d = await MasterFormData.aggregate(qrr);
                total = d.length ? d[0].count : 0;
            }
            query.push({ $skip: skip });
            query.push({ $limit: limit });

            let masterFormData = await MasterFormData.aggregate(query).exec();
            if (masterFormData) {
                return res.status(200).json({
                    success: true,
                    message: "ULB Master Form Data Found Successfully!",
                    data: masterFormData,
                    total: total
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: "No Data Found"
                })
            }
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " is Not Authenticated to Perform this Action"
        })
    }



})

function csvData() {

    return field = {
        state: 'State name',
        ulbName: 'ULB name',
        ulbType: 'ULB Type',
        populationType: 'Population Type',
        censusCode: 'Census Code',
        sbCode: 'ULB Code',
        status: 'Status',

    };

}

