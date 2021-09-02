const Ulb = require('../../models/Ulb');
const moment = require('moment');
const XVFCGrantULBData = require('../../models/XVFcGrantForm');
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
    let cond = { $match: { $and: [{ isActive: true }, { $or: [{ censusCode: { $exists: true, "$ne": null, "$ne": "" } }, { sbCode: { $exists: true, "$ne": null, "$ne": "" } }] }] } };
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
    const matchConditionForRU = {
        $match: {
            $or: [
                {
                    'actionTakenBy.role': 'ULB',
                    isCompleted: true,
                },
                {
                    history: { $gte: { $size: 1 } },
                },
            ],
        },
    };
    if (user['role'] === 'STATE') {
        matchConditionForRU.$match.$or = matchConditionForRU.$match.$or.map(
            (condition) => ({ ...condition, 'ulb.state': ObjectId(user.state) })
        );
    }
    let registeredUlb = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await XVFCGrantULBData.aggregate([
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
                    ...matchConditionForRU,
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });

            let match = { $match: { isActive: true } };
            Object.assign(match['$match'], { _id: { $in: arrayOfIds } });
            let query = [
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

            let data = await XVFCGrantULBData.aggregate(query).exec();

            let object = data.reduce(
                (obj, item) => Object.assign(obj, { [item.name]: item.count }),
                {}
            );
            rslv(ulbType(object));
        } catch (err) {
            rjct(err);
        }
    });

    const matchConditionForRMP = {
        $match: {
            $or: [
                {
                    isCompleted: true,
                    'ulb.isMillionPlus': 'Yes',
                },
                {
                    history: { $gte: { $size: 1 } },
                    'ulb.isMillionPlus': 'Yes',
                },
            ],
        },
    };
    if (user['role'] === 'STATE') {
        matchConditionForRMP.$match.$or = matchConditionForRMP.$match.$or.map(
            (condition) => ({
                ...condition,
                'ulb.state': ObjectId(user.state),
            })
        );
    }
    let registeredMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await XVFCGrantULBData.aggregate([
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
                    ...matchConditionForRMP,
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });
            let match = { $match: { isActive: true } };
            Object.assign(match['$match'], { _id: { $in: arrayOfIds } });

            let query = [
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

            let data = await XVFCGrantULBData.aggregate(query).exec();
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

    const matchConditionForRNMP = {
        $match: {
            $or: [
                {
                    isCompleted: true,
                    'ulb.isMillionPlus': 'No',
                },
                {
                    history: { $gte: { $size: 1 } },
                    'ulb.isMillionPlus': 'No',
                },
            ],
        },
    };
    if (user['role'] === 'STATE') {
        matchConditionForRNMP.$match.$or = matchConditionForRNMP.$match.$or.map(
            (condition) => ({
                ...condition,
                'ulb.state': ObjectId(user.state),
            })
        );
    }

    let registeredNonMillionPlus = new Promise(async (rslv, rjct) => {
        try {
            let arrayOfIds = await XVFCGrantULBData.aggregate([
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
                    ...matchConditionForRNMP,
                },
                { $project: { _id: 1 } },
            ]).exec();

            arrayOfIds = arrayOfIds.map(function (o) {
                return ObjectId(o._id);
            });

            let match = { $match: { isActive: true } };
            Object.assign(match['$match'], {
                _id: { $in: arrayOfIds },
            });

            let query = [
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

            let data = await XVFCGrantULBData.aggregate(query).exec();
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
                console.error(rejectError);
                return res.status(400).json({
                    timestamp: moment().unix(),
                    success: false,
                    message: 'Rejected Error',
                    err: rejectError,
                });
            }
        )
        .catch((caughtError) => {
            console.error('final caughtError', caughtError);
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
        '#E5E5E5',
        '#D0EDF9',
        '#8BD2F0',
        '#07DFDF',
        '#059B9A',
        '#216278',
        '#024A4A',
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
                        state: '$ulb.state',
                    },
                },
            ];
            if (state) {
                q.push({ $match: { state: state } });
                q1.push({ $match: { state: state } });
            }
            if (toggleCond) {
                q.push({ $match: toggleCond });
                q1.push({ $match: toggleCond });
            }
            q.push({ $count: 'c' });
            q1.push({ $count: 'c' });
            let registerd = await User.aggregate(q).exec();
            let startedData = await XVFCGrantULBData.aggregate(q1).exec();
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
            let data = await XVFCGrantULBData.aggregate(query).exec();
            rslv(data && data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let UnderReviewState = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(2, state, toggleCond);
            // return res.send({ query });

            let data = await XVFCGrantULBData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let UnderReviewMoHUA = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(3, state, toggleCond);
            let data = await XVFCGrantULBData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let rejectByState = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(4, state, toggleCond);
            let data = await XVFCGrantULBData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let rejectByMoHUA = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(5, state, toggleCond);
            let data = await XVFCGrantULBData.aggregate(query).exec();
            rslv(data.length > 0 ? data[0] : { c: 0 });
        } catch (err) {
            rjct(err);
        }
    });

    let approvalCompleted = new Promise(async (rslv, rjct) => {
        try {
            let query = dataUploadStatusQuery(6, state, toggleCond);
            let data = await XVFCGrantULBData.aggregate(query).exec();
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

    /**
     *
     * @param {1 | 2 | 3 | 4 | 5 | 6} s
     * @param { string } state
     * @param {{ isMillionPlus: 'No' | 'Yes'}} toogleCond
     */
    function dataUploadStatusQuery(s, state = null, toogleCond = null) {
        let statusFilter = {
            // Drafted By State
            1: {
                status: 'PENDING',
                isCompleted: false,
                actionTakenByUserRole: 'ULB',
            },

            // Under Review By State (including Draft by State)
            2: {
                $and: [
                    {
                        status: 'PENDING',
                    },
                    {
                        $or: [
                            { isCompleted: true, actionTakenByUserRole: 'ULB' },
                            {
                                isCompleted: false,
                                actionTakenByUserRole: 'STATE',
                            },
                        ],
                    },
                ],
            },

            // Under Review by MoHUA
            3: {
                $or: [
                    { status: 'APPROVED', actionTakenByUserRole: 'STATE' },
                    { status: 'PENDING', actionTakenByUserRole: 'MoHUA' },
                ],
            },
            4: { status: 'REJECTED', actionTakenByUserRole: 'STATE' },
            5: { status: 'REJECTED', actionTakenByUserRole: 'MoHUA' },

            // Approval Completion
            6: { status: 'APPROVED', actionTakenByUserRole: 'MoHUA' },
        };
        let match = { $match: statusFilter[s] };
        if (state) {
            if (s === 2) match['$match']['$and'][0].state = state;
            else if (s === 3)
                match['$match'] = { $and: [{ state }, { ...match['$match'] }] };
            else Object.assign(match['$match'], { state: state });
        }
        if (toogleCond) {
            if (s === 2)
                match['$match']['$and'][0] = {
                    ...match['$match']['$and'][0],
                    ...toggleCond,
                };
            else if (s === 3)
                match['$match'] = {
                    $and: [{ ...match['$match'] }, toggleCond],
                };
            else Object.assign(match['$match'], toogleCond);
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
        { $match: { $and: [{ isActive: true }, { $or: [{ censusCode: { $exists: true, "$ne": null, "$ne": "" } }, { sbCode: { $exists: true, "$ne": null, "$ne": "" } }] }] } },
        {
            $match: { $and: [{ isActive: true }, { $or: [{ censusCode: { $exists: true, "$ne": null, "$ne": "" } }, { sbCode: { $exists: true, "$ne": null, "$ne": "" } }] }] }
        },
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
            $project: {
                state: { $arrayElemAt: ['$state', 0] },
                user: { $arrayElemAt: ['$user', 0] },
                ulbType: { $arrayElemAt: ['$ulbType', 0] },
                ulbName: '$name',
                area: "$area",
                population: "$population",
                wards: "$wards",
                censusCode: 1,
                sbCode: 1,
                isMillionPlus: {
                    $cond: {
                        if: { $eq: ['$isMillionPlus', 'Yes'] },
                        then: 'Milion Plus',
                        else: 'Non Million',
                    },
                },
            },
        },
        {
            $project: {
                stateName: '$state.name',
                state: '$state._id',
                ulbName: 1,
                area: 1,
                population: 1,
                wards: 1,
                ulbType: '$ulbType.name',
                censusCode: 1,
                role: '$user.role',
                commissionerName: "$user.commissionerName",
                commissionerEmail: "$user.commissionerEmail",
                commissionerConatactNumber: "$user.commissionerConatactNumber",
                accountantName: "$user.accountantName",
                accountantEmail: "$user.accountantEmail",
                accountantConatactNumber: "$user.accountantConatactNumber",
                sbCode: 1,
                isMillionPlus: 1,
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
            isMillionPlus: 'Population Type',
            //email: 'Email ID',
            area: 'Area',
            population: 'Population',
            wards: 'No of Wards',
            registration: 'Profile Updated',
            commissionerName: "Municipal Commissioner/Executive Officer Name",
            commissionerEmail: "Municipal Commissioner/Executive Officer Email ID",
            commissionerConatactNumber: "Municipal Commissioner/Executive Officer Contact No",
            accountantName: "ULB Nodal Officer Name",
            accountantEmail: "ULB Nodal Officer Email ID",
            accountantConatactNumber: "ULB Nodal Officer Contact No",
        };
        if (user.role == 'STATE') {
            delete field.stateName;
        }

        let arr = await Ulb.aggregate(q).exec();
        let xlsData = await Service.dataFormating(arr, field);
        let filename =
            'ULB List ' + moment().format('DD-MMM-YY HH:MM:SS') + '.xlsx';
        return res.xls(filename, xlsData);
    }


    if (!skip) {
        let qrr = [...q, { $count: 'count' }];
        let d = await Ulb.aggregate(qrr);
        total = d.length ? d[0].count : 0;
    }
    q.push({ $skip: skip });
    q.push({ $limit: limit });
    let arr = await Ulb.aggregate(q).collation({ locale: 'en' }).exec();
    return res.status(200).json({
        timestamp: moment().unix(),
        success: true,
        message: 'list',
        data: arr,
        total: total,
    });
};
