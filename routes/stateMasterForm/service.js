const catchAsync = require("../../util/catchAsync");
const StateMasterForm = require("../../models/StateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const State = require('../../models/State')
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

    let user = req.decoded;
    let { design_year } = req.params;
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
                    design_year: ObjectId(design_year)
                }
            },

            {
                $lookup: {
                    from: "uas",
                    localField: "state",
                    foreignField: "state",
                    as: "ua"
                }
            },
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
                $project:
                {
                    status: 1,
                    actionTakenByRole: 1,
                    isSubmit: 1,
                    numberOfUas: { $size: "$ua" },
                    state: "$state.name",
                    state_id: "$state._id"
                }
            }


        ];
        let masterFormData = await StateMasterForm.aggregate(query)

        if (masterFormData.length > 0) {
            masterFormData.forEach(el => {
                if (el.actionTakenByRole == "STATE" && el.isSubmit == true) {
                    el['formStatus'] = "Under Review by MoHUA"
                } else if (el.actionTakenByRole == "STATE" && el.isSubmit == false) {
                    el['formStatus'] = "In Progress"
                } else if (el.actionTakenByRole == "MoHUA" && el.status == "APPROVED") {
                    el['formStatus'] = "Approval Completed"
                } else if (el.actionTakenByRole == "MoHUA" && el.status == "REJECTED") {
                    el['formStatus'] = "Rejected By MoHUA"
                } else if (el.actionTakenByRole == "MoHUA" && el.status == "PENDING") {
                    el['formStatus'] = "Under Review by MoHUA"
                }
            })
        }

        return res.status(200).json({
            success: true,
            message: masterFormData ? "Data Found Successfully!" : "No Data Found",
            data: masterFormData
        })

    } else {
        return res.status(403).json({
            success: false,
            message: user.role + ' Not AUthorized to Perform this Action',
        })
    }

})

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


        console.log(data)
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


        let updatedData = await StateMasterForm.findOneAndUpdate(query, data, { new: true, setDefaultsOnInsert: true })
        let newData = {
            "steps": {
                "linkPFMS": {
                    rejectReason: null,
                    status: "PENDING",
                    isSubmit: false,
                },
                "GTCertificate": {
                    rejectReason: null,
                    status: "PENDING",
                    isSubmit: false,
                },
                "waterRejuventation": {
                    rejectReason: [],
                    status: "PENDING",
                    isSubmit: false,
                },
                "actionPlans": {
                    rejectReason: [],
                    status: "PENDING",
                    isSubmit: false,

                },
                "grantAllocation": {
                    isSubmit: false
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