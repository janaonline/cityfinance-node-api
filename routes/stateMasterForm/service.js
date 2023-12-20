const catchAsync = require("../../util/catchAsync");
const StateMasterForm = require("../../models/StateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const State = require('../../models/State')
const UA = require('../../models/UA')
const ActionPlans = require('../../models/ActionPlans')
const Grantallocation = require('../../models/GrantDistribution')
const PFMSState = require('../../models/LinkPfmsState')
const WaterRejuvenation = require('../../models/WaterRejenuvation&Recycling')
const GTCertificate = require('../../models/StateGTCertificate')
const Response = require("../../service").response;
const Service = require("../../service");
const moment = require("moment");
const statusTypes = require('../../util/statusTypes')
const time = () => {
    var dt = new Date();
    dt.setHours(dt.getHours() + 5);
    dt.setMinutes(dt.getMinutes() + 30);
    return dt;
};
module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded;

    let { design_year, state_id } = req.params;
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: "Design Year Not Found",
        });
    }
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User Not Found",
        });
    }
    let query = {
        state: ObjectId(user.state),
        design_year: ObjectId(design_year),
    };
    if (state_id && (user.role != "STATE" || user.role != "ULB")) {
        let masterFormData = await StateMasterForm.findOne(
            {
                state: ObjectId(state_id),
                design_year: ObjectId(design_year)
            }, "-history")
        return res.status(200).json({
            success: true,
            message: 'State MasterForm Data Fetched Successfully',
            data: masterFormData
        })
        //in progress
    }
    let masterFormData = await StateMasterForm.findOne(query, "-history");
    if (!masterFormData) {
        return res.status(500).json({
            success: false,
            message: "Master Data Not Found for " + user.name,
        });
    } else {
        return res.status(200).json({
            success: true,
            message: "Data Found Successfully!",
            data: masterFormData,
        });
    }
});

module.exports.getAll = catchAsync(async (req, res) => {

    let user = req.decoded,
        filter =
            req.query.filter && !req.query.filter != "null"
                ? JSON.parse(req.query.filter)
                : req.body.filter
                    ? req.body.filter
                    : {};
    let { design_year } = req.params;
    let csv = req.query.csv === 'true'
    if (!design_year) {
        return res.status(400).json({
            success: false,
            message: "Design Year Not Found"
        })
    }

    if (user.role != 'ULB' || user.role != 'STATE') {
        let query = [
            {
                $match: {
                    accessToXVFC: true
                }
            },
            {
                $lookup: {
                    from: "statemasterforms",
                    localField: "_id",
                    foreignField: "state",
                    as: "stateMasterFormData"
                }
            },
            {
                $unwind: {
                    path: "$stateMasterFormData",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    $or: [{ stateMasterFormData: { $exists: false } },
                    { "stateMasterFormData.design_year": ObjectId(design_year) }]
                }
            },
            {
                $lookup: {
                    from: "uas",
                    localField: "_id",
                    foreignField: "state",
                    as: "Uas"
                }
            },
            {
                $project: {
                    "stateMasterFormData": 1,
                    uas: { $size: "$Uas" },
                    "state": "$name"
                }
            }

        ];
        let newFilter = await Service.mapFilter(filter);
        if (newFilter && !newFilter['status'] && Object.keys(newFilter).length) {
            query.push({ $match: newFilter });

        }

        let masterFormData = await State.aggregate(query)
        let p1 = [];
        let p2 = [];
        let p3 = [];
        let p4 = [];
        let p5 = [];
        let finalOutput = [];
        if (masterFormData.length > 0) {
            masterFormData.forEach(el => {
                if (!el.hasOwnProperty('stateMasterFormData')) {
                    el['formStatus'] = 'Not Started'
                    p5.push(el)
                } else {
                    if (el['stateMasterFormData'].actionTakenByRole == "STATE" && el['stateMasterFormData'].isSubmit == true) {
                        el['formStatus'] = statusTypes.Under_Review_By_MoHUA
                        p1.push(el)
                    } else if (el['stateMasterFormData'].actionTakenByRole == "STATE" && el['stateMasterFormData'].isSubmit == false) {
                        el['formStatus'] = "In Progress"
                        p4.push(el)
                    } else if (el['stateMasterFormData'].actionTakenByRole == "MoHUA" && el['stateMasterFormData'].status == "APPROVED") {
                        el['formStatus'] = "Approval Completed"
                        p2.push(el)
                    } else if (el['stateMasterFormData'].actionTakenByRole == "MoHUA" && el['stateMasterFormData'].status == "REJECTED") {
                        el['formStatus'] = "Rejected By MoHUA"
                        p3.push(el)
                    } else if (el['stateMasterFormData'].actionTakenByRole == "MoHUA" && el['stateMasterFormData'].status == "PENDING") {

                        el['formStatus'] = statusTypes.Under_Review_By_MoHUA
                        p1.push(el)
                    }
                }

            })


        }
        finalOutput.push(...p1, ...p2, ...p3, ...p4, ...p5)
        if (newFilter["status"]) {

            finalOutput = finalOutput.filter(data => {
                // console.log(data.printStatus.toLowerCase() == newFilter["status"].toLowerCase())
                return data.formStatus.toLowerCase() == newFilter["status"].toLowerCase()
            });
        }
        if (csv) {
            let field = csvData();

            let xlsData = await Service.dataFormating(finalOutput, field);
            let filename =
                "15th-FC-Form" + moment().format("DD-MMM-YY HH:MM:SS") + ".xlsx";
            return res.xls(filename, xlsData);

        }
        return res.status(200).json({
            success: true,
            message: finalOutput ? "Data Found Successfully!" : "No Data Found",
            data: finalOutput,
            total: finalOutput.length
        })

    } else {
        return res.status(403).json({
            success: false,
            message: user.role + ' Not AUthorized to Perform this Action',
        })
    }

})

