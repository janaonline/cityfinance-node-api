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
              revenue: "$<100K_amount",
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
              revenue: "$100K-500K_amount",
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
              revenue: "$500K-1M_amount",
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
              revenue: "$1M-4M_amount",
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
              revenue: "$4M+_amount",
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
              revenue: "$municipalCorp_amount",
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
              revenue: "$municipal_amount",
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
              revenue: "$townPanchayat_amount",
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
  if (tabType == "TotalRevenue") {
    let lineIds = await LineItem.find({ headOfAccount: "Revenue" })
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
  } else if (tabType == "RevenuePerCapita") {
    let lineIds = await LineItem.find({ headOfAccount: "Revenue" })
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
  } else if (tabType == "RevenueMix") {
    if (!code) throw { message: "code is missing for revenue mix." };
    let lineIds = await LineItem.find({
      code: { $in: Array.isArray(code) ? code : [code] },
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
  if (tabType == "TotalRevenue") {
    sortByObj = {
      $sort: {
        sum: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "RevenuePerCapita") {
    sortByObj = {
      $sort: {
        revenuePerCapita: sortBy == "top" ? -1 : 1,
      },
    };
  } else if (tabType == "RevenueMix") {
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
