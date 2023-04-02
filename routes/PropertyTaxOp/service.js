const PropertyTaxOp = require('../../models/PropertyTaxOp')
const PropertyTaxOpMapper = require('../../models/PropertyTaxOpMapper')
const { response } = require('../../util/response');
const ObjectId = require('mongoose').Types.ObjectId
const { canTakenAction } = require('../CommonActionAPI/service')
const Service = require('../../service');
const { FormNames } = require('../../util/FormNames');
const User = require('../../models/User');
const { checkUndefinedValidations } = require('../../routes/FiscalRanking/service');
const { propertyTaxOpFormJson } = require('./fydynemic')


module.exports.getForm = async (req, res) => {
    try {
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
        let role = req.decoded.role
        const form = await PropertyTaxOp.findOne(condition).lean();
        if (form) {
            Object.assign(form, { canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "ULB", role) })
            return res.status(200).json({
                status: true,
                message: "Form found.",
                data: form
            });
        } else {
            return res.status(400).json({
                status: true,
                message: "Form not found"
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };
        const formName = FormNames["propTaxOp"];

        const { _id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;

        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['ulbSubmit'] = "";

        if (formData.ulb) {
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if (formData.design_year) {
            formData['design_year'] = ObjectId(formData.design_year);
        }
        if (actionTakenByRole === "ULB") {
            formData['status'] = "PENDING";
        }
        let validationResult = validate(data);
        if (validationResult.length !== 0) {
            for (let element of validationResult) {
                if (!element) {
                    return res.status(400).json({
                        status: false,
                        message: "Range should be in between 0 and 999999999999999"
                    })
                }
            }
        }

        let userData = await User.find({
            $or: [
                { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
                { isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
            ]
        }
        ).lean();

        let emailAddress = [];
        let ulbUserData = {},
            stateUserData = {};
        for (let i = 0; i < userData.length; i++) {
            if (userData[i]) {
                if (userData[i].role === "ULB") {
                    ulbUserData = userData[i];
                } else if (userData[i].role === "STATE") {
                    stateUserData = userData[i];
                }
            }
            if (ulbUserData && ulbUserData.commissionerEmail) {
                emailAddress.push(ulbUserData.commissionerEmail);
            }
            if (stateUserData && stateUserData.email) {
                emailAddress.push(stateUserData.email);
            }
            ulbUserData = {};
            stateUserData = {};
        }
        //unique email address
        emailAddress = Array.from(new Set(emailAddress))

        let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(
            ulbName,
            formName
        );
        let mailOptions = {
            Destination: {
                /* required */
                ToAddresses: emailAddress,
            },
            Message: {
                /* required */
                Body: {
                    /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: ulbTemplate.body,
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: ulbTemplate.subject,
                },
            },
            Source: process.env.EMAIL,
            /* required */
            ReplyToAddresses: [process.env.EMAIL],
        };


        const condition = {};
        condition['design_year'] = data.design_year;
        condition['ulb'] = data.ulb;

        if (data.ulb && data.design_year) {
            const submittedForm = await PropertyTaxOp.findOne(condition);
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB") {//Form already submitted    
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData["ulbSubmit"] = new Date();
                    const form = await PropertyTaxOp.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await PropertyTaxOp.findOneAndUpdate(
                            condition,
                            { $push: { "history": formData } },
                            { new: true, runValidators: true }
                        )
                        if (addedHistory) {
                            //email trigger after form submission
                            Service.sendEmail(mailOptions);
                        }
                        return response(addedHistory, res, "Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                } else {
                    if ((!submittedForm) && formData.isDraft === true) { // create as draft
                        const form = await PropertyTaxOp.create(formData);
                        return response(form, res, "Form created", "Form not created");
                    }
                }
            }

            if (submittedForm && submittedForm.status !== "APPROVED") {
                if (formData.isDraft === true) {           //save form as draft to already created form
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        { $set: formData },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form created.", "Form not updated");
                } else { //save form as final submission to already created form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData["ulbSubmit"] = new Date();
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        {
                            $push: { "history": formData },
                            $set: formData
                        },
                        { new: true, runValidators: true }
                    );
                    if (updatedForm) {
                        //email trigger after form submission
                        Service.sendEmail(mailOptions);
                    }
                    return response(updatedForm, res, "Form updated.", "Form not updated.")
                }
            }
            if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB"
                && submittedForm.isDraft === false) {
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted"
                })
            }
        }
        return res.status(400).json({
            status: true,
            message: "ulb and design year are mandatory"
        });
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }

}

