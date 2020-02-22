const moment = require('moment');
const UlbLedger = require("../../../models/Schema/UlbLedger");
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
    return res.status(200).json({
        timestamp:moment().unix(),
        success:true,
        message:"",
        data:data
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
                "bondsAndOtherDebtInstruments" : {
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
            }
        },
          {
        "$group": {
            "_id": {
                "financialYear": "$_id.financialYear",
                "range": "$_id.range"
            },
            "ulbs": {
                "$addToSet": {
                    "_id": "$_id.ulb",
                    "name": "$ulbName",
                    "population": "$ulbPopulation",
                    "LoanFromCentralGovernment" : "$LoanFromCentralGovernment",
                     "loanFromFIIB":  "$loanFromFIIB",
                    "loanFromStateGovernment":"$loanFromStateGovernment",
                    "bondsAndOtherDebtInstruments": "$bondsAndOtherDebtInstruments"
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
            }
        }
    },
    {
        "$project": {
            "_id": 0,
            "ulbs": 1,
            "populationCategory": "$populationCategory",
            "numOfUlb": 1,
            "LoanFromCentralGovernment": 1,
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