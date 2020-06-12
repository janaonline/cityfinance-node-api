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
        if(data.length && data) { 
            data[0]['numOfUlb'] = numOfUlb;
            let dataObj = convertToPercent(data[0]);
            if(dataObj)
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
          from : "ulbs",
          localField:"ulb",
          foreignField:"_id",
          as : "ulb"
      }
  },
  { $unwind : "$ulb"},
    // stage 5
       
    {
      "$group": {
          "_id": {
              "financialYear": "$financialYear",
              "range": "$range",
              "ulb": "$ulb._id"
          },
          "numOfUlb": {
              "$first": "$numOfUlb"
          },
          "ulbName": {
              "$first": "$ulb.name"
          },
          "ulbPopulation": {
              "$first": "$ulb.population"
          },
          "establishmentExpense": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "210"
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "administrativeExpense": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "220"
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "operationalAndMaintananceExpense": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "230"
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "interestAndFinanceExpense": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "240"
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "revenueGrants": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "260"
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "other": {
              "$sum": {
                  "$cond": [
                      {
                          "$in": [
                              "$code",
                              [
                                  "250",
                                  "270",
                                  "271",
                                  "272",
                                  "280",
                                  "290",
                                  "200"
                              ]
                          ]
                      },
                      "$amount",
                      0
                  ]
              }
          },
          "totalIncome": {
              "$sum": {
                  "$cond": [
                      {
                          "$in": [
                              "$code",
                              [
                                  "210",
                                  "220",
                                  "230",
                                  "240",
                                  "250",
                                  "260",
                                  "270",
                                  "271",
                                  "272",
                                  "280",
                                  "290",
                                  "200"
                              ]
                          ]
                      },
                      "$amount",
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
                  "audited" :"$audited",
                    "unaudited" :"$unaudited",
                    "auditNA" : {$cond : [ {$and:[    {"$eq": ["$audited",0] },{"$eq": ["$unaudited",0]}  ] }, 1,0 ]  },
                  "establishmentExpense": {
                      "$multiply": [
                          {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$establishmentExpense",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  },
                  "administrativeExpense": {
                      "$multiply": [
                           {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$administrativeExpense",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  },
                  "operationalAndMaintananceExpense": {
                      "$multiply": [
                          {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$operationalAndMaintananceExpense",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  },
                  "interestAndFinanceExpense": {
                      "$multiply": [
                            {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$interestAndFinanceExpense",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  },
                  "revenueGrants": {
                      "$multiply": [
                           {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$revenueGrants",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  },
                  "other": {
                      "$multiply": [
                           {
                              
                               $cond: [ { $eq: ["$totalIncome", 0] }, 0, {"$divide": [
                                  "$other",
                                  "$totalIncome"
                              ]}]  
                              
                          },
                          100
                      ]
                  }
              }
          },
          "establishmentExpense" : {$sum : "$establishmentExpense"},
          "administrativeExpense" : {$sum : "$administrativeExpense"},
          "operationalAndMaintananceExpense" :{$sum : "$operationalAndMaintananceExpense"},
          "interestAndFinanceExpense" : {$sum : "$interestAndFinanceExpense"},
          "revenueGrants" :{$sum : "$revenueGrants"},
          "other" : {$sum : "$other"},
          "totalIncome" : {$sum : "$totalIncome"},
          "audited" : {$sum : "$audited"},
          "unaudited" : {$sum : "$unaudited"},
          "numOfUlb" : {$sum:1}
      }
  },    
    {
        "$project": {
            "_id": 0,
            "audited" : 1,
            "unaudited" : 1,
            "auditNA" : {$subtract : ["$numOfUlb",{$add : ["$audited","$unaudited"]} ] },
            "populationCategory": "$_id.range",
            "numOfUlb": "$numOfUlb",
            "ulbs": 1,
            "establishmentExpense": {
                "$multiply": [
                    {
                        "$divide": [
                            "$establishmentExpense",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            },
            "administrativeExpense": {
                "$multiply": [
                    {
                        "$divide": [
                            "$administrativeExpense",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            },
            "operationalAndMaintananceExpense": {
                "$multiply": [
                    {
                        "$divide": [
                            "$operationalAndMaintananceExpense",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            },
            "interestAndFinanceExpense": {
                "$multiply": [
                    {
                        "$divide": [
                            "$interestAndFinanceExpense",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            },
            "revenueGrants": {
                "$multiply": [
                    {
                        "$divide": [
                            "$revenueGrants",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            },
            "other": {
                "$multiply": [
                    {
                        "$divide": [
                            "$other",
                            "$totalIncome"
                        ]
                    },
                    100
                ]
            }
        }
    },
    {$addFields: { totalUlb : totalUlb} }
  ];
};

const convertToPercent = obj => {
  for (let k in obj) {
    if (k=="audited" ||k=="unaudited" ||k=="auditNA" || k =="ownRevenues" || k == 'populationCategory' || k == 'population' || k == 'numOfUlb' || k == "ulbs"||  k=="_id" || k =="name") {
        if(k=="ulbs"){
            obj[k] = obj[k].map(m=>{
                let total = 0;
                total+=m.establishmentExpense
                total+=m.administrativeExpense
                total+=m.operationalAndMaintananceExpense
                total+=m.interestAndFinanceExpense
                total+=m.revenueGrants
                total+=m.other
                m["total"] = total;
                return m;
            })
            continue;
        }else{
            continue;
        }
    }
    else {
      obj[k] = obj[k] ? obj[k].toFixed(2) :  obj[k];
    }
  }
  return obj;
};
