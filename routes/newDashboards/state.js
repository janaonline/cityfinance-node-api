const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Indicator = require("../../models/indicators");
const IndicatorLineItems = require("../../models/indicatorLineItems");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const catchAsync = require("../../util/catchAsync");
const util = require("util");
const axios = require("axios").default;
const ExcelJS = require("exceljs");
const fs = require("fs");
// own revenue
//  ObjectId("5dd10c2485c951b54ec1d74b"),
// ObjectId("5dd10c2685c951b54ec1d762"),
// ObjectId("5dd10c2485c951b54ec1d74a"),
// ObjectId("5dd10c2885c951b54ec1d77e"),
// ObjectId("5dd10c2385c951b54ec1d748"),


// all revenue
// ObjectId("5dd10c2685c951b54ec1d761"),
// ObjectId("5dd10c2785c951b54ec1d776"),
// ObjectId("5dd10c2585c951b54ec1d75b"),
// ObjectId("5dd10c2885c951b54ec1d77e"),
// ObjectId("5dd10c2485c951b54ec1d74b"),
// ObjectId("5dd10c2385c951b54ec1d748"),
// ObjectId("5dd10c2685c951b54ec1d762"),
// ObjectId("5dd10c2485c951b54ec1d74f"),
// ObjectId("5dd10c2785c951b54ec1d778"),
// ObjectId("5dd10c2485c951b54ec1d74a"),
const ObjectIdOfRevenueList = [
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74a",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2385c951b54ec1d748",
];

const All_Revenue_ObjectIDs = [
  "5dd10c2685c951b54ec1d761",
  "5dd10c2785c951b54ec1d776",
  "5dd10c2585c951b54ec1d75b",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2385c951b54ec1d748",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74f",
  "5dd10c2785c951b54ec1d778",
  "5dd10c2485c951b54ec1d74a",
];
const All_Expense_ObjectIDs = [
  "5dd10c2385c951b54ec1d743",
  "5dd10c2685c951b54ec1d760",
  "5dd10c2585c951b54ec1d75e",
  "5dd10c2585c951b54ec1d755",
  "5dd10c2585c951b54ec1d75f",
  "5dd10c2585c951b54ec1d756",
  "5dd10c2585c951b54ec1d75a",
  "5dd10c2585c951b54ec1d753",
  "5dd10c2485c951b54ec1d74e",
  "5dd10c2385c951b54ec1d744",
  "5dd10c2785c951b54ec1d77c",
  "5dd10c2385c951b54ec1d746",
];

const Revenue_Expenditure = [
  "5dd10c2385c951b54ec1d743",
  "5dd10c2585c951b54ec1d753",
  "5dd10c2585c951b54ec1d75a",
  "5dd10c2585c951b54ec1d756",
  "5dd10c2685c951b54ec1d760",
];

const Capital_Expenditure = [
  "5dd10c2785c951b54ec1d779",
  "5dd10c2785c951b54ec1d774",
];

