const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Indicator = require("../../models/indicators");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");
const catchAsync = require("../../util/catchAsync");
const util = require("util");
const { response } = require("../../service");

const ObjectIdOfRevenueList = [
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74a",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2385c951b54ec1d748",
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

const calData = (data) => {
  let copyData = [];
  copyData = data.slice();
  let ownRev = 0;
  for (let el of data) {
    if (
      el._id.code == "110" ||
      el._id.code == "130" ||
      el._id.code == "140" ||
      el._id.code == "150" ||
      el._id.code == "180"
    ) {
      ownRev = ownRev + el.amount;
      let index = copyData.indexOf(el);
      if (index > -1 && index != copyData.length - 1) copyData.splice(index, 1);
      if (index == copyData.length - 1) {
        copyData.pop(el);
      }
    }
  }
  copyData.push({
    name: "Own Revenue",
    amount: ownRev,
  });
  return copyData;
};

const revenue = catchAsync(async (req, res) => {
  let {
    state,
    financialYear,
    headOfAccount,
    filterName,
    isPerCapita,
    ulbs,
    compareType,
    getQuery,
  } = req.body;

  if (!state || !financialYear || !headOfAccount || !filterName) {
    return res.status(400).json({
      success: false,
      message: "Missing Information",
    });
  }
  if (filterName == "revenue") {
    let base_query = [
      {
        $match: {
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
    ];
    let state_query = [];
    state_query.push(...base_query);
    let avg = [
      {
        $group: {
          _id: null,
          numerator: { $sum: { $multiply: ["$totalRevenue", "$population"] } },
          denominator: { $sum: "$population" },
        },
      },
      {
        $project: {
          average: {
            $cond: [
              { $eq: ["$denominator", 0] },
              0,
              { $divide: ["$numerator", "$denominator"] },
            ],
          },
        },
      },
    ];
    let stateAvg_query = [];
    let natAvg_query = [];
    state_query.push({
      $match: {
        "ulb.state": ObjectId(state),
      },
    });
    let x_query = [
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
        $match: {
          "lineItem.headOfAccount": headOfAccount,
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
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          ulbId: { $first: "$ulb._id" },
          ulbType: { $first: "$ulbType.name" },
          stateId: { $first: "$state._id" },
          state: { $first: "$state.name" },
          totalRevenue: { $sum: "$amount" },
          population: { $first: "$ulb.population" },
        },
      },
    ];
    let perCapita = {
      $project: {
        ulbName: 1,
        ulbId: 1,
        ulbType: 1,
        stateId: 1,
        state: 1,
        totalRevenue: {
          $cond: [
            { $eq: ["$population", 0] },
            0,
            { $divide: ["$totalRevenue", "$population"] },
          ],
        },
        population: 1,
      },
    };
    let ulb_query = [];
    ulb_query.push(...state_query);
    ulb_query.push(...x_query);
    if (isPerCapita) {
      ulb_query.push(perCapita);
    }
    // base_query.push(...ulb_query)
    // state_query.push(...ulb_query)

    stateAvg_query.push(...ulb_query);
    stateAvg_query.push(...avg);

    natAvg_query.push(...base_query);
    natAvg_query.push(...x_query);
    if (isPerCapita) {
      natAvg_query.push(perCapita);
    }
    natAvg_query.push(...avg);
    if (getQuery) {
      return res.json({
        query: [ulb_query, stateAvg_query, natAvg_query],
      });
    }
    let data = await Promise.all([
      UlbLedger.aggregate(ulb_query),
      UlbLedger.aggregate(stateAvg_query),
      // UlbLedger.aggregate(natAvg_query),
    ]);

    // let data = await UlbLedger.aggregate(query)
    let tp_data = data[0].filter((el) => {
      return el.ulbType == "Town Panchayat";
    });
    let m_data = data[0].filter((el) => {
      return el.ulbType == "Municipality";
    });
    let mc_data = data[0].filter((el) => {
      return el.ulbType == "Municipal Corporation";
    });
    return res.status(200).json({
      success: true,
      municipality: m_data,
      townPanchayat: tp_data,
      mCorporation: mc_data,
      // ulbData: data[0],
      stateAvg: data[1],
      // natAvg : data[2]
    });
  } else if (
    filterName.includes("own revenue") &&
    !filterName.includes("mix")
  ) {
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
    ];
    let state_query = [];
    state_query.push(...base_query);
    let avg = [
      {
        $group: {
          _id: null,
          numerator: { $sum: { $multiply: ["$totalRevenue", "$population"] } },
          denominator: { $sum: "$population" },
        },
      },
      {
        $project: {
          average: {
            $cond: [
              { $eq: ["$denominator", 0] },
              0,
              { $divide: ["$numerator", "$denominator"] },
            ],
          },
        },
      },
    ];
    let stateAvg_query = [];
    let natAvg_query = [];
    state_query.push({
      $match: {
        "ulb.state": ObjectId(state),
      },
    });
    let x_query = [
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
          totalRevenue: { $sum: "$amount" },
          population: { $first: "$ulb.population" },
          ulbName: { $first: "$ulb.name" },
          ulbId: { $first: "$ulb._id" },
          ulbType: { $first: "$ulbType.name" },
          stateId: { $first: "$state._id" },
          state: { $first: "$state.name" },
        },
      },
    ];

    let perCapita = {
      $project: {
        ulbName: 1,
        ulbId: 1,
        ulbType: 1,
        stateId: 1,
        state: 1,
        totalRevenue: {
          $cond: [
            { $eq: ["$population", 0] },
            0,
            { $divide: ["$totalRevenue", "$population"] },
          ],
        },
        population: 1,
      },
    };
    let ulb_query = [];
    ulb_query.push(...state_query);
    ulb_query.push(...x_query);
    if (isPerCapita) {
      ulb_query.push(perCapita);
    }

    stateAvg_query.push(...ulb_query);
    stateAvg_query.push(...avg);

    natAvg_query.push(...base_query);
    natAvg_query.push(...x_query);
    if (isPerCapita) {
      natAvg_query.push(perCapita);
    }
    natAvg_query.push(...avg);
    if (getQuery) {
      return res.json({
        query: [ulb_query, stateAvg_query, natAvg_query],
      });
    }
    let data = await Promise.all([
      UlbLedger.aggregate(ulb_query),
      UlbLedger.aggregate(stateAvg_query),
      // UlbLedger.aggregate(natAvg_query),
    ]);

    let tp_data = data[0].filter((el) => {
      return el.ulbType == "Town Panchayat";
    });
    let m_data = data[0].filter((el) => {
      return el.ulbType == "Municipality";
    });
    let mc_data = data[0].filter((el) => {
      return el.ulbType == "Municipal Corporation";
    });
    return res.status(200).json({
      success: true,
      municipality: m_data,
      townPanchayat: tp_data,
      mCorporation: mc_data,
      // ulbData: data[0],
      stateAvg: data[1],
      // natAvg : data[2]
    });
  } else if (filterName == "revenue mix") {
    if (compareType == "") {
      let bse_query = [
        {
          $match: {
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
          $match: {
            "lineItem.headOfAccount": headOfAccount,
          },
        },

        {
          $group: {
            _id: "$lineItem.name",
            code: { $first: "$lineItem.code" },
            amount: { $sum: "$amount" },
          },
        },
      ];

      let data = await UlbLedger.aggregate(bse_query);
      let ownRev = 0;
      let copyData = [];
      if (data.length > 0) {
        console.log(data);
        copyData = data.slice();
        for (let el of data) {
          if (
            el.code == "110" ||
            el.code == "130" ||
            el.code == "140" ||
            el.code == "150" ||
            el.code == "180"
          ) {
            ownRev = ownRev + el.amount;
            let index = copyData.indexOf(el);
            if (index > -1 && index != copyData.length - 1)
              copyData.splice(index, 1);
            if (index == copyData.length - 1) {
              copyData.pop(el);
            }
          }
        }
        copyData.push({
          _id: "Own Revenue",
          amount: ownRev,
        });
      }

      return res.status(200).json({
        success: true,
        data: copyData,
      });
    } else if (compareType == "ulbType") {
      let base_query = [
        {
          $match: {
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
          $match: {
            "lineItem.headOfAccount": headOfAccount,
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
          $group: {
            _id: {
              type: "$ulbType.name",
              code: "$lineItem.code",
            },
            name: { $first: "$lineItem.name" },
            amount: { $sum: "$amount" },
          },
        },
      ];
      let data = await UlbLedger.aggregate(base_query);
      let tpDataNew = [];
      let mcDataNew = [];
      let mDataNew = [];
      if (data.length) {
        let tpData = data.filter((el) => {
          return el._id.type == "Town Panchayat";
        });
        let mcData = data.filter((el) => {
          return el._id.type == "Municipal Corporation";
        });
        let mData = data.filter((el) => {
          return el._id.type == "Municipality";
        });

        tpDataNew = calData(tpData);
        mcDataNew = calData(mcData);
        mDataNew = calData(mData);
      }
      return res.status(200).json({
        success: true,
        mcData: mcDataNew,
        tpData: tpDataNew,
        mData: mDataNew,
      });
    } else if (compareType == "popCat") {
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
        },
      },
    ];
    let data = await UlbLedger.aggregate(base_query);

    return res.status(200).json({
      success: true,
      data: data,
    });
  } else if (filterName == "total surplus/deficit") {
    let base_query = [
      {
        $match: {
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
        $match: {
          $or: [
            { "lineItem.headOfAccount": "Revenue" },
            { "lineItem.headOfAccount": "Expense" },
          ],
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
        $group: {
          _id: "$ulb._id",
          ulbName: { $first: "$ulb.name" },
          ulbType: { $first: "$ulbType.name" },
          population: { $first: "$ulb.population" },
          revenue: {
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
          expenditure: {
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
          ulbType: 1,
          population: 1,
          totalRevenue: { $subtract: ["$revenue", "$expenditure"] },
        },
      },
    ];

    let data = await UlbLedger.aggregate(base_query);
    let tp_data = data.filter((el) => {
      return el.ulbType == "Town Panchayat";
    });
    let m_data = data.filter((el) => {
      return el.ulbType == "Municipality";
    });
    let mc_data = data.filter((el) => {
      return el.ulbType == "Municipal Corporation";
    });
    return res.status(200).json({
      success: true,
      municipality: m_data,
      townPanchayat: tp_data,
      mCorporation: mc_data,
      // ulbData: data[0],
      // stateAvg: data[1],
      // natAvg : data[2]
    });
  }
});
const listOfIndicators = async (req, res) => {
  try {
    let response = { success: true, data: null };
    const { type } = req.query;
    if (!type) throw { message: "Type is missing." };
    response.data = await Indicator.aggregate([
      {
        $match: {
          type,
        },
      },
      {
        $group: {
          _id: null,
          names: {
            $addToSet: "$name",
          },
        },
      },
      {
        $project: {
          _id: 0,
          type,
          names: "$names",
        },
      },
    ]);
    response.data = response.data.length ? response.data[0] : null;
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
module.exports = {
  scatterMap,
  revenue,
  listOfIndicators,
};
