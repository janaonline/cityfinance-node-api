const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const moongose = require('mongoose')
const {DurProjectJson} = require("./jsons")
const StatusList = require('../../util/newStatusList')
const catchAsync = require('../../util/catchAsync')
const ObjectId = require("mongoose").Types.ObjectId;
const Sidemenu = require('../../models/Sidemenu');
const userTypes = require("../../util/userTypes")
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const { FormNames, FORM_LEVEL, MASTER_STATUS, YEAR_CONSTANTS } = require('../../util/FormNames');
const { calculateTabwiseStatus } = require('../annual-accounts/utilFunc');
const {modelPath} = require('../../util/masterFunctions')
const Response = require("../../service").response;
const {saveCurrentStatus, saveFormHistory, saveStatusHistory} = require('../../util/masterFunctions');
const CurrentStatus = require('../../models/CurrentStatus');


var formIdCollections= {
    "80":"PropertyTaxOp"
}

var arrFields = { // if there is any change in short keys then please update here
    "waterManagement_tableView":"categoryWiseData_wm",
    "solidWasteManagement_tableView":"categoryWiseData_swm",
    "projectDetails_tableView_addButton":"projects"
}
var specialCases = ['projectDetails_tableView_addButton']
var annualRadioButtons = { // if there are any label changes for radio button in frontend please update here
    "Yes":true,
    "No":false,
    "Agree":true
}
var customBtnsWithFormID = {
    "5":annualRadioButtons
}
var customkeys = {
    "general":{
        "ulbName":"ulbName",
        "grantType":"grantType"
    },
    "grantPosition":{
        "grantPosition.unUtilizedPrevYr":"grantPosition.unUtilizedPrevYr",
        "grantPosition.receivedDuringYr":"grantPosition.receivedDuringYr",
        "grantPosition.expDuringYr":"grantPosition.expDuringYr",
        "grantPosition.closingBal":"grantPosition.closingBal",
    },
    "waterManagement_tableView":{
        "category_name":"category_name",
        "grantUtilised":"grantUtilised",
        "numberOfProjects":"numberOfProjects",
        "totalProjectCost":"totalProjectCost"
    },
    "solidWasteManagement_tableView":{
        "category_name":"category_name",
        "grantUtilised":"grantUtilised",
        "numberOfProjects":"numberOfProjects",
        "totalProjectCost":"totalProjectCost"

    },
    "projectDetails_tableView_addButton":{
        "cost": 'totalProjectCost',
        "expenditure": 'expenditure',
        "modifiedAt": 'modifiedAt',
        "createdAt": 'createdAt',
        "isActive": 'isActive',
        "_id": '_id',
        "category": 'category',
        "name": 'name',
        "location": ['lat','long'],
        "capitalExpenditureState": 'capitalExpenditureState',
        "capitalExpenditureUlb": 'capitalExpenditureUlb',
        "omExpensesState": 'omExpensesState',
        "omExpensesUlb": 'omExpensesUlb',
        "stateShare": 'stateShare'
      }

}

var modifiedShortKeys = {
    "cert_declaration":"cert"
}
module.exports.modifiedShortKeys  = modifiedShortKeys
var shortKeysWithModelName = {
    "rating":{"modelName":"Rating","identifier":"option_id"},
}
var answerObj = {
    "label": "",
    "textValue": "",
    "value": "",
}
var inputType = {
    "1": "label",
    "2": "textValue",
    "3": "value",
    "11": ["value", "label"],
    "14":"value"
}
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

