const moment = require('moment');
const UlbLedger = require("../../../models/Schema/UlbLedger");
module.exports = async (req, res, next)=>{
    let queryArr = req.body.queryArr;
    let data=  [];
    for(query of queryArr){
        let obj = { year: query.financialYear, data:[]};
        for(d of query.data){
            let q = getAggregatedDataQuery(query.financialYear, d.range, d.ulb);
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
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    }
                ]
            },
            {
                year:"2017-18",
                data:[
                    {
                        populationCategory:"> 10 Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"1Lakh to 10Lakhs",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    },
                    {
                        populationCategory:"< 1 Lakh",
                        numOfUlb:100,
                        LoanFromCentralGovernment:1000,
                        loanFromFIIB: 10000,
                        loanFromStateGovernment:10
                    }
                ]
            }
        ].map(d=>{
            return {
                year:d.year,
                data: d.data.map(m=>{
                    m["ulbName"] = 'C';
                    return m;
                })
            }
        })
    })
    */


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
                _id : "$financialYear",
                numOfUlb:{$first:{ $size:"$ulbs"}},
                populationCategory:{$first:"$populationCategory"},
                LoanFromCentralGovernment:{$sum:{$cond: [{$eq: ['$lineItem.code', "33001"]}, '$amount', 0]}},
                loanFromFIIB:{$sum:{$cond: [{$eq: ['$lineItem.code', "33002"]}, '$amount', 0]}},
                loanFromStateGovernment:{$sum:{$cond: [{$eq: ['$lineItem.code', "33003"]}, '$amount', 0]}},
                bondsAndOtherDebtInstruments:{$sum:{$cond: [{$eq: ['$lineItem.code', "33104"]}, '$amount', 0]}},
                others:{$sum:{$cond: [{$eq: ['$lineItem.code', "33100"]}, '$amount', 0]}},
            }
        },
        {
            $project:{
                _id:0,
                populationCategory:"$populationCategory",
                numOfUlb:1,
                LoanFromCentralGovernment:1,
                loanFromFIIB:1,
                loanFromStateGovernment:1,
                bondsAndOtherDebtInstruments:1,
                others:1,
                total:{$sum:["$LoanFromCentralGovernment","$loanFromFIIB","$loanFromStateGovernment","$bondsAndOtherDebtInstruments","$others"]}
            }
        }
    ];
}
const getSingleUlbDataQuery = (financialYear, populationCategory, ulb)=>{
    return [
        {
            $match : {
                financialYear:financialYear,
                ulb:ulb // contains $in
            }
        },
        {
            $addFields:{
                financialYear:financialYear,
                populationCategory:populationCategory
            }
        },
        {
            $lookup:{
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulb'
            }
        },
        {$unwind:'ulb'},
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
                _id : "$financialYear",
                name:{$first:"$ulb.name"},
                populationCategory:{$first:"$populationCategory"},
                LoanFromCentralGovernment:{$sum:{$cond: [{$eq: ['$lineItem.code', "33001"]}, '$amount', 0]}},
                loanFromFIIB:{$sum:{$cond: [{$eq: ['$lineItem.code', "33002"]}, '$amount', 0]}},
                loanFromStateGovernment:{$sum:{$cond: [{$eq: ['$lineItem.code', "33003"]}, '$amount', 0]}},
                bondsAndOtherDebtInstruments:{$sum:{$cond: [{$eq: ['$lineItem.code', "33104"]}, '$amount', 0]}},
                others:{$sum:{$cond: [{$eq: ['$lineItem.code', "33100"]}, '$amount', 0]}},
            }
        },
        {
            $project:{
                _id:0,
                populationCategory:"$populationCategory",
                name:1,
                LoanFromCentralGovernment:1,
                loanFromFIIB:1,
                loanFromStateGovernment:1,
                bondsAndOtherDebtInstruments:1,
                others:1,
                total:{$sum:["$LoanFromCentralGovernment","$loanFromFIIB","$loanFromStateGovernment","$bondsAndOtherDebtInstruments","$others"]}
            }
        }
    ];
}