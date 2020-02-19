const moment = require('moment');
const UlbLedger = require("../../../models/Schema/UlbLedger");
const ITEMS = require('./itemcode').REVENUE_EXPENDITURE_SOURCES;
module.exports = async (req, res, next)=>{
    let queryArr = req.body.queryArr;
    let data =  [];
    for(query of queryArr){
        let obj = { year: query.financialYear, data:[]};
        for(d of query.data){
            let q = getAggregatedDataQuery(query.financialYear, d.range, d.ulb,d.totalUlb);
            try{
                let ulbData = await UlbLedger.aggregate(q).exec();
                if(ulbData.length){
                    obj["data"].push(getDeficit(ulbData[0]));
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
        message:"Data fetched.",
        data:data
    });
    /*return res.status(200).json({
        timestamp:moment().unix(),
        success:true,
        message:"",
        data:[
            {
                year:"2016-17",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        ownRevenue:1000,
                        interestIncome: 10000,
                        deficitFinanceByCapitalGrants:10,
                        assignedRevenueAndRevenueGrants:8,
                        otherIncome:20
                    }
                ]
            }
        ].map(d=>{
            return {
                year:d.year,
                data: d.data.map(m=>{
                    m["ulbName"] = 'E';
                    return m;
                })
            }
        })
    })*/
}
const getAggregatedDataQuery = (financialYear, populationCategory, ulbs, totalUlb)=>{

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
            $lookup:{
                from : "lineitems",
                localField:"lineItem",
                foreignField:"_id",
                as : "lineItem"
            }
        },
        { $unwind : "$lineItem"},
        {
            $group:{
                _id:{ulb:"$ulb",financialYear:"$financialYear"},
                populationCategory:{$first:"$populationCategory"},
                numOfUlb:{$first:{ $size:"$ulbs"}},
                ownRevenue:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.OWN_REVENUE]}, '$amount', 0]}},
                interestIncome:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.INTEREST_INCOME]}, '$amount', 0]}},
                assignedRevenueAndCompensation:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.ASSIGN_REVENUE_AND_COMPENSATION]}, '$amount', 0]}},
                revenueGrantsContributionAndSubsidies:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.REVENUE_GRANTS_CONTRIBNUTIONS_SUBSIDIES]}, '$amount', 0]}},
                saleAndHireCharges:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.SALE_AND_HIRE_CHARGES]}, '$amount', 0]}},
                otherIncome:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.OTHER_INCOME]}, '$amount', 0]}},
                totalExpediture:{$sum:{$cond: [{$in: ['$lineItem.code', ITEMS.TOTAL_EXPENDITURE]}, '$amount', 0]}},
            }
        },
        {
            $lookup:{
                from : "ulbs",
                localField:"_id.ulb",
                foreignField:"_id",
                as : "ulb"
            }
        },
        { $unwind : "$ulb"},
        {
            $group:{
                _id:"$financialYear",
                populationCategory:{$first:"$populationCategory"},
                numOfUlb:{$first:"$numOfUlb"},
                ulbs:{
                  $push:{
                      _id:"$ulb._id",
                      name:"$ulb.name",
                      population:"$ulb.population",
                      populationCategory:"$populationCategory",
                      ownRevenue:"$ownRevenue",
                      interestIncome:"$interestIncome",
                      assignedRevenueAndCompensation:"$assignedRevenueAndCompensation",
                      revenueGrantsContributionAndSubsidies:"$revenueGrantsContributionAndSubsidies",
                      saleAndHireCharges:"$saleAndHireCharges",
                      otherIncome:"$otherIncome",
                      totalExpediture:"$totalExpediture", 
                      deficitFinanceByCapitalGrants:{$toInt: "0"},
                  }
                },
                ownRevenue:{$sum:"$ownRevenue"},
                interestIncome:{$sum:"$interestIncome"},
                assignedRevenueAndCompensation:{$sum:"$assignedRevenueAndCompensation"},
                revenueGrantsContributionAndSubsidies:{$sum:"$revenueGrantsContributionAndSubsidies"},
                saleAndHireCharges:{$sum:"$saleAndHireCharges"},
                otherIncome:{$sum:"$otherIncome"},
                totalExpediture:{$sum:"$totalExpediture"},
            }
        },
        {
            $project:{
                _id:0,
                populationCategory:"$populationCategory",
                numOfUlb:1,
                ulbs:1,
                ownRevenue:1,
                assignedRevenueAndCompensation:1,
                saleAndHireCharges:1,
                revenueGrantsContributionAndSubsidies:1,
                interestIncome:1,
                otherIncome:1,
                totalExpediture:1,
                deficitFinanceByCapitalGrants:{$toInt: "0"},
            }
        },
        {$addFields : {
                totalUlb : totalUlb
            }
        }
    ];
}
const getDeficit = (d = {})=>{
    // let d = JSON.parse(JSON.stringify(o));
    let to = {};
    let remainingExpediture = d.totalExpediture;
    o.ulbs = d.ulbs;
    o.ownRevenueCoverPercentage = 0;
    o.assignedRevenueAndCompensationCoverPercentage = 0;
    o.saleAndHireChargesCoverPercentage = 0;
    o.revenueGrantsContributionAndSubsidiesCoverPercentage = 0;
    o.interestIncomeCoverPercentage = 0;
    o.otherIncomeCoverPercentage = 0;
    o.deficitFinanceByCapitalGrantsCoverPercentage = 0;
    let arr = [];
    d.ulbs = d.ulbs.map(d=>{
        let o = {};
        let remainingExpediture = d.totalExpediture;
        o.ownRevenueCoverPercentage = 0;
        o.assignedRevenueAndCompensationCoverPercentage = 0;
        o.saleAndHireChargesCoverPercentage = 0;
        o.revenueGrantsContributionAndSubsidiesCoverPercentage = 0;
        o.interestIncomeCoverPercentage = 0;
        o.otherIncomeCoverPercentage = 0;
        o.deficitFinanceByCapitalGrantsCoverPercentage = 0;
        if(d.ownRevenue >= remainingExpediture){
            o.ownRevenueCoverPercentage = 100;
            totalExpediture = 0;
        }else {
            remainingExpediture = remainingExpediture - d.ownRevenue;
            o.ownRevenueCoverPercentage = (d.ownRevenue/d.totalExpediture)*100;
    
            if(d.assignedRevenueAndCompensation >= remainingExpediture){
                o.assignedRevenueAndCompensationCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                totalExpediture = 0;
            }else {
                remainingExpediture = remainingExpediture - d.assignedRevenueAndCompensation;
                o.assignedRevenueAndCompensationCoverPercentage = (d.assignedRevenueAndCompensation/d.totalExpediture)*100;
    
                if(d.saleAndHireCharges >= remainingExpediture){
                    d.saleAndHireChargesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                    totalExpediture = 0;
                } else {
                    remainingExpediture = remainingExpediture - d.saleAndHireCharges;
                    o.saleAndHireChargesCoverPercentage = (d.saleAndHireCharges/d.totalExpediture)*100;
    
                    if(d.revenueGrantsContributionAndSubsidies >= remainingExpediture){
                        d.revenueGrantsContributionAndSubsidiesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                        totalExpediture = 0;
                    }else {
                        remainingExpediture = remainingExpediture - d.revenueGrantsContributionAndSubsidies;
                        o.revenueGrantsContributionAndSubsidiesCoverPercentage = (d.revenueGrantsContributionAndSubsidies/d.totalExpediture)*100;
                        if(d.interestIncome >= remainingExpediture){
                            d.interestIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                            totalExpediture = 0;
                        }else {
                            remainingExpediture = remainingExpediture - d.interestIncome;
                            o.interestIncomeCoverPercentage = (d.interestIncome/d.totalExpediture)*100;
                            if(d.otherIncome >= remainingExpediture){
                                o.otherIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                                totalExpediture = 0;
                            }else {
                                remainingExpediture = remainingExpediture - d.otherIncome;
                                o.otherIncomeCoverPercentage = (d.otherIncome/d.totalExpediture)*100;
    
                            }
                            if(remainingExpediture){
                                o.deficitFinanceByCapitalGrantsCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                            }
                        }
                    }
                }
            }
        }
        o.population = d.population
        o.name = d.name
        o.ownRevenueCoverPercentage = parseFloat(o.ownRevenueCoverPercentage.toFixed(2));
        o.assignedRevenueAndCompensationCoverPercentage = parseFloat(o.assignedRevenueAndCompensationCoverPercentage.toFixed(2));
        o.saleAndHireChargesCoverPercentage = parseFloat(o.saleAndHireChargesCoverPercentage.toFixed(2));
        o.revenueGrantsContributionAndSubsidiesCoverPercentage = parseFloat(o.revenueGrantsContributionAndSubsidiesCoverPercentage.toFixed(2));
        o.interestIncomeCoverPercentage = parseFloat(o.interestIncomeCoverPercentage.toFixed(2));
        o.otherIncomeCoverPercentage = parseFloat(o.otherIncomeCoverPercentage.toFixed(2));
        o.deficitFinanceByCapitalGrantsCoverPercentage = parseFloat(o.deficitFinanceByCapitalGrantsCoverPercentage.toFixed(2));
        o.population = d.population;
        arr.push(o);
    })
    if(d.ownRevenue >= remainingExpediture){
        o.ownRevenueCoverPercentage = 100;
        totalExpediture = 0;
    }else {
        remainingExpediture = remainingExpediture - d.ownRevenue;
        o.ownRevenueCoverPercentage = (d.ownRevenue/d.totalExpediture)*100;

        if(d.assignedRevenueAndCompensation >= remainingExpediture){
            o.assignedRevenueAndCompensationCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
            totalExpediture = 0;
        }else {
            remainingExpediture = remainingExpediture - d.assignedRevenueAndCompensation;
            o.assignedRevenueAndCompensationCoverPercentage = (d.assignedRevenueAndCompensation/d.totalExpediture)*100;

            if(d.saleAndHireCharges >= remainingExpediture){
                d.saleAndHireChargesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                totalExpediture = 0;
            } else {
                remainingExpediture = remainingExpediture - d.saleAndHireCharges;
                o.saleAndHireChargesCoverPercentage = (d.saleAndHireCharges/d.totalExpediture)*100;

                if(d.revenueGrantsContributionAndSubsidies >= remainingExpediture){
                    d.revenueGrantsContributionAndSubsidiesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                    totalExpediture = 0;
                }else {
                    remainingExpediture = remainingExpediture - d.revenueGrantsContributionAndSubsidies;
                    o.revenueGrantsContributionAndSubsidiesCoverPercentage = (d.revenueGrantsContributionAndSubsidies/d.totalExpediture)*100;
                    if(d.interestIncome >= remainingExpediture){
                        d.interestIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                        totalExpediture = 0;
                    }else {
                        remainingExpediture = remainingExpediture - d.interestIncome;
                        o.interestIncomeCoverPercentage = (d.interestIncome/d.totalExpediture)*100;
                        if(d.otherIncome >= remainingExpediture){
                            o.otherIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                            totalExpediture = 0;
                        }else {
                            remainingExpediture = remainingExpediture - d.otherIncome;
                            o.otherIncomeCoverPercentage = (d.otherIncome/d.totalExpediture)*100;

                        }
                        if(remainingExpediture){
                            o.deficitFinanceByCapitalGrantsCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                        }
                    }
                }
            }
        }
    }
    o["ulbs"] = arr;
    o.ownRevenueCoverPercentage = parseFloat(o.ownRevenueCoverPercentage.toFixed(2));
    o.assignedRevenueAndCompensationCoverPercentage = parseFloat(o.assignedRevenueAndCompensationCoverPercentage.toFixed(2));
    o.saleAndHireChargesCoverPercentage = parseFloat(o.saleAndHireChargesCoverPercentage.toFixed(2));
    o.revenueGrantsContributionAndSubsidiesCoverPercentage = parseFloat(o.revenueGrantsContributionAndSubsidiesCoverPercentage.toFixed(2));
    o.interestIncomeCoverPercentage = parseFloat(o.interestIncomeCoverPercentage.toFixed(2));
    o.otherIncomeCoverPercentage = parseFloat(o.otherIncomeCoverPercentage.toFixed(2));
    o.deficitFinanceByCapitalGrantsCoverPercentage = parseFloat(o.deficitFinanceByCapitalGrantsCoverPercentage.toFixed(2));
    o.populationCategory = d.populationCategory;
    // o.coveredPercentage = parseFloat(o.coveredPercentage.toFixed(2));
    /**/
    return JSON.parse(JSON.stringify(o));
}