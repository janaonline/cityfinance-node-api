const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const CONSTANTS = require("../../_helper/constants")
module.exports = async(req, res)=>{
    let populationRange = CONSTANTS.POPULATION_DROPDOWN;
    try{
        let finYears = ["2015-16","2016-17"];

        // Extract the financial year, if coming in query or body parameter
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

        // Set in condition if ulbId or ulbCode is there in query params
        req.query.ulbId ? condition["ulb"] = ObjectId(req.query.ulbId) : "";
        req.query.ulbCode ? condition["code"] = req.query.ulbCode : "";

        // Set in condition if ulbId or ulbCode is there in body params
        req.body.ulbId ? condition["ulb"] = ObjectId(req.body.ulbId) : "";
        req.body.ulbCode ? condition["code"] = req.body.ulbCode : "";

        let populationCondition = [];
        if(req.body.populationId || req.query.populationId){
            // If any particular population filter is coming
            let pop = populationRange.find(f=> (f._id == req.body.populationId || f._id == req.query.populationId));

            // Filter all the population, and get its condition for population match
            if(pop && Object.keys(pop.condition).length){
                populationCondition = [ {$match :{ "population":pop.condition } } ];
            }
        }

        let groupBy = { ulb:"$ulbledgers.ulb",financialYear:"$ulbledgers.financialYear" };

        let query = [...populationCondition, ...getQuery(finYears,groupBy),{$match:condition}]
        
        let data = await Ulb.aggregate(query);
        
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
    function getQuery(finYears,groupBy) {
        return [
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
            {$match:{ "ulbType.name":{$in : ["Municipality","Town Panchayat","Municipal Corporation"]}}},
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
                    financialAccountabilityPercentage:{"$multiply":[{"$divide":[{"$sum":["$auditReport","$balanceSheet","$incomeEpenditure","$notesToAccounts",{"$cond":[{"$or":[{"$gt":["$schedule",0]},{"$gt":["$trialBalance",0]}]},200,0]}]},1000]},100]},
                    financialAccountabilityIndexScore:{"$sum":["$auditReport","$balanceSheet","$incomeEpenditure","$notesToAccounts",{"$cond":[{"$or":[{"$gt":["$schedule",0]},{"$gt":["$trialBalance",0]}]},200,0]}]}
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
                            financialAccountabilityPercentage:"$financialAccountabilityPercentage",
                            financialAccountabilityIndexScore:"$financialAccountabilityIndexScore"
                        }
                    }
                }
            },
            {$unwind:"$data"},
            //{$match:{"data.code":"JH012"}},
            {
                $addFields: {
                    "maxOwnRevenuePercentage":"$maxOwnRevenuePercentage",
                    "minOwnRevenuePercentage":"$minOwnRevenuePercentage",

                    "maxCollectionEfficiencyPercentage":"$maxCollectionEfficiencyPercentage",
                    "minCollectionEfficiencyPercentage":"$minCollectionEfficiencyPercentage",

                    "maxDebtServicePercentage":"$maxDebtServicePercentage",
                    "minDebtServicePercentage":"$minDebtServicePercentage",

                    "maxFinancialAccountabilityPercentage":"$maxFinancialAccountabilityPercentage",
                    "minFinancialAccountabilityPercentage":"$minFinancialAccountabilityPercentage"
                }
            },
            {
                $group:{
                    _id : {"ulb":"$data.ulb", "financialYear":"$data.financialYear"},
                    "maxOwnRevenuePercentage" : {"$first":"$maxOwnRevenuePercentage"},
                    "minOwnRevenuePercentage" : {"$first":"$minOwnRevenuePercentage"},

                    "maxCollectionEfficiencyPercentage" : {"$first":"$maxCollectionEfficiencyPercentage"},
                    "minCollectionEfficiencyPercentage" : {"$first":"$minCollectionEfficiencyPercentage"},

                    "maxDebtServicePercentage" : {"$first":"$maxDebtServicePercentage"},
                    "minDebtServicePercentage" : {"$first":"$minDebtServicePercentage"},

                    "maxFinancialAccountabilityPercentage" : {"$first":"$maxFinancialAccountabilityPercentage"},
                    "minFinancialAccountabilityPercentage" : {"$first":"$minFinancialAccountabilityPercentage"},
                    "data" : {
                        $push : {
                            state:"$data.state",
                            ulb:"$data.ulb",
                            code:"$data.code",
                            name:"$data.name",
                            ulbType:"$data.ulbType",
                            population:"$data.population",
                            area:"$data.area",
                            wards:"$data.wards",
                            natureOfUlb:"$data.natureOfUlb",
                            amrut:"$data.amrut",
                            financialYear:"$data.financialYear",
                            ownRevenue:"$data.ownRevenue",
                            totalRevenueExpenditure:"$data.totalRevenueExpenditure",
                            totalDebt:"$data.totalDebt",
                            totalRevenue:"$data.totalRevenue",
                            netReceivables:"$data.netReceivables",

                            debtServicePercentage:"$data.debtServicePercentage",
                            collectionEfficiencyPercentage:"$data.collectionEfficiencyPercentage",
                            ownRevenuePercentage:"$data.ownRevenuePercentage",
                            financialAccountabilityPercentage:"$data.financialAccountabilityPercentage",
                            financialAccountabilityIndexScore:"$data.financialAccountabilityIndexScore"
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

                    "financialPositionCollectionEfficiencyIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},
                    "financialPositionDebtServiceIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]},

                    "financialAccountabilityIndexScore":"$data.financialAccountabilityIndexScore",
                    "financialPerformanceIndexScore":{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.ownRevenuePercentage","$minOwnRevenuePercentage"]},{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]}]}]},1000]},
                    "financialPositionIndexScore":{"$sum":[{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]}]},
                    "overallIndexScore":{"$sum":[{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.ownRevenuePercentage","$minOwnRevenuePercentage"]},{"$subtract":["$maxOwnRevenuePercentage","$minOwnRevenuePercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]},0]},0,{"$divide":[{"$subtract":["$maxCollectionEfficiencyPercentage","$data.collectionEfficiencyPercentage"]},{"$subtract":["$maxCollectionEfficiencyPercentage","$minCollectionEfficiencyPercentage"]}]}]},1000]},{"$multiply":[{"$cond":[{"$eq":[{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]},0]},0,{"$divide":[{"$subtract":["$data.debtServicePercentage","$minDebtServicePercentage"]},{"$subtract":["$maxDebtServicePercentage","$minDebtServicePercentage"]}]}]},1000]},"$data.financialAccountabilityIndexScore"]}
                }
            },
            {
                $group:{
                    _id : "$ulb",

                    "financialPositionDebtServiceIndexScore": {"$avg":"$financialPositionDebtServiceIndexScore"},
                    "financialPositionCollectionEfficiencyIndexScore": {"$avg":"$financialPositionCollectionEfficiencyIndexScore"},

                    "overallIndexScore": {"$avg":"$overallIndexScore"},
                    "financialPerformanceIndexScore": {"$avg":"$financialPerformanceIndexScore"},
                    "financialPositionIndexScore": {"$avg":"$financialPositionIndexScore"},
                    "financialAccountabilityIndexScore": {"$avg":"$financialAccountabilityIndexScore"},

                    "debtServicePercentage": {"$avg":"$debtServicePercentage"},
                    "collectionEfficiencyPercentage": {"$avg":"$collectionEfficiencyPercentage"},
                    "ownRevenuePercentage": {"$avg":"$ownRevenuePercentage"},
                    "financialAccountabilityPercentage": {"$avg":"$financialAccountabilityPercentage"},

                    "ulb": {"$first":"$ulb"},
                    "state":{"$first":"$state"},
                    "ulbType":{"$first":"$ulbType"},
                    "code":{"$first":"$code"},
                    "name":{"$first":"$name"},
                    "population":{"$first":"$population"},
                    "area":{"$first":"$area"},
                    "wards":{"$first":"$wards"},
                    "natureOfUlb":{"$first":"$natureOfUlb"},
                    "amrut":{"$first":"$amrut"},

                    "ownRevenue": {"$avg":"$ownRevenue"},
                    "totalRevenueExpenditure": {"$avg":"$totalRevenueExpenditure"},
                    "totalDebt":{"$avg":"$totalDebt"},
                    "totalRevenue":{"$avg":"$totalRevenue"},
                    "netReceivables":{"$avg":"$netReceivables"},
                }
            },
            {$sort:{"overallIndexScore":-1}},
            {
                $group:{
                    _id:false,

                    nationalAverageOverallIndexScore:{"$avg":"$overallIndexScore"},
                    nationalAverageFinancialPerformanceIndexScore:{"$avg":"$financialPerformanceIndexScore"},
                    nationalAverageFinancialPositionDebtServiceIndexScore:{"$avg":"$financialPositionDebtServiceIndexScore"},
                    nationalAverageFinancialPositionCollectionEfficiencyIndexScore:{"$avg":"$financialPositionCollectionEfficiencyIndexScore"},
                    nationalAverageFinancialPositionIndexScore:{"$avg":"$financialPositionIndexScore"},
                    nationalAverageFinancialAccountabilityIndexScore:{"$avg":"$financialAccountabilityIndexScore"},

                    nationalAverageDebtServicePercentage:{"$avg":"$debtServicePercentage"},
                    nationalAverageCollectionEfficiencyPercentage:{"$avg":"$collectionEfficiencyPercentage"},
                    nationalAverageOwnRevenuePercentage:{"$avg":"$ownRevenuePercentage"},
                    nationalAverageFinancialAccountabilityPercentage:{"$avg":"$financialAccountabilityPercentage"},

                    data:{
                        $push :{
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
                    "data.nationalAverageFinancialPositionDebtServiceIndexScore": "$nationalAverageFinancialPositionDebtServiceIndexScore",
                    "data.nationalAverageFinancialPositionCollectionEfficiencyIndexScore": "$nationalAverageFinancialPositionCollectionEfficiencyIndexScore",
                    "data.nationalAverageFinancialPositionIndexScore": "$nationalAverageFinancialPositionIndexScore",
                    "data.nationalAverageFinancialAccountabilityIndexScore": "$nationalAverageFinancialAccountabilityIndexScore",


                    "data.nationalOverallRanking": "$nationalOverallRanking",

                    "data.nationalAverageDebtServicePercentage": "$nationalAverageDebtServicePercentage",
                    "data.nationalAverageCollectionEfficiencyPercentage": "$nationalAverageCollectionEfficiencyPercentage",
                    "data.nationalAverageOwnRevenuePercentage": "$nationalAverageOwnRevenuePercentage",
                    "data.nationalAverageFinancialAccountabilityPercentage": "$nationalAverageFinancialAccountabilityPercentage"
                }
            },
            {
                $group:{
                    _id : "$data.state._id",

                    stateAverageOverallIndexScore:{$avg:"$data.overallIndexScore"},
                    stateAverageFinancialPerformanceIndexScore:{$avg:"$data.financialPerformanceIndexScore"},

                    stateAverageFinancialPositionCollectionEfficiencyIndexScore:{$avg:"$data.financialPositionCollectionEfficiencyIndexScore"},
                    stateAverageFinancialPositionDebtServiceIndexScore:{$avg:"$data.financialPositionDebtServiceIndexScore"},

                    stateAverageFinancialPositionIndexScore:{$avg:"$data.financialPositionIndexScore"},
                    stateAverageFinancialAccountabilityIndexScore:{$avg:"$data.financialAccountabilityIndexScore"},

                    stateAverageDebtServicePercentage:{$avg:"$data.debtServicePercentage"},
                    stateAverageCollectionEfficiencyPercentage:{$avg:"$data.collectionEfficiencyPercentage"},
                    stateAverageOwnRevenuePercentage:{$avg:"$data.ownRevenuePercentage"},
                    stateAverageFinancialAccountabilityPercentage:{$avg:"$data.financialAccountabilityPercentage"},
                    data:{$push:"$data"}
                }
            },
            {"$unwind":{"path":"$data","includeArrayIndex":"stateOverallRanking"}},
            {
                $addFields: {
                    "data.stateAverageOverallIndexScore": "$stateAverageOverallIndexScore",
                    "data.stateAverageFinancialPerformanceIndexScore": "$stateAverageFinancialPerformanceIndexScore",
                    "data.stateAverageFinancialPositionCollectionEfficiencyIndexScore": "$stateAverageFinancialPositionCollectionEfficiencyIndexScore",
                    "data.stateAverageFinancialPositionDebtServiceIndexScore": "$stateAverageFinancialPositionDebtServiceIndexScore",
                    "data.stateAverageFinancialPositionIndexScore": "$stateAverageFinancialPositionIndexScore",
                    "data.stateAverageFinancialAccountabilityIndexScore": "$stateAverageFinancialAccountabilityIndexScore",

                    "data.stateAverageDebtServicePercentage": "$stateAverageDebtServicePercentage",
                    "data.stateAverageCollectionEfficiencyPercentage": "$stateAverageCollectionEfficiencyPercentage",
                    "data.stateAverageOwnRevenuePercentage": "$stateAverageOwnRevenuePercentage",
                    "data.stateAverageFinancialAccountabilityPercentage": "$stateAverageFinancialAccountabilityPercentage",

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

            // Start:Financial Position Collection Efficiency
            {$sort:{"data.financialPositionCollectionEfficiencyIndexScore":-1}},
            {$group:{_id:false,data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"nationalFinancialPositionCollectionEfficiencyRanking"}},
            {$addFields: {"data.nationalFinancialPositionCollectionEfficiencyRanking": "$nationalFinancialPositionCollectionEfficiencyRanking"}},

            {$sort:{"data.financialPositionCollectionEfficiencyIndexScore":-1}},
            {$group:{_id:"$data.state._id",data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"stateFinancialPositionCollectionEfficiencyRanking"}},
            {$addFields: {"data.stateFinancialPositionCollectionEfficiencyRanking": "$stateFinancialPositionCollectionEfficiencyRanking"}},
            // End:Financial Position Collection Efficiency

            // Start:Financial Position Debt Service
            {$sort:{"data.financialPositionDebtServiceIndexScore":-1}},
            {$group:{_id:false,data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"nationalFinancialPositionDebtServiceRanking"}},
            {$addFields: {"data.nationalFinancialPositionDebtServiceRanking": "$nationalFinancialPositionDebtServiceRanking"}},

            {$sort:{"data.financialPositionDebtServiceIndexScore":-1}},
            {$group:{_id:"$data.state._id",data:{$push:"$data"}}},
            {"$unwind":{"path":"$data","includeArrayIndex":"stateFinancialPositionDebtServiceRanking"}},
            {$addFields: {"data.stateFinancialPositionDebtServiceRanking": "$stateFinancialPositionDebtServiceRanking"}},
            // End:Financial Position Debt Service

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
                "$project": {
                    "_id": "$data.ulb",
                    "ulb": "$data.ulb",
                    "code": "$data.code",
                    "name": "$data.name",
                    "ulbType":"$data.ulbType",
                    "state": "$data.state",
                    "population":"$data.population",
                    "area":"$data.area",
                    "wards":"$data.wards",
                    "natureOfUlb":"$data.natureOfUlb",
                    "amrut":"$data.amrut",

                    "ownRevenue":"$data.ownRevenue",
                    "totalRevenueExpenditure":"$data.totalRevenueExpenditure",
                    "totalDebt":"$data.totalDebt",
                    "totalRevenue":"$data.totalRevenue",
                    "netReceivables":"$data.netReceivables",

                    "debtServicePercentage":"$data.debtServicePercentage",
                    "collectionEfficiencyPercentage":"$data.collectionEfficiencyPercentage",
                    "ownRevenuePercentage":"$data.ownRevenuePercentage",
                    "financialAccountabilityPercentage":"$data.financialAccountabilityPercentage",

                    "stateAverageDebtServicePercentage": "$data.stateAverageDebtServicePercentage",
                    "stateAverageCollectionEfficiencyPercentage": "$data.stateAverageCollectionEfficiencyPercentage",
                    "stateAverageOwnRevenuePercentage": "$data.stateAverageOwnRevenuePercentage",
                    "stateAverageFinancialAccountabilityPercentage": "$data.stateAverageFinancialAccountabilityPercentage",

                    "nationalAverageDebtServicePercentage": "$data.nationalAverageDebtServicePercentage",
                    "nationalAverageCollectionEfficiencyPercentage": "$data.nationalAverageCollectionEfficiencyPercentage",
                    "nationalAverageOwnRevenuePercentage": "$data.nationalAverageOwnRevenuePercentage",
                    "nationalAverageFinancialAccountabilityPercentage": "$data.nationalAverageFinancialAccountabilityPercentage",


                    "financialPositionCollectionEfficiencyIndexScore":"$data.financialPositionCollectionEfficiencyIndexScore",
                    "financialPositionDebtServiceIndexScore":"$data.financialPositionDebtServiceIndexScore",

                    "financialAccountabilityIndexScore":"$data.financialAccountabilityIndexScore",
                    "financialPerformanceIndexScore":"$data.financialPerformanceIndexScore",
                    "financialPositionIndexScore":"$data.financialPositionIndexScore",
                    "overallIndexScore":"$data.overallIndexScore",

                    "nationalAverageFinancialPositionDebtServiceIndexScore":{"$toInt":"$data.nationalAverageFinancialPositionDebtServiceIndexScore"},
                    "nationalAverageFinancialPositionCollectionEfficiencyIndexScore":{"$toInt":"$data.nationalAverageFinancialPositionCollectionEfficiencyIndexScore"},

                    "nationalAverageFinancialPerformanceIndexScore":{"$toInt":"$data.nationalAverageFinancialPerformanceIndexScore"},
                    "nationalAverageFinancialPositionIndexScore":{"$toInt":"$data.nationalAverageFinancialPositionIndexScore"},
                    "nationalAverageFinancialAccountabilityIndexScore":{"$toInt":"$data.nationalAverageFinancialAccountabilityIndexScore"},
                    "nationalAverageOverallIndexScore":{"$toInt":"$data.nationalAverageOverallIndexScore"},


                    "nationalOverallRanking": {"$toInt":{"$sum":["$data.nationalOverallRanking",1]}},
                    "nationalFinancialPositionCollectionEfficiencyRanking":{"$toInt":{"$sum":["$data.nationalFinancialPositionCollectionEfficiencyRanking",1]}},
                    "nationalFinancialPositionDebtServiceRanking":{"$toInt":{"$sum":["$data.nationalFinancialPositionDebtServiceRanking",1]}},
                    "nationalFinancialPositionRanking":{"$toInt":{"$sum":["$data.nationalFinancialPositionRanking",1]}},
                    "nationalFinancialPerformanceRanking":{"$toInt":{"$sum":["$data.nationalFinancialPerformanceRanking",1]}},
                    "nationalFinancialAccountabilityRanking":{"$toInt":{"$sum":["$data.nationalFinancialAccountabilityRanking",1]}},

                    "stateOverallRanking": {"$toInt":{"$sum":["$data.stateOverallRanking",1]}},
                    "stateFinancialPositionCollectionEfficiencyRanking":{"$toInt":{"$sum":["$data.stateFinancialPositionCollectionEfficiencyRanking",1]}},
                    "stateFinancialPositionDebtServiceRanking":{"$toInt":{"$sum":["$data.stateFinancialPositionDebtServiceRanking",1]}},
                    "stateFinancialPositionRanking":{"$toInt":{"$sum":["$data.stateFinancialPositionRanking",1]}},
                    "stateFinancialPerformanceRanking":{"$toInt":{"$sum":["$data.stateFinancialPerformanceRanking",1]}},
                    "stateFinancialAccountabilityRanking":{"$toInt":{"$sum":["$data.stateFinancialAccountabilityRanking",1]}}
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
                    "nationalAverageIndexScore": "$nationalAverageOverallIndexScore",
                    "maxOwnRevenuePercentage": "$maxOwnRevenuePercentage",
                    "minOwnRevenuePercentage": "$minOwnRevenuePercentage",
                    "maxCollectionEfficiencyPercentage": "$maxCollectionEfficiencyPercentage",
                    "minCollectionEfficiencyPercentage": "$minCollectionEfficiencyPercentage",
                    "maxDebtServicePercentage": "$maxDebtServicePercentage",
                    "minDebtServicePercentage": "$minDebtServicePercentage",
                    "maxFinancialAccountabilityPercentage": "$maxFinancialAccountabilityPercentage",
                    "minFinancialAccountabilityPercentage": "$minFinancialAccountabilityPercentage",

                    "nationalOverallRanking": "$nationalOverallRanking",
                    "stateOverallRanking": "$stateOverallRanking",
                    //
                    "nationalFinancialPositionCollectionEfficiencyRanking": "$nationalFinancialPositionCollectionEfficiencyRanking",
                    "stateFinancialPositionCollectionEfficiencyRanking": "$stateFinancialPositionCollectionEfficiencyRanking",
                    //
                    "nationalFinancialPositionDebtServiceRanking": "$nationalFinancialPositionDebtServiceRanking",
                    "stateFinancialPositionDebtServiceRanking": "$stateFinancialPositionDebtServiceRanking",
                    //

                    "nationalFinancialPositionRanking": "$nationalFinancialPositionRanking",
                    "stateFinancialPositionRanking": "$stateFinancialPositionRanking",

                    "nationalFinancialPerformanceRanking": "$nationalFinancialPerformanceRanking",
                    "stateFinancialPerformanceRanking": "$stateFinancialPerformanceRanking",

                    "nationalFinancialAccountabilityRanking": "$nationalFinancialAccountabilityRanking",
                    "stateFinancialAccountabilityRanking": "$stateFinancialAccountabilityRanking",

                    "stateAverageDebtServicePercentage":"$stateAverageDebtServicePercentage",
                    "stateAverageCollectionEfficiencyPercentage":"$stateAverageCollectionEfficiencyPercentage",
                    "stateAverageOwnRevenuePercentage":"$stateAverageOwnRevenuePercentage",
                    "stateAverageFinancialAccountabilityPercentage":"$stateAverageFinancialAccountabilityPercentage",

                    "nationalAverageDebtServicePercentage":"$nationalAverageDebtServicePercentage",
                    "nationalAverageCollectionEfficiencyPercentage":"$nationalAverageCollectionEfficiencyPercentage",
                    "nationalAverageOwnRevenuePercentage":"$nationalAverageOwnRevenuePercentage",
                    "nationalAverageFinancialAccountabilityPercentage":"$nationalAverageFinancialAccountabilityPercentage",

                    "nationalAverageOverallIndexScore":"$nationalAverageOverallIndexScore",
                    "nationalAverageFinancialPerformanceIndexScore":"$nationalAverageFinancialPerformanceIndexScore",
                    "nationalAverageFinancialPositionDebtServiceIndexScore":"$nationalAverageFinancialPositionDebtServiceIndexScore",
                    "nationalAverageFinancialPositionCollectionEfficiencyIndexScore":"$nationalAverageFinancialPositionCollectionEfficiencyIndexScore",
                    "nationalAverageFinancialPositionIndexScore":"$nationalAverageFinancialPositionIndexScore",
                    "nationalAverageFinancialAccountabilityIndexScore":"$nationalAverageFinancialAccountabilityIndexScore",

                    "stateAverageOverallIndexScore":"$stateAverageOverallIndexScore",
                    "stateAverageFinancialPerformanceIndexScore":"$stateAverageFinancialPerformanceIndexScore",
                    "stateAverageFinancialPositionIndexScore":"$stateAverageFinancialPositionIndexScore",
                    "stateAverageFinancialAccountabilityIndexScore":"$stateAverageFinancialAccountabilityIndexScore",


                    "financialParameters":[
                        {
                            "type":"Overall",
                            "nationalRank": "$nationalOverallRanking",
                            "stateRank": "$stateOverallRanking",
                            "indexScore":"$overallIndexScore",
                            "report":[
                                {
                                    "name":"Availability of Financial Inormation",
                                    "ratio":"$financialAccountabilityPercentage",
                                    "nationalAvgRatio":"$nationalAverageFinancialAccountabilityPercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialAccountabilityIndexScore",
                                    "indexScore":"$financialAccountabilityIndexScore",
                                    "nationalRank":"$nationalFinancialAccountabilityRanking",
                                    "stateRank":"$stateFinancialAccountabilityRanking"
                                },
                                {
                                    "name":"Own Revenue %",
                                    "ratio":"$ownRevenuePercentage",
                                    "nationalAvgRatio":"$nationalAverageOwnRevenuePercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPerformanceIndexScore",
                                    "indexScore":"$financialPerformanceIndexScore",
                                    "nationalRank":"$nationalFinancialPerformanceRanking",
                                    "stateRank":"$stateFinancialPerformanceRanking"
                                },
                                {
                                    "name":"Collection Efficiency %",
                                    "ratio":"$collectionEfficiencyPercentage",
                                    "nationalAvgRatio":"$nationalAverageCollectionEfficiencyPercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPositionCollectionEfficiencyIndexScore",
                                    "indexScore":"$financialPositionCollectionEfficiencyIndexScore",
                                    "nationalRank":"$nationalFinancialPositionCollectionEfficiencyRanking",
                                    "stateRank":"$stateFinancialPositionCollectionEfficiencyRanking"
                                },
                                {
                                    "name":"Debt Service Ratio %",
                                    "ratio":"$debtServicePercentage",
                                    "nationalAvgRatio":"$nationalAverageDebtServicePercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPositionDebtServiceIndexScore",
                                    "indexScore":"$financialPositionDebtServiceIndexScore",
                                    "nationalRank":"$nationalFinancialPositionDebtServiceRanking",
                                    "stateRank":"$stateFinancialPositionDebtServiceRanking"
                                }
                            ]
                        },
                        {
                            "type":"Financial Accountability",
                            "nationalRank": "$nationalFinancialAccountabilityRanking",
                            "stateRank": "$stateFinancialAccountabilityRanking",
                            "indexScore":"$financialAccountabilityIndexScore",
                            "report":[
                                {
                                    "name":"Availability of Financial Inormation",
                                    "ratio":"$financialAccountabilityPercentage",
                                    "nationalAvgRatio":"$nationalAverageFinancialAccountabilityPercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialAccountabilityIndexScore",
                                    "indexScore":"$financialAccountabilityIndexScore",
                                    "nationalRank":"$nationalFinancialAccountabilityRanking",
                                    "stateRank":"$stateFinancialAccountabilityRanking"
                                }
                            ]
                        },
                        {
                            "type":"Financial performance",
                            "nationalRank": "$nationalFinancialPerformanceRanking",
                            "stateRank": "$stateFinancialPerformanceRanking",
                            "indexScore":"$financialPerformanceIndexScore",
                            "report":[
                                {
                                    "name":"Own Revenue %",
                                    "ratio":"$ownRevenuePercentage",
                                    "nationalAvgRatio":"$nationalAverageOwnRevenuePercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPerformanceIndexScore",
                                    "indexScore":"$financialPerformanceIndexScore",
                                    "nationalRank":"$nationalFinancialPerformanceRanking",
                                    "stateRank":"$stateFinancialPerformanceRanking"
                                }
                            ]

                        },
                        {
                            "type":"Financial position",
                            "nationalRank": "$nationalFinancialPositionRanking",
                            "stateRank": "$stateFinancialPositionRanking",
                            "indexScore":"$financialPositionIndexScore",
                            "report":[
                                {
                                    "name":"Collection Efficiency %",
                                    "ratio":"$collectionEfficiencyPercentage",
                                    "nationalAvgRatio":"$nationalAverageCollectionEfficiencyPercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPositionCollectionEfficiencyIndexScore",
                                    "indexScore":"$financialPositionCollectionEfficiencyIndexScore",
                                    "nationalRank":"$nationalFinancialPositionCollectionEfficiencyRanking",
                                    "stateRank":"$stateFinancialPositionCollectionEfficiencyRanking"
                                },
                                {
                                    "name":"Debt Service Ratio %",
                                    "ratio":"$debtServicePercentage",
                                    "nationalAvgRatio":"$nationalAverageDebtServicePercentage",
                                    "nationalAvgIndexScore":"$nationalAverageFinancialPositionDebtServiceIndexScore",
                                    "indexScore":"$financialPositionDebtServiceIndexScore",
                                    "nationalRank":"$nationalFinancialPositionDebtServiceRanking",
                                    "stateRank":"$stateFinancialPositionDebtServiceRanking"
                                }
                            ]
                        }
                    ]

                }
            },
            {$sort:{"overallIndexScore":-1}},
        ];
    }
}
