const catchAsync = require("../../util/catchAsync");
const Ulb = require('../../models/Ulb');
const UA = require('../../models/UA');
const ObjectId = require("mongoose").Types.ObjectId;
const MasterFormData = require('../../models/MasterForm')
const State = require('../../models/State')
const util = require('util')
module.exports.getCards = catchAsync(async (req, res) => {
    try {
        let user = req.decoded;
        if (user.role != 'STATE' || user.role != 'ULB') {
            let { state_id } = req.query
            let { design_year } = req.query

            let query_totalULBs = [
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                {
                    $unwind: "$state"
                },
                {
                    $match: {
                        "state.accessToXVFC": true
                    }
                },


                {

                    $match: {
                        $or: [{ censusCode: { $exists: true, $ne: '', $ne: null } }, { sbCode: { $exists: true, $ne: '', $ne: null } }]
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "ulb",
                        as: "user"
                    }
                },
                {
                    $unwind: "$user"
                }
            ]
            let query_totalApproved = [

                {
                    $match: {
                        design_year: ObjectId(design_year)
                    }
                },
                {
                    $match: {
                        $or: [
                            {
                                $and: [
                                    { status: "APPROVED" },
                                    { actionTakenByRole: "STATE" }
                                ]
                            },
                            {
                                $and: [
                                    { status: "PENDING" },
                                    { actionTakenByRole: "MoHUA" }
                                ]
                            }
                        ]

                    }
                },

                {
                    $lookup: {
                        from: "ulbs",
                        localField: "ulb",
                        foreignField: "_id",
                        as: "ulb"
                    }
                },
                {
                    $unwind: "$ulb",
                },


            ]
            let query_nonMillionTotal = [...query_totalULBs, {
                $match: {
                    isMillionPlus: "No"
                }
            }]
            let query_nonMillionApproved = [...query_totalApproved, {
                $match: {
                    "ulb.isMillionPlus": "No"
                }
            }]
            let query_ulbsInUA = [...query_totalULBs, {
                $match: {
                    isUA: "Yes"
                }

            }]
            let query_ulbsInUAApproved = [...query_totalApproved, {
                $match: {
                    "ulb.isUA": "Yes"
                }
            }]
            let query_fourthCard = [
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                {
                    $unwind: "$state"
                },
                {
                    $match: {
                        "state.accessToXVFC": true
                    }
                },


                {

                    $match: {
                        $or: [{ censusCode: { $exists: true, $ne: '', $ne: null } }, { sbCode: { $exists: true, $ne: '', $ne: null } }]
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "ulb",
                        as: "user"
                    }
                },
                {
                    $unwind: "$user"
                },
                {
                    $match: {
                        isUA: "Yes"
                    }
                },
                {
                    $group: {
                        _id: "$UA",
                        ulbs: { $addToSet: "$_id" },

                    }
                },
                {
                    $lookup: {
                        from: "masterforms",
                        localField: "ulbs",
                        foreignField: "ulb",
                        as: "masterform"
                    }
                },
                {
                    $unwind: {
                        path: "$masterform",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        $or: [{ "masterform.design_year": ObjectId(design_year) }, { masterform: { $exists: false } }]

                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        masterform: { $addToSet: "$masterform" },
                        ulbs: { $first: "$ulbs" }
                    }
                }
            ]

            if (state_id) {
                query_fourthCard.unshift({
                    $match: {
                        state: ObjectId(state_id)
                    }
                })
                query_totalULBs = [...query_totalULBs, {
                    $match: {
                        "state._id": ObjectId(state_id)
                    }
                }];
                query_nonMillionTotal = [...query_nonMillionTotal, {
                    $match: {
                        "state._id": ObjectId(state_id)
                    }
                }];
                query_ulbsInUA = [...query_ulbsInUA, {
                    $match: {
                        "state._id": ObjectId(state_id)
                    }
                }];
                query_totalApproved = [...query_totalApproved, {
                    $match: {
                        "ulb.state": ObjectId(state_id)
                    }
                }]
                query_nonMillionApproved = [...query_nonMillionApproved, {
                    $match: {
                        "ulb.state": ObjectId(state_id)
                    }
                }]
                query_ulbsInUAApproved = [...query_ulbsInUAApproved, {
                    $match: {
                        "ulb.state": ObjectId(state_id)
                    }
                }]

            }

            query_totalULBs.push({
                $count: "totalULBs"
            })
            query_totalApproved.push({
                $count: "totalULBsApproved"
            })
            query_nonMillionTotal.push({
                $count: "totalNonMillionULBs"
            })
            query_nonMillionApproved.push({
                $count: "totalNonMillionULBsApproved"
            })
            query_ulbsInUA.push({
                $count: "totalULBsInUA"
            })
            query_ulbsInUAApproved.push({
                $count: "totalULBsInUAApproved"
            })

            let { output1, output2, output3, output4, output5, output6, output7 } = await new Promise(async (resolve, reject) => {
                let prms1 = new Promise(async (rslv, rjct) => {
                    // console.log(util.inspect(query_totalULBs, { showHidden: false, depth: null }))
                    let output = await Ulb.aggregate(query_totalULBs);
                    rslv(output);
                });
                let prms2 = new Promise(async (rslv, rjct) => {
                    // console.log(util.inspect(query_totalApproved, { showHidden: false, depth: null }))
                    let output = await MasterFormData.aggregate(query_totalApproved);
                    rslv(output);
                });
                let prms3 = new Promise(async (rslv, rjct) => {
                    console.log(util.inspect(query_nonMillionTotal, { showHidden: false, depth: null }))
                    let output = await Ulb.aggregate(query_nonMillionTotal);
                    rslv(output);
                });
                let prms4 = new Promise(async (rslv, rjct) => {
                    let output = await MasterFormData.aggregate(query_nonMillionApproved);
                    rslv(output);
                });
                let prms5 = new Promise(async (rslv, rjct) => {
                    let output = await Ulb.aggregate(query_ulbsInUA);
                    rslv(output);
                });
                let prms6 = new Promise(async (rslv, rjct) => {
                    let output = await MasterFormData.aggregate(query_ulbsInUAApproved);
                    rslv(output);
                });
                let prms7 = new Promise(async (rslv, rjct) => {
                    let output = await Ulb.aggregate(query_fourthCard);
                    rslv(output);
                });
                Promise.all([prms1, prms2, prms3, prms4, prms5, prms6, prms7]).then(
                    (outputs) => {
                        let output1 = outputs[0];
                        let output2 = outputs[1];
                        let output3 = outputs[2];
                        let output4 = outputs[3];
                        let output5 = outputs[4];
                        let output6 = outputs[5];
                        let output7 = outputs[6];

                        if (output1 && output2 && output3 && output4 && output5 && output6 && output7) {
                            resolve({ output1, output2, output3, output4, output5, output6, output7 });
                        } else {
                            reject({ message: "No Data Found" });
                        }
                    },
                    (e) => {
                        reject(e);
                    }
                );
            });


            console.log(output1, output2, output3, output4, output5, output6)
            // let match1 = {
            //     $match:
            //     {
            //         "isMillionPlus": "No"
            //     }
            // }
            // let match3 = {
            //     $match:
            //     {
            //         "isUA": "Yes"
            //     }
            // }
            // let match2 = {
            //     $match:
            //     {
            //         "isMillionPlus": "Yes"
            //     }
            // }

            // if (state_id) {
            //     match1 = {
            //         $match:
            //         {
            //             "isMillionPlus": "No",
            //             "state": ObjectId(state_id)
            //         }
            //     }
            //     match2 = {
            //         $match:
            //         {
            //             "isMillionPlus": "Yes",
            //             "state": ObjectId(state_id)
            //         }
            //     }
            //     match3 = {
            //         $match:
            //         {
            //             "isUA": "Yes",
            //             "state": ObjectId(state_id)
            //         }
            //     }
            // }
            let output7_numerator = 0;
            output7.forEach(el => {
                let totalULBsInUA = el['ulbs'].length;
                let totalMasterFormsInUA = el['masterform'].length
                if (totalULBsInUA == totalMasterFormsInUA && totalULBsInUA != 0) {
                    let counter = 0;
                    el['masterform'].forEach((el2) => {
                        if ((el2['status'] == 'APPROVED' && el2['actionTakenByRole'] == 'STATE') ||
                            (el2['status'] == 'PENDING' && el2['actionTakenByRole'] == 'MoHUA')) {
                            counter++;
                        }
                    })
                    if (counter == totalMasterFormsInUA) {
                        output7_numerator++;
                        console.log('Hii', el['_id'])
                    }
                }
            })
            let outputData = {
                "submitted_totalUlbs": output2.length > 0 ? output2[0]?.totalULBsApproved : 0,
                "totalUlbs": output1.length > 0 ? output1[0]?.totalULBs : 0,

                "submitted_nonMillion": output4.length > 0 ? output4[0]?.totalNonMillionULBsApproved : 0,
                "nonMillion": output3.length > 0 ? output3[0]?.totalNonMillionULBs : 0,

                "submitted_millionPlusUA": output7_numerator ? output7_numerator : 0,
                "millionPlusUA": output7.length,

                "submitted_ulbsInMillionPlusUlbs": output6.length > 0 ? output6[0]?.totalULBsInUAApproved : 0,
                "ulbsInMillionPlusUlbs": output5.length > 0 ? output5[0]?.totalULBsInUA : 0,
            }




            // let basequery = [
            //     {
            //         $lookup: {
            //             from: "states",
            //             localField: "state",
            //             foreignField: "_id",
            //             as: "state"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$state"
            //         }
            //     },

            //     {
            //         $match: {
            //             "state.accessToXVFC": true
            //         }
            //     },
            //     // {
            //     //     $match: {

            //     //         '$or': [
            //     //             { censusCode: { '$exists': true, '$ne': '' } },
            //     //             { sbCode: { '$exists': true, '$ne': '' } }
            //     //         ]

            //     //     }

            //     // },
            //     {
            //         $lookup: {
            //             from: "users",
            //             localField: "_id",
            //             foreignField: "ulb",
            //             as: "user"
            //         }

            //     },
            //     {
            //         $unwind: {
            //             path: "$user"
            //         }
            //     },

            //     {
            //         $group:

            //         {
            //             _id: null,
            //             ulb: { $addToSet: "$_id" },
            //             "totalUlbs": { $sum: 1 }
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "masterforms",
            //             localField: "ulb",
            //             foreignField: "ulb",
            //             as: "masterformData",
            //         },
            //     },

            //     {
            //         '$unwind': {
            //             path: '$masterformData',
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $match: {

            //             $or: [{ 'masterformData.design_year': ObjectId(design_year) },
            //             { masterformData: { $exists: false } }]
            //         }

            //     },
            //     {
            //         $group: {
            //             _id: {
            //                 status: "$masterformData.status",
            //                 isSubmit: "$masterformData.isSubmit",
            //                 actionTakenByRole: "$masterformData.actionTakenByRole",
            //             },
            //             totalUlbs: { $addToSet: "$totalUlbs" },
            //             count: { $sum: 1 }
            //         }

            //     }
            // ]
            // let BaseQuery = [
            //     {
            //         $match:
            //         {

            //             "state": ObjectId(state_id)
            //         }
            //     },

            //     ...basequery

            // ]
            // let query1 = [
            //     match1,
            //     ...basequery
            // ]

            // let query2 = [
            //     {
            //         $group: {
            //             _id: "$state",
            //             uaCount: { $sum: 1 }
            //         }
            //     },

            //     {
            //         $group: {
            //             _id: null,
            //             totalUAs: { $sum: "$uaCount" },
            //             state_id: { $addToSet: "$_id" }
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$state_id"
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "uas",
            //             localField: "state_id",
            //             foreignField: "state",
            //             as: "uas"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$uas"
            //         }
            //     },

            //     {
            //         $lookup: {
            //             from: "statemasterforms",
            //             localField: "state_id",
            //             foreignField: "state",
            //             as: "masterformData"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$masterformData",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $group: {

            //             _id: "$state_id",
            //             totalUAs: { $addToSet: "$totalUAs" },
            //             masterformData: { $addToSet: "$masterformData" },
            //             uas: { $addToSet: "$uas" },

            //         }
            //     },

            //     {
            //         $project: {
            //             totalUAs: { $arrayElemAt: ["$totalUAs", 0] },
            //             numberOfUas: { $size: "$uas" },
            //             isSubmit: { $arrayElemAt: ["$masterformData.isSubmit", 0] },
            //             status: { $arrayElemAt: ["$masterformData.status", 0] },
            //             actionTakenByRole: { $arrayElemAt: ["$masterformData.actionTakenByRole", 0] },
            //         }

            //     },
            //     // {
            //     //     $match: {
            //     //         $or: [

            //     //             {
            //     //                 $and: [
            //     //                     { "isSubmit": true },
            //     //                     { "actionTakenByRole": "STATE" },
            //     //                     { "status": "PENDING" }]
            //     //             },

            //     //             {
            //     //                 $and: [
            //     //                     {
            //     //                         $or: [
            //     //                             { "status": "APPROVED" }
            //     //                             , { "status": "PENDING" }]
            //     //                     },

            //     //                     { "actionTakenByRole": "MoHUA" }
            //     //                 ]

            //     //             }
            //     //         ]
            //     //     }
            //     // },

            //     // {
            //     //     $group: {
            //     //         _id: null,
            //     //         uas_submitted: { $sum: "$numberOfUas" },
            //     //         totalUAs: { $addToSet: "$totalUAs" }
            //     //     }
            //     // },
            //     // {
            //     //     $project: {
            //     //         "uas_submitted": 1,
            //     //         totalUAs: { $arrayElemAt: ["$totalUAs", 0] }
            //     //     }
            //     // }

            // ]
            // let query2_totalUAs = [
            //     {
            //         $match: {
            //             state: ObjectId(state_id)
            //         }
            //     },
            //     {
            //         $group: {
            //             _id: "$state",
            //             totalUAs: { $sum: 1 }
            //         }
            //     }
            // ]
            // let query2_stateVersion = [
            //     {
            //         $match: {
            //             _id: ObjectId(state_id)
            //         }
            //     },
            //     {
            //         $lookup:
            //         {
            //             from: "statemasterforms",
            //             localField: "_id",
            //             foreignField: "state",
            //             as: "masterformData"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$masterformData"
            //         }
            //     },

            //     {
            //         $match: {
            //             $or: [
            //                 {
            //                     $and: [
            //                         { "masterformData.status": "PENDING" },
            //                         { "masterformData.actionTakenByRole": "STATE" },
            //                         { "masterformData.isSubmit": true }]
            //                 },
            //                 {
            //                     $and: [{ "masterformData.actionTakenByRole": "MoHUA" },
            //                     {
            //                         $or: [{ "masterformData.status": "APPROVED" },
            //                         { "masterformData.status": "PENDING" }]
            //                     }]
            //                 }
            //             ]

            //         }
            //     }
            // ]
            // let query3 = [
            //     match3,
            //     ...basequery
            // ]

            // let { output1, output2, output3, output4 } = await new Promise(async (resolve, reject) => {
            //     let prms1 = new Promise(async (rslv, rjct) => {
            //         console.log(util.inspect(basequery, { showHidden: false, depth: null }))
            //         let output = await Ulb.aggregate(state_id ? BaseQuery : basequery);

            //         rslv(output);
            //     });
            //     let prms2 = new Promise(async (rslv, rjct) => {
            //         // console.log(Util.inspect(query1, { showHidden: false, depth: null }))
            //         let output = await Ulb.aggregate(query1);

            //         rslv(output);
            //     });
            //     let prms3 = new Promise(async (rslv, rjct) => {
            //         let output = [{
            //             uas_submitted: 0,
            //             totalUAs: 0
            //         }]
            //         if (state_id) {
            //             let output1 = await UA.aggregate(query2_totalUAs);
            //             let output2 = await State.aggregate(query2_stateVersion);
            //             // console.log(output1, output2)
            //             if (output1.length == 0) {
            //                 console.log('1')
            //                 output[0].totalUAs = 0;
            //                 output[0].uas_submitted = 0;
            //             }
            //             if (output2.length != 0) {
            //                 console.log('2')
            //                 output[0].totalUAs = output1[0]?.totalUAs;
            //                 output[0].uas_submitted = output1[0]?.totalUAs;
            //             }
            //             if (output1.length != 0 && output2.length == 0) {
            //                 console.log('3')
            //                 output[0].totalUAs = output1[0]?.totalUAs;
            //                 output[0].uas_submitted = 0;

            //             }

            //         } else {
            //             console.log(util.inspect(query2, { showHidden: false, depth: null }))
            //             let tempOutput = []
            //             tempOutput = await UA.aggregate(query2);
            //             console.log('*************', tempOutput)
            //             output[0]['totalUAs'] = tempOutput[0]['totalUAs']
            //             query2.push(
            //                 {
            //                     $match: {
            //                         $or: [

            //                             {
            //                                 $and: [
            //                                     { "isSubmit": true },
            //                                     { "actionTakenByRole": "STATE" },
            //                                     { "status": "PENDING" }]
            //                             },

            //                             {
            //                                 $and: [
            //                                     {
            //                                         $or: [
            //                                             { "status": "APPROVED" }
            //                                             , { "status": "PENDING" }]
            //                                     },

            //                                     { "actionTakenByRole": "MoHUA" }
            //                                 ]

            //                             }
            //                         ]
            //                     }
            //                 }
            //             )
            //             let tempOutput2 = await UA.aggregate(query2);
            //             if (tempOutput2.length == 0) {
            //                 output[0]['uas_submitted'] = 0;
            //             } else {
            //                 output[0]['uas_submitted'] = tempOutput2.length
            //             }
            //         }


            //         rslv(output);
            //     });
            //     let prms4 = new Promise(async (rslv, rjct) => {

            //         let output = await Ulb.aggregate(query3);

            //         rslv(output);
            //     });
            //     Promise.all([prms1, prms2, prms3, prms4]).then(
            //         (outputs) => {
            //             let output1 = outputs[0];
            //             let output2 = outputs[1];
            //             let output3 = outputs[2];
            //             let output4 = outputs[3];
            //             if (output1 && output2 && output3 && output4) {
            //                 resolve({ output1, output2, output3, output4 });
            //             } else {
            //                 reject({ message: "No Data Found" });
            //             }
            //         },
            //         (e) => {
            //             reject(e);
            //         }
            //     );
            // });



            // let submitted_totalUlbs = 0;
            // let totalUlbs = 0;
            // let submitted_nonMillion = 0;
            // let nonMillion = 0;
            // let submitted_ulbsInMillionPlusUlbs = 0;
            // let ulbsInMillionPlusUlbs = 0;
            // let submitted_millionPlusUA = 0;
            // let millionPlusUA = 0;
            // console.log('output1', output1, 'output2', output2, 'output3', output3, 'output4', output4)
            // output1.forEach(el => {
            //     if (
            //         ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
            //         ||
            //         (el._id.status == 'APPROVED' && el._id.actionTakenByRole == 'STATE')

            //     ) {
            //         submitted_totalUlbs = submitted_totalUlbs + el.count
            //         totalUlbs = el.totalUlbs[0]
            //     } else {
            //         submitted_totalUlbs = 0;
            //         totalUlbs = el.totalUlbs[0]
            //     }
            // })
            // output2.forEach(el => {
            //     if (
            //         ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
            //         ||
            //         (el._id.status == 'APPROVED' && el._id.actionTakenByRole == 'STATE')

            //     ) {
            //         submitted_nonMillion = submitted_nonMillion + el.count;
            //         nonMillion = el.totalUlbs[0]
            //     } else {
            //         submitted_nonMillion = 0;
            //         nonMillion = el.totalUlbs[0]
            //     }
            // })
            // submitted_millionPlusUA = output3[0]?.uas_submitted
            // millionPlusUA = output3[0]?.totalUAs
            // output4.forEach(el => {
            //     if (
            //         ((el._id.status == 'PENDING' || el._id.status == 'APPROVED') && el._id.actionTakenByRole == 'MoHUA')
            //         ||
            //         (el._id.status == 'APPROVED' && el._id.actionTakenByRole == 'STATE')

            //     ) {
            //         submitted_ulbsInMillionPlusUlbs = submitted_ulbsInMillionPlusUlbs + el.count
            //         ulbsInMillionPlusUlbs = el.totalUlbs[0]
            //     } else {
            //         submitted_ulbsInMillionPlusUlbs = 0;
            //         ulbsInMillionPlusUlbs = el.totalUlbs[0]
            //     }
            // })


            // outputData.submitted_totalUlbs = submitted_totalUlbs;
            // outputData.submitted_nonMillion = submitted_nonMillion;
            // outputData.submitted_ulbsInMillionPlusUlbs = submitted_ulbsInMillionPlusUlbs
            // outputData.totalUlbs = totalUlbs
            // outputData.nonMillion = nonMillion
            // outputData.ulbsInMillionPlusUlbs = ulbsInMillionPlusUlbs
            // outputData.submitted_millionPlusUA = submitted_millionPlusUA
            // outputData.millionPlusUA = millionPlusUA
            // console.log(outputData)
            res.json({
                data: outputData
            })
        } else {
            return res.status(403).json({
                success: false,
                message: "Not Authorized to Access this API"
            })
        }


    } catch (e) {
        console.log(e.message)
    }

})
module.exports.getForm = catchAsync(async (req, res) => {
    let user = req.decoded;
    let { state_id } = req.query;

    if (user.role != "ULB" || user.role != "STATE") {
        let { design_year } = req.params;
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: "Design Year Not Found",
            });
        }
        let match;


        let finalOutput = [];
        if (state_id) {
            match = {
                $match: {
                    design_year: ObjectId(design_year),
                    state: ObjectId(state),
                },
            };
        } else {
            match = {
                $match: {
                    design_year: ObjectId(design_year),
                },
            }
        }
        let baseQuery = [
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "ulb",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $group: {
                    _id: {
                        isUA: "$isUA",
                        isMillionPlus: "$isMillionPlus",
                    },
                    // ulbs: { $addToSet: "$_id" },
                    count: { $sum: 1 },
                },
            },
        ];

        let ulbData = await Ulb.aggregate(baseQuery);

        let numbers = calculateTotalNumbers(ulbData);
        console.log('Hi')
        console.log('printing numbers', numbers);
        //masterform
        let query1 = [
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulbData",
                },
            },
            {
                $unwind: "$ulbData",
            },
            {
                $project: {
                    steps: 1,
                    actionTakenByRole: 1,
                    status: 1,
                    isSubmit: 1,
                    ulb: 1,
                    state: 1,
                    design_year: 1,
                    isUA: "$ulbData.isUA",
                    isMillionPlus: "$ulbData.isMillionPlus",
                },
            },
            match,
            {
                $group: {
                    _id: {
                        status: "$status",
                        actionTakenByRole: "$actionTakenByRole",
                    },
                    count: { $sum: 1 },
                },
            },
        ];

        //annualaccounts

        let query2 = [
            {
                $match: {

                    '$or': [
                        { isSubmit: true, actionTakenByRole: "ULB", status: "PENDING" },
                        {
                            $and:
                                [
                                    { $or: [{ actionTakenByRole: "MoHUA" }, { actionTakenByRole: "STATE" }] },
                                    { $or: [{ status: "PENDING" }, { status: "APPROVED" }] }
                                ]
                        }]
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulbData",
                },
            },
            {
                $unwind: {
                    path: "$ulbData"
                },
            },
            {
                $project: {
                    steps: 1,
                    actionTakenByRole: 1,
                    status: 1,
                    isSubmit: 1,
                    ulb: 1,
                    state: 1,
                    design_year: 1,
                    isUA: "$ulbData.isUA",
                    isMillionPlus: "$ulbData.isMillionPlus",
                },
            },
            match,
            {
                $lookup: {
                    from: "annualaccountdatas",
                    localField: "ulb",
                    foreignField: "ulb",
                    as: "annualaccount",
                },
            },
            {
                $unwind: {
                    path: "$annualaccount"
                }
            },
            { $match: { "annualaccount.design_year": ObjectId(design_year) } },
            {
                '$group': {
                    _id: '$annualaccount.audited.submit_annual_accounts',
                    audited: { '$sum': 1 },
                    annualaccount: { '$addToSet': '$annualaccount' }
                }
            },
            { '$match': { _id: true } },
            {
                $unwind: {
                    path: "$annualaccount"
                }
            },
            {
                '$group': {
                    _id: '$annualaccount.unAudited.submit_annual_accounts',
                    unAudited: { '$sum': 1 },
                    audited: { '$first': '$audited' }
                }
            },
            { '$match': { _id: true } },
        ];
        //util report
        let query3 = [
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulbData",
                },
            },
            {
                $unwind: "$ulbData",
            },
            {
                $project: {
                    steps: 1,
                    actionTakenByRole: 1,
                    status: 1,
                    isSubmit: 1,
                    ulb: 1,
                    state: 1,
                    design_year: 1,
                    isUA: "$ulbData.isUA",
                    isMillionPlus: "$ulbData.isMillionPlus",
                },
            },
            match,
            {
                $lookup: {
                    from: "utilizationreports",
                    localField: "ulb",
                    foreignField: "ulb",
                    as: "utilReportForm",
                },
            },
            { $unwind: "$utilReportForm" },
            { $match: { "utilReportForm.designYear": ObjectId(design_year) } },
            {
                $group: {
                    _id: {
                        isSubmit: "$isSubmit",
                        actionTakenByRole: "$actionTakenByRole",
                        isDraft: "$utilReportForm.isDraft",
                        status: "$utilReportForm.status",
                    },
                    count: { $sum: 1 },
                },
            },
        ];
        //xv fc grant ulb form
        let query4 = [
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulbData",
                },
            },
            {
                $unwind: "$ulbData",
            },
            {
                $project: {
                    steps: 1,
                    actionTakenByRole: 1,
                    status: 1,
                    isSubmit: 1,
                    ulb: 1,
                    state: 1,
                    design_year: 1,
                    isUA: "$ulbData.isUA",
                    isMillionPlus: "$ulbData.isMillionPlus",
                },
            },
            match,
            {
                $lookup: {
                    from: "xvfcgrantulbforms",
                    localField: "ulb",
                    foreignField: "ulb",
                    as: "slbForm",
                },
            },
            { $unwind: "$slbForm" },
            { $match: { "slbForm.design_year": ObjectId(design_year) } },
            {
                $group: {
                    _id: {
                        isSubmit: "$isSubmit",
                        actionTakenByRole: "$actionTakenByRole",
                        status: "$slbForm.status",
                        isCompleted: "$slbForm.isCompleted",
                    },
                    count: { $sum: 1 },
                },
            },
        ];

        let { output1, output2, output3, output4 } =
            await new Promise(async (resolve, reject) => {
                let prms1 = MasterFormData.aggregate(query1).allowDiskUse(true);
                let prms2 = MasterFormData.aggregate(query2).allowDiskUse(true);
                let prms3 = MasterFormData.aggregate(query3).allowDiskUse(true);
                let prms4 = MasterFormData.aggregate(query4).allowDiskUse(true);

                Promise.all([prms1, prms2, prms3, prms4]).then(
                    (outputs) => {
                        let output1 = outputs[0];
                        let output2 = outputs[1];
                        let output3 = outputs[2];
                        let output4 = outputs[3];

                        if (
                            output1 &&
                            output2 &&
                            output3 &&
                            output4

                        ) {
                            resolve({
                                output1,
                                output2,
                                output3,
                                output4

                            });
                        } else {
                            reject({ message: "No Data Found" });
                        }
                    },
                    (e) => {
                        reject(e);
                    }
                );
            });

        let data = formatOutput(
            output1,
            output2,
            output3,
            output4,

            0,
            numbers
        );
        finalOutput.push(data);

        // console.log(util.inspect({
        //   "overall": output1,
        //   "pfms": output2,
        //   "annualaccounts": output3,
        //   "utilreport": output4,
        //   "slb": output5
        // }, { showHidden: false, depth: null }))

        res.status(200).json({
            success: true,
            data: finalOutput,
        });
    } else {
        return res.status(403).json({
            success: false,
            message: "Not Authorized to Access This API",
        });
    }
});


