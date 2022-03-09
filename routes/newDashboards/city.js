const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const LineItem = require("../../models/LineItem");
const Sate = require("../../models/State");
const ULB = require("../../models/Ulb");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");

const headOfAccountDeficit = ["Expense", "Revenue"];

const indicator = async (req, res) => {
  try {
    let {
      ulb,
      financialYear,
      headOfAccount,
      filterName,
      isPerCapita,
      compareType,
      getQuery,
      stateId,
    } = req.body;
    if (
      !headOfAccount ||
      (!ulb && !stateId) ||
      !financialYear ||
      !filterName ||
      !Array.isArray(financialYear) ||
      !Array.isArray(ulb)
    )
      return Response.BadRequest(
        res,
        null,
        "check ulb as array, financialYear as array, headOfAccount, filterName, stateId or ulb should be there"
      );
    if (stateId) {
      ulb = await Ulb.find({ state: ObjectId(stateId) }, { _id: 1 }).lean();
      ulb = ulb.map((value) => value._id);
    }
    let query = [
      {
        $match: {
          financialYear: { $in: financialYear },
          ulb: { $in: ulb.map((value) => ObjectId(value)) },
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
      { $unwind: "$ulb" },
      {
        $lookup: {
          from: "lineitems",
          pipeline: [
            {
              $match: { $expr: { $eq: ["$headOfAccount", headOfAccount] } },
            },
          ],
          as: "lineitems",
        },
      },
      { $unwind: "$lineitems" },
    ];

    switch (filterName) {
      case "revenue_expenditure":
      case "revenue":
        let group = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
        };
        if (isPerCapita) {
          group.amount = {
            $sum: {
              $cond: [
                { $eq: ["$ulb.population", 0] },
                0,
                { $divide: ["$amount", "$ulb.population"] },
              ],
            },
          };
        }

        query.push(
          {
            $group: group,
          },
          {
            $sort: { "_id.financialYear": 1 },
          }
        );
        break;
      case "expenditure_mix":
      case "revenue_mix":
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "property_tax":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            Object.assign(value["$lookup"].pipeline[0]?.$match?.$expr, {
              $eq: ["$name", "Property Tax"],
            });
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              financialYear: "$financialYear",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
          },
        });
        break;
      case "total_surplus/deficit":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            delete value["$lookup"].pipeline[0]?.$match?.$expr;
            Object.assign(value["$lookup"].pipeline[0]?.$match, {
              $expr: { $in: ["$headOfAccount", headOfAccountDeficit] },
            });
          }
        });
        query.push(
          {
            $group: {
              _id: {
                ulb: "$ulb._id",
                financialYear: "$financialYear",
              },
              ulbName: {
                $first: "$ulb.name",
              },
              amount: {
                $sum: "$amount",
              },
              revenue: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$lineitems.headOfAccount", "Revenue"] },
                    then: "$amount",
                    else: 0,
                  },
                },
              },
              expense: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$lineitems.headOfAccount", "Expense"] },
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
              ulbName: 1,
              amount: { $subtract: ["$revenue", "$expense"] },
            },
          }
        );
        break;
      case "capital_expenditure":
      case "capital_expenditure_per_capita":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            value["$lookup"].pipeline[0] = {
              $match: {
                code: { $in: ["410", "412"] },
              },
            };
          }
        });
        let group2 = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
            lineItemName: "$lineitems.name",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
          code: { $first: "$lineitems.code" },
        };
        if (isPerCapita) {
          group2.amount = {
            $sum: {
              $cond: [
                { $eq: ["$ulb.population", 0] },
                0,
                { $divide: ["$amount", "$ulb.population"] },
              ],
            },
          };
        }
        let group3 = {
          $group: {
            _id: "$_id.financialYear",
            yearData: {
              $push: {
                name: "$_id.lineItemName",
                amount: "$amount",
                ulbName: "$ulbName",
                code: "$code",
              },
            },
          },
        };

        query.push({
          $group: group2,
        });

        query.push(group3, {
          $sort: { _id: 1 },
        });
        break;
      case "total_own_revenue":
      case "own_revenue_per_capita":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            value["$lookup"].pipeline[0] = {
              $match: {
                code: { $in: ["11001", "130", "140", "150", "180", "110"] },
              },
            };
          }
        });
        let groupNew = {
          _id: {
            ulb: "$ulb._id",
            financialYear: "$financialYear",
          },
          amount: { $sum: "$amount" },
          ulbName: { $first: "$ulb.name" },
        };
        if (isPerCapita) {
          groupNew.amount = {
            $sum: {
              $cond: [
                { $eq: ["$ulb.population", 0] },
                0,
                { $divide: ["$amount", "$ulb.population"] },
              ],
            },
          };
        }

        query.push(
          {
            $group: groupNew,
          },
          {
            $sort: { "_id.financialYear": 1 },
          }
        );
        break;
      case "own_revenue_mix":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            value["$lookup"].pipeline[0] = {
              $match: {
                code: { $in: ["11001", "130", "140", "150", "180", "110"] },
              },
            };
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "revenue_expenditure_mix":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            value["$lookup"].pipeline[0] = {
              $match: {
                code: { $in: ["210", "220", "230"] },
              },
            };
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
            code: { $first: "$lineitems.code" },
          },
        });
        break;
      case "revenue_expenditure":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            value["$lookup"].pipeline[0] = {
              $match: {
                code: { $in: ["210", "220", "230"] },
              },
            };
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              financialYear: "$financialYear",
            },
            amount: { $sum: "$amount" },
            ulbName: { $first: "$ulb.name" },
          },
        });
        break;
      default:
        break;
    }

    let newQuery;
    if (compareType) newQuery = await comparator(compareType, query, ulb[0]);

    if (getQuery) return res.json({ query, newQuery });

    let redisKey = JSON.stringify({ query, newQuery });
    let redisData = await Redis.getDataPromise(redisKey);
    let compData, data, returnData;
    if (!redisData) {
      if (newQuery) compData = await UlbLedger.aggregate(newQuery);
      data = await UlbLedger.aggregate(query);
      returnData = { ulbData: data, compData };
      Redis.set(redisKey, JSON.stringify(returnData));
    } else {
      returnData = JSON.parse(redisData);
    }

    if (!returnData.ulbData.length)
      return Response.BadRequest(res, null, "No RecordFound");

    return Response.OK(res, returnData);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const comparator = async (compareFrom, query, ulb) => {
  let newData = JSON.parse(JSON.stringify(query)); //deep copy of prev query
  let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
  switch (compareFrom) {
    case "State Average":
      delete newData[0]?.$match?.ulb;
      if (ulbData)
        newData.splice(2, 0, {
          $match: { "ulb.state": ObjectId(ulbData.state) },
        });
      newData.splice(3, 0, {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      });
      newData = newData.map((value) => {
        if (value["$group"]) {
          delete value["$group"]._id?.ulb;
          Object.assign(value["$group"]._id, { state: "$ulb.state" });
          value["$group"].ulbName = { $first: "$state.name" };
          let old = value["$group"].amount.$sum;
          delete value["$group"].amount.$sum;
          value["$group"].amount.$avg = old;
        }
        return value;
      });
      break;
    case "National Average":
      delete newData[0]?.$match?.ulb;
      newData = newData.map((value) => {
        if (value["$group"]) {
          delete value["$group"]._id?.ulb;
          Object.assign(value["$group"]._id, { state: "$ulb.state" });
          delete value["$group"].ulbName;
          let old = value["$group"].amount.$sum;
          delete value["$group"].amount.$sum;
          value["$group"].amount.$avg = old;
        }
        return value;
      });

      newData.push({
        $group: {
          _id: {
            financialYear: "$_id.financialYear",
          },
          amount: { $avg: "$amount" },
        },
      });

      break;

    case "ULB Type Average":
      delete newData[0]?.$match?.ulb;
      if (ulbData)
        newData.splice(3, 0, {
          $match: { "ulb.ulbType": ObjectId(ulbData.ulbType) },
        });
      newData.splice(4, 0, {
        $lookup: {
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      });
      newData = newData.map((value) => {
        if (value["$group"]) {
          delete value["$group"]._id?.ulb;
          value["$group"]._id.ulbType = "$ulb.ulbType";
          value["$group"].ulbName = { $first: "$ulbType.name" };
          let old = value["$group"].amount.$sum;
          delete value["$group"].amount.$sum;
          value["$group"].amount.$avg = old;
        }
        return value;
      });
      break;

    case "national":
      delete newData[0].$match.ulb;
      break;
  }
  return newData;
};

let globalState;

const aboutCalculation = async (req, res) => {
  try {
    let {
      state,
      ulbType,
      getQuery,
      financialYear,
      ulb,
      compare,
      populationCategory,
    } = req.query;

    if (ulb) {
      let ulbData = await ULB.findOne({ _id: ulb }).lean();
      ulbType = ulbData.ulbType;
      state = ulbData.state;
      globalState = state;
      populationCategory = getPopulationQuery(ulb.population);
      populationCategory?.inState?.$max?.$cond?.if?.$and.push({
        $eq: ["$ulb.state", ObjectId(globalState)],
      });
    }

    let query = [
      {
        $match: {
          financialYear: {
            $in: [financialYear],
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
    if (!compare)
      query.push({
        $match: {
          "ulb.ulbType": ObjectId(ulbType),
          "ulb.state": ObjectId(state),
        },
      });
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
      { $match: { "lineItem.headOfAccount": "Revenue" } }
    );

    if (!compare)
      query.push({
        $group: {
          _id: null,
          amount: { $sum: "$amount" },
          totalPopulation: { $sum: "$ulb.population" },
        },
      });
    else {
      query.push({
        $group: {
          _id: null,
          inStateUlbType: {
            $max: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ["$ulb.state", ObjectId(state)] },
                    { $eq: ["$ulb.ulbType", ObjectId(ulbType)] },
                  ],
                },
                then: "$amount",
                else: 0,
              },
            },
          },
          inIndiaUlbType: {
            $max: {
              $cond: {
                if: { $eq: ["$ulb.ulbType", ObjectId(ulbType)] },
                then: "$amount",
                else: 0,
              },
            },
          },
          ...populationCategory,
        },
      });
    }

    if (getQuery) return Response.OK(res, query);

    let key = JSON.stringify(query) + "aboutIndicator";
    let redisData = await Redis.getDataPromise(key);
    let data;
    if (!redisData) {
      data = await UlbLedger.aggregate(query);
      Redis.set(key, JSON.stringify(data));
    } else data = JSON.parse(redisData);

    if (!compare)
      data = data.map((value) => {
        value.weightedAmount =
          (value.amount + value.totalPopulation) / value.totalPopulation;
        return value;
      });

    return Response.OK(res, data[0]);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

const revenueIndicator = async (req, res) => {
  try {
    const {
      headOfAccount,
      ulb,
      compareType,
      financialYear,
      isPerCapita,
      getQuery,
      filterName,
    } = req.body;
    let lineItemIds = await LineItem.find({ headOfAccount })
      .select({ _id: 1 })
      .lean();
    let matchObj = {};
    let query = [{ $match: matchObj }];
    if (ulb) {
      Object.assign(matchObj, {
        ulb: Array.isArray(ulb)
          ? { $in: ulb.map((value) => ObjectId(value)) }
          : ObjectId(ulb),
      });
    }
    if (lineItemIds.length) {
      Object.assign(matchObj, {
        lineItem: { $in: lineItemIds.map((value) => value._id) },
      });
    }
    if (financialYear) {
      Object.assign(matchObj, {
        financialYear: {
          $in: Array.isArray(financialYear) ? financialYear : [financialYear],
        },
      });
    }

    query.push(
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      { $unwind: "$ulb" }
    );

    switch (filterName) {
      case "total_revenue":
        query.push(
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineItem",
            },
          },
          { $unwind: "$lineItem" }
        );
        query.push(
          {
            $group: {
              _id: {
                ulb: "$ulb._id",
                financialYear: "$financialYear",
              },
              amount: isPerCapita
                ? { $sum: { $divide: ["$amount", "$ulb.population"] } }
                : { $sum: "$amount" },
              ulbName: { $first: "$ulb.name" },
            },
          },
          { $sort: { financialYear: -1 } }
        );
        break;
      case "revenue_mix":
        query.push(
          {
            $lookup: {
              from: "lineitems",
              localField: "lineItem",
              foreignField: "_id",
              as: "lineItem",
            },
          },
          { $unwind: "$lineItem" }
        );
        query.push(
          {
            $group: {
              _id: {
                financialYear: "$financialYear",
                lineItem: "$lineItem.name",
              },
              amount: { $sum: "$amount" },
              ulbName: { $first: "$ulb.name" },
            },
          },
          { $sort: { financialYear: -1 } }
        );
        break;
      default:
        break;
    }
    let compQuery = JSON.parse(JSON.stringify(query));
    if (compareType) {
      switch (compareType) {
        case "State Average":
          compQuery.map((value) => {
            if (value["$match"]) {
              delete value["$match"].ulb;
              let ulbData = await Ulb.findOne({ _id: ulb })
                .select({ state: 1 })
                .lean();
              let ulbIds = await Ulb.find({ state: ulbData.state })
                .select({ _id: 1 })
                .lean();
              Object.assign(value["$match"], {
                ulb: { $in: ulbIds.map((value) => ObjectId(value._id)) },
              });
            }
            if (value["$group"]) {
              value["$group"]._id;
            }
          });
          break;

        default:
          break;
      }
    }
    if (getQuery) return Response.OK(res, query);
    let data = await UlbLedger.aggregate(query);
    return Response.OK(res, data);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

const peerComp = async (req, res) => {
  try {
    const {
      ulb,
      financialYear,
      headOfAccount = "Revenue",
      getQuery,
    } = req.query;
    const {
      ulbType = ulb.ulbType,
      state = ulb.state,
      population = ulb.population,
    } = await ULB.findOne({ _id: ulb }).lean();
    const lineItemData = await LineItem.find({ headOfAccount }).lean();
    let lineItem = lineItemData.map((value) => ObjectId(value._id));

    const inStateUlbType = UlbLedger.aggregate(
      getPeerQuery({
        headOfAccount,
        ulbType,
        state,
        financialYear,
        lineItem,
      })
    );
    const inIndiaUlbType = UlbLedger.aggregate(
      getPeerQuery({
        headOfAccount,
        ulbType,
        financialYear,
        lineItem,
      })
    );
    const inState = UlbLedger.aggregate(
      getPeerQuery({
        headOfAccount,
        population,
        state,
        financialYear,
        lineItem,
      })
    );
    const inIndia = UlbLedger.aggregate(
      getPeerQuery({ headOfAccount, population, financialYear, lineItem })
    );

    const query = [inStateUlbType, inIndiaUlbType, inState, inIndia];

    if (getQuery) return Response.OK(res, query);

    const redisKey = JSON.stringify(query) + "peerComp";
    let redisData = await Redis.getDataPromise(redisKey);
    let data, newData;
    if (!redisData) {
      data = await Promise.all(query);
      newData = {
        inStateUlbType: data[0][0],
        inIndiaUlbType: data[1][0],
        inState: data[2][0],
        inIndia: data[0][0],
      };
      Redis.set(redisKey, JSON.stringify(newData));
    } else {
      newData = JSON.parse(redisData);
    }

    return Response.OK(res, newData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

function getPeerQuery(params) {
  let matchObj = {};
  let query = [
    {
      $match: {
        financialYear: {
          $in: [params.financialYear],
        },
        lineItem: {
          $in: params.lineItem.map((value) => value),
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
      $match: matchObj,
    },
  ];

  if (params.hasOwnProperty("ulbType")) {
    Object.assign(matchObj, { "ulb.ulbType": ObjectId(params.ulbType) });
  }

  if (params.hasOwnProperty("state")) {
    Object.assign(matchObj, { "ulb.state": ObjectId(params.state) });
  }

  if (params.hasOwnProperty("population")) {
    if (params.population < 100000) {
      Object.assign(matchObj, { "ulb.population": { $lt: 100000 } });
    } else if (100000 < params.population < 500000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 100000 } },
          { "ulb.population": { $lt: 100000 } },
        ],
      });
    } else if (500000 < params.population < 1000000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 500000 } },
          { "ulb.population": { $lt: 1000000 } },
        ],
      });
    } else if (1000000 < params.population < 1000000) {
      Object.assign(matchObj, {
        $or: [
          { "ulb.population": { $gt: 1000000 } },
          { "ulb.population": { $lt: 1000000 } },
        ],
      });
    } else {
      Object.assign(matchObj, { "ulb.population": { $gt: 4000000 } });
    }
  }

  query.push(
    { $sort: { amount: -1 } },
    { $limit: 1 },
    {
      $project: {
        ulb: 1,
        amount: 1,
      },
    }
  );
  return query;
}

