const UlbLedger = require('../../../models/UlbLedger');
const Ulb = require('../../../models/Ulb');
const Redis = require('../../../service/redis');
module.exports = async (req, res, next) => {
  try {
    let query;
    let output = [];
    for (let q of req.body.queryArr) {
      for (let range of q.data) {
        let r = range.range;
        query = [
          { $match: { financialYear: q.financialYear, ulb: range.ulb } },
          { $lookup: { from: "lineitems", as: "lineitems", foreignField: "_id", localField: "lineItem" } },
          { $unwind: "$lineitems" },
          {
            $project: {
              "range": r,
              "financialYear": 1,
              "ulb": 1,
              "amount": 1,
              "code": "$lineitems.code"
            }
          },
          {
            $group: {
              _id: { ulb: "$ulb", financialYear: "$financialYear", range: "$range" },
              "revenue": { $sum: "$amount" }
            }
          },
          {
            $group: {
              _id: "$_id.financialYear",
              maxRevenue: { $max: "$revenue" },
              minRevenue: { $min: "$revenue" },
              totalRevenue: { $sum: "$revenue" },
              range: { $addToSet: "$_id.range" }
            }
          },
          { $unwind: "$range" }
        ]
        let data = await UlbLedger.aggregate(query);
        output.push(data[0]);
      }
    }
    Redis.set(req.redisKey,JSON.stringify(output))
    res.send(output);
  } catch (error) {
    console.log(error);
  }

}