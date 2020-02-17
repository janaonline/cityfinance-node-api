const UlbLedger = require('../../../models/Schema/UlbLedger');
const Ulb = require('../../../models/Schema/Ulb');
const moment = require('moment');
const ObjectId = require('mongoose').Types.ObjectId;
const OverallUlb = require('../../../models/Schema/OverallUlb');
module.exports = async (req, res, next) => {
    try {
        let years = [];
        if (req.query.years) {
            years = JSON.parse(req.query.years)
        } else {
            years = getBackYears(2, '2017');
        }
        years = years.sort();
        let ulbs = [];
        for (let i = 0; i< years.length; i++) {
            let year = years[i];
            let query = { financialYear: year };
            if (i > 0) {
                query["ulb"] = { $in: ulbs };
            }
            ulbs = await UlbLedger.distinct("ulb", query).exec();
        }
        let condition = { _id: { $in: ulbs }};
        if(req.query.state && req.query.state.length > 12){
            condition["state"] = ObjectId(req.query.state)
        }
        let rangeQuery = [
            {
                $match: condition
            },
            {
                $project: {
                    _id: 1,
                    "range": {
                        $concat: [
                            { $cond: [{ $gte: ["$population", 1000000] }, "> 10 Lakhs", ""] },
                            { $cond: [{ $and: [{ $gte: ["$population", 100000] }, { $lt: ["$population", 1000000] }] }, "1 Lakh to 10 Lakhs", ""] },
                            { $cond: [{ $lte: ["$population", 100000] }, "< 1 Lakh", ""] }
                        ]
                    },
                    "rangeNum": {
                        $concat: [
                            { $cond: [{ $gte: ["$population", 1000000] }, "1", ""] },
                            { $cond: [{ $and: [{ $gte: ["$population", 100000] }, { $lt: ["$population", 1000000] }] }, "2", ""] },
                            { $cond: [{ $lte: ["$population", 100000] }, "3",""] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$range",
                    rangeNum:{$first:"$rangeNum"},
                    ulbs: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    _id: 0,
                    range: "$_id",
                    rangeNum:{$toInt:"$rangeNum"},
                    ulbs: 1
                }
            },
            {
                $sort:{rangeNum:1}
            }
        ];
        let ulbPopulationRanges = await Ulb.aggregate(rangeQuery).exec();
        let arr = [];
        let len = 0;
        for (year of years) {
            let obj = {
                financialYear: year
            };
            let rangeArr = [];
            for (o of ulbPopulationRanges) {
                len += o.ulbs.length;
                let overAllUlbs = await OverallUlb.countDocuments({ populationCategory : o.range }).exec();
                rangeArr.push({ totalUlb : overAllUlbs, range: o.range, ulb: { $in: o.ulbs } });
            }
            obj["data"] = rangeArr;
            arr.push(obj);
        }
        if(len){
            req.body["queryArr"] = arr;
            next();
        }else {
            return res.status(200).json({
                timestamp: moment().unix(),
                success:true,
                message:"Common ulb ledger not available.",
                years: years
            })
        }
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
const getBackYears = (num=  3,before = '') =>{
    let yr = before ? `${before}-01-01` : moment().format("YYYY-MM-DD");
    let years = [];
    for(let i=0; i<num; i++){
        let defaultYear = moment(yr).subtract('year', i);
        let currentYear = moment(defaultYear).format("YY").toString();
        let previousYear = moment(defaultYear).subtract('year', 1).format('YYYY').toString();
        years.push(`${previousYear}-${currentYear}`);
    }
    return years;
}
