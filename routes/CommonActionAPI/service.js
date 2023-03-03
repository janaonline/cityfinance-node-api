const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const moongose = require('mongoose')
const StatusList = require('../../util/newStatusList')
const catchAsync = require('../../util/catchAsync')
const ObjectId = require("mongoose").Types.ObjectId;
const Sidemenu = require('../../models/Sidemenu');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const { FormNames } = require('../../util/FormNames');
const { calculateTabwiseStatus } = require('../annual-accounts/utilFunc')
module.exports.calculateStatus = (status, actionTakenByRole, isDraft, formType) => {
    switch (formType) {
        case "ULB":
            switch (true) {
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && isDraft:
                    return StatusList.In_Progress
                    break;
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && !isDraft:
                    return StatusList.Under_Review_By_State
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Rejected_By_State
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;
                case status == "PENDING" && actionTakenByRole == "MoHUA" && isDraft:
                    return StatusList.Under_Review_By_MoHUA

                default:
                    return StatusList.Not_Started
                    break;
            }
            break;
        case "STATE":
            switch (true) {
                case status == 'PENDING' && actionTakenByRole == 'STATE' && isDraft:
                    return StatusList.In_Progress
                    break;
                case status == 'PENDING' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;

                default:
                    return StatusList.Not_Started
                    break;
            }
            break;
    }
}

module.exports.calculateStatusForFiscalRankingForms = (status, actionTakenByRole, isDraft, formType) => {
    switch (formType) {
        case "ULB":
            switch (true) {
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && isDraft:
                    return StatusList.In_Progress
                    break;
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;
                case status == "PENDING" && actionTakenByRole == "MoHUA" && isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;

                default:
                    return StatusList.Not_Started
                    break;
            }

        case "MoHua":
            switch (true) {
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && isDraft:
                    return StatusList.In_Progress
                    break;
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;

                case status == "PENDING" && actionTakenByRole == "MoHUA" && isDraft:
                    return StatusList.Under_Review_By_MoHUA

                default:
                    return StatusList.Not_Started
                    break;
            }
            break;


    }
}

