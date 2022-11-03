const request = require('request')
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const StateGTCCertificate = require('../../models/StateGTCertificate');
const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb')

function response(form, res, successMsg, errMsg) {
    if (form) {
        return res.status(200).json({
            status: true,
            message: successMsg,
            data: form,
        });
    } else {
        return res.status(400).json({
            status: false,
            message: errMsg
        });
    }
}
module.exports.getForm = async (req, res) => {
    try {

        const data = req.query;
        const condition = {};
        const ulb = req.decoded.ulb;
        let actionTakenByRole = req.decoded.role;
        condition.design_year = data.design_year;
        condition.state = data.state;
        let mpc = false;
        let isUA = false
        if (ulb) {
            let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
            mpc = ulbData?.population > 1000000 ? true : false;
            isUA = ulbData?.isUA == 'Yes' ? true : false
        }
        const prevFormData = await StateGTCCertificate.findOne({
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "2"
        }).lean();
        const prevFormDataMillionTied = await StateGTCCertificate.findOne({
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "1"
        }).lean();
        let obj = {
            type: "",
            file: {
                name: "",
                url: ""
            },
            year: "",
            state: "",
            design_year: "",
            rejectReason: "",
            status: "",
            installment: "",
            createdAt: "",
        };
        let result = [];
        if (prevFormDataMillionTied) {
            if (prevFormDataMillionTied?.million_tied) {
                obj["type"] = "million_tied";
                obj["file"]["name"] = prevFormDataMillionTied["million_tied"]["pdfName"];
                obj["file"]["url"] = prevFormDataMillionTied["million_tied"]["pdfUrl"];
                obj["year"] = prevFormDataMillionTied["design_year"];
                obj["state"] = prevFormDataMillionTied["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormDataMillionTied["million_tied"]["rejectReason"];
                obj["status"] = prevFormDataMillionTied["million_tied"]["status"];
                obj["installment"] = 1;
                obj['createdAt'] = prevFormDataMillionTied['createdAt'];
                obj["key"] = `million_tied_2021-22_1`
                result.push(JSON.parse(JSON.stringify(obj)));
            }
        }
        if (prevFormData) {

            if (prevFormData?.nonmillion_tied) {
                obj["type"] = "nonmillion_tied";
                obj["file"]["name"] = prevFormData["nonmillion_tied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_tied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_tied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_tied"]["status"];
                obj["installment"] = 2;
                obj['createdAt'] = prevFormData['createdAt'];
                obj["key"] = `nonmillion_tied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            }
            if (prevFormData?.nonmillion_untied) {
                obj["type"] = "nonmillion_untied";
                obj["file"]["name"] = prevFormData["nonmillion_untied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_untied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_untied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_untied"]["status"];
                obj["installment"] = 2;
                obj['createdAt'] = prevFormData['createdAt'];
                obj["key"] = `nonmillion_untied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            }

        }
        let form = await GrantTransferCertificate.find(condition, { history: 0 }).lean();
        form = JSON.parse(JSON.stringify(form))
        form.forEach((entity) => {

            if (entity.year.toString() == "606aadac4dff55e6c075c507") {
                entity.key = `${entity.type}_2020-21_${entity.installment}`
            }

            if (entity.year.toString() == ObjectId("606aaf854dff55e6c075d219")) {
                entity.key = `${entity.type}_2021-22_${entity.installment}`
            }

            if (entity.year.toString() == "606aafb14dff55e6c075d3ae") {
                entity.key = `${entity.type}_2022-23_${entity.installment}`
            }

        })
        //remove old form data if present in new form using key
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < form.length; j++) {
                if (result[i]?.key === form[j]?.key) {
                    result.splice(i, 1);
                }
            }
        }

        let forms = [...form, ...result]
        let output = [];
        if (ulb) {
            if (forms.length) {
                forms.forEach((el) => {
                    if (mpc) {
                        if (el["type"] == "million_tied") output.push(el);
                    } else if (!mpc && isUA) {
                        if (
                            el["type"] == "million_tied" ||
                            el["type"] == "nonmillion_tied" ||
                            el["type"] == "nonmillion_untied"
                        )
                            output.push(el);
                    } else if (!mpc && !isUA) {
                        if (
                            el["type"] == "nonmillion_tied" ||
                            el["type"] == "nonmillion_untied"
                        )
                            output.push(el);
                    }
                });
            }
            if (output) {
                return res.status(200).json({
                    status: true,
                    data: output,
                });
            } else {
                return res.status(200).json({
                    status: true,
                    message: "Form not found"

                })
            }

        }
        
        if (forms) {
            //removing status and file when mohua is logged in to approve/reject
            for(let i =0; i< forms.length; i++ ){
                let form = forms[i];
                if(form.status === "PENDING" && actionTakenByRole === "MoHUA"){
                    delete form['rejectReason_mohua'];
                    delete form['responseFile_mohua'];
                }
            }
            return res.status(200).json({
                status: true,
                data: forms,
            });

        } else {
            return res.status(200).json({
                status: true,
                message: "Form not found"

            })
        }
    
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };

        if (formData.state) {
            formData.state = ObjectId(formData.state);
        }
        if (formData.design_year) {
            formData.design_year = ObjectId(formData.design_year);
        }

        const { _id: actionTakenBy, role: actionTakenByRole } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['stateSubmit'] = ""

        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        if (data.state && data.design_year) {
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false) {//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData['stateSubmit'] = new Date();
                    const form = await GrantTransferCertificate.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await GrantTransferCertificate.findOneAndUpdate(
                            condition,
                            { $push: { "history": formData } },
                            { new: true, runValidators: true }
                        )
                        return response(addedHistory, res, "Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                } else {
                    if ((!submittedForm) && formData.isDraft === true) { // create as draft
                        const form = await GrantTransferCertificate.create(formData);
                        return response(form, res, "Form created.", "Form not created");
                    }
                }
            }
            if (submittedForm && submittedForm.isDraft === true) { //form exists and saved as draft
                if (formData.isDraft === true) { //  update form as draft
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        { $set: formData },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form created.", "Form not updated");
                } else { // submit form i.e. isDraft=false
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData['stateSubmit'] = new Date();
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        {
                            $push: { "history": formData },
                            $set: formData
                        },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form updated.", "Form not updated.")
                }
            }
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.createForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };

        if (formData.state) {
            formData.state = ObjectId(formData.state);
        }
        if (formData.design_year) {
            formData.design_year = ObjectId(formData.design_year);
        }
        if (formData.year) {
            formData.year = ObjectId(formData.year);
        }

        const { _id: actionTakenBy, role: actionTakenByRole } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = "STATE";
        formData['stateSubmit'] = ""

        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        condition.installment = data.installment;
        condition.year = data.year;
        condition.type = data.type;
        if (data.state && data.design_year) {
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "STATE") {      //Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else if (!submittedForm) {
                formData['stateSubmit'] = new Date();
                const form = await GrantTransferCertificate.create(formData);
                if (form) {//add history
                    formData['createdAt'] = form.createdAt;
                    formData['modifiedAt'] = form.modifiedAt;
                    let addedHistory = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        { $push: { history: formData } },
                        { new: true }
                    );
                    if (!addedHistory) {
                        return res.status(400).json({
                            status: false,
                            message: "History not saved."
                        })
                    }
                    return res.status(200).json({
                        status: true,
                        message: "File saved.",
                        data: addedHistory
                    });
                } else {
                    return res.status(400).json({
                        status: false,
                        message: "Form not saved."
                    })
                }
            } else if (submittedForm && submittedForm.status === "REJECTED") {
                formData['createdAt'] = submittedForm.createdAt;
                formData['modifiedAt'] = new Date();
                formData.modifiedAt.toISOString();
                formData['stateSubmit'] = new Date();
                const form = await GrantTransferCertificate.findOneAndUpdate(
                    condition,
                    {
                        $set: formData,
                        $push: { "history": formData }
                    },
                    { new: true, runValidators: true }
                );
                return response(form, res, "Form updated", "Form not updated")
            } else if (submittedForm && submittedForm.status === "APPROVED") {
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted"
                })
            }
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.fileDeFuncFiles = async (req, res) => {
    let query = [
        {
            $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state"
            }
        },
        { $unwind: "$state" },
        {
            $project: {
                _id: "$state._id",
                year: "$design_year",
                stateName: "$state.name",
                stateCode: "$state.code",
                responseFile_state: "$responseFile_state.url",
                responseFile_mohua: "$responseFile_mohua.url",
                responseFile: "$responseFile.url",
                file: "$file.url"
            }
        }
    ]
    let data = await GrantTransferCertificate.aggregate(query);
    let documnetcounter = 1;
    working = 0;
    notWorking = 0;
    let arr = []
    let target = data.length;
    let skip = 0;
    let batch = 150;
    while (skip <= target) {
        const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
        await Promise.all(
            slice.map(async el => {
                for (let key in el) {
                   
                    if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                        documnetcounter++;
                        let url = el[key];
                        console.log(url)
                        try {
                            let response = await doRequest(url);
                            let obj = {
                                stateName: "",
                                stateCode: "",
                                key: "",
                                url: "",
                                year: ""
                            }
                            obj.stateName = el.stateName;
                            obj.stateCode = el.stateCode;
                            obj.key = key;
                            obj.url = response
                            obj.year = el.year
                            console.log("ppp", obj)
                            arr.push(obj);
                        } catch (error) {
                            //console.log('working', error)
                            // `error` will be whatever you passed to `reject()` at the top
                        }
                    }
                }
                console.log("arr", arr)
            })
        )
        skip += batch;
    }
    return res.send({
        data: arr,
        number: arr.length,
        total: documnetcounter
    });
}

