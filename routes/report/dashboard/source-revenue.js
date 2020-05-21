const moment = require('moment');
const UlbLedger = require('../../../models/UlbLedger');
const Redis = require('../../../service/redis');
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
      let resData = [];
      if(req.query.ulbList && req.query.populationCategory){
          let years = req.body.queryArr.map(m=> m.financialYear);
          let year = years.length ? years[0] : '';
          if(output.length){
              let yearData = output.find(f=> f.year == year);
              if(yearData && yearData.data && yearData.data.length){
                  let pcatData = yearData.data.find(f=> f.populationCategory == req.query.populationCategory)
                  resData = pcatData ? pcatData.ulbs : []
              }
          }
      }else{
          if(output && !req.query.ulb){
              for(year of output){
                  if(year.data && year.data.length){
                      for(d of year.data){
                          d["ulbs"] = undefined;
                      }
                  }
              }
          }
          resData = output;
      }
      Redis.set(req.redisKey,JSON.stringify(resData))
      return res.status(200).json({
          timestamp: moment().unix(),
          success: true,
          message: '',
          data: resData
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
        numOfUlb: { $literal: numOfUlb },
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
          },
          "audited": {
            "$sum": {
                "$cond": [
                    {
                        $and:[{"$eq": ["$code","1001"]},{"$gt": ["$amount",0]}]
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
                    $and:[{"$eq": ["$code","1001"]},{"$eq": ["$amount",0]}]
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
        "ulbs": {
            "$addToSet": {
                "_id": "$_id.ulb",
                "name": "$ulbName",
                "population": "$ulbPopulation",
                "audited" : "$audited",
                "unaudited" : "$unaudited",
                "auditNA" : {$cond : [ {$and:[    {"$eq": ["$audited",0] },{"$eq": ["$unaudited",0]}  ] }, 1,0 ]  },
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
        "audited": {
          "$sum": "$audited"
        },
        "unaudited": {
            "$sum": "$unaudited"
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
        },
        "numOfUlb" : { $sum:1 }
    }
},
{
    "$project": {
        "_id": 0,
        "populationCategory": "$_id.range",
        "numOfUlb": "$numOfUlb",
        "ulbs": 1,
        "audited" : 1,
        "unaudited" : 1,
        "auditNA" : {$subtract : ["$numOfUlb",{$add : ["$audited","$unaudited"]} ] },
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
{
    "$project": {
        "populationCategory": "$populationCategory",
        "numOfUlb": "$numOfUlb",
        "audited" : 1,
        "unaudited" : 1,
        "auditNA" : 1,
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
          "audited" : 1,
          "unaudited" : 1,
          "auditNA" : 1,
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
    if ( k =="audited"||k =="unaudited"||k =="auditNA"||k =="ownRevenues" || k == 'populationCategory' || k == 'population' || k == 'numOfUlb' || k == "ulbs"||  k=="_id" || k =="name") {
      if(k=="ulbs"){
          obj[k] = obj[k].map(m=>{
              let total = 0;
              total+=m["taxRevenue"]
              total+=m["rentalIncome"]
              total+=m["feesAndUserCharges"]
              total+=m["saleAndHireCharges"]
              total+=m["assignedRevenue"]
              total+=m["grants"]
              total+=m["interestIncome"]
              total+=m["otherIncome"]
              m["total"] = total;
              return m;
          })
          continue;
      }else{
          continue;
      }
    }
    else {
      obj[k] = obj[k].toFixed(2);
    }
  }
  return obj;
};
