const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");
const ExcelJS = require("exceljs");
const util = require('util')
const revenueList = [ "130", "140", "150", "180", "110"];
const ObjectIdOfRevenueList = [
  "5dd10c2285c951b54ec1d737",
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
  "5dd10c2685c951b54ec1d760",
];

const dataAvailability = async (req, res) => {
  try {
    const { financialYear, propertyTax, getQuery, stateId, ulb, ulbType, csv } =
      req.body;

    if (!financialYear) {
      return Response.BadRequest(res, null, "financialYear is required");
    }

    let query = [
      {
        $match: {
          lineItem: {
            $in: propertyTax
              ? [ObjectId("5dd10c2285c951b54ec1d737")]
              : ObjectIdOfRevenueList.map((value) => ObjectId(value)),
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
    if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
    if (ulb && ObjectId.isValid(ulb))
      Object.assign(matchObj, { "ulb._id": ObjectId(ulb) });

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
      return getExcelForAvailability(res, query);
    } else {
      query.push({
        $count: "ulb",
      });
    }

    if (getQuery) return Response.OK(res, query);
let query_noData = [
  {
    $lookup: {
      from: "ulbledgers",
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
  $match:

 {
   ledgerData: {$size: 0},
population:{$gte:4000000}
},
  
}


]

let noData = await Ulb.aggregate(query_noData)
    let data = await UlbLedger.aggregate(query);
    let ulbCount = await Ulb.find().count();

    data = data[0]?.ulb ?? 0;
let names =[]
if(noData){
  noData.forEach(el=>{
names.push(el.name)
  })
}
    data = (data / ulbCount) * 100;

    return Response.OK(res, { percent: data,
    names: names });
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

async function getExcelForAvailability(res, query) {
  let ulbCount = await Ulb.find()
    .populate("state")
    .select({ _id: 1, name: 1, code: 1, censusCode: 1, state: 1 })
    .lean();
  let data = await UlbLedger.aggregate(query);
  data = JSON.parse(JSON.stringify(data));
  let ulbMap = data.map((value) => value._id);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data Availability");
  worksheet.columns = [
    { header: "ULB name", key: "ulb" },
    { header: "ULB Code", key: "code" },
    { header: "Census/SB Code", key: "censusCode" },
    { header: "State Name", key: "state" },
    { header: "Data Availability", key: "status" },
  ];
  ulbCount.map((value) => {
    value = JSON.parse(JSON.stringify(value));
    if (value._id == "5fa281a3c7ffa964f0cfa9fb") {
      console.log("Ss");
    }
    let obj = {
      ulb: value.name,
      code: value.code,
      censusCode: value.censusCode,
      state: value.state.name,
      status: ulbMap.includes(value._id) ? "True" : "False",
    };
    worksheet.addRow(obj);
  });
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
    const { ulbType, ulb, stateId, financialYear, getQuery } = req.body;

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
    if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
    if (ulb && ObjectId.isValid(ulb))
      Object.assign(matchObj, { "ulb._id": ObjectId(ulb) });

    if (Object.keys(matchObj) > 0) {
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
        },
      }
    );

    if (getQuery) return Response.OK(res, query);

    let data = await UlbLedger.aggregate(query);

    let temp = {
      _id: {
        revenueName: "Other Tax Revenue",
      },
      amount:
        data.find((value) => value._id.revenueName == "Tax Revenue")?.amount -
        data.find((value) => value._id.revenueName == "Property Tax")?.amount,
      population: data.find((value) => value._id.revenueName == "Tax Revenue")
        ?.population,
    };
    data.push(temp);
    data = data.filter((value) => value._id.revenueName != "Tax Revenue");
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null);
  }
};

const cardsData = async (req, res) => {
  try {
    let { ulbType, ulb, stateId, financialYear, getQuery } = req.body;

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
    if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
    if (ulb && ObjectId.isValid(ulb))
      Object.assign(matchObj, { "ulb._id": ObjectId(ulb) });

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
          totalRevenue: {
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
                  $in: ["$lineItem.code", ["210", "220", "230", "240"]],
                },
                "$amount",
                0,
              ],
            },
          },
          population: {
            $sum: "$ulb.population",
          },
        },
      },
      {
        $project: {
          _id: 1,
          meetsExpense: {
            $cond: [
              {
                $or: [
                  { $eq: ["$totalRevenue", "$totalExpense"] },
                  { $gt: ["$totalExpense", "$totalRevenue"] },
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
        $group: {
          _id: {
            financialYear: "$financialYear",
          },
          totalRevenue: {
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
                  $in: ["$lineItem.code", ["210", "220", "230", "240"]],
                },
                "$amount",
                0,
              ],
            },
          },
          population: {
            $sum: "$ulb.population",
          },
        },
      },
      {
        $project: {
          _id: 1,
          perCapita: { $divide: ["$totalRevenue", "$population"] },
          totalRevenue: 1,
          percentage: {
            $multiply: [{ $divide: ["$totalRevenue", "$totalExpense"] }, 100],
          },
          totalProperty: 1,
          population: 1,
        },
      },
      {
        $sort: { "_id.financialYear": 1 },
      }
    );

    if (getQuery) return Response.OK(res, { query, query2 });
console.log(util.inspect(query, {showHidden : false, depth : null}))
console.log(util.inspect(query2, {showHidden : false, depth : null}))
let redisKey =  "OwnRevenueCards";

  // let dataCard = await Redis.getDataPromise(redisKey); 

  let data = UlbLedger.aggregate(query);
  let ulbCountExpense = UlbLedger.aggregate(query2);
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
    let { ulbType, ulb, stateId, financialYear, getQuery } = req.body;

    if (
      !financialYear || Array.isArray(financialYear)
        ? financialYear.length == 0
        : false
    )
      return Response.BadRequest(res, null, "financialYear as array required");

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
    if (stateId && ObjectId.isValid(stateId))
      Object.assign(matchObj, { "ulb.state": ObjectId(stateId) });
    if (ulbType && ObjectId.isValid(ulbType))
      Object.assign(matchObj, { "ulb.ulbType": ObjectId(ulbType) });
    if (ulb && ObjectId.isValid(ulb))
      Object.assign(matchObj, { "ulb._id": ObjectId(ulb) });

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
    query.push(
      {
        $group: {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          totalRevenue: {
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
                  $in: ["$lineItem.code", ["210", "220", "230", "240"]],
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
        $sort: { "_id.financialYear": 1 },
      }
    );

    if (getQuery) return Response.OK(res, query);
console.log(util.inspect(query,{showHidden: false, depth: null}))
    let data = await UlbLedger.aggregate(query);

    let newData = {
      ["4M+"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["500K-1M"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["100K-500K"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["1M-4M"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
      ["<100K"]: {
        totalRevenue: 0,
        numOfUlb: 0,
        population: 0,
        numOfUlbMeetRevenue: 0,
        totalExpense: 0,
        totalProperty: 0,
      },
    };

    newData = data.reduce((newData, value) => {
      if (value.population < 100000) {
        newData["<100K"].totalRevenue += value.totalRevenue;
        newData["<100K"].numOfUlbMeetRevenue +=
          value.totalExpense >= value.totalRevenue ? 1 : 0;
        newData["<100K"].population += value.population;
        newData["<100K"].numOfUlb += 1;
        newData["<100K"].totalExpense += value.totalExpense;
        newData["<100K"].totalProperty += value.totalProperty;
      } else if (100000 < value.population < 500000) {
        newData["100K-500K"].totalRevenue += value.totalRevenue;
        newData["100K-500K"].numOfUlbMeetRevenue +=
          value.totalExpense >= value.totalRevenue ? 1 : 0;
        newData["100K-500K"].population += value.population;
        newData["100K-500K"].numOfUlb += 1;
        newData["100K-500K"].totalExpense += value.totalExpense;
        newData["100K-500K"].totalProperty += value.totalProperty;
      } else if (500000 < value.population < 1000000) {
        newData["500K-1M"].totalRevenue += value.totalRevenue;
        newData["500K-1M"].numOfUlbMeetRevenue +=
          value.totalExpense >= value.totalRevenue ? 1 : 0;
        newData["500K-1M"].population += value.population;
        newData["500K-1M"].numOfUlb += 1;
        newData["500K-1M"].totalExpense += value.totalExpense;
        newData["500K-1M"].totalProperty += value.totalProperty;
      } else if (1000000 < value.population < 4000000) {
        newData["1M-4M"].totalRevenue += value.totalRevenue;
        newData["1M-4M"].numOfUlbMeetRevenue +=
          value.totalExpense >= value.totalRevenue ? 1 : 0;
        newData["1M-4M"].population += value.population;
        newData["1M-4M"].numOfUlb += 1;
        newData["1M-4M"].totalExpense += value.totalExpense;
        newData["1M-4M"].totalProperty += value.totalProperty;
      } else {
        newData["4M+"].totalRevenue += value.totalRevenue;
        newData["4M+"].numOfUlbMeetRevenue +=
          value.totalExpense >= value.totalRevenue ? 1 : 0;
        newData["4M+"].population += value.population;
        newData["4M+"].numOfUlb += 1;
        newData["4M+"].totalExpense += value.totalExpense;
        newData["4M+"].totalProperty += value.totalProperty;
      }

      return newData;
    }, newData);

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
        ulbCategoryMap["<100K"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["<100K"].count += 1;
      } else if (100000 < value.ulb.population < 500000) {
        ulbCategoryMap["100K-500K"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["100K-500K"].count += 1;
      } else if (500000 < value.ulb.population < 1000000) {
        ulbCategoryMap["500K-1M"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["500K-1M"].count += 1;
      } else if (1000000 < value.ulb.population < 4000000) {
        ulbCategoryMap["1M-4M"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["1M-4M"].count += 1;
      } else {
        ulbCategoryMap["4M+"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["4M+"].count += 1;
      }
      ulbCategoryMap.temp[value.ulb._id] = 1;

      return ulbCategoryMap;
    },
    {
      ["4M+"]: { amount: 0, count: 0 },
      ["1M-4M"]: { amount: 0, count: 0 },
      ["500K-1M"]: { amount: 0, count: 0 },
      ["100K-500K"]: { amount: 0, count: 0 },
      ["<100K"]: { amount: 0, count: 0 },
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

const topPerForming = async (req, res) => {
  try {
    const { revenueId, stateIds, getQuery, csv, revenueName } = req.body;

    if (!revenueId)
      return Response.BadRequest(res, null, "wrong revenueIds or stateIds");

    let query = [
      {
        $match: {
          lineItem: ObjectId(revenueId),
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
          amount: { $sum: "$amount" },
          name: { $first: "$state.name" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
    ];

    if (stateIds) {
      if (Array.isArray(stateIds) && stateIds.length > 0) {
        query.splice(3, 0, {
          $match: {
            $expr: {
              $in: ["$ulb.state", stateIds.map((value) => ObjectId(value))],
            },
          },
        });
      } else if (!Array.isArray(stateIds)) {
        query.splice(3, 0, {
          $match: {
            "ulb.state": ObjectId(stateIds),
          },
        });
      }
    }

    if (getQuery) return Response.OK(res, query);

    let data = await UlbLedger.aggregate(query);
    if (data.length == 0)
      return Response.BadRequest(res, null, "No data Found");

    if (csv) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Top Performing");
      worksheet.columns = [
        { header: "Name", key: "name" },
        { header: revenueName, key: "amount" },
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
        "attachment; filename=" + "Data_Availability.xlsx"
      );
      return workbook.xlsx.write(res).then(function () {
        res.status(200).end();
      });
    }
    return Response.OK(res, data);
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
};
