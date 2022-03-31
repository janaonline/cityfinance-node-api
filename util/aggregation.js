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
            "<100K_count": {
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
            "100K-500K_count": {
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
            "500K-1M_count": {
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
            "1M-4M_count": {
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
            "4M+_count": {
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
            "<100K": {
              amount: "$<100K_amount",
              perCapita: {
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
            leo: "$4M+_count",
            "100K-500K": {
              amount: "$100K-500K_amount",
              perCapita: {
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
            "500K-1M": {
              amount: "$500K-1M_amount",
              perCapita: {
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
            "1M-4M": {
              amount: "$1M-4M_amount",
              perCapita: {
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
            "4M+": {
              amount: "$4M+_amount",
              perCapita: {
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
    }
  }
  return pipeline;
};

exports.stateDashRevenueTabs = async (
  financialYear,
  tabType,
  stateId,
  sortBy = "top",
  lineItem,
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
          sum: {
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
  } else throw { message: "invalid tabType was provided." };
  pipeline.push({
    $sort: {
      sum: sortBy == "top" ? -1 : 1,
    },
  });
  pipeline.push({
    $limit: 10,
  });

  if (tabType == "RevenueMix") {
  }
  console.log(pipeline);
  return pipeline;
};