module.exports.getTable = catchAsync(async (req, res) => {

})

module.exports.plansData = catchAsync(async (req, res) => {
    let { state_id } = req.query;
    let user = req.decoded;
    let { design_year } = req.params;
    let state = user.state ?? state_id;

    let baseQuery = [

        {
            $group: {
                _id: null,
                totalUlbs: { $sum: { $size: "$ulb" } }
            }
        },
    ];

    let response = await UA.aggregate(baseQuery);
    let count = response[0].totalUlbs
    console.log(count);
    let query = [
        {
            $match: {
                design_year: ObjectId(design_year),
            },
        },
        {
            $lookup: {
                from: "ulbs",
                localField: "ulb",
                foreignField: "_id",
                as: "ulbData",
            },
        },

        { $unwind: "$ulbData" },
        {
            $match: {

                '$or': [
                    { "ulbData.censusCode": { '$exists': true, '$ne': '' } },
                    { "ulbData.sbCode": { '$exists': true, '$ne': '' } }
                ]

            }

        },
        {
            $lookup: {
                from: "uas",
                localField: "ulb",
                foreignField: "ulb",
                as: "uaData",
            },
        },

        { $unwind: "$uaData" },

        {
            $project: {
                steps: 1,
                actionTakenByRole: 1,
                status: 1,
                isSubmit: 1,
                ulb: 1,
                state: 1,
                design_year: 1,
                isUA: "$ulbData.isUA",
                isMillionPlus: "$ulbData.isMillionPlus",
                UA: "$uaData.name",
            },
        },
        {
            $match: {
                $or: [{ status: "APPROVED" }, { $and: [{ actionTakenByRole: "MoHUA" }, { status: "PENDING" }] }]
            },
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
            },
        },
    ];
    let data = await MasterFormData.aggregate(query);
    console.log(data)
    const finalData = {
        ulbs: count,
        ulbCount: data[0].count
    }
    res.json({
        success: true,
        data: finalData,
    });
});

