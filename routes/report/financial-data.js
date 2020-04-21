const UlbFinancialData = require('../../models/UlbFinancialData');
const State = require('../../models/State');
const UlbType = require('../../models/UlbType');
const Response = require('../../service/response');
module.exports.filter = async (req, res, next)=>{
    if(req.query.financialYear){
        next();
    }else{
        return Response.BadRequest(res,req.query, `Select year is required.`)
    }
}
module.exports.overall = async (req, res)=>{
    let financialYear = req.query.financialYear;
    let query = [
        {$match:{financialYear:financialYear}},
        {
            $lookup:{
                from:"overallulbs",
                pipeline:[{$count:"count"}],
                as :"overallulbs"
            }
        },
        {
            $project:{
                _id:1,
                audited:1,
                status:1,
                overallulbs:{$arrayElemAt:["$overallulbs",0]}
            }
        },
        {
            $project:{
                _id:1,
                audited:1,
                status:1,
                total:"$overallulbs.count"
            }
        },
        {
            $group:{
                _id:"$audited",
                total:{$first:"$total"},
                count:{$sum:1},
                pending:{$sum:{$cond:{if:{$eq:["$status","PENDING"]}, then:1, else:0}}},
                rejected:{$sum:{$cond:{if:{$eq:["$status","REJECTION"]}, then:1, else:0}}},
                approved:{$sum:{$cond:{if:{$eq:["$status","APPROVED"]}, then:1, else:0}}}
            }
        },
        {
            $project:{
                _id:0,
                total:1,
                data:{
                    audited:"$_id",
                    uploaded:"$count",
                    pending:"$pending",
                    rejected:"$rejected",
                    approved:"$approved"
                }
            }
        },
        {
            $group:{
                _id:null,
                total:{$first:"$total"},
                data:{$push:"$data"}
            }
        },
        {
            $project:{
                _id:0,
                total:1,
                data:1
            }
        }
    ];
    try {
        let data = await UlbFinancialData.aggregate(query).exec();
        return Response.OK(res, modifyData(data));
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e)
    }
}
module.exports.statewise = async (req, res)=>{
    let financialYear = req.query.financialYear;
    let query = [
        {
            $lookup:{
                from:"overallulbs",
                localField:"_id",
                foreignField:"state",
                as :"overallulbs"
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                code:1,
                total:{$size:"$overallulbs"}
            }
        },
        {
            $lookup:{
                from:"ulbs",
                let :{ state : "$_id" },
                pipeline:[
                    { $match: { $expr:{ $eq: [ "$state",  "$$state" ]}}},
                    {
                        $lookup:{
                            from:"ulbfinancialdatas",
                            localField:"_id",
                            foreignField:"ulb",
                            as : "ulbfinancialdatas"
                        }
                    },
                    {$unwind: "$ulbfinancialdatas"},
                    {$match:{"ulbfinancialdatas.financialYear" : financialYear}},
                    {
                        $project:{
                            audited:"$ulbfinancialdatas.audited",
                            status:"$ulbfinancialdatas.status"
                        }
                    },
                    {
                        $group:{
                            _id:"$audited",
                            count:{$sum:1},
                            pending:{$sum:{$cond:{if:{$eq:["$status","PENDING"]}, then:1, else:0}}},
                            rejected:{$sum:{$cond:{if:{$eq:["$status","REJECTED"]}, then:1, else:0}}},
                            approved:{$sum:{$cond:{if:{$eq:["$status","APPROVED"]}, then:1, else:0}}}
                        }
                    },
                    {
                        $project:{
                            _id:0,
                            audited:"$_id",
                            count:1,
                            pending:1,
                            rejected:1,
                            approved:1
                        }
                    }
                ],
                as : "data"
            }
        }
    ];
    try {
        let data = await State.aggregate(query).exec();
        return Response.OK(res, modifyData(data));
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e)
    }
}
module.exports.ulbtypewise = async (req, res)=>{
    let financialYear = req.query.financialYear;
    let query = [
        {
            $lookup:{
                from:"ulbs",
                let:{ulbType:"$_id"},
                pipeline:[
                    {$match:{ $expr : { $eq:["$ulbType","$$ulbType"]}}},
                    {
                        $lookup:{
                            from:"ulbfinancialdatas",
                            localField:"_id",
                            foreignField:"ulb",
                            as : "ulbfinancialdatas"
                        }
                    },
                    {$unwind: "$ulbfinancialdatas"},
                    {$match:{"ulbfinancialdatas.financialYear" : financialYear}},
                    {
                        $project:{
                            audited:"$ulbfinancialdatas.audited",
                            status:"$ulbfinancialdatas.status"
                        }
                    },
                    {
                        $group:{
                            _id:"$audited",
                            count:{$sum:1},
                            pending:{$sum:{$cond:{if:{$eq:["$status","PENDING"]}, then:1, else:0}}},
                            rejected:{$sum:{$cond:{if:{$eq:["$status","REJECTED"]}, then:1, else:0}}},
                            approved:{$sum:{$cond:{if:{$eq:["$status","APPROVED"]}, then:1, else:0}}}
                        }
                    },
                    {
                        $project:{
                            _id:0,
                            audited:"$_id",
                            count:1,
                            pending:1,
                            rejected:1,
                            approved:1
                        }
                    }
                ],
                as : "data"
            }
        },
        {
            $project:{
                name:1,
                data:1
            }
        }

    ];
    try {
        let data = await UlbType.aggregate(query).exec();
        return Response.OK(res, modifyData(data));
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e)
    }
}
module.exports.stateandulbtypewise = async (req, res)=>{
    let financialYear = req.query.financialYear;
    let query = [
        {
            $project:{
                _id:1,
                name:1,
                code:1
            }
        },
        {
            $lookup:{
                from:"ulbtypes",
                let:{state:"$_id"},
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            name:1
                        }
                    },
                    {
                        $lookup:{
                            from:"ulbs",
                            let:{ulbType:"$_id",state:"$$state"},
                            pipeline:[
                                { $match: { $expr:{$and:[{ $eq: [ "$state",  "$$state" ]},{ $eq: [ "$ulbType",  "$$ulbType" ]}]}}},
                                {
                                    $project:{
                                        _id:1
                                    }
                                }
                            ],
                            as:"ulbs"
                        }
                    },
                    {$unwind:{path:"$ulbs", preserveNullAndEmptyArrays:true}},
                    {
                        $lookup:{
                            from:"ulbfinancialdatas",
                            let:{ulb:"$ulbs._id"},
                            pipeline:[
                                {$match:{"financialYear" : financialYear}},
                                { $match: { $expr:{ $eq: [ "$ulb",  "$$ulb" ] }}},
                                {
                                    $project:{
                                        _id:1,
                                        name:1,
                                        audited:1,
                                        status:1
                                    }
                                },
                                {
                                    $group:{
                                        _id:"$audited",
                                        count:{$sum:1},
                                        pending:{$sum:{$cond:{if:{$eq:["$status","PENDING"]}, then:1, else:0}}},
                                        rejected:{$sum:{$cond:{if:{$eq:["$status","REJECTED"]}, then:1, else:0}}},
                                        approved:{$sum:{$cond:{if:{$eq:["$status","APPROVED"]}, then:1, else:0}}}
                                    }
                                }
                            ],
                            as : "data"
                        }
                    },
                    {
                        $project:{
                            _id:1,
                            name:1,
                            data:1
                        }
                    }
                ],
                as:"ulbTypes"
            }
        }
    ];
    try {
        let data = await State.aggregate(query).exec();
        for(el of data){
            el["ulbTypes"] = modifyData(el.ulbTypes)
        }
        return Response.OK(res, data);
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e)
    }
}
module.exports.chart = async (req, res)=>{
    try {
        let financialYear = req.query.financialYear;
        let q = [];
        if(financialYear){
            q.push({$match:{financialYear:financialYear}});
        }
        let query =  q.concat([
            {
                $project:{
                    _id:1,
                    ulb:1,
                    status:1
                }
            },
            {
                $lookup:{
                    from:"ulbs",
                    localField:"ulb",
                    foreignField:"_id",
                    as:"ulb"
                }
            },
            {$unwind:"$ulb"},
            {
                $group:{
                    _id:"$ulb.state",
                    count:{$sum:1},
                    pending:{$sum:{$cond:{if:{$eq:["$status","PENDING"]}, then:1, else:0}}},
                    rejected:{$sum:{$cond:{if:{$eq:["$status","REJECTED"]}, then:1, else:0}}},
                    approved:{$sum:{$cond:{if:{$eq:["$status","APPROVED"]}, then:1, else:0}}}
                }
            },
            {
                $lookup:{
                    from:"states",
                    localField:"_id",
                    foreignField:"_id",
                    as:"state"
                }
            },
            {$unwind:"$state"},
            {
                $project:{
                    _id:"$state._id",
                    name:"$state.name",
                    code:"$state.code",
                    count:1,
                    pending:1,
                    rejected:1,
                    approved:1
                }
            }
        ]);
        let data = await UlbFinancialData.aggregate(query).exec();
        return Response.OK(res, data);
    }catch (e) {
        console.log("Exception",e);
        return Response.DbError(res,e);
    }
}
function modifyData(arr) {
    for(let el of arr){
        el["data"] = formatData(el.data);
    }
    return arr;
}
function formatData(data) {
    if(data.length){
        if(data.length ==1){
            if(data[0].audited){
                return [
                    data[0],
                    {
                        "count" : 0,
                        "pending" : 0,
                        "rejected" : 0,
                        "approved" : 0,
                        "audited" : false
                    }
                ]
            }else{
                return [
                    {
                        "count" : 0,
                        "pending" : 0,
                        "rejected" : 0,
                        "approved" : 0,
                        "audited" : true
                    },
                    data[0]
                ]
            }
        }else{
            if(data[0].audited){
                return data;
            }else{
                return [
                    data[1],
                    data[0]
                ]
            }
        }
    }else{
        return [
            {
                "count" : 0,
                "pending" : 0,
                "rejected" : 0,
                "approved" : 0,
                "audited" : true
            },
            {
                "count" : 0,
                "pending" : 0,
                "rejected" : 0,
                "approved" : 0,
                "audited" : false
            }
        ];
    }
}