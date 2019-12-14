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
            {$sort:{"overallIndexScore":-1}},
            {
                $group:{
                    _id:false,
                    nationalAverageOverallIndexScore:{"$avg":"$overallIndexScore"},
                    nationalAverageFinancialPerformanceIndexScore:{"$avg":"$financialPerformanceIndexScore"},
                    nationalAverageFinancialPositionIndexScore:{"$avg":"$financialPositionIndexScore"},
                    nationalAverageFinancialAccountabilityIndexScore:{"$avg":"$financialAccountabilityIndexScore"},
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
                    "includeArrayIndex": "nationalOverallRanking"
                }
            },
            {$sort:{"data.overallIndexScore":-1}},
            {
                $addFields: {
                    "data.nationalAverageOverallIndexScore": "$nationalAverageOverallIndexScore",
                    "data.nationalAverageFinancialPerformanceIndexScore": "$nationalAverageFinancialPerformanceIndexScore",
                    "data.nationalAverageFinancialPositionIndexScore": "$nationalAverageFinancialPositionIndexScore",
                    "data.nationalAverageFinancialAccountabilityIndexScore": "$nationalAverageFinancialAccountabilityIndexScore",
                    "data.nationalOverallRanking": "$nationalOverallRanking"
                }
            },
            {
                $group:{
                    _id : "$data.state._id",

                    stateAverageOverallIndexScore:{$avg:"$data.overallIndexScore"},
                    stateAverageFinancialPerformanceIndexScore:{$avg:"$data.financialPerformanceIndexScore"},
                    stateAverageFinancialPositionIndexScore:{$avg:"$data.financialPositionIndexScore"},
                    stateAverageFinancialAccountabilityIndexScore:{$avg:"$data.financialAccountabilityIndexScore"},

                    data:{$push:"$data"}
                }
            },
            {"$unwind":{"path":"$data","includeArrayIndex":"stateOverallRanking"}},
            {
                $addFields: {
                    "data.stateAverageOverallIndexScore": "$stateAverageOverallIndexScore",
                    "data.stateAverageFinancialPerformanceIndexScore": "$stateAverageFinancialPerformanceIndexScore",
                    "data.stateAverageFinancialPositionIndexScore": "$stateAverageFinancialPositionIndexScore",
                    "data.nationalAverageFinancialAccountabilityIndexScore": "$nationalAverageFinancialAccountabilityIndexScore",
                    "data.stateAverageFinancialAccountabilityIndexScore": "$stateAverageFinancialAccountabilityIndexScore",
                    "data.stateOverallRanking": "$stateOverallRanking"
                }
            },

            {$sort:{"data.financialPositionIndexScore":-1}},
            {$group:{_id:false,data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"nationalFinancialPositionRanking"}},
            {$addFields: {"data.nationalFinancialPositionRanking": "$nationalFinancialPositionRanking"}},
            {$sort:{"data.financialPositionIndexScore":-1}},
            {$group:{_id:"$data.state._id",data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"stateFinancialPositionRanking"}},
            {$addFields: {"data.stateFinancialPositionRanking": "$stateFinancialPositionRanking"}},

            {$sort:{"data.financialPerformanceIndexScore":-1}},
            {$group:{_id:false,data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"nationalFinancialPerformanceRanking"}},
            {$addFields: {"data.nationalFinancialPerformanceRanking": "$nationalFinancialPerformanceRanking"}},
            {$sort:{"data.financialPerformanceIndexScore":-1}},
            {$group:{_id:"$data.state._id",data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"stateFinancialPerformanceRanking"}},
            {$addFields: {"data.stateFinancialPerformanceRanking": "$stateFinancialPerformanceRanking"}},

            {$sort:{"data.financialAccountabilityIndexScore":-1}},
            {$group:{_id : false,data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex": "nationalFinancialAccountabilityRanking"}},
            {$addFields: {"data.nationalFinancialAccountabilityRanking": "$nationalFinancialAccountabilityRanking"}},
            {$sort:{"data.financialAccountabilityIndexScore":-1}},
            {$group:{_id : "$data.state._id",data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"stateFinancialAccountabilityRanking"}},
            {$addFields: {"data.stateFinancialAccountabilityRanking": "$stateFinancialAccountabilityRanking"}},
            {
                "$group": {
                    "_id": "$data.ulb",
                    "ulb": {"$first": "$data.ulb"},
                    "code": {"$first": "$data.code"},
                    "name": {"$first": "$data.name"},
                    "ulbType": {"$first": "$data.ulbType"},
                    "state": {"$first": "$data.state"},
                    "population": {"$first": "$data.population"},
                    "area": {"$first": "$data.area"},
                    "wards": {"$first": "$data.wards"},
                    "natureOfUlb": {"$first":"$data.natureOfUlb"},
                    "amrut":{"$first": "$data.amrut"},
                    "financialYear":{"$first":"$data.financialYear"},
                    "ownRevenue":{"$avg":"$data.ownRevenue"},
                    "totalRevenueExpenditure":{"$avg":"$data.totalRevenueExpenditure"},
                    "totalDebt":{"$avg":"$data.totalDebt"},
                    "totalRevenue":{"$avg":"$data.totalRevenue"},
                    "netReceivables":{"$avg":"$data.netReceivables"},
                    "debtServicePercentage":{"$avg":"$data.debtServicePercentage"},
                    "collectionEfficiencyPercentage":{"$avg":"$data.collectionEfficiencyPercentage"},
                    "ownRevenuePercentage":{"$avg":"$data.ownRevenuePercentage"},
                    "financialAccountabilityPercentage":{"$avg":"$data.financialAccountabilityPercentage"},
                    "financialAccountabilityIndexScore":{"$avg":"$data.financialAccountabilityIndexScore"},
                    "financialPerformanceIndexScore":{"$avg":"$data.financialPerformanceIndexScore"},
                    "financialPositionCollectionEfficiencyIndexScore":{"$avg":"$data.financialPositionCollectionEfficiencyIndexScore"},
                    "financialPositionDebtServiceIndexScore":{"$avg":"$data.financialPositionDebtServiceIndexScore"},
                    "financialPositionIndexScore":{"$avg":"$data.financialPositionIndexScore"},
                    "overallIndexScore":{"$avg":"$data.overallIndexScore"},
                    "nationalAverageIndexScore":{"$first":{"$toInt":"$data.nationalAverageIndexScore"}},
                    "maxOwnRevenuePercentage":{"$avg":"$data.maxOwnRevenuePercentage"},
                    "minOwnRevenuePercentage":{"$avg":"$data.minOwnRevenuePercentage"},
                    "maxCollectionEfficiencyPercentage":{"$avg": "$data.maxCollectionEfficiencyPercentage"},
                    "minCollectionEfficiencyPercentage":{"$avg":"$data.minCollectionEfficiencyPercentage"},
                    "maxDebtServicePercentage":{"$avg":"$data.maxDebtServicePercentage"},
                    "minDebtServicePercentage":{"$avg":"$data.minDebtServicePercentage"},
                    "maxFinancialAccountabilityPercentage":{"$avg":"$data.maxFinancialAccountabilityPercentage"},
                    "minFinancialAccountabilityPercentage":{"$avg":"$data.minFinancialAccountabilityPercentage"},

                    "nationalOverallRanking": {"$first":{"$toInt":{"$sum":["$data.nationalOverallRanking",1]}}},
                    "stateOverallRanking": {"$first":{"$toInt":{"$sum":["$data.stateOverallRanking",1]}}},

                    "nationalFinancialPositionRanking": {"$first":{"$toInt":{"$sum":["$data.nationalFinancialPositionRanking",1]}}},
                    "stateFinancialPositionRanking": {"$first":{"$toInt":{"$sum":["$data.stateFinancialPositionRanking",1]}}},

                    "nationalFinancialPerformanceRanking": {"$first":{"$toInt":{"$sum":["$data.nationalFinancialPerformanceRanking",1]}}},
                    "stateFinancialPerformanceRanking": {"$first":{"$toInt":{"$sum":["$data.stateFinancialPerformanceRanking",1]}}},

                    "nationalFinancialAccountabilityRanking": {"$first":{"$toInt":{"$sum":["$data.nationalFinancialAccountabilityRanking",1]}}},
                    "stateFinancialAccountabilityRanking": {"$first":{"$toInt":{"$sum":["$data.stateFinancialAccountabilityRanking",1]}}}
                }
            },
            {
                $project:{
                    "_id": "$_id",
                    "ulb": "$ulb",
                    "code": "$code",
                    "name": "$name",
                    "ulbType": "$ulbType",
                    "state": "$state",
                    "population": "$population",
                    "area": "$area",
                    "wards": "$wards",
                    "natureOfUlb": "$natureOfUlb",
                    "amrut": "$amrut",
                    "financialYear": "$financialYear",
                    "ownRevenue": "$ownRevenue",
                    "totalRevenueExpenditure": "$totalRevenueExpenditure",
                    "totalDebt": "$totalDebt",
                    "totalRevenue": "$totalRevenue",
                    "netReceivables": "$netReceivables",
                    "debtServicePercentage": "$debtServicePercentage",
                    "collectionEfficiencyPercentage": "$collectionEfficiencyPercentage",
                    "ownRevenuePercentage": "$ownRevenuePercentage",
                    "financialAccountabilityPercentage": "$financialAccountabilityPercentage",
                    "financialAccountabilityIndexScore": "$financialAccountabilityIndexScore",
                    "financialPerformanceIndexScore": "$financialPerformanceIndexScore",
                    "financialPositionCollectionEfficiencyIndexScore": "$financialPositionCollectionEfficiencyIndexScore",
                    "financialPositionDebtServiceIndexScore": "$financialPositionDebtServiceIndexScore",
                    "financialPositionIndexScore": "$financialPositionIndexScore",
                    "overallIndexScore": "$overallIndexScore",
                    "nationalAverageIndexScore": "$nationalAverageIndexScore",
                    "maxOwnRevenuePercentage": "$maxOwnRevenuePercentage",
                    "minOwnRevenuePercentage": "$minOwnRevenuePercentage",
                    "maxCollectionEfficiencyPercentage": "$maxCollectionEfficiencyPercentage",
                    "minCollectionEfficiencyPercentage": "$minCollectionEfficiencyPercentage",
                    "maxDebtServicePercentage": "$maxDebtServicePercentage",
                    "minDebtServicePercentage": "$minDebtServicePercentage",
                    "maxFinancialAccountabilityPercentage": "$maxFinancialAccountabilityPercentage",
                    "minFinancialAccountabilityPercentage": "$minFinancialAccountabilityPercentage",
                    "financialParameters": "$financialParameters",
                    "nationalOverallRanking": "$nationalOverallRanking",
                    "stateOverallRanking": "$stateOverallRanking",
                    "nationalFinancialPositionRanking": "$nationalFinancialPositionRanking",
                    "stateFinancialPositionRanking": "$stateFinancialPositionRanking",
                    "nationalFinancialPerformanceRanking": "$nationalFinancialPerformanceRanking",
                    "stateFinancialPerformanceRanking": "$stateFinancialPerformanceRanking",
                    "nationalFinancialAccountabilityRanking": "$nationalFinancialAccountabilityRanking",
                    "stateFinancialAccountabilityRanking": "$stateFinancialAccountabilityRanking",
                    "financialParameters":[
                        {
                            "type":"Overall",
                            "nationalRank": "$nationalOverallRanking",
                            "stateRank": "$stateOverallRanking",
                            "indexScore":"$overallIndexScore"

                        },
                        {
                            "type":"Financial Accountability",
                            "nationalRank": "$nationalFinancialAccountabilityRanking",
                            "stateRank": "$stateFinancialAccountabilityRanking",
                            "indexScore":"$financialAccountabilityIndexScore"
                        },
                        {
                            "type":"Financial performance",
                            "nationalRank": "$nationalFinancialPerformanceRanking",
                            "stateRank": "$stateFinancialPerformanceRanking",
                            "indexScore":"$financialPerformanceIndexScore"

                        },
                        {
                            "type":"Financial position",
                            "nationalRank": "$nationalFinancialPositionRanking",
                            "stateRank": "$stateFinancialPositionRanking",
                            "indexScore":"$financialPositionIndexScore"
                        }
                    ]

                }
            },
            {$sort:{"nationalOverallRanking":1}},
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
