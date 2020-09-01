const UlbFinancialData = require('../../models/UlbFinancialData');
const State = require('../../models/State');
const UlbType = require('../../models/UlbType');
const Ulb = require('../../models/Ulb');

const Response = require('../../service/response');
const ObjectId = require('mongoose').Types.ObjectId;
module.exports.filter = async (req, res, next) => {
    if (req.query.financialYear) {
        next();
    } else {
        return Response.BadRequest(res, req.query, `Select year is required.`);
    }
};
module.exports.overall = async (req, res) => {
    let stateId = req.decoded.state ? ObjectId(req.decoded.state) : null;
    let financialYear = req.query.financialYear;
    let query = getOverallQuery(financialYear, stateId);
    try {
        let data = await UlbFinancialData.aggregate(query).exec();
        return Response.OK(res, await OverAllModifyData(data));
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e);
    }
};
module.exports.statewise = async (req, res) => {
    let stateId = req.decoded.state ? ObjectId(req.decoded.state) : null;
    let financialYear = req.query.financialYear;
    let query = getStatewiseQuery(financialYear, stateId);
    try {
        let data = await State.aggregate(query).exec();
        return Response.OK(res, await StateModifyData(data));
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e);
    }
};
module.exports.ulbtypewise = async (req, res) => {
    let stateId = req.decoded.state ? ObjectId(req.decoded.state) : null;
    let financialYear = req.query.financialYear;
    let query = getUlbtypewiseQuery(financialYear, stateId);
    try {
        let overallData = await UlbFinancialData.aggregate(
            getOverallQuery(financialYear, stateId)
        ).exec();
        let data = await UlbType.aggregate(query).exec();
        let overall = { total: 0, data: formatData([]) };
        if (overallData.length) {
            overall = {
                total: overallData[0].total,
                data: formatData(overallData[0].data)
            };
        }
        return Response.OK(res, {
            overall: overall,
            data: await modifyData(data)
        });
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e);
    }
};
module.exports.stateandulbtypewise = async (req, res) => {
    let stateId = req.decoded.state ? ObjectId(req.decoded.state) : null;
    let financialYear = req.query.financialYear;
    let query = getStateAndUlbtypewsiseQuery(financialYear, stateId);
    try {
        let statewiseData = await State.aggregate(
            getStatewiseQuery(financialYear, stateId)
        ).exec();
        let data = await State.aggregate(query).exec();
        for (el of data) {
            let state = statewiseData.find((f) => f.name == el.name);
            el['overall'] = state
                ? { total: state.total, data: formatData(state.data) }
                : { total: 0, data: formatData([]) };
            el['data'] = await StateAndUlbmodifyData(el.data,el);
        }
        return Response.OK(res, data);
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e);
    }
};
module.exports.chart = async (req, res) => {
    let stateId = req.decoded.state ? ObjectId(req.decoded.state) : null;
    try {
        let financialYear = req.query.financialYear;
        let q = [];
        if (financialYear) {
            q.push({
                $match: { financialYear: financialYear, isActive: true }
            });
        } else {
            // NOTE: Fix if no FY is coming, then show only those years which are upload from UI.
            q.push({
                $match: { isActive: true }
            });
        }
        let query = q.concat([
            {
                $project: {
                    _id: 1,
                    ulb: 1,
                    status: 1
                }
            },
            {
                $lookup: {
                    from: 'ulbs',
                    localField: 'ulb',
                    foreignField: '_id',
                    as: 'ulb'
                }
            },
            { $unwind: '$ulb' },
            {
                $group: {
                    _id: '$ulb.state',
                    count: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$status', 'PENDING'] },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$status', 'REJECTED'] },
                                then: 1,
                                else: 0
                            }
                        }
                    },
                    approved: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$status', 'APPROVED'] },
                                then: 1,
                                else: 0
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'states',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            { $unwind: '$state' },
            {
                $project: {
                    _id: '$state._id',
                    name: '$state.name',
                    code: '$state.code',
                    count: 1,
                    pending: 1,
                    rejected: 1,
                    approved: 1
                }
            }
        ]);
        if (stateId) {
            query.push({ $match: { _id: stateId } });
        }

        let data = await UlbFinancialData.aggregate(query).exec();
        return Response.OK(res, data);
    } catch (e) {
        console.log('Exception', e);
        return Response.DbError(res, e);
    }
};

async function StateModifyData(arr) {

    for (let el of arr) {
        let c  = await Ulb.count({state:ObjectId(el._id)});
        el['data'] = formatData(el.data);
        el['total'] =  c;//getTotal(el['data']);
    }
    return arr;
}
async function modifyData(arr) {

    for (let el of arr) {
        let c  = await Ulb.count({ulbType:ObjectId(el._id)});
        el['data'] = formatData(el.data);
        el['total'] =  c;//getTotal(el['data']);
    }
    return arr;
}

