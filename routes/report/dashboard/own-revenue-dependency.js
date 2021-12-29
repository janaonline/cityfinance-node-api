const moment = require('moment');
const UlbLedger = require('../../../models/UlbLedger');
const OverallUlb = require( '../../../models/OverallUlb' );
const ObjectId = require("mongoose").Types.ObjectId;


const ownRevenueCode = ['110', '130', '140'];
const revenueExpenditureCode = [
    '210',
    '220',
    '230',
    '240',
    '250',
    '260',
    '270',
    '271',
    '272',
    '200'
];
const Redis = require( '../../../service/redis' );


const ulbRevenueCount = async function ( req, res ) {

    const { financialyear } = req.headers;
    query = [{
        $match: {
            financialYear:  financialyear
        }},{
        $lookup:{
            from:"lineitems",
            localField:"lineItem",
            foreignField:"_id",
            as:"lineItem"
            }
        },{$unwind:"$lineItem"},{$group:{_id:"$lineItem.name",count:{$sum:1}}}]
    
        try {
            let count = await UlbLedger.aggregate( query );
            return res.status( 200 ).json( count );
        }
        catch ( err ) {
            return res.status( 400 ).json( err );
        }
    
}



const old = async (req, res, next) => {

    console.log("oldQuery", req)

    try {
        let query;
        let output = [];
        for ( let q of req.body.queryArr ) {
            let obj = {
                year: q.financialYear,
                data: []
            };
            let a = [];
            for (let d of q.data) {
                query = await getQuery( q.financialYear, d.range, d.ulb, d.totalUlb );
                let data = await UlbLedger.aggregate(query);
                if(data.length){
                    obj['data'].push(modifyData(data[0]));
                }
                // else{
                //     obj.data.push({
                //         "ownRevenueUlb": [],
                //         "audited": 0,
                //         "unaudited": 0,
                //         "populationCategory": d.range,
                //         "numOfUlb": 0,
                //         "ulbs":  [],
                //         "auditNA": 0,
                //         "ownRevenue": 0,
                //         "revenueExpenditure": 0,
                //         "ownRevenuePercentage": 0,
                //         "totalUlb": d.totalUlb,
                //         "maxOwnRevenuePercentage": {
                //             "name": "0",
                //             "value": "0"
                //         },
                //         "minOwnRevenuePercentage": {
                //             "name": "0",
                //             "value": "0"
                //         }
                //     })
                // }
            }
            //res.json({query})

            obj.data = calcualteTotal(obj.data, ['numOfUlb','ownRevenue','revenueExpenditure','totalUlb','audited','unaudited','auditNA']);
            output.push(obj);
        }
        let resData = [];
        if(req.query.ulbList && req.query.populationCategory){
            let years = req.body.queryArr.map(m=> m.financialYear);
            let year = years.length ? years[0] : '';
            if(output.length){
                let yearData = output.find(f=> f.year == year);
                if(yearData && yearData.data && yearData.data.length){
                    let pcatData = yearData.data.find(f=> f.populationCategory == req.query.populationCategory)
                    resData = pcatData ? pcatData.ulbs : []
                }
            }
        }else{
            if(output && !req.query.ulb){
                for(year of output){
                    if(year.data && year.data.length){
                        for(d of year.data){
                            d["ulbs"] = undefined;
                            d["ownRevenueUlb"] = undefined;
                        }
                    }
                }
            }
            resData = output;
        }
        Redis.set(req.redisKey,JSON.stringify(resData))
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: '',
            data: resData
        });
    } catch (error) {
        console.log("exception",error);
    }
};



