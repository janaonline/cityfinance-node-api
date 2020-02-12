const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');
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

module.exports = async (req, res, next) => {

    try {
        let query;
        let output = [];
        for (let q of req.body.queryArr) {
            let obj = {
                year: q.financialYear,
                data: []
            };
            for (let d of q.data) {
                query = getQuery(q.financialYear, d.range, d.ulb);
                let data = await UlbLedger.aggregate(query);
                if(data.length){
                    obj['data'].push(modifyData(data[0]));
                }
            }
            obj.data = calcualteTotal(obj.data, ['numOfUlb','ownRevenue','revenueExpenditure','ownRevenuePercentage']);
            output.push(obj);
        }
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: '',
            data: output
        });
    } catch (error) {
        console.log("exception",error);
    }
};
const getData = ()=>{
    return [
        {
            year: "2016-17",
            data: [
                {
                    populationCategory: "> 10 Lakhs",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                },
                {
                    populationCategory: "1Lakh to 10Lakhs",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                },
                {
                    populationCategory: "< 1 Lakh",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                }
            ]
        },
        {
            year: "2017-18",
            data: [
                {
                    populationCategory: "> 10 Lakhs",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                },
                {
                    populationCategory: "1Lakh to 10Lakhs",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                },
                {
                    populationCategory: "< 1 Lakh",
                    numOfUlb: 100,
                    ownRevenue: 1000,
                    revenueExpenditure: 10000,
                    ownRevenuePercentage: 10,
                    minOwnRevenuePercentage: 8,
                    maxOwnRevenuePercentage: 20
                }
            ]
        }
    ].map(d => {
        return {
            year: d.year,
            data: d.data.map(m => {
                m["ulbName"] = 'C';
                return m;
            })
        }
    });
}
const getQuery = (financialYear, range, ulbs)=>{
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
            $project: {
                financialYear: '$_id.financialYear',
                range: '$_id.range',
                ulb: '$_id.ulb',
                ownRevenue: 1,
                revenueExpenditure: 1,
                ownRevenuePercentageUlB: {
                    $cond: [
                        { $ne: ['$revenueExpenditure', 0] },
                        {
                            $multiply: [
                                { $divide: ['$ownRevenue', '$revenueExpenditure'] },
                                100
                            ]
                        },
                        0
                    ]
                }
            }
        },
        // stage 7
        {
            $lookup:{
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb"
            }
        },
        {$unwind:"$ulb"},
        // stage 8

        {
            $group: {
                _id: {
                    financialYear: '$_id.financialYear',
                    range: '$_id.range'
                },
                ulbs:{
                    $push:{
                        _id:"$ulb._id",
                        name:"$ulb.name",
                        population:"$ulb.population",
                        ownRevenue: '$ownRevenue',
                        revenueExpenditure:'$revenueExpenditure',
                        ownRevenuePercentage: {
                            $cond: {
                                if: {
                                    $eq:["$revenueExpenditure",0]
                                },
                                then: 0,
                                else: { $multiply: [{$divide:["$ownRevenue","$revenueExpenditure"]},100]}
                            }
                        }
                    }
                },
                minOwnRevenuePercentage: { $min: '$ownRevenuePercentageUlB' },
                maxOwnRevenuePercentage: { $max: '$ownRevenuePercentageUlB' },
                ownRevenue: { $sum: '$ownRevenue' },
                revenueExpenditure: { $sum: '$revenueExpenditure' },
                noOfUlb: { $sum: 1 }
            }
        },

        // stage 9

        {
            $project: {
                _id: 0,
                populationCategory: '$_id.range',
                numOfUlb: '$noOfUlb',
                ulbs:"$ulbs",
                ownRevenue: '$ownRevenue',
                revenueExpenditure: '$revenueExpenditure',
                ownRevenuePercentage: {
                    $multiply: [
                        { $divide: ['$ownRevenue', '$revenueExpenditure'] },
                        100
                    ]
                },
                minOwnRevenuePercentage: '$minOwnRevenuePercentage',
                maxOwnRevenuePercentage: '$maxOwnRevenuePercentage'
            }
        }
    ]
}
const modifyData = (obj)=>{

    obj["ownRevenue"] = convertToCrores(obj.ownRevenue);
    obj["revenueExpenditure"] = convertToCrores(obj.revenueExpenditure);

    obj["ownRevenuePercentage"] = obj.ownRevenuePercentage.toFixed(2);
    obj["minOwnRevenuePercentage"] = obj.minOwnRevenuePercentage.toFixed(2);
    obj["maxOwnRevenuePercentage"] = obj.maxOwnRevenuePercentage.toFixed(2);
    obj["ulbs"] = obj.ulbs.map(m=>{
        m.ownRevenue = convertToCrores(m.ownRevenue);
        m.revenueExpenditure = convertToCrores(m.revenueExpenditure);

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
        obj[k] = obj[k].toFixed(2);

    }
    for(el of arr){
        for(k in el){
            if(k.includes('ercentage')){
                el[k] = el[k]+"%";
            }
        }
    }
    arr.push(obj);
    return arr;
}