async function OverAllModifyData(arr){
    for (let el of arr) {
        el['data'] = formatData(el.data);
        el['total'] =  el.total;//getTotal(el['data']);
    }
    return arr;    
}

async function StateAndUlbmodifyData(arr,state) {

    for (let el of arr) {
        let c  = await Ulb.count({ulbType:ObjectId(el._id),state:ObjectId(state._id)});
        el['data'] = formatData(el.data);
        el['total'] =  c;//getTotal(el['data']);
    }
    return arr;
}

function getTotal(arr) {
    let count = 0;
    for (el of arr) {
        count += el.count;
    }
    return count;
}
function formatData(data) {
    if (data.length) {
        if (data.length == 1) {
            if (data[0].audited) {
                return [
                    data[0],
                    {
                        count: 0,
                        uploaded: 0,
                        pending: 0,
                        rejected: 0,
                        approved: 0,
                        audited: false
                    }
                ];
            } else {
                return [
                    {
                        count: 0,
                        uploaded: 0,
                        pending: 0,
                        rejected: 0,
                        approved: 0,
                        audited: true
                    },
                    data[0]
                ];
            }
        } else {
            if (data[0].audited) {
                return data;
            } else {
                return [data[1], data[0]];
            }
        }
    } else {
        return [
            {
                count: 0,
                uploaded: 0,
                pending: 0,
                rejected: 0,
                approved: 0,
                audited: true
            },
            {
                count: 0,
                uploaded: 0,
                pending: 0,
                rejected: 0,
                approved: 0,
                audited: false
            }
        ];
    }
}
function getOverallQuery(financialYear, state = null) {
    let overallulbs = state
        ? {
              $lookup: {
                  from: 'ulbs',
                  pipeline: [{ $match: { state: state } }, { $count: 'count' }],
                  as: 'overallulbs'
              }
          }
        : {
              $lookup: {
                  from: 'ulbs',
                  pipeline: [{ $count: 'count' }],
                  as: 'overallulbs'
              }
          };

    return [
        { $match: { financialYear: financialYear,isActive:true} },
        overallulbs,
        {
            $project: {
                _id: 1,
                audited: 1,
                status: 1,
                overallulbs: { $arrayElemAt: ['$overallulbs', 0] }
            }
        },
        {
            $project: {
                _id: 1,
                audited: 1,
                status: 1,
                total: '$overallulbs.count'
            }
        },
        {
            $group: {
                _id: '$audited',
                total: { $first: '$total' },
                count: { $sum: 1 },
                pending: {
                    $sum: {
                        $cond: {
                            if: { $eq: ['$status', 'PENDING'] },
                            then: 1,
                            else: 0
                        }
                    }
                },
                rejected: {
                    $sum: {
                        $cond: {
                            if: { $eq: ['$status', 'REJECTED'] },
                            then: 1,
                            else: 0
                        }
                    }
                },
                approved: {
                    $sum: {
                        $cond: {
                            if: { $eq: ['$status', 'APPROVED'] },
                            then: 1,
                            else: 0
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                data: {
                    audited: '$_id',
                    count: '$count',
                    uploaded: '$count',
                    pending: '$pending',
                    rejected: '$rejected',
                    approved: '$approved'
                }
            }
        },
        {
            $group: {
                _id: null,
                total: { $first: '$total' },
                data: { $push: '$data' }
            }
        },
        {
            $project: {
                _id: 0,
                total: 1,
                data: 1
            }
        }
    ];
}
function getStatewiseQuery(financialYear, state = null) {
    let queryArr = state ? [{$match:{ _id:state,isActive:true}}] : [{$match:{isActive:true}}];
    return queryArr.concat([
        {
            $lookup: {
                from: 'ulbs',
                localField: '_id',
                foreignField: 'state',
                as: 'overallulbs'
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                code: 1,
                total: { $size: '$overallulbs' }
            }
        },
        {
            $lookup: {
                from: 'ulbs',
                let: { state: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$state', '$$state'] } } },
                    {
                        $lookup: {
                            from: 'ulbfinancialdatas',
                            localField: '_id',
                            foreignField: 'ulb',
                            as: 'ulbfinancialdatas'
                        }
                    },
                    { $unwind: '$ulbfinancialdatas' },
                    {
                        $match: {
                            'ulbfinancialdatas.financialYear': financialYear
                        }
                    },
                    {
                        $project: {
                            audited: '$ulbfinancialdatas.audited',
                            status: '$ulbfinancialdatas.status'
                        }
                    },
                    {
                        $group: {
                            _id: '$audited',
                            count: { $sum: 1 },
                            pending: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'PENDING'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            },
                            rejected: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'REJECTED'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            },
                            approved: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'APPROVED'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            audited: '$_id',
                            count: 1,
                            uploaded: '$count',
                            pending: 1,
                            rejected: 1,
                            approved: 1
                        }
                    }
                ],
                as: 'data'
            }
        }
    ]);
}
function getUlbtypewiseQuery(financialYear, state = null) {
    let stateCondition = state ? { state:state,isActive:true} : {isActive:true};
    return [
        {
            $lookup: {
                from: 'ulbs',
                let: { ulbType: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$ulbType', '$$ulbType'] } } },
                    { $match: stateCondition },
                    {
                        $lookup: {
                            from: 'ulbfinancialdatas',
                            localField: '_id',
                            foreignField: 'ulb',
                            as: 'ulbfinancialdatas'
                        }
                    },
                    { $unwind: '$ulbfinancialdatas' },
                    {
                        $match: {
                            'ulbfinancialdatas.financialYear': financialYear
                        }
                    },
                    {
                        $project: {
                            audited: '$ulbfinancialdatas.audited',
                            status: '$ulbfinancialdatas.status'
                        }
                    },
                    {
                        $group: {
                            _id: '$audited',
                            count: { $sum: 1 },
                            pending: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'PENDING'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            },
                            rejected: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'REJECTED'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            },
                            approved: {
                                $sum: {
                                    $cond: {
                                        if: { $eq: ['$status', 'APPROVED'] },
                                        then: 1,
                                        else: 0
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            audited: '$_id',
                            count: 1,
                            uploaded: '$count',
                            pending: 1,
                            rejected: 1,
                            approved: 1
                        }
                    }
                ],
                as: 'data'
            }
        },
        {
            $project: {
                name: 1,
                data: 1
            }
        }
    ];
}
function getStateAndUlbtypewsiseQuery(financialYear, state = null) {
    let queryArr = state ? [{ $match: { _id: state,isActive:true } }] : [{$match:{isActive:true}}];
    return queryArr.concat([
        {
            $project: {
                _id: 1,
                name: 1
            }
        },
        {
            $lookup: {
                from: 'ulbtypes',
                let: { state: '$_id' },
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1
                        }
                    },
                    {
                        $lookup: {
                            from: 'ulbs',
                            let: { ulbType: '$_id', state: '$$state' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$state', '$$state'] },
                                                {
                                                    $eq: [
                                                        '$ulbType',
                                                        '$$ulbType'
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1
                                    }
                                },
                                {
                                    $lookup: {
                                        from: 'ulbfinancialdatas',
                                        let: { ulb: '$_id' },
                                        pipeline: [
                                            {
                                                $match: {
                                                    financialYear: financialYear
                                                }
                                            },
                                            {
                                                $match: {
                                                    $expr: {
                                                        $eq: ['$ulb', '$$ulb']
                                                    }
                                                }
                                            }
                                        ],
                                        as: 'ulbfinancialdatas'
                                    }
                                },
                                { $unwind: { path: '$ulbfinancialdatas' } },
                                {
                                    $project: {
                                        _id: 1,
                                        name: '$ulbfinancialdatas.name',
                                        audited: '$ulbfinancialdatas.audited',
                                        status: '$ulbfinancialdatas.status'
                                    }
                                },
                                {
                                    $group: {
                                        _id: '$audited',
                                        count: { $sum: 1 },
                                        pending: {
                                            $sum: {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            '$status',
                                                            'PENDING'
                                                        ]
                                                    },
                                                    then: 1,
                                                    else: 0
                                                }
                                            }
                                        },
                                        rejected: {
                                            $sum: {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            '$status',
                                                            'REJECTED'
                                                        ]
                                                    },
                                                    then: 1,
                                                    else: 0
                                                }
                                            }
                                        },
                                        approved: {
                                            $sum: {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            '$status',
                                                            'APPROVED'
                                                        ]
                                                    },
                                                    then: 1,
                                                    else: 0
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        audited: '$_id',
                                        count: 1,
                                        uploaded: '$count',
                                        pending: 1,
                                        rejected: 1,
                                        approved: 1
                                    }
                                }
                            ],
                            as: 'data'
                        }
                    },
                    {
                        $unwind: {
                            path: '$data',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $group: {
                            _id: '$_id',
                            name: { $first: '$name' },
                            data: { $push: '$data' }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            data: 1
                        }
                    }
                ],
                as: 'data'
            }
        }
    ]);
}