const formatOutput = (
    output1,
    output2,
    output3,
    output4,

    i,
    numbers
) => {

    let underReviewByState = 0,
        pendingForSubmission = 0,
        overall_approvedByState = 0,
        provisional = 0,
        audited = 0,
        registered = 0,
        notRegistered = 0,
        pendingResponse = 0,
        util_pendingCompletion = 0,
        util_completedAndPendingSubmission = 0,
        util_underStateReview = 0,
        util_approvedbyState = 0,
        slb_pendingCompletion = 0,
        slb_completedAndPendingSubmission = 0,
        slb_underStateReview = 0,
        slb_approvedbyState = 0,
        provisional_yes = 0,
        provisional_no = 0,
        audited_yes = 0,
        audited_no = 0,
        plans_pendingCompletion = 0,
        plans_completedAndPendingSubmission = 0,
        plans_underStateReview = 0,
        plans_approvedbyState = 0;

    //overall
    output1.forEach((el) => {
        if (el._id.status == "PENDING" && el._id.actionTakenByRole == "ULB") {
            underReviewByState = el.count;
        } else if (
            el._id.status === "APPROVED" &&
            el._id.actionTakenByRole === "STATE"
        ) {
            overall_approvedByState = el.count;
        }

        pendingForSubmission =
            numbers[i] - underReviewByState - overall_approvedByState;
    });



    //annualaccounts
    if (output2.length) {
        provisional = (output2[0]?.unAudited / numbers[i]) * 100;
        audited = (output2[0]?.audited / numbers[i]) * 100;
    } else {
        provisional = 0;
        audited = 0;
    }

    //detailed utilization report
    output3.forEach((el) => {
        if (

            el._id.status == "APPROVED"
        ) {
            util_approvedbyState = el.count + util_approvedbyState;
        } else if (
            (el._id.actionTakenByRole === "ULB" &&
                el._id.isSubmit &&
                !el._id.isDraft) ||
            (el._id.actionTakenByRole === "STATE" &&
                el._id.status != "APPROVED" && el._id.status != "REJECTED")
        ) {
            util_underStateReview = el.count + util_underStateReview;
        } else if (
            !el._id.isSubmit &&
            el._id.actionTakenByRole === "ULB" &&
            !el._id.isDraft
        ) {
            util_completedAndPendingSubmission = el.count + util_completedAndPendingSubmission;
        }


    });
    util_pendingCompletion =
        numbers[i] -
        util_underStateReview -
        util_approvedbyState -
        util_completedAndPendingSubmission;
    //slb
    output4.forEach((el) => {
        if (
            el._id.actionTakenByRole === "ULB" &&
            el._id.status === "PENDING" &&
            el._id.isSubmit
        ) {
            slb_underStateReview = el.count;
        } else if (
            el._id.actionTakenByRole === "STATE" &&
            el._id.status === "APPROVED" &&
            el._id.isSubmit
        ) {
            slb_approvedbyState = el.count;
        } else if (
            !el._id.isSubmit &&
            el._id.actionTakenByRole === "ULB" &&
            el._id.isCompleted
        ) {
            slb_completedAndPendingSubmission = el.count;
        }

        slb_pendingCompletion =
            numbers[i] -
            slb_underStateReview -
            slb_approvedbyState -
            slb_completedAndPendingSubmission;
    });



    let finalOutput = {
        type:
            i == 0 ? "allULB" : i == 1 ? "ulbsInMillionPlusUA" : "nonMillionPlusULBs",
        overallFormStatus: {
            pendingForSubmission: pendingForSubmission,
            underReviewByState: underReviewByState,
            approvedByState: overall_approvedByState,
        },
        annualAccounts: {
            provisional: parseInt(provisional),
            audited: parseInt(audited),
        },
        pfms: {
            registered: registered,
            notRegistered: notRegistered,
            pendingResponse: pendingResponse,
        },
        utilReport: {
            pendingCompletion: util_pendingCompletion,
            completedAndPendingSubmission: util_completedAndPendingSubmission,
            underStateReview: util_underStateReview,
            approvedbyState: util_approvedbyState,
        },
        slb: {
            pendingCompletion: slb_pendingCompletion,
            completedAndPendingSubmission: slb_completedAndPendingSubmission,
            underStateReview: slb_underStateReview,
            approvedbyState: slb_approvedbyState,
        },
        plans: {
            pendingCompletion: plans_pendingCompletion,
            completedAndPendingSubmission: plans_completedAndPendingSubmission,
            underStateReview: plans_underStateReview,
            approvedbyState: plans_approvedbyState,
        },
    };

    // console.log(finalOutput)
    return finalOutput;
};

const calculateTotalNumbers = (data) => {
    let totalUlbs = 0;
    let ulbInMillionPlusUA = 0;
    let nonMillionPlusULBs = 0;
    data.forEach((el) => {
        totalUlbs = el.count + totalUlbs;
        if (el._id.isUA == "Yes") {
            ulbInMillionPlusUA = ulbInMillionPlusUA + el.count;
        }
        if (el._id.isMillionPlus == "No") {
            nonMillionPlusULBs = nonMillionPlusULBs + el.count;
        }
    });
    return [totalUlbs, ulbInMillionPlusUA, nonMillionPlusULBs];
};