function
    validate(data) {
    let result = [];
    if (data.collection2019_20) {
        result.push(data.collection2019_20 >= 0 && data.collection2019_20 < 999999999999999);
    } else if (data.collection2020_21) {
        result.push(data.collection2020_21 >= 0 && data.collection2020_21 < 999999999999999);
    } else if (data.collection2021_22) {
        result.push(data.collection2021_22 >= 0 && data.collection2021_22 < 999999999999999);
    } else if (data.target2022_23) {
        result.push(data.target2022_23 >= 0 && data.target2022_23 < 999999999999999);
    }
    return result;
}
//// New year
module.exports.createOrUpdate = async (req, res) => {
    try {
        let { ulbId, formId, actions, design_year, isDraft } = req.body
        let { role, _id: userId } = req.decoded
        let response = {}
        let formIdValidations = await checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId)
        if (!formIdValidations.valid) {
            response.message = formIdValidations.message
            return res.status(500).json(response)
        }
        let validation = await checkUndefinedValidations({
            "ulb": ulbId,
            "formId": formId,
            "actions": actions,
            "design_year": design_year
        })
        if (!validation.valid) {
            response.message = validation.message
            return res.status(500).json(response)
        }
        let calculationsTabWise = await calculateAndUpdateStatusForMappers(actions, ulbId, formId, design_year, true, isDraft)
        response.success = true
        response.formId = formId
        response.message = "Form submitted successfully"
        return res.status(200).json(response)
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}
async function checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId) {
    return new Promise(async (resolve, reject) => {
        try {
            let validation = { message: "", valid: true, formId: null }
            let condition = { ulb: ObjectId(ulbId), design_year: ObjectId(design_year) };
            let formData = await PropertyTaxOp.findOne(condition, { "_id": 1 }).lean();
            if (!formData) {
                let form = await PropertyTaxOp.create(
                    {
                        ulb: ObjectId(ulbId),
                        design_year: ObjectId(design_year),
                        actionTakenByRole: role,
                        actionTakenBy: userId,
                        status: "PENDING",
                        isDraft
                    }
                )
                form.save()
                validation.message = "form created"
                validation.valid = true
                validation.formId = form._id
            } else {
                let form = await PropertyTaxOp.findOneAndUpdate(condition, { "isDraft": isDraft })
                if (form) {
                    validation.message = "form exists"
                    validation.valid = true
                    validation.formId = form._id
                }
                else {
                    validation.message = "No form exists for the form Id"
                    validation.valid = false
                }
            }
            resolve(validation)
        } catch (err) {
            validation.message = "Some error occured"
            if (err.code && err.code === 11000) {
                validation.message = "form for this ulb and design year already exists"
            }
            validation.valid = false
            console.log("error in checkIfFormIdExistsornot ::: ", err.message)
            reject(validation)
        }
    })
}
async function calculateAndUpdateStatusForMappers(tabs, ulbId, formId, year, updateForm, isDraft) {
    try {
        let conditionalObj = {}
        let ignorablevariables = ["guidanceNotes"]
        const fiscalRankingKeys = ["ownRevDetails", "webLink", "totalOwnRevenueArea", "signedCopyOfFile", "otherUpload"]
        for (var tab of tabs) {
            conditionalObj[tab._id.toString()] = {}
            let key = tab.id
            let obj = tab.data
            let temp = {
                "comment": tab.feedback.comment,
                "status": []
            }
            for (var k in tab.data) {
                if (ignorablevariables.includes(k) || obj[k].status === "") {
                    continue
                }
                if (obj[k].yearData) {
                    let yearArr = obj[k].yearData
                    let dynamicObj = obj[k]
                    let status = yearArr.every((item) => {
                        if (Object.keys(item).length) {
                            return item.status === "APPROVED"
                        } else {
                            return true
                        }
                    })
                    temp["status"].push(status)
                    await updateQueryForPropertyTaxOp(yearArr, ulbId, formId, fiscalRankingKeys, updateForm, dynamicObj)
                } else {
                    if (key === priorTabsForFiscalRanking["basicUlbDetails"] || key === priorTabsForFiscalRanking['conInfo'] || fiscalRankingKeys.includes(k)) {
                        let statueses = getStatusesFromObject(tab.data, "status", ["population11"])
                        let finalStatus = statueses.every(item => item === "APPROVED")
                        temp['status'].push(finalStatus)
                        await updatePropertyTaxOpForm(tab.data, ulbId, formId, year, updateForm, isDraft)
                    }
                }
                conditionalObj[tab._id.toString()] = (temp)
            }
        }
        for (var tabName in conditionalObj) {
            if (conditionalObj[tabName].status.length > 0) {
                conditionalObj[tabName].status = conditionalObj[tabName].status.every(item => item == true)
            }
            else {
                conditionalObj[tabName].status = "NA"
            }
        }
        return conditionalObj
    } catch (err) {
        console.log("error in calculatAndUpdateStatusForMappers :: ", err.message)
        throw err
    }
}
async function updatePropertyTaxOpForm(obj, ulbId, formId, year, updateForm, isDraft) {
    try {
        let filter = { "_id": ObjectId(formId) }
        let payload = {}
        for (let key in obj) {
            if (updateForm) {
                payload[`${key}.value`] = obj[key].value
                payload[`${key}.status`] = obj[key].status
            } else {
                let status = null
                if (obj[key].status) {
                    status = obj[key].status
                }
                payload[`${key}.status`] = status
            }
        }
        await PropertyTaxOp.findOneAndUpdate(filter, payload)
    }
    catch (err) {
        console.log("Error in updatePropertyTaxOp ::: ", err)
        throw err
    }
}
async function updateQueryForPropertyTaxOp(yearData, ulbId, formId, mainFormContent, updateForm, dynamicObj) {
    try {
        for (var years of yearData) {
            let upsert = false
            if (years.year) {
                let filter = {
                    "year": ObjectId(years.year),
                    "ulb": ObjectId(ulbId),
                    "ptoId": ObjectId(formId),
                    "type": years.type
                }
                let payload = { ...filter }
                if (updateForm) {
                    upsert = true
                    payload['value'] = years.value
                    payload['date'] = years.date
                    payload['file'] = years.file
                    payload['status'] = years.status
                    payload['displayPriority'] = dynamicObj.position
                } else {
                    payload["status"] = years.status
                }
                let up = await PropertyTaxOpMapper.findOneAndUpdate(filter, payload, { "upsert": upsert })
            } else if (mainFormContent.includes(years.key)) {
                let payload = {}
                let filter = {
                    "_id": ObjectId(formId),
                }
                if (updateForm) {
                    payload[`${years.key}.value`] = years.value
                }
                else {
                    payload[`${years.key}.status`] = years.status
                }
                await PropertyTaxOpMapper.findOneAndUpdate(filter, payload)
            }
        }
    } catch (err) {
        if (err.type === 'ValidationError') {
            throw err
        }
    }
}

