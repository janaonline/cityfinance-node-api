const mongoose = require("mongoose");
const Ulb = require("../models/Ulb");
const LineItem = require("../models/LineItem");
const UlbLedger = require('../models/UlbLedger')
const { ObjectId } = mongoose.Types;

const Capital_Expenditure = [
  "5dd10c2785c951b54ec1d779",
  "5dd10c2785c951b54ec1d774",
];


exports.nationalDashRevenuePipeline = (
  financialYear,
  stateId,
  ulbs,
  lineItems,
  type,
  formType
) => {
  const pipeline = [
    {
      $match: {
        financialYear,
        lineItem: {
          $in: lineItems,
        },
      },
    },
  ];
  // if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
  pipeline.push({
    $lookup: {
      from: "ulbs",
      localField: "ulb",
      foreignField: "_id",
      as: "ulb",
    }
  })
  pipeline.push(
    {
      $unwind: "$ulb",
    }
  );
  pipeline.push({
    "$match": {
      "ulb.isActive": true
    }
  })
  if (type == "totalRevenue") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "100K-500K": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "500K-1M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "1M-4M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "4M+": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              revenue: {
                $divide: ["$<100K_amount", 1e7],
              },
              set: "$<100K_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$<100K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$<100K_amount", "$<100K"],
                  },
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              revenue: {
                $divide: ["$100K-500K_amount", 1e7],
              },
              set: "$100K-500K_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$100K-500K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$100K-500K_amount", "$100K-500K"],
                  },
                },
              },
            },
            "500 Thousand - 1 Million": {
              revenue: { $divide: ["$500K-1M_amount", 1e7] },
              set: "$500K-1M_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$500K-1M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$500K-1M_amount", "$500K-1M"],
                  },
                },
              },
            },
            "1 Million - 4 Million": {
              revenue: { $divide: ["$1M-4M_amount", 1e7] },
              set: "$1M-4M_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$1M-4M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$1M-4M_amount", "$1M-4M"],
                  },
                },
              },
            },
            "4 Million+": {
              revenue: { $divide: ["$4M+_amount", 1e7] },
              set: "$4M+_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$4M+", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$4M+_amount", "$4M+"],
                  },
                },
              },
            },
          },
        }
      );
    } else if (formType == "ulbType") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            ulbType: { $first: "$ulb.ulbType" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            municipal: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            townPanchayat: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "Municipal Corporation": {
              revenue: {
                $divide: ["$municipalCorp_amount", 1e7],
              },
              set: "$municipalCorp_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipalCorp", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipalCorp_amount", "$municipalCorp"],
                  },
                },
              },
            },
            Municipality: {
              revenue: {
                $divide: ["$municipal_amount", 1e7],
              },
              set: "$municipal_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipal", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipal_amount", "$municipal"],
                  },
                },
              },
            },
            "Town Panchayat": {
              revenue: {
                $divide: ["$townPanchayat_amount", 1e7],
              },
              set: "$townPanchayat_set",
              revenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$townPanchayat", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$townPanchayat_amount", "$townPanchayat"],
                  },
                },
              },
            },
          },
        }
      );
    }
  } else if (type == "revenueMix") {
    pipeline.push(


      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineitem",
        },
      },
      {
        $unwind: "$lineitem",
      },
      {
        $facet: {
          state: [
            {
              $match: {
                "ulb.state": stateId ? ObjectId(stateId) : ""
              }
            },
            {
              $group: {
                _id: { lineItem: "$lineItem" },
                amount: {
                  $sum: "$amount",
                },
                colour: {
                  $first: "$lineitem.colour",
                },
                lineName: {
                  $first: "$lineitem.name",
                },
              },
            },
          ],
          national: [
            {
              $group: {
                _id: { lineItem: "$lineItem" },
                amount: {
                  $sum: "$amount",
                },
                colour: {
                  $first: "$lineitem.colour",
                },
                lineName: {
                  $first: "$lineitem.name",
                },
              },
            },
          ],
          individual:
            formType == "ulbType"
              ? [
                {
                  $group: {
                    _id: { lineItem: "$lineItem", type: "$ulb.ulbType" },
                    amount: { $sum: "$amount" },
                    colour: {
                      $first: "$lineitem.colour",
                    },
                    lineName: {
                      $first: "$lineitem.name",
                    },
                  },
                },
                {
                  $group: {
                    _id: "$_id.type",
                    data: {
                      $push: {
                        lineItem: "$_id.lineItem",
                        amount: "$amount",
                      },
                    },
                    colour: {
                      $first: "$lineitem.colour",
                    },
                    lineName: {
                      $first: "$lineitem.name",
                    },
                  },
                },
              ]
              : [
                {
                  $group: {
                    _id: { lineItem: "$lineItem" },
                    "<100K": {
                      $sum: {
                        $cond: {
                          if: {
                            $lt: ["$ulb.population", 1e5],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "100K-500K": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $gte: ["$ulb.population", 1e5] },
                              { $lte: ["$ulb.population", 5e5] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "500K-1M": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $gte: ["$ulb.population", 5e5] },
                              { $lte: ["$ulb.population", 1e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "1M-4M": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $gte: ["$ulb.population", 1e6] },
                              { $lte: ["$ulb.population", 4e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "4M+": {
                      $sum: {
                        $cond: {
                          if: {
                            $gt: ["$ulb.population", 4e6],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    colour: {
                      $first: "$lineitem.colour",
                    },
                    lineName: {
                      $first: "$lineitem.name",
                    },
                  },
                },
              ],
        },
      }
    );
  }
  return pipeline;
};

exports.stateDashRevenueTabs = async (
  financialYear,
  tabType,
  stateId,
  sortBy = "top",
  code
) => {
  let ulbIds = await Ulb.find({ state: stateId, isActive: true }).select("_id").lean();
  let matchObj = {
    financialYear,
    ulb: { $in: ulbIds.map((value) => value._id) },
  };
  let pipeline = [
    {
      $match: matchObj,
    },
  ];
  pipeline.push(
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
        "ulb.isActive": true
      }
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
    }
  );
  if (tabType == "TotalRevenue" || tabType == "TotalOwnRevenue") {
    let lineItemFilter = { headOfAccount: "Revenue" };
    if (tabType == "TotalOwnRevenue")
      lineItemFilter = {
        code: {
          $in: ["110", "130", "140", "150", "180"],
        },
      };
    let lineIds = await LineItem.find(lineItemFilter).select("_id").lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          _id: 0,
          sum: 1,
        },
      }
    );
  } else if (
    tabType == "RevenuePerCapita" ||
    tabType == "OwnRevenuePerCapita"
  ) {
    let lineItemFilter = { headOfAccount: "Revenue" };
    if (tabType == "OwnRevenuePerCapita")
      lineItemFilter = {
        code: {
          $in: ["110", "130", "140", "150", "180"],
        },
      };
    let lineIds = await LineItem.find(lineItemFilter).select("_id").lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
          population: {
            $first: "$ulb.population",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          revenuePerCapita: {
            $cond: {
              if: {
                $eq: ["$population", 0],
              },
              then: 0,
              else: {
                $divide: ["$sum", "$population"],
              },
            },
          },
          _id: 0,
        },
      }
    );
  } else if (
    tabType == "RevenueMix" ||
    tabType == "OwnRevenueMix" ||
    tabType == "ExpenditureMix"
  ) {
    if (!code) throw { message: "code is missing for revenue mix." };
    code = code.split(",");
    let lineIds = await LineItem.find({
      code: { $in: code },
    })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      // {
      //   $match: { "lineItem._id": ObjectId(lineItem) },
      // },
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          _id: 0,
          sum: 1,
          ulbName: "$_id",
        },
      }
    );
  } else if (tabType == "RevenueTotalExpenditure") {
    let lineIds = await LineItem.find({ code: { $in: ["210", "220", "230", "240"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          _id: 0,
          sum: 1,
        },
      }
    );
  } else if (tabType == "RevenueExpenditurePerCapita") {
    let lineIds = await LineItem.find({ code: { $in: ["210", "220", "230", "240"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
          population: {
            $first: "$ulb.population",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          revenueExpendPerCapita: {
            $cond: {
              if: {
                $eq: ["$population", 0],
              },
              then: 0,
              else: {
                $divide: ["$sum", "$population"],
              },
            },
          },
          _id: 0,
        },
      }
    );
  } else if (tabType == "RevenueExpenditureMix") {
    let lineIds = await LineItem.find({
      code: { $in: ["210", "220", "230"] },
    })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      // {
      //   $match: { "lineItem._id": ObjectId(lineItem) },
      // },
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          _id: 0,
          sum: 1,
          ulbName: "$_id",
        },
      }
    );
  } else if (tabType == "CapitalTotalExpenditure") {
    let lineIds = await LineItem.find({ code: { $in: ["410", "412"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          _id: 0,
          sum: 1,
        },
      }
    );
  } else if (tabType == "CapitalExpenditurePerCapita") {
    let lineIds = await LineItem.find({ code: { $in: ["410", "412"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: "$ulb.name",
          sum: {
            $sum: "$amount",
          },
          population: {
            $first: "$ulb.population",
          },
        },
      },
      {
        $project: {
          ulbName: "$_id",
          revenueExpendPerCapita: {
            $cond: {
              if: {
                $eq: ["$population", 0],
              },
              then: 0,
              else: {
                $divide: ["$sum", "$population"],
              },
            },
          },
          _id: 0,
        },
      }
    );
  } else if (tabType == "DeficitOrSurplus") {
    let lineIds = await LineItem.find({
      headOfAccount: { $in: ["Revenue", "Expense"] },
    })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
    pipeline.push(
      {
        $group: {
          _id: {
            headOfAccount: "$lineItem.headOfAccount",
            ulbName: "$ulb.name",
          },
          sum: {
            $sum: "$amount",
          },
        },
      },
      {
        $group: {
          _id: "$_id.ulbName",
          revenue: {
            $sum: {
              $cond: {
                if: { $eq: ["$_id.headOfAccount", "Revenue"] },
                then: "$sum",
                else: 0,
              },
            },
          },
          expense: {
            $sum: {
              $cond: {
                if: { $eq: ["$_id.headOfAccount", "Expense"] },
                then: "$sum",
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          ulbName: "$_id",
          revenue: "$revenue",
          expense: "$expense",
          deficitOrSurplus: {
            $subtract: ["$revenue", "$expense"],
          },
        },
      }
    );
  } else throw { message: "invalid tabType was provided." };
  let sortByObj;
  if (tabType == "TotalRevenue" || tabType == "TotalOwnRevenue") {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (
    tabType == "RevenuePerCapita" ||
    tabType == "OwnRevenuePerCapita"
  ) {
    sortByObj = {
      $sort: {
        revenuePerCapita: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (
    tabType == "RevenueMix" ||
    tabType == "OwnRevenueMix" ||
    tabType == "ExpenditureMix"
  ) {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "RevenueTotalExpenditure") {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "RevenueExpenditurePerCapita") {
    sortByObj = {
      $sort: {
        revenueExpendPerCapita: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "RevenueExpenditureMix") {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "CapitalTotalExpenditure") {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "CapitalExpenditurePerCapita") {
    sortByObj = {
      $sort: {
        revenueExpendPerCapita: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "DeficitOrSurplus") {
    sortByObj = {
      $sort: {
        deficitOrSurplus: sortBy == "top" ? -1 : 1,
      },
    };
  }

  pipeline.push(sortByObj);
  pipeline.push({
    $limit: 10,
  });
  // console.log(tabType);
  return pipeline;
};

exports.getGroupedUlbsByPopulation = (stateId) => {
  let pipeline = [];
  if (stateId) {
    pipeline.push({
      $match: {
        state: ObjectId(stateId),
        isActive: true,
      },
    });
  }
  pipeline.push(
    {
      $group: {
        _id: null,
        "<100 Thousand": {
          $sum: {
            $cond: {
              if: {
                $lt: ["$population", 1e5],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "100 Thousand - 500 Thousand": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e5] },
                  { $lte: ["$population", 5e5] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "500 Thousand - 1 Million": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 5e5] },
                  { $lte: ["$population", 1e6] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "1 Million - 4 Million": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e6] },
                  { $lte: ["$population", 4e6] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "4 Million+": {
          $sum: {
            $cond: {
              if: {
                $gt: ["$population", 4e6],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "Total Cities": { $sum: 1 },
      },
    },
    {
      $project: { _id: 0 },
    }
  );
  // console.log(pipeline);
  return pipeline;
};

exports.getFYsWithSpecificationPipeline = async (state, city) => {
  let pipeline = [];
  if (state) {
    let ulbs = await Ulb.find({ state: ObjectId(state), isActive: true }).select("_id");
    ulbs = ulbs.map((each) => each._id);
    pipeline.push({
      $match: {
        ulb: {
          $in: ulbs,
        },
      },
    });
  } else if (city) {
    pipeline.push({
      $match: {
        ulb: ObjectId(city),
      },
    });
  }
  pipeline.push(
    {
      $sort: {
        financialYear: 1,
      },
    },
    {
      $group: {
        _id: null,
        FYs: {
          $addToSet: "$financialYear",
        },
      },
    },
    {
      $project: {
        _id: 0,
      },
    }
  );

  return pipeline;
};

exports.getStateWiseDataAvailPipeline = (financialYear) => {
  let pipeline = [];
  pipeline.push(
    {
      $match: {
        financialYear,
        lineItem: ObjectId("5dd10c2485c951b54ec1d74b"),
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
        "ulb.isActive": true
      }
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
        _id: "$ulb._id",
        state: { $first: "$state.name" },
        stateId: { $first: "$state._id" },
        code: { $first: "$state.code" },
      },
    },
    {
      $group: {
        _id: "$state",
        count: { $sum: 1 },
        stateId: { $first: "$stateId" },
        code: { $first: "$code" },
      },
    },
    {
      $addFields: {
        percentage: 0,
      },
    }
  );
  return pipeline;
};

exports.nationalDashExpensePipeline = (
  financialYear,
  stateId,
  type,
  formType,
  lineItems,
  ulbs
) => {
  let matchObj = {
    financialYear,
    lineItem: { $in: lineItems },
  };
  let pipeline = [
    {
      $match: matchObj,
    },
  ];
  // if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
  pipeline.push(
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
      "$match": {
        "ulb.isActive": true
      }
    }
  );
  if (type == "totalExpenditure") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "100K-500K": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "500K-1M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "1M-4M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "4M+": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              expenditure: {
                $divide: ["$<100K_amount", 1e7],
              },
              set: "$<100K_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$<100K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$<100K_amount", "$<100K"],
                  },
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              expenditure: {
                $divide: ["$100K-500K_amount", 1e7],
              },
              set: "$100K-500K_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$100K-500K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$100K-500K_amount", "$100K-500K"],
                  },
                },
              },
            },
            "500 Thousand - 1 Million": {
              expenditure: { $divide: ["$500K-1M_amount", 1e7] },
              set: "$500K-1M_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$500K-1M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$500K-1M_amount", "$500K-1M"],
                  },
                },
              },
            },
            "1 Million - 4 Million": {
              expenditure: { $divide: ["$1M-4M_amount", 1e7] },
              set: "$1M-4M_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$1M-4M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$1M-4M_amount", "$1M-4M"],
                  },
                },
              },
            },
            "4 Million+": {
              expenditure: { $divide: ["$4M+_amount", 1e7] },
              set: "$4M+_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$4M+", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$4M+_amount", "$4M+"],
                  },
                },
              },
            },
          },
        }
      );
    } else if (formType == "ulbType") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            ulbType: { $first: "$ulb.ulbType" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            municipal: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            townPanchayat: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "Municipal Corporation": {
              expenditure: {
                $divide: ["$municipalCorp_amount", 1e7],
              },
              set: "$municipalCorp_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipalCorp", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipalCorp_amount", "$municipalCorp"],
                  },
                },
              },
            },
            Municipality: {
              expenditure: {
                $divide: ["$municipal_amount", 1e7],
              },
              set: "$municipal_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipal", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipal_amount", "$municipal"],
                  },
                },
              },
            },
            "Town Panchayat": {
              expenditure: {
                $divide: ["$townPanchayat_amount", 1e7],
              },
              set: "$townPanchayat_set",
              expenditurePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$townPanchayat", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$townPanchayat_amount", "$townPanchayat"],
                  },
                },
              },
            },
          },
        }
      );
    }
  } else if (type == "expenditureMix") {
    pipeline.push({
      $facet: {
        state: [
          {
            $match: {
              "ulb.state": stateId ? ObjectId(stateId) : ""
            }
          },
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineitems",
            },
          },
          {
            $unwind: "$lineitems",
          },
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
              },
              colour: {
                $first: "$lineitems.colour",
              },
              lineName: {
                $first: "$lineitems.name",
              },
            },
          },
        ],
        national: [
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineitems",
            },
          },
          {
            $unwind: "$lineitems",
          },
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
              },
              colour: {
                $first: "$lineitems.colour",
              },
              lineName: {
                $first: "$lineitems.name",
              },
            },
          },
        ],
        individual:
          formType == "ulbType"
            ? [
              {
                $group: {
                  _id: { lineItem: "$lineItem", type: "$ulb.ulbType" },
                  amount: { $sum: "$amount" },
                },
              },
              {
                $group: {
                  _id: "$_id.type",
                  data: {
                    $push: {
                      lineItem: "$_id.lineItem",
                      amount: "$amount",
                    },
                  },
                },
              },
            ]
            : [
              {
                $group: {
                  _id: { lineItem: "$lineItem" },
                  "<100K": {
                    $sum: {
                      $cond: {
                        if: {
                          $lt: ["$ulb.population", 1e5],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "100K-500K": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 1e5] },
                            { $lte: ["$ulb.population", 5e5] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "500K-1M": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 5e5] },
                            { $lte: ["$ulb.population", 1e6] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "1M-4M": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 1e6] },
                            { $lte: ["$ulb.population", 4e6] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "4M+": {
                    $sum: {
                      $cond: {
                        if: {
                          $gt: ["$ulb.population", 4e6],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
      },
    });
  } else {
    //deficitOrSurplus
    pipeline.push(
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
        $facet: {
          national: [
            {
              $group: {
                _id: null,
                revenue: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
                expense: {
                  $sum: {
                    $cond: {
                      if: { $eq: ["$lineItem.headOfAccount", "Expense"] },
                      then: "$amount",
                      else: 0,
                    },
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                revenue: 1,
                expense: 1,
                deficitOrSurplus: {
                  $subtract: ["$revenue", "$expense"],
                },
              },
            },
          ],
          individual:
            formType == "ulbType"
              ? [
                {
                  $group: {
                    _id: "$ulb.ulbType",
                    revenue: {
                      $sum: {
                        $cond: {
                          if: { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    expense: {
                      $sum: {
                        $cond: {
                          if: { $eq: ["$lineItem.headOfAccount", "Expense"] },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    revenue: { $divide: ["$revenue", 1e7] },
                    expense: { $divide: ["$expense", 1e7] },
                    deficitOrSurplus: {
                      $subtract: ["$revenue", "$expense"],
                    },
                  },
                },
              ]
              : [
                {
                  $group: {
                    _id: null,
                    "<100K_revenue": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                              { $lt: ["$ulb.population", 1e5] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "<100K_expense": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Expense"] },
                              { $lt: ["$ulb.population", 1e5] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "100K-500K_revenue": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                              { $gte: ["$ulb.population", 1e5] },
                              { $lte: ["$ulb.population", 5e5] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "100K-500K_expense": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Expense"] },
                              { $gte: ["$ulb.population", 1e5] },
                              { $lte: ["$ulb.population", 5e5] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "500K-1M_revenue": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                              { $gte: ["$ulb.population", 5e5] },
                              { $lte: ["$ulb.population", 1e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "500K-1M_expense": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Expense"] },
                              { $gte: ["$ulb.population", 5e5] },
                              { $lte: ["$ulb.population", 1e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "1M-4M_revenue": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                              { $gte: ["$ulb.population", 1e6] },
                              { $lte: ["$ulb.population", 4e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "1M-4M_expense": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Expense"] },
                              { $gte: ["$ulb.population", 1e6] },
                              { $lte: ["$ulb.population", 4e6] },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },

                    "4M+_revenue": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Revenue"] },
                              {
                                $gt: ["$ulb.population", 4e6],
                              },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                    "4M+_expense": {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ["$lineItem.headOfAccount", "Expense"] },
                              {
                                $gt: ["$ulb.population", 4e6],
                              },
                            ],
                          },
                          then: "$amount",
                          else: 0,
                        },
                      },
                    },
                  },
                },
                {
                  $project: {
                    "<100K_revenue": { $divide: ["$<100K_revenue", 1e7] },
                    "<100K_expense": { $divide: ["$<100K_expense", 1e7] },
                    "100K-500K_revenue": { $divide: ["$100K-500K_revenue", 1e7] },
                    "100K-500K_expense": { $divide: ["$100K-500K_expense", 1e7] },
                    "500K-1M_revenue": { $divide: ["$500K-1M_revenue", 1e7] },
                    "500K-1M_expense": { $divide: ["$500K-1M_expense", 1e7] },
                    "1M-4M_revenue": { $divide: ["$1M-4M_revenue", 1e7] },
                    "1M-4M_expense": { $divide: ["$1M-4M_expense", 1e7] },
                    "4M+_revenue": { $divide: ["$4M+_revenue", 1e7] },
                    "4M+_expense": { $divide: ["$4M+_expense", 1e7] }
                  }
                },
                {
                  $project: {
                    "<100K": {
                      revenue: "$<100K_revenue",
                      expense: "$<100K_expense",
                      deficitOrSurplus: {
                        $subtract: ["$<100K_revenue", "$<100K_expense"],
                      },
                    },
                    "100K-500K": {
                      revenue: "$100K-500K_revenue",
                      expense: "$100K-500K_expense",
                      deficitOrSurplus: {
                        $subtract: [
                          "$100K-500K_revenue",
                          "$100K-500K_expense",
                        ],
                      },
                    },
                    "500K-1M": {
                      revenue: "$500K-1M_revenue",
                      expense: "$500K-1M_expense",
                      deficitOrSurplus: {
                        $subtract: ["$500K-1M_revenue", "$500K-1M_expense"],
                      },
                    },
                    "1M-4M": {
                      revenue: "$1M-4M_revenue",
                      expense: "$1M-4M_expense",
                      deficitOrSurplus: {
                        $subtract: ["$1M-4M_revenue", "$1M-4M_expense"],
                      },
                    },
                    "4M+": {
                      revenue: "$4M+_revenue",
                      expense: "$4M+_expense",
                      deficitOrSurplus: {
                        $subtract: ["$4M+_revenue", "$4M+_expense"],
                      },
                    },
                  },
                },
              ],
        },
      }
    );
  }

  if (type == "deficitOrSurplus") {
    pipeline.push({ $unwind: "$national" });
  }
  return pipeline;
};

exports.nationalDashOwnRevenuePipeline = (
  financialYear,
  stateId,
  ulbs,
  lineItems,
  type,
  formType
) => {
  const pipeline = [
    {
      $match: {
        financialYear,
        lineItem: {
          $in: lineItems,
        },
      },
    },
  ];
  // if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
  pipeline.push(
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
      "$match": {
        "ulb.isActive": true
      }
    }
  );
  if (type == "totalOwnRevenue") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 1e5],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "100K-500K": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e5] },
                      { $lte: ["$population", 5e5] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "500K-1M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 5e5] },
                      { $lte: ["$population", 1e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "1M-4M": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$population", 1e6] },
                      { $lte: ["$population", 4e6] },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "4M+": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4e6],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              Ownrevenue: {
                $divide: ["$<100K_amount", 1e7],
              },
              set: "$<100K_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$<100K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$<100K_amount", "$<100K"],
                  },
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              Ownrevenue: {
                $divide: ["$100K-500K_amount", 1e7],
              },
              set: "$100K-500K_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$100K-500K", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$100K-500K_amount", "$100K-500K"],
                  },
                },
              },
            },
            "500 Thousand - 1 Million": {
              Ownrevenue: { $divide: ["$500K-1M_amount", 1e7] },
              set: "$500K-1M_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$500K-1M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$500K-1M_amount", "$500K-1M"],
                  },
                },
              },
            },
            "1 Million - 4 Million": {
              Ownrevenue: { $divide: ["$1M-4M_amount", 1e7] },
              set: "$1M-4M_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$1M-4M", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$1M-4M_amount", "$1M-4M"],
                  },
                },
              },
            },
            "4 Million+": {
              Ownrevenue: { $divide: ["$4M+_amount", 1e7] },
              set: "$4M+_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$4M+", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$4M+_amount", "$4M+"],
                  },
                },
              },
            },
          },
        }
      );
    } else if (formType == "ulbType") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            population: { $first: "$ulb.population" },
            ulbType: { $first: "$ulb.ulbType" },
            amount: {
              $sum: "$amount",
            },
          },
        },
        {
          $group: {
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            municipal: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            townPanchayat: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "Municipal Corporation": {
              Ownrevenue: {
                $divide: ["$municipalCorp_amount", 1e7],
              },
              set: "$municipalCorp_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipalCorp", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipalCorp_amount", "$municipalCorp"],
                  },
                },
              },
            },
            Municipality: {
              Ownrevenue: {
                $divide: ["$municipal_amount", 1e7],
              },
              set: "$municipal_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$municipal", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$municipal_amount", "$municipal"],
                  },
                },
              },
            },
            "Town Panchayat": {
              Ownrevenue: {
                $divide: ["$townPanchayat_amount", 1e7],
              },
              set: "$townPanchayat_set",
              OwnrevenuePerCapita: {
                $cond: {
                  if: {
                    $eq: ["$townPanchayat", 0],
                  },
                  then: 0,
                  else: {
                    $divide: ["$townPanchayat_amount", "$townPanchayat"],
                  },
                },
              },
            },
          },
        }
      );
    }
  } else if (type == "OwnrevenueMix") {
    pipeline.push({
      $facet: {
        state: [
          {
            $match: {
              "ulb.state": stateId ? ObjectId(stateId) : ""
            }
          },
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineitems",
            },
          },
          {
            $unwind: "$lineitems",
          },
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
              },
              colour: {
                $first: "$lineitems.colour",
              },
              lineName: {
                $first: "$lineitems.name",
              },
            },
          },
        ],
        national: [
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineitems",
            },
          },
          {
            $unwind: "$lineitems",
          },
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
              },
              colour: {
                $first: "$lineitems.colour",
              },
              lineName: {
                $first: "$lineitems.name",
              },
            },
          },
        ],
        individual:
          formType == "ulbType"
            ? [
              {
                $group: {
                  _id: { lineItem: "$lineItem", type: "$ulb.ulbType" },
                  amount: { $sum: "$amount" },
                },
              },
              {
                $group: {
                  _id: "$_id.type",
                  data: {
                    $push: {
                      lineItem: "$_id.lineItem",
                      amount: "$amount",
                    },
                  },
                },
              },
            ]
            : [
              {
                $group: {
                  _id: { lineItem: "$lineItem" },
                  "<100K": {
                    $sum: {
                      $cond: {
                        if: {
                          $lt: ["$ulb.population", 1e5],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "100K-500K": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 1e5] },
                            { $lte: ["$ulb.population", 5e5] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "500K-1M": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 5e5] },
                            { $lte: ["$ulb.population", 1e6] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "1M-4M": {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gte: ["$ulb.population", 1e6] },
                            { $lte: ["$ulb.population", 4e6] },
                          ],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },

                  "4M+": {
                    $sum: {
                      $cond: {
                        if: {
                          $gt: ["$ulb.population", 4e6],
                        },
                        then: "$amount",
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
      },
    });
  }
  return pipeline;
};
exports.nationalDashCapexpensePipeline = async (
  financialYear,
  stateId,
  ulbs,
  lineItems,
  type,
  formType
) => {
  console.log(getOldYear(financialYear));
  let currentYear = UlbLedger.distinct("ulb", {
    financialYear: financialYear,
  }).lean();
  let oldYear = UlbLedger.distinct("ulb", {
    financialYear: getOldYear(financialYear),
  }).lean();

  let ulbAggregate = await Promise.all([currentYear, oldYear]);
  let commonUlbs = [],
    map = {};
  ulbAggregate[0].forEach((val) => {
    map[val] = 1;
  });
  ulbAggregate[1].forEach((val) => {
    if (map[val]) {
      commonUlbs.push(val);
    }
  });
  let pipeline = [
    {
      $match: {
        ulb: { $in: commonUlbs },
        financialYear: { $in: [financialYear, getOldYear(financialYear)] },
        lineItem: {
          $in: lineItems,
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
      "$match": {
        "ulb.isActive": true
      }
    },
    {
      $group: {
        _id: {
          ulb: "$ulb._id",
          financialYear: "$financialYear",
        },
        population: {
          $first: "$ulb.population",
        },
        ulbType: {
          $first: "$ulb.ulbType",
        },
        410: {
          $sum: {
            $cond: {
              if: {
                $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d779")],
              },
              then: "$amount",
              else: 0,
            },
          },
        },
        412: {
          $sum: {
            $cond: {
              if: {
                $eq: ["$lineItem", ObjectId("5dd10c2785c951b54ec1d774")],
              },
              then: "$amount",
              else: 0,
            },
          },
        },
      },
    },
  ];
  if (formType == "ulbType") {
    pipeline.push(
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulbType",
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
            ulbTypeId: "$ulbType._id",
            financialYear: "$_id.financialYear",
          },
          ulbType: { $first: "$ulbType.name" },
          amount_410: {
            $sum: "$410",
          },
          amount_412: {
            $sum: "$412",
          },
          population: {
            $sum: "$population",
          },
          noOfUlbs: { $sum: 1 },
        },
      }
    );
  }
  if (formType == "populationCategory") {
    pipeline.push({
      $group: {
        _id: {
          financialYear: "$_id.financialYear",
        },
        "<100K_410": {
          $sum: {
            $cond: {
              if: {
                $lt: ["$population", 1e5],
              },
              then: "$410",
              else: 0,
            },
          },
        },
        "100K-500K_410": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e5] },
                  { $lte: ["$population", 5e5] },
                ],
              },
              then: "$410",
              else: 0,
            },
          },
        },
        "500K-1M_410": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 5e5] },
                  { $lte: ["$population", 1e6] },
                ],
              },
              then: "$410",
              else: 0,
            },
          },
        },
        "1M-4M_410": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e6] },
                  { $lte: ["$population", 4e6] },
                ],
              },
              then: "$410",
              else: 0,
            },
          },
        },
        "4M+_410": {
          $sum: {
            $cond: {
              if: {
                $gt: ["$population", 4e6],
              },
              then: "$410",
              else: 0,
            },
          },
        },

        "<100K_412": {
          $sum: {
            $cond: {
              if: {
                $lt: ["$population", 1e5],
              },
              then: "$412",
              else: 0,
            },
          },
        },
        "100K-500K_412": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e5] },
                  { $lte: ["$population", 5e5] },
                ],
              },
              then: "$412",
              else: 0,
            },
          },
        },
        "500K-1M_412": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 5e5] },
                  { $lte: ["$population", 1e6] },
                ],
              },
              then: "$412",
              else: 0,
            },
          },
        },
        "1M-4M_412": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e6] },
                  { $lte: ["$population", 4e6] },
                ],
              },
              then: "$412",
              else: 0,
            },
          },
        },
        "4M+_412": {
          $sum: {
            $cond: {
              if: {
                $gt: ["$population", 4e6],
              },
              then: "$412",
              else: 0,
            },
          },
        },

        "<100K_pop": {
          $sum: {
            $cond: {
              if: {
                $lt: ["$population", 1e5],
              },
              then: "$population",
              else: 0,
            },
          },
        },
        "100K-500K_pop": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e5] },
                  { $lte: ["$population", 5e5] },
                ],
              },
              then: "$population",
              else: 0,
            },
          },
        },
        "500K-1M_pop": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 5e5] },
                  { $lte: ["$population", 1e6] },
                ],
              },
              then: "$population",
              else: 0,
            },
          },
        },
        "1M-4M_pop": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e6] },
                  { $lte: ["$population", 4e6] },
                ],
              },
              then: "$population",
              else: 0,
            },
          },
        },
        "4M+_pop": {
          $sum: {
            $cond: {
              if: {
                $gt: ["$population", 4e6],
              },
              then: "$population",
              else: 0,
            },
          },
        },

        "<100K_noOfUlbs": {
          $sum: {
            $cond: {
              if: {
                $lt: ["$population", 1e5],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "100K-500K_noOfUlbs": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e5] },
                  { $lte: ["$population", 5e5] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "500K-1M_noOfUlbs": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 5e5] },
                  { $lte: ["$population", 1e6] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "1M-4M_noOfUlbs": {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ["$population", 1e6] },
                  { $lte: ["$population", 4e6] },
                ],
              },
              then: 1,
              else: 0,
            },
          },
        },
        "4M+_noOfUlbs": {
          $sum: {
            $cond: {
              if: {
                $gt: ["$population", 4e6],
              },
              then: 1,
              else: 0,
            },
          },
        },
      },
    });
  }
  return pipeline;
};