function csvData() {
    return (field = {

        state: "State Name",
        numberOfUas: "Million Plus UAs in State",
        formStatus: "Status",



    });
}

module.exports.getAllForms = catchAsync(async (req, res) => {
    let { design_year, state_id } = req.params;
    let query = [
        {
            $match: {
                _id: ObjectId(state_id),
            },
        },
        {
            $lookup: {
                from: "actionplans",
                pipeline: [
                    {
                        $match: {
                            state: ObjectId(state_id),
                            design_year: ObjectId(design_year),
                        },
                    },
                    {
                        $project: {
                            history: 0,
                        },
                    },
                ],
                as: "actionplans",
            },
        },
        {
            $lookup: {
                from: "linkpfmsstates",
                pipeline: [
                    {
                        $match: {
                            state: ObjectId(state_id),
                            design_year: ObjectId(design_year)
                        },
                    },
                    {
                        $project: {
                            history: 0,
                        },
                    },
                ],
                as: "linkpfmsstates",
            },
        },
        {
            $lookup: {
                from: "stategtcertificates",
                pipeline: [
                    {
                        $match: {
                            state: ObjectId(state_id),
                            design_year: ObjectId(design_year),
                        },
                    },
                    {
                        $project: {
                            history: 0,
                        },
                    },
                ],
                as: "stategtcertificates",
            },
        },
        {
            $lookup: {
                from: "waterrejenuvationrecyclings",
                pipeline: [
                    {
                        $match: {
                            state: ObjectId(state_id),
                            design_year: ObjectId(design_year),
                        },
                    },
                    {
                        $project: {
                            history: 0,
                        },
                    },
                ],
                as: "waterrejenuvationrecyclings",
            },
        },
        {
            $lookup: {
                from: "grantdistributions",
                pipeline: [
                    {
                        $match: {
                            state: ObjectId(state_id),
                            design_year: ObjectId(design_year),
                        },
                    },
                    {
                        $project: {
                            history: 0,
                        },
                    },
                ],
                as: "grantdistributions",
            },
        },
        {
            $project: {
                history: 0,
            },
        },
    ];
    let allFormsData = await State.aggregate(query)
    return res.status(200).json({
        success: true,
        message: 'All State Forms Fetched',
        data: allFormsData
    })
})

module.exports.getHistory = catchAsync(async (req, res) => {

    let user = req.decoded;
    let { formId } = req.params;
    if (user.role != "ULB" || user.role != "STATE") {
        let query = {
            _id: ObjectId(formId),
        }
        let getData = await StateMasterForm.findOne(query, { "history": 1 })
        let outputArr = [];
        if (getData) {
            getData['history'].forEach(el => {
                let output = {};

                if (el.actionTakenByRole == 'STATE' && el.status == "PENDING") {
                    output['status'] = 'Submitted by STATE';
                    output['time'] = el.modifiedAt
                } else if (el.actionTakenByRole == 'MoHUA' && el.status == "APPROVED") {
                    output['status'] = 'Approved By MoHUA';
                    output['time'] = el.modifiedAt
                } else if (el.actionTakenByRole == 'MoHUA' && el.status == "REJECTED") {
                    output['status'] = 'Rejected By MoHUA';
                    output['time'] = el.modifiedAt
                }

                outputArr.push(output)
            })


            return res.status(200).json({
                success: true,
                message: "History Data Fetched Successfully!",
                data: outputArr
            })
        } else {
            return res.status(400).json({
                success: false,
                message: 'No Data Found'
            })
        }


    } else {
        return res.status('403').json({
            success: false,
            message: user.role + " Not Authorized to Access this Data"
        })
    }
})

