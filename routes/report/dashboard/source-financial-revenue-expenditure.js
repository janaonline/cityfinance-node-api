const moment = require('moment');
const UlbLedger = require("../../../models/Schema/UlbLedger");
const ITEMS = require('./itemcode').REVENUE_EXPENDITURE_SOURCES;
module.exports = async (req, res, next)=>{
    let queryArr = req.body.queryArr;
    let data =  [];
    for(query of queryArr){
        let obj = { year: query.financialYear, data:[]};
        for(d of query.data){
            let q = getAggregatedDataQuery(query.financialYear, d.range, d.ulb);
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
const getAggregatedDataQuery = (financialYear, populationCategory, ulbs)=>{

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
                      ownRevenue:"$ownRevenue",
                      interestIncome:"$interestIncome",
                      assignedRevenueAndCompensation:"$assignedRevenueAndCompensation",
                      revenueGrantsContributionAndSubsidies:"$revenueGrantsContributionAndSubsidies",
                      saleAndHireCharges:"$saleAndHireCharges",
                      otherIncome:"$otherIncome",
                      totalExpediture:"$totalExpediture"
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
        }
    ];
}
const getDeficit = (d = {})=>{
    let remainingExpediture = d.totalExpediture;
    d.ownRevenueCoverPercentage = 0;
    d.assignedRevenueAndCompensationCoverPercentage = 0;
    d.saleAndHireChargesCoverPercentage = 0;
    d.revenueGrantsContributionAndSubsidiesCoverPercentage = 0;
    d.interestIncomeCoverPercentage = 0;
    d.otherIncomeCoverPercentage = 0;
    d.deficitFinanceByCapitalGrantsCoverPercentage = 0;
    if(d.ownRevenue >= remainingExpediture){
        d.ownRevenueCoverPercentage = 100;
        totalExpediture = 0;
    }else {
        remainingExpediture = remainingExpediture - d.ownRevenue;
        d.ownRevenueCoverPercentage = (d.ownRevenue/d.totalExpediture)*100;

        if(d.assignedRevenueAndCompensation >= remainingExpediture){
            d.assignedRevenueAndCompensationCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
            totalExpediture = 0;
        }else {
            remainingExpediture = remainingExpediture - d.assignedRevenueAndCompensation;
            d.assignedRevenueAndCompensationCoverPercentage = (d.assignedRevenueAndCompensation/d.totalExpediture)*100;

            if(d.saleAndHireCharges >= remainingExpediture){
                d.saleAndHireChargesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                totalExpediture = 0;
            } else {
                remainingExpediture = remainingExpediture - d.saleAndHireCharges;
                d.saleAndHireChargesCoverPercentage = (d.saleAndHireCharges/d.totalExpediture)*100;

                if(d.revenueGrantsContributionAndSubsidies >= remainingExpediture){
                    d.revenueGrantsContributionAndSubsidiesCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                    totalExpediture = 0;
                }else {
                    remainingExpediture = remainingExpediture - d.revenueGrantsContributionAndSubsidies;
                    d.revenueGrantsContributionAndSubsidiesCoverPercentage = (d.revenueGrantsContributionAndSubsidies/d.totalExpediture)*100;
                    if(d.interestIncome >= remainingExpediture){
                        d.interestIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                        totalExpediture = 0;
                    }else {
                        remainingExpediture = remainingExpediture - d.interestIncome;
                        d.interestIncomeCoverPercentage = (d.interestIncome/d.totalExpediture)*100;
                        if(d.otherIncome >= remainingExpediture){
                            d.otherIncomeCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                            totalExpediture = 0;
                        }else {
                            remainingExpediture = remainingExpediture - d.otherIncome;
                            d.otherIncomeCoverPercentage = (d.otherIncome/d.totalExpediture)*100;

                        }
                        if(remainingExpediture){
                            d.deficitFinanceByCapitalGrantsCoverPercentage = (remainingExpediture/d.totalExpediture)*100;
                        }
                    }
                }
            }
        }
    }
    d.coveredPercentage = (
        d.ownRevenueCoverPercentage
            +
        d.assignedRevenueAndCompensationCoverPercentage
            +
        d.saleAndHireChargesCoverPercentage
            +
        d.revenueGrantsContributionAndSubsidiesCoverPercentage
            +
        d.interestIncomeCoverPercentage
            +
        d.otherIncomeCoverPercentage
            +
        d.deficitFinanceByCapitalGrantsCoverPercentage
    )
    return d;
}