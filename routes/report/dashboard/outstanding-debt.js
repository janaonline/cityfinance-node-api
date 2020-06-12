const moment = require('moment');
const UlbLedger = require("../../../models/UlbLedger");
const Redis = require('../../../service/redis');
module.exports = async (req, res, next)=>{
    let queryArr = req.body.queryArr;
    let data=  [];
    for(query of queryArr){
        let obj = { year: query.financialYear, data:[]};
        for(d of query.data){
            let q = getAggregatedDataQuery(query.financialYear, d.range, d.ulb,d.totalUlb);
            try{
                let ulbData = await UlbLedger.aggregate(q).exec();
                if(ulbData.length){
                    obj["data"].push(ulbData[0]);
                }
            }catch (e) {
                console.log("Exception",e);
            }
        }
        data.push(obj);
    }
    let resData = [];
    if(req.query.ulbList && req.query.populationCategory){
        let years = req.body.queryArr.map(m=> m.financialYear);
        let year = years.length ? years[0] : '';
        if(data.length){
            let yearData = data.find(f=> f.year == year);
            if(yearData && yearData.data && yearData.data.length){
                let pcatData = yearData.data.find(f=> f.populationCategory == req.query.populationCategory)
                resData = pcatData ? pcatData.ulbs : []
            }
        }
    }else{
        if(data && !req.query.ulb){
            for(year of data){
                if(year.data && year.data.length){
                    for(d of year.data){
                        d["ulbs"] = undefined;
                    }
                }
            }
        }
        resData = data;
    }
    Redis.set(req.redisKey,JSON.stringify(resData))
    return res.status(200).json({
        timestamp: moment().unix(),
        success: true,
        message: '',
        data: resData
    });
}
const getAggregatedDataQuery = (financialYear, populationCategory, ulbs,totalUlb)=>{
    return [
        {
          $match : {
              financialYear:financialYear,
              ulb:ulbs // contains $in
          }
        },
        {
            $addFields:{
                financialYear:financialYear,
                populationCategory:populationCategory,
                ulbs:ulbs["$in"]
            }
        },
        {
            "$lookup": {
                "from": "lineitems",
                "localField": "lineItem",
                "foreignField": "_id",
                "as": "lineItem"
            }
        },
        {
            "$unwind": "$lineItem"
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
                    "ulb": "$ulb",
                    "range": "$range",
                    "financialYear": "$financialYear"
                },
                "populationCategory": {
                    "$first": "$populationCategory"
                },
                "name": {$first : "$ulb.name"},
                "population": {$first :"$ulb.population"},
                "LoanFromCentralGovernment" : {
                    "$sum" : {
                       $switch: {
                          branches: [
                             { case: { $eq: [ "$lineItem.code", "33001" ] }, then:"$amount"},
                             { case: { $eq: [ "$lineItem.code", "33101" ] }, then: "$amount" }
                          ],
                          default:0
                       }
                    }
                },
                                    "loanFromFIIB" : {
                    "$sum" : {
                       $switch: {
                          branches: [
                             { case: { $eq: [ "$lineItem.code", "33003" ] }, then:"$amount"},
                             { case: { $eq: [ "$lineItem.code", "33103" ] }, then: "$amount" }
                          ],
                          default:0
                       }
                    }
                },
                                    "loanFromStateGovernment" : {
                    "$sum" : {
                       $switch: {
                          branches: [
                             { case: { $eq: [ "$lineItem.code", "33002" ] }, then:"$amount"},
                             { case: { $eq: [ "$lineItem.code", "33102" ] }, then: "$amount" }
                          ],
                          default:0
                       }
                    }
                },
                                    "bondsAndOtherDebtInstruments" : {
                    "$sum" : {
                       $switch: {
                          branches: [
                             { case: { $eq: [ "$lineItem.code", "33004" ] }, then:"$amount"},
                             { case: { $eq: [ "$lineItem.code", "33104" ] }, then: "$amount" }
                          ],
                          default:0
                       }
                    }
                },
                "others" : {
                    "$sum" : {
                       $switch: {
                          branches: [
                             { case: { $eq: [ "$lineItem.code", "33000" ] }, then:"$amount"},
                             { case: { $eq: [ "$lineItem.code", "33100" ] }, then: "$amount" }
                          ],
                          default:0
                       }
                    }
                },
                "numOfUlb": {
                    "$first": {
                        "$size": "$ulbs"
                    }
                },
                "audited": {
                    "$sum": {
                        "$cond": [
                            {
                                $and:[{"$eq": ["$lineItem.code","1001"]},{"$gt": ["$amount",0]}]
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
                            $and:[{"$eq": ["$lineItem.code","1001"]},{"$eq": ["$amount",0]}]
                        },
                        1,
                        0
                    ]
                    }
                },
            }
        },
          {
        "$group": {
            "_id": {
                "financialYear": "$_id.financialYear",
                "range": "$_id.range"
            },
            "populationCategory": {$first:"$populationCategory"},
            "numOfUlb": {$first:"$numOfUlb"},
            "ulbs": {
                "$addToSet": {
                    "_id": "$_id.ulb",
                    "name": "$name",
                    "population": "$population",
                    "LoanFromCentralGovernment" : "$LoanFromCentralGovernment",
                     "loanFromFIIB":  "$loanFromFIIB",
                    "loanFromStateGovernment":"$loanFromStateGovernment",
                    "bondsAndOtherDebtInstruments": "$bondsAndOtherDebtInstruments",
                    "audited" :"$audited",
                    "unaudited" :"$unaudited",
                    "auditNA" : {$cond : [ {$and:[    {"$eq": ["$audited",0] },{"$eq": ["$unaudited",0]}  ] }, 1,0 ]  },
                    "others" : "$others",
                    "total": {
                        "$sum": [
                            "$LoanFromCentralGovernment",
                            "$loanFromFIIB",
                            "$loanFromStateGovernment",
                            "$bondsAndOtherDebtInstruments",
                            "$others"
                        ]
                    }
                }
            },
            "LoanFromCentralGovernment": {
                "$sum": "$LoanFromCentralGovernment"
            },
            "loanFromFIIB": {
                "$sum": "$loanFromFIIB"
            },
            "loanFromStateGovernment": {
                "$sum": "$loanFromStateGovernment"
            },
            "bondsAndOtherDebtInstruments": {
                "$sum": "$bondsAndOtherDebtInstruments"
            },
            "others": {
                "$sum": "$others"
            },
            "audited" : {$sum : "$audited"},
            "unaudited" : {$sum : "$unaudited"},
            "numOfUlb" : {$sum:1}
        }
    },
    {
        "$project": {
            "_id": 0,
            "ulbs": 1,
            "populationCategory": "$populationCategory",
            "numOfUlb": 1,
            "LoanFromCentralGovernment": 1,
            "audited" : 1,
            "unaudited" : 1,
            "auditNA" : {$subtract : ["$numOfUlb",{$add : ["$audited","$unaudited"]} ] },
            "loanFromFIIB": 1,
            "loanFromStateGovernment": 1,
            "bondsAndOtherDebtInstruments": 1,
            "others": 1,
            "total": {
                "$sum": [
                    "$LoanFromCentralGovernment",
                    "$loanFromFIIB",
                    "$loanFromStateGovernment",
                    "$bondsAndOtherDebtInstruments",
                    "$others"
                ]
            }
        }
    },
        {$addFields: { totalUlb : totalUlb} }
    ];
}