const UlbLedger = require('../../../models/UlbLedger');
const OverallUlb = require('../../../models/OverallUlb');
const Ulb = require('../../../models/Ulb');
const BondIssuerItem = require('../../../models/BondIssuerItem');
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../../service/redis");
const util = require('util')
module.exports = (req, res) => {

    let query = {};

    if (req.query.state) {
        query = { "state": ObjectId(req.query.state) }
    }

    let totalULB = new Promise(async (rslv, rjct) => {

        if (req.query.state) {
            let state = req.query.state;
            let query = { "state": ObjectId(state),isActive:true }
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

    let financialStatement = new Promise(async (rslv, rjct) => {

        let query = [
            { $group: { "_id": { "financialYear": "$financialYear", "ulb": "$ulb" } } },
            { $count: "count" }
        ];
        if (req.query.state) {

            query = [
                { $group: { "_id": { "financialYear": "$financialYear", "ulb": "$ulb" } } },
                {
                    "$lookup": {
                        "from": "ulbs",
                        "localField": "_id.ulb",
                        "foreignField": "_id",
                        "as": "ulb"
                    }
                },
                { $match: { "ulb.state": ObjectId(req.query.state) } },
                { $count: "count" }
            ]

        }
        try {
            console.log(util.inspect(query, {showHidden: false, depth: null}))
            let count = await UlbLedger.aggregate(query).exec();
            rslv(count)
        }
        catch (err) {
            rjct(err);
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
        //Redis.set(req.redisKey,JSON.stringify(data))
        return res.status(200).json({ success: true, message: "Data fetched", data: data });

    }, (rejectError) => {

        console.log(rejectError);
        return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Rejected Error", err: rejectError });

    }).catch((caughtError) => {

        console.log("final caughtError", caughtError);
        return res.status(400).json({ timestamp: moment().unix(), success: false, message: "Caught Error", err: caughtError });
    })
}