const scatterMap = async (req, res) => {
  try {
    const { financialYear } = req.body;

    let query = [
      {
        $match: {
          lineItem: {
            $in: [
              ObjectId("5dd10c2485c951b54ec1d74b"),
              ObjectId("5dd10c2285c951b54ec1d737"),
              ObjectId("5dd10c2685c951b54ec1d762"),
              ObjectId("5dd10c2485c951b54ec1d74a"),
              ObjectId("5dd10c2885c951b54ec1d77e"),
              ObjectId("5dd10c2385c951b54ec1d748"),
            ],
          },
          financialYear: {
            $in: ["2018-19"],
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
          _id: {
            ulb: "$ulb._id",
            ulbType: "$ulb.ulbType",
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
          population: {
            $first: "$ulb.population",
          },
        },
      },
    ];

    let stateAvg = [...query];
    stateAvg.pop();
    stateAvg.push({
      $group: {
        _id: {
          ulb: "$ulb.state",
        },
        totalRevenue: {
          $avg: {
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
        population: {
          $sum: "$ulb.population",
        },
      },
    });

    let nationalAvg = [...query];
    nationalAvg.pop();
    nationalAvg.push({
      $group: {
        _id: null,
        totalRevenue: {
          $avg: {
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
        population: {
          $sum: "$ulb.population",
        },
      },
    });

    let data = await Promise.all([
      UlbLedger.aggregate(query),
      UlbLedger.aggregate(stateAvg),
      UlbLedger.aggregate(nationalAvg),
    ]);

    if (!data.length) return Response.BadRequest(res, null, "No RecordFound");

    let newData = {
      ["4M+"]: [],
      ["500K-1M"]: [],
      ["100K-500K"]: [],
      ["1M-4M"]: [],
      ["<100K"]: [],
    };

    newData = data.reduce((newData, value) => {
      if (value.population < 100000) {
        newData["<100K"].push(value);
      } else if (100000 < value.population < 500000) {
        newData["100K-500K"].push(value);
      } else if (500000 < value.population < 1000000) {
        newData["500K-1M"].push(value);
      } else if (1000000 < value.population < 4000000) {
        newData["1M-4M"].push(value);
      } else {
        newData["4M+"].push(value);
      }
      return newData;
    }, newData);

    return Response.OK(res, newData);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const getFYsSLB = catchAsync(async (req, res) => {
  let arr = await Indicator.distinct("year");
  let reversedArr = arr.sort().reverse();

  return res.status(200).json({
    success: true,
    data: reversedArr,
  });
});

const calData = (data, filterName = "") => {
  if (
    filterName == "own revenue mix" ||
    filterName == "revenue expenditure mix"
  ) {
    return data;
  } else if (filterName == "expenditure mix") {
    let copyData = [];
    copyData = data.slice();
    let otherExp = 0;
    for (let el of data) {
      if (
        el.code == "250" ||
        el.code == "260" ||
        el.code == "271" ||
        el.code == "270" ||
        el.code == "280" ||
        el.code == "272" ||
        el.code == "290"
      ) {
        otherExp = otherExp + el.amount;
        let index = copyData.indexOf(el);
        if (index > -1 && index != copyData.length - 1)
          copyData.splice(index, 1);
        if (index == copyData.length - 1) {
          copyData.pop(el);
        }
      } else {
        continue;
      }
    }
    copyData.push({
      _id: "Other Expenditure",
      code: ["250", "260", "271", "270", "280", "272", "290"],
      amount: otherExp,
      colour: "#0FA386"
    });
    return copyData;
  } else {
    let copyData = [
      {
        _id: "Own Revenue",
        code: ["110", "130", "140", "150", "180"],
        amount: 0,
        colour: "#25C7CE",
      },
      {
        _id: "Assigned Revenues & Compensation",
        code: ["120"],
        amount: 0,
        colour: "",
      },
      {
        _id: "Grants",
        code: ["160"],
        amount: 0,
        colour: "",
      },
      {
        _id: "Interest Income",
        code: ["171"],
        amount: 0,
        colour: "",
      },
      {
        _id: "Other Receipts",
        code: ["170", "100"],
        amount: 0,
        colour: "#00ff80",
      },
    ];
    for (let el of data) {
      let temp = copyData.find((value) => value.code.includes(el.code));
      if (temp) {
        temp.amount += el.amount;
        if (!temp.colour) temp.colour = el.colour;
      }
    }
    return copyData;
  }
};

const revenue = catchAsync(async (req, res) => {
  let {
    state,
    financialYear,
    headOfAccount,
    filterName,
    isPerCapita,
    ulb,
    compareType,
    getQuery,
    sortBy,
  } = req.body;
let ulbIdArr = ulb;
  if (!state || !financialYear || !headOfAccount || !filterName) {
    return res.status(400).json({
      success: false,
      message: "Missing Information",
    });
  }
  const HashTable = new Map();
  let ulbIDs = [],
    AllULBs = [];

  AllULBs = await Ulb.find({ state: ObjectId(state),isActive:true })
    .select("_id")
    .lean();
  AllULBs = AllULBs.map((each) => {
    HashTable.set(each._id.toString(), true);
    return each._id;
  });
  if (!ulb.length) {
    ulbIDs = AllULBs;
  } else {
    ulb = ulb.map((value) => {
      return ObjectId(value);
    });
    ulbIDs = ulb;
  }
  let base_query = [
    {
      $match: {
        financialYear: financialYear,
        ulb: {
          $in: [...ulbIDs],
        },
      },
    },
  ];
  // state Avg is calculatd separately to handle the ulb specific searches
  let state_avg_base_query = [
    {
      $match: {
        financialYear: financialYear,
        ulb: {
          $in: [...AllULBs],
        },
      },
    },
  ];

  // total revenue and revenue per capita
  if (filterName == "revenue") {
    let query = [
      {
        $match: {
          lineItem: {
            $in: [...All_Revenue_ObjectIDs.map((value) => ObjectId(value))],
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
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          population: { $first: "$ulb.population" },
          ulbType: { $first: "$ulbType.name" },
          amount: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ];
    finalQuery = [...base_query, ...query];
    finalQuery_stateAvg = [...state_avg_base_query, ...query];
    let tenData = [];
    console.log(util.inspect(finalQuery, { showHidden: false, depth: null }));
    // is per capita attachment code
    if (isPerCapita) {
      let perCapitaQuery = [
        {
          $project: {
            ulbName: 1,
            population: 1,
            ulbType: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$amount", "$population"] },
              ],
            },
          },
        },
      ];
      finalQuery.push(...perCapitaQuery);
      finalQuery_stateAvg.push(...perCapitaQuery);
    }

    let data = await Promise.all([
      UlbLedger.aggregate(finalQuery),
      UlbLedger.aggregate(finalQuery_stateAvg),
    ]);
    // console.log(util.inspect(data, {showHidden: false, depth: null}))
    // finding Top ten or bottom ten data
    tenData = fetchTen(data[0], sortBy);
    // calculating State Avg
    let stateAvg = calculateStateAvg(data[1]);
    // console.log(tenData, stateAvg);
    // grouping the data in ulbTypewise
    let groupedData = groupDataTypeWise(data[0]);

    Object.assign(groupedData, { stateAvg: stateAvg });
    // table Data api called
    if (sortBy) {
      return res.status(200).json({
        success: true,
        data: tenData,
      });
    } else {
      // scatter plot api called
      return res.status(200).json({
        success: true,
        data: groupedData,
      });
    }
  } else if (
    filterName.includes("own revenue") &&
    !filterName.includes("mix")
  ) {
    // total own revenue and revenue per capita Tabs
    let query = [
      {
        $match: {
          lineItem: {
            $in: [...ObjectIdOfRevenueList.map((value) => ObjectId(value))],
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
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          population: { $first: "$ulb.population" },
          ulbType: { $first: "$ulbType.name" },
          amount: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ];
    finalQuery = [...base_query, ...query];
    finalQuery_stateAvg = [...state_avg_base_query, ...query];
    let tenData = [];
    // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
    // is per capita attachment code
    if (isPerCapita) {
      let perCapitaQuery = [
        {
          $project: {
            ulbName: 1,
            population: 1,
            ulbType: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$amount", "$population"] },
              ],
            },
          },
        },
      ];
      finalQuery.push(...perCapitaQuery);
      finalQuery_stateAvg.push(...perCapitaQuery);
    }

    let data = await Promise.all([
      UlbLedger.aggregate(finalQuery),
      UlbLedger.aggregate(finalQuery_stateAvg),
    ]);
    // console.log(util.inspect(data, {showHidden: false, depth: null}))
    // finding Top ten or bottom ten data
    tenData = fetchTen(data[0], sortBy);
    // calculating State Avg
    let stateAvg = calculateStateAvg(data[1]);
    // console.log(tenData, stateAvg);
    // grouping the data in ulbTypewise
    let groupedData = groupDataTypeWise(data[0]);

    Object.assign(groupedData, { stateAvg: stateAvg });
    // table Data api called
    if (sortBy) {
      return res.status(200).json({
        success: true,
        data: tenData,
      });
    } else {
      // scatter plot api called
      return res.status(200).json({
        success: true,
        data: groupedData,
      });
    }
  } else if (
    filterName.includes("revenue expenditure") &&
    !filterName.includes("mix")
  ) {
    // revenue expenditure Tabs
    let query = [
      {
        $match: {
          lineItem: {
            $in: [...Revenue_Expenditure.map((value) => ObjectId(value))],
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
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          population: { $first: "$ulb.population" },
          ulbType: { $first: "$ulbType.name" },
          amount: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ];
    finalQuery = [...base_query, ...query];
    finalQuery_stateAvg = [...state_avg_base_query, ...query];
    let tenData = [];
    // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
    // is per capita attachment code
    if (isPerCapita) {
      let perCapitaQuery = [
        {
          $project: {
            ulbName: 1,
            population: 1,
            ulbType: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$amount", "$population"] },
              ],
            },
          },
        },
      ];
      finalQuery.push(...perCapitaQuery);
      finalQuery_stateAvg.push(...perCapitaQuery);
    }

    let data = await Promise.all([
      UlbLedger.aggregate(finalQuery),
      UlbLedger.aggregate(finalQuery_stateAvg),
    ]);
    // console.log(util.inspect(data, {showHidden: false, depth: null}))
    // finding Top ten or bottom ten data
    tenData = fetchTen(data[0], sortBy);
    // calculating State Avg
    let stateAvg = calculateStateAvg(data[1]);
    // console.log(tenData, stateAvg);
    // grouping the data in ulbTypewise
    let groupedData = groupDataTypeWise(data[0]);

    Object.assign(groupedData, { stateAvg: stateAvg });
    // table Data api called
    if (sortBy) {
      return res.status(200).json({
        success: true,
        data: tenData,
      });
    } else {
      // scatter plot api called
      return res.status(200).json({
        success: true,
        data: groupedData,
      });
    }
  } else if (filterName.includes("mix")) {
   
    let idArray = [];
    switch (filterName) {
      case "revenue mix":
        idArray = All_Revenue_ObjectIDs;

        break;
      case "own revenue mix":
        idArray = ObjectIdOfRevenueList;

        break;
      case "expenditure mix":
        idArray = All_Expense_ObjectIDs;

        break;
      case "revenue expenditure mix":
        idArray = Revenue_Expenditure;

        break;

      default:
        break;
    }
    let query = [
      {
        $match: {
          lineItem: {
            $in: [...idArray.map((value) => ObjectId(value))],
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
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem",
        },
      },
      { $unwind: "$lineItem" },
      {
        $group: {
          _id: "$lineItem.name",
          code: { $first: "$lineItem.code" },
          amount: { $sum: "$amount" },
          colour: { $first: "$lineItem.colour" },
        },
      },
    ];

    if ((compareType == "default" || compareType == "") && !ulb.length) {
      finalQuery = [...base_query, ...query];
      let tenData = [];
      // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
      let data = await Promise.all([UlbLedger.aggregate(finalQuery)]);
      data = calData(data[0], filterName);
     Object.assign(data, )
      return res.status(200).json({
        success: true,
        data: data,
      });
    } else if (compareType == "" && ulb) {
      finalQuery = [...base_query, ...query];
      finalQuery_state = [ {
        $match: {
          financialYear: financialYear,
          ulb: {
            $in: [...AllULBs],
          },
        },
      }, ...query];
      let data = await Promise.all([UlbLedger.aggregate(finalQuery)]);
      let data_state = await Promise.all([UlbLedger.aggregate(finalQuery_state)]);
      data_state = calData(data_state[0], filterName);
      data = calData(data[0], filterName);
      return res.status(200).json({
        success: true,
        state: data_state,
        ulb: data
      });
    } else if (compareType == "ulbType") {
   let data =[]
      if(ulb.length == 1){
        finalQuery_ulb = [...base_query, ...query];
         data = await Promise.all([UlbLedger.aggregate(finalQuery_ulb)]);
         data = calData(data[0], filterName);
      }
     
     let finalQuery_state = [
      {
        $match: {
          financialYear: financialYear,
          ulb: {
            $in: [...AllULBs],
          },
        },
      }
    , ...query];
  
      // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
      let rawData = await Promise.all([UlbLedger.aggregate(finalQuery_state)]);
      let stateData = calData(rawData[0], filterName);
      let ulbIDArr = await Ulb.aggregate([
        {
          $group: {
            _id: "$ulbType",
            ulb: { $addToSet: "$_id" },
          },
        },
      ]);
      let obj = {
        tpData: [],
        mcData: [],
        mData: [],
      };
      let finalArr = [];
      for (let el of ulbIDArr) {
        base_query = [
          {
            $match: {
              financialYear: financialYear,
              ulb: {
                $in: [...el.ulb],
              },
            },
          },
        ];
        finalQuery = [...base_query, ...query];
       console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
        let tenData = [];
        // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
        let data = await UlbLedger.aggregate(finalQuery);
        console.log(el._id);
        data = calData(data, filterName);
        if (el._id.valueOf() == "5dcfa66b43263a0e75c71696") {
          // town Panchayat
          obj.tpData.push(data);
        } else if (el._id.valueOf() == "5dcfa67543263a0e75c71697") {
          // municipal corporation
          obj.mcData.push(data);
        } else if (el._id.valueOf() == "5dcfa64e43263a0e75c71695") {
          // Municipality
          obj.mData.push(data);
        }

        finalArr.push(obj);
      }
    Object.assign(  finalArr[0], {ulb:data, state: stateData})
      return res.status(200).json({
        success: true,
        data: finalArr[0]
        
      });
    } else if (compareType == "popType") {
      let data =[]
      if(ulb.length == 1){
        finalQuery_ulb = [...base_query, ...query];
         data = await Promise.all([UlbLedger.aggregate(finalQuery_ulb)]);
         data = calData(data[0], filterName);
      }
      let finalQuery_state = [
        {
          $match: {
            financialYear: financialYear,
            ulb: {
              $in: [...AllULBs],
            },
          },
        }
      , ...query];
  
      // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
      let rawData = await Promise.all([UlbLedger.aggregate(finalQuery_state)]);
      let stateData = calData(rawData[0], filterName);
      let ulbIDObj = await Ulb.aggregate([
        {
          $group: {
            _id: "",
            "<100k": {
              $addToSet: {
                $cond: [{ $lt: ["$population", 100000] }, "$_id", ""],
              },
            },

            "1m-4m": {
              $addToSet: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$population", 4000000] },
                      { $gt: ["$population", 1000000] },
                    ],
                  },
                  "$_id",
                  "",
                ],
              },
            },

            "4m+": {
              $addToSet: {
                $cond: [{ $gt: ["$population", 4000000] }, "$_id", ""],
              },
            },

            "500k-1M": {
              $addToSet: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$population", 1000000] },
                      { $gt: ["$population", 500000] },
                    ],
                  },
                  "$_id",
                  "",
                ],
              },
            },

            "100k-500k": {
              $addToSet: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$population", 500000] },
                      { $gt: ["$population", 100000] },
                    ],
                  },
                  "$_id",
                  "",
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "<100k": 1,
            "1m-4m": 1,
            "4m+": 1,
            "500k-1M": 1,
            "100k-500k": 1,
          },
        },
      ]);
      let obj = {
        "<100k": [],
        "100k-500k": [],
        "500k-1M": [],
        "1M-4M": [],
        "4M+": [],
      };
      let finalArr = [];
      let ulbIDArr = Object.values(ulbIDObj[0]);
      let keyArr = Object.keys(ulbIDObj[0]);
      let output = {};
      let prms1 = new Promise(async (rslv, rjct) => {
        let i = 0;
        for await (let el of ulbIDArr) {
          base_query = [
            {
              $match: {
                financialYear: financialYear,
                ulb: {
                  $in: [...el],
                },
              },
            },
          ];
          finalQuery = [...base_query, ...query];
          let tenData = [];
          // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
          let data = await Promise.all([UlbLedger.aggregate(finalQuery)]);
          console.log(el._id);
          data = calData(data[0], filterName);
          let key = keyArr[i];
          Object.assign(output, { [key]: data });
          i++;
        }

        rslv(output);
      });
     
      prms1.then((values) => {
        console.log(values);
        Object.assign(  values, {ulb:data, state: stateData})
        return res.status(200).json({
          success: true,
          data: values,
        });
      });
    }
  } else if (filterName == "own revenue mix") {
    let base_query = [
      {
        $match: {
          lineItem: {
            $in: [...ObjectIdOfRevenueList.map((value) => ObjectId(value))],
          },
          financialYear: financialYear,
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
          "ulb.state": ObjectId(state),
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
        $group: {
          _id: "$lineItem.name",
          amount: { $sum: "$amount" },
          code: { $first: "$lineItem.code" },
          colour: { $first: "$lineItem.colour" },
        },
      },
    ];
    let data = await UlbLedger.aggregate(base_query);

    return res.status(200).json({
      success: true,
      data: data,
    });
  } else if (filterName == "total surplus/deficit") {
    let query = [
      {
        $match: {
          lineItem: {
            $in: [
              ...All_Revenue_ObjectIDs.map((value) => ObjectId(value)),
              ...All_Expense_ObjectIDs.map((value) => ObjectId(value)),
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
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          population: { $first: "$ulb.population" },
          ulbType: { $first: "$ulbType.name" },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $eq: ["$lineItem.headOfAccount", "Revenue"],
                },
                "$amount",
                0,
              ],
            },
          },
          totalExpenditure: {
            $sum: {
              $cond: [
                {
                  $eq: ["$lineItem.headOfAccount", "Expense"],
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
          ulbName: 1,
          population: 1,
          ulbType: 1,
          totalExpenditure: 1,
          totalRevenue: 1,
          amount: { $subtract: ["$totalRevenue", "$totalExpenditure"] },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ];
    finalQuery = [...base_query, ...query];
    finalQuery_stateAvg = [...state_avg_base_query, ...query];
    let tenData = [];
    // console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
    // is per capita attachment code
    if (isPerCapita) {
      let perCapitaQuery = [
        {
          $project: {
            ulbName: 1,
            population: 1,
            ulbType: 1,
            totalExpenditure: 1,
            totalRevenue: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$amount", "$population"] },
              ],
            },
          },
        },
      ];
      finalQuery.push(...perCapitaQuery);
      finalQuery_stateAvg.push(...perCapitaQuery);
    }

    let data = await Promise.all([
      UlbLedger.aggregate(finalQuery),
      UlbLedger.aggregate(finalQuery_stateAvg),
    ]);
    // console.log(util.inspect(data, {showHidden: false, depth: null}))
    // finding Top ten or bottom ten data
    tenData = fetchTen(data[0], sortBy);
    // calculating State Avg
    let stateAvg = calculateStateAvg(data[1]);
    // console.log(tenData, stateAvg);
    // grouping the data in ulbTypewise
    let groupedData = groupDataTypeWise(data[0]);

    Object.assign(groupedData, { stateAvg: stateAvg });
    // table Data api called
    if (sortBy) {
      return res.status(200).json({
        success: true,
        data: tenData,
      });
    } else {
      // scatter plot api called
      return res.status(200).json({
        success: true,
        data: groupedData,
      });
    }
  } else if (filterName.includes("capital expenditure")) {
    // for capital expenditure and capex per capita
    let tempYear = financialYear
      .split("-")
      .map((value) => Number(value) - 1)
      .join("-");
    let financialYearArr = [financialYear, tempYear];
   let ulbIds_query = [
    {
        $match: {
    $or : [{financialYear:financialYear},{financialYear:tempYear}],
            lineItem: {
                $in: [
                ObjectId("5dd10c2785c951b54ec1d779"),
                ObjectId("5dd10c2785c951b54ec1d774")
                ]
                }
            }
        },
        {
            $group: {
                _id : "$financialYear",
                ulbs: {$addToSet: "$ulb"}
                }
            },
            {
                $group: {
                    _id: null,
                    ulbPrev : {
                        $addToSet: {
                             $cond: [
                        {$eq: ["$_id", tempYear]},
                        "$ulbs",
                        null
                        ]
                            }
                       
                        },
                          ulbNew : {
                        $addToSet: {
                             $cond: [
                        {$eq: ["$_id", financialYear]},
                        "$ulbs",
                        null
                        ]
                            }
                       
                        }
                        
                    }
                },
                {
                    $project: {
                        ulbPrev: {$arrayElemAt: ["$ulbPrev", 0]},
                                            ulbNew: {$arrayElemAt: ["$ulbNew", 1]},
                        }
                    },
                     { $project: { commonToBoth: { $setIntersection: [ "$ulbPrev", "$ulbNew" ] }} }
                     
    ]
  let output =   await UlbLedger.aggregate(ulbIds_query)
 let ulbID = output[0]?.commonToBoth
 
 ulbID = ulbID.map((value) => {
    return ObjectId(value);
  });
 
    state_avg_base_query = [
      {
        $match: {
          financialYear: { $in: [...financialYearArr] },
          ulb: {
            $in: [...AllULBs],
          },
        },
      },
    ];

    let query = [
      {
        $match: {
           $or: [{financialYear: financialYear},{financialYear: tempYear}],
          lineItem: {
            $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
          },
ulb: {
  $in: ulbID
}
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

          "ulb.state": ObjectId(state)
        }
      },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          ulbId: { $first: "$ulb._id" },
          ulbType: { $first: "$ulbType.name" },
          population: { $first: "$ulb.population" },
          capitalWorkPrevYear: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$financialYear", tempYear] },
                    {
                      $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          capitalWorkCurrYear: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$financialYear", financialYear] },
                    {
                      $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          grossBlockPrevYear: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$financialYear", tempYear] },
                    {
                      $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },
          grossBlockCurrYear: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$financialYear", financialYear] },
                    {
                      $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
                    },
                  ],
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
          ulbName: 1,
          ulbType: 1,
          ulbId: 1,
          population: 1,
          amount: {
            $add: [
              { $subtract: ["$grossBlockCurrYear", "$grossBlockPrevYear"] },
              { $subtract: ["$capitalWorkCurrYear", "$capitalWorkPrevYear"] },
            ],
          },
        },
      },
      {
        $sort: {
          amount: -1,
        },
      },
    ];
    if(ulb.length){
      query.push({
        $match: {
          ulbId: {
            $in: ulbIDs
          }
        }

        
      })
    }
    finalQuery = query.slice();
    let query_dup = []
    if(ulb.length){
      query.pop()
    }
    finalQuery_stateAvg = [...state_avg_base_query, ...query];
    if (getQuery)
      return res.status(200).json({ finalQuery, finalQuery_stateAvg });
      console.log(util.inspect(finalQuery, {showHidden: false, depth: null}))
    let tenData = [];
    // console.log(util.inspect(finalQuery, { showHidden: false, depth: null }));
    // is per capita attachment code
    if (isPerCapita) {
      let perCapitaQuery = [
        {
          $project: {
            ulbName: 1,
            population: 1,
            ulbType: 1,
            amount: {
              $cond: [
                { $eq: ["$population", 0] },
                0,
                { $divide: ["$amount", "$population"] },
              ],
            },
          },
        },
      ];
      finalQuery.push(...perCapitaQuery);
      finalQuery_stateAvg.push(...perCapitaQuery);
    }

    let data = await Promise.all([
      UlbLedger.aggregate(finalQuery),
      UlbLedger.aggregate(finalQuery_stateAvg),
    ]);
    // console.log(util.inspect(data, {showHidden: false, depth: null}))
    // finding Top ten or bottom ten data
    tenData = fetchTen(data[0], sortBy);
    // calculating State Avg
    let stateAvg = calculateStateAvg(data[1]);
    // console.log(tenData, stateAvg);
    // grouping the data in ulbTypewise
    let groupedData = groupDataTypeWise(data[0]);

    Object.assign(groupedData, { stateAvg: stateAvg });
    // table Data api called
    if (sortBy) {
      return res.status(200).json({
        success: true,
        data: tenData,
      });
    } else {
      // scatter plot api called
      return res.status(200).json({
        success: true,
        data: groupedData,
      });
    }
  }
});

const listOfIndicators = async (req, res) => {
  try {
    let response = { success: true, data: null };
    const { type } = req.query;
    if (!type) throw { message: "Type is missing." };
    response.data = await IndicatorLineItems.find({ type }).lean();
    if (response.data.length) {
      response.data = { type, obj : response.data  , names: response.data.map((val) => val.name) };
    } else throw { message: "no matching values found." };
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const stateRevenueTabs = async (req, res) => {
  try {
    const { tabType, financialYear, stateId, sortBy, code, getQuery, csv } =
      req.query;
    if (!tabType) throw { message: "Type of tab is missing." };
    let response = { success: true, data: null };
    const { stateDashRevenueTabs } = require("../../util/aggregation");
    if (getQuery)
      return res
        .status(200)
        .json(
          await stateDashRevenueTabs(
            financialYear,
            tabType,
            stateId,
            sortBy,
            code
          )
        );
    response.data = await UlbLedger.aggregate(
      await stateDashRevenueTabs(financialYear, tabType, stateId, sortBy, code)
    );
    if (csv) {
      let columns = [
        { display_name: "ULB Name", key: "ulbName" },
        { display_name: "Amount", key: "sum" },
      ];
      return getExcel(req, res, { columns, rows: response.data });
    }
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

let getExcel = async (req, res, data) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");
    const imageId2 = workbook.addImage({
      buffer: fs.readFileSync("uploads/logos/Group 1.jpeg"),
      extension: "png",
    });
    worksheet.addImage(imageId2, {
      tl: { col: 0, row: 0 },
      br: { col: 8, row: 2 }
    });
    // worksheet.addImage(imageId2, "A1:F3");
    data.columns.unshift({ display_name: "S.no", key: "sno" });
    worksheet.columns = data.columns.map((value) => {
      let temp = {
        header: value.display_name,
        key: value.key,
      };
      return temp;
    });
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    data.rows.map((value, i) => {
      value.sno = i + 1;
      worksheet.addRow(value);
    });
    worksheet.addRow({sno: `Can't find what you are looking for? Reach out to us at contact@${process.env.PROD_HOST}`});
    
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=" + "data.xlsx");
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });
  } catch (err) {
    console.error(err.message);
    return res.status(400).json(err);
  }
};

const ulbsByPopulation = async (req, res) => {
  try {
    const { stateId, getQuery } = req.query;
    const { getGroupedUlbsByPopulation } = require("../../util/aggregation");
    const query = getGroupedUlbsByPopulation(stateId);
    if (getQuery) return res.status(200).json(query);
    let response = { success: true, data: null };
    response.data = await Ulb.aggregate(query);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFYsWithSpecification = async (req, res) => {
  try {
    //getFYsWithSpecification
    const { state, city, getQuery } = req.query;
    let response = { success: true, data: null };
    const query =
      await require("../../util/aggregation").getFYsWithSpecificationPipeline(
        state,
        city
      );
    if (getQuery) return res.status(200).json(query);
    response.data = await UlbLedger.aggregate(query);
    response.data = response.data.length ? response.data[0] : null;
    if (response.data)
      response.data?.FYs.sort((a, b) => {
        let year1 = a.split("-")[0];
        let year2 = b.split("-")[0];
        return year2 - year1;
      });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const serviceLevelBenchmark = catchAsync(async (req, res) => {
  let {
    stateId,
    financialYear,
    filterName,
    filterId,
    sortBy,
    ulb,
    getQuery,
    csv,
  } = req.body;

  if (!stateId || !financialYear || !filterName) {
    return res.status(400).json({
      success: false,
      message: "Missing Information",
    });
  }
  let sortValue = -1;
  if(sortBy){
    sortValue = sortBy === "top10" ? -1 : 1;  
  }
  let matchId =
    filterId ??
    (await IndicatorLineItems.findOne({ name: filterName }).lean())._id;
  let matchObj = {
    $match: {
      indicatorLineItem: ObjectId(matchId),
      year: financialYear,
    },
  };
  let limitObj;
  if (ulb?.length > 0) {
    matchObj.$match.ulb = ObjectId(ulb[0]);
  }
  let query = [
    matchObj,
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
        "ulb.state": ObjectId(stateId),
        "ulb.isActive":true
      },
    },
    {
      $lookup: {
        from: "ulbtypes",
        localField: "ulb.ulbType",
        foreignField: "_id",
        as: "ulbType",
      },
    },
    {
      $unwind: "$ulbType",
    },
    {
      $sort: { value: sortValue },
    },
    {
      $project: {
        ulbName: "$ulb.name",
        value: "$value",
        benchMarkValue: "$benchMarkValue",
        unitType: "$unitType",
        ulbType: "$ulbType.name",

      },
    },
  ];

  if(sortBy){
    limitObj = {
      $limit: 10
    }
    query.push(limitObj);
  }
  let tp_data = [],
    m_data = [],
    mc_data = [],
    tenData = [];
  if (getQuery) return res.status(200).json(query);
  let data = Indicator.aggregate(query);
  let data2 = Indicator.aggregate([
    {
      $match: {
        indicatorLineItem: ObjectId(matchId),
        year: financialYear,
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
        "ulb.state": ObjectId(stateId),
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$value" },
      },
    },
  ]);
  let tempArr = await Promise.all([data, data2]);
  data = tempArr[0];
  data2 = tempArr[1];
  // console.log(data)
  let unit = data[0]?.unitType
  let stateAvg = [{ average: 0 }];
  if (data.length > 0) {
    if (sortBy) {
      tenData = data;
      if (csv) {
        let columns = [
          {
            display_name: "ULB",
            key: "ulbName",
          },
          {
            display_name: "Value",
            key: "value",
          },
          {
            display_name: "Bench Mark Value",
            key: "benchMarkValue",
          },
          {
            display_name: "Unit Type",
            key: "unitType",
          },
          {
            display_name: "ULB Type",
            key: "ulbType",
          },
        ];
        let data = { columns, rows: tenData };
        return getExcel(req, res, data);
      }
    } else {
      stateAvg[0].average = Math.round(data2[0]?.average);
      tp_data = data.filter((el) => {
        if (el.ulbType == "Town Panchayat") {
          el.value = el.value;
          return el;
        }
      });
      m_data = data.filter((el) => {
        if (el.ulbType == "Municipality") {
          el.value = el.value;
          return el;
        }
      });
      mc_data = data.filter((el) => {
        if (el.ulbType == "Municipal Corporation") {
          el.value = el.value;
          return el;
        }
      });
    }
  }
  const obj = {
    barChart: [],
    scatterData: {
      tp_data: tp_data,
      m_data: m_data,
      mc_data: mc_data,
      stateAvg: stateAvg,
      tenData: tenData,
      unitType: unit
    },
  };

  return res.status(200).json({
    success: true,
    data: obj,
  });
});

const groupDataTypeWise = (data) => {
  let tp_data = data.filter((el) => {
    return el.ulbType == "Town Panchayat";
  });
  let m_data = data.filter((el) => {
    return el.ulbType == "Municipality";
  });
  let mc_data = data.filter((el) => {
    return el.ulbType == "Municipal Corporation";
  });

  let obj = {
    townPanchayat: tp_data,
    municipality: m_data,
    mCorporation: mc_data,
  };
  return obj;
};

const calculateStateAvg = (data) => {
  let numerator = 0,
    denominator = 0;

  data.forEach((el) => {
    numerator +=
      (el.value || el.value == 0 ? el.value : el.amount) * el.population;
    denominator = el.population + denominator;
  });
  return Number((numerator / denominator).toFixed(2));
};
const stateDashAvgs = async (req, res) => {
  try {
    const {
      financialYear,
      which,
      TabType,
      getQuery,
      stateId,
      code,
      state,
      headOfAccount,
      filterName,
      isPerCapita,
      ulb,
      compareType,
      sortBy,
    } = req.body;
    const distinctUlbs =
      which == "nationalAvg" ? await UlbLedger.distinct("ulb") : [];
    const noOfUlbs = distinctUlbs.length;
    const { stateDashAvgsPipeline } = require("../../util/aggregation");
    const query = await stateDashAvgsPipeline(
      financialYear,
      which,
      noOfUlbs,
      TabType,
      stateId,
      code,
      isPerCapita
    );
    if (getQuery) return res.send(query);
    console.log(util.inspect(query, {showHidden: false, depth: null}))
    let otherApiData = axios.post(`${process.env.BASEURL}/state-revenue`, {
      ...req.body,
      k: 90,
    });
    const data =  await UlbLedger.aggregate(query);
    let newData = await Promise.all([data, otherApiData]);

    function roundOffy2(obj) {
      const keys = Object.keys(obj);
      for (each of keys) {
        obj[each] = obj[each].toFixed(2);
      }
      return obj;
    }
    res.status(200).json({
      success: true,
      data: { ...newData[1].data.data, ...roundOffy2(newData[0][0]) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const indicatorDump = async (req, res) => {};

const fetchTen = (data, sortBy) => {
  let topTen = data.slice(0, 10);
  let bottomTen = data.slice(-10);
  if (sortBy && sortBy.includes("top")) {
    return topTen;
  }
  if (sortBy && sortBy.includes("bottom") ){
    return bottomTen;
  }
};
module.exports = {
  scatterMap,
  revenue,
  listOfIndicators,
  stateRevenueTabs,
  ulbsByPopulation,
  serviceLevelBenchmark,
  getFYsWithSpecification,
  getFYsSLB,
  indicatorDump,
  stateDashAvgs,
};
