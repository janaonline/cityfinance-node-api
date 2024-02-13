const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");
const ExcelJS = require("exceljs");
const util = require('util')
const catchAsync = require('../../util/catchAsync')
const revenueList = [ "130", "140", "150", "180", "110"];
const fs = require("fs");
const Indicator = require('../../models/indicators')
const ObjectIdOfRevenueList = [
  "5dd10c2285c951b54ec1d737",
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74a",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2385c951b54ec1d748",
];
const OwnRevenueList = [
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74a",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2385c951b54ec1d748",
];
const expenseCode = [
  "5dd10c2585c951b54ec1d753",
  "5dd10c2585c951b54ec1d75a",
  "5dd10c2585c951b54ec1d756",
  "5dd10c2685c951b54ec1d760"
];
const ObjectIdPropertyTax = [
  "5dd10c2285c951b54ec1d737"
]

const yearlist = catchAsync(async (req, res) => {
  const { financialYear, stateId, ulb, ulbType, populationCategory } = req.body;
  // matchObj={}
  // if(stateId && ObjectId.isValid(stateId)){
  //   Object.assign(matchObj,{"ulb.state": ObjectId(stateId)})
  // }
  // if(ulb && ObjectId.isValid(ulb)){
  //   Object.assign(matchObj,{"ulb._id": ObjectId(ulb)})
  // }
  // if(ulbType && ObjectId.isValid(ulbType)){
  //   Object.assign(matchObj,{"ulb.ulbType": ObjectId(ulbType)})
  // }
  // if(populationCategory == '4 Million+'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 4000000}})
  // }else if(populationCategory == '500 Thousand - 1 Million'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 500000, $lt:1000000}})
  // }else if(populationCategory == '100 Thousand - 500 Thousand'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 100000, $lt:500000}})
  // }else if(populationCategory == '100 Thousand - 500 Thousand'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 100000, $lt:500000}})
  // }else if(populationCategory == '1 Million - 4 Million'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 1000000, $lt:4000000}})
  // }else if(populationCategory == '200 Thousand - 500 Thousand'){
  //   Object.assign(matchObj,{"ulb.population":{$gt: 200000, $lt:500000}})
  // }

  let query = [];

  // query.push(  {$lookup:{
  //   from:"ulbs",
  //   localField:"ulb",
  //   foreignField:"_id",
  //   as:"ulb"
  // }},{$unwind:"$ulb"},)
  // if(Object.keys(matchObj).length>0){
  //   query.push({
  //     $match:matchObj
  //   })
  // }
  // let obj = {
  //   $group: {
  //     _id: "$financialYear",
  //   },
  // };
  // query.push(obj);
  // query.push({ $sort: { _id: -1 } });
  // console.log(util.inspect(query,{depth: null, showHidden: false}))
  let yearList = await UlbLedger.distinct("financialYear");
  yearList = yearList
    .sort((a, b) => {
      a = Number(a.split("-")[0]);
      b = Number(b.split("-")[0]);
      return b - a;
    })
    .map((val) => {
      return { _id: val };
    });
  return res.status(200).json({
    success: true,
    data: yearList,
  });
});

