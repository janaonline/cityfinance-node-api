const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
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

        query.push({
          $group: group,
        });
        break;
      case "revenue_expenditure_mix":
      case "revenue_mix":
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              financialYear: "$financialYear",
              lineItem: "$lineitems.name",
            },
            ulbName: { $first: "$ulb.name" },
            name: { $first: "$lineitems.name" },
            amount: { $sum: "$amount" },
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
      case "deficit":
        query.map((value) => {
          if (value["$lookup"]?.from === "lineitems") {
            delete value["$lookup"].pipeline[0]?.$match?.$expr;
            Object.assign(value["$lookup"].pipeline[0]?.$match, {
              $expr: { $in: ["$headOfAccount", headOfAccountDeficit] },
            });
          }
        });
        query.push({
          $group: {
            _id: {
              ulb: "$ulb._id",
              financialYear: "$financialYear",
              headOfAccount: "$lineitems.headOfAccount",
            },
            ulbName: { $first: "$ulb.name" },
            amount: { $sum: "$amount" },
          },
        });
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

module.exports = {
  indicator,
};