module.exports.OldFileDeFuncFiles = async (req, res) => {
    let query = [
        {
            $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state"
            }
        },
        { $unwind: "$state" },
        {
            $project: {
                _id: "$state._id",
                year: "$design_year",
                stateName: "$state.name",
                stateCode: "$state.code",
                million_tied: "$million_tied.pdfUrl",
                nonmillion_tied: "$nonmillion_tied.pdfUrl",
                nonmillion_untied: "$nonmillion_untied.pdfUrl"
            }
        }
    ]
    let data = await StateGTCCertificate.aggregate(query);
    // console.log("data",data)
    let documnetcounter = 1;
    working = 0;
    notWorking = 0;
    let arr = []
    let target = data.length;
    let skip = 0;
    let batch = 150;
    while (skip <= target) {
        const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
        await Promise.all(
            slice.map(async el => {
                for (let key in el) {
                  
                    if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                        documnetcounter++;
                        let url = el[key];
                        try {
                            let response = await doRequest(url);
                            console.log("suresh",response)
                            let obj = {
                                stateName: "",
                                stateCode: "",
                                key: "",
                                url: "",
                                year: ""
                            }
                            obj.stateName = el.stateName;
                            obj.stateCode = el.stateCode;
                            obj.key = key;
                            obj.url = response
                            obj.year = el.year
                            // console.log("ppp", obj)
                            arr.push(obj);
                        } catch (error) {
                            console.log('working', error)
                            // `error` will be whatever you passed to `reject()` at the top
                        }
                    }
                }
                // console.log("arr", arr)
            })
        )
        skip += batch;
    }
    return res.send({
        data: arr,
        number: arr.length,
        total: documnetcounter
    });
}

function doRequest(url) {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            method: 'HEAD'
        }
        request(options, (error, resp, body) => {
            if (!error && resp?.statusCode == 404) {
                resolve(url)
            } else {
                reject(url);
            }
        });
    });
}