const getQuery =async (financialYear, range, ulbs,totalUlb)=>{
    return [
        // stage 1
        {
            $match: {
                financialYear: financialYear,
                ulb: ulbs // $in added
            }
        },
        // stage 2
        {
            $lookup: {
                from: 'lineitems',
                as: 'lineitems',
                foreignField: '_id',
                localField: 'lineItem'
            }
        },
        // stage 3
        { $unwind: '$lineitems' },
        // stage 4
        {
            $project: {
                range: range,
                financialYear: 1,
                ulb: 1,
                amount: 1,
                code: '$lineitems.code'
            }
        },

        // stage 5
        {
            $group: {
                _id: {
                    financialYear: '$financialYear',
                    range: '$range',
                    ulb: '$ulb'
                },
                "audited": {
                    "$sum": {
                        "$cond": [
                            {
                                $and:[{"$eq": ["$code","1001"]},{"$gt": ["$amount",0]}]
                            },
                            1,
                            0
                        ]
                      }
                   },
                "unaudited": {
                    "$sum": {
                        "$cond": [
                        {
                            $and:[{"$eq": ["$code","1001"]},{"$eq": ["$amount",0]}]
                        },
                        1,
                        0
                    ]
                    }
                },
                ownRevenue: {
                    $sum: {
                        $cond: [{ $in: ['$code', ownRevenueCode] }, '$amount', 0]
                    }
                },
                revenueExpenditure: {
                    $sum: {
                        $cond: [
                            { $in: ['$code', revenueExpenditureCode] },
                            '$amount',
                            0
                        ]
                    }
                }
            }
        },

        // stage 6

        {
            "$project": {
                "financialYear": "$_id.financialYear",
                "range": "$_id.range",
                "ulb": "$_id.ulb",
                "audited" : 1,
                "unaudited" : 1,
                "auditNA" : {$cond : [ {$and:[    {"$eq": ["$audited",0] },{"$eq": ["$unaudited",0]}  ] }, 1,0 ]  },
                "ownRevenue": 1,
                "revenueExpenditure": 1,
                "ownRevenuePercentageUlB": {
                    "$cond": [
                        {
                            "$ne": [
                                "$revenueExpenditure",
                                0
                            ]
                        },
                        {
                            "$multiply": [
                                {
                                    "$divide": [
                                        "$ownRevenue",
                                        "$revenueExpenditure"
                                    ]
                                },
                                100
                            ]
                        },
                        0
                    ]
                }
            }
        },
        {
            "$lookup": {
                "from": "ulbs",
                "localField": "ulb",
                "foreignField": "_id",
                "as": "ulb"
            }
        },
        {
            "$unwind": "$ulb"
        },
        {
            "$group": {
                "_id": {
                    "financialYear": "$_id.financialYear",
                    "range": "$_id.range"
                },
                "ulbs": {
                    "$addToSet": {
                        "_id": "$ulb._id",
                        "name": "$ulb.name",
                        "population": "$ulb.population",
                        "audited" : "$audited",
                        "unaudited" : "$unaudited",
                        "auditNA" : "$auditNA",
                        "ownRevenue": "$ownRevenue",
                        "revenueExpenditure": "$revenueExpenditure",
                        "ownRevenuePercentage": {
                            "$cond": {
                                "if": {
                                    "$eq": [
                                        "$revenueExpenditure",
                                        0
                                    ]
                                },
                                "then": 0,
                                "else": {
                                    "$multiply": [
                                        {
                                            "$divide": [
                                                "$ownRevenue",
                                                "$revenueExpenditure"
                                            ]
                                        },
                                        100
                                    ]
                                }
                            }
                        }
                    }
                },
                "ownRevenueUlb": {
                    "$addToSet": {
                        "name": "$ulb.name",
                        "value": "$ownRevenuePercentageUlB"
                    }
                },
                "audited": {
                    "$sum": "$audited"
                },
                "unaudited": {
                    "$sum": "$unaudited"
                },
                "ownRevenue": {
                    "$sum": "$ownRevenue"
                },
                "revenueExpenditure": {
                    "$sum": "$revenueExpenditure"
                },
                "noOfUlb": {
                    "$sum": 1
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "populationCategory": "$_id.range",
                "numOfUlb": "$noOfUlb",
                "ulbs": "$ulbs",
                "audited":1,
                "unaudited" :1,
                "auditNA" : {$subtract : ["$noOfUlb",{$add : ["$audited","$unaudited"]} ] },
                "ownRevenue": "$ownRevenue",
                "revenueExpenditure": "$revenueExpenditure",
                "ownRevenuePercentage": {
                    "$cond": [
                        {
                            "$ne": [
                                "$revenueExpenditure",
                                0
                            ]
                        },
                        {
                            "$multiply": [
                                {
                                    "$divide": [
                                        "$ownRevenue",
                                        "$revenueExpenditure"
                                    ]
                                },
                                100
                            ]
                        },
                        0
                    ]
                },
                "ownRevenueUlb": 1
            }
        },
        {
            "$addFields": {
                "totalUlb": totalUlb
            }
        }
    ]
}
const modifyData = (obj)=>{
    obj["ownRevenue"] = obj["ownRevenue"];
    obj["revenueExpenditure"] = obj["revenueExpenditure"];
    obj["ownRevenuePercentage"] = obj.ownRevenuePercentage.toFixed(2);
    obj["ownRevenueUlb"] = obj["ownRevenueUlb"].sort(function(a, b){
        if (a.value < b.value) //sort string ascending
            return -1 
        if (a.value > b.value)
            return 1
        return 0 //default return value (no sorting)
    })
    obj["ownRevenueUlb"] = obj["ownRevenueUlb"].filter(f=> f.value >0 );
    obj["maxOwnRevenuePercentage"] = obj["ownRevenueUlb"] && obj["ownRevenueUlb"].length ? JSON.parse(JSON.stringify(obj["ownRevenueUlb"][obj["ownRevenueUlb"].length-1])):{name:"0",value:0};

    obj["minOwnRevenuePercentage"] = obj["ownRevenueUlb"] && obj["ownRevenueUlb"].length ? JSON.parse(JSON.stringify(obj["ownRevenueUlb"][0])):{name:"0",value:0};

    obj["maxOwnRevenuePercentage"].value = obj["maxOwnRevenuePercentage"].value.toFixed(2)
    obj["minOwnRevenuePercentage"].value = obj["minOwnRevenuePercentage"].value.toFixed(2)

    obj["ulbs"] = obj.ulbs.map(m=>{
        m.ownRevenue = m.ownRevenue;
        m.revenueExpenditure = m.revenueExpenditure;

        m.ownRevenuePercentage = m.ownRevenuePercentage.toFixed(2)+"%";
        return m;
    });
    return obj;
}
const convertToCrores = (num)=>{
    return (num/10000000).toFixed(2)
}
const calcualteTotal = (arr, keys)=>{
    let obj = {populationCategory : 'Total'};
    for(k of keys){
        obj[k] = 0;
        for(el of arr){
            obj[k] = obj[k] + Number(el[k]);
        }
        obj[k] = Number.isInteger(obj[k]) ? obj[k] : obj[k].toFixed(2);
    }
    obj["ownRevenuePercentage"] =  ((obj["ownRevenue"]/obj["revenueExpenditure"])*100).toFixed(2);
    arr.push(obj);
    for(el of arr){
        for(k in el){
            if(k.includes('ercentage') && k!="maxOwnRevenuePercentage" && k!="minOwnRevenuePercentage") {
                el[k] = el[k]+"%";
            }else if(k=="maxOwnRevenuePercentage" || k=="minOwnRevenuePercentage"){
                el[k].value = el[k].value+"%";
            }
        }
    }
    return arr;
}

module.exports = {
    old,
    ulbRevenueCount,
}