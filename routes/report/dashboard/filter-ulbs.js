const UlbLedger = require('../../../models/UlbLedger');
const Ulb = require('../../../models/Ulb');
const moment = require('moment');
const ObjectId = require('mongoose').Types.ObjectId;
const OverallUlb = require('../../../models/OverallUlb');
module.exports = async (req, res, next) => {
    try {

        //let yearWiseUlb = [];
        let years = [];
        if (req.query.years) {
            years = JSON.parse(req.query.years)
        } else {
            years = getBackYears(2, '2017');
        }
        years = years.sort();
        let ulbs = [];
        let condition = {};
        if(req.query.ulb){
            req.query.ulb ? condition["_id"] = ObjectId(req.query.ulb) : null ;
        }else{

            for (let i = 0; i< years.length; i++) {
                let year = years[i];
                let query = { financialYear: year };
                if (i > 0) {
                    query["ulb"] = { $in: ulbs };
                }
                ulbs = await UlbLedger.distinct("ulb", query).exec();
                //yearWiseUlb.push(ulbs)
            }
            //var merged = [].concat.apply([],yearWiseUlb);
            condition = { _id: { $in: ulbs}}
        }

        if(req.query.state && req.query.state.length > 12){
            condition["state"] = ObjectId(req.query.state)
        }
        let rangeQuery = [
            {
                $match: condition
            },
            {
                $match: {population:{$gt: 0}}
            },

            {
                $project: {
                    _id: 1,
                    "range": {
                        $concat: [
                            { $cond: [{ $gte: ["$population", 1000000] }, "> 10 Lakhs", ""] },
                            { $cond: [{ $and: [{ $gte: ["$population", 100000] }, { $lt: ["$population", 1000000] }] }, "1 to 10 Lakhs", ""] },
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
            },
            {
                $project: {
                     rangeNum:0,

                }
            },
        ];

        let ulbPopulationRanges = await Ulb.aggregate(rangeQuery).exec();
        let arr = [];
        let len = 0;
        let d = [];
        for (year of years) {
            let obj = {
                financialYear: year
            };
            let rangeArr = []; let rangeList = [ "> 10 Lakhs", "1 to 10 Lakhs", "< 1 Lakh" ]
            for (let k of rangeList) {
                let range = ulbPopulationRanges.find(f=> f.range == k);
                let o = range ? range : {range:k,ulbs:[]};
                len += o.ulbs.length;
                let condition = {populationCategory : o.range}
                req.query.state ? condition["state"] = mongoose.Types.ObjectId(req.query.state) : null;
                let overAllUlbs = await OverallUlb.countDocuments(condition).exec();
                d.push({condition:condition,totalUlb : overAllUlbs, range: o.range});
                rangeArr.push({ totalUlb : overAllUlbs, range: o.range, ulb: { $in: o.ulbs } });
            }
            obj["data"] = rangeArr;
            arr.push(obj);
        }
        //return res.json(arr);
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