exports.getView = async function (req, res, next) {
    try {
        let condition = {};
        if (!req.query.ulb && !req.query.design_year) {
            return res.status(400).json({ status: false, message: "Something error wrong!" });
        }
        condition = { ulb: ObjectId(req.query.ulb), design_year: ObjectId(req.query.design_year) };
        let ptoData = await PropertyTaxOp.findOne(condition, { history: 0 }).lean();
        let ptoMaper = null;
        if (ptoData) {
            ptoMaper = await PropertyTaxOpMapper.find({ ulb: ObjectId(req.query.ulb), ptoId: ObjectId(ptoData._id) }).lean();
        }
        let fyDynemic = await propertyTaxOpFormJson();
        for (let sortKey in fyDynemic) {
            if (sortKey !== "tabs" && ptoData) {
                fyDynemic[sortKey] = ptoData[sortKey];
            } else {
                for (const k of ['tabs']) {
                    let { data } = fyDynemic[k][0];
                    for (let el in data) {
                        let { yearData, mData } = data[el];
                        if (Array.isArray(yearData) && ptoMaper.length) {
                            for (const pf of yearData) {
                                let d = ptoMaper.find(({ type, year }) => type === pf.type && year.toString() === pf.year);
                                pf.file ? (pf.file = d ? d.file : "") : pf.date ? (pf.date = d ? d.date : "") : (pf.value = d ? d.value : "");
                            }
                        } else if (Array.isArray(mData) && ptoData.length) {
                            for (const dk of mData) {
                                const { value, status } = ptoData[dk];
                                dk['status'] = status;
                                dk['value'] = value;
                            }
                        }
                    }
                }
            }
        }
        return res.status(200).json({ status: true, message: "Success fetched data!", data: fyDynemic });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something error wrong!" });
    }
};