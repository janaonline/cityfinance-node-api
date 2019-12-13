const Ulb = require("../../models/Schema/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const CONSTANTS = require("../../_helper/constants")
module.exports = async(req, res)=>{
    let populationRange = CONSTANTS.POPULATION_DROPDOWN;
    try{
        let finYears = ["2015-16","2016-17"];
        try {
            if(req.query.financialYear){
                finYears = req.query.financialYear.split(",");
            }
        }catch (e) {
            console.log("req.query Exception",e.message)
        }
        if(req.body.financialYear && req.body.financialYear.length){
            finYears = req.body.financialYear;
        }
        let condition = {};
        req.body.ulbId ? condition["_id"] = req.body.ulbId : "";
        req.body.ulbCode ? condition["code"] = req.body.ulbCode : "";

        if(req.body.populationId){
            let pop = populationRange.find(f=> f._id == req.body.populationId);
            if(pop){
                condition["population"] = pop.condition;
            }
        }
        let sortBy = {overallIndexScore:-1};
        let groupBy = {ulb:"$ulbledgers.ulb",financialYear:"$ulbledgers.financialYear"};
        let data = await Ulb.aggregate([
            {
                $lookup:{
                    from:"states",
                    localField:"state",
                    foreignField:"_id",
                    as : "state"
                }
            },
            {$unwind:"$state"},
            {
                $lookup:{
                    from:"ulbtypes",
                    localField:"ulbType",
                    foreignField:"_id",
                    as : "ulbType"
                }
            },
            {$unwind:"$ulbType"},
            {
                $lookup:{
                    from:"ulbledgers",
                    localField:"_id",
                    foreignField:"ulb",
                    as : "ulbledgers"
                }
            },
            {$unwind:"$ulbledgers"},
            {$match:{"ulbledgers.financialYear" : {$in : finYears}}},
            {
                $lookup:{
                    from:"lineitems",
                    localField:"ulbledgers.lineItem",
                    foreignField:"_id",
                    as : "lineItem"
                }
            },
            {$unwind:"$lineItem"},
            {
                $group:{
                    _id : groupBy,
                    state:{$first:"$state"},
                    code:{$first:"$code"},
                    name:{$first:"$name"},
                    ulbType:{$first:"$ulbType"},
                    population:{$first:"$population"},
                    area:{$first:"$area"},
                    wards:{$first:"$wards"},
                    natureOfUlb:{$first:"$natureOfUlb"},
                    amrut:{$first:"$amrut"},
                    auditReport: {$sum:{$cond : [{ $eq : ["$lineItem.code","1001"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    balanceSheet: {$sum:{$cond : [{ $eq : ["$lineItem.code","1002"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    incomeEpenditure: {$sum:{$cond : [{ $eq : ["$lineItem.code","1003"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    schedule: {$sum:{$cond : [{ $eq : ["$lineItem.code","1004"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    trialBalance: {$sum:{$cond : [{ $eq : ["$lineItem.code","1005"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    notesToAccounts: {$sum:{$cond : [{ $eq : ["$lineItem.code","1006"]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},

                    ownRevenue: {$sum:{$cond : [{ $in : ["$lineItem.code",["110","130","140","150"]]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    totalRevenueExpenditure: {$sum:{$cond:[{ $in : ["$lineItem.code",["210","220","230","240","250","260","270","271","272","200"]]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    totalDebt: {$sum:{$cond :[{ $in : ["$lineItem.code",["330","331"]]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    totalRevenue: {$sum:{$cond : [{ $in : ["$lineItem.code",["110","120","130","140","150","160","170","171","180","100"]]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}},
                    netReceivables :{$sum:{$cond : [{ $in : ["$lineItem.code",["431","432"]]},{$convert:{input:"$ulbledgers.amount",to:"double",onError:0,onNull:0}},0]}}
                }
            },
            {
                $project:{
                    ulb:"$_id.ulb",
                    financialYear:"$_id.financialYear",
                    state:1,
                    code:1,
                    name:1,
                    ulbType:1,
                    population:1,
                    area:1,
                    wards:1,
                    natureOfUlb:1,
                    amrut:1,
                    ownRevenue:1,
                    totalRevenueExpenditure:1,
                    totalDebt:1,
                    totalRevenue:1,
                    netReceivables:1,

                    debtServicePercentage: {$multiply:[{$cond: [{ $eq: [ "$totalDebt", 0 ] }, 0, {"$divide":[{ $subtract:["$totalRevenue","$totalRevenueExpenditure"]}, "$totalDebt"]} ] },100]},
                    collectionEfficiencyPercentage: {$multiply:[{$cond: [{ $eq:[ "$ownRevenue", 0 ] }, 0, {"$divide":["$netReceivables", "$ownRevenue"]} ] },100]},
                    ownRevenuePercentage:{$multiply:[{$cond:[{$eq:["$totalRevenueExpenditure",0]},0,{"$divide":["$ownRevenue","$totalRevenueExpenditure"]}]},100]},
                    financialAccountabilityPercentage:{$multiply:[{$sum:["$auditReport","$balanceSheet","$incomeEpenditure","$notesToAccounts",{"$cond":[{"$or":[{"$gt":["$schedule",0]},{"$gt":["$trialBalance",0]}]},200,0]}]},100]}
                }
            },
            {
                $group:{
                    _id:"$financialYear",

                    maxOwnRevenuePercentage:{$max:"$ownRevenuePercentage"},
                    minOwnRevenuePercentage:{$min:"$ownRevenuePercentage"},

                    maxCollectionEfficiencyPercentage:{$max:"$collectionEfficiencyPercentage"},
                    minCollectionEfficiencyPercentage:{$min:"$collectionEfficiencyPercentage"},

                    maxDebtServicePercentage:{$max:"$debtServicePercentage"},
                    minDebtServicePercentage:{$min:"$debtServicePercentage"},

                    maxFinancialAccountabilityPercentage:{$max:"$financialAccountabilityPercentage"},
                    minFinancialAccountabilityPercentage:{$min:"$financialAccountabilityPercentage"},

                    data : {
                        $push : {
                            state:"$state",
                            ulb:"$ulb",
                            code:"$code",
                            name:"$name",
                            ulbType:"$ulbType",
                            population:"$population",
                            area:"$area",
                            wards:"$wards",
                            natureOfUlb:"$natureOfUlb",
                            amrut:"$amrut",
                            financialYear:"$financialYear",
                            ownRevenue:"$ownRevenue",
                            totalRevenueExpenditure:"$totalRevenueExpenditure",
                            totalDebt:"$totalDebt",
                            totalRevenue:"$totalRevenue",
                            netReceivables:"$netReceivables",

                            debtServicePercentage:"$debtServicePercentage",
                            collectionEfficiencyPercentage:"$collectionEfficiencyPercentage",
                            ownRevenuePercentage:"$ownRevenuePercentage",
                            financialAccountabilityPercentage:"$financialAccountabilityPercentage"
                        }
                    }
                }
            },
            {$unwind:"$data"},
            {
                $project:{
                    "maxOwnRevenuePercentage" : 1,
                    "minOwnRevenuePercentage" : 1,

                    "maxCollectionEfficiencyPercentage" : 1,
                    "minCollectionEfficiencyPercentage" : 1,

                    "maxDebtServicePercentage" : 1,
                    "minDebtServicePercentage" : 1,

                    "maxFinancialAccountabilityPercentage" : 1,
                    "minFinancialAccountabilityPercentage" : 1,

                    "ulb":"$data.ulb",
                    "state":{
                        "_id" : "$data.state._id",
                        "name":"$data.state.name",
                        "code":"$data.state.code"
                    },
                    "ulbType":{
                        "_id":"$data.ulbType._id",
                        "name":"$data.ulbType.name"
                    },
                    "code":"$data.code",
                    "name":"$data.name",
                    "population":"$data.population",
                    "area":"$data.area",
                    "wards":"$data.wards",
                    "natureOfUlb":"$data.natureOfUlb",
                    "amrut":"$data.amrut",
                    "financialYear":"$data.financialYear",
                    "ownRevenue":"$data.ownRevenue",
                    "totalRevenueExpenditure":"$data.totalRevenueExpenditure",
                    "totalDebt":"$data.totalDebt",
                    "totalRevenue":"$data.totalRevenue",
                    "netReceivables":"$data.netReceivables",

                    "debtServicePercentage":"$data.debtServicePercentage",
                    "collectionEfficiencyPercentage":"$data.collectionEfficiencyPercentage",
                    "ownRevenuePercentage":"$data.ownRevenuePercentage",
                    "financialAccountabilityPercentage":"$data.financialAccountabilityPercentage",

                    "financialAccountabilityIndexScore":"$data.financialAccountabilityPercentage",
                    "financialPerformanceIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.ownRevenuePercentage","$minOwnRevenuePercentage"]},{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]}]}]},1000]},
                    "financialPositionCollectionEfficiencyIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},
                    "financialPositionDebtServiceIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]},
                    "financialPositionIndexScore":{"$sum":[{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]}]},

                    "overallIndexScore":{"$sum":[{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.ownRevenuePercentage","$minOwnRevenuePercentage"]},{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]},"$data.financialAccountabilityPercentage"]}
                }
            },
            {$sort:sortBy},
            {
                $group:{
                    _id:false,
                    data:{
                        $push :{
                            "maxOwnRevenuePercentage" : "$maxOwnRevenuePercentage",
                            "minOwnRevenuePercentage" : "$minOwnRevenuePercentage",

                            "maxCollectionEfficiencyPercentage" : "$maxCollectionEfficiencyPercentage",
                            "minCollectionEfficiencyPercentage" : "$minCollectionEfficiencyPercentage",

                            "maxDebtServicePercentage" : "$maxDebtServicePercentage",
                            "minDebtServicePercentage" : "$minDebtServicePercentage",

                            "maxFinancialAccountabilityPercentage" : "$minDebtServicePercentage",
                            "minFinancialAccountabilityPercentage" : "$minFinancialAccountabilityPercentage",

                            "ulb":"$ulb",
                            "state":"$state",
                            "ulbType":"$ulbType",
                            "code":"$code",
                            "name":"$name",
                            "population":"$population",
                            "area":"$area",
                            "wards":"$wards",
                            "natureOfUlb":"$natureOfUlb",
                            "amrut":"$amrut",
                            "financialYear":"$financialYear",
                            "ownRevenue":"$ownRevenue",
                            "totalRevenueExpenditure":"$totalRevenueExpenditure",
                            "totalDebt":"$totalDebt",
                            "totalRevenue":"$totalRevenue",
                            "netReceivables":"$netReceivables",

                            "debtServicePercentage":"$debtServicePercentage",
                            "collectionEfficiencyPercentage":"$collectionEfficiencyPercentage",
                            "ownRevenuePercentage":"$ownRevenuePercentage",
                            "financialAccountabilityPercentage":"$financialAccountabilityPercentage",

                            "financialAccountabilityIndexScore":"$financialAccountabilityIndexScore",
                            "financialPerformanceIndexScore":"$financialPerformanceIndexScore",
                            "financialPositionCollectionEfficiencyIndexScore":"$financialPositionCollectionEfficiencyIndexScore",
                            "financialPositionDebtServiceIndexScore":"$financialPositionDebtServiceIndexScore",
                            "financialPositionIndexScore":"$financialPositionIndexScore",

                            "overallIndexScore":"$overallIndexScore"
                        }
                    }
                }
            },
            {
                "$unwind": {
                    "path": "$data",
                    "includeArrayIndex": "nationalRanking"
                }
            },
            {
                $group:{
                    _id : "$data.state._id",
                    data:{$push:{data:"$data", nationalRanking:"$nationalRanking"}}
                }
            },
            {
                "$unwind": {
                    "path": "$data",
                    "includeArrayIndex": "stateRanking"
                }
            },
            {
                "$group": {
                    "_id": "$data.data.ulb",
                    "ulb": {
                        "$first": "$data.data.ulb"
                    },
                    "code": {
                        "$first": "$data.data.code"
                    },
                    "name": {
                        "$first": "$data.data.name"
                    },
                    "nationalRanking": {
                        "$first": {
                            "$toInt": {
                                "$sum": [
                                    "$data.nationalRanking",
                                    1
                                ]
                            }
                        }
                    },
                    "stateRanking": {
                        "$first": {
                            "$toInt": {
                                "$sum": [
                                    "$stateRanking",
                                    1
                                ]
                            }
                        }
                    },
                    "ulbType": {
                        "$first": "$data.data.ulbType"
                    },
                    "state": {
                        "$first": "$data.data.state"
                    },
                    "population": {
                        "$first": "$data.data.population"
                    },
                    "area": {
                        "$first": "$data.data.area"
                    },
                    "wards": {
                        "$first": "$data.data.wards"
                    },
                    "natureOfUlb": {
                        "$first": "$data.data.natureOfUlb"
                    },
                    "amrut": {
                        "$first": "$data.data.amrut"
                    },
                    "financialYear": {
                        "$first": "$data.data.financialYear"
                    },
                    "ownRevenue": {
                        "$avg": "$data.data.ownRevenue"
                    },
                    "totalRevenueExpenditure": {
                        "$avg": "$data.data.totalRevenueExpenditure"
                    },
                    "totalDebt": {
                        "$avg": "$data.data.totalDebt"
                    },
                    "totalRevenue": {
                        "$avg": "$data.data.totalRevenue"
                    },
                    "netReceivables": {
                        "$avg": "$data.data.netReceivables"
                    },
                    "debtServicePercentage": {
                        "$avg": "$data.data.debtServicePercentage"
                    },
                    "collectionEfficiencyPercentage": {
                        "$avg": "$data.data.collectionEfficiencyPercentage"
                    },
                    "ownRevenuePercentage": {
                        "$avg": "$data.data.ownRevenuePercentage"
                    },
                    "financialAccountabilityPercentage": {
                        "$avg": "$data.data.financialAccountabilityPercentage"
                    },
                    "financialAccountabilityIndexScore": {
                        "$avg": "$data.data.financialAccountabilityIndexScore"
                    },
                    "financialPerformanceIndexScore": {
                        "$avg": "$data.data.financialPerformanceIndexScore"
                    },
                    "financialPositionCollectionEfficiencyIndexScore": {
                        "$avg": "$data.data.financialPositionCollectionEfficiencyIndexScore"
                    },
                    "financialPositionDebtServiceIndexScore": {
                        "$avg": "$data.data.financialPositionDebtServiceIndexScore"
                    },
                    "financialPositionIndexScore": {
                        "$avg": "$data.data.financialPositionIndexScore"
                    },
                    "overallIndexScore": {
                        "$avg": "$data.data.overallIndexScore"
                    },
                    "maxOwnRevenuePercentage": {
                        "$avg": "$data.data.maxOwnRevenuePercentage"
                    },
                    "minOwnRevenuePercentage": {
                        "$avg": "$data.data.minOwnRevenuePercentage"
                    },
                    "maxCollectionEfficiencyPercentage": {
                        "$avg": "$data.data.maxCollectionEfficiencyPercentage"
                    },
                    "minCollectionEfficiencyPercentage": {
                        "$avg": "$data.data.minCollectionEfficiencyPercentage"
                    },
                    "maxDebtServicePercentage": {
                        "$avg": "$data.data.maxDebtServicePercentage"
                    },
                    "minDebtServicePercentage": {
                        "$avg": "$data.data.minDebtServicePercentage"
                    },
                    "maxFinancialAccountabilityPercentage": {
                        "$avg": "$data.data.maxFinancialAccountabilityPercentage"
                    },
                    "minFinancialAccountabilityPercentage": {
                        "$avg": "$data.data.minFinancialAccountabilityPercentage"
                    }
                }
            },
            {$sort:sortBy},
            {$match:condition}
        ]);
        return res.status(200).json({
            success:false,
            message:"Ulb ranking list",
            data:data
        })
    }catch (e) {
        console.log("Caught Error",e);
        return res.status(400).json({
            success:false,
            message:e.message
        })
    }
}
