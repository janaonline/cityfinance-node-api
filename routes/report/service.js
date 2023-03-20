
const LoginHistory = require('../../models/LoginHistory');
const { sendCsv } = require('../CommonActionAPI/service');
const moment = require('moment')
module.exports.loginHistory = async (req, res, next) => {
    try {
        let condition = {};
        if (req.query.from && req.query.to) {
            let start = moment(req.query.from, "YYYY-MM-DD").startOf("day");
            let end = moment(req.query.to, "YYYY-MM-DD").endOf("day");
            condition["loggedInAt"] = {
                $gte: new Date(start),
                $lte: new Date(end),
            };
        }
        if (req.query.type) {
            condition["type"] = req.query.type;
        }
        
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "user.ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    "state": "$state.name",
                    "ulb_code": "$ulb.code",
                    "census_code": "$ulb.censusCode",
                    "ulb_name": "$ulb.name",
                    "login_time": { $dateToString: { format: "%Y-%m-%d %H:%M:%S", date: "$loggedInAt" } }
                }
            }
        ];
        let keyObj = {
            "state": "",
            "ulb_code": "",
            "census_code": "",
            "ulb_name": "",
            "login_time": ""
        };
        let cols = [
            "state",
            "ulb_code",
            "census_code",
            "ulb_name",
            "login_time"
        ];
        let d = await sendCsv("Fiscal Ranking.csv", "LoginHistory", query, res, cols, keyObj);
        return;
    } catch (error) {
        console.log("error", error)
    }
};