module.exports.canTakenAction = (status, actionTakenByRole, isDraft, formType, loggedInUser) => {
    switch (formType) {
        case "ULB":
            if (loggedInUser == "STATE") {
                if (actionTakenByRole == "ULB" && !isDraft) {
                    return true;
                } else {
                    return false;
                }
            } else if (loggedInUser == "MoHUA") {
                if (
                    actionTakenByRole == "STATE" &&
                    status == "APPROVED" &&
                    !isDraft
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

            break;

        case "STATE":
            if (loggedInUser == "MoHUA") {
                if (actionTakenByRole == "STATE" && !isDraft) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

            break;

        default:
            break;
    }

}

module.exports.calculateKeys = (formStatus, formType) => {
    let keys = {
        [`formData.status`]: "",
        [`formData.actionTakenByRole`]: "",
        [`formData.isDraft`]: ""
    };
    switch (formType) {
        case "ULB":
            switch (formStatus) {
                case StatusList.In_Progress:
                    keys = {

                        [`formData.status`]: "PENDING",
                        [`formData.actionTakenByRole`]: "ULB",
                        [`formData.isDraft`]: true
                    }
                    break;
                case StatusList.Under_Review_By_State:
                    keys = {
                        [`formData.status`]: "PENDING",
                        [`formData.actionTakenByRole`]: "ULB",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Under_Review_By_MoHUA:
                    keys = {
                        [`formData.status`]: "APPROVED",
                        [`formData.actionTakenByRole`]: "STATE",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Rejected_By_State:
                    keys = {
                        [`formData.status`]: "REJECTED",
                        [`formData.actionTakenByRole`]: "STATE",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Approved_By_MoHUA:
                    keys = {
                        [`formData.status`]: "APPROVED",
                        [`formData.actionTakenByRole`]: "MoHUA",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Rejected_By_MoHUA:
                    keys = {
                        [`formData.status`]: "REJECTED",
                        [`formData.actionTakenByRole`]: "MoHUA",
                        [`formData.isDraft`]: false
                    }
                    break;
                default:
                    break;
            }
            break;
        case "STATE":
            switch (formStatus) {
                case StatusList.In_Progress:
                    keys = {
                        [`formData.isDraft`]: true,
                        [`formData.actionTakenByRole`]: "STATE",
                        [`formData.status`]: "PENDING"
                    }
                    break;
                case StatusList.Under_Review_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]: false,
                        [`formData.actionTakenByRole`]: "STATE",
                        [`formData.status`]: "PENDING"
                    }
                    break;
                case StatusList.Approved_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]: false,
                        [`formData.actionTakenByRole`]: "MoHUA",
                        [`formData.status`]: "APPROVED"
                    }
                    break;
                case StatusList.Rejected_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]: false,
                        [`formData.actionTakenByRole`]: "MoHUA",
                        [`formData.status`]: "REJECTED"
                    }
                    break;
                default:
                    break;
            }
            break;
    }
    return keys;
}

function getCollectionName(formName) {
    let collection = "";
    switch (formName) {
        case "Grant Transfer Certificate":
            collection = GrantTransferCertificate;
            break;
        case "Detailed Utilisation Report":
            collection = UtilizationReport;
            break;
        case "Annual Accounts":
            collection = AnnualAccounts;
            break;
        case "Linking of PFMS Account":
            collection = LinkPFMS;
            break;
        case "Property Tax Operationalisation":
            collection = PropertyTaxOp;
            break;
        case "SLBs for Water Supply and Sanitation":
            collection = XVFcGrantForm;
            break;
        case "Open Defecation Free (ODF)":
            collection = OdfFormCollection;
            break;
        case "Garbage Free City (GFC)":
            collection = GfcFormCollection;
            break;
        case "28 SLBs":
            collection = TwentyEightSlbsForm;
            break;
        case "Property tax floor rate Notification":
            collection = PropertyTaxFloorRate;
            break;
        case "State Finance Commission Notification":
            collection = StateFinanceCommissionFormation;
            break;
    }
    return collection;
}

module.exports.getForms = async (req, res) => {
    try {
        const data = req.body;
        const masterForm = await Sidemenu.findOne({ _id: data.formId });
        const collection = getCollectionName(masterForm.name);
        let condition = {};
        if (collection === UtilizationReport) {
            condition.design_year = "designYear"
        } else {
            condition.design_year = "design_year"
        }
        let forms;
        if (masterForm.role === "ULB") {
            forms = await collection.find(
                { ulb: { $in: data.ulb }, [condition.design_year]: data.design_year },
                { history: 0 }
            )

        } else if (masterForm.role === "STATE") {
            forms = await collection.find(
                { state: { $in: data.state }, [condition.design_year]: data.design_year },
                { history: 0 }
            )

        }
        if (!forms || forms.length === 0) {
            return res.status(400).json({
                status: false,
                message: 'Form not found.'
            })
        }
        return res.status(200).json({
            status: true,
            message: 'Success',
            data: forms
        })
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.updateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;

        let ulb = "", state = "", stateData = "";
        let singleForm; //to return updated response for single ulb
        const masterForm = await Sidemenu.findOne({ _id: ObjectId(data.formId) }).lean();
        if (user.role != 'ULB' && user.role != 'STATE' && user.role != 'MoHUA') {
            return res.status(403).json({
                success: false,
                message: "Not AUthorized to perform this action"
            })
        }
        if (!masterForm) {
            return res.status(400).json({
                status: false,
                message: "Form not found"
            })
        }
        const formType = masterForm.role;

        const collection = getCollectionName(masterForm.name);
        const formData = {};
        const { role: actionTakenByRole, _id: actionTakenBy } = user;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = actionTakenBy;
        formData['status'] = data.status;

        //Check if role is other than STATE or MoHUA
        if (actionTakenByRole !== "STATE" && actionTakenByRole !== "MoHUA") {
            return res.status(401).json({
                status: false,
                message: "Not authorized"
            })
        }
        //add reject reason and response file based on role
        //    if(masterForm.name != FormNames.annualAcc ){
        if (actionTakenByRole === "STATE") {
            formData['rejectReason_state'] = data.rejectReason;
            formData['responseFile_state'] = data.responseFile;
            // formData['responseFile']['url'] = data.responseFile.url;
        } else if (actionTakenByRole === "MoHUA") {
            formData['rejectReason_mohua'] = data.rejectReason;
            formData['responseFile_mohua'] = data.responseFile;
        }
        //    }

        let condition = {};
        if (collection === UtilizationReport) {
            condition.design_year = "designYear"
        } else {
            condition.design_year = "design_year"
        }
        let forms = "";
        if (formType === "STATE") {
            forms = await collection
                .find({
                    state: { $in: data.state },
                    [condition.design_year]: data.design_year,
                })
                .lean();
        } else if (formType === "ULB") {
            forms = await collection
                .find({
                    ulb: { $in: data.ulb },
                    [condition.design_year]: data.design_year,
                })
                .lean();
        }
        let form = {}, numberOfFormsUpdated = 0;
        if (formType === "ULB") {
            for (let i = 0; i < data.ulb.length; i++) {//update status and add history
                ulb = data.ulb[i];
                form = forms[i];
                if (form === undefined) continue;
                form['actionTakenByRole'] = formData.actionTakenByRole;
                form['actionTakenBy'] = formData.actionTakenBy;
                form['status'] = formData.status;
                form['modifiedAt'] = new Date();
                form['rejectReason'] = data.rejectReason
                form['responseFile'] = data.responseFile
                if (masterForm.name == "Annual Accounts") {

                    form['common'] = true
                    if (form.audited.submit_annual_accounts) {
                        for (let key in form.audited.provisional_data) {
                            if (typeof form.audited.provisional_data[key] == 'object' && form.audited.provisional_data[key] != null) {
                                if (form.audited.provisional_data[key]) {
                                    if (actionTakenByRole === "STATE") {
                                        form.audited.provisional_data[key]['status'] = formData.status
                                        form.audited.provisional_data[key]['rejectReason_state'] = formData.rejectReason_state
                                        form.audited.provisional_data[key]['responseFile_state'] = formData.responseFile_state
                                    }
                                    else if (actionTakenByRole === "MoHUA") {
                                        form.audited.provisional_data[key]['status'] = formData.status
                                        form.audited.provisional_data[key]['rejectReason_mohua'] = formData.rejectReason_mohua
                                        form.audited.provisional_data[key]['responseFile_mohua'] = formData.responseFile_mohua
                                    }
                                }
                            }


                        }
                    }
                    if (form.unAudited.submit_annual_accounts) {
                        for (let key in form.unAudited.provisional_data) {
                            if (typeof form.unAudited.provisional_data[key] == 'object' && form.audited.provisional_data[key] != null) {
                                if (form.unAudited.provisional_data[key]) {
                                    if (actionTakenByRole === "STATE") {
                                        form.unAudited.provisional_data[key]['status'] = formData.status
                                        form.unAudited.provisional_data[key]['rejectReason_state'] = formData.rejectReason_state
                                        form.unAudited.provisional_data[key]['responseFile_state'] = formData.responseFile_state
                                    } else if (actionTakenByRole === "MoHUA") {
                                        form.unAudited.provisional_data[key]['status'] = formData.status
                                        form.unAudited.provisional_data[key]['rejectReason_mohua'] = formData.rejectReason_mohua
                                        form.unAudited.provisional_data[key]['responseFile_mohua'] = formData.responseFile_mohua
                                    }
                                }
                            }
                        }
                    }
                    if (form.audited) {
                        if (actionTakenByRole === "STATE") {
                            form.audited['status'] = formData.status
                            form.audited['rejectReason_state'] = formData.rejectReason_state
                            form.audited['responseFile_state'] = formData.responseFile_state
                        } else if (actionTakenByRole === "MoHUA") {
                            form.audited['status'] = formData.status
                            form.audited['rejectReason_mohua'] = formData.rejectReason_mohua
                            form.audited['responseFile_mohua'] = formData.responseFile_mohua
                        }
                    }
                    if (form.unAudited) {
                        if (actionTakenByRole === "STATE") {
                            form.unAudited['status'] = formData.status
                            form.unAudited['rejectReason_state'] = formData.rejectReason_state
                            form.unAudited['responseFile_state'] = formData.responseFile_state
                        } else if (actionTakenByRole === "MoHUA") {
                            form.unAudited['status'] = formData.status
                            form.unAudited['rejectReason_mohua'] = formData.rejectReason_mohua
                            form.unAudited['responseFile_mohua'] = formData.responseFile_mohua
                        }
                    }
                    form = calculateTabwiseStatus(form)

                }
                //add reject reason/responseFile for single ulb entry
                if (masterForm.name != "Annual Accounts") {
                    if (actionTakenByRole === 'STATE') {
                        form['rejectReason_state'] = data.rejectReason;
                        form['responseFile_state'] = data.responseFile;
                    } else if (actionTakenByRole === 'MoHUA') {
                        form['rejectReason_mohua'] = data.rejectReason;
                        form['responseFile_mohua'] = data.responseFile;
                    }
                }
                delete form['history'];
                let formHistory = JSON.parse(JSON.stringify(form))
                delete form["_id"];
                delete form['ulb'];
                delete form['design_year'];
                let updatedForm = await collection.findOneAndUpdate(
                    { ulb, [condition.design_year]: data.design_year },
                    { $set: form, $push: { history: formHistory } },
                    { new: true, runValidators: true }
                );
                numberOfFormsUpdated++;
                singleForm = updatedForm;
            }
        } else if (formType === "STATE") {
            if (masterForm.name === FormNames.gtc) {
                if (data.statesData.length > 0) {
                    form = findTarget(data.statesData[0], forms);
                    stateData = data.statesData[0];

                    form["actionTakenByRole"] = formData.actionTakenByRole;
                    form["actionTakenBy"] = formData.actionTakenBy;
                    form["modifiedAt"] = new Date();
                    form["status"] = formData["status"];

                    //add reject reason/responseFile for single state entry
                    if (actionTakenByRole === "MoHUA") {
                        form["rejectReason_mohua"] = data["rejectReason"] ? data["rejectReason"] : data["rejectReason_mohua"];
                        form["responseFile_mohua"] = data["responseFile"];
                        formData['rejectReason_mohua'] = data["rejectReason"] ? data["rejectReason"] : data["rejectReason_mohua"]
                    }
                    delete form["history"];
                    let updatedForm = await collection
                        .findOneAndUpdate(
                            stateData,
                            { $set: formData, $push: { history: form } },
                            { new: true, runValidators: true }
                        )
                        .lean();
                    numberOfFormsUpdated++;
                    singleForm = updatedForm;
                } else if (data.statesData.length === 0) {
                    for (let i = 0; i < data.state.length; i++) {

                        state = data.state[i];
                        let stateForms = findForm(forms, state);
                        for (let j = 0; j < stateForms.length; j++) {
                            form = stateForms[j];
                            if (form === undefined || form.actionTakenByRole === "MoHUA") {
                                continue;
                            }

                            form["actionTakenByRole"] = formData.actionTakenByRole;
                            form["actionTakenBy"] = formData.actionTakenBy;
                            form["status"] = formData.status;
                            form["modifiedAt"] = new Date();

                            //add reject reason/responseFile for single ulb entry
                            if (actionTakenByRole === "MoHUA") {
                                form["rejectReason_mohua"] = data["rejectReason"];
                                form["responseFile_mohua"] = data.responseFile;
                                formData['rejectReason_mohua'] = data["rejectReason"]
                            }
                            delete form["history"];
                            let updatedForm = await collection.findOneAndUpdate(
                                {
                                    state, [condition.design_year]: data.design_year,
                                    type: form.type,
                                    installment: form.installment,
                                    year: form.year
                                },
                                { $set: formData, $push: { history: form } },
                                { new: true, runValidators: true }
                            );
                            numberOfFormsUpdated++;
                            singleForm = updatedForm;

                        }
                    }
                }
            } else {
                for (let i = 0; i < data.state.length; i++) {//update status and add history
                    state = data.state[i];
                    form = forms[i];
                    if (form === undefined) continue;
                    form['actionTakenByRole'] = formData.actionTakenByRole;
                    form['actionTakenBy'] = formData.actionTakenBy;
                    form['status'] = formData.status;
                    form['modifiedAt'] = new Date();

                    //add reject reason/responseFile for single ulb entry
                    if (actionTakenByRole === 'MoHUA') {
                        form['rejectReason_mohua'] = data.rejectReason;
                        form['responseFile_mohua'] = data.responseFile;
                    }
                    delete form['history'];
                    let updatedForm = await collection.findOneAndUpdate(
                        { state, [condition.design_year]: data.design_year },
                        { $set: form, $push: { history: form } },
                        { new: true, runValidators: true }
                    );
                    numberOfFormsUpdated++;
                    singleForm = updatedForm;
                }
            }
        }
        if (numberOfFormsUpdated === 1) {
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} form ${data.status ?? "updated."}`,
                data: singleForm

            });
        } else if (numberOfFormsUpdated > 1) {
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} forms ${data.status ?? "updated."}`,
            })
        } else {
            return res.status(200).json({
                status: false,
                message: "No forms updated"
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.annualaccount = catchAsync(async (req, res) => {
    const data = req.body;
    const user = req.decoded;
    let ulb = "";
    let singleUlb; //to return updated response for single ulb
    const masterForm = await Sidemenu.findOne({ _id: ObjectId(data.formId) }).lean();
    if (user.role != 'ULB' && user.role != 'STATE' && user.role != 'MoHUA') {
        return res.status(403).json({
            success: false,
            message: "Not AUthorized to perform this action"
        })
    }

    if (!masterForm) {
        return res.status(400).json({
            status: false,
            message: "Form not found"
        })
    }

    const collection = getCollectionName(masterForm.name);
    const formData = {};
    const { role: actionTakenByRole, _id: actionTakenBy } = user;
    formData['actionTakenByRole'] = actionTakenByRole;
    formData['actionTakenBy'] = actionTakenBy;
    formData['status'] = data.status;

    //Check if role is other than STATE or MoHUA
    if (actionTakenByRole !== "STATE" && actionTakenByRole !== "MoHUA") {
        return res.status(401).json({
            status: false,
            message: "Not authorized"
        })
    }
    //add reject reason and response file based on role
    // if(actionTakenByRole === "STATE"){
    //     formData['rejectReason_state'] = data.rejectReason;
    //     formData['responseFile_state'] = data.responseFile;
    //     // formData['responseFile']['url'] = data.responseFile.url;
    // }else if (actionTakenByRole === "MoHUA"){
    //     formData['rejectReason_mohua'] = data.rejectReason;
    //     formData['responseFile_mohua'] = data.responseFile;     
    // }
    let condition = {};
    const forms = await collection.find({ ulb: { $in: data.ulb }, [condition.design_year]: data.design_year }).lean();
    let form = {}, numberOfFormsUpdated = 0;
    for (let i = 0; i < data.ulb.length; i++) {
        ulb = data.ulb[i];
        form = forms[i];
        if (form === undefined) continue;
        form['actionTakenByRole'] = formData.actionTakenByRole;
        form['actionTakenBy'] = formData.actionTakenBy;
        form['status'] = formData.status;
        form['modifiedAt'] = new Date();
        form['history'] = undefined;
        let updatedForm = await collection.findOneAndUpdate(
            { ulb, [condition.design_year]: data.design_year },
            { $set: formData, $push: { history: form } },
            { new: true, runValidators: true }
        );
        numberOfFormsUpdated++;
        singleUlb = updatedForm;
    }//update status and add history

})


function findTarget(target, arr) {
    let obj = "";
    let targetArr = arr.filter((element) => {
        let form = {
            state: element.state,
            design_year: element.design_year,
            type: element.type,
            installment: element.installment,
            year: element.year
        }
        let targetObj = {
            state: target.state,
            design_year: target.design_year,
            type: target.type,
            installment: target.installment,
            year: target.year
        }
        if (JSON.stringify(form) === JSON.stringify(targetObj)) {
            return element;
        }
    })
    if (targetArr.length === 1) {
        obj = targetArr[0];
    }
    return obj;
}


function findForm(formArray, stateId) {
    let forms = formArray.filter((element) => {
        return element.state.toString() === stateId.toString()
    })
    return forms;
}

let apiUrls = {
    "demo": "https://democityfinanceapi.dhwaniris.in/api/v1/",
    "staging": "https://staging.cityfinance.in/api/v1/",
    "production": "https://cityfinance.in/api/v1/"
}

// db.getCollection('ulbs').aggregate([
//     {
//         $lookup: {
//             from: "states",
//             localField: "state",
//             foreignField: "_id",
//             as: "state"
//         }
//   },
//   {$unwind : "$state"},
//   {
//       $lookup: {
//             from: "annualaccountdatas",
//             localField: "_id",
//             foreignField: "ulb",
//             as: "annualaccountdata",

//         }  
//   },
// ])
function writeCsv(cols, csvCols, ele, res, cb) {
    let dbCOls = Object.keys(csvCols)
    try {
        let str = ""
        for (let key of dbCOls) {
            if (cb) {
                ele = cb(ele)
            }
            if (ele[key]) {
                str += ele[key] + ","
            }
            else {
                str += " " + ","
            }

        }
        res.write(str + "\r\n")
    }
    catch (err) {
        console.log("error in writeCsv :: ", err.message)
    }
}


/**
 * function that creates csv only for aggregation queries
 * @param {*} modelName 
 * @param {*} query 
 * @param {*} res 
 * @param {*} cols 
 */
function sendCsv(filename, modelName, query, res, cols, csvCols, fromArr, cb = null) {
    try {

        let cursor = moongose.model(modelName).aggregate(query).cursor({ batchSize: 500 }).addCursorFlag('noCursorTimeout', true).exec()
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
        res.write(cols.join(","))
        res.write("\r\n")
        cursor.on("data", (document) => {
            if (fromArr) {
                for (let ele of document[fromArr]) {
                    writeCsv(cols, csvCols, ele, res, cb)
                }
            }
            else {
                writeCsv(cols, csvCols, document, res, cb)
            }
        })
        cursor.on("end", (el) => {
            res.end()
            console.log("ended")
        })
    }
    catch (err) {
        console.log("error in sendCsv ::: ", err.message)
        res.end()
    }
}

module.exports.canTakeActionOrViewOnly = (data, userRole, adminLevel = false) => {
    let status = data['formStatus'];
    switch (true) {
        case status == StatusList.Not_Started:
            return false;
            break;
        case status == StatusList.In_Progress:
            return false;
            break;
        case status == StatusList.Under_Review_By_State && userRole == 'STATE':
            return true;
            break;
        case status == StatusList.Under_Review_By_MoHUA && adminLevel && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            console.log("adminglevel ::: ", adminLevel)
            return true
            break;
        case status == StatusList.Under_Review_By_State && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            return false;
            break;
        case status == StatusList.Rejected_By_State:
            return false;
            break;
        case status == StatusList.Rejected_By_MoHUA:
            return false;
            break;
        case status == StatusList.Under_Review_By_MoHUA && userRole == 'STATE':
            return false;
            break;
        case status == StatusList.Under_Review_By_MoHUA && userRole == 'MoHUA':
            return true;
            break;
        case status == StatusList.Approved_By_MoHUA:
            return false;
            break;

        default:
            break;
    }
}
class AggregationServices {
    static dateFormat = "%d-%m-%Y"
    /**
    * function for unwind
    * @param {string} key
    */
    static getUnwindObj(key, preserveNullAndEmptyArrays = false) {
        try {
            var obj = {
                "$unwind": key
            }
            if (preserveNullAndEmptyArrays) {
                obj = { "$unwind": {} }
                obj["$unwind"]['path'] = key
                obj["$unwind"]["preserveNullAndEmptyArrays"] = true
            }
            return obj
        }
        catch (err) {
            console.log("error in getUnwindObj ::: ", err)
        }
    }
    /**
     * if lookup query is simple then use this
     * @param {*} from 
     * @param {*} localField 
     * @param {*} foreignField 
     * @param {*} as 
     * @returns an object which with the lookup queries
     */
    static getCommonLookupObj(from, localField, foreignField, as) {
        let obj = {}
        try {
            obj = {
                "$lookup": {
                    "from": from,
                    "localField": localField,
                    "foreignField": foreignField,
                    "as": as
                }
            }
            return obj
        }
        catch (err) {
            console.log("error in get CommonLookup obj")
            return obj
        }
    }



    /**
     * 
     * @param {*} field 
     * @returns an javascript object 
     */
    static getCommonDateTransformer(field) {
        return {
            "$dateToString": {
                "date": field,
                "format": this.dateFormat
            }
        }
    }
    static getCommonSkipObj(number) {
        return {
            "$skip": number
        }
    }
    static getCommonLimitObj(number) {
        return {
            "$limit": number
        }
    }
    static getCommonSliceObj(arr, from, to) {
        return {
            "$slice": [arr, from, to]
        }
    }
    static getCommonTotalObj(arr) {
        return {
            $cond: {
                if: { $isArray: arr },
                then: { $size: arr },
                else: 0
            }
        }

    }
    static getCommonSortArrObj(arr, sortBy) {
        return {
            $sortArray: {
                input: arr,
                sortBy
            }
        }
    }
    static getCommonConvertor(value, to) {
        return {
            $convert: {
                input: value,
                to
            }
        }
    }
    static getCommonConcatObj(arr) {
        return {
            $concat: arr
        }
    }
    static getCommonEqObj(tableCol, customVar) {
        return {
            $eq: [tableCol, customVar]
        }
    }
    static getCommonSumObj(col) {
        return {
            $sum: col
        }
    }
    static getCommonPrObj(arr) {
        return {
            $multiply: arr
        }
    }
    static convertIntoLakhs(field) {
        return {
            "$multiply": [field, 100000]
        }
    }
    static filterArr(fieldName, fromField, cond) {
        try {
            let obj = {
                "$addFields": {}
            }
            obj["$addFields"][fieldName] = this.getCommonFilterObj(fromField, cond)
            return obj
        }
        catch (err) {
            console.log("error in conditionProj :: ", err.message)
        }
    }
    static getCommonFilterObj(field, cond) {
        try {
            return {
                "$filter": {
                    "input": field,
                    "as": "item",
                    "cond": cond
                }
            }
        }
        catch (err) {
            console.log("error in getCommonFilterObj :: ", err.message)
        }
    }
    static addMultipleFields(obj, arrayForm) {
        let temp = []
        try {
            let returnable = {
                "$addFields": {}
            }
            for (var field in obj) {
                let fieldName = obj[field]['field']
                let type = obj[field]['type']
                returnable["$addFields"][fieldName] = type == "lakhs" ? this.convertIntoLakhs(field) : this.convertToCr(field)
                if (arrayForm) {
                    let tempObj = { "$addFields": {} }
                    tempObj["$addFields"][fieldName] = type == "lakhs" ? this.convertIntoLakhs(field) : this.convertToCr(field)
                    temp.push(tempObj)
                }
            }
            return arrayForm ? temp : returnable
        }
        catch (err) {
            console.log("error in addMultipleFields :: ", err.message)
        }
    }

    static addConvertedAmount(field, fieldName, type) {
        let obj = {
            "$addFields": {}
        }
        obj['$addFields'][fieldName] = type == "lakhs" ? this.convertIntoLakhs(field) : this.convertToCr(field)
        return obj
    }
    static getCondObj(value, then) {
        return {
            "$cond": {
                "if": { "$gt": [value, 0] },
                "then": then,
                "else": 0
            }
        }
    }
    static addFields(fieldName, field) {
        try {
            let obj = {
                "$addFields": {}
            }
            obj['$addFields'][fieldName] = field
            return obj
        }
        catch (err) {
            console.log("error in addFields :: ", err.message)
        }
    }
    static getCommonDivObj(arr) {
        return {
            $divide: arr
        }
    }
    static convertToCr(value) {
        return this.getCondObj(value, this.getCommonDivObj([value, 10000000]))
    }
    static getCommonSubtract(arr) {
        let sub = { $subtract: arr }
        return {
            "$cond": {
                "if": {
                    "$gte": [sub, 0],
                },
                "then": sub,
                "else": 0
            }
        }
    }
    static getCasesForCurrenCon(fieldName, then, value1, value2) {
        let obj = {
            "case": {},
            "then": then
        }
        obj['case'] = {
            "$and": [
                { "$gte": [`$${fieldName}`, value1] },
                { "$lt": [`$${fieldName}`, value2] }
            ]
        }
        return obj
    }

    static getCommonPerCalc(value, totalValue) {
        let cont = {
            "$multiply": [
                this.getCondObj(value, this.getCommonDivObj([value, totalValue])),
                100
            ]
        }
        return this.getCommonConvertor(
            {
                "$cond": {
                    "if": {
                        "$gte": [cont,
                            0
                        ]
                    },
                    "then": cont,
                    "else": 0
                }
            },
            "int"
        )
    }
    static getCommonSubStr(field, start, end) {
        return {
            "$substr": [field, start, end]
        }
    }
    static getCommonCurrencyConvertor(fieldName, arr, def) {
        let obj = {
            "$switch": {
                "branches": [

                ],
                "default": def
            },

        }
        obj["$switch"]["branches"].push(this.getCasesForCurrenCon(fieldName, arr[0], 1000, 10000))
        obj["$switch"]["branches"].push(this.getCasesForCurrenCon(fieldName, arr[1], 10000, 1000000))
        obj["$switch"]["branches"].push(this.getCasesForCurrenCon(fieldName, arr[2], 1000000, 100000000))
        return obj
    }
}
module.exports.sendCsv = sendCsv
module.exports.AggregationServices = AggregationServices
module.exports.apiUrls = apiUrls

module.exports.canTakeActionOrViewOnly = (data, userRole) => {
    let status = data['formStatus'];
    switch (true) {
        case status == StatusList.Not_Started:
            return false;
            break;
        case status == StatusList.In_Progress:
            return false;
            break;
        case status == StatusList.Under_Review_By_State && userRole == 'STATE':
            return true;
            break;
        case status == StatusList.Under_Review_By_State && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            return false;
            break;
        case status == StatusList.Rejected_By_State:
            return false;
            break;
        case status == StatusList.Rejected_By_MoHUA:
            return false;
            break;
        case status == StatusList.Under_Review_By_MoHUA && userRole == 'STATE':
            return false;
            break;
        case status == StatusList.Under_Review_By_MoHUA && userRole == 'MoHUA':
            return true;
            break;
        case status == StatusList.Approved_By_MoHUA:
            return false;
            break;

        default:
            break;
    }
}

module.exports.saveCurrentStatus = (params) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { body } = params;
            let currentStatus = await CurrentStatus.create(body).lean(); resolve(1);
        } 
        catch (error) { 
            reject(error); 
        }
    });
}; 