function getPopulationQuery(population) {
  if (population < 100000) {
    return populationQuery["<100K"];
  } else if (100000 < population < 500000) {
    return populationQuery["100K-500K"];
  } else if (500000 < population < 1000000) {
    return populationQuery["500K-1M"];
  } else if (1000000 < population < 4000000) {
    return populationQuery["1M-4M"];
  } else {
    return populationQuery["4M+"];
  }
}

const populationQuery = {
  ["<100K"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [{ $lt: ["$ulb.population", 100000] }],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: { $lt: ["$ulb.population", 100000] },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["100K-500K"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 100000] },
                  { $lt: ["$ulb.population", 500000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 100000] },
              { $lt: ["$ulb.population", 500000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["500K-1M"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 500000] },
                  { $lt: ["$ulb.population", 1000000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 500000] },
              { $lt: ["$ulb.population", 1000000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["1M-4M"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [
              {
                $or: [
                  { $gt: ["$ulb.population", 1000000] },
                  { $lt: ["$ulb.population", 4000000] },
                ],
              },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: {
            $or: [
              { $gt: ["$ulb.population", 1000000] },
              { $lt: ["$ulb.population", 4000000] },
            ],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
  ["4M+"]: {
    inState: {
      $max: {
        $cond: {
          if: {
            $and: [{ $gt: ["$ulb.population", 400000] }],
          },
          then: "$amount",
          else: 0,
        },
      },
    },
    inIndia: {
      $max: {
        $cond: {
          if: { $gt: ["$ulb.population", 400000] },
          then: "$amount",
          else: 0,
        },
      },
    },
  },
};

module.exports = {
  indicator,
  aboutCalculation,
  peerComp,
  revenueIndicator,
};
