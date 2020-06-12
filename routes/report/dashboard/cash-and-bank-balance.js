const moment = require('moment');
const UlbLedger = require('../../../models/UlbLedger');
const Redis = require('../../../service/redis');
module.exports = async (req, res, next)=>{
    try {
    let output = [];
    //console.log(req.body.queryArr);
    //    res.json(req.body.queryArr);
    for (let q of req.body.queryArr) {
      let obj = {
        year: q.financialYear,
        data: []
      };

      for (let d of q.data) {
        let range = d.range;
        let numOfUlb = Number(d.ulb['$in'].length);
        let query = getQuery(q.financialYear, d.ulb, range, numOfUlb,d.totalUlb);
        let data = await UlbLedger.aggregate(query);
        if(data && data.length){
          data[0]['numOfUlb'] = numOfUlb;
          //let dataObj = convertToCrores(data[0]);
          obj['data'].push(data[0]);
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
}

const getQuery = (year, ulb, range, numOfUlb,totalUlb) => {
  return [
    // stage 1
    {
      $match: {
        financialYear: year,
        ulb: ulb
      }
    },
    {
      "$lookup": {
          "from": "lineitems",
          "as": "lineitems",
          "foreignField": "_id",
          "localField": "lineItem"
      }
  },
  {
      "$unwind": "$lineitems"
  },
  {
      "$project": {
          "numOfUlb":{ $literal: numOfUlb },
          "range": range,
          "financialYear": 1,
          "ulb": 1,
          "amount": 1,
          "code": "$lineitems.code"
      }
  },
  {
      "$group": {
          "_id": {
              "financialYear": "$financialYear",
              "range": "$range",
              "ulb" : "$ulb"
          },
          "cashAndBankBalance": {
              "$sum": {
                  "$cond": [
                      {
                          "$eq": [
                              "$code",
                              "450"
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
      "$lookup": {
          "from": "ulbs",
          "localField": "_id.ulb",
          "foreignField": "_id",
          "as": "ulb"
      }
  },
  {
      "$unwind": "$ulb"
  },
  {$group:{
          _id : "ulb._id",
          "ulbs": {
              "$addToSet": {
                  "_id": "$ulb._id",
                  "name": "$ulb.name",
                  "population": "$ulb.population",
                  "cashAndBankBalance": "$cashAndBankBalance",
                  "audited" : "$audited",
                  "unaudited" : "$unaudited",
                  "auditNA" : {$cond : [ {$and:[    {"$eq": ["$audited",0] },{"$eq": ["$unaudited",0]}  ] }, 1,0 ]  },
              }
          },
          range : {$first : "$_id.range"},
          audited : {$sum: "$audited"},
          unaudited : {$sum: "$unaudited"},
          numOfUlb : {$sum : 1},
          cashAndBankBalance : {$sum: "$cashAndBankBalance"}
      }
  },
  {
      "$project": {
          "_id": 0,
          "populationCategory": "$range",
          "ulbs": 1,
          "audited" : 1,
          "unaudited" : 1,
          "auditNA" : {$subtract : ["$numOfUlb",{$add : ["$audited","$unaudited"]} ] },
          "numOfUlb": "$numOfUlb",
          "cashAndBankBalance": "$cashAndBankBalance"
      }
  },
    {$addFields : {  totalUlb : totalUlb } }
  ];
};

const convertToCrores = (obj) => {
    obj['cashAndBankBalance'] = obj['cashAndBankBalance'];
    return obj;
}

const outputFormat = () => {
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
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          }
        ]
      },
      {
        year: '2017-18',
        data: [
          {
            populationCategory: '> 10 Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '1Lakh to 10Lakhs',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          },
          {
            populationCategory: '< 1 Lakh',
            numOfUlb: 100,
            cashAndBankBalance: 1000
          }
        ]
      }
    ].map(d => {
      return {
        year: d.year,
        data: d.data.map(m => {
          m['ulbName'] = 'B';
          return m;
        })
      };
    })
  });
};