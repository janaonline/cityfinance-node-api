const mongoose = require("mongoose");
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
