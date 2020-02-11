const UlbLedger = require('../../../models/Schema/UlbLedger');
const Ulb = require('../../../models/Schema/Ulb');
const moment = require('moment');
module.exports = async (req, res, next) => {
  try {
    let defaultYear = moment().subtract('year', 3);
    let years = [];
    if (req.query.years) {
      years = JSON.parse(req.query.years)
    } else {
      let currentYear = moment(defaultYear).format("YY").toString();
      let previousYear = moment(defaultYear).subtract('year', 1).format('YYYY').toString();
      years = [`${previousYear}-${currentYear}`];
    }
    let ulbs = [];
    for (year of years) {
      let query = { financialYear: year };
      if (ulbs.length) {
        query["ulb"] = { $in: ulbs };
      }
      ulbs = await UlbLedger.distinct("ulb", query).exec();
    }
    let rangeQuery = [
      {
        $match: { _id: { $in: ulbs } }
      },
      {
        $project: {
          _id: 1,
          "range": {
            $concat: [
              { $cond: [{ $gte: ["$population", 1000000] }, "> 1 Mn", ""] },
              { $cond: [{ $and: [{ $gte: ["$population", 100000] }, { $lt: ["$population", 1000000] }] }, "100K to 1 Mn", ""] },
              { $cond: [{ $lte: ["$population", 100000] }, "< 1 100k", ""] }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$range",
          ulbs: { $addToSet: "$_id" }
        }
      },
      {
        $project: {
          _id: 0,
          range: "$_id",
          ulbs: 1
        }
      }
    ];
    let ulbPopulationRanges = await Ulb.aggregate(rangeQuery).exec();
    let arr = [];
    for (year of years) {
      let obj = {
        financialYear: year
      };
      let rangeArr = [];
      for (o of ulbPopulationRanges) {
        rangeArr.push({ range: o.range, ulb: { $in: o.ulbs } });
      }
      obj["data"] = rangeArr;
      arr.push(obj);
    }
    req.body["queryArr"] = arr;
    next();
    // return res.status(200).json({ data: req.body, defaultYear: defaultYear });
  } catch (e) {
    console.log("Exception:", e);
    return res.status(400).json({
      timestamp: moment().unix(),
      success: false,
      message: "Caught Exception!",
      errorMessage: e.message,
      query: req.query.years
    });
  }
}
