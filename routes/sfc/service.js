const SFC = require('../../models/SFC');
const FormsJson = require("../../models/FormsJson");
const CurrentStatus = require("../../models/CurrentStatus");

const ObjectId = require('mongoose').Types.ObjectId;
// const { canTakenAction } = require('../CommonActionAPI/service')
const { sfcForm } = require('./constant')
const userTypes = require("../../util/userTypes")
const { FormNames, MASTER_STATUS_ID, MASTER_STATUS, MASTER_FORM_STATUS, FORMIDs } = require('../../util/FormNames');
const { saveStatusAndHistory } = require("../CommonFormSubmission/service");

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
        // TODO get it from db
        // let sfcForms = sfcForm;
        condition.state = data.state;
        condition.design_year = data.design_year;
        let role = req.decoded.role;
        const form = await SFC.findOne(condition).lean();

        return res.status(200).json({
            status: true,
            data: await setForm(req, form)
        })
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

async function setForm(req, form) {
    let role = req.decoded.role;

    let readOnly = [1, 2, 5, 7].includes(form?.currentFormStatus) && role === userTypes.state ? false : true;

    sfcForm['isDraft'] = form ? form.isDraft : true;

    sfcForm['state'] = form?.ulb || req.query.state;
    sfcForm['design_year'] = form?.design_year || req.query.design_year;
    sfcForm['statusId'] = form?.currentFormStatus || MASTER_STATUS['Not Started'];
    sfcForm['status'] = MASTER_STATUS_ID[form?.currentFormStatus] || MASTER_STATUS_ID[1];
    sfcForm['currentFormStatus'] = form?.currentFormStatus ? form?.currentFormStatus : MASTER_FORM_STATUS['NOT_STARTED'];
    sfcForm['canTakeAction'] = (form?.currentFormStatus == MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'] && role == userTypes.mohua);

    if (form) {
        let currentStatuses = await CurrentStatus.findOne({
            recordId: form._id,
        }).sort({
            "modifiedAt": -1
        });

        // let currentStatus = currentStatuses.find(item => item.recordId.toString() === form?._id?.toString() && item.shortKey === shortKey)
        if (currentStatuses) {
            sfcForm['responseFile'] = currentStatuses?.responseFile || "";
            sfcForm['rejectReason'] = currentStatuses?.rejectReason || "";
        }


        // Object.assign(form, { canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "STATE", role) });

        form.data.forEach(element => {
            let keyData = sfcForm.tabs[0].data[element.key];
            if (keyData) {
                keyData.yearData[0].readonly = readOnly;
                keyData.yearData[0] = setValue(keyData.yearData[0], element);
            }
        });
    }
    return sfcForm;
}

function setValue(data, yearData) {
    switch (data.formFieldType) {
        case 'file':
            data['file'] = yearData.file;
            break;
        case 'date':
            data['date'] = yearData.date;
            break;
        default:
            data['value'] = yearData.value;
            break;
    }
    return data;
}

function processFormData(reqData) {
    let sfcData = [];

    const objData = reqData.actions[0].data;

    for (const [key, value] of Object.entries(reqData.actions[0].data)) {
        const data = {
            key: key,
            formFieldType: value.yearData[0].formFieldType,
        };
        const yearData = value.yearData[0];
        sfcData.push(setValue(data, yearData));
    }
    return sfcData;
}
module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const reqData = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...reqData };

        if (formData.state) {
            formData.state = ObjectId(formData.state);
        }
        if (formData.design_year) {
            formData.design_year = ObjectId(formData.design_year);
        }
        const { _id: actionTakenBy, role: actionTakenByRole } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['status'] = 'PENDING';
        formData['stateSubmit'] = ""
        formData['data'] = processFormData(reqData);
        const condition = {};
        condition.state = reqData.state;
        condition.design_year = reqData.design_year;


        if (reqData.state && reqData.design_year) {
            const submittedForm = await SFC.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "STATE") {//Form already submitted                
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData['stateSubmit'] = new Date()
                    const form = await SFC.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await SFC.findOneAndUpdate(
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
                        const form = await SFC.create(formData);
                        return response(form, res, "Form created.", "Form not created");
                    }
                }
            }
            if (submittedForm && submittedForm.status !== "APPROVED") { //form exists and saved as draft
                if (formData.isDraft === true) { //  update form as draft
                    const updatedForm = await SFC.findOneAndUpdate(
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
                    const updatedForm = await SFC.findOneAndUpdate(
                        condition,
                        {
                            $push: { "history": formData },
                            $set: formData
                        },
                        { new: true, runValidators: true }
                    );
                    let formSubmit = [{ ...req.body, _id: updatedForm._id, currentFormStatus: req.body.currentFormStatus }]
                    await createHistory({ formBodyStatus: Number(req.body.currentFormStatus), formSubmit, actionTakenByRole: req.decoded.role, actionTakenBy: req.body.actionTakenBy })
                    return response(updatedForm, res, "Form updated.", "Form not updated.")
                }
            }
            if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole === "MoHUA"
                && submittedForm.isDraft === false) {
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted"
                })
            }
        }
    } catch (error) {
        console.log('error', error);
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}