module.exports.finalSubmit = catchAsync(async (req, res) => {
    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User Not Found",
        });
    }
    if (user.role === "STATE") {
        let data = req.body;
        let design_year = (data.design_year);
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: "Design Year Not Found",
            });
        }
        let state = user.state;
        data["actionTakenBy"] = ObjectId(user._id);
        data["actionTakenByRole"] = (user.role);
        data["modifiedAt"] = time();


        // console.log(data)
        //isSubmit and Status comes in the req.body
        let query = {
            design_year: ObjectId(design_year),
            state: ObjectId(state),
        };
        //create History
        let masterFormData = await StateMasterForm.findOne(query).lean()

        if (masterFormData) {
            data['latestFinalResponse'] = masterFormData.steps
            data['latestFinalResponse']['role'] = masterFormData.actionTakenByRole
            masterFormData['modifiedAt'] = data["modifiedAt"]
            data['history'] = [...masterFormData.history];
            masterFormData.history = undefined;
            data['history'].push(masterFormData);
        }


        let updatedData = await StateMasterForm.findOneAndUpdate(query, data, { new: true, setDefaultsOnInsert: true });
        updatedData.toObject();
        let newData = {
            "steps": {
                "linkPFMS": {
                    rejectReason: null,
                    status: updatedData.steps.linkPFMS.status != 'PENDING' ? updatedData.steps.linkPFMS.status : 'PENDING',
                    isSubmit: updatedData.latestFinalResponse['role'] ? updatedData.steps.linkPFMS.isSubmit : false,
                },
                "GTCertificate": {
                    rejectReason: null,
                    status: updatedData.steps.GTCertificate.status != 'PENDING' ? updatedData.steps.GTCertificate.status : 'PENDING',
                    isSubmit: updatedData.latestFinalResponse['role'] ? updatedData.steps.GTCertificate.isSubmit : false,
                },
                "waterRejuventation": {
                    rejectReason: [],
                    status: updatedData.steps.waterRejuventation.status != 'PENDING' ? updatedData.steps.waterRejuventation.status : 'PENDING',
                    isSubmit: updatedData.latestFinalResponse['role'] ? updatedData.steps.waterRejuventation.isSubmit : false,
                },
                "actionPlans": {
                    rejectReason: [],
                    status: updatedData.steps.actionPlans.status != 'PENDING' ? updatedData.steps.actionPlans.status : 'PENDING',
                    isSubmit: updatedData.latestFinalResponse['role'] ? updatedData.steps.actionPlans.isSubmit : false,

                },
                "grantAllocation": {
                    isSubmit: true
                }
            }
        };

        let finalUpdatedData = await StateMasterForm.findOneAndUpdate(query, newData, { new: true })

        // let ulbUser = await User.findOne({
        //   ulb: ObjectId(req.decoded.ulb),
        //   isDeleted: false,
        //   role: "ULB",
        // })
        //   .populate([
        //     {
        //       path: "state",
        //       model: State,
        //       select: "_id name",
        //     },
        //   ])
        //   .exec();

        // let mailOptions = {
        //   to: "",
        //   subject: "",
        //   html: "",
        // };
        // /** ULB TRIGGER */
        // let ulbEmails = [];
        // let UlbTemplate = await Service.emailTemplate.fdUploadUlb(ulbUser.name);
        // ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
        // ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
        // (mailOptions.to = ulbEmails.join()),
        //   (mailOptions.subject = UlbTemplate.subject),
        //   (mailOptions.html = UlbTemplate.body);
        // Service.sendEmail(mailOptions);
        // /** STATE TRIGGER */
        // let stateEmails = [];
        // let stateUser = await User.find({
        //   state: ObjectId(ulbUser.state),
        //   isDeleted: false,
        //   role: "STATE",
        // }).exec();
        // for (let d of stateUser) {
        //   sleep(700);
        //   d.email ? stateEmails.push(d.email) : "";
        //   d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
        //   let stateTemplate = await Service.emailTemplate.fdUploadState(
        //     ulbUser.name,
        //     d.name
        //   );
        //   mailOptions.to = stateEmails.join();
        //   mailOptions.subject = stateTemplate.subject;
        //   mailOptions.html = stateTemplate.body;
        //   Service.sendEmail(mailOptions);
        // }
        if (updatedData) {
            return res.status(200).json({
                success: true,
                message: "Final Submit Successful!",
                data: finalUpdatedData,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Final Submit Failed!",
            });
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " Not Authenticated to Perform this Action",
        });
    }
})

