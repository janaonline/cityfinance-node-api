const LedgerLog = require('../../../models/LedgerLog');
const Ulb = require('../../../models/Ulb');
const BondIssuerItem = require('../../../models/BondIssuerItem');
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../../service/redis");
module.exports = (req, res) => {

  let query = {};

  if (req.query.state) {
    query = { "state": ObjectId(req.query.state) }
  }

  const stateId = req.query.state;
  let matchCondition = { 'ulbData.isActive': true };

  if (stateId) matchCondition = { ...matchCondition, 'ulbData.state': ObjectId(stateId) }

  let totalULB = new Promise(async (rslv, rjct) => {

    if (req.query.state) {
      let state = req.query.state;
      let query = { "state": ObjectId(state), isActive: true }
      try {
        let count = await Ulb.count(query).exec();
        rslv(count)
      }
      catch (err) {
        rjct(err);
      }
    }
    else {
      try {
        let count = await Ulb.count({ "isActive": true }).exec();
        rslv(count)
      }
      catch (err) {
        rjct(err);
      }

    }

  })

  let munciapalBond = new Promise(async (rslv, rjct) => {
    try {
      let count = await BondIssuerItem.count(query).exec();
      rslv(count)
    }
    catch (err) {
      rjct(err);
    }
  })

  let coveredUlbCount = new Promise(async (rslv, rjct) => {
    try {
      const distinctUlbCount = await LedgerLog.aggregate([
        {
          $group: {
            _id: "$ulb_id",
            isStandardizable: { $first: "$isStandardizable" },
            ulbId: { $first: "$ulb_id" }
          }
        },
        { $match: { isStandardizable: { $ne: "No" } } },
        {
          $lookup: {
            from: "ulbs",
            let: { ulbId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$_id", "$$ulbId"] }
                }
              },
              { $project: { state: 1, isActive: 1 } }
            ],
            as: "ulbData"
          }
        },
        { $match: matchCondition },
        { $count: 'count' }
      ]);

      distinctUlbCount[0]['count'] > 0 ? rslv(distinctUlbCount[0]['count']) : rslv(0);
    }
    catch (err) { rjct(err) }
  })

  let ulbDataCount = new Promise(async (rslv, rjct) => {
    try {
      const yearWiseCount = await LedgerLog.aggregate([
        {
          $project: {
            ulb_id: 1,
            isStandardizable: 1,
            year: 1
          }
        },
        { $match: { isStandardizable: { $ne: 'No' } } },
        {
          $lookup: {
            from: 'ulbs',
            let: { ulbId: '$ulb_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$ulbId'] } } },
              { $project: { state: 1, isActive: 1 } }
            ],
            as: 'ulbData'
          }
        },
        { $match: matchCondition },
        {
          $group: {
            _id: '$year',
            ulbs: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        {
          $project: {
            year: '$_id',
            ulbs: 1,
            _id: 0
          }
        }
      ]);

      yearWiseCount.length > 0 ? rslv(yearWiseCount) : rslv(0);
    }
    catch (err) { rjct(err) }
  });

  Promise.all([totalULB, munciapalBond, coveredUlbCount, ulbDataCount]).then((values) => {
    const financialStatements = values[3].reduce((acc, curr) => acc += curr['ulbs'], 0) || 0;

    let data = {
      totalULB: values[0],
      financialStatements,
      totalMunicipalBonds: values[1],
      coveredUlbCount: values[2],
      ulbDataCount: values[3]
    };
    Redis.set(req.redisKey, JSON.stringify(data), 60 * 60 * 24 * 30) // 30 days 

    return res.status(200).json({ success: true, message: "Data fetched", data });

  }, (rejectError) => {

    console.log(rejectError);
    return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Rejected Error", err: rejectError });

  }).catch((caughtError) => {

    let coveredUlbCount = new Promise(async (rslv, rjct) => {
        try {
            if (req.query.state) {
                let query = [
                    { $group: { "_id": "$ulb" } },
                    {
                        "$lookup": {
                            "from": "ulbs",
                            "localField": "_id",
                            "foreignField": "_id",
                            "as": "ulb"
                        }
                    },
                    { $match: { "ulb.state": ObjectId(req.query.state) } },
                    { $count: "count" }
                ]
                count = await UlbLedger.aggregate(query).exec();
                count.length > 0 ? rslv(count[0].count) : rslv(0);
            }
            else {
                let query = [{ $group: { "_id": "$ulb" } }, { $count: "count" }]
                let count = await UlbLedger.aggregate(query).exec();
                count.length > 0 ? rslv(count[0].count) : rslv(0);
            }
        }
        catch (err) {
            rjct(err)
        }
    })

    let ulbDataCount = new Promise(async (rslv, rjct) => {
        try {
            let query = [];
           if (req.query.state) {
             query = [
               {
                 $group: {
                   _id: "$financialYear",
                   ulbs: {
                     $addToSet: "$ulb",
                   },
                 },
               },
               { $unwind: "$ulbs" },

               {
                 $lookup: {
                   from: "ulbs",
                   foreignField: "_id",
                   localField: "ulbs",
                   as: "ulbData",
                 },
               },
               {
                 $match: {
                   "ulbData.state": ObjectId(req.query.state),
                 },
               },
               {
                 $group: {
                   _id: "$_id",
                   ulbs: { $addToSet: "$ulbData._id" },
                 },
               },
               {
                 $project: {
                   _id: 0,
                   year: "$_id",
                   ulbs: { $size: "$ulbs" },
                 },
               },
               {
                 $sort: { year: -1 },
               },
             ];
           } else {
             query = [
               {
                 $group: {
                   _id: "$financialYear",
                   ulbs: { $addToSet: "$ulb" },
                 },
               },
               {
                 $project: {
                   _id: 0,
                   year: "$_id",
                   ulbs: { $size: "$ulbs" },
                 },
               },
               {
                 $sort: { year: -1 },
               },
             ];
           }
            let count = await UlbLedger.aggregate(query).exec();
            count.length > 0 ? rslv(count) : rslv(0);
            
        }
        catch (err) {
            rjct(err)
        }
    })

    Promise.all([totalULB, munciapalBond, financialStatement, coveredUlbCount, ulbDataCount]).then((values) => {

        let data = {
            totalULB: values[0],
            financialStatements: values[2].length > 0 ? values[2][0].count : 0,
            totalMunicipalBonds: values[1],
            coveredUlbCount: values[3],
            ulbDataCount: values[4]
        };
        // Redis.set(req.redisKey,JSON.stringify(data), 60 * 60 * 24 * 30) // 30 days 
        
        return res.status(200).json({ success: true, message: "Data fetched", data });

    }, (rejectError) => {

        console.log(rejectError);
        return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Rejected Error", err: rejectError });

    }).catch((caughtError) => {

        console.log("final caughtError", caughtError);
        return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Caught Error", err: caughtError });
    })
}