const dataAvailability = async (req, res, reuseOption) => {
  try {
    const {
      financialYear,
      propertyTax,
      getQuery,
      stateId,
      ulb,
      ulbType,
      csv,
      populationCategory,
      from

    } = req.body;

    if (!financialYear) {
      return Response.BadRequest(res, null, "financialYear is required");
    }
    let year = "financialYear"
if(from == 'slb'){
year = "year"
}
  let ulbCondition = {}
  ulbCondition['isActive'] = true
  if(stateId && ObjectId.isValid(stateId)){
    ulbCondition['state'] = ObjectId(stateId)
  }
    let stateUlbs = await Ulb.find(ulbCondition)
      .select({ _id: 1 })
      .lean();

    let query = [
      {
        $match: {
          // lineItem: {
          //   $in: propertyTax
          //     ? [ObjectId("5dd10c2285c951b54ec1d737")]
          //     : ObjectIdOfRevenueList.map((value) => ObjectId(value)),
          // },
          ulb: { $in: stateUlbs.map((val) => val._id) },
          [year]: {
            $in:  [financialYear],
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
    ];
if(from == "slb"){
  query.unshift({
    $group: {
      _id: {
        ulb: "$ulb",
        year: "$year"
      },
      ulb: {$first: "$ulb"},
      year:{$first: "$year"}
    }
  })
}
    let matchObj = {};
    let matchObjNoData = {};
    if (ulb && ulb != "") {
      Object.assign(matchObj, { "ulb.name": ulb });
      Object.assign(matchObjNoData, { name: ulb });
    } else {
      if (stateId && ObjectId.isValid(stateId)) {
        Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
        Object.assign(matchObjNoData, { state: ObjectId(stateId) });
      }

      if (ulbType && ObjectId.isValid(ulbType)) {
        Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
        Object.assign(matchObjNoData, { ulbType: ObjectId(ulbType) });
      }
      if (populationCategory == "4 Million+") {
        Object.assign(matchObj, { "ulb.population": { $gt: 4000000 } });
        Object.assign(matchObjNoData, { "ulb.population": { $gt: 4000000 } });
      } else if (populationCategory == "500 Thousand - 1 Million") {
        Object.assign(matchObj, {
          "ulb.population": { $gt: 500000, $lt: 1000000 },
        });
        Object.assign(matchObjNoData, {
          "ulb.population": { $gt: 500000, $lt: 1000000 },
        });
      } else if (populationCategory == "100 Thousand - 500 Thousand") {
        Object.assign(matchObj, {
          "ulb.population": { $gt: 100000, $lt: 500000 },
        });
        Object.assign(matchObjNoData, {
          "ulb.population": { $gt: 100000, $lt: 500000 },
        });
      } else if (populationCategory == "1 Million - 4 Million") {
        Object.assign(matchObj, {
          "ulb.population": { $gt: 1000000, $lt: 4000000 },
        });
        Object.assign(matchObjNoData, {
          "ulb.population": { $gt: 1000000, $lt: 4000000 },
        });
      } else if (populationCategory == "<100 Thousand") {
        Object.assign(matchObj, { "ulb.population": { $lt: 100000 } });
        Object.assign(matchObjNoData, { "ulb.population": { $lt: 100000 } });
      }
    }

    if (Object.keys(matchObj).length > 0) {
      query.push({
        $match: matchObj,
      });
    }

    query.push({
      $group: {
        _id: "$ulb._id",
      },
    });

    if (csv) {
      return getExcelForAvailability(res, query, stateId, from);
    } else {
      query.push({
        $count: "ulb",
      });
    }

    
    let query_noData = [
      {
        $lookup: {
          from: from=='slb' ? "indicators" : "ulbledgers",
          let: {
            firstUser: financialYear,
            secondUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$financialYear", "$$firstUser"],
                    },
                    {
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "ledgerData",
        },
      },
      {
        $match: {
          ledgerData: { $size: 0 },
        },
      },
      {
        $sort: {
          population: -1,
        },
      },
      { $limit: 5 },
    ];
    if (Object.keys(matchObjNoData).length > 0) {
      query_noData.unshift({
        $match: matchObjNoData,
      });
    }

    let countQuery = [
      {
        $count: "ulbCount",
      },
    ];
    if (Object.keys(matchObjNoData).length > 0) {
      countQuery.unshift({
        $match: matchObjNoData,
      });
    }
    if (getQuery) return Response.OK(res, query);
    let noData = Ulb.aggregate(query_noData);

    let collection = from == "slb" ? Indicator  : UlbLedger
    let data = collection.aggregate(query);
    let ulbCount = Ulb.aggregate(countQuery);
    let redisKey = JSON.stringify([query_noData, query, countQuery]);
    let redisData = await Redis.getDataPromise(redisKey);
    let promiseData;
    if (!redisData) {
      promiseData = await Promise.all([noData, data, ulbCount]);
      Redis.set(redisKey, JSON.stringify(promiseData));
    } else {
      // promiseData = await Promise.all([noData, data, ulbCount]);
      // Redis.set(redisKey, JSON.stringify(promiseData));
      promiseData = JSON.parse(redisData);
    }
    noData = promiseData[0];
    data = promiseData[1];
    ulbCount = promiseData[2];

    data = data[0]?.ulb ?? 0;
    let names = [];
    if (noData) {
      noData.forEach((el) => {
        names.push(el.name);
      });
    }
    data = (data / ulbCount[0]?.ulbCount) * 100;
    if (reuseOption == "nationalDashboard")
      return { percent: data, names: names };
    return Response.OK(res, { percent: data, names: names });
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

async function getExcelForAvailability(res, query, stateId, from) {
  try {
    let ulbCount = await Ulb.find(
      ObjectId.isValid(stateId) ? { state: ObjectId(stateId) } : {}
    )
      .populate("state")
      .select({ _id: 1, name: 1, state: 1 })
      .lean();
      let collection = from == "slb" ? Indicator : UlbLedger
    let data = await collection.aggregate(query);

    data = JSON.parse(JSON.stringify(data));
    let ulbMap = data.map((value) => value._id);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Availability");
    const imageId2 = workbook.addImage({
      buffer: fs.readFileSync("uploads/logos/Group 1.jpeg"),
      extension: "png",
    });
    worksheet.addImage(imageId2, {
      tl: { col: 0, row: 0 },
      br: { col: 8, row: 2 }
    });
    // worksheet.addImage(imageId2, "A1:F3");
    worksheet.columns = [
      { header: "S.no", key: "sno" },
      { header: "ULB name", key: "ulb" },
      // { header: "State Name", key: "state" },
      { header: "Data Availability", key: "status" },
    ];
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    ulbCount.map((value, i) => {
      value = JSON.parse(JSON.stringify(value));
      let obj = {
        sno: i + 1,
        ulb: value.name,
        code: value.code,
        censusCode: value.censusCode,
        state: value.state.name,
        status: ulbMap.includes(value._id) ? "Yes" : "No",
      };
      worksheet.addRow(obj);
    });
    worksheet.addRow({sno: `Can't find what you are looking for? Reach out to us at contact@${process.env.PROD_HOST}`});
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "Data_Availability.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });
  } catch (error) {
    return res.status(400).json({ msg: error.message || error.msg || error });
  }
}

const chartData = async (req, res) => {
  try {
    const { getQuery, financialYear, stateIds, ulbIds, ulbTypeIds } = req.body;

    if (!financialYear || !Array.isArray(financialYear))
      return Response.BadRequest(res, null, "financialYear as array required");

    let query = {
      financialYear: { $in: financialYear },
    };

    if (ulbIds) {
      if (!Array.isArray(ulbIds)) ulbIds = [ulbIds];
      Object.assign(query, { ulb: { $in: ulbIds } });
    }

    let ulbMatch = getUlbMatchQuery(stateIds, ulbTypeIds);
    let lineItemMatch = { code: { $in: revenueList } };

    let data;

    let temp = {
      ...query,
      ...ulbMatch,
      ...lineItemMatch,
    };
    if (getQuery) return Response.OK(res, temp);

    let redisKey = JSON.stringify(temp) + "OwnRevenue";

    data = await Redis.getDataPromise(redisKey);
    if (!data) {
      data = await UlbLedger.find(query)
        .populate({
          path: "ulb",
          match: ulbMatch,
        })
        .populate({ path: "lineItem", match: lineItemMatch })
        .lean();
      data = data.filter((value) => value.lineItem && value.ulb);
      data = parseData(data);
      Redis.set(redisKey, JSON.stringify(data));
    } else {
      data = JSON.parse(data);
    }

    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

const chartData2 = async (req, res) => {
  try {
    const { ulbType, ulb, stateId, financialYear, populationCategory ,getQuery } = req.body;

    if (
      !financialYear || Array.isArray(financialYear)
        ? financialYear.length == 0
        : false
    )
      return Response.BadRequest(res, null, "financialYear as array required");

    // let tempYear = financialYear.split("-");
    // tempYear = Number(tempYear[0]) - 1 + "-" + (Number(tempYear[1]) - 1);
    // financialYear = [financialYear, tempYear];

    let query = [
      {
        $match: {
          lineItem: {
            $in: ObjectIdOfRevenueList.map((value) => ObjectId(value)),
          },
          financialYear: {
            $in: Array.isArray(financialYear) ? financialYear : [financialYear],
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
    ];
    let matchObj = {};
    if (ulb && ulb != ""){
      Object.assign(matchObj, { "ulb.name": ulb });
    }else{
      if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
  
      if(populationCategory == '4 Million+'){
        Object.assign(matchObj,{"ulb.population":{$gt: 4000000}})
        
      }else if(populationCategory == '500 Thousand - 1 Million'){
        Object.assign(matchObj,{"ulb.population":{$gt: 500000, $lt:1000000}})
        
      }else if(populationCategory == '100 Thousand - 500 Thousand'){
        Object.assign(matchObj,{"ulb.population":{$gt: 100000, $lt:500000}})
        
      }else if(populationCategory == '1 Million - 4 Million'){
        Object.assign(matchObj,{"ulb.population":{$gt: 1000000, $lt:4000000}})
        
      }else if(populationCategory == '<100 Thousand'){
        Object.assign(matchObj,{"ulb.population":{$lt: 100000}})
        
      }
    }

   
  
    if (Object.keys(matchObj).length > 0) {
      query.push({
        $match: matchObj,
      });
    }
    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      {
        $unwind: "$lineItem",
      },
      {
        $group: {
          _id: {
            revenueName: "$lineItem.name",
          },
          population: { $sum: "$ulb.population" },
          amount: { $sum: "$amount" },
          colour: {$first: "$lineItem.colour"}
        },
      }
    );

    if (getQuery) return Response.OK(res, query);

    let data = await UlbLedger.aggregate(query);

    let temp = {
      _id: {
        revenueName: "Other Tax Revenue",
      },
      colour:"#29A6A6",
      amount:
        data.find((value) => value._id.revenueName == "Tax Revenue")?.amount -
        data.find((value) => value._id.revenueName == "Property Tax")?.amount,
      population: data.find((value) => value._id.revenueName == "Tax Revenue")
        ?.population,
    };
    data.push(temp);
    data = data.filter((value) => value._id.revenueName != "Tax Revenue");
    //rearrange the elements
  
    let newData=[];
    newData[0] = data[0]
    newData[1] = data[5]
    newData[2] = data[4]
    newData[3] = data[3]
    newData[4] = data[1]
    newData[5] = data[2]

    return Response.OK(res, newData);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null);
  }
};

const cardsData = async (req, res) => {
  try {
    let { ulbType, ulb, stateId, financialYear, getQuery, populationCategory, property } = req.body;

    if (
      !financialYear || Array.isArray(financialYear)
        ? financialYear.length == 0
        : false
    )
      return Response.BadRequest(res, null, "financialYear as array required");

    if (Array.isArray(financialYear)) financialYear = financialYear[0];
    let tempYear = financialYear
      .split("-")
      .map((value) => Number(value) - 1)
      .join("-");
    financialYear = [financialYear, tempYear];

    let query = [
      {
        $match: {
          lineItem: {
            $in: [
              ...ObjectIdOfRevenueList.map((value) => ObjectId(value)),
              ...expenseCode.map((value) => ObjectId(value)),
            ],
          },
          financialYear: {
            $in: Array.isArray(financialYear) ? financialYear : [financialYear],
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
    ];

   

    let matchObj = {};
    if (ulb  && ulb != ""){
      Object.assign(matchObj, { "ulb.name": ulb });
    }else{
      if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });

      if(populationCategory == '4 Million+'){
        Object.assign(matchObj,{"ulb.population":{$gt: 4000000}})
       
      }else if(populationCategory == '500 Thousand - 1 Million'){
        Object.assign(matchObj,{"ulb.population":{$gt: 500000, $lt:1000000}})
      
      }else if(populationCategory == '100 Thousand - 500 Thousand'){
        Object.assign(matchObj,{"ulb.population":{$gt: 100000, $lt:500000}})
      
      }else if(populationCategory == '1 Million - 4 Million'){
        Object.assign(matchObj,{"ulb.population":{$gt: 1000000, $lt:4000000}})
      
      }else if(populationCategory == '<100 Thousand'){
        Object.assign(matchObj,{"ulb.population":{$lt: 100000}})
      
      }
    }
    
  


    if (Object.keys(matchObj).length > 0) {
      query.push({
        $match: matchObj,
      });
    }

    query.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      {
        $unwind: "$lineItem",
      }
    );
    query2 = [...query];
    query2.push(
      {
        $group: {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          totalAllRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$lineItem.code",
                    ["11001", "130", "140", "150", "180", "110"],
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [
                {
                  $in: ["$lineItem.code", ["210", "220", "230"]],
                },
                "$amount",
                0,
              ],
            },
          },
          totalProperty:{
            '$sum': {
              '$cond': [
                { '$in': [ '$lineItem.code', [ '11001' ] ] },
                '$amount',
                0
              ]
            }
          },
          population: {
            $sum: "$ulb.population",
          },
        },
      },
      {

        $project:{
          _id:1,
          population:1,
          totalExpense:1,
          totalProperty:1,
          totalRevenue:{$subtract:["$totalAllRevenue","$totalProperty"]},

        }
      },
      {
        $project: {
          _id: 1,
          meetsExpense: {
            $cond: [
              {
                $or: [
                  {$and:[{ $eq: ["$totalRevenue", "$totalExpense"] },{$gt:["$totalExpense", 0]}]}
                  ,
                 { $and:[{ $gt: ["$totalRevenue", "$totalExpense"] },{$gt:["$totalExpense", 0]}]}
                  ,
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: { financialYear: "$_id.financialYear" },
          totalUlbMeetExpense: {
            $sum: {
              $cond: [
                {
                  $eq: ["$meetsExpense", 1],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "_id.financialYear": 1 },
      }
    );
    query.push(
      {
        '$group': {
          _id: { financialYear: '$financialYear' },
          totalAllRevenue: {
            '$sum': {
              '$cond': [
                {
                  '$in': [
                    '$lineItem.code',
                    [ '11001', '130', '140', '150', '180', '110' ]
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          totalProperty: {
            '$sum': {
              '$cond': [
                { '$in': [ '$lineItem.code', [ '11001' ] ] },
                '$amount',
                0
              ]
            }
          },
          totalExpense: {
            '$sum': {
              '$cond': [
                { '$in': [ '$lineItem.code', [ '210', '220', '230' ] ] },
                '$amount',
                0
              ]
            }
          },
          populationArr: {
            $addToSet:"$ulb.population"
            }
        }
      },
      {
        '$project': {
          _id: 1,
               totalRevenue: { '$subtract': [ '$totalAllRevenue', '$totalProperty' ] },
       
         totalExpense:1,
          totalProperty: 1,
          population: {$sum:"$populationArr"}
        }
      },
      {$project:{
           totalProperty: 1,
          population: 1,
          totalRevenue:1,
          totalExpense:1,
          percentage: {
            '$multiply': [ { '$divide': [ property ? '$totalProperty' :  '$totalRevenue', '$totalExpense' ] }, 100 ]
          },
             perCapita: {
            '$cond': [
              { '$eq': [ '$population', 0 ] },
              0,
              { '$divide': [  property ? '$totalProperty' : '$totalRevenue', '$population' ] }
            ]
          },
          }},
      { '$sort': { '_id.financialYear': 1 } }
    );

    if (getQuery) return Response.OK(res, { query, query2 });
console.log(util.inspect(query, {showHidden : false, depth : null}))
console.log(util.inspect(query2, {showHidden : false, depth : null}))
let redisKey =  "OwnRevenueCards";

  // let dataCard = await Redis.getDataPromise(redisKey); 

  let data = await UlbLedger.aggregate(query);
  let ulbCountExpense = await UlbLedger.aggregate(query2);
  data = await Promise.all([data, ulbCountExpense]);
   dataCard = data[0].map((value) => {
    let expense = data[1].find(
      (innerValue) => innerValue._id.financialYear == value._id.financialYear
    );
    Object.assign(value, {
      totalUlbMeetExpense: expense.totalUlbMeetExpense,
    });
    return { [value._id.financialYear]: { ...value } };
  });
  // dataCard = parseData(dataCard);
  // Redis.set(redisKey, JSON.stringify(dataCard));

    return Response.OK(res, { ...dataCard[0], ...dataCard[1] });
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null);
  }
};

const tableData = async (req, res) => {
  try {
    let { ulbType, ulb, stateId, financialYear, getQuery, propertyTax } = req.body;    
      let matchFilter = {
      }

      if(stateId && ObjectId.isValid(stateId) ){
      Object.assign(matchFilter, {state: ObjectId(stateId)})
      }
   if(ulbType && ObjectId.isValid(ulbType)){
    Object.assign(matchFilter, {ulbType: ObjectId(ulbType)})
   }
   if(ulb.length){
    Object.assign(matchFilter, {_id: ObjectId(ulb)})
   }
   const HashTable = new Map();
  let ulbIDs = [],
    AllULBs = [];

  AllULBs = await Ulb.find(matchFilter)
    .select("_id")
    .lean();
  AllULBs = AllULBs.map((each) => {
    HashTable.set(each._id.toString(), true);
    return each._id;
  });

    if (
      !financialYear || Array.isArray(financialYear)
        ? financialYear.length == 0
        : false
    )
      return Response.BadRequest(res, null, "financialYear as array required");

    let query = [
      {
        $match: {
          ulb: {
            $in: [...AllULBs]
          },
          lineItem: {
            
            $in: [
              ...ObjectIdOfRevenueList.map((value) => ObjectId(value)),
              ...expenseCode.map((value) => ObjectId(value)),
            ],
          },
          financialYear: {
            $in: Array.isArray(financialYear) ? financialYear : [financialYear],
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
    ];

    let query_4m = [
      {
        $match:{
          "ulb.population":{$gt:4000000}
        }
      }
    ]
    let query_1m_4m = [
      {
        $match:{
          "ulb.population":{$lt:4000000, $gt:1000000}
        }
      }
    ]
    let query_500t_1m = [
      {
        $match:{
          "ulb.population":{$gt:500000, $lt:1000000}
        }
      }
    ]
    let query_100t_500t = [
      {
        $match:{
          "ulb.population":{$gt:100000, $lt:500000}
        }
      }
    ]
    let query_100t = [
      {
        $match:{
          "ulb.population":{$lt:100000}
        }
      }
    ]
    let queryCal = []

    let matchObj = {};
    if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });

    if (Object.keys(matchObj).length > 0) {
      queryCal.push({
        $match: matchObj,
      });
    }

    queryCal.push(
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      {
        $unwind: "$lineItem",
      }
    );
    queryCal.push(
      {
        $group: {
          _id: {
            ulb: "$ulb._id",
          },
          totalOwnRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$lineItem.code",
                    ["130", "140", "150", "180", "110"],
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          totalProperty: {
            $sum: {
              $cond: [
                {
                  $in: ["$lineItem.code", ["11001"]],
                },
                "$amount",
                0,
              ],
            },
          },
          totalExpense: {
            $sum: {
              $cond: [
                {
                  $in: ["$lineItem.code", ["210", "220", "230"]],
                },
                "$amount",
                0,
              ],
            },
          },
          population: { $first: "$ulb.population" },
        },
      },

      {
        $project:{
          totalRevenue: propertyTax ? "$totalProperty" : "$totalOwnRevenue",
          totalProperty:1,
          totalOwnRevenue:1,
          totalExpense:1,
          population:1,
          ownRevenuePerCapita  :{ $cond: [ { $eq: [ "$population", 0 ] }, 0, {"$divide":[propertyTax ? "$totalProperty"  : "$totalOwnRevenue", "$population"]} ] } ,
        }
      },

    );
    let query_4m_median=[]
    let query_1m_4m_median=[]
    let query_500t_1m_median = []
    let query_100t_500t_median = []
    let query_100t_median = []
    query_4m_median.push(...query, ...query_4m, ...queryCal)
query_1m_4m_median.push(...query, ...query_1m_4m, ...queryCal)
query_500t_1m_median.push(...query, ...query_500t_1m, ...queryCal)
query_100t_500t_median.push(...query, ...query_100t_500t, ...queryCal)
query_100t_median.push(...query, ...query_100t, ...queryCal)
  
let { medianData_4m, medianData_1m_4m, medianData_1m_500t, medianData_500t_100t, medianData_100t } = await new Promise(async (resolve, reject) => {
  let prms1 = new Promise(async (rslv, rjct) => {
      let output =  await UlbLedger.aggregate(query_4m_median)
      console.log(util.inspect(query_4m_median, {showHidden: false, depth: null}))
      let ans = calculateMedian (output);
      rslv(ans);
  });
  let prms2 = new Promise(async (rslv, rjct) => {
      let output =  await UlbLedger.aggregate(query_1m_4m_median)
      let ans = calculateMedian (output);
      rslv(ans);
  });
  let prms3 = new Promise(async (rslv, rjct) => {
      let output =    await UlbLedger.aggregate(query_500t_1m_median);
      let ans = calculateMedian (output);
      rslv(ans);
  });
  let prms4 = new Promise(async (rslv, rjct) => {
      let output = await UlbLedger.aggregate(query_100t_500t_median);
      let ans = calculateMedian (output);
      rslv(ans);
  });
  let prms5 = new Promise(async (rslv, rjct) => {
      let output = await UlbLedger.aggregate(query_100t_median);
      let ans = calculateMedian (output);
      rslv(ans);
  });

  Promise.all([prms1, prms2, prms3, prms4, prms5]).then(
      (outputs) => {
          let medianData_4m = outputs[0];
          let medianData_1m_4m = outputs[1];
          let medianData_1m_500t = outputs[2];
          let medianData_500t_100t = outputs[3];
          let medianData_100t = outputs[4];
        

          if (medianData_4m || medianData_1m_4m || medianData_1m_500t || medianData_500t_100t || medianData_100t) {
              resolve({ medianData_4m, medianData_1m_4m, medianData_1m_500t, medianData_500t_100t , medianData_100t});
          } else {
              reject({ message: "No Data Found" });
          }
      },
      (e) => {
          reject(e);
      }
  );
});
  
    let count_q = [
      {
        $project:{
         meetsExpense: {
              $cond: [
                {
                  $or: [
                    {$and:[{ $eq: ["$totalRevenue", "$totalExpense"] },{$gt:["$totalExpense", 0]}]}
                    ,
                   { $and:[{ $gt: ["$totalRevenue", "$totalExpense"] },{$gt:["$totalExpense", 0]}]}
                    ,
                  ],
                },
                1,
                0,
              ],
            },
        },
    },
        {
            $group:{
                _id: null,
                totalUlbMeetExpense: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$meetsExpense", 1],
                  },
                  1,
                  0,
                ],
              },
            },
                }
            }
]
console.log(medianData_4m,medianData_1m_4m,medianData_1m_500t,medianData_500t_100t,medianData_100t)
  let numOfUlb = await Ulb.aggregate([
    {
        $project:{
            "4mPlus":{
                $cond:[{$gt:["$population",4000000]},1,0]
                },
                   "4m_1m":{
                $cond:[
                       {
                       $and:[
                       {$lt:["$population",4000000]},
                       {$gt:["$population",1000000]}
                       
                       ]
                   }
                       ,1,0]
                },
                   "1m_500t":{
                $cond:[
                       {
                       $and:[
                       {$lt:["$population",1000000]},
                       {$gt:["$population",500000]}
                       
                       ]
                   }
                       ,1,0]
                },
                   "500t_100t":{
                $cond:[
                       {
                       $and:[
                       {$lt:["$population",500000]},
                       {$gt:["$population",100000]}
                       
                       ]
                   }
                       ,1,0]
                },
                   "100t":{
               $cond:[{$lt:["$population",100000] },1,0]
                }
            }
        },
        {
                $group:{
                    _id: null,
                    "4mPlusPop":{
                        $sum:{
                             $cond:[{$eq:["$4mPlus",1]}, 1, 0]
                            }
                       
                        },
                         "4m_1mPop":{
                        $sum:{
                             $cond:[{$eq:["$4m_1m",1]}, 1, 0]
                            }
                       
                        },
                         "1m_500tPop":{
                        $sum:{
                             $cond:[{$eq:["$1m_500t",1]}, 1, 0]
                            }
                       
                        },
                         "500t_100tPop":{
                        $sum:{
                             $cond:[{$eq:["$500t_100t",1]}, 1, 0]
                            }
                       
                        }, "100tPop":{
                        $sum:{
                             $cond:[{$eq:["$100t",1]}, 1, 0]
                            }
                       
                        }
                    }
            }
        
      
    ])
  let query_4m_c=[]
 let query_1m_4m_c=[]
 let query_500t_1m_c = []
 let query_100t_500t_c = []
 let query_100t_c = []
query_4m_c.push(...query, ...query_4m, ...queryCal, ...count_q)
query_1m_4m_c.push(...query, ...query_1m_4m, ...queryCal, ...count_q)
query_500t_1m_c.push(...query, ...query_500t_1m, ...queryCal, ...count_q)
query_100t_500t_c.push(...query, ...query_100t_500t, ...queryCal, ...count_q)
query_100t_c.push(...query, ...query_100t, ...queryCal, ...count_q)
console.log(util.inspect(query_100t_500t_c,{showHidden: false, depth: null}))
let { countData_4m, countData_1m_4m, countData_1m_500t, countData_500t_100t, countData_100t } = await new Promise(async (resolve, reject) => {
  let prms1 = new Promise(async (rslv, rjct) => {
      let output =  await UlbLedger.aggregate(query_4m_c)
      rslv(output);
  });
  let prms2 = new Promise(async (rslv, rjct) => {
      let output =  await UlbLedger.aggregate(query_1m_4m_c)
      rslv(output);
  });
  let prms3 = new Promise(async (rslv, rjct) => {
      let output =    await UlbLedger.aggregate(query_500t_1m_c);
      rslv(output);
  });
  let prms4 = new Promise(async (rslv, rjct) => {
      let output = await UlbLedger.aggregate(query_100t_500t_c);
      rslv(output);
  });
  let prms5 = new Promise(async (rslv, rjct) => {
      let output = await UlbLedger.aggregate(query_100t_c);
      rslv(output);
  });

  Promise.all([prms1, prms2, prms3, prms4, prms5]).then(
      (outputs) => {
          let countData_4m = outputs[0];
          let countData_1m_4m = outputs[1];
          let countData_1m_500t = outputs[2];
          let countData_500t_100t = outputs[3];
          let countData_100t = outputs[4];
        

          if (countData_4m && countData_1m_4m && countData_1m_500t && countData_500t_100t && countData_100t) {
              resolve({ countData_4m, countData_1m_4m, countData_1m_500t, countData_500t_100t , countData_100t});
          } else {
              reject({ message: "No Data Found" });
          }
      },
      (e) => {
          reject(e);
      }
  );
});


    queryCal.push(
      {

        $group:{
          _id:null,
          numerator:{
            $sum:{
              $multiply:[ "$totalRevenue", "$population"]
            }
          },
          denominator:{
            $sum:"$population"
          },
          totalOwnRevenue:{$sum : "$totalOwnRevenue"},
          totalProperty:{$first:"$totalProperty"},
          totalExpense:{$first:"$totalExpense"},
          population:{$first:"$population"},
        }
      },

      {
          $project:{
            totalRevenue: { $cond: [ { $eq: [ "$denominator", 0 ] }, 0, {"$divide":["$numerator", "$denominator"]} ] } ,
            population:1,
            totalExpense:1,
            totalProperty:1,
            totalOwnRevenue:1

          }

      },
      {
        $project:{
          totalRevenue: 1,
          perCapita: { $cond: [ { $eq: [ "$population", 0 ] }, 0, {"$divide":["$totalRevenue", "$population"]} ] },
          percentage: propertyTax ? {$multiply: [{$cond: [{$eq: ["$totalOwnRevenue", 0]}, 0, {$divide:["$totalRevenue", "$totalOwnRevenue"]}]}, 100]}: {$multiply:[{$cond:[{ $eq: [ "$totalExpense", 0]},0, {"$divide":["$totalRevenue", "$totalExpense"]} ]}, 100]},
          population:1,
          totalExpense:1,
          totalProperty:1
        }

    })
    query_4m.unshift(...query)
    query_4m.push(...queryCal)
    
    query_1m_4m.unshift(...query)
    query_1m_4m.push(...queryCal)
    
    query_500t_1m.unshift(...query)
    query_500t_1m.push(...queryCal)


    query_100t_500t.unshift(...query)
    query_100t_500t.push(...queryCal)

    query_100t.unshift(...query)
    query_100t.push(...queryCal)

    if (getQuery) return Response.OK(res, query);



    let { data_4m, data_1m_4m, data_1m_500t, data_500t_100t, data_100t } = await new Promise(async (resolve, reject) => {
      let prms1 = new Promise(async (rslv, rjct) => {
        console.log(util.inspect(query_4m, {showHidden : false, depth: null}))
          let output =  await UlbLedger.aggregate(query_4m)
          rslv(output);
      });
      let prms2 = new Promise(async (rslv, rjct) => {
          let output =  await UlbLedger.aggregate(query_1m_4m)
          rslv(output);
      });
      let prms3 = new Promise(async (rslv, rjct) => {
          let output =    await UlbLedger.aggregate(query_500t_1m);
          rslv(output);
      });
      let prms4 = new Promise(async (rslv, rjct) => {
          let output = await UlbLedger.aggregate(query_100t_500t);
          rslv(output);
      });
      let prms5 = new Promise(async (rslv, rjct) => {
          let output = await UlbLedger.aggregate(query_100t);
          rslv(output);
      });
    
      Promise.all([prms1, prms2, prms3, prms4, prms5]).then(
          (outputs) => {
              let data_4m = outputs[0];
              let data_1m_4m = outputs[1];
              let data_1m_500t = outputs[2];
              let data_500t_100t = outputs[3];
              let data_100t = outputs[4];
            

              if (data_4m && data_1m_4m && data_1m_500t && data_500t_100t && data_100t) {
                  resolve({ data_4m, data_1m_4m, data_1m_500t, data_500t_100t , data_100t});
              } else {
                  reject({ message: "No Data Found" });
              }
          },
          (e) => {
              reject(e);
          }
      );
  });
console.log(data_1m_4m)
  // data_4m.push(...countData_4m?.totalUlbMeetExpense)

  

  if(data_4m.length>0)
  Object.assign(data_4m[0], {numOfUlbMeetRevenue:((countData_4m[0]?.totalUlbMeetExpense/numOfUlb[0]['4mPlusPop'])*100), median:medianData_4m })
  if(data_1m_4m.length>0)
  Object.assign(data_1m_4m[0], {numOfUlbMeetRevenue:((countData_1m_4m[0]?.totalUlbMeetExpense/numOfUlb[0]['4m_1mPop'] )*100),  median :medianData_1m_4m })
  if(data_1m_500t.length>0)
  Object.assign(data_1m_500t[0], {numOfUlbMeetRevenue:((countData_1m_500t[0]?.totalUlbMeetExpense/numOfUlb[0]['1m_500tPop'] ) *100), median: medianData_1m_500t})
  if(data_500t_100t.length>0)
  Object.assign(data_500t_100t[0], {numOfUlbMeetRevenue:((countData_500t_100t[0]?.totalUlbMeetExpense /numOfUlb[0]['500t_100tPop'] ) * 100), median : medianData_500t_100t })
  if(data_100t.length>0)
  Object.assign(data_100t[0], {numOfUlbMeetRevenue:((countData_100t[0]?.totalUlbMeetExpense/numOfUlb[0]['100tPop'])*100), median :medianData_100t })
  // data_1m_4m[0].push({countData_1m_4m[0].totalUlbMeetExpense)

// let data = await UlbLedger.aggregate(query);

    let newData = {
      ["4 Million+"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["500 Thousand - 1 Million"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["100 Thousand-500 Thousand"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["1 Million - 4 Million"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["<100 Thousand"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
    };

    if(data_4m.length>0)
    newData['4 Million+'] = data_4m[0]
    if(data_1m_500t.length>0)
    newData['500 Thousand - 1 Million'] = data_1m_500t[0]
    if(data_500t_100t.length>0)
    newData['100 Thousand-500 Thousand'] = data_500t_100t[0]
    if(data_1m_4m.length>0)
    newData['1 Million - 4 Million'] = data_1m_4m[0]
    if(data_100t.length>0)
    newData['<100 Thousand'] = data_100t[0]

console.log(newData)
    return Response.OK(res, newData);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null);
  }
};

function parseData(data) {
  let ulbCategory = data.reduce(
    (ulbCategoryMap, value) => {
      if (value.ulb.population < 100000) {
        ulbCategoryMap["<100 Thousand"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["<100 Thousand"].count += 1;
      } else if (100000 < value.ulb.population < 500000) {
        ulbCategoryMap["100 Thousand-500 Thousand"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["100 Thousand-500 Thousand"].count += 1;
      } else if (500000 < value.ulb.population < 1000000) {
        ulbCategoryMap["500 Thousand - 1 Million"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["500 Thousand - 1 Million"].count += 1;
      } else if (1000000 < value.ulb.population < 4000000) {
        ulbCategoryMap["1 Million - 4 Million"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["1 Million - 4 Million"].count += 1;
      } else {
        ulbCategoryMap["4 Million+"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["4 Million+"].count += 1;
      }
      ulbCategoryMap.temp[value.ulb._id] = 1;

      return ulbCategoryMap;
    },
    {
      ["4 Million+"]: { amount: 0, count: 0 },
      ["1 Million - 4 Million"]: { amount: 0, count: 0 },
      ["500 Thousand - 1 Million"]: { amount: 0, count: 0 },
      ["100 Thousand-500 Thousand"]: { amount: 0, count: 0 },
      ["<100 Thousand"]: { amount: 0, count: 0 },
      temp: {},
    }
  );
  delete ulbCategory.temp;

  let chartData = data.reduce((financialYearMap, value) => {
    let valueInMap = financialYearMap[value.financialYear];
    if (valueInMap) {
      let lineItemInMap = valueInMap[value.lineItem.name];
      valueInMap.total += value.amount;
      if (lineItemInMap) {
        lineItemInMap += value.amount;
      } else {
        Object.assign(valueInMap, {
          [value.lineItem.name]: value.amount,
        });
      }
    } else {
      Object.assign(financialYearMap, {
        [value.financialYear]: {
          [value.lineItem.name]: value.amount,
          total: value.amount,
        },
      });
    }
    return financialYearMap;
  }, {});

  let population = data.reduce(
    (ulbMap, value) => {
      if (!ulbMap[value.ulb._id]) {
        ulbMap.total += value.ulb.population;
      }
      return ulbMap;
    },
    { total: 0 }
  );

  return { ...chartData, population, ulbCategory };
}

function getUlbMatchQuery(stateIds, ulbTypeIds) {
  ulbMatch = {};
  if (stateIds) {
    if (!Array.isArray(stateIds)) stateIds = [stateIds];
    Object.assign(ulbMatch, {
      state: { $in: stateIds.map((value) => ObjectId(value)) },
    });
  }
  if (ulbTypeIds) {
    if (!Array.isArray(ulbTypeIds)) ulbTypeIds = [ulbTypeIds];
    Object.assign(ulbMatch, {
      ulbType: { $in: ulbIds.map((value) => ObjectId(value)) },
    });
  }
  return ulbMatch;
}

function calculateMedian(data){
  let values = []
  data.forEach( el => {
values.push(el.ownRevenuePerCapita)
  })
  if(values.length ===0) return 0;

  values.sort(function(a,b){
    return a-b;
  });

  var half = Math.floor(values.length / 2);
  
  if (values.length % 2)
    return values[half];
  
  return (values[half - 1] + values[half]) / 2.0;
}
const topPerForming = async (req, res) => {
  try {
    //     financialYear: "2020-21"
    // list: []
    // param: "Property Tax"
    // populationCategory: ""
    // propertyTax: false
    // stateId: "State Name"
    // type: "state"
    // ulb: "ULB Name"
    // ulbType: "ULB Type"
    const {
      financialYear,
      propertyTax,
      list,
      param,
      populationCategory,
      stateId,
      type,
      ulb,
      ulbType,
      getQuery,
      csv,
    } = req.body;

    if (!financialYear)
      return Response.BadRequest(res, null, "financial year missing");
    let data;
    let matchObj = {};

    // if (ulbType && ObjectId.isValid(ulbType))
    //   Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });

    //   if(populationCategory == '4 Million+'){
    //     Object.assign(matchObj,{"ulb.population":{$gt: 4000000}})

    //   }else if(populationCategory == '500 Thousand - 1 Million'){
    //     Object.assign(matchObj,{"ulb.population":{$gt: 500000, $lt:1000000}})

    //   }else if(populationCategory == '100 Thousand - 500 Thousand'){
    //     Object.assign(matchObj,{"ulb.population":{$gt: 100000, $lt:500000}})

    //   }else if(populationCategory == '1 Million - 4 Million'){
    //     Object.assign(matchObj,{"ulb.population":{$gt: 1000000, $lt:4000000}})

    //   }else if(populationCategory == '<100 Thousand'){
    //     Object.assign(matchObj,{"ulb.population":{$lt: 100000}})

    //   }
    //this is the case of default + top filters in function
    if (list.length == 0) {
      // by default only own revenue per capita
      if (stateId && ObjectId.isValid(stateId))
        Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });

      let query = [
        {
          $match: {
            lineItem: {
              $in: propertyTax
                ? [ObjectId("5dd10c2285c951b54ec1d737")]
                : OwnRevenueList.map((value) => ObjectId(value)),
            },
            financialYear: {
              $in: Array.isArray(financialYear)
                ? financialYear
                : [financialYear],
            },
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $unwind: "$ulb",
        },
      ];
      if (Object.keys(matchObj).length > 0) {
        query.push({
          $match: matchObj,
        });
      }

      let attach = [
        {
          $group: {
            _id: "$ulb._id",
            state: { $first: "$ulb.state" },
            name: { $first: "$ulb.name" },
            totalAmount: { $sum: "$amount" },
            population: { $first: "$ulb.population" },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            state: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$totalAmount", "$population"] },
              ],
            },
          },
        },
        {
          $sort: {
            amount: -1,
          },
        },
        { $limit: 10 },
      ];
      query.push(...attach);

      if (getQuery) {
        return res.json({
          query: query,
        });
      }
      data = await UlbLedger.aggregate(query);
      if (ulb && ObjectId.isValid(ulb)) {
        let ulbData = await UlbLedger.aggregate([
          {
            $match: {
              financialYear: financialYear,
              ulb: ObjectId(ulb),
              lineItem: {
                $in: propertyTax
                  ? [ObjectId("5dd10c2285c951b54ec1d737")]
                  : OwnRevenueList.map((value) => ObjectId(value)),
              },
            },
          },
          {
            $lookup: {
              from: "ulbs",
              localField: "ulb",
              foreignField: "_id",
              as: "ulb",
            },
          },

          {
            $unwind: "$ulb",
          },
          {
            $group: {
              _id: "$ulb._id",
              name: { $first: "$ulb.name" },
              amount: { $sum: "$amount" },
            },
          },
        ]);
        //  console.log('ulbData',ulbData)
        if (ulbData.length > 0) {
          datab.push(...ulbData);
        }
      }
    } else if (list.length > 0) {
      // this is the case where comparison box is in operation
      let newList = [];
      list.forEach((el) => {
        newList.push(el._id);
      });
      if (!type) return res.status(400).json({ msg: "type is required" });
      if (type == "state") {
        let query;
        if (param == "Own Revenue") {
          query = [
            {
              $match: {
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
                lineItem: {
                  $in: propertyTax
                    ? [ObjectId("5dd10c2285c951b54ec1d737")]
                    : OwnRevenueList.map((value) => ObjectId(value)),
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },
            {
              $match: {
                "ulb.state": {
                  $in: newList.map((value) => ObjectId(value)),
                },
              },
            },

            {
              $lookup: {
                from: "states",
                localField: "ulb.state",
                foreignField: "_id",
                as: "state",
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: "$ulb.state",
                name: { $first: "$state.name" },
                amount: { $sum: "$amount" },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        } else if (param == "Own Revenue per Capita") {
          query = [
            {
              $match: {
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
                lineItem: {
                  $in: propertyTax
                    ? [ObjectId("5dd10c2285c951b54ec1d737")]
                    : OwnRevenueList.map((value) => ObjectId(value)),
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },
            {
              $match: {
                "ulb.state": {
                  $in: newList.map((value) => ObjectId(value)),
                },
              },
            },

            {
              $lookup: {
                from: "states",
                localField: "ulb.state",
                foreignField: "_id",
                as: "state",
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: "$ulb.state",
                name: { $first: "$state.name" },
                population: { $sum: "$ulb.population" },
                totalAmount: { $sum: "$amount" },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                amount: {
                  $cond: [
                    { $eq: ["$population", 0] },
                    0,
                    { $divide: ["$totalAmount", "$population"] },
                  ],
                },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        } else if (param == "Own Revenue to Revenue Expenditure") {
          query = [
            {
              $match: {
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
                lineItem: {
                  $in: [
                    ...OwnRevenueList.map((value) => ObjectId(value)),
                    ...expenseCode.map((value) => ObjectId(value)),
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },
            {
              $match: {
                "ulb.state": {
                  $in: newList.map((value) => ObjectId(value)),
                },
              },
            },
            {
              $lookup: {
                from: "lineitems",
                localField: "lineItem",
                foreignField: "_id",
                as: "lineItem",
              },
            },
            {
              $unwind: "$lineItem",
            },
            {
              $lookup: {
                from: "states",
                localField: "ulb.state",
                foreignField: "_id",
                as: "state",
              },
            },
            {
              $unwind: "$state",
            },
            {
              $group: {
                _id: "$ulb.state",
                name: { $first: "$state.name" },
                totalRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$lineItem.code",
                          ["130", "140", "150", "180", "110"],
                        ],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalExpense: {
                  $sum: {
                    $cond: [
                      {
                        $in: ["$lineItem.code", ["210", "220", "230"]],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                amount: {
                  $toInt: {
                    $multiply: [
                      { $divide: ["$totalRevenue", "$totalExpense"] },
                      100,
                    ],
                  },
                },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        }

        data = await UlbLedger.aggregate(query);
      } else if (type == "ulb") {
        let query;
        if (param == "Own Revenue") {
          query = [
            {
              $match: {
                lineItem: {
                  $in: propertyTax
                    ? [ObjectId("5dd10c2285c951b54ec1d737")]
                    : OwnRevenueList.map((value) => ObjectId(value)),
                },
                ulb: {
                  $in: newList.map((value) => ObjectId(value)),
                },
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },

            {
              $group: {
                _id: "$ulb._id",
                name: { $first: "$ulb.name" },
                amount: { $sum: "$amount" },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        } else if (param == "Own Revenue per Capita") {
          query = [
            {
              $match: {
                lineItem: {
                  $in: propertyTax
                    ? [ObjectId("5dd10c2285c951b54ec1d737")]
                    : OwnRevenueList.map((value) => ObjectId(value)),
                },
                ulb: {
                  $in: newList.map((value) => ObjectId(value)),
                },
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },

            {
              $group: {
                _id: "$ulb._id",
                name: { $first: "$ulb.name" },
                totalAmount: { $sum: "$amount" },
                population: { $sum: "$ulb.population" },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                amount: {
                  $cond: [
                    { $eq: ["$population", 0] },
                    0,
                    { $divide: ["$totalAmount", "$population"] },
                  ],
                },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        } else if (param == "Own Revenue to Revenue Expenditure") {
          query = [
            {
              $match: {
                financialYear: {
                  $in: Array.isArray(financialYear)
                    ? financialYear
                    : [financialYear],
                },
                lineItem: {
                  $in: [
                    ...OwnRevenueList.map((value) => ObjectId(value)),
                    ...expenseCode.map((value) => ObjectId(value)),
                  ],
                },
                ulb: {
                  $in: newList.map((value) => ObjectId(value)),
                },
              },
            },
            {
              $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulb",
              },
            },
            {
              $unwind: "$ulb",
            },

            {
              $lookup: {
                from: "lineitems",
                localField: "lineItem",
                foreignField: "_id",
                as: "lineItem",
              },
            },
            {
              $unwind: "$lineItem",
            },

            {
              $group: {
                _id: "$ulb._id",
                name: { $first: "$ulb.name" },
                totalRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $in: [
                          "$lineItem.code",
                          ["130", "140", "150", "180", "110"],
                        ],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalExpense: {
                  $sum: {
                    $cond: [
                      {
                        $in: ["$lineItem.code", ["210", "220", "230"]],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                amount: {
                  $toInt: {
                    $multiply: [
                      { $divide: ["$totalRevenue", "$totalExpense"] },
                      100,
                    ],
                  },
                },
              },
            },
            {
              $sort: {
                amount: -1,
              },
            },
            { $limit: 10 },
          ];
        }

        data = await UlbLedger.aggregate(query);
      }
    }

    // console.log(datab)
    // if (datab.length == 0)
    // return Response.BadRequest(res, null, "No data Found");

    // if (getQuery) return Response.OK(res, query);

    // let data = await UlbLedger.aggregate(query);

    if (csv) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Top Performing");
      worksheet.columns = [
        { header: "Name", key: "name" },
        { header: "amount", key: "amount" },
      ];
      data.map((value) => {
        worksheet.addRow(value);
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=" + "topPerFormance.xlsx"
      );
      return workbook.xlsx.write(res).then(function () {
        res.status(200).end();
      });
    }
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports = {
  dataAvailability,
  chartData,
  chartData2,
  topPerForming,
  cardsData,
  tableData,
  yearlist
};