module.exports.finalAction = catchAsync(async (req, res) => {
    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User Not Found",
        });
    }
    if (user.role === "MoHUA") {
        let data = req.body;
        let design_year = (data.design_year);
        let { state_id } = req.query
        let state = user.state ?? state_id
        if (!design_year) {
            return res.status(400).json({
                success: false,
                message: "Design Year Not Found",
            });
        }
        data["actionTakenBy"] = ObjectId(user._id);
        data["actionTakenByRole"] = (user.role);
        data["modifiedAt"] = time();
        console.log(data)
        //isSubmit and Status comes in the req.body
        let query = {
            design_year: ObjectId(design_year),
            state: ObjectId(state),
        };
        //create History
        let masterFormData = await StateMasterForm.findOne(query).lean()
        if (masterFormData) {
            //calculate overall status of Form
            data['status'] = "APPROVED"
            for (let key in masterFormData['steps']) {
                if (masterFormData['steps'][key]['status'] === "REJECTED") {
                    data['status'] = "REJECTED";
                    break;
                }
            }
            data['latestFinalResponse'] = masterFormData.steps
            data['latestFinalResponse']['role'] = masterFormData.actionTakenByRole
            masterFormData['modifiedAt'] = data["modifiedAt"]
            masterFormData['status'] = data["status"]
            data['history'] = [...masterFormData.history];
            masterFormData.history = undefined;
            data['history'].push(masterFormData);
            console.log(masterFormData)
        }
        let updatedData = await StateMasterForm.findOneAndUpdate(query, data, { new: true, setDefaultsOnInsert: true })



        if (updatedData) {
            return res.status(200).json({
                success: true,
                message: "Final Submit Successful!",
                data: updatedData,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Final Submit Failed!",
            });
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " Not Authenticated to Perform this Action",
        });
    }
})


module.exports.deleteForms = catchAsync(async (req, res) => {
    let data = req.body;
    let user = req.decoded;
    let query = {
        state: ObjectId(data.state),
        design_year: ObjectId(data.design_year)

    }
    await ActionPlans.findOneAndDelete(query)
    await Grantallocation.findOneAndDelete(query)
    await PFMSState.findOneAndDelete(query)
    await WaterRejuvenation.findOneAndDelete(query)
    await GTCertificate.findOneAndDelete(query)
    await StateMasterForm.findOneAndDelete(query)
    res.send("Data Deleted")
})

module.exports.waterRejCard = catchAsync(async (req, res) => {
    try {
        const { design_year, state_id } = req.query
        if (req.decoded.role == "STATE") {
            state_id = req.decoded.state
        }
        let data = await UA.find().select({ state: 1, _id: 0 })
        data = JSON.parse(JSON.stringify(data))
        let newObj = new Map(),
            stateIds = [];
        data.forEach((element) => {
            if (!newObj.has(element.state)) {
                newObj.set(element.state, element.state)
                stateIds.push(element.state)
            }
        })


        if (state_id && !stateIds.includes(state_id)) {
            return Response.OK(res, { stateAnswer: "N/A" })
        }

        let masterData

        if (!state_id) {
            masterData = await StateMasterForm.find({
                state: { $in: stateIds }, design_year
            })
            let stateCount = 0
            masterData.forEach(element => {
                if (element.actionTakenByRole == 'MoHUA' && element.status != 'REJECTED') {
                    stateCount++;
                }
                if (element.actionTakenByRole == 'STATE' && element.isSubmit) {
                    stateCount++;
                }
            });
            if (masterData.length > 0) {
                return Response.OK(res, { stateCount, eligibleState: stateIds.length }, "Success")
            } else {
                return Response.OK(res, { stateCount, eligibleState: stateIds.length }, "Success")
            }

        } else {
            masterData = await StateMasterForm.findOne({ state: state_id, design_year })
            if (masterData) {
                if (masterData.actionTakenByRole == 'MoHUA' && masterData.status != 'REJECTED') {
                    return Response.OK(res, { stateAnswer: "yes" }, "Success")
                }
                if (masterData.actionTakenByRole == 'STATE' && masterData.isSubmit) {
                    return Response.OK(res, { stateAnswer: "yes" }, "Success")
                }
                return Response.OK(res, { stateAnswer: "no" }, "Success")
            } else {
                return Response.OK(res, { stateAnswer: "no" }, "Success")
            }
        }

    } catch (error) {
        return Response.DbError(res, `${error.message} Db error`)
    }
});