module.exports.saveStatusHistory = (params) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { body } = params;
            let currentStatus = await StatusHistory.create(body).lean(); resolve(1);
        } 
        catch (error) { 
            reject(error); 
        }
    });
};


module.exports.getCurrentFinancialYear = () => {
    var fiscalyear = "";
    var today = new Date();
    if ((today.getMonth() + 1) <= 3) {
        fiscalyear = (today.getFullYear() - 1) + "-" + today.toLocaleDateString('en', { year: '2-digit' })

    } else {
        fiscalyear = today.getFullYear() + "-" + (parseInt(today.toLocaleDateString('en', { year: '2-digit' })) + 1)
    }
    return fiscalyear
}

function traverseAndFlatten(currentNode, target, flattenedKey) {
    /**
     * TODO:
     * Pending case for handling array data inside some field
     */
    for (var key in currentNode) {
        if (currentNode.hasOwnProperty(key)) {
            var newKey;
            if (flattenedKey === undefined) {
                newKey = key;
            } else {
                newKey = flattenedKey + '.' + key;
            }
            var value = currentNode[key];
            if (typeof value === "object") {
                traverseAndFlatten(value, target, newKey);
            } else {
                target[newKey] = value;
            }
        }
    }
}

module.exports.getFlatObj = (obj) => {
    let flattendObj = {}
    traverseAndFlatten(obj, flattendObj)
    // let flattenArr = []
    return flattendObj
}

function returnParsedObj(objects) {
    try {
        let keys = {
            "1": "label",
            "2": "textValue",
            "3": "value",
            "11":["value","label"],
        }
        let shortKey = objects.shortKey.replace(" ","")
        let splittedShortKey = shortKey.split(".")
        let inputType = keys[objects.input_type]
        if (splittedShortKey.length > 1) {
            let answers = objects['answer']
            let value = objects['answer'][0][inputType]

            if (answers.length > 1) {
                value = objects['answer'].map(item => item[inputType])
            }
            let obj = splittedShortKey.reduceRight((obj, key) => ({ [key]: obj }), value)
            return obj
            // Object.assign(payload,obj)
        }
        else {
            let temp = {}
            let answers = objects['answer'].length
            let value = objects['answer'][0][inputType]
            // console.log("isArray(inputType) :: ",isArray(inputType))
            if( Array.isArray(inputType)){
                value = {
                    "name":objects['answer'][0]['label'],
                    "url":objects['answer'][0]['value'],
                }
            }
            if (answers > 1) {
                value = objects['answer'].map(item => item[inputType])
            }
            temp[shortKey] = value
            return temp
        }
    }
    catch (err) {
        console.log("error in returnParsedObj ::: ", err.message)
    }
}


function payloadParser(body) {
    try {
        let payload = {}
        let modifiedBody = [...body]
        for (let objects of modifiedBody) {
            let temp = returnParsedObj(objects)
            if (objects.child) {
                temp['data'] = []
                for (let childern of objects.child) {
                    let index = modifiedBody.findIndex((item) => item.order === childern)
                    let object = modifiedBody[index]
                    modifiedBody.splice(index, 1)
                    let temp2 = returnParsedObj(object)
                    temp['data'].push(temp2)
                }
            }
            Object.assign(payload, temp)
        }
        return payload
    }

    catch (err) {
        console.log("error in payloadParser ::: ", err.message)
    }
}
module.exports.payloadParser = payloadParser

