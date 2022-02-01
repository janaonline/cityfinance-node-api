const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");

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

module.exports = {
  scatterMap,
};