exports.stateDashAvgsPipeline = async (
  financialYear,
  which,
  noOfUlbs,
  TabType,
  stateId,
  code,
  isPerCapita
) => {
  let matchObj = {};
  let pipeline = [{ $match: matchObj }];
  if (financialYear) matchObj.financialYear = financialYear;
  if (which == "ulbTypeAvg" || which == "populationAvg") {
    if (stateId) {
      let ulbs = await Ulb.find({ state: stateId, isActive: true }).select("_id");
      matchObj.ulb = { $in: ulbs.map((each) => each._id) };
    }
  }
  if (TabType == "TotalRevenue" || TabType == "TotalOwnRevenue") {
    let lineItemFilter = { headOfAccount: "Revenue" };
    if (TabType == "TotalOwnRevenue")
      lineItemFilter = {
        code: {
          $in: ["110", "130", "140", "150", "180"],
        },
      };
    let lineIds = await LineItem.find(lineItemFilter).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (
    TabType == "RevenuePerCapita" ||
    TabType == "OwnRevenuePerCapita"
  ) {
    let lineItemFilter = { headOfAccount: "Revenue" };
    if (TabType == "OwnRevenuePerCapita")
      lineItemFilter = {
        code: {
          $in: ["110", "130", "140", "150", "180"],
        },
      };
    let lineIds = await LineItem.find(lineItemFilter).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (
    TabType == "RevenueMix" ||
    TabType == "OwnRevenueMix" ||
    TabType == "ExpenditureMix"
  ) {
    if (!code) throw { message: "code is missing" };
    code = code.split(",");
    let lineIds = await LineItem.find({
      code: { $in: code },
    }).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "RevenueTotalExpenditure") {
    let lineIds = await LineItem.find({
      code: { $in: ["200", "210", "220", "230", "240"] },
    }).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "RevenueExpenditurePerCapita") {
    let lineIds = await LineItem.find({ code: { $in: ["210", "220", "230"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "RevenueExpenditureMix") {
    let lineIds = await LineItem.find({
      code: { $in: ["210", "220", "230"] },
    }).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "CapitalTotalExpenditure") {
    let lineIds = await LineItem.find({ code: { $in: ["410", "412"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "CapitalExpenditurePerCapita") {
    let lineIds = await LineItem.find({ code: { $in: ["410", "412"] } })
      .select("_id")
      .lean();
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  } else if (TabType == "DeficitOrSurplus") {
    let lineIds = await LineItem.find({
      headOfAccount: { $in: ["Revenue", "Expense"] },
    }).select("_id");
    Object.assign(matchObj, {
      lineItem: { $in: lineIds.map((value) => value._id) },
    });
  }
  pipeline.push(
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
    }
  );
  if (which == "nationalAvg") {
    if (isPerCapita && TabType != "DeficitOrSurplus") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: {
              $sum: "$amount",
            },
            population: { $first: "$ulb.population" },
          },
        },
        {
          $group: {
            _id: null,
            sum: {
              $sum: "$amount",
            },
            population: { $sum: "$population" },
            ulbCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            national: {
              $divide: ["$sum", "$population"],
            },
            ulbCount: 1,
          },
        },
        {
          $project: {
            _id: 0,
            national: {
              $divide: ["$national", "$ulbCount"],
            },
          },
        }
      );
    } else if (!isPerCapita && TabType == "DeficitOrSurplus") {
      pipeline.push(
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
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Revenue"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            expenditure: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Expense"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            population: {
              $first: "$ulb.population",
            },
            name: { $first: "$ulb.name" },
          },
        },

        {
          $project: {
            amount: {
              $subtract: ["$revenue", "$expenditure"],
            },
            population: 1,
          },
        },
        {
          $group: {
            _id: null,
            sum: {
              $sum: { $multiply: ["$population", "$amount"] },
            },
            population: { $sum: "$population" },
            ulbCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            national: {
              $divide: ["$sum", "$population"],
            },
            ulbCount: 1,
          },
        }
      );
    } else if (TabType == "CapitalTotalExpenditure") {
      let tempYear = financialYear
        .split("-")
        .map((value) => Number(value) - 1)
        .join("-");
      let financialYearArr = [financialYear, tempYear];
      let ulbIds_query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [
                ObjectId("5dd10c2785c951b54ec1d779"),
                ObjectId("5dd10c2785c951b54ec1d774"),
              ],
            },
          },
        },
        {
          $group: {
            _id: "$financialYear",
            ulbs: { $addToSet: "$ulb" },
          },
        },
        {
          $group: {
            _id: null,
            ulbPrev: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", tempYear] }, "$ulbs", null],
              },
            },
            ulbNew: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", financialYear] }, "$ulbs", null],
              },
            },
          },
        },
        {
          $project: {
            ulbPrev: { $arrayElemAt: ["$ulbPrev", 0] },
            ulbNew: { $arrayElemAt: ["$ulbNew", 1] },
          },
        },
        {
          $project: {
            commonToBoth: { $setIntersection: ["$ulbPrev", "$ulbNew"] },
          },
        },
      ];
      let output = await UlbLedger.aggregate(ulbIds_query);
      let ulbID = output[0]?.commonToBoth;
      ulbID = ulbID.map((value) => {
        return ObjectId(value);
      });
      let query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
            },
            ulb: {
              $in: ulbID,
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
          $group: {
            _id: null,
            sum: {
              $sum: { $multiply: ["$amount", isPerCapita ? 1 : "$population"] },
            },
            population: { $sum: "$population" },
          },
        },
        {
          $project: {
            _id: 0,
            national: {
              $divide: ["$sum", "$population"],
            },
          },
        },
      ];
      pipeline = query;
    } else {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: {
              $sum: "$amount",
            },
            population: { $first: "$ulb.population" },
          },
        },
        {
          $group: {
            _id: null,
            sum: {
              $sum: { $multiply: ["$amount", "$population"] },
            },
            population: { $sum: "$population" },
          },
        },
        {
          $project: {
            _id: 0,
            national: {
              $divide: ["$sum", "$population"],
            },
          },
        }
      );
    }
  } else if (which == "ulbTypeAvg") {
    if (isPerCapita && TabType != "DeficitOrSurplus") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: {
              $sum: "$amount",
            },
            expenditure: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Expense"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            population: {
              $first: "$ulb.population",
            },
            ulbType: { $first: "$ulb.ulbType" },
          },
        },

        {
          $project: {
            amount: {
              $subtract: ["$revenue", "$expenditure"],
            },
            population: 1,
            ulbType: 1,
          },
        },
        {
          $group: {
            _id: null,
            municipalAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            municipalUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            municipalPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            municipalCorUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            municipalCorPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            townPanUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            townPanPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            Municipality: {
              $cond: {
                if: {
                  $lt: ["$municipalAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalAmt", "$municipalPopulation"],
                },
              },
            },
            "Municipal Corporation": {
              $cond: {
                if: {
                  $lt: ["$municipalCorAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalCorAmt", "$municipalCorPopulation"],
                },
              },
            },
            "Town Panchayat": {
              $cond: {
                if: {
                  $lt: ["$townPanAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$townPanAmt", "$townPanPopulation"],
                },
              },
            },
            townPanUlbs: 1,
            municipalCorUlbs: 1,
            municipalUlbs: 1,
          },
        },
        {
          $project: {
            _id: 0,
            Municipality: {
              $cond: {
                if: {
                  $lt: ["$Municipality", 1],
                },
                then: 0,
                else: {
                  $divide: ["$Municipality", "$municipalUlbs"],
                },
              },
            },
            "Municipal Corporation": {
              $cond: {
                if: {
                  $lt: ["$Municipal Corporation", 1],
                },
                then: 0,
                else: {
                  $divide: ["$Municipal Corporation", "$municipalCorUlbs"],
                },
              },
            },
            "Town Panchayat": {
              $cond: {
                if: {
                  $lt: ["$Town Panchayat", 1],
                },
                then: 0,
                else: {
                  $divide: ["$Town Panchayat", "$townPanUlbs"],
                },
              },
            },
          },
        }
      );
    } else if (!isPerCapita && TabType == "DeficitOrSurplus") {
      pipeline.push(
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
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Revenue"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            expenditure: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Expense"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            population: {
              $first: "$ulb.population",
            },
            ulbType: {
              $first: "$ulb.ulbType",
            },
          },
        },
        {
          $project: {
            amount: {
              $subtract: ["$revenue", "$expenditure"],
            },
            population: 1,
            ulbType: 1,
          },
        },
        {
          $group: {
            _id: null,
            municipalAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            municipalUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            municipalPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            municipalCorUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            municipalCorPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            townPanUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            townPanPopulation: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            Municipality: {
              $cond: {
                if: {
                  $eq: ["$municipalPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$municipalAmt", "$municipalPopulation"],
                },
              },
            },
            "Municipal Corporation": {
              $cond: {
                if: {
                  $eq: ["$municipalCorPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$municipalCorAmt", "$municipalCorPopulation"],
                },
              },
            },
            "Town Panchayat": {
              $cond: {
                if: {
                  $eq: ["$townPanPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$townPanAmt", "$townPanPopulation"],
                },
              },
            },
          },
        }
      );
    } else if (TabType == "CapitalTotalExpenditure") {
      let tempYear = financialYear
        .split("-")
        .map((value) => Number(value) - 1)
        .join("-");
      let financialYearArr = [financialYear, tempYear];
      let ulbIds_query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [
                ObjectId("5dd10c2785c951b54ec1d779"),
                ObjectId("5dd10c2785c951b54ec1d774"),
              ],
            },
          },
        },
        {
          $group: {
            _id: "$financialYear",
            ulbs: { $addToSet: "$ulb" },
          },
        },
        {
          $group: {
            _id: null,
            ulbPrev: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", tempYear] }, "$ulbs", null],
              },
            },
            ulbNew: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", financialYear] }, "$ulbs", null],
              },
            },
          },
        },
        {
          $project: {
            ulbPrev: { $arrayElemAt: ["$ulbPrev", 0] },
            ulbNew: { $arrayElemAt: ["$ulbNew", 1] },
          },
        },
        {
          $project: {
            commonToBoth: { $setIntersection: ["$ulbPrev", "$ulbNew"] },
          },
        },
      ];
      let output = await UlbLedger.aggregate(ulbIds_query);
      let ulbID = output[0]?.commonToBoth;
      ulbID = ulbID.map((value) => {
        return ObjectId(value);
      });
      let query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
            },
            ulb: {
              $in: ulbID,
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
            ulbId: { $first: "$ulb._id" },
            ulbType: { $first: "$ulbType._id" },
            population: { $first: "$ulb.population" },
            capitalWorkPrevYear: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$financialYear", tempYear] },
                      {
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
          $group: {
            _id: null,
            municipalAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            municipalUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            municipalCorUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            townPanUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            Municipality: {
              $cond: {
                if: {
                  $lt: ["$municipalAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalAmt", "$municipalUlbs"],
                },
              },
            },
            "Municipal Corporation": {
              $cond: {
                if: {
                  $lt: ["$municipalCorAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalCorAmt", "$municipalCorUlbs"],
                },
              },
            },
            "Town Panchayat": {
              $cond: {
                if: {
                  $lt: ["$townPanAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$townPanAmt", "$townPanUlbs"],
                },
              },
            },
          },
        },
      ];
      pipeline = query;
    } else {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: {
              $sum: "$amount",
            },
            population: {
              $first: "$ulb.population",
            },
            ulbType: {
              $first: "$ulb.ulbType",
            },
          },
        },
        {
          $group: {
            _id: null,
            municipalAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            municipalUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            municipalCorAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            municipalCorUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            townPanAmt: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            townPanUlbs: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            Municipality: {
              $cond: {
                if: {
                  $lt: ["$municipalAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalAmt", "$municipalUlbs"],
                },
              },
            },
            "Municipal Corporation": {
              $cond: {
                if: {
                  $lt: ["$municipalCorAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$municipalCorAmt", "$municipalCorUlbs"],
                },
              },
            },
            "Town Panchayat": {
              $cond: {
                if: {
                  $lt: ["$townPanAmt", 1],
                },
                then: 0,
                else: {
                  $divide: ["$townPanAmt", "$townPanUlbs"],
                },
              },
            },
          },
        }
      );
    }
  } else if (which == "populationAvg") {
    if (isPerCapita && TabType != "DeficitOrSurplus") {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: {
              $sum: "$amount",
            },
            population: {
              $first: "$ulb.population",
            },
          },
        },
        {
          $group: {
            _id: null,
            "<100KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "<100Kset": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "<100KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "<100KPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "100K-500KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "100K-500KPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "500K-1MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "500K-1MPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "1M-4MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "1M-4MPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+Amt": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "4M+Ulbs": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "4M+Population": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$<100KAmt", "$<100KPopulation"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100K-500KAmt", "$100K-500KPopulation"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500K-1MAmt", "$500K-1MPopulation"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1M-4MAmt", "$1M-4MPopulation"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Population", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4M+Amt", "$4M+Population"],
                },
              },
            },
            "4M+Ulbs": 1,
            "1M-4MUlbs": 1,
            "500K-1MUlbs": 1,
            "100K-500KUlbs": 1,
            "<100KUlbs": 1,
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$< 100 Thousand", "$<100KUlbs"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100 Thousand - 500 Thousand", "$100K-500KUlbs"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500 Thousand - 1 Million", "$500K-1MUlbs"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1 Million - 4 Million", "$1M-4MUlbs"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Ulbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4 Million+", "$4M+Ulbs"],
                },
              },
            },
          },
        }
      );
    } else if (!isPerCapita && TabType == "DeficitOrSurplus") {
      pipeline.push(
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
            revenue: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Revenue"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            expenditure: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$lineItem.headOfAccount", "Expense"],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            population: {
              $first: "$ulb.population",
            },
            name: { $first: "$ulb.name" },
          },
        },

        {
          $project: {
            amount: {
              $subtract: ["$revenue", "$expenditure"],
            },
            population: 1,
          },
        },
        {
          $group: {
            _id: null,
            "<100KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "<100Kset": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$_id",
                  else: "",
                },
              },
            },
            "<100KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "<100KPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "100K-500KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "100K-500KPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "500K-1MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "500K-1MPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "1M-4MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "1M-4MPopulation": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+Amt": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            "4M+Ulbs": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
            "4M+Population": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$<100KAmt", "$<100KPopulation"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100K-500KAmt", "$100K-500KPopulation"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500K-1MAmt", "$500K-1MPopulation"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MPopulation", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1M-4MAmt", "$1M-4MPopulation"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Population", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4M+Amt", "$4M+Population"],
                },
              },
            },
            "4M+Ulbs": 1,
            "1M-4MUlbs": 1,
            "500K-1MUlbs": 1,
            "100K-500KUlbs": 1,
            "<100KUlbs": 1,
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$< 100 Thousand", "$<100KUlbs"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100 Thousand - 500 Thousand", "$100K-500KUlbs"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500 Thousand - 1 Million", "$500K-1MUlbs"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1 Million - 4 Million", "$1M-4MUlbs"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Ulbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4 Million+", "$4M+Ulbs"],
                },
              },
            },
          },
        }
      );
    } else if (
      TabType == "CapitalTotalExpenditure" ||
      TabType == "CapitalExpenditurePerCapita"
    ) {
      let tempYear = financialYear
        .split("-")
        .map((value) => Number(value) - 1)
        .join("-");
      let financialYearArr = [financialYear, tempYear];
      let ulbIds_query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [
                ObjectId("5dd10c2785c951b54ec1d779"),
                ObjectId("5dd10c2785c951b54ec1d774"),
              ],
            },
          },
        },
        {
          $group: {
            _id: "$financialYear",
            ulbs: { $addToSet: "$ulb" },
          },
        },
        {
          $group: {
            _id: null,
            ulbPrev: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", tempYear] }, "$ulbs", null],
              },
            },
            ulbNew: {
              $addToSet: {
                $cond: [{ $eq: ["$_id", financialYear] }, "$ulbs", null],
              },
            },
          },
        },
        {
          $project: {
            ulbPrev: { $arrayElemAt: ["$ulbPrev", 0] },
            ulbNew: { $arrayElemAt: ["$ulbNew", 1] },
          },
        },
        {
          $project: {
            commonToBoth: { $setIntersection: ["$ulbPrev", "$ulbNew"] },
          },
        },
      ];
      let output = await UlbLedger.aggregate(ulbIds_query);
      let ulbID = output[0]?.commonToBoth;
      ulbID = ulbID.map((value) => {
        return ObjectId(value);
      });
      let query = [
        {
          $match: {
            $or: [
              { financialYear: financialYear },
              { financialYear: tempYear },
            ],
            lineItem: {
              $in: [...Capital_Expenditure.map((value) => ObjectId(value))],
            },
            ulb: {
              $in: ulbID,
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
            ulbId: { $first: "$ulb._id" },
            ulbType: { $first: "$ulbType._id" },
            population: { $first: "$ulb.population" },
            capitalWorkPrevYear: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$financialYear", tempYear] },
                      {
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d774"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
                        $eq: [
                          "$lineItem",
                          ObjectId("5dd10c2785c951b54ec1d779"),
                        ],
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
          $group: {
            _id: null,
            "<100KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            "<100KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            "100K-500KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            "500K-1MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            "1M-4MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+Amt": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: {
                    $multiply: ["$amount", isPerCapita ? 1 : "$population"],
                  },
                  else: 0,
                },
              },
            },
            "4M+Ulbs": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$<100KAmt", "$<100KUlbs"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100K-500KAmt", "$100K-500KUlbs"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500K-1MAmt", "$500K-1MUlbs"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1M-4MAmt", "$1M-4MUlbs"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Ulbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4M+Amt", "$4M+Ulbs"],
                },
              },
            },
          },
        },
      ];
      pipeline = query;
    } else {
      pipeline.push(
        {
          $group: {
            _id: "$ulb._id",
            amount: { $sum: "$amount" },
            population: { $first: "$ulb.population" },
          },
        },
        {
          $group: {
            _id: null,
            "<100KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            "<100KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$population", 100000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "100K-500KAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            "100K-500KUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 100000],
                      },
                      {
                        $lte: ["$population", 500000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "500K-1MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            "500K-1MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 500000],
                      },
                      {
                        $lte: ["$population", 1000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "1M-4MAmt": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            "1M-4MUlbs": {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gte: ["$population", 1000000],
                      },
                      {
                        $lte: ["$population", 4000000],
                      },
                    ],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
            "4M+Amt": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: { $multiply: ["$amount", "$population"] },
                  else: 0,
                },
              },
            },
            "4M+Ulbs": {
              $sum: {
                $cond: {
                  if: {
                    $gt: ["$population", 4000000],
                  },
                  then: "$population",
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              $cond: {
                if: {
                  $eq: ["$<100KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$<100KAmt", "$<100KUlbs"],
                },
              },
            },
            "100 Thousand - 500 Thousand": {
              $cond: {
                if: {
                  $eq: ["$100K-500KUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$100K-500KAmt", "$100K-500KUlbs"],
                },
              },
            },
            "500 Thousand - 1 Million": {
              $cond: {
                if: {
                  $eq: ["$500K-1MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$500K-1MAmt", "$500K-1MUlbs"],
                },
              },
            },
            "1 Million - 4 Million": {
              $cond: {
                if: {
                  $eq: ["$1M-4MUlbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$1M-4MAmt", "$1M-4MUlbs"],
                },
              },
            },
            "4 Million+": {
              $cond: {
                if: {
                  $eq: ["$4M+Ulbs", 0],
                },
                then: 0,
                else: {
                  $divide: ["$4M+Amt", "$4M+Ulbs"],
                },
              },
            },
          },
        }
      );
    }
  }
  return pipeline;
};

