const moment = require('moment');
const UlbLedger = require('../../../models/Schema/UlbLedger');

module.exports = async (req, res, next) => {
  try {
    let output = [];
    let query;
    //console.log(req.body.queryArr);
    for (let q of req.body.queryArr) {
      let obj = {
        year: q.financialYear,
        data: []
      };

      for (let d of q.data) {
        let range = d.range;
        let numOfUlb = Number(d.ulb['$in'].length);
        query = getQuery(q.financialYear, d.ulb, range, numOfUlb,d.totalUlb);
        let data = await UlbLedger.aggregate(query);
        if(data.length){
          data[0]['numOfUlb'] = numOfUlb;
          let dataObj = convertToPercent(data[0]);
          dataObj.ulbs = dataObj.ulbs.map(m=> m = convertToPercent(m));
          obj['data'].push(dataObj);
        }
      }
      output.push(obj);
    }
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: '',
      data: output
    });
  } catch (e) {
    console.log('Exception:', e);
    return res.status(400).json({
      timestamp: moment().unix(),
      success: false,
      message: 'Caught Exception!',
      errorMessage: e.message,
      query: req.query.years
    });
  }
  return res.status(200).json({
    timestamp: moment().unix(),
    success: true,
    message: '',
    data: [
      {
        year: '2016-17',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          }
        ]
      },
      {
        year: '2017-18',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            taxRevenue: 1000,
            rentalIncome: 10000,
            feesAndUserCharges: 10,
            ownRevenues: 8,
            saleAndHireCharges: 20,
            assignedRevenue: 20,
            grants: 20,
            interestIncome: 20,
            otherIncome: 20
          }
        ]
      }
    ].map(d => {
      return {
        year: d.year,
        data: d.data.map(m => {
          m['ulbName'] = 'F';
          return m;
        })
      };
    })
  });
};