module.exports.canTakenActionMaster = (params) => {
  let { status, formType, loggedInUser } = params;
  switch (formType) {
    case "ULB":
      if (loggedInUser == "STATE") {
        if (status === MASTER_STATUS["Under Review by State"]) {
          return true;
        } else {
          return false;
        }
      } else if (loggedInUser == "MoHUA") {
        if (status === MASTER_STATUS["Under Review by MoHUA"]) {
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
        if (status === MASTER_STATUS["Under Review by MoHUA"]) {
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
};

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


function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
  }
module.exports.getKeyByValue = getKeyByValue
function findForm(formArray, stateId){
   let forms = formArray.filter((element)=>{
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

module.exports.canTakeActionOrViewOnlyMasterForm = (params)=> {
    const { status, userRole, adminLevel = false }  = params;
    switch (true) {
        case status == MASTER_STATUS['Not Started']:
            return false;
            break;
        case status == MASTER_STATUS['In Progress']:
            return false;
            break;
        case status == MASTER_STATUS['Under Review by State'] && userRole == 'STATE':
            return true;
            break;
        case status == MASTER_STATUS['Under Review by MoHUA'] && adminLevel && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            console.log("adminglevel ::: ", adminLevel)
            return true
            break;
        case status == MASTER_STATUS['Under Review by State'] && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            return false;
            break;
        case status == MASTER_STATUS['Rejected by State']:
            return false;
            break;
        case status == MASTER_STATUS['Rejected by MoHUA']:
            return false;
            break;
        case status == MASTER_STATUS['Under Review by MoHUA'] && userRole == 'STATE':
            return false;
            break;
        case status == MASTER_STATUS['Under Review by MoHUA'] && userRole == 'MoHUA':
            return true;
            break;
        case status == MASTER_STATUS['Approved by MoHUA']:
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
    for (let key in currentNode) {
        let iterator = Number(key)
        if(!isNaN(iterator)){
            let iteratorKey = flattenedKey.split(".")[0]
            if(iteratorKey != "_id"){
                target.parent_arr.add(iteratorKey)
            }
        }
        if (currentNode.hasOwnProperty(key)) {
            var newKey;
            if (flattenedKey === undefined) {
                newKey = key;
            } else {
                let iteratorObjKey = flattenedKey.split(".")[0]
                newKey = flattenedKey + '.' + key;
                if(iteratorObjKey != "_id" && !target.parent_arr.has(iteratorObjKey)){
                    target.parent_obj.add(iteratorObjKey)
                }
                
            // }
            }
            var value = currentNode[key];
            if (typeof value === "object" && !Array.isArray(value)) {
                traverseAndFlatten(value, target, newKey);
            } else {
                target[newKey] = value;
            }
        }
    }
}

module.exports.getFlatObj = (obj) => {
    let flattendObj = {}
    flattendObj['parent_arr'] = new Set()
    flattendObj['parent_obj'] = new Set()
    traverseAndFlatten(obj, flattendObj)
    // let flattenArr = []
    flattendObj['parent_arr'] = Array.from(flattendObj['parent_arr'])
    flattendObj['parent_obj'] = Array.from(flattendObj['parent_obj'])
    return flattendObj
}

class PayloadManager{
    constructor(temp,shortKey,objects,req,shortKeysWithModelName){
        this.temp = temp
        this.shortKey = shortKey
        this.objects = objects
        this.req = req
        this.shortKeysWithModelName = shortKeysWithModelName
        this.inputName = inputType[objects.input_type]
        this.value = objects['answer'][0][this.inputName]
        this.formId = req.body.formId || ""
    }
    async getValuesFromModel(){
        try{
            if(Object.keys(this.shortKeysWithModelName).includes(this.shortKey)){
                let modelName = shortKeysWithModelName[this.shortKey].modelName
                let identifier = shortKeysWithModelName[this.shortKey].identifier
                let filters = {}
                filters[identifier] = parseInt(this.value)
                if(Object.keys(this.req.body).includes("isGfc")){
                    filters['formName'] = this.req.body.isGfc ? "gfc" :"odf"
                    filters['financialYear'] = this.req.body.design_year
                }
                let ratingObj = await moongose.model(modelName).findOne(filters)
                let mainvalue = ratingObj._id
                return mainvalue
            }
            else{
                return this.value
            }
        }
        catch(err){
            console.log("getValuesFromModel :::::::: ",err.message)
        }
    }
    async handleFileObjects(){
        try{
            if (Array.isArray(this.inputName)) {
                let mainvalue = {
                    "name": this.objects['answer'][0]['label'],
                    "url": this.objects['answer'][0]['value'],
                }
                return mainvalue
            }
        }
        catch(err){
            console.log("error in handleFileObjects ::: ",err.message)
        }
    }
    async handleRadioButtons(){
        try{
            // let collectionName = formIdCollections[this.req.body.formId]
            // let enums = mongoose.model(collectionName).schema.path(this.shortKey).enumValues.filter(item => item != "")
            // console.log("enums :: ",enums)
            let label =  this.objects['answer'][0]['label']
            if(Object.keys(customBtnsWithFormID).includes(this.formId.toString())){
                let radioButtonObj = customBtnsWithFormID[this.formId.toString()]
                this.value = radioButtonObj[label]
            }
            // if(Object.keys.includes(annualRadioButtons)){
            //     thi
            //     this.value = formIds
            // }
            return this.value 
        }
        catch(err){
            console.log("error in handleRadioButtons ::: ",err.message)
        }
    }
}


async function decideValues(temp,shortKey,objects,req){
    try{
        let service = new PayloadManager(temp,shortKey,objects,req,shortKeysWithModelName)
        let inputName = inputType[objects.input_type]
        let value = objects['answer'][0][inputName]
        switch (objects.input_type){
            case "3":
                value = await service.getValuesFromModel()
                break
            case "11":
                value = await service.handleFileObjects()
                break
            case "5":
                value = await service.handleRadioButtons()
                break
            default:
                temp[shortKey] = value
                break
        }
        temp[shortKey] = value
        // console.log("value :::: ",value)
        return value
    }
    catch(err){
        console.log("error in decideValues ::: ",err.message)
    }
}

async function returnParsedObj(objects,req) {
    try {
        let keys = {...inputType}
        let shortKey = objects.shortKey.replace(" ", "")
        let splittedShortKey = shortKey.split(".")
        let inputName = keys[objects.input_type]
        if (splittedShortKey.length > 1) {
            let answers = objects['answer']
            let value = objects['answer'][0][inputName]

            if (answers.length > 1) {
                value = objects['answer'].map(item => item[inputName])
            }   
            let obj = splittedShortKey.reduceRight((obj, key) => ( { [key]: obj }), value)
            return obj
        }
        else {
            let temp = {}
            let answers = objects['answer'].length
            let value = objects['answer'][0][inputName]
            
            if (answers > 1) {
                value = objects['answer'].map(item => item[inputName])
            }
            let modifiedKeys = Object.keys(modifiedShortKeys)
            
            if(modifiedKeys.includes(shortKey)){
                shortKey = modifiedShortKeys[shortKey]
            }
            await decideValues(temp,shortKey,objects,req)
            return temp
        }
    }
    catch (err) {
        console.log("error in returnParsedObj ::: ", err.message)
    }
}


async function payloadParser(body,req) {
    try {
        let payload = {}
        let modifiedBody = [...body]
        for (let objects of modifiedBody) {
            let temp = await  returnParsedObj(objects,req)
            if (objects.child) {
                temp['data'] = []
                for (let childern of objects.child) {
                    let index = modifiedBody.findIndex((item) => item.order === childern)
                    let object = modifiedBody[index]
                    modifiedBody.splice(index, 1)
                    let temp2 = await returnParsedObj(object,req)
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

function roleWiseJson(json,role){
    let removableObjects = [
        "responseFile",
        "status",
        "rejectReason",
        "rejectReason_state",
        "rejectReason_mohua",
        "responseFile_state",
        "responseFile_mohua"
    ]
    try{
        // if(role === userTypes.ulb){
            json.question = json.question.filter(item => !removableObjects.includes(item.shortKey) )
        // }
    }
    catch(err){
        console.log("error in roleWiseJson ::: ",err.message)
    }
}

async function handleSelectCase(question,obj,flattedForm){
    try{
        if(question.modelName){
            let value = flattedForm[question.shortKey]
            let tempObj = question.answer_option.find(item => item.option_id.toString() == value.toString())
            if(tempObj){
                obj['label'] = tempObj['name']
                obj['value'] = tempObj['_id']
                question['modelValue'] = tempObj['_id']
                question['value'] = tempObj['_id']
            }  
        }
        else if(question.answer_option.length){
            // console.log("here i am ")
            let keys = question.answer_option.map(item => item.name)
            let value = flattedForm[question.shortKey]
            if(keys.includes(value)){
                let tempObj = question.answer_option.find(item => item.name === value)
                obj['label'] = tempObj['name']
                obj['value'] = tempObj['_id']
                question['modelValue'] = tempObj['name']
                question['value'] = tempObj['_id']
                question['selectedAnswerOption'] = {'name':tempObj['_id']}
            }
            // console.log(question.answer_option)
            // console.log("question.shortKey:::",question.shortKey)
            // console.log(flattedForm[question.shortKey])
        }
        return obj
        // console.log("question :: ",question)
    }
    catch(err){
        console.log("error in handleSelectCase ::: ",err.message)
    }
}

module.exports.mutateJson = async(jsonFormat,keysToBeDeleted,query,role)=>{
    try{
        let obj = [...jsonFormat]
        roleWiseJson(obj[0],role)
        obj[0] = await appendExtraKeys(keysToBeDeleted, obj[0], query)
        // await deleteKeys(flattedForm, keysToBeDeleted)

        for (let key in obj) {
            let questions = obj[key].question
            if (obj[key].question) {
                for (let question of questions) {
                    let obj = { ...answerObj }
                    obj = await handleCasesByInputType(question,obj)
                    await deleteExtraKeys(question)
                }
            }
        }
        // await deleteKeys(flattedForm, keysToBeDeleted)
        return obj
    }
    catch(err){
        console.log("error in mutateJson ::: ",err.message)
    }
}

async function handleDbValues(questionObj,formObj,order){
    try{
        let answer = { label: '', textValue: '', value: '' }
        await handleCasesByInputType(questionObj)
        await handleValues(questionObj,answer,formObj)
        questionObj.selectedValue = [answer]
        let questionOrder = order.toFixed(3)
        questionObj.order = questionOrder
        return {...questionObj}
    }
    catch(err){
        console.log("error in handleProjectedArr ::: ",err.message)
    }
}
async function handleProjectCaseForDur(question,flattedForm){
    try{
        let order = parseInt(question.order)
        let dbKey = arrFields[question.shortKey]
        let values = flattedForm[dbKey]
        var project_arr = []
        let a = 0
        if(values){
            for(let obj of values){
                var nested_arr = []
                for(let keys in obj){
                    let keysObj = customkeys[question.shortKey]
                    let jsonKey = keysObj[keys]
                    let questionObj = DurProjectJson[jsonKey]
                    if(Array.isArray(jsonKey)){
                        for(let arr of jsonKey){
                            let question =  DurProjectJson[arr]
                            if(question){
                                order += 0.001
                                let formObj = {}
                                formObj[arr] = obj[keys][arr]
                                question =  await handleDbValues(question,formObj,order)
                                nested_arr.push({...question})
                            }
    
                        }
                    }
                    if(questionObj){
                        order += 0.001
                        let formObj = {}
                        formObj[jsonKey] = obj[keys]
                        questionObj =  await handleDbValues(questionObj,formObj,order)
                        nested_arr.push({...questionObj})
                    }
                }
                a += 1
                project_arr.push(nested_arr)
            }
        }
        
         let  childData = [...project_arr]
         return childData
        // console.log("question.childQuestionData  inside function:: ",question.childQuestionData.length)

    }
    catch(err){
        console.log("error in handleProjectCaseForDur ::: ",err.message)
    }
}

function handleArrayFields(shortKey,flattedForm,childQuestionData){
    try{
        let valKey = arrFields[shortKey]
        let answerObjects = flattedForm[valKey]
        for(let index in answerObjects){
            let questionArr = childQuestionData[index]
            for(let arrIndex in questionArr){
                let formObj = answerObjects[index]
                let question = questionArr[arrIndex]
                let answer = { label: '', textValue: '', value: '' }
                handleValues(question,answer,formObj)
                question.selectedValue = [answer]
            }
        }
    }
    catch(err){
        console.log("error in handleArrayFields :: ",err.message)
    }
    return childQuestionData
}

async function appendvalues(childQuestionData,flattedForm,shortKey,question){
    try{
        let arrKeys = Object.keys(arrFields)
       if(!arrKeys.includes(shortKey)){
        for(let arr of childQuestionData){
            for(let obj of arr){
                let questionKeys = Object.keys(customkeys[shortKey])
                for(let questionkey of questionKeys){
                    if(obj.shortKey === questionkey){
                        // console.log("flattedForm ::: ",flattedForm)
                        // console.log("obj.shortKey ::::: ",obj.shortKey)
                        // console.log("questionkey :::: ",questionkey)
                        let answer = { label: '', textValue: '', value: '' }
                        await handleValues(obj,answer,flattedForm)
                        obj.selectedValue = [answer]
                    }
                }
            }
        }
       }
       if(arrKeys.includes(shortKey)){
         await handleArrayFields(shortKey,flattedForm,childQuestionData)
        }
        if(specialCases.includes(shortKey)){
            // console.log("question ::: ",question.order)
            childQuestionData = await handleProjectCaseForDur(question,flattedForm)
        }
            // let valKey = arrFields[shortKey]
            // let answerObjects = flattedForm[valKey]
            // for(let index in answerObjects){
            //     let questionArr = childQuestionData[index]
            //     for(let arrIndex in questionArr){
            //         let formObj = answerObjects[index]
            //         let question = questionArr[arrIndex]
            //         let answer = { label: '', textValue: '', value: '' }
            //         handleValues(question,answer,formObj)
            //         question.selectedValue = answer
            //     }
            // }
            // console.log("valKey ::: ",valKey)
            // console.log(">>>>>>>> ",flattedForm[valKey].length)
            // console.log("childQesruin ::: ",childQuestionData.length)
       
        
        return childQuestionData
    }
    catch(err){
        console.log("error in appendValues :::: ",err.message)
    }
}
async function appendChildQues(question,obj,flattedForm){
    try{
        // console.log("i am here ::: ")
        // console.log("flattedform ::: ",flattedForm)
        let customShortKeys = Object.keys(customkeys)
        if(customShortKeys.includes(question.shortKey)){
            // let childQuestionData = question.childQuestionData
        //    console.log(childQuestionData.length)
           let childQuestionData = await appendvalues(question.childQuestionData,flattedForm,question.shortKey,question)
        //    if(question.shortKey === "grantPosition"){
        //         console.log("cs ::::::::: ",childQuestionData)
        //     }
           return childQuestionData
        }
        // let childElements = question.childQuestionData
        // if(question.order === "1"){
        //     console.log(": ::: ",childElements[0])
        // }
        // console.log("flattedForm :::: ",flattedForm)
    }
    catch(err){
        console.log("error in getChildrens :::: ",err.message)
    }
}
const handleChildCase = async(question,obj,flattedForm)=>{
    try{
        let order = question.order
        let childQuestionData = await appendChildQues(question,obj,flattedForm)
        if(childQuestionData){
            question.childQuestionData = childQuestionData
        }
        // console.log("childQuestionData ::::::::::",question)
    
    }
    catch(err){
        console.log("error in handleChildCase :::: ",err.message)
    }
}

const handleNumericCase = async(question,obj,flattedForm,mainKey)=>{
    try{
        let value = ''
        
        if(mainKey){
            let key = mainKey + "."+question.shortKey
            question['modelValue'] = flattedForm[key]
            question['value'] = flattedForm[key]
            obj['textValue'] = flattedForm[key]
            obj['value'] = flattedForm[key]
        }
        else{
            let key = question.shortKey
            question['modelValue'] = flattedForm[key]
            question['value'] = flattedForm[key]
            obj['textValue'] = flattedForm[key]
            obj['value'] = flattedForm[key]
        }
    }
    catch(err){
        console.log("error in handleNumericCase ::: ",err.message)
    }
}

const handleTextCase = async(question,obj,flattedForm)=>{
    try{
        let mainKey = question.shortKey
        question['modelValue'] = flattedForm[mainKey]
        question['value'] = flattedForm[mainKey]
        obj['textValue'] = flattedForm[mainKey]
        obj['value'] = flattedForm[mainKey]
        // return obj
        // console.log("obj ::::: ")
    }
    catch(err){
        console.log("error in handleTextCase :: ",err.message)
    }
}

const getFilteredOptions =(answerKeys,annualRadioButtons)=>{
    try{
        const filteredObj = Object.keys(annualRadioButtons)
            .filter((key) => answerKeys.includes(key))
            .reduce((obj, key) => {
            return Object.assign(obj, {
            [key]: annualRadioButtons[key]
            });
            }, {});
        return filteredObj
        }

    catch(err){
        console.log("error in getFilteredOptions :: ",err.message)
        return annualRadioButtons
    }
}

const handleRadioButtonCase = async(question,obj,flattedForm,mainKey) =>{
    try{
        let shortKey = question.shortKey
        let value = flattedForm[shortKey]
        let answerIds = question.answer_option.map(item => ({[item.name]:item._id}))
        let answerKeys = question.answer_option.map(item => item.name)
        let filteredObj = getFilteredOptions(answerKeys,annualRadioButtons)
        let mformValue = getKeyByValue(filteredObj,value)
        if(mformValue){
            let answerObj = question.answer_option.find(item => item.name === mformValue)
            question['modelValue'] = answerObj._id
            question['value'] = answerObj._id
            obj['textValue'] = mformValue
            obj['value'] = answerObj._id
        }
    }
    catch(err){
        console.log("error in handleRadioButtonCase ::: ",err.message)
    }
}

const handleValues = async(question,obj,flattedForm,mainKey=false)=>{
    let answerKey = inputType[question.input_type]
    try{
        switch (question.input_type){
            case "1":
                await handleTextCase(question,obj,flattedForm,mainKey)
                break
            case "2":
                await handleNumericCase(question,obj,flattedForm,mainKey)
                break
            case "11":
                await handleFileCase(question,obj,flattedForm,mainKey)
                break
            case "14":
                await handledateCase(question,obj,flattedForm,mainKey)
                break
            case "3":
                await handleSelectCase(question,obj,flattedForm,mainKey)
                break
            case "5":
                await handleRadioButtonCase(question,obj,flattedForm,mainKey)
                break
            case "20":
                await handleChildCase(question,obj,flattedForm,mainKey)
                break
            default:
                let shortKey = question.shortKey.replace(" ", "")
                obj[answerKey] = flattedForm[shortKey]
                break
        }
        return obj
    }
    catch(err){
        console.log("error in handleValues ::: ",err.message)
    }
}

function handledateCase(question,obj,flattedForm){
    try{
        
        let mainKey = question.shortKey
        question['modelValue'] = flattedForm[mainKey]
        question['value'] = flattedForm[mainKey]
        obj['textValue'] = flattedForm[mainKey]
        obj['value'] = flattedForm[mainKey]
    }
    catch(err){
        console.log("error in dateCase :::: ",err.message)
    }
}

function handleFileCase(question,obj,flattedForm){
    try{
        let spiltArr = question.shortKey.split(".")
        let mainKey = spiltArr[0].replace(" ", "")
        if(spiltArr.length > 2){
            mainKey = spiltArr.slice(0,spiltArr.length).join(".")
        }
        let modifiedKeys = Object.keys(modifiedShortKeys)
        if(modifiedKeys.includes(mainKey)){
            mainKey = modifiedShortKeys[mainKey]
        }
        let name = mainKey + "." + "name"
        let url = mainKey + "." + "url"
        obj['label'] = flattedForm[name]
        obj['value'] = flattedForm[url]
        obj['textValue'] = flattedForm[url]
        question['modelValue'] = flattedForm[url]
        question['value'] = flattedForm[url]
        // console.log("question ::: ",question)
    }
    catch(err){
        console.log("error in handleObjectCase :: ",err.message)
    }
}

async function deleteExtraKeys(question){
    let filterKey = ["modelName","modelFilter"]
    try{
        filterKey.forEach((item)=>{
            delete question[item]
        })
    }
    catch(err){
        console.log("error in deleteExtraKeys :: ",err.message)
    }
}

async function mutuateGetPayload(jsonFormat, flattedForm, keysToBeDeleted,role) {
    try {
        // console.log(">>>>>>>>>> obj ::: ",jsonFormat)
        let obj = [...jsonFormat]
        // console.log("flattedForm ::: ",flattedForm)
        // if(flattedForm.actionTakenByRole == userTypes.ulb){
        roleWiseJson(obj[0],role)
        // }
        obj[0] = await appendExtraKeys(keysToBeDeleted, obj[0], flattedForm)
        await deleteKeys(flattedForm, keysToBeDeleted)
        for (let key in obj) {
            let questions = obj[key].question
            if (questions) {
                for (let question of questions) {    
                    let answer = []
                    let obj = { ...answerObj }
                    let answerKey = inputType[question.input_type]
                    //question object is getting modified here
                    await handleCasesByInputType(question)
                    // if (Array.isArray(answerKey)) {
                    await handleValues(question,obj,flattedForm)
                    // console.log("question  ::: ",question.childQuestionData )
                    // }
                    // else {
                    //     let shortKey = question.shortKey.replace(" ", "")
                    //     obj[answerKey] = flattedForm[shortKey]
                    // }
                    answer.push(obj)
                    // console.log("answer LL ",answer)
                    question['selectedValue'] = answer
                   await deleteExtraKeys(question)
                    // console.log(">>>>>>>>.question :: ",question)
                }
                let modifiedKeys = Object.keys(modifiedShortKeys)
                let modifiedObjects =  questions.filter(item => modifiedKeys.includes(item.shortKey))
            }
        }
        return obj
    }
    catch (err) {
        console.log("mutuateGetPayload ::: ", err.message)
    }
}


async function handleCasesByInputType(question){
    try{
        let obj = {...answerObj}
        switch(question.input_type){
            case "3":
                if(question.modelName){
                    obj =  await appendAnswerOptions(question.modelName,question,question.modelFilter)
                }
                break
            // case "11":
            //     console.log("inside this case")
            //     break
            default:
                obj = {...answerObj}
                break
        }
        return obj
    }
    catch(err){
        console.log("error in handleCasesByInputType ::: ",err.message)
    }
}

async function appendAnswerOptions(modelName,obj,modelFilter){
    try{
        let documents = await moongose.model(modelName).find(modelFilter).lean()
        let answerOptions = []
        let childOptions = []
         documents.forEach((item,index)=>{
            let  answerObj = {
                "name":item.name,
                "did":[],
                "_id":JSON.stringify(index+1),
                "option_id":item._id,
                "viewSequence":index+1
            }
             childObj = {
                "type":item._id,
                "value":item.name,
                "order":JSON.stringify(index+1)
            }
            answerOptions.push(answerObj)
        })
        obj['answer_option'] = answerOptions
        // console.log("this is object ::: ",obj)
        // obj['child'] = childOptions
        return obj
    }
    catch(err){
        console.log("error in appendFromModel ::: ",err.message)
    }
}

function checkForUndefinedVaribales(obj) {
    let validator = {
        message: "",
        valid: true
    }
    try {
        for (let key in obj) {
            if (!obj[key]) {
                console.log(validator[key])
                validator.valid = false
                validator.message = `${key} is required`
                return validator
            }
        }
        validator.message = ""
    }
    catch (err) {
        console.log("error in check for undefined variables :: ", err.message)
    }
    return validator
}
module.exports.checkForUndefinedVaribales = checkForUndefinedVaribales
module.exports.mutuateGetPayload = mutuateGetPayload

function appendExtraKeys(keys, jsonObj, form) {
    let obj = { ...jsonObj }
    try {
        for (let key of keys) {
            if (Object.keys(form).includes(key.replace(" ", ""))) {
                obj[key] = form[key]
            }
            else{
                obj[key] = ""
            }
        }
    }
    catch (err) {
        console.log("error in appendExtraKeys ::: ", err.message)
    }
    return obj
}

function deleteKeys(obj, delKeys) {
    try {
        for (let del of delKeys) {
            delete obj[del]
        }

    }
    catch (err) {
        console.log("error in deleteKeys ::::: ", err.message)
    }
}

module.exports.masterAction =  async (req, res) => {
    try {
      let { decoded: userData, body: bodyData } = req;

      let { role: actionTakenByRole, _id: actionTakenBy } = userData;
      let {formId, multi, shortKeys, responses, ulbs, form_level, design_year} =  bodyData;
      
      if(!formId || !bodyData.hasOwnProperty("multi") || !shortKeys || !responses || !ulbs || !ulbs.length || !design_year || !form_level){
        return Response.BadRequest(res, {}, "All fields are mandatory")
      }
      let path = modelPath(formId);
      let condition = {
        ulb: {$in: ulbs},
        design_year: design_year,
      };

      const model = require(`../../models/${path}`);
      const formData = await model.find(condition).lean();
    //   let level = form_level;
      if(!formData || !formData.length){
        return Response.BadRequest(res, {}, "No Form Found!")
      }
    //   if(multi){
        let params = {formData, actionTakenByRole, actionTakenBy,bodyData}
          let actionResponse = await takeActionOnForms(params,res)
    //   } else {
    //     let [form] = formData; 
    //   }
      if(actionResponse === formData.length){
        return Response.OK(res, {}, "Action Successful");
      }else{
        return Response.BadRequest(res, {}, actionResponse);
      }
    } catch (error) {
      return Response.BadRequest(res, {}, error.message);
    }
}

async function takeActionOnForms(params, res) {
  try {
    let { bodyData, actionTakenBy, actionTakenByRole, formData } = params;
    let { formId, multi, shortKeys, responses, form_level } = bodyData;
    let count = 0;
    let path = modelPath(formId);
    const model = require(`../../models/${path}`);
    for (let form of formData) {
      let bodyData = {
        formId,
        recordId: ObjectId(form._id),
        data: form,
      };
      /* Saving the form history of the user. */
      let formHistoryResponse = await saveFormHistory({ body: bodyData });
      if (formHistoryResponse !== 1)
        throw "Action failed to save form history!";
      let saveStatusResponse;
      /* Saving the status of the form of form_level type. */
      if (form_level === FORM_LEVEL["form"]) {
        let [response] = responses;
        let [shortKey] = shortKeys;
        let params = {
          formId,
          form,
          response,
          form_level,
          actionTakenByRole,
          actionTakenBy,
          multi,
          shortKey,
          res,
        };
        saveStatusResponse = await saveStatus(params);
        let updatedFormCurrentStatus = await updateFormCurrentStatus(
          model,
          form._id,
          response
        );
        if (updatedFormCurrentStatus !== 1)
          throw "Action failed to update form current Status!";
      } else if (form_level === FORM_LEVEL["question"]) {
        //multi = true=>> review table action
        if (multi) {
          let [response] = responses;
          for (let shortKey of shortKeys) {
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              shortKey,
              res,
            };
            saveStatusResponse = await saveStatus(params);
          }
          let updatedFormCurrentStatus = await updateFormCurrentStatus(
            model,
            form._id,
            response
          );
          if (updatedFormCurrentStatus !== 1)
            throw "Action failed to update form current Status!";
        } else {
          let rejectStatusCount = 0;
          for (let response of responses) {
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              shortKey,
              res,
            };
            saveStatusResponse = await saveStatus(params);
            if (
              [
                MASTER_STATUS["Rejected by MoHUA"],
                MASTER_STATUS["Rejected by State"],
              ].includes(response.status)
            ) {
              rejectStatusCount++;
            }
          }
          if (rejectStatusCount) {
            response.status =
              actionTakenByRole === "MoHUA"
                ? MASTER_STATUS["Rejected by MoHUA"]
                : MASTER_STATUS["Rejected by State"];
            let updatedFormCurrentStatus = await updateFormCurrentStatus(
              model,
              form._id,
              response
            );

            if (updatedFormCurrentStatus !== 1)
              throw "Action failed to update form current Status!";
          } else {
            response.status =
              actionTakenByRole === "MoHUA"
                ? MASTER_STATUS["Approved by MoHUA"]
                : MASTER_STATUS["Under Review by MoHUA"];
            let updatedFormCurrentStatus = await updateFormCurrentStatus(
              model,
              form._id,
              response
            );
            if (updatedFormCurrentStatus !== 1)
              throw "Action failed to update form current Status!";
          }
        }
      } else if (form_level === FORM_LEVEL["tab"]) {
        if (multi) {
          let [response] = responses;
        /* Getting the short keys from the short keys array and separating them into an array of arrays based on tab and questions */
          let shortKeysResponse = getSeparatedShortKeys(shortKeys);
          /* Saving the status of the form for questions */
          for (let shortKey of shortKeysResponse["inner"]) {
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              shortKey,
              res,
            };
            saveStatusResponse = await saveStatus(params);
          }
            /* Saving the status of the form for tabs */
          for (let shortKey of shortKeysResponse["outer"]) {
            shortKey = `tab_${shortKey}`;
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              shortKey,
              res,
            };
            saveStatusResponse = await saveStatus(params);
          }
          //Updating form Level status
          let updatedFormCurrentStatus = await updateFormCurrentStatus(
            model,
            form._id,
            response
          );
          if (updatedFormCurrentStatus !== 1)
            throw "Action failed to update form current Status!";
        } else {
          let rejectStatusAllTab = 0;
          //gets tabs array
          let { outer: tabLevelShortKeys } = getSeparatedShortKeys(shortKeys);
          let tabShortKeyObj = {},
            tabShortKeyResponse = {};
          for (let tab of tabLevelShortKeys) {
            tabShortKeyObj[tab] = 0;
          }
          const separator = ".";
          for (let response of responses) {
            let splitedArrayTab =
              response.shortKey.split(separator).length > 1
                ? response.shortKey.split(separator)[0]
                : "";

            if (
              splitedArrayTab !== "" &&
              [
                MASTER_STATUS["Rejected by MoHUA"],
                MASTER_STATUS["Rejected by State"],
              ].includes(response.status)
            ) {
              tabShortKeyObj[splitedArrayTab] = tabShortKeyObj[
                splitedArrayTab
              ]++;
            }
            //storing response of tabs if questions are not provided
            if (tabShortKeyObj[response.shortKey]) {
              tabShortKeyResponse[response.shortKey] = response;
              continue;
            }
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              shortKey: "",
              res,
            };

            saveStatusResponse = await saveStatus(params);
          }
          //saving status of tabs
          for (let obj in tabShortKeyObj) {
            let response = tabShortKeyResponse[obj];
            if (
              response &&
              [
                MASTER_STATUS["Rejected by MoHUA"],
                MASTER_STATUS["Rejected by State"],
              ].includes(response.status)
            ) {
              rejectStatusAllTab++;
              response.shortKey = `tab_${obj}`;
            }
            if (!response) {
              let status;
              if (tabShortKeyObj[obj]) {
                status =
                  actionTakenByRole === "MoHUA"
                    ? MASTER_STATUS["Rejected by MoHUA"]
                    : MASTER_STATUS["Rejected by State"];
                rejectStatusAllTab++;
              } else {
                status =
                  actionTakenByRole === "MoHUA"
                    ? MASTER_STATUS["Approved by MoHUA"]
                    : MASTER_STATUS["Under Review by MoHUA"];
              }
              response = {
                status,
                rejectReason: "",
                responseFile: { url: "", name: "" },
                shortKey: `tab_${obj}`,
              };
            }
            let params = {
              formId,
              form,
              response,
              form_level,
              actionTakenByRole,
              actionTakenBy,
              multi,
              obj,
              res,
            };
            saveStatusResponse = await saveStatus(params);
          }
          //form level status  updation
          if (rejectStatusAllTab) {
            response.status =
              actionTakenByRole === "MoHUA"
                ? MASTER_STATUS["Rejected by MoHUA"]
                : MASTER_STATUS["Rejected by State"];
            let updatedFormCurrentStatus = await updateFormCurrentStatus(
              model,
              formId,
              response
            );
            if (updatedFormCurrentStatus !== 1)
              throw "Action failed to update form current Status!";
          } else {
            response.status =
              actionTakenByRole === "MoHUA"
                ? MASTER_STATUS["Approved by MoHUA"]
                : MASTER_STATUS["Under Review by MoHUA"];
            let updatedFormCurrentStatus = await updateFormCurrentStatus(
              model,
              form._id,
              response
            );
            if (updatedFormCurrentStatus !== 1)
              throw "Action failed to update form current Status!";
          }
        }
      }
      if (saveStatusResponse !== 1) {
        throw "Action failed to save status!";
      } else {
        count++;
      }
    }
    return count;
  } catch (error) {
    return error.message;
  }
}

async function updateFormCurrentStatus(model, formId, response) {
    try {
        const updatedFormResponse = await model
            .findOneAndUpdate(
                { _id: formId },
                {
                    $set: {
                        currentFormStatus: response.status,
                    },
                }
            )
            .lean();
        if (!updatedFormResponse){
            throw ("Action failed to update form current Status!");
        }
        return 1;
    } catch (error) {
        return  error.message; 
    }
}

async function saveStatus(params) {
    try {
        let {formId,
            form,
            response,
            form_level,
            actionTakenByRole,
            actionTakenBy,
            multi,
            shortKey,
            res} = params;
        let currentStatusData = {
            formId,
            recordId: ObjectId(form._id),
            shortKey: response.shortKey,
            status: response.status,
            level: form_level,
            rejectReason: response.rejectReason,
            responseFile: response.responseFile,
            actionTakenByRole: actionTakenByRole,
            actionTakenBy: ObjectId(actionTakenBy),
          };
        
          (multi && form_level === FORM_LEVEL["question"]) ? currentStatusData["shortKey"] = shortKey : ""
          let currentStatus = await saveCurrentStatus({ body: currentStatusData });
          
          let statusHistory = {
            formId,
            recordId: ObjectId(form._id),
            shortKey: response.shortKey,
            data: currentStatusData,
          };
        
          (multi && form_level === FORM_LEVEL["question"]) ? statusHistory["shortKey"] = shortKey  : ""

          let statusHistoryData = await saveStatusHistory({ body: statusHistory });
          if (currentStatus === 1 && statusHistoryData === 1){
            return 1;
          }
          return 0;
          
    } catch (error) {
      return  error.message; 
    }
}

module.exports.getMasterAction = async (req, res) => {
    try {
      let { decoded: userData, body: bodyData } = req;

      let { role } = userData;
      let { formId, ulb, design_year } = bodyData;

      if (!formId || !ulb || !design_year) {
        return Response.BadRequest(res, {}, "All fields are mandatory");
      }
      let path = modelPath(formId);
      let condition = {
        ulb,
        design_year: design_year,
      };

      const model = require(`../../models/${path}`);
      const form = await model.findOne(condition,{_id:1}).lean();
      if (!form) {
        return Response.BadRequest(res, {}, "No Form Found!");
      }
      const currentStatusResponse = await CurrentStatus.find({recordId: form._id}).lean()
      if(!currentStatusResponse || !currentStatusResponse.length){
        return Response.BadRequest(res, {}, "No Response Found!");
      }
    //   let params = {
    //     status: form.currentFormStatus,
    //     formType: "ULB",
    //     loggedInUser: role,
    //   };
    //   Object.assign(form, {
    //     canTakenAction: canTakenActionMaster(params),
    //   });

      return Response.OK(res, currentStatusResponse);
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);

    }
}


async function getSeparatedShortKeys(params) {
  const { shortKeys } = params;
  const First_Index = 0;
  let output = {
    outer: [],
    inner: [],
  };
  const separator = ".";
  for (let shortKey of shortKeys) {
    let splitedArray = shortKey.split[separator];
    let splitedArrayLength = splitedArray.length - 1;
    if (Array.isArray(splitedArray) && splitedArrayLength) {
      splitedArray[First_Index] === splitedArray[splitedArrayLength]
        ? output["inner"].push(shortKey)
        : output["outer"].push(shortKey);
    }
  }

  return output;
}


async function nestedObjectParser(data,req){
    try{
        const result = {};
        await data.forEach(async(item) => {
        let shortKey = item.shortKey
        const keys = shortKey.split(".");
        let pointer = result;
        let temp = {}
        let value = await decideValues(temp,shortKey,item,req)
        if(shortKey == "audited.submit_annual_accounts"){
            console.log("Value ;:: ",value)
        }
        // console.log("value :: ",value)
        await keys.forEach((key, index) => {
                if (!pointer.hasOwnProperty(key)) {
                pointer[key] = {};
                }
                if (index === keys.length - 1) {
                pointer[key] = value;
                }
                pointer = pointer[key];
            });
        });
        return result

    }
    catch(err){
        console.log("error in nestedObjectParser: ::: ",err.message)
    }
}
module.exports.nestedObjectParser = nestedObjectParser