const calculateWeigthedAvg = (data) => {
  let numerator = 0,
    denominator = 0;

  data.forEach((el) => {
    numerator +=
      (el.value || el.value == 0 ? el.value : el.amount) * el.population;
    denominator = el.population + denominator;
  });
  return Number((numerator / denominator).toFixed(2));
};

function getOldYear(financialYear) {
  let temp = financialYear.split("-");
  return `${Number(temp[0]) - 1}-${Number(temp[1]) - 1}`;
}

const getCategoryMatchObject = category => ({
  '1': {
    'population': {
      $gt: 4000000
    }
  },
  '2': {
    'population': {
      $lte: 4000000,
      $gte: 1000000,
    }
  },
  '3': {
    'population': {
      $lt: 1000000,
      $gte: 100000,
    }
  },
  '4': {
    'population': {
      $lt: 100000,
    }
  }
}[category] || {});

const stateWiseHeatMapQuery = ({ state, category }) => {
  let matchObj = {}
  let aggregationQuery = [
    {
      "$match": {
        "isActive": true,
        ...(state && {"state": ObjectId(state)}),
        ...getCategoryMatchObject(category)
      }
    },
    {
      "$lookup": {
        "from": "fiscalrankings",
        "localField": "_id",
        "foreignField": "ulb",
        "as": "formData"
      }
    },
    {
      "$unwind": {
        "path": "$formData",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$addFields": {
        "emptyForms": {
          "$ifNull": ["$formData", 1]
        }
      }
    },
    {
      "$group": {
        "_id": "$state",
        "totalUlbs": {
          "$sum": 1
        },
        "verificationNotStarted": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 8] },
              1,
              0
            ]
          }
        },
        "verificationInProgress": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 9] },
              1,
              0
            ]
          }
        },
        "returnedByPMU": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 10] },
              1,
              0
            ]
          }
        },
        "notStarted": {
          "$sum": {
            "$cond": [
              { "$eq": ["$emptyForms", 1] },
              1,
              0
            ]
          }
        },
        "inProgress": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 2] },
              1,
              0
            ]
          }
        },
        "submissionAckByPMU": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 11] },
              1,
              0
            ]
          }
        },
      }
    },
    {
      "$lookup": {
        "from": "states",
        "localField": "_id",
        "foreignField": "_id",
        "as": "states"
      },
    },
    {
      "$unwind": {
        "path": "$states",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$addFields": {
        "percentage": {
          "$multiply": [
            {
              "$divide": [
                {
                  "$add": [
                    "$submissionAckByPMU",
                    "$returnedByPMU",
                    "$verificationInProgress",
                    "$verificationNotStarted"
                  ]
                }
                , "$totalUlbs"]
            }
            , 100]
        },
        "totalForms": {
          "$add": [
            "$submissionAckByPMU",
            "$returnedByPMU",
            "$verificationInProgress",
            "$verificationNotStarted"
          ]
        }
      }
    },
    {
      "$group": {
        "_id": 0,
        "heatMaps": {
          "$push": {
            "_id": "$states.name",
            "stateId": "$states._id",
            "code": "$states.code",
            "percentage": "$percentage"
          }
        },
        "totalForms": { $sum: "$totalForms" },
        "verificationInProgress": { $sum: "$verificationInProgress" },
        "verificationNotStarted": { $sum: "$verificationNotStarted" },
        "approved": { $sum: "$submissionAckByPMU" },
        "rejected": { $sum: "$returnedByPMU" },
        "totalUlbs": { $sum: "$totalUlbs" },
        "inProgress": { $sum: "$inProgress" },
        "submitted": { $sum: { $add: ["$verificationNotStarted", "$verificationInProgress", "$submissionAckByPMU"] } },
        "notStarted": { $sum: "$notStarted" },

      }
    },
    {
      "$project": {
        "heatMaps": "$heatMaps",
        "formWiseData": {
          "totalForms": "$totalForms",
          "verificationInProgress": "$verificationInProgress",
          "verificationNotStarted": "$verificationNotStarted",
          "approved": "$approved",
          "rejected": "$rejected"
        },
        "ulbWiseData": {
          "totalUlbs": "$totalUlbs",
          "inProgress": "$inProgress",
          "submitted": "$submitted",
          "notStarted": "$notStarted"
        }
      }
    }
  ];

  console.log(JSON.stringify(aggregationQuery, 3, 3));
  return aggregationQuery
}

module.exports.getCategoryMatchObject = getCategoryMatchObject
module.exports.stateWiseHeatMapQuery = stateWiseHeatMapQuery