module.exports.reviewAction = async (req, res) => {

    try {
        let { role, mohua } = req.decoded
        if (role !== userTypes.mohua) {
            return res.json({
                "success": true,
                "message": "Not permitted"
            })
        }
        const {
            // key,
            rejectReason,
            responseFile,
            statusId,
            // installment,
            design_year,
            state,
        } = req.body;

        const found = await SFC.findOneAndUpdate({
            // installment,
            // year: ObjectId(year),
            // type,
            // type: key,
            design_year: ObjectId(design_year),
            state: ObjectId(state)
        }, {
            $set: {
                actionTakenBy: mohua || state,
                actionTakenByRole: role,
                currentFormStatus: statusId,
                rejectReason_mohua: rejectReason,
                responseFile_mohua: responseFile
            }
        });
        req.body._id = found?._id
        req.body.financialYear = design_year
        let formSubmit = [{ ...req.body, currentFormStatus: statusId }]
        await createHistory({ formBodyStatus: Number(statusId), formSubmit, actionTakenByRole: role, actionTakenBy: mohua || state })
        if (!found) return res.status(404).json({ message: 'Installment not found' });
        res.status(200).json({
            success: true,
            message: 'Action recorded'
        });

        // Send mail to state when mahua take action in this form.
        // await emailTriggerWithMohuaAction(state, statusId, rejectReason, FORMIDs['GrantAllocation']);
        return;

    }
    catch (err) {
        console.log('err', err);
        let message = ["demo", "staging"].includes(process.env.ENV) ? err.message : "something went wrong"
        return res.status(404).json({
            success: true,
            message,
        })
    }
}

async function createHistory(params) {
    try {
        let { formBodyStatus, actionTakenBy, actionTakenByRole, formSubmit, formType } = params
        let formData = formSubmit[0]
        // let shortKey = `${formData.type}_${getKeyByValue(years, formData.design_year)}_${formData.installment}`
        let historyParams = {
            formBodyStatus,
            actionTakenBy: actionTakenBy,
            actionTakenByRole: actionTakenByRole,
            formSubmit: formSubmit,
            formType: "GrantAllocation",
            // shortKey: shortKey,
        }

        await saveStatusAndHistory(historyParams)
    }
    catch (err) {
        console.log("error in createHistory ::: ", err.message)
    }
}

// TODO: remove function
module.exports.createOrUpdateForm_bkp = async (req, res) => {
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
        formData['status'] = 'PENDING';
        formData['stateSubmit'] = ""
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;


        if (data.state && data.design_year) {
            const submittedForm = await SFC.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "STATE") {//Form already submitted                
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData['stateSubmit'] = new Date()
                    const form = await SFC.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await SFC.findOneAndUpdate(
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
                        const form = await SFC.create(formData);
                        return response(form, res, "Form created.", "Form not created");
                    }
                }
            }
            if (submittedForm && submittedForm.status !== "APPROVED") { //form exists and saved as draft
                if (formData.isDraft === true) { //  update form as draft
                    const updatedForm = await SFC.findOneAndUpdate(
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
                    const updatedForm = await SFC.findOneAndUpdate(
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
            if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole === "MoHUA"
                && submittedForm.isDraft === false) {
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
        })
    }
}