const mongoose = require("mongoose");
const Ulb = require("../models/Ulb");
const LineItem = require("../models/LineItem");
const { ObjectId } = mongoose.Types;

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
  if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
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
  if (type == "totalRevenue") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e5] },
                      { $lte: ["$ulb.population", 5e5] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 5e5] },
                      { $lte: ["$ulb.population", 1e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e6] },
                      { $lte: ["$ulb.population", 4e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$ulb.population", 4e6],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
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
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
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
    pipeline.push({
      $facet: {
        national: [
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
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

exports.stateDashRevenueTabs = async (
  financialYear,
  tabType,
  stateId,
  sortBy = "top",
  code
) => {
  let ulbIds = await Ulb.find({ state: stateId }).select("_id").lean();
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
            $sum: "$ulb.population",
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
    let lineIds = await LineItem.find({ code: { $in: ["210", "220", "230"] } })
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
    let lineIds = await LineItem.find({ code: { $in: ["210", "220", "230"] } })
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
            $sum: "$ulb.population",
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
            $sum: "$ulb.population",
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
    let ulbs = await Ulb.find({ state: ObjectId(state) }).select("_id");
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
  if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
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
  if (type == "totalExpenditure") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e5] },
                      { $lte: ["$ulb.population", 5e5] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 5e5] },
                      { $lte: ["$ulb.population", 1e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e6] },
                      { $lte: ["$ulb.population", 4e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$ulb.population", 4e6],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
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
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
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
        national: [
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
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
                      revenue: 1,
                      expense: 1,
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
                                ,
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
                                ,
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
  if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
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
  if (type == "totalOwnRevenue") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e5] },
                      { $lte: ["$ulb.population", 5e5] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 5e5] },
                      { $lte: ["$ulb.population", 1e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e6] },
                      { $lte: ["$ulb.population", 4e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$ulb.population", 4e6],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
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
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
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
        national: [
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
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
exports.nationalDashCapexpensePipeline = (
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
  if (stateId) pipeline[0]["$match"]["ulb"] = { $in: ulbs };
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
  if (type == "totalCapexpense") {
    if (formType == "populationCategory") {
      pipeline.push(
        {
          $group: {
            _id: null,
            "<100K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "100K-500K_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e5] },
                      { $lte: ["$ulb.population", 5e5] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "500K-1M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 5e5] },
                      { $lte: ["$ulb.population", 1e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "1M-4M_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ["$ulb.population", 1e6] },
                      { $lte: ["$ulb.population", 4e6] },
                    ],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "4M+_set": {
              $addToSet: {
                $cond: {
                  if: {
                    $gt: ["$ulb.population", 4e6],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            "<100K": {
              $sum: {
                $cond: {
                  if: {
                    $lt: ["$ulb.population", 1e5],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "<100K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "100K-500K_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "500K-1M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "1M-4M_amount": {
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
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            "4M+_amount": {
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
        {
          $project: {
            _id: 0,
            "< 100 Thousand": {
              Capexpense: {
                $divide: ["$<100K_amount", 1e7],
              },
              set: "$<100K_set",
              CapexpensePerCapita: {
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
              Capexpense: {
                $divide: ["$100K-500K_amount", 1e7],
              },
              set: "$100K-500K_set",
              CapexpensePerCapita: {
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
              Capexpense: { $divide: ["$500K-1M_amount", 1e7] },
              set: "$500K-1M_set",
              CapexpensePerCapita: {
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
              Capexpense: { $divide: ["$1M-4M_amount", 1e7] },
              set: "$1M-4M_set",
              CapexpensePerCapita: {
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
              Capexpense: { $divide: ["$4M+_amount", 1e7] },
              set: "$4M+_set",
              CapexpensePerCapita: {
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
            _id: null,
            municipalCorp_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipal_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            townPanchayat_set: {
              $addToSet: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb._id",
                  else: "",
                },
              },
            },
            municipalCorp: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipalCorp_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa67543263a0e75c71697")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            municipal_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa64e43263a0e75c71695")],
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
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
                  },
                  then: "$ulb.population",
                  else: 0,
                },
              },
            },
            townPanchayat_amount: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$ulb.ulbType", ObjectId("5dcfa66b43263a0e75c71696")],
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
              Capexpense: {
                $divide: ["$municipalCorp_amount", 1e7],
              },
              set: "$municipalCorp_set",
              CapexpensePerCapita: {
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
              Capexpense: {
                $divide: ["$municipal_amount", 1e7],
              },
              set: "$municipal_set",
              CapexpensePerCapita: {
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
              Capexpense: {
                $divide: ["$townPanchayat_amount", 1e7],
              },
              set: "$townPanchayat_set",
              CapexpensePerCapita: {
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
  } else if (type == "CapexpenseMix") {
    pipeline.push({
      $facet: {
        national: [
          {
            $group: {
              _id: { lineItem: "$lineItem" },
              amount: {
                $sum: "$amount",
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