const getQuery = (year, ulb, range, numOfUlb,totalUlb) => {
  return [
    // stage 1
    {
      $match: {
        financialYear: year,
        ulb: ulb
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
        numOfUlb: numOfUlb,
        range: range,
        financialYear: 1,
        ulb: 1,
        amount: 1,
        code: '$lineitems.code'
      }
    },
    {
        $lookup:{
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb"
        }
    },
    {$unwind:"$ulb"},
    // stage 5
    {
      "$group": {
          "_id": {
              "financialYear": "$financialYear",
              "range": "$range",
              "ulb" : "$ulb._id"
          },
          "numOfUlb": {
              "$first": "$numOfUlb"
          },
          "ulbName" :  {
              "$first":  "$ulb.name"},
          "ulbPopulation" : {
              "$first":  "$ulb.population"},
          taxRevenue: {
            $sum: { $cond: [{ $eq: ['$code', '110'] }, '$amount', 0] }
          },
          rentalIncome: {
            $sum: { $cond: [{ $eq: ['$code', '130'] }, '$amount', 0] }
          },
          feesAndUserCharges: {
            $sum: { $cond: [{ $eq: ['$code', '140'] }, '$amount', 0] }
          },
          saleAndHireCharges: {
            $sum: { $cond: [{ $eq: ['$code', '150'] }, '$amount', 0] }
          },
          assignedRevenue: {
            $sum: { $cond: [{ $eq: ['$code', '120'] }, '$amount', 0] }
          },
          grants: {
            $sum: { $cond: [{ $eq: ['$code', '160'] }, '$amount', 0] }
          },
          interestIncome: {
            $sum: {
              $cond: [{ $in: ['$code', ['170', '171']] }, '$amount', 0]
            }
          },
          otherIncome: {
            $sum: {
              $cond: [{ $in: ['$code', ['180', '100']] }, '$amount', 0]
            }
          },
           ownRevenues: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$code',
                        [
                          '110',
                          '130',
                          '140',                            
                        ]
                      ]
                    },
                    '$amount',
                    0
                  ]
                }
              },
          totalIncome: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$code',
                    [
                      '110',
                      '120',
                      '130',
                      '140',
                      '150',
                      '160',
                      '180',
                      '100',
                      '170',
                      '171'
                    ]
                  ]
                },
                '$amount',
                0
              ]
            }
          }
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
                "taxRevenue": {
                    "$multiply": [
                        {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$taxRevenue",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "rentalIncome": {
                    "$multiply": [
                         {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$rentalIncome",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "feesAndUserCharges": {
                    "$multiply": [
                        {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$feesAndUserCharges",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "saleAndHireCharges": {
                    "$multiply": [
                        {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$saleAndHireCharges",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "assignedRevenue": {
                    "$multiply": [
                         {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$assignedRevenue",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "grants": {
                    "$multiply": [
                         {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$grants",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "interestIncome": {
                    "$multiply": [
                         {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$interestIncome",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                },
                "otherIncome": {
                    "$multiply": [
                                                    {
                            
                             $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                "$otherIncome",
                                "$totalIncome"
                            ]}]  
                            
                        },
                        100
                    ]
                }
            }
        },
        "taxRevenue": {
            "$sum": "$taxRevenue"
        },
        "rentalIncome": {
            "$sum": "$rentalIncome"
        },
        "feesAndUserCharges": {
            "$sum": "$feesAndUserCharges"
        },
        "saleAndHireCharges": {
            "$sum": "$saleAndHireCharges"
        },
        "assignedRevenue": {
            "$sum": "$assignedRevenue"
        },
        "grants": {
            "$sum": "$grants"
        },
        "interestIncome": {
            "$sum": "$interestIncome"
        },
        "otherIncome": {
            "$sum": "$otherIncome"
        },
        "ownRevenues": {
            "$sum": "$ownRevenues"
        },
        "totalIncome": {
            "$sum": "$totalIncome"
        }
    }
},
{
    "$project": {
        "_id": 0,
        "populationCategory": "$_id.range",
        "numOfUlb": "$numOfUlb",
        "ulbs": 1,
        "taxRevenue": {
            "$multiply": [
                {
                    "$divide": [
                        "$taxRevenue",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "rentalIncome": {
            "$multiply": [
                {
                    "$divide": [
                        "$rentalIncome",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "feesAndUserCharges": {
            "$multiply": [
                {
                    "$divide": [
                        "$feesAndUserCharges",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "ownRevenues": {
            "$sum": [
                "$taxRevenue",
                "$rentalIncome",
                "$feesAndUserCharges"
            ]
        },
        "saleAndHireCharges": {
            "$multiply": [
                {
                    "$divide": [
                        "$saleAndHireCharges",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "assignedRevenue": {
            "$multiply": [
                {
                    "$divide": [
                        "$assignedRevenue",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "grants": {
            "$multiply": [
                {
                    "$divide": [
                        "$grants",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "interestIncome": {
            "$multiply": [
                {
                    "$divide": [
                        "$interestIncome",
                        "$totalIncome"
                    ]
                },
                100
            ]
        },
        "otherIncome": {
            "$multiply": [
                {
                    "$divide": [
                        "$otherIncome",
                        "$totalIncome"
                    ]
                },
                100
            ]
        }
    }
},
{
    "$project": {
        "populationCategory": "$populationCategory",
        "numOfUlb": "$numOfUlb",
        "taxRevenue": "$taxRevenue",
        "ulbs": 1,
        "rentalIncome": "$rentalIncome",
        "feesAndUserCharges": "$feesAndUserCharges",
        "ownRevenues": {
            "$sum": [
                "$taxRevenue",
                "$rentalIncome",
                "$feesAndUserCharges"
            ]
        },
        "saleAndHireCharges": "$saleAndHireCharges",
        "assignedRevenue": "$assignedRevenue",
        "grants": "$grants",
        "interestIncome": "$interestIncome",
        "otherIncome": "$otherIncome"
    }
},
  {
      "$project": {
          "populationCategory": "$populationCategory",
          "numOfUlb": "$numOfUlb",
          "taxRevenue": "$taxRevenue",
          "ulbs": 1,
          "rentalIncome": "$rentalIncome",
          "feesAndUserCharges": "$feesAndUserCharges",
          "ownRevenues": {
              "$sum": [
                  "$taxRevenue",
                  "$rentalIncome",
                  "$feesAndUserCharges"
              ]
          },
          "saleAndHireCharges": "$saleAndHireCharges",
          "assignedRevenue": "$assignedRevenue",
          "grants": "$grants",
          "interestIncome": "$interestIncome",
          "otherIncome": "$otherIncome"
      }
  },
  {
      "$addFields": {
          "totalUlb": totalUlb
      }
  }
  ];
};

const convertToPercent = obj => {
  let t = 0;
  for (let k in obj) {
    if( k== "taxRevenue" || k=="rentalIncome" || k=="feesAndUserCharges"){
      t+= obj[k]
    }
    obj["ownRevenues"] = t.toFixed(2) ;
    if ( k =="ownRevenues" || k == 'populationCategory' || k == 'population' || k == 'numOfUlb' || k == "ulbs"||  k=="_id" || k =="name") {
      continue;}
    else {
      obj[k] = obj[k].toFixed(2);
    }
  }
  return obj;
};
