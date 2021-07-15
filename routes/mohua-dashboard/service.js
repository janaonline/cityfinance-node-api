const catchAsync = require("../../util/catchAsync");
const Ulb = require('../../models/Ulb');
const UA = require('../../models/UA');
const ObjectId = require("mongoose").Types.ObjectId;


module.exports.getCards = catchAsync(async (req, res) => {

    let user = req.decoded;
    if (user.role != 'STATE' || user.role != 'ULB') {
        let { state_id } = req.query

        let match1 = {
            $match:
            {
                "isMillionPlus": "No"
            }
        }
        let match2 = {
            $match:
            {
                "isMillionPlus": "Yes"
            }
        }

        if (state_id) {
            match1 = {
                $match:
                {
                    "isMillionPlus": "No",
                    "state": ObjectId(state_id)
                }
            }
            match2 = {
                $match:
                {
                    "isMillionPlus": "Yes",
                    "state": ObjectId(state_id)
                }
            }

        }
        let outputData = {
            "submitted_totalUlbs": 0,
            "totalUlbs": 0,

            "submitted_nonMillion": 0,
            "nonMillion": 0,

            "submitted_millionPlusUA": 0,
            "millionPlusUA": 0,

            "submitted_ulbsInMillionPlusUlbs": 0,
            "ulbsInMillionPlusUlbs": 0,

        }

        let basequery = [


            {
                $group:

                {
                    _id: null,
                    ulb: { $addToSet: "$_id" },
                    "totalUlbs": { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "masterforms",
                    localField: "ulb",
                    foreignField: "ulb",
                    as: "masterformData",
                },
            },

            { $unwind: "$masterformData" },

            {
                $group: {
                    _id: {
                        status: "$masterformData.status",
                        isSubmit: "$masterformData.isSubmit",
                        actionTakenByRole: "$masterformData.actionTakenByRole",
                    },
                    totalUlbs: { $addToSet: "$totalUlbs" },
                    count: { $sum: 1 }
                }

            }
        ]
        let BaseQuery = [
            {
                $match:
                {

                    "state": ObjectId(state_id)
                }
            },

            ...basequery

        ]
        let query1 = [
            match1,
            ...basequery
        ]

        let query2 = [
            {
                $group: {
                    _id: "$state",
                    uaCount: { $sum: 1 }
                }
            },

            {
                $group: {
                    _id: null,
                    totalUAs: { $sum: "$uaCount" },
                    state_id: { $addToSet: "$_id" }
                }
            },
            { $unwind: "$state_id" },
            {
                $lookup: {
                    from: "uas",
                    localField: "state_id",
                    foreignField: "state",
                    as: "uas"
                }
            },
            {
                $unwind: "$uas"
            },

            {
                $lookup: {
                    from: "statemasterforms",
                    localField: "state_id",
                    foreignField: "state",
                    as: "masterformData"
                }
            },
            {
                $unwind: "$masterformData"
            },
            {
                $group: {

                    _id: "$state_id",
                    totalUAs: { $addToSet: "$totalUAs" },
                    masterformData: { $addToSet: "$masterformData" },
                    uas: { $addToSet: "$uas" },

                }
            },

            {
                $project: {
                    totalUAs: { $arrayElemAt: ["$totalUAs", 0] },
                    numberOfUas: { $size: "$uas" },
                    isSubmit: { $arrayElemAt: ["$masterformData.isSubmit", 0] },
                    status: { $arrayElemAt: ["$masterformData.status", 0] },
                    actionTakenByRole: { $arrayElemAt: ["$masterformData.actionTakenByRole", 0] },
                }

            },
            {
                $match: {
                    $or: [

                        {
                            $and: [
                                { "isSubmit": true },
                                { "actionTakenByRole": "STATE" },
                                { "status": "PENDING" }]
                        },

                        {
                            $and: [
                                {
                                    $or: [
                                        { "status": "APPROVED" }
                                        , { "status": "PENDING" }]
                                },

                                { "actionTakenByRole": "MoHUA" }
                            ]

                        }
                    ]
                }
            },

            {
                $group: {
                    _id: null,
                    uas_submitted: { $sum: "$numberOfUas" },
                    totalUAs: { $addToSet: "$totalUAs" }
                }
            },
            {
                $project: {
                    "uas_submitted": 1,
                    totalUAs: { $arrayElemAt: ["$totalUAs", 0] }
                }
            }

        ]
        let query3 = [
            match2,
            ...basequery
        ]

        let { output1, output2, output3, output4 } = await new Promise(async (resolve, reject) => {
            let prms1 = new Promise(async (rslv, rjct) => {
                let output = await Ulb.aggregate(state_id ? BaseQuery : basequery);
                rslv(output);
            });
            let prms2 = new Promise(async (rslv, rjct) => {
                let output = await Ulb.aggregate(query1);
                rslv(output);
            });
            let prms3 = new Promise(async (rslv, rjct) => {
                let output = await UA.aggregate(query2);
                rslv(output);
            });
            let prms4 = new Promise(async (rslv, rjct) => {
                let output = await Ulb.aggregate(query3);
                rslv(output);
            });
            Promise.all([prms1, prms2, prms3, prms4]).then(
                (outputs) => {
                    let output1 = outputs[0];
                    let output2 = outputs[1];
                    let output3 = outputs[2];
                    let output4 = outputs[3];
                    if (output1 && output2 && output3 && output4) {
                        resolve({ output1, output2, output3, output4 });
                    } else {
                        reject({ message: "No Data Found" });
                    }
                },
                (e) => {
                    reject(e);
                }
            );
        });



        let submitted_totalUlbs = 0;
        let totalUlbs = 0;
        let submitted_nonMillion = 0;
        let nonMillion = 0;
        let submitted_ulbsInMillionPlusUlbs = 0;
        let ulbsInMillionPlusUlbs = 0;
        let submitted_millionPlusUA = 0;
        let millionPlusUA = 0;
        output1.forEach(el => {
            if (
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
                ||
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'STATE')
                ||
                (el._id.status == 'PENDING' && el._id.isSubmit == true && el._id.actionTakenByRole == 'ULB')
            ) {
                submitted_totalUlbs = submitted_totalUlbs + el.count
                totalUlbs = el.totalUlbs[0]
            }
        })



        output2.forEach(el => {
            if (
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
                ||
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'STATE')
                ||
                (el._id.status == 'PENDING' && el._id.isSubmit == true && el._id.actionTakenByRole == 'ULB')
            ) {
                submitted_nonMillion = submitted_nonMillion + el.count;
                nonMillion = el.totalUlbs[0]
            }
        })
        submitted_millionPlusUA = output3[0].uas_submitted
        millionPlusUA = output3[0].totalUAs
        output4.forEach(el => {
            if (
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
                ||
                ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'STATE')
                ||
                (el._id.status == 'PENDING' && el._id.isSubmit == true && el._id.actionTakenByRole == 'ULB')
            ) {
                submitted_ulbsInMillionPlusUlbs = submitted_ulbsInMillionPlusUlbs + el.count
                ulbsInMillionPlusUlbs = el.totalUlbs[0]
            }
        })


        outputData.submitted_totalUlbs = submitted_totalUlbs;
        outputData.submitted_nonMillion = submitted_nonMillion;
        outputData.submitted_ulbsInMillionPlusUlbs = submitted_ulbsInMillionPlusUlbs
        outputData.totalUlbs = totalUlbs
        outputData.nonMillion = nonMillion
        outputData.ulbsInMillionPlusUlbs = ulbsInMillionPlusUlbs
        outputData.submitted_millionPlusUA = submitted_millionPlusUA
        outputData.millionPlusUA = millionPlusUA
        console.log(outputData)
        res.json({
            data: outputData
        })
    } else {
        return res.status(403).json({
            success: false,
            message: "Not Authorized to Access this API"
        })
    }


})

module.exports.getForm = catchAsync(async (req, res) => {

})

module.exports.getTable = catchAsync(async (req, res) => {

})