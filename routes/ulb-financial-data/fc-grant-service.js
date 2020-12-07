const Ulb = require('../../models/Ulb');
const moment = require('moment');
const UlbFinancialData = require('../../models/UlbFinancialData');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const State = require('../../models/State');
const Response = require('../../service').response;
const Service = require('../../service');
const { filter } = require('compression');
const ObjectId = require('mongoose').Types.ObjectId;
const ulbTye = {
    'Town Panchayat': 0,
    Municipality: 0,
    'Municipal Corporation': 0,
};
module.exports = (req, res) => {
    let user = req.decoded;
    let cond = { $match: { isActive: true } };
    let cond1 = { $match: { isDeleted: false, role: 'ULB' } };
    if (user.role == 'STATE') {
        Object.assign(cond['$match'], { state: ObjectId(user.state) });
        Object.assign(cond1['$match'], { state: ObjectId(user.state) });
    }

    let cond2 = {
        $lookup: {
            from: 'ulbs',
            localField: 'ulb',
            foreignField: '_id',
            as: 'ulb',
        },
    };
    let cond3 = { $unwind: '$ulb' };
    let group = { $group: { _id: '$ulbtype.name', count: { $sum: 1 } } };
    let project = { $project: { name: '$_id', count: '$count', _id: 0 } };

    let query = [
        cond,
        {
            $lookup: {
                from: 'ulbtypes',
                localField: 'ulbType',
                foreignField: '_id',
                as: 'ulbtype',
            },
        },
        {
            $unwind: {
                path: '$ulbtype',
                preserveNullAndEmptyArrays: true,
            },
        },
        group,
        project,
    ];

    let totalULB = new Promise(async (rslv, rjct) => {
        try {
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    let registeredUlb = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await UlbFinancialData.aggregate([
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
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: { 'actionTakenBy.role': 'ULB', isCompleted: false },
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });
            let match = { $match: { isActive: true } };
            if (arrayOfIds.length > 0) {
                Object.assign(match['$match'], { _id: { $nin: arrayOfIds } });
            }
            let query = [
                match,
                {
                    $unwind: '$history',
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'history.actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenByHistory',
                    },
                },
                {
                    $unwind: {
                        path: '$actionTakenByHistory',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'actionTakenByHistory.role': 'ULB',
                        'history.isCompleted': true,
                    },
                },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'actionTakenByHistory.ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $unwind: {
                        path: '$ulb',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype',
                    },
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                group,
                project,
            ];
            // let query = [
            //     cond1,
            //     cond2,
            //     cond3,
            //     {
            //         $lookup: {
            //             from: 'ulbtypes',
            //             localField: 'ulb.ulbType',
            //             foreignField: '_id',
            //             as: 'ulbtype'
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: '$ulbtype',
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     group,
            //     project
            // ]
            let data = await UlbFinancialData.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    let registeredMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await UlbFinancialData.aggregate([
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
                {
                    $unwind: {
                        path: '$ulb',
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
                    $match: {
                        'actionTakenBy.role': 'ULB',
                        isCompleted: false,
                        'ulb.isMillionPlus': 'Yes',
                    },
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });
            let match = { $match: { isActive: true } };
            if (arrayOfIds.length > 0) {
                Object.assign(match['$match'], { _id: { $nin: arrayOfIds } });
            }

            let query = [
                match,
                {
                    $unwind: '$history',
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'history.actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenByHistory',
                    },
                },
                {
                    $unwind: {
                        path: '$actionTakenByHistory',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'actionTakenByHistory.ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $unwind: {
                        path: '$ulb',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype',
                    },
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'actionTakenByHistory.role': 'ULB',
                        'history.isCompleted': true,
                        'ulb.isMillionPlus': 'Yes',
                    },
                },
                group,
                project,
            ];

            let data = await UlbFinancialData.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    let totalMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let query = commonQuery(cond, 'Yes');
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    let registeredNonMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await UlbFinancialData.aggregate([
                { $match: { isActive: true } },
                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $unwind: {
                        path: '$ulb',
                        preserveNullAndEmptyArrays: true,
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
                {
                    $unwind: {
                        path: '$actionTakenBy',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'actionTakenBy.role': 'ULB',
                        isCompleted: false,
                        'ulb.isMillionPlus': 'No',
                    },
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });
            let match = { $match: { isActive: true } };
            if (arrayOfIds.length > 0) {
                Object.assign(match['$match'], { _id: { $nin: arrayOfIds } });
            }

            let query = [
                match,
                {
                    $unwind: '$history',
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'history.actionTakenBy',
                        foreignField: '_id',
                        as: 'actionTakenByHistory',
                    },
                },
                {
                    $unwind: {
                        path: '$actionTakenByHistory',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'ulbs',
                        localField: 'actionTakenByHistory.ulb',
                        foreignField: '_id',
                        as: 'ulb',
                    },
                },
                {
                    $unwind: {
                        path: '$ulb',
                        preserveNullAndEmptyArrays: true,
                    },
                },

                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype',
                    },
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $match: {
                        'actionTakenByHistory.role': 'ULB',
                        'history.isCompleted': true,
                        'ulb.isMillionPlus': 'No',
                    },
                },
                group,
                project,
            ];

            let data = await UlbFinancialData.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    let totalNonMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let query = commonQuery(cond, 'No');
            let data = await Ulb.aggregate(query).exec();
            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    Promise.all([
        totalULB,
        registeredUlb,
        registeredMillionPlus,
        totalMillionPlus,
        registeredNonMillionPlus,
        totalNonMillionPlus,
    ])
        .then(
            (values) => {
                let data = {
                    totalULB: values[0],
                    registeredUlb: values[1],
                    registeredMillionPlus: values[2],
                    totalMillionPlus: values[3],
                    registeredNonMillionPlus: values[4],
                    totalNonMillionPlus: values[5],
                };
                return res.status(200).json({
                    success: true,
                    message: 'Data fetched',
                    data: data,
                });
            },
            (rejectError) => {
                console.log(rejectError);
                return res.status(400).json({
                    timestamp: moment().unix(),
                    success: false,
                    message: 'Rejected Error',
                    err: rejectError,
                });
            }
        )
        .catch((caughtError) => {
            console.log('final caughtError', caughtError);
            return res.status(400).json({
                timestamp: moment().unix(),
                success: false,
                message: 'Caught Error',
                err: caughtError,
            });
        });

    function ulbType(object) {
        for (let type in ulbTye) {
            if (!object[type]) {
                Object.assign(object, { [type]: ulbTye[type] });
            }
        }
        return object;
    }
    function commonQuery(cond, s) {
        let query = [
            cond,
            { $match: { isMillionPlus: `${s}` } },
            {
                $lookup: {
                    from: 'ulbtypes',
                    localField: 'ulbType',
                    foreignField: '_id',
                    as: 'ulbtype',
                },
            },
            {
                $unwind: {
                    path: '$ulbtype',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $group: {
                    _id: '$ulbtype.name',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    name: '$_id',
                    count: '$count',
                    _id: 0,
                },
            },
        ];
        return query;
    }
};

module.exports.chartDataStatus = async (req, res) => {
    let labels = [
        'Not Registered',
        'Registered But Not Started',
        'Saved as Draft',
        'Rejected By State',
        'Under Review By State',
        'Rejected By MoHUA',
        'Under Review By MoHUA',
        'Approval Completed',
    ];
    let backgroundColor = [
        '#c9c9c9',
        '#87c9c9',
        '#6b8585',
        '#428181',
        '#2a8181',
        '#136060',
        '#0c4848',
        '#074141',
    ];
    let user = req.decoded;
    let totalUlb = req.query.totalUlb;
    let millionPlus = req.query.millionPlus;
    let nonMillion = req.query.nonMillion;
    let state = user.role == 'STATE' ? ObjectId(user.state) : null;

    let toggleCond = null;
    if (millionPlus) {
        toggleCond = { isMillionPlus: 'Yes' };
    } else if (nonMillion) {
        toggleCond = { isMillionPlus: 'No' };
    }

    let nonRegisteredUlb = new Promise(async (rslv, rjct) => {
        try {
            let q = [
                { $match: { isDeleted: false, role: 'ULB' } },
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
                    $project: {
                        isMillionPlus: '$ulb.isMillionPlus',
                        state: 1,
                    },
                },
            ];
            let q1 = { isActive: true };
            if (state) {
                q.push({ $match: { state: state } });
                Object.assign(q1, { state: state });
            }
            if (toggleCond) {
                q.push({ $match: toggleCond });
                Object.assign(q1, toggleCond);
            }
            q.push({ $count: 'c' });
            //res.json(q);return;
            let registerd = await User.aggregate(q).exec();
            let totalData = await Ulb.count(q1).exec();
            let remainData =
                totalData - (registerd.length > 0 ? registerd[0]['c'] : 0);
            rslv({ c: remainData });
        } catch (err) {
            rjct(err);
        }
    });

    let notStarted = new Promise(async (rslv, rjct) => {
        try {
            let q = [
                { $match: { isDeleted: false, role: 'ULB' } },
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
                    $project: {
                        isMillionPlus: '$ulb.isMillionPlus',
                        state: 1,
                    },
                },
            ];
            let q1 = [
                { $match: { isActive: true } },
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
                    $project: {
                        isMillionPlus: '$ulb.isMillionPlus',
                    },
                },
            ];
            if (state) {
                q.push({ $match: { state: state } });
                q1.push({ $match: { 'ulb.state': state } });
            }
            if (toggleCond) {
                q.push({ $match: toggleCond });
                q1.push({ $match: toggleCond });
            }
            q.push({ $count: 'c' });
            q1.push({ $count: 'c' });
            let registerd = await User.aggregate(q).exec();
            let startedData = await UlbFinancialData.aggregate(q1).exec();
            let remainData =
                (registerd.length > 0 ? registerd[0]['c'] : 0) -
                (startedData.length > 0 ? startedData[0]['c'] : 0);
            rslv({ c: remainData });
        } catch (err) {
            rjct(err);
        }
    });
    let draft = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(1, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data && data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let UnderReviewState = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(2, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let UnderReviewMoHUA = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(3, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let rejectByState = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(4, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let rejectByMoHUA = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(5, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let approvalCompleted = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(6, state, toggleCond);
            let data = await UlbFinancialData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let dataArr = [
        nonRegisteredUlb,
        notStarted,
        draft,
        rejectByState,
        UnderReviewState,
        rejectByMoHUA,
        UnderReviewMoHUA,
        approvalCompleted,
    ];

    Promise.all(dataArr)
        .then(
            (values) => {
                dataArr = [];
                for (v of values) {
                    dataArr.push(v.c);
                }
                let data = {
                    'x-axis': 'Number of ULBS',
                    'y-axis': '15th FC Form Submit Status',
                    type: 'bar',
                    labels: labels,
                    datasets: [
                        { data: dataArr, backgroundColor: backgroundColor },
                    ],
                };
                return res.status(200).json({
                    success: true,
                    message: 'Data fetched',
                    data: data,
                });
            },
            (rejectError) => {
                console.log(rejectError);
                return res.status(400).json({
                    timestamp: moment().unix(),
                    success: false,
                    message: 'Rejected Error',
                    err: rejectError,
                });
            }
        )
        .catch((caughtError) => {
            console.log('final caughtError', caughtError);
            return res.status(400).json({
                timestamp: moment().unix(),
                success: false,
                message: 'Caught Error',
                err: caughtError,
            });
        });

    function dataUploadStatusQuery(s, state = null, toogleCond = null) {
        let statusFilter = {
            1: {
                status: 'PENDING',
                isCompleted: false,
                actionTakenByUserRole: 'ULB',
            },
            2: {
                status: 'PENDING',
                isCompleted: true,
                actionTakenByUserRole: 'ULB',
            },
            3: { status: 'APPROVED', actionTakenByUserRole: 'STATE' },
            4: { status: 'REJECTED', actionTakenByUserRole: 'STATE' },
            5: { status: 'REJECTED', actionTakenByUserRole: 'MoHUA' },
            6: { status: 'APPROVED', actionTakenByUserRole: 'MoHUA' },
        };
        let match = { $match: statusFilter[s] };
        if (state) {
            Object.assign(match['$match'], { state: state });
        }
        if (toogleCond) {
            Object.assign(match['$match'], toogleCond);
        }
        return [
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
                    isMillionPlus: '$ulb.isMillionPlus',
                    ulbCode: '$ulb.code',
                    actionTakenByUserName: '$actionTakenBy.name',
                    actionTakenByUserRole: '$actionTakenBy.role',
                    isActive: '$isActive',
                    createdAt: '$createdAt',
                    state: '$ulb.state',
                },
            },
            match,
            { $count: 'c' },
        ];
    }
};

module.exports.ulbList = async (req, res) => {
    let user = req.decoded;
    let filter =
            req.query.filter && req.query.filter != 'null'
                ? JSON.parse(req.query.filter)
                : req.body.filter
                ? req.body.filter
                : {},
        sort =
            req.query.sort && req.query.sort != 'null'
                ? JSON.parse(req.query.sort)
                : req.body.sort
                ? req.body.sort
                : {},
        skip = req.query.skip ? parseInt(req.query.skip) : 0;
    limit = req.query.limit ? parseInt(req.query.limit) : 10;
    csv = req.query.csv;
    let q = [
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'ulb',
                as: 'user',
            },
        },
        {
            $lookup: {
                from: 'states',
                localField: 'state',
                foreignField: '_id',
                as: 'state',
            },
        },
        {
            $lookup: {
                from: 'ulbtypes',
                localField: 'ulbType',
                foreignField: '_id',
                as: 'ulbType',
            },
        },
        {
            $unwind: {
                path: '$ulbType',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $unwind: {
                path: '$user',
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
            $project: {
                stateName: '$state.name',
                state: '$state._id',
                ulbName: '$name',
                ulbType: '$ulbType.name',
                censusCode: 1,
                role: '$user.role',
                sbCode: 1,
                isMillionPlus: {
                    $cond: {
                        if: { $eq: ['$isMillionPlus', 'Yes'] },
                        then: 'Milion Plus',
                        else: 'Non Million',
                    },
                },
                email: '$user.accountantEmail',
                mobile: '$user.commissionerConatactNumber',
                registration: {
                    $cond: {
                        if: {
                            $and: [
                                { $eq: ['$user.role', 'ULB'] },
                                { $eq: ['$user.isRegistered', true] },
                            ],
                        },
                        then: 'Yes',
                        else: 'No',
                    },
                },
            },
        },
    ];
    if (user.role == 'STATE') {
        q.push({ $match: { state: ObjectId(user.state) } });
    }
    let newFilter = await Service.mapFilter(filter);
    if (newFilter && Object.keys(newFilter).length) {
        q.push({ $match: newFilter });
    }
    if (Object.keys(sort).length) {
        q.push({ $sort: sort });
    }
    if (csv) {
        let field = {
            stateName: 'State',
            ulbName: 'ULB Name',
            ulbType: 'ULB Type',
            censusCode: 'Census Code',
            sbCode: 'ULB Code',
            isMillionPlus: 'Type',
            email: 'Email ID',
            registration: 'Registered',
        };
        if (user.role == 'STATE') {
            delete field.stateName;
        }
        let arr = await Ulb.aggregate(q).exec();
        let xlsData = await Service.dataFormating(arr, field);
        return res.xls('ulb-update-request.xlsx', xlsData);
    }

    if (!skip) {
        let qrr = [...q, { $count: 'count' }];
        let d = await Ulb.aggregate(qrr);
        total = d.length ? d[0].count : 0;
    }
    q.push({ $skip: skip });
    q.push({ $limit: limit });
    let arr = await Ulb.aggregate(q).exec();

    return res.status(200).json({
        timestamp: moment().unix(),
        success: true,
        message: 'list',
        data: arr,
        total: total,
    });
};