function mutuateGetPayload(jsonFormat,flattedForm,keysToBeDeleted) {
    try {  
        let answerObj = {
            "label": "",
            "textValue": "",
            "value": "",
        }
        let inputType = {
            "1": "label",
            "2": "textValue",
            "3": "value",
            "11":["value","label"],
        }
        let obj = [ ...jsonFormat ]
        obj[0] = appendExtraKeys(keysToBeDeleted,obj[0],flattedForm)
        deleteKeys(flattedForm,keysToBeDeleted)
        for (let key in obj) {
            let questions = obj[key].question
            if(obj[key].question){
                for (let question of questions){
                    let answer = []
                    let obj = { ...answerObj }
                    let answerKey = inputType[question.input_type]
                    if(Array.isArray(answerKey)){
                        let mainKey = question.shortKey.split(".")[0].replace(" ","")
                        let name = mainKey + "."+ "name"
                        let url = mainKey + "."+"url"
                        obj['label'] = flattedForm[name]
                        obj['value'] = flattedForm[url]
                    }
                    else{
                        let shortKey = question.shortKey.replace(" ", "")
                        obj[answerKey] = flattedForm[shortKey]
                    }
                    answer.push(obj)
                    question['selectedValue'] = answer
                }
            }
        }
        return obj
    }
    catch (err) {
        console.log("addValueIfFormExists ::: ", err.message)
    }
}

// function checkForUndefinedVaribales(obj){
//     let validator = {
//         message :"",
//         success :false
//     }
//     try{
//         for(let valid in validator){
//             if(validator[valid] === undefined){

//             }
//         }      
//     }
//     catch(err){
//         console.log("error in check for undefined variables :: ",err.message)
//     }
// }

module.exports.mutuateGetPayload = mutuateGetPayload

function appendExtraKeys(keys,jsonObj,form){
    let obj = {...jsonObj}
    try{
        for(let key of keys){
            if(Object.keys(form).includes(key.replace(" ",""))){
                obj[key] = form[key]
            }
        }
    }
    catch(err){
        console.log("error in appendExtraKeys ::: ",err.message)
    }
    return obj
}

function deleteKeys(obj,delKeys){
    try{
        for(let del of delKeys){
            delete obj[del]
        }
        
    }
    catch(err){
        console.log("error in deleteKeys ::::: ",err.message)
    }
}