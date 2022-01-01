const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;

const headOfAccountDeficit = ["Expense", "Revenue"];

const indicator = async (req, res) => {
  try {
    const {
      ulb,
      financialYear,
      headOfAccount,
      filterName,
      isPerCapita,
      compareType,
      getQuery,
    } = req.body;
    if (
      !headOfAccount ||
      !ulb ||
      !financialYear ||
      !filterName
      // ||
      // !Array.isArray(financialYear) ||
      // !Array.isArray(ulb)
    )
      return Response.BadRequest(
        res,
        null,
        "check ulb, financialYear, headOfAccount, filterName"
      );

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
        query.push({
          $group: {
            _id: "",
            amount: { $sum: "$amount" },
            population: { $sum: "$ulb.population" },
          },
        });
        if (isPerCapita == "true") {
          query.push({
            $project: {
              _id: 1,
              amount: { $divide: ["$amount", "$population"] },
            },
          });
        }
        break;
      case "revenue_expenditure_mix":
      case "revenue_mix":
        query.push({
          $group: {
            _id: {
              lineItem: "$lineitems.name",
            },
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
            _id: "",
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
              headOfAccount: "$lineitems.headOfAccount",
            },
            amount: { $sum: "$amount" },
          },
        });
      default:
        break;
    }

    let newQuery = [];
    if (compareType) newQuery = await comparator(compareType, query, ulb[0]);

    if (getQuery) return res.json({ query, newQuery });

    let compData;
    if (newQuery) compData = await UlbLedger.aggregate(newQuery);

    let data = await UlbLedger.aggregate(query);
    if (!data.length) return Response.BadRequest(res, null, "No RecordFound");

    if (compData) return Response.OK(res, { ulbData: data, compData });
    else return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, null, error.message);
  }
};

const comparator = async (compareFrom, query, ulb) => {
  let newData = JSON.parse(JSON.stringify(query)); //deep copy of prev query
  let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
  switch (compareFrom) {
    case "state":
      newData.splice(0, 1);
      if (ulbData)
        newData.splice(2, 0, {
          $match: { "ulb.state": ObjectId(ulbData.state) },
        });
      newData = newData.map((value) => {
        if (value["$group"]) {
          if (typeof value["$group"]._id === "object") {
            Object.assign(value["$group"]._id, { state: "$ulb.state" });
          } else {
            value["$group"]._id = {
              state: "$ulb.state",
            };
          }

          Object.assign(value["$group"], {
            ulbInState: { $addToSet: "$ulb._id" },
          });
        }
        return value;
      });
      break;
    case "ulb":
      newData = newData.map((value) => {
        if (value["$group"]) {
          if (typeof value["$group"]._id === "object") {
            Object.assign(value["$group"]._id, { ulb: "$ulb._id" });
          } else {
            value["$group"]._id = {
              ulb: "$ulb._id",
            };
          }
        }
        return value;
      });
      break;

    case "ulbType":
      newData = newData.map((value) => {
        if (value["$group"]) {
          if (typeof value["$group"]._id === "object") {
            Object.assign(value["$group"]._id, { ulb: "$ulb.ulbType" });
          } else {
            value["$group"]._id = {
              ulb: "$ulb.ulbType",
            };
          }
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

// db.getCollection("ulbledgers").aggregate([
//   {
//     $lookup: {
//       from: "ulbs",
//       localField: "ulb",
//       foreignField: "_id",
//       as: "ulb",
//     },
//   },
//   { $unwind: "$ulb" },
//   {
//     $group: {
//       _id: "$ulb.state",
//       ulb: { $addToSet: "$ulb.name" },
//       amount: { $sum: "$amount" },
//     },
//   },
//   {
//     $project: {
//       amount: 1,
//       size: { $size: "$ulb" },
//       totalAmount: { $divide: ["$amount", { $size: "$ulb" }] },
//     },
//   },
//   {
//     $group: {
//       _id: "",
//       amount: { $sum: "$amount" },
//       ulbsize: { $sum: "$size" },
//     },
//   },
// ]);
