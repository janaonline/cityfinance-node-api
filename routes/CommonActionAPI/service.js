const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const Option = require('../../models/Option')
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const moongose = require('mongoose')
const { DurProjectJson } = require("./jsons")
const StatusList = require('../../util/newStatusList')
const catchAsync = require('../../util/catchAsync')
const ObjectId = require("mongoose").Types.ObjectId;
const Sidemenu = require('../../models/Sidemenu');
const userTypes = require("../../util/userTypes")
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const { FormNames, FORM_LEVEL, MASTER_STATUS, YEAR_CONSTANTS, ULB_ACCESSIBLE_YEARS, USER_ROLE, MODEL_PATH, MASTER_FORM_STATUS } = require('../../util/FormNames');
const { calculateTabwiseStatus } = require('../annual-accounts/utilFunc');
const { modelPath } = require('../../util/masterFunctions')
const Response = require("../../service").response;
const { saveCurrentStatus, saveFormHistory, saveStatusHistory } = require('../../util/masterFunctions');
const CurrentStatus = require('../../models/CurrentStatus');
const { MASTER_STATUS_ID, FORM_LEVEL_SHORTKEY, FORMIDs } = require('../../util/FormNames');
const { ModelNames } = require('../../util/15thFCstatus');
const UA = require('../../models/UA');
const User = require('../../models/User');
const ULB = require('../../models/Ulb');
const { default: axios } = require('axios');
const { concatenateUrls } = require('../../service/common');
const { BackendHeaderHost } = require('../../util/envUrl');
// const { getUAShortKeys } = require('../CommonFormSubmissionState/service');
var allowedStatuses = [StatusList.Rejected_By_MoHUA, StatusList.STATE_REJECTED, StatusList.Rejected_By_State, StatusList.In_Progress, StatusList.Not_Started]
var ignorableKeys = ["actionTakenByRole", "actionTakenBy", "ulb", "design_year"]
let groupedQuestions = {
    "location": ['lat', 'long']
}
let addMoreFields = ["transferGrantdetail_tableview_addbutton", "projectDetails_tableView_addButton"]
let yearValueField = {
    "year": "",
    "value": ""
}

let nestedTables = {
    "GtcInstallmentForm": "TransferGrantDetailForm"
}

let objectFields = {
    "waterSupply_actualIndicator": { "fieldName": "actualYear", "object": { ...yearValueField } },
    "waterSupply_targetIndicator": { "fieldName": "targetYear", "object": { ...yearValueField } },
    "sanitation_actualIndicator": { "fieldName": "actualYear", "object": { ...yearValueField } },
    "sanitation_targetIndicator": { "fieldName": "targetYear", "object": { ...yearValueField } },
    "stormWater_actualIndicator": { "fieldName": "actualYear", "object": { ...yearValueField } },
    "stormWater_targetIndicator": { "fieldName": "targetYear", "object": { ...yearValueField } },
    "solidWaste_actualIndicator": { "fieldName": "actualYear", "object": { ...yearValueField } },
    "solidWaste_targetIndicator": { "fieldName": "targetYear", "object": { ...yearValueField } },
}
let dynamicTables = ['Category']
var formIdCollections = {
    "80": "PropertyTaxOp"
}
var DurCase = ['projectDetails_tableView_addButton']
var consentCases = {
    "1": true,
    "2": false
}
var radioButtons = {
    "1": "Yes",
    "2": "No"
}
var arrFields = {
    "waterManagement_tableView": "categoryWiseData_wm",
    "solidWasteManagement_tableView": "categoryWiseData_swm",
    "projectDetails_tableView_addButton": "projects",
    "waterSupply_tableView": "data.water supply",
    "sanitation_tableView": "data.sanitation",
    "solidWaste_tableView": "data.solid waste",
    "stormWater_tableView": "data.storm water",
    "transferGrantdetail_tableview_addbutton": "transferGrantdetail",

}

var categoryTable = {}
var specialCases = ['projectDetails_tableView_addButton', 'waterSupply_tableView', 'solidWaste_tableView', 'stormWater_tableView', 'sanitation_tableView', "transferGrantdetail_tableview_addbutton"]
var annualRadioButtons = { // if there are any label changes for radio button in frontend please update here
    "Yes": true,
    "No": false,
    "Agree": true
}
var customBtnsWithFormID = {
    "5": annualRadioButtons,
}

const customDisableFields = {
    "actual": "actualDisable",
    "target_1": "targetDisable"
}
var customkeys = {
    "basic": {
        "year": "year",
        "ulbType": "ulbType",
        "grantType": "grantType",
        "installment_type": "installment_type"
    },
    "statedetails": {
        "totalMpc": "totalMpc",
        "totalNmpc": "totalNmpc",
        "totalElectedMpc": "totalElectedMpc",
        "totalElectedNmpc": "totalElectedNmpc",
    },
    "recgrandtetail": {
        "recAmount": "recAmount",
        "receiptDate": "receiptDate",
    },
    "sfcDetail": {
        "recomAvail": "recomAvail",
        "grantDistribute": "grantDistribute",
        "sfcNotification": "sfcNotification",
        "sfcNotificationCopy": "sfcNotificationCopy"
    },
    "propertyTaxDetails": {
        "propertyTaxNotif": "propertyTaxNotif",
        "propertyTaxNotifCopy": "propertyTaxNotifCopy"
    },
    "pfmsDetails": {
        "accountLinked": "accountLinked",
    },
    "projectDetail": {
        "projectUndtkn": "projectUndtkn"
    },
    "transferGrantdetail_tableview_addbutton": {
        "transAmount": "transAmount",
        "transDate": "transDate",
        "transDelay": "transDelay",
        "daysDelay": "daysDelay",
        "interest": "interest",
        "intTransfer": "intTransfer",
        // "totalTransAmount":"totalTransAmount",
        // "totalIntTransfer":"totalIntTransfer",
    },
    "general": {
        "ulbName": "ulbName",
        "grantType": "grantType"
    },
    "selfDec": {
        "name_": "name",
        "designation": "designation"
    },
    "grantPosition": {
        "grantPosition.unUtilizedPrevYr": "grantPosition.unUtilizedPrevYr",
        "grantPosition.receivedDuringYr": "grantPosition.receivedDuringYr",
        "grantPosition.expDuringYr": "grantPosition.expDuringYr",
        "grantPosition.closingBal": "grantPosition.closingBal",
    },

    "waterManagement_tableView": {
        "category_name": "wm_category_name",
        "grantUtilised": "wm_grantUtilised",
        "numberOfProjects": "wm_numberOfProjects",
        "totalProjectCost": "wm_totalProjectCost"

    },
    "solidWasteManagement_tableView": {
        "category_name": "sw_category_name",
        "grantUtilised": "sw_grantUtilised",
        "numberOfProjects": "sw_numberOfProjects",
        "totalProjectCost": "sw_totalProjectCost"

    },
    "waterSupply_tableView": {
        "question": "waterSupply_question",
        "actual": "waterSupply_actualIndicator",
        "target_1": "waterSupply_targetIndicator",
        "indicatorLineItem": "waterSupply_indicatorLineItem",
        "type": "waterSupply_type",
        "unit": "waterSupply_unit",
        "actualDisable": "actualDisable",
        "targetDisable": "targetDisable",
        "range": "range"
    },
    "solidWaste_tableView": {
        "question": "solidWaste_question",
        "actual": "solidWaste_actualIndicator",
        "target_1": "solidWaste_targetIndicator",
        "indicatorLineItem": "solidWaste_indicatorLineItem",
        "type": "solidWaste_type",
        "unit": "solidWaste_unit",
        "actualDisable": "actualDisable",
        "range": "range",
        "targetDisable": "targetDisable"
    },
    "sanitation_tableView": {
        "question": "sanitation_question",
        "actual": "sanitation_actualIndicator",
        "target_1": "sanitation_targetIndicator",
        "indicatorLineItem": "sanitation_indicatorLineItem",
        "unit": "sanitation_unit",
        "type": "sanitation_type",
        "actualDisable": "actualDisable",
        "targetDisable": "targetDisable",
        "range": "range"
    },
    "stormWater_tableView": {
        "question": "stormWater_question",
        "actual": "stormWater_actualIndicator",
        "target_1": "stormWater_targetIndicator",
        "indicatorLineItem": "stormWater_indicatorLineItem",
        "unit": "stormWater_unit",
        "type": "stormWater_type",
        "actualDisable": "actualDisable",
        "targetDisable": "targetDisable",
        "range": "range"
    },
    "projectDetails_tableView_addButton": {
        "cost": 'cost',
        "expenditure": 'expenditure',
        "modifiedAt": 'modifiedAt',
        "createdAt": 'createdAt',
        "isActive": 'isActive',
        "_id": '_id',
        "category": 'category',
        'dpr_status': 'dpr_status',
        "name": 'name',
        "location": 'location',
        "capitalExpenditureState": 'capitalExpenditureState',
        "capitalExpenditureUlb": 'capitalExpenditureUlb',
        "omExpensesState": 'omExpensesState',
        "omExpensesUlb": 'omExpensesUlb',
        "stateShare": 'stateShare',
        "percProjectCost": "percProjectCost",
        "completionDate": "completionDate",
        "startDate": "startDate"
    }

}
var modifiedShortKeys = {
}
module.exports.modifiedShortKeys = modifiedShortKeys
var shortKeysWithModelName = {
    "rating": { "modelName": "Rating", "identifier": "option_id", "from": "value" },
    "category": { "modelName": "Category", "identifier": "name", "from": "label" },
    "dpr_status": { "modelName": "Option", "identifier": "name", "from": "label" }
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
    "14": "value",
    "5": "value"
}
async function getUAShortKeys(state) {
    const uaShortkeyQuery = [
        {
            $match: {
                state: ObjectId(state),
            },
        },
        {
            $group: {
                _id: "$state",
                uaCode: { $push: "$UACode" }
            }
        }
    ];
    let UasDataWithShortKey = await UA.aggregate(uaShortkeyQuery);
    let shortKeys = [];
    if (Array.isArray(UasDataWithShortKey) && UasDataWithShortKey.length) {
        shortKeys = UasDataWithShortKey[0]['uaCode'];
    }
    return shortKeys;
}
module.exports.getUAShortKeys = getUAShortKeys;
const calculateStatus = (status, actionTakenByRole, isDraft, formType) => {
    switch (formType) {
        case "ULB":
            switch (true) {
                case (status == 'PENDING' || !status || 'N/A') && (actionTakenByRole == 'ULB' || actionTakenByRole == "MoHUA") && isDraft:
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

module.exports.calculateStatusMaster = (status) => {
    if (MASTER_STATUS_ID.hasOwnProperty(status)) {
        return MASTER_STATUS_ID[status];
    } else {
        return MASTER_STATUS_ID['1'];
    }
}

module.exports.calculateStatusForFiscalRankingForms = (status = "", actionTakenByRole = "", isDraft = "", formType) => {
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
function canTakenActionMaster(params) {
    let { status, formType, loggedInUser } = params;
    switch (formType) {
        case "ULB":
            if (loggedInUser == "STATE") {
                if (status === MASTER_STATUS["Under Review By State"]) {
                    return true;
                } else {
                    return false;
                }
            } else if (loggedInUser == "MoHUA") {
                if (status === MASTER_STATUS["Under Review By MoHUA"]) {
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
                if (status === MASTER_STATUS["Under Review By MoHUA"]) {
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
module.exports.canTakenActionMaster = canTakenActionMaster;

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
                form = forms.find(entity => ulb?.toString() === entity.ulb?.toString())
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
function findForm(formArray, stateId) {
    let forms = formArray.filter((element) => {
        return element.state.toString() === stateId.toString()
    })
    return forms;
}

let apiUrls = {
    "demo": `https://${process.env.DEMO_HOST_BACKEND}/api/v1/`,
    "staging": `https://${process.env.STAGING_HOST}/api/v1/`,
    "production": `https://${process.env.PROD_HOST}/api/v1/`
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
                str += ele[key].toString().split(",").join(" ") + ","
            }
            else {
                str += " " + ","
            }

        }
        if (Object.keys(ele).length > 0) {
            res.write(str + "\r\n")
        }
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
            document = JSON.parse(JSON.stringify(document));
            document = concatenateUrls(document);
            if (fromArr) {
                for (let ele of document[fromArr]) {
                    ele['type'] = ele.type ? ele.type.toUpperCase() : ""
                    ele['projectReport'] = ele?.projectReport ? ele?.projectReport?.url : ""
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

module.exports.canTakeActionOrViewOnlyMasterForm = (params) => {
    const { status, userRole, adminLevel = false } = params;
    switch (true) {
        case status == MASTER_STATUS['Not Started']:
            return false;
            break;
        case status == MASTER_STATUS['In Progress']:
            return false;
            break;
        case status == MASTER_STATUS['Under Review By State'] && userRole == 'STATE':
            return true;
            break;
        case status == MASTER_STATUS['Under Review By MoHUA'] && adminLevel && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            console.log("adminglevel ::: ", adminLevel)
            return true
            break;
        case status == MASTER_STATUS['Under Review By State'] && (userRole == 'MoHUA' || userRole == 'ADMIN'):
            return false;
            break;
        case status == MASTER_STATUS['Returned By State']:
            return false;
            break;
        case status == MASTER_STATUS['Returned By MoHUA']:
            return false;
            break;
        case status == MASTER_STATUS['Under Review By MoHUA'] && userRole == 'STATE':
            return false;
            break;
        case status == MASTER_STATUS['Under Review By MoHUA'] && userRole == 'MoHUA':
            return true;
            break;
        case status == MASTER_STATUS['Submission Acknowledged By MoHUA']:
            return false;
            break;
        case status == MASTER_STATUS['Verification Not Started']:
            return true;
            break;
        case status == MASTER_STATUS['Verification In Progress']:
            return true;
            break;
        case status == MASTER_STATUS['Returned by PMU']:
            return false;
            break;
        case status == MASTER_STATUS['Submission Acknowledged by PMU']:
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
                "format": this.dateFormat,
                "timezone": "Asia/Kolkata"
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
    static addTwoFieldData(firstField, secondField) {
        return {
            "$add": [firstField, secondField]
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
        if (!isNaN(iterator)) {
            let iteratorKey = flattenedKey.split(".")[0]
            if (iteratorKey != "_id") {
                target.parent_arr.add(iteratorKey)
            }
        }
        if (currentNode.hasOwnProperty(key)) {
            var newKey;
            if (key === "receiptDate") {
                console.log(">>>>>> re >>>>", flattenedKey)
            }
            if (flattenedKey === undefined) {
                newKey = key;

            } else {
                let iteratorObjKey = flattenedKey.split(".")[0]
                newKey = flattenedKey + '.' + key;
                if (iteratorObjKey != "_id" && !target.parent_arr.has(iteratorObjKey)) {
                    target.parent_obj.add(iteratorObjKey)
                }

                // }
            }
            var value = currentNode[key] === null ? "" : currentNode[key]
            let isDateInstance = (value instanceof Date)
            if (typeof value === "object" && !Array.isArray(value) && !ignorableKeys.includes(key) && !isDateInstance) {
                traverseAndFlatten(value, target, newKey);
            } else {
                target[newKey] = value;
                // console.log(">>>>>>>>>>>>>>>>>>>",newKey)
            }

        }
    }
}

module.exports.getFlatObj = (obj) => {
    let flattendObj = {}
    flattendObj['parent_arr'] = new Set()
    flattendObj['parent_obj'] = new Set()
    traverseAndFlatten({ ...obj }, flattendObj)
    // let flattenArr = []
    flattendObj['parent_arr'] = Array.from(flattendObj['parent_arr'])
    flattendObj['parent_obj'] = Array.from(flattendObj['parent_obj'])
    return flattendObj
}

class PayloadManager {
    constructor(temp, shortKey, objects, req, shortKeysWithModelName) {
        this.answerLabels = {
            "2": "value",
            "1": "textValue"
        }
        this.temp = temp
        this.shortKey = shortKey
        this.objects = objects
        this.req = req
        this.shortKeysWithModelName = shortKeysWithModelName
        this.inputName = inputType[objects.input_type]
        this.value = objects['answer'][0][this.inputName]
        this.formId = req.body.formId || ""
    }
    async getValuesFromModel() {
        try {
            if (Object.keys(this.shortKeysWithModelName).includes(this.shortKey)) {
                let modelName = shortKeysWithModelName[this.shortKey].modelName
                let fromValue = shortKeysWithModelName[this.shortKey].from
                let identifier = shortKeysWithModelName[this.shortKey].identifier
                let fromString = this.objects['answer'][0][fromValue]
                let filters = {}
                filters[identifier] = fromString
                if (Object.keys(this.req.body).includes("isGfc")) {
                    filters[identifier] = parseInt(filters[identifier])
                    filters['formName'] = this.req.body.isGfc ? "gfc" : "odf"
                    filters['financialYear'] = this.req.body.design_year
                }
                if(this.shortKey === "dpr_status"){
                    filters['type'] = this.shortKey
                }
                let databaseObj;
                if (dynamicTables.includes(modelName)) {
                    databaseObj = categoryTable[fromString]
                }
                else {
                    databaseObj = await moongose.model(modelName).findOne(filters)
                }
                let mainvalue = databaseObj._id
                return mainvalue
            }
            else {
                let answer = this.objects.answer.find(item => this.value)
                this.value = answer.label
                return this.value
            }
        }
        catch (err) {
            console.log("getValuesFromModel :::::::: ", err.message)
        }
    }
    async handleFileObjects() {
        try {
            if (Array.isArray(this.inputName)) {
                let mainvalue = {
                    "name": this.objects['answer'][0]['label'],
                    "url": this.objects['answer'][0]['value'],
                }
                return mainvalue
            }
        }
        catch (err) {
            console.log("error in handleFileObjects ::: ", err.message)
        }
    }
    async handleRadioButtons() {
        try {
            let label = this.objects['answer'][0]['label']
            this.value = radioButtons[this.value.value] != undefined ? radioButtons[this.value.value] : radioButtons[this.value]
            if (Object.keys(customBtnsWithFormID).includes(this.formId.toString())) {
                let radioButtonObj = customBtnsWithFormID[this.formId.toString()]
                this.value = radioButtonObj[label]
            }
            return this.value
        }
        catch (err) {
            console.log("error in handleRadioButtons ::: ", err.message)
        }
    }
    async getNumericValues() {
        try {
            let shortKey = this.objects['shortKey']
            this.value = this.objects['answer'][0]['value']
            if (Object.keys(objectFields).includes(shortKey)) {
                let object = objectFields[shortKey]['object']
                object['year'] = this.req.body[objectFields[shortKey]['fieldName']]
                object['value'] = this.objects['answer'][0]['value']
                this.value = { ...object }
            }
            return this.value
        }
        catch (err) {
            console.log("error in  getNumericValues ::: ", err.message)
        }
    }
    async getTextValues() {
        try {
            this.value = this.objects['answer'][0]['textValue']
            return this.value
        }
        catch (err) {
            console.log("error in getTextValues :", err.message)
        }
    }
    async handleConsentValues() {
        try {
            let answer = consentCases[this.objects['answer'][0]['value']]
            this.value = answer
            return this.value
        }
        catch (err) {
            console.log("error in handleConsentValue ::: ", err.message)
            return this.value = false
        }
    }
    async handleGpsValues() {
        try {
            let answer = this.objects['answer'][0]['value'].split(",")
            let locationObj = {
                'lat': answer?.[0],
                'long': answer?.[1]
            }
            this.value = { ...locationObj }
            return this.value
        }
        catch (err) {
            console.log("error in handleGps values ::: ", err.message)
            return this.value = {
                "lat": 0,
                "long": 0,
            }
        }
    }
    async handleDateValues() {
        try {
            let answer = this.objects['answer'][0]['value']
            if (!answer || Array.isArray(answer)) {
                answer = "" // static code because of issue in mform json
            }
            else {
                answer = new Date(answer)
            }
            this.value = answer
            return this.value
        }
        catch (err) {
            console.log("error in handleDateValues :: ", err.message)
        }
    }
}


async function decideValuesByInputType(temp, shortKey, objects, req) {
    try {
        let service = new PayloadManager(temp, shortKey, objects, req, shortKeysWithModelName)
        let inputName = inputType[objects.input_type]
        let value = objects['answer'][0][inputName] || ''
        switch (objects.input_type) {
            case "1":
                value = await service.getTextValues()
                break
            case "2":
                value = await service.getNumericValues()
                break
            case "3":
                value = await service.getValuesFromModel()
                break
            case "11":
                value = await service.handleFileObjects()
                break
            case "5":
                value = await service.handleRadioButtons()
                break
            case "22":
                value = await service.handleConsentValues()
                break
            case "19":
                value = await service.handleGpsValues()
                break
            case "14":
                value = await service.handleDateValues()
            default:
                value = value
                temp[shortKey] = value
                break
        }
        temp[shortKey] = value
        return value
    }
    catch (err) {
        console.log("error in decideValuesByInputType ::: ", err.message)
    }
}

async function returnParsedObj(objects, req) {
    try {
        let keys = { ...inputType }
        let shortKey = objects.shortKey.replace(" ", "")
        let splittedShortKey = shortKey.split(".")
        let inputName = keys[objects.input_type]
        if (splittedShortKey.length > 1) {
            let answers = objects['answer']
            let value = objects['answer'][0][inputName]

            if (answers.length > 1) {
                value = objects['answer'].map(item => item[inputName])
            }
            let obj = splittedShortKey.reduceRight((obj, key) => ({ [key]: obj }), value)
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

            if (modifiedKeys.includes(shortKey)) {
                shortKey = modifiedShortKeys[shortKey]
            }
            await decideValuesByInputType(temp, shortKey, objects, req)
            return temp
        }
    }
    catch (err) {
        console.log("error in returnParsedObj ::: ", err.message)
    }
}


async function payloadParser(body, req) {
    try {
        let payload = {}
        let modifiedBody = [...body]
        for (let objects of modifiedBody) {
            let temp = await returnParsedObj(objects, req)
            if (objects.child) {
                temp['data'] = []
                for (let childern of objects.child) {
                    let index = modifiedBody.findIndex((item) => item.order === childern)
                    let object = modifiedBody[index]
                    modifiedBody.splice(index, 1)
                    let temp2 = await returnParsedObj(object, req)
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

function roleWiseJson(json, role) {
    let removableObjects = [
        "responseFile",
        "status",
        "rejectReason",
        "rejectReason_state",
        "rejectReason_mohua",
        "responseFile_state",
        "responseFile_mohua"
    ]
    try {
        // if(role === userTypes.ulb){
        json.question = json.question.filter(item => !removableObjects.includes(item.shortKey))
        // }
    }
    catch (err) {
        console.log("error in roleWiseJson ::: ", err.message)
    }
}

async function handleSelectCase(question, obj, flattedForm) {
    try {
        if (question.modelName && flattedForm[question.shortKey]) {
            let value = flattedForm[question.shortKey]
            let tempObj = question.answer_option.find(item => item.option_id.toString() == value.toString())
            if (tempObj) {
                obj['label'] = tempObj['name']
                obj['value'] = tempObj['_id']
                question['modelValue'] = tempObj['_id']
                question['value'] = tempObj['_id']
            }
        }
        else if (question.answer_option.length) {
            let keys = question.answer_option.map(item => item.name)
            let value = flattedForm[question.shortKey]
            if (keys.includes(value)) {
                let tempObj = question.answer_option.find(item => item.name === value)
                obj['label'] = tempObj['name']
                obj['value'] = tempObj['_id']
                question['modelValue'] = tempObj['_id']
                question['value'] = tempObj['_id']
                question['selectedAnswerOption'] = { 'name': tempObj['_id'] }

            }
        }
        return obj
    }
    catch (err) {
        console.log("error in handleSelectCase ::: ", err.message)
    }
}

module.exports.mutateJson = async (jsonFormat, keysToBeDeleted, query, role) => {
    try {
        let obj = [...jsonFormat]
        roleWiseJson(obj[0], role)
        obj[0] = await appendExtraKeys(keysToBeDeleted, obj[0], query)
        // await deleteKeys(flattedForm, keysToBeDeleted)

        for (let key in obj) {
            let questions = obj[key].question
            if (obj[key].question) {
                for (let question of questions) {
                    let obj = { ...answerObj }
                    obj = await handleCasesByInputType(question, obj)
                    await deleteExtraKeys(question)
                }
            }
        }
        // await deleteKeys(flattedForm, keysToBeDeleted)
        return obj
    }
    catch (err) {
        console.log("error in mutateJson ::: ", err.message)
    }
}
async function handleGroupedQuestions(questionObj, formObj) {
    try {
        let answerObj = { label: '', textValue: '', value: '' }
        let question = { ...questionObj }
        let answer = formObj[questionObj.shortKey]
        let value = Object.values(answer).join(",")
        question.value = value
        question.modelValue = value
        answerObj.textValue = value
        answerObj.value = value
        question.selectedValue = [answerObj]
        question.answer = { ...question.answer, answer: [answer] }
        return question
    }
    catch (err) {
        console.log("error in  handleGroupedQuestions:::", err.message)
    }
    return questionObj
}
async function handleDbValues(questionObj, formObj, order) {
    try {
        let answer = { label: '', textValue: '', value: '' }
        let questionOrder = order.toFixed(3)
        if (Object.keys(groupedQuestions).includes(questionObj.shortKey)) {
            questionObj = await handleGroupedQuestions(questionObj, formObj)
        }
        else {
            await handleCasesByInputType(questionObj)
            answer = await handleValues(questionObj, answer, formObj)
            questionObj.selectedValue = [answer]

            try {
                questionObj.answer['answer'] = [answer]
            }
            catch (err) {
                questionObj.answer = { ...questionObj.answer, answer: [answer] }
            }
        }

        return { ...questionObj }
    }
    catch (err) {
        console.log("error in handleProjectedArr ::: ", err.message)
    }
}
async function handleRangeIfExists(questionObj, formObj) {
    try {
        let obj = { ...questionObj }
        // get range if saved in database
        if (formObj.range) {
            if (["Nos./Year", "%", "lpcd", "Hours/day"].includes(formObj.unit)) {
                obj.minRange = formObj.range.split("-")[0]++
                obj.maxRange = formObj.range.split("-")[1]++
                obj.hint = formObj.range
            }
            if (formObj.unit !== "%") {
                obj.allowDecimal = false
            }
        }
        // get range from models if exists
        else if (formObj.modelName) {
            let schema = moongose.model(formObj.modelName).schema.obj[questionObj.shortKey] || moongose.model(nestedTables[formObj.modelName]).schema.obj[questionObj.shortKey]
            if (schema) {
                obj.minRange = Array.isArray(schema?.min) ? schema.min[0] : schema.min
                obj.maxRange = Array.isArray(schema?.max) ? schema.max[0] : schema.max
                obj.min = Array.isArray(schema?.min) ? schema.min[0] : schema.min
                obj.max = Array.isArray(schema?.max) ? schema.max[0] : schema.max
                if (obj.minRange != undefined && obj.maxRange != undefined) {
                    obj.hint = obj?.minRange.toString() + "-" + obj?.maxRange.toString()
                }
            }
            // console.log("question.dbKey",questionObj.shortKey)
        }
        else if (formObj.validations && Object.keys(formObj.validations).includes(questionObj.shortKey)) {
            obj.minRange = formObj.validations[questionObj.shortKey].min || ""
            obj.maxRange = formObj.validations[questionObj.shortKey].max || ""
            obj.min = obj.minRange
            obj.max = obj.maxRange
        }
        return { ...obj }
    }
    catch (err) {
        console.log("error in handleRangeIfExists ::: ", err.message)
    }
    return { ...questionObj }
}

async function handleArrOfObjects(question, flattedForm) {
    try {
        let order = parseInt(question.order)
        let dbKey = arrFields[question.shortKey]
        let values = flattedForm[dbKey]
        let disableFields = flattedForm['disableFields']
        var project_arr = []
        let a = 0
        if (values) {
            let index = 1
            for (let obj of values) {
                if (DurCase.includes(question.shortKey)) {
                    obj.percProjectCost = ((obj.expenditure / obj.cost) * 100).toFixed(2)
                }
                obj.modelName = flattedForm.modelName || ""
                var nested_arr = []
                for (let keys in obj) {
                    let keysObj = customkeys[question.shortKey]
                    let jsonKey = keysObj[keys]
                    let questionObj = DurProjectJson[jsonKey] ? JSON.parse(JSON.stringify(DurProjectJson[jsonKey])) : null
                    if (questionObj) {
                        let formObj = {}
                        formObj[jsonKey] = obj[keys]
                        if (questionObj.modelType && questionObj.modelType === "object") {
                            formObj[jsonKey] = obj[keys][questionObj.valueKey]
                        }
                        questionObj = await handleDbValues(questionObj, formObj, order)
                        if (questionObj.isQuestionDisabled !== true) {
                            questionObj.isQuestionDisabled = handleDisableFields({ disableFields })

                            if (Object.keys(customDisableFields).includes(keys)) {
                                questionObj.isQuestionDisabled = obj[customDisableFields[keys]]
                            }
                        }
                        questionObj.forParentValue = index
                        questionObj.isQuestionDisabled = flattedForm['disabledShortKeys'] && flattedForm['disabledShortKeys'].includes(questionObj.shortKey) ? true : questionObj.isQuestionDisabled
                        let modifiedObj = await handleRangeIfExists({ ...questionObj }, obj)
                        let warnings = await handleWarningsIfExists(questionObj, flattedForm)
                        questionObj.warnings = warnings
                        nested_arr.push({ ...modifiedObj })
                    }
                }
                a += 1
                index += 1
                project_arr.push(nested_arr)
            }
        }
        project_arr = project_arr.map(item => item.sort((a, b) => a.order > b.order ? 1 : -1))
        let childData = [...project_arr]
        return childData
    }
    catch (err) {
        console.log("error in handleArrOfObjects ::: ", err.message)
    }
}

function createCustomizedKeys(answerObj, keysMapper) {
    try {
        let obj = {}
        let answer = { ...answerObj }
        for (let key in answer) {
            if (key === "_id") continue;
            obj[keysMapper[key]] = answer[key]
        }
        return { ...obj }
    }
    catch (err) {
        console.log("error in createCustomizedKeys ::: ", err.message)
    }
    return answerObj
}

function handleDisableFields(flattedForm) {
    try {
        return flattedForm.disableFields
    }
    catch (err) {
        console.log("error in handleDisableFields")
        return false
    }
}

async function handleArrayFields(shortKey, flattedForm, childQuestionData) {
    try {
        let valKey = arrFields[shortKey]
        let answerObjects = flattedForm[valKey]
        let keysMapper = customkeys[shortKey]
        for (let index in answerObjects) {
            let questionArr = childQuestionData[index]
            for (let arrIndex in questionArr) {
                let formObj = await createCustomizedKeys(answerObjects[index], keysMapper)
                let question = questionArr[arrIndex]
                if (question.isQuestionDisabled !== true) {
                    question.isQuestionDisabled = await handleDisableFields(flattedForm)
                }
                let answer = { label: '', textValue: '', value: '' }
                handleValues(question, answer, formObj)
                question.selectedValue = [answer]
                let modifiedObj = await handleRangeIfExists(question, flattedForm)
                let warnings = await handleWarningsIfExists(question, flattedForm)
                question.warnings = warnings
                question.minRange = modifiedObj.minRange ? modifiedObj.minRange : question.minRange
                question.maxRange = modifiedObj.maxRange ? modifiedObj.maxRange : question.maxRange
                question.hint = modifiedObj.hint || ""
                question.visibility = flattedForm.fieldsTohide && flattedForm.fieldsTohide.includes(question.shortKey) ? false : question.visibilty
                try {
                    question.answer['answer'] = [answer]
                }
                catch (err) {
                    question.answer = { ...question.answer, answer: [answer] }
                }
            }
        }
    }
    catch (err) {
        console.log("error in handleArrayFields :: ", err.message)
    }
    return childQuestionData
}

async function appendvalues(childQuestionData, flattedForm, shortKey, question) {
    try {
        let modifiedArr = []
        let arrKeys = Object.keys(arrFields)
        let modelKey = arrFields[shortKey]
        if (!arrKeys.includes(shortKey)) {
            // handle array of objects childrens
            childQuestionData = await handleSectionStructure(childQuestionData, shortKey, flattedForm);
        }
        if (arrKeys.includes(shortKey) && !specialCases.includes(shortKey)) {
            await handleArrayFields(shortKey, flattedForm, childQuestionData)
        }
        if (specialCases.includes(shortKey)) {
            if (flattedForm[modelKey]) {
                childQuestionData = await handleArrOfObjects(question, flattedForm)
                let questionLength = childQuestionData.length
                if (addMoreFields.includes(shortKey)) {
                    question.value = questionLength
                    question.modelValue = questionLength
                    question.selectedValue = {
                        "text": questionLength,
                        "value": questionLength,
                        "label": questionLength

                    }

                }
            }
        }
        return [...childQuestionData]
    }
    catch (err) {
        console.log("error in appendValues :::: ", err.message)
    }
}
async function handleSectionStructure(childArr, shortKey, flattedForm) {
    let childQuestionData = [...childArr]
    for (let arr of childQuestionData) {
        for (let obj of arr) {
            let questionKeys = Object.keys(customkeys[shortKey]);
            for (let questionkey of questionKeys) {
                if (obj.shortKey === questionkey) {
                    let answer = { label: '', textValue: '', value: '' };
                    // console.log("shortKey11111111 :: ",obj.shortKey,obj.input_type)
                    answer = await handleValues(obj, answer, flattedForm);
                    // if (obj.input_type !== "11") {
                    obj.selectedValue = [{ ...answer }];
                    // }
                    if (obj.isQuestionDisabled !== true) {
                        obj.isQuestionDisabled = handleDisableFields(flattedForm);
                    }
                    obj.answer = { ...obj.answer, answer: { ...answer } };
                    let modifiedObj = { ...await handleRangeIfExists(obj, flattedForm) };
                    let warnings = await handleWarningsIfExists(obj, flattedForm)
                    obj.warnings = warnings
                    obj.minRange = modifiedObj.minRange ? modifiedObj.minRange : obj.minRange;
                    obj.maxRange = modifiedObj.maxRange ? modifiedObj.maxRange : obj.minRange;
                    obj.hint = modifiedObj.hint || "";
                    obj.visibility = flattedForm.fieldsTohide && flattedForm.fieldsTohide.includes(obj.shortKey) ? false : obj.visibility;
                }
            }
        }
    }
    return childQuestionData
}

async function appendChildQues(question, obj, flattedForm) {
    try {
        let customShortKeys = Object.keys(customkeys)
        if (customShortKeys.includes(question.shortKey)) {
            let childQuestionData = await appendvalues(question.childQuestionData, flattedForm, question.shortKey, question)
            return [...childQuestionData]
        }
    }
    catch (err) {
        console.log("error in getChildrens :::: ", err.message)
    }
}
const handleChildCase = async (question, obj, flattedForm) => {
    try {
        let order = question.order
        let childQuestionData = await appendChildQues(question, obj, flattedForm)
        if (childQuestionData) {
            question.childQuestionData = [...childQuestionData]
        }

    }
    catch (err) {
        console.log("error in handleChildCase :::: ", err.message)
    }
}

const handleNumericCase = async (question, obj, flattedForm, mainKey) => {
    try {
        let value = ""
        // console.log("question ",question.shortKey)
        if (mainKey) {
            let key = mainKey + "." + question.shortKey
            if (flattedForm[key] == undefined && flattedForm[key + ".value"] == undefined) {
                value = ""
            }
            else {
                value = flattedForm[key] === undefined ? flattedForm[key + ".value"] : flattedForm[key]
                value = value !== undefined ? value.toString() : ""
            }

            question['modelValue'] = value
            question['value'] = value
            obj['textValue'] = value
            obj['value'] = value
        }
        else {
            let key = question.shortKey
            if (flattedForm[key] == undefined && flattedForm[key + ".value"] == undefined) {
                value = ""
            }
            else {
                value = flattedForm[key] === undefined ? flattedForm[key + ".value"] : flattedForm[key]
                value = value !== undefined ? value.toString() : ""
            }
            question['modelValue'] = value
            question['value'] = value
            obj['textValue'] = value
            obj['value'] = value
        }
    }
    catch (err) {
        console.log("error in handleNumericCase ::: ", err.message)
    }
}

const handleTextCase = async (question, obj, flattedForm) => {
    try {
        let mainKey = question.shortKey

        // console.log("flattedFrom ::::",flattedForm)
        question['modelValue'] = flattedForm[mainKey] || ""
        question['value'] = flattedForm[mainKey] || ""
        obj['textValue'] = flattedForm[mainKey] || ""
        obj['value'] = flattedForm[mainKey] || ""
    }
    catch (err) {
        console.log("error in handleTextCase :: ", err.message)
    }
}

async function handleConsentCase(question, obj, flattedForm, mainKey) {
    try {
        let mainKey = question.shortKey
        if (Object.keys(flattedForm).includes(mainKey)) {
            let answerByBoolean = getKeyByValue(consentCases, flattedForm[mainKey])
            let answer = question.answer_option.find(item => item._id === answerByBoolean)
            question['modelValue'] = answer['_id']
            question['value'] = answer['_id']
            obj['textValue'] = answer['name']
            obj['value'] = answer['_id']
            if (question.isQuestionDisabled !== true) {
                question.isQuestionDisabled = handleDisableFields(flattedForm)
            }
        }
    }
    catch (err) {
        console.log("error in handleConsentCase :::: ", err.message)
    }
}
const getFilteredOptions = (answerKeys, annualRadioButtons) => {
    try {
        const filteredObj = Object.keys(annualRadioButtons)
            .filter((key) => answerKeys.includes(key))
            .reduce((obj, key) => {
                return Object.assign(obj, {
                    [key]: annualRadioButtons[key]
                });
            }, {});
        return filteredObj
    }

    catch (err) {
        console.log("error in getFilteredOptions :: ", err.message)
        return annualRadioButtons
    }
}

const handleContentCase = async (question, obj, flattedForm, mainKey) => {
    try {
        let mainKey = question.shortKey
        let answer = flattedForm[mainKey]
        // console.log("flattedFrom ::::",flattedForm)
        question['modelValue'] = flattedForm[mainKey]
        question['value'] = flattedForm[mainKey]
        obj['textValue'] = flattedForm[mainKey]
        obj['value'] = flattedForm[mainKey]
    }
    catch (err) {
        console.log("error in handleContentCase :: ", err.message)
    }
}

const handleRadioButtonCase = async (question, obj, flattedForm, mainKey) => {
    try {
        let shortKey = question.shortKey
        let value = flattedForm[shortKey]
        let answerIds = question.answer_option.map(item => ({ [item.name]: item._id }))
        let answerKeys = question.answer_option.map(item => item.name)
        let filteredObj = getFilteredOptions(answerKeys, annualRadioButtons)
        let mformValue = getKeyByValue(filteredObj, value) || value
        let answerObj = question.answer_option.find(item => item.name === mformValue)
        if (answerObj) {
            question['modelValue'] = answerObj._id
            question['value'] = answerObj._id
            obj['textValue'] = mformValue
            obj['value'] = answerObj._id

        }
    }
    catch (err) {
        console.log("error in handleRadioButtonCase ::: ", err.message)
    }
}

const handleWarningsIfExists = (question, flattedForm) => {
    try {
        if (!question.warnings) { return [] };
        let warnings = [...question?.warnings]
        if (Object.keys(flattedForm).some(key => key.startsWith("warnings"))) {
            let warningKey = Object.keys(flattedForm).find(key => key.includes(`.` + question.shortKey))
            if (warningKey) {
                let dependentOn = warningKey.split(".")[warningKey.split(".").length - 1]
                warnings = question.warnings.map((warningObj) => {
                    return { ...warningObj, message: warningObj.on === dependentOn ? flattedForm[warningKey] : warningObj.messge }
                })
            }
        }
        return warnings
    }
    catch (err) {
        console.log("error in handleWarningsIfExists ::: ", err.message)
    }
}

const handleValues = async (question, obj, flattedForm, mainKey = false) => {
    let answerKey = inputType[question.input_type]
    try {
        switch (question.input_type) {
            case "1":
                await handleTextCase(question, obj, flattedForm, mainKey)
                break
            case "2":
                await handleNumericCase(question, obj, flattedForm, mainKey)
                break
            case "11":
                await handleFileCase(question, obj, flattedForm, mainKey)
                break
            case "14":
                await handledateCase(question, obj, flattedForm, mainKey)
                break
            case "3":
                await handleSelectCase(question, obj, flattedForm, mainKey)
                break
            case "5":
                await handleRadioButtonCase(question, obj, flattedForm, mainKey)
                break
            case "20":
                await handleChildCase(question, obj, flattedForm, mainKey)
                break
            case "22":
                await handleConsentCase(question, obj, flattedForm, mainKey)
                break
            case "29":
                await handleContentCase(question, obj, flattedForm, mainKey)
                break
            default:
                let shortKey = question.shortKey.replace(" ", "")
                obj[answerKey] = flattedForm[shortKey]
                break
        }
        // console.log("obj ::::::::::",obj)
        return { ...obj }
    }
    catch (err) {
        console.log("error in handleValues ::: ", err.message)
    }
}


function dateMinMax(flattedForm, shortKey, question) {
    try {
        if (flattedForm.modelName) {
            let schema = moongose.model(flattedForm.modelName).schema.obj[shortKey]
            if (schema) {
                question.min = Array.isArray(schema?.min) ? schema.min[0] : schema.min
                question.max = Array.isArray(schema?.max) ? schema.max[0] : schema.max
            }
        }
    }
    catch (err) {
        console.log("error in dateMinMax ::: ", err.message)
    }
}

function handledateCase(question, obj, flattedForm) {
    try {

        let mainKey = question.shortKey
        if (flattedForm[mainKey] === undefined || flattedForm[mainKey] === null) {
            flattedForm[mainKey] = ""
        }
        else {
            flattedForm[mainKey] = new Date(flattedForm[mainKey]).toISOString().split("T")[0]
        }
        question['modelValue'] = flattedForm[mainKey]
        question['value'] = flattedForm[mainKey]
        obj['textValue'] = flattedForm[mainKey]
        obj['value'] = flattedForm[mainKey]
        // dateMinMax(flattedForm,mainKey,question)
    }
    catch (err) {
        console.log("error in dateCase :::: ", err.message)
    }
}

function handleFileCase(question, obj, flattedForm) {
    try {
        let spiltArr = question.shortKey.split(".")
        let mainKey = spiltArr[0].replace(" ", "")
        if (spiltArr.length > 2) {
            mainKey = spiltArr.slice(0, spiltArr.length).join(".")
        }
        let modifiedKeys = Object.keys(modifiedShortKeys)
        if (modifiedKeys.includes(mainKey)) {
            mainKey = modifiedShortKeys[mainKey]
        }
        let name = mainKey + "." + "name"
        let url = mainKey + "." + "url"
        obj['label'] = flattedForm[name] || ""
        obj['value'] = flattedForm[url] || ""
        obj['textValue'] = flattedForm[url] || ""
        question['modelValue'] = flattedForm[url] || ""
        question['value'] = flattedForm[url] || ""
        // question['selectedValue'] = {...obj}
        question['answer'] = { ...question.answer, answer: [obj] }
    }
    catch (err) {
        console.log("error in handleObjectCase :: ", err.message)
    }
}

async function deleteExtraKeys(question) {
    let filterKey = ["modelName", "modelFilter"]
    try {
        filterKey.forEach((item) => {
            delete question[item]
        })
    }
    catch (err) {
        console.log("error in deleteExtraKeys :: ", err.message)
    }
}

function manageDisabledQues(question, flattedForm) {
    try {
        let actionKeys = ['statusId', 'status', 'canTakeAction', 'rejectReason', 'rejectReason_state']
        // let allowedStatuses = [StatusList.Rejected_By_MoHUA,StatusList.Rejected_By_State,StatusList.In_Progress,StatusList.Not_Started]
        let formType = flattedForm?.role
        // console.log("flattedForm ::: ",flattedForm)
        let getValue = question.inputType === "11" ? 2 : 1
        let mainKey = question.shortKey.split(".").slice(0, question.shortKey.split(".").length - getValue).join(".")
        actionKeys.forEach((item) => {
            let key = mainKey + "." + item
            let keyItem = question.shortKey + "." + item
            let included = Object.keys(flattedForm).includes(key) || Object.keys(flattedForm).includes(keyItem)
            key = Object.keys(flattedForm).includes(key) ? key : keyItem
            if (included) {
                question[item] = flattedForm[key]
                if (item === "status") {
                    if (allowedStatuses.includes(flattedForm[key]) && formType === "ULB") {
                        question['isQuestionDisabled'] = false
                    }
                    else {
                        question['isQuestionDisabled'] = true
                    }
                }
            }

        })
        // console.log("question ::: shortKey ",question.shortKey)
    }
    catch (err) {
        console.log("error in manageDisabledQues :::: ", err.message)
        return question
    }
}

async function mutateResponse(jsonFormat, flatForm, keysToBeDeleted, role) {
    try {
        let obj = JSON.parse(JSON.stringify(jsonFormat))
        let flattedForm = JSON.parse(JSON.stringify(flatForm))
        roleWiseJson(obj[0], role)
        // const transDate = obj?.[0]?.question?.find(q => q.shortKey == 'transDate');
        // if(transDate) {
        //     const [ maxDate ] = new Date().toISOString().split('T');
        //     transDate['max'] = maxDate;
        //     transDate['maxRange'] = maxDate;
        // }
        // console.log('transDate', transDate);
        console.log("flattedForm['disabledShortKeys'] >>", flattedForm['disabledShortKeys'])
        obj[0] = await appendExtraKeys(keysToBeDeleted, obj[0], flattedForm)
        await deleteKeys(flattedForm, keysToBeDeleted)
        for (let key in obj) {
            let questions = obj[key].question
            if (questions) {
                for (let question of questions) {
                    let answer = []
                    let obj = { ...answerObj }
                    let answerKey = inputType[question.input_type]
                    await handleCasesByInputType(question)
                    await handleValues(question, obj, flattedForm)
                    answer.push(obj)
                    question['selectedValue'] = answer
                    await manageDisabledQues(question, flattedForm)
                    await deleteExtraKeys(question)
                    let modifiedObj = await handleRangeIfExists(question, flattedForm)
                    let warnings = await handleWarningsIfExists(question, flattedForm)
                    question.warnings = warnings
                    question.isQuestionDisabled = flattedForm['disabledShortKeys'] && flattedForm['disabledShortKeys'].includes(question.shortKey) ? true : question.isQuestionDisabled
                    question.min = modifiedObj.min ? modifiedObj.min : question.min;
                    question.max = modifiedObj.max ? modifiedObj.max : question.min;
                    question.minRange = modifiedObj.minRange ? modifiedObj.minRange : question.minRange;
                    question.maxRange = modifiedObj.maxRange ? modifiedObj.maxRange : question.minRange;
                }

                let modifiedKeys = Object.keys(modifiedShortKeys)
                let modifiedObjects = questions.filter(item => modifiedKeys.includes(item.shortKey))
            }
        }
        return obj
    }
    catch (err) {
        console.log("mutateResponse ::: ", err.message)
    }
}


async function handleCasesByInputType(question) {
    try {
        let obj = { ...answerObj }
        switch (question.input_type) {
            case "3":
                if (question.modelName) {
                    obj = await appendAnswerOptions(question.modelName, question, question.modelFilter)
                }
                break
            // case "11":
            //     console.log("inside this case")
            //     break
            default:
                obj = { ...answerObj }
                break
        }
        return obj
    }
    catch (err) {
        console.log("error in handleCasesByInputType ::: ", err.message)
    }
}

function findId(answerOption, name, idx, type = "_id") {
    try {
        if (answerOption) {
            let objectFind = answerOption.find((item) => item.name === name)
            return objectFind[type].toString()
        }
        else {
            return idx.toString()
        }
    }
    catch (err) {
        console.log("error in findId :::", err.message)
    }
}

async function appendAnswerOptions(modelName, obj, modelFilter) {
    try {
        let documents = await moongose.model(modelName).find(modelFilter).lean()
        let answerOptions = []
        let childOptions = []
        documents.forEach((item, index) => {
            let answerObj = {
                "name": item.name,
                "did": [],
                "_id": obj.answer_option ? findId(obj['answer_option'], item.name, index) : index.toString(),
                "option_id": item._id,
                "viewSequence": obj.answer_option ? findId(obj['answer_option'], item.name, index, "viewSequence") : (index + 1).toString(),
            }
            childObj = {
                "type": item._id,
                "value": item.name,
                "order": JSON.stringify(index + 1)
            }
            answerOptions.push(answerObj)
        })
        obj['answer_option'] = answerOptions.sort((a, b) => parseInt(a.viewSequence) - parseInt(b.viewSequence))
        // obj['child'] = childOptions
        return obj
    }
    catch (err) {
        console.log("error in appendFromModel ::: ", err.message)
    }
}

function checkForUndefinedVaribales(obj) {
    let validator = {
        message: "",
        valid: true
    }
    try {
        for (let key in obj) {
            if (obj[key] === undefined) {
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
module.exports.mutateResponse = mutateResponse

function appendExtraKeys(keys, jsonObj, form) {
    let obj = { ...jsonObj }
    try {
        for (let key of keys) {
            if (Object.keys(form).includes(key.replace(" ", ""))) {
                obj[key] = form[key]
            }
            else {
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

const Service = require('../../service');


module.exports.masterAction = async (req, res) => {
    try {
        let { decoded: userData, body: bodyData } = req;

        let { role: actionTakenByRole, _id: actionTakenBy } = userData;
        let { formId, multi, shortKeys, responses, ulbs, form_level, design_year, type, states } = bodyData;

        if (!formId || !bodyData.hasOwnProperty("multi") || !shortKeys || !responses || !design_year || !form_level) {
            return Response.BadRequest(res, {}, "All fields are mandatory")
        }
        let arr = [];
        if (type === "STATE") {
            if (!states && !states.length) return Response.BadRequest(res, {}, "All fields are mandatory");
            arr = states;
        } else {
            if (!ulbs && !ulbs.length) return Response.BadRequest(res, {}, "All fields are mandatory");
            arr = ulbs;
        }
        let typeField = type === "STATE" ? 'state' : 'ulb';
        let path = modelPath(formId);
        let designYearField = "design_year";

        if (Number(formId) === FORMIDs['dur']) {
            designYearField = "designYear"
        }
        let condition = {
            [typeField]: { $in: arr },
            [designYearField]: design_year,
        };

        const model = require(`../../models/${path}`);
        let formData = await model.find(condition).lean();
        //   let level = form_level;
        if (!formData || !formData.length) {
            return Response.BadRequest(res, {}, "No Form Found!")
        }
        //   if(multi){
        if ([FORMIDs['GrantAllocation'], FORMIDs['GTC_STATE']].includes(formId)) {
            formData = formData.filter(item => item.currentFormStatus === MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'])
        }
        let params = { formData, actionTakenByRole, actionTakenBy, bodyData }
        let actionResponse = await takeActionOnForms(params, res)
        //   } else {
        //     let [form] = formData; 
        //   }
        if (actionResponse === formData.length) {
            Response.OK(res, {}, "Action Successful");
        } else {
            Response.BadRequest(res, {}, actionResponse);
        }

        if (req.decoded.role === "MoHUA" && actionResponse === formData.length) {
            await emailTriggerWithMohuaAction(responses, states, formId);
        }

        if (req.emailEligibility) {
            await alertStateClaimGrants(req, ulbs, design_year, states, type);
        }

    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.emailEligibilityCheck = async (req, res, next) => {
    try {
        const { form_level, multi, responses } = req.body;
        const [response] = responses;
        const isReturnedStatus = [
            MASTER_STATUS["Returned By MoHUA"],
            MASTER_STATUS["Returned By State"],
        ].includes(Number(response.status));

        let emailEligibility;

        if (form_level === FORM_LEVEL["form"]) {
            emailEligibility = !isReturnedStatus;
        } else if (form_level === FORM_LEVEL["tab"] || form_level === FORM_LEVEL["question"]) {
            if (multi === true || responses.every((response) => [MASTER_STATUS['Under Review By MoHUA'], MASTER_STATUS['Submission Acknowledged By MoHUA']].includes(Number(response.status)))) {
                emailEligibility = !isReturnedStatus;
            } else {
                emailEligibility = false;
            }
        }
        req['emailEligibility'] = emailEligibility;
        next();
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}


async function emailTriggerWithMohuaAction(responses, states, formId) {
    let [response] = responses;
    let hasApproved = null;
    let users = await User.find({ state: { $in: states }, role: "STATE" })
        .populate("state", "name");
    let formName = await Sidemenu.findOne({ formId: formId, isActive: true });

    if ([FORMIDs['waterRej'], FORMIDs['actionPlan']].includes(+formId)) {
        hasApproved = !responses.some(response => +response.status == 7);
    }

    users?.forEach(async (user) => {
        let payload = {
            formName: formName?.name,
            email: user.email,
            hasApproved,
            isApproved: (MASTER_STATUS_ID[+response?.status] === 'Submission Acknowledged By MoHUA'),
            stateName: user?.state?.name,
            reasonForRejection: response?.rejectReason,
            status: MASTER_STATUS_ID[+response?.status]
        };
        if (typeof hasApproved == 'boolean') payload['isApproved'] = hasApproved;

        let emailTemplate = Service.emailTemplate.alertStateWithMohuaAction(payload);

        let mailOptions = {
            Destination: {
                /* required */
                ToAddresses: [user?.email],
            },
            Message: {
                /* required */
                Body: {
                    /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: emailTemplate.body,
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: emailTemplate.subject,
                },
            },
            Source: process.env.EMAIL,
            /* required */
            ReplyToAddresses: [process.env.EMAIL],
        };
        await Service.sendEmail(mailOptions);
    });
}

async function alertStateClaimGrants(req, ulbs, design_year, states, type) {
    try {
        const LOCALHOST = 'localhost:8080';
        let host = req.headers.host;
        if (host === LOCALHOST) {
            host = BackendHeaderHost.Demo;
        }

        const headers = {
            "x-access-token": req?.headers?.['x-access-token']
        };

        let uniqueStatesArray, userEmails;

        if (type === "STATE") {
            let users = await User.find({ state: { $in: states }, role: "STATE", isDeleted: false });
            uniqueStatesArray = states;
            userEmails = users.map((user) => user.email);
        } else {
            uniqueStatesArray = [req?.decoded?.state];
            let stateUserData = await User.find({ state: req?.decoded?.state, role: "STATE", isDeleted: false });
            userEmails = stateUserData.map(user => user.email);
        }

        console.log({ uniqueStatesArray, userEmails })

        if (uniqueStatesArray && uniqueStatesArray.length) {
            await Promise.all(uniqueStatesArray.map(async (state) => {
                const params = {
                    financialYear: design_year,
                    stateId: state
                };

                try {
                    const response = await axios.get(`https://${host}/api/v1/grant-claim/get2223`, { headers, params });
                    let data = response?.data?.data?.data;

                    const results = Object.entries(data).map(([key, value]) => value.yearData.filter(year => year.conditionSuccess).map(year => ({
                        title: value.title.substring(value.title.indexOf('Claim') + 6),
                        installment: year.installment,
                        tiedStatus: key.endsWith('_tied')
                    }))).flat(1);

                    for (let elem of results) {
                        let emailTemplate = Service.emailTemplate.alertStateToClaimGrants(elem);

                        let mailOptions = {
                            Destination: {
                                /* required */
                                ToAddresses: userEmails,
                            },
                            Message: {
                                /* required */
                                Body: {
                                    /* required */
                                    Html: {
                                        Charset: "UTF-8",
                                        Data: emailTemplate.body,
                                    },
                                },
                                Subject: {
                                    Charset: "UTF-8",
                                    Data: emailTemplate.subject,
                                },
                            },
                            Source: process.env.EMAIL,
                            /* required */
                            ReplyToAddresses: [process.env.EMAIL],
                        };

                        await Service.sendEmail(mailOptions);
                    }
                } catch (error) {
                    if (error.response && error.response.status === 400) {
                        console.error('Status Code 400:', error.response.data);
                    } else {
                        throw error;
                    }
                }
            }));
        }
    } catch (error) {
        throw error;
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
                recordId: form._id,
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
                    let shortKeys = await getUAShortKeys(form.state);
                    if ([FORMIDs['GrantAllocation'], FORMIDs['GTC_STATE']].includes(formId)) {
                        shortKeys = await getMultipleInstallmentShortKeys(formId, form, shortKeys);
                    }
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
                            shortKey: "",
                            res,
                        };
                        saveStatusResponse = await saveStatus(params);
                        if (
                            [
                                MASTER_STATUS["Returned By MoHUA"],
                                MASTER_STATUS["Returned By State"],
                            ].includes(Number(response.status))
                        ) {
                            rejectStatusCount++;
                        }
                    }
                    let response = {};
                    if (rejectStatusCount) {
                        response.status =
                            actionTakenByRole === "MoHUA"
                                ? MASTER_STATUS["Returned By MoHUA"]
                                : MASTER_STATUS["Returned By State"];
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
                                ? MASTER_STATUS["Submission Acknowledged By MoHUA"]
                                : MASTER_STATUS["Under Review By MoHUA"];
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
                    response['status'] = Number(response['status']);

                    /* Getting the short keys from the short keys array and separating them into an array of arrays based on tab and questions */
                    let currentStatusShortKeys = await CurrentStatus.find({
                        recordId: form._id,
                        actionTakenByRole,
                    }, {
                        shortKey: 1,
                        _id: 0
                    }).lean()
                    if (Array.isArray(currentStatusShortKeys) && !currentStatusShortKeys.length) {
                        currentStatusShortKeys = await CurrentStatus.find({
                            recordId: form._id,
                            actionTakenByRole: "ULB",
                        }, {
                            shortKey: 1,
                            _id: 0
                        }).lean()
                    }
                    currentStatusShortKeys = currentStatusShortKeys.map(el => el.shortKey)
                    /* Saving the status of the form for questions */
                    for (let shortKey of currentStatusShortKeys) {
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
                    //   for (let shortKey of shortKeysResponse["outer"]) {
                    //     shortKey = `tab_${shortKey}`;
                    //     let params = {
                    //       formId,
                    //       form,
                    //       response,
                    //       form_level,
                    //       actionTakenByRole,
                    //       actionTakenBy,
                    //       multi,
                    //       shortKey,
                    //       res,
                    //     };
                    //     saveStatusResponse = await saveStatus(params);
                    //   }
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
                    let { outer: tabLevelShortKeys } = await getSeparatedShortKeys({ shortKeys });
                    let tabShortKeyObj = {},
                        tabShortKeyResponse = {};
                    for (let tab of tabLevelShortKeys) {
                        tabShortKeyObj[tab] = 0;
                    }
                    let separator = ".";
                    const tabSeparator = "_";
                    const dotSeparator = "."
                    const tabRegex = /^tab_/g;

                    for (let response of responses) {
                        response['status'] = Number(response['status']);
                        separator = response.shortKey.match(tabRegex) ? tabSeparator : dotSeparator;
                        let splitedArrayTab =
                            response.shortKey.split(separator).length > 1
                                ? response.shortKey.split(separator)[0]
                                : "";
                        if (separator === tabSeparator) {
                            splitedArrayTab = response.shortKey.split(separator).length > 1
                                ? response.shortKey.split(separator)[1]
                                : "";
                        }
                        if (
                            splitedArrayTab !== "" &&
                            [
                                MASTER_STATUS["Returned By MoHUA"],
                                MASTER_STATUS["Returned By State"],
                            ].includes(response.status)
                        ) {
                            tabShortKeyObj[splitedArrayTab] = tabShortKeyObj[
                                splitedArrayTab
                            ] + 1;
                        }
                        //storing response of tabs if questions are not provided
                        if (separator === tabSeparator) {
                            tabShortKeyResponse[splitedArrayTab] = response;
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
                                MASTER_STATUS["Returned By MoHUA"],
                                MASTER_STATUS["Returned By State"],
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
                                        ? MASTER_STATUS["Returned By MoHUA"]
                                        : MASTER_STATUS["Returned By State"];
                                rejectStatusAllTab++;
                            } else {
                                status =
                                    actionTakenByRole === "MoHUA"
                                        ? MASTER_STATUS["Submission Acknowledged By MoHUA"]
                                        : MASTER_STATUS["Under Review By MoHUA"];
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
                    let response = {}
                    if (rejectStatusAllTab) {
                        response.status =
                            actionTakenByRole === "MoHUA"
                                ? MASTER_STATUS["Returned By MoHUA"]
                                : MASTER_STATUS["Returned By State"];
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
                                ? MASTER_STATUS["Submission Acknowledged By MoHUA"]
                                : MASTER_STATUS["Under Review By MoHUA"];
                        let updatedFormCurrentStatus = await updateFormCurrentStatus(
                            model,
                            form._id,
                            response
                        );
                        if (updatedFormCurrentStatus !== 1)
                            throw "Action failed to update form current Status!";
                    }

                    // Save Form Level History
                    await saveFormLevelHistory(formId, form, actionTakenByRole, actionTakenBy, response.status);
                }
            }
            if (saveStatusResponse !== 1) {
                throw { message: "Action failed to save status!" };
            } else {
                count++;
            }
        }
        return count;
    } catch (error) {
        return error.message;
    }
}

async function getMultipleInstallmentShortKeys(formId, form, shortKeys) {
    let condition = {
        formId,
        recordId: ObjectId(form._id),
        status: MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA']
    };
    let statusData = await CurrentStatus.find(condition).lean();
    shortKeys = statusData.map(el => el.shortKey);
    return shortKeys;
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
        if (!updatedFormResponse) {
            throw { message: "Action failed to update form current Status!" };
        }
        return 1;
    } catch (error) {
        return error.message;
    }
}

async function saveStatus(params) {
    try {
        let { formId,
            form,
            response,
            form_level,
            actionTakenByRole,
            actionTakenBy,
            multi,
            shortKey,
            res } = params;
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

        (multi && [FORM_LEVEL["question"], FORM_LEVEL['tab']].includes(form_level)) ? currentStatusData["shortKey"] = shortKey : "";
        //   (multi && form_level === FORM_LEVEL["tab"]) ? currentStatusData["shortKey"] = shortKey : "";

        let currentStatus = await saveCurrentStatus({ body: currentStatusData });

        let statusHistory = {
            formId,
            recordId: ObjectId(form._id),
            shortKey: response.shortKey,
            data: currentStatusData,
        };

        (multi && [FORM_LEVEL["question"], FORM_LEVEL['tab']].includes(form_level)) ? statusHistory["shortKey"] = shortKey : ""

        let statusHistoryData = await saveStatusHistory({ body: statusHistory });
        if (currentStatus === 1 && statusHistoryData === 1) {
            return 1;
        }
        return 0;

    } catch (error) {
        return error.message;
    }
}
const getMasterAction = async (req, res) => {
    try {
        let { decoded: userData, body: bodyData } = req;

        let { role } = userData;
        let { formId, ulb, design_year, flag } = bodyData;

        if (!formId || !ulb || !design_year) {
            return Response.BadRequest(res, {}, "All fields are mandatory");
        }
        let path = modelPath(formId);
        let designYearField = "design_year";


        if (formId === FORMIDs['dur']) {
            designYearField = "designYear"
        }
        let condition = {
            ulb,
            [designYearField]: design_year,
        };

        const model = require(`../../models/${path}`);
        const form = await model.findOne(condition, { _id: 1, currentFormStatus: 1 }).lean();
        if (!form) {
            return Response.BadRequest(res, {}, "No Form Found!");
        }
        let currentStatusResponse = await CurrentStatus.find({ recordId: form._id }).lean()
        const currentFormStatus = form.currentFormStatus;
        if (!currentStatusResponse || !currentStatusResponse.length) {
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
        if (formId === FORMIDs['AnnualAccount']) {
            currentStatusResponse = filterStatusResponseTab(currentStatusResponse, currentFormStatus);
        } else {
            currentStatusResponse = filterStatusResponse(currentStatusResponse, currentFormStatus);
        }
        for (let status of currentStatusResponse) {
            status['statusId'] = status['status'];
            status['status'] = MASTER_STATUS_ID[parseInt(status['status'])]
        }
        if (formId === FORMIDs['AnnualAccount']) {
            // currentStatusResponse = appendKeysForAA(currentStatusResponse);
            currentStatusResponse = groupByKey(currentStatusResponse, "actionTakenByRole")
        }
        if (flag) {
            return currentStatusResponse;
        }
        return Response.OK(res, currentStatusResponse);
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);

    }
}
module.exports.getMasterAction = getMasterAction
const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})

function filterStatusResponse(statuses, formStatus) {

    const STATUS_RESPONSE = {
        ULB: [MASTER_STATUS['Not Started'], MASTER_STATUS["In Progress"], MASTER_STATUS["Under Review By State"]],
        STATE: [MASTER_STATUS["Under Review By MoHUA"], MASTER_STATUS["Returned By State"]],
        MoHUA: [MASTER_STATUS['Submission Acknowledged By MoHUA'], MASTER_STATUS["Returned By MoHUA"]]
    }

    for (let key in STATUS_RESPONSE) {

        if (STATUS_RESPONSE[key].includes(formStatus)) {
            return getCurrentStatus(key, statuses);
        }

    }

}

function getCurrentStatus(key, statuses) {
    if (key === "ULB") {
        return statuses.filter(el => {
            return (el.status <= 3 && el.status > 1);
        });
    } else if (key === 'STATE') {
        return statuses.filter(el => {
            return (el.status < 6 && el.status > 3);
        })
    } else if (key === "MoHUA") {
        return statuses.filter(el => {
            return el.status > 3;
        })
    }

    return statuses;
}
module.exports.getCurrentStatusState = getCurrentStatusState
module.exports.filterStatusResponseState = filterStatusResponseState

function filterStatusResponseState(statuses, formStatus) {

    const STATUS_RESPONSE = {
        STATE: [MASTER_STATUS['Not Started'], MASTER_STATUS["In Progress"], MASTER_STATUS["Under Review By MoHUA"]],
        MoHUA: [MASTER_STATUS['Submission Acknowledged By MoHUA'], MASTER_STATUS["Returned By MoHUA"]]
    }

    for (let key in STATUS_RESPONSE) {

        if (STATUS_RESPONSE[key].includes(formStatus)) {
            return getCurrentStatusState(key, statuses);
        }

    }

}

function getCurrentStatusState(key, statuses) {
    if (key === 'STATE') {
        return statuses.filter(el => {
            return (el.status <= 4);
        })
    } else if (key === "MoHUA") {
        return statuses.filter(el => {
            return el.status >= 6;
        })
    }

    return statuses;
}
function filterStatusResponseTab(statuses, formStatus) {
    const STATUS_RESPONSE = {
        ULB: [MASTER_STATUS['Not Started'], MASTER_STATUS["In Progress"], MASTER_STATUS["Under Review By State"]],
        STATE: [MASTER_STATUS["Under Review By MoHUA"], MASTER_STATUS["Returned By State"]],
        MoHUA: [MASTER_STATUS['Submission Acknowledged By MoHUA'], MASTER_STATUS["Returned By MoHUA"]]
    }

    for (let key in STATUS_RESPONSE) {

        if (STATUS_RESPONSE[key].includes(formStatus)) {
            return getCurrentStatusTab(key, statuses);
        }

    }
}
const ROLE_PRIORITY = {
    "ULB": 1,
    "STATE": 2,
    "MoHUA": 3
}
function getCurrentStatusTab(key, statuses) {
    if (key === "ULB") {
        statuses = statuses.filter(el => {
            return (el.status <= MASTER_STATUS['Under Review By State'] && el.status > MASTER_STATUS["Not Started"]);
        });

        return filterStatusForTab(statuses);
    } else if (key === 'STATE') {
        statuses = statuses.filter(el => {
            return (el.status < MASTER_STATUS['Submission Acknowledged By MoHUA'] && el.status > MASTER_STATUS['Under Review By State']);
        })
        return filterStatusForTab(statuses);

    } else if (key === "MoHUA") {
        statuses = statuses.filter(el => {
            return el.status > MASTER_STATUS['Under Review By State'];
        })
        return filterStatusForTab(statuses);

    }

    return statuses;
}
function filterStatusForTab(statuses) {
    let output = []
    statuses.forEach((el) => {
        let idx;
        let statusObj = output.find(entity => {
            return entity.shortKey === el.shortKey;
        });
        if (statusObj) {
            idx = output.findIndex(entity => {
                return entity.shortKey === el.shortKey;
            });
        }
        if (statusObj && ROLE_PRIORITY[statusObj.actionTakenByRole] < ROLE_PRIORITY[el.actionTakenByRole]) {
            output.splice(idx, 1);
            output.push(el);
        } else if (!statusObj) {
            output.push(el);
        }
    });
    if (output.find(el => el.actionTakenByRole === "MoHUA")) {
        let stateStatusResponse = appendStateStatus(statuses);
        if (Array.isArray(stateStatusResponse) && stateStatusResponse.length) {
            output = [...output, ...stateStatusResponse]
        }
    }
    return output;
}
function appendStateStatus(statuses) {
    return statuses.filter(el => {
        return el.actionTakenByRole === "STATE"
    });
}

function appendKeysForAA(currentStatusResponse) {
    const shortKeysToAppend = {
        "unAudited.bal_sheet": [
            "unAudited.bal_sheet.assets",
            "unAudited.bal_sheet.f_assets",
            "unAudited.bal_sheet.s_grant",
            "unAudited.bal_sheet.c_grant",
        ],
        "audited.bal_sheet": [
            "audited.bal_sheet.assets",
            "audited.bal_sheet.f_assets",
            "audited.bal_sheet.s_grant",
            "audited.bal_sheet.c_grant",
        ],
        "unAudited.inc_exp": ["unAudited.inc_exp.revenue", "unAudited.inc_exp.expense"],
        "audited.inc_exp": ["audited.inc_exp.revenue", "audited.inc_exp.expense"],
    };
    currentStatusResponse = appendStatus(currentStatusResponse, shortKeysToAppend);
    return currentStatusResponse;
}

function appendStatus(statusResponse, shortKeysObj) {
    try {
        let shortKeysArray = Object.keys(shortKeysObj);

        for (let status of statusResponse) {
            if (shortKeysArray.includes(status.shortKey)) {
                for (let key of shortKeysObj[status.shortKey]) {
                    status["shortKey"] = key;
                    statusResponse.push(status);
                }
            }
        }

        return statusResponse;

    } catch (error) {
        throw ("status key Not appended")
    }
}

async function getSeparatedShortKeys(params) {
    try {
        const { shortKeys } = params;
        const First_Index = 0;
        let output = {
            outer: [],
            inner: [],
        };
        let separator = ".";
        const tabSeparator = "_";
        const dotSeparator = "."
        const tabRegex = /^tab_/g;
        for (let shortKey of shortKeys) {
            // if (shortKey.match(tabRegex)) {
            //   separator = tabSeparator;
            // };
            separator = shortKey.match(tabRegex) ? tabSeparator : dotSeparator;

            let splitedArray = shortKey.split(separator);
            let splitedArrayLength = splitedArray.length - 1;
            if (Array.isArray(splitedArray) && splitedArrayLength) {
                separator === tabSeparator
                    ? output["outer"].push(splitedArray[splitedArrayLength])
                    : output["inner"].push(splitedArray[splitedArrayLength]);
                //push tab name in outer array
                separator !== tabSeparator
                    ? output["outer"].push(splitedArray[splitedArrayLength - 1])
                    : "";
            }
        }
        if (output["outer"].length) {
            output["outer"] = Array.from(new Set(output["outer"]));
        }
        return output;
    } catch (error) {
        throw `getSeparatedShortKeys :: ${error.message} `;
    }

}

module.exports.getSeparatedShortKeys = getSeparatedShortKeys

function reverseKeyValues(originalObj) {
    return Object.entries(originalObj).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {});
}

const handleChildValues = async (childObj, item, req) => {
    try {
        if (item && item.nestedAnswer) {
            if (Object.keys(arrFields).includes(item.shortKey) && !Array.isArray(childObj[item.shortKey])) {
                var arrKey = arrFields[item.shortKey].split(".")[0]
                if (!Object.keys(childObj).includes(arrKey)) {
                    try {
                        childObj[arrKey] = [...childObj[arrKey]]
                    }
                    catch (err) {
                        childObj[arrKey] = []
                    }
                }
            }
            for (let nestedAnswer in item.nestedAnswer) {
                let questions = item.nestedAnswer[nestedAnswer].answerNestedData
                let temp_obj = await nestedObjectParser(questions, req)
                if (Object.keys(arrFields).includes(item.shortKey)) {
                    let keyMappers = customkeys[item.shortKey]
                    keyMappers = await reverseKeyValues(keyMappers)
                    let filteredObj = await createCustomizedKeys(temp_obj, keyMappers)
                    if (childObj[arrKey]) {
                        childObj[arrKey].push({ ...filteredObj })
                    }
                }
                else {
                    childObj = Object.assign({ ...childObj }, temp_obj)
                }
            }
        }
        return { ...childObj }
    }
    catch (err) {
        console.log("error in handleChildValues ::: ", err.message)
    }
}

async function fillCategoryTable() {
    let promise = await new Promise(async (resolve, reject) => {
        try {
            let databaseArr = await moongose.model('Category').find({}).lean()
            for (let db of databaseArr) {
                categoryTable[db.name.toString()] = db._id
            }
            resolve(true)
        }
        catch (err) {
            reject(err)
        }
    })
    return promise
}

async function clearVariables(type) {
    try {
        switch (type) {
            case "category":
                categoryTable = {}
                break
        }
    }
    catch (err) {
        console.log("error in clearVariables::", err.message)
    }
}

async function nestedObjectParser(data, req) {
    try {
        if (req.body.formId === 4 && Object.keys(categoryTable).length === 0) {
            await fillCategoryTable()
        }
        const result = {};
        for (let item of data) {
            let shortKey = item.shortKey
            const keys = shortKey.split(".");
            let pointer = result;
            let temp = {}
            if (item.input_type === "20" || item.input_type === "29") {
                pointer = await handleChildValues({ ...pointer }, item, req)
                Object.assign(result, pointer)
            }
            else {
                // if(shortKey === "location" && item.answer.length == 0){ // code static due to some issues in frontend remove it after discussion with mform team in frontend
                //     item.answer = [
                //         {
                //             "label":"",
                //             "textValue":"",
                //             "value":"0,0"
                //         }
                //     ]
                // }
                let value = await decideValuesByInputType(temp, shortKey, item, req)
                await keys.forEach((key, index) => {
                    if (!pointer.hasOwnProperty(key)) {
                        pointer[key] = {};
                    }
                    if (index === keys.length - 1) {
                        pointer[key] = value;
                    }
                    pointer = pointer[key];
                });
            }
        };
        return result
    }
    catch (err) {
        console.log("error in nestedObjectParser: ::: ", err)
    }
}

function checkIfUlbHasAccess(ulbData, userYear) {
    try {
        let ulbVariable = "access_"
        let currentYear = userYear.year
        let prevYearArr = currentYear.split("-")
        let prevYear = `${(prevYearArr[0] - 1).toString().slice(-2)}${(prevYearArr[1] - 1).toString().slice(-2)}`
        ulbVariable += prevYear
        return ulbData[ulbVariable]
    }
    catch (err) {
        console.log("error in checkIfUlbHasAccess ::: ", err.message)
        return false
    }
}

module.exports.decideDisabledFields = (form, formType) => {

    let formStatus = calculateStatus(form.status, form.actionTakenByRole, form.isDraft,
        formType)
    if (form.status == "") {
        formStatus = MASTER_STATUS_ID[parseInt(form.currentFormStatus)] || "Not Started"
    }
    if (allowedStatuses.includes(formStatus) && formType === "ULB") {
        return false
    }
    else {
        return true
    }

}
module.exports.checkIfUlbHasAccess = checkIfUlbHasAccess
module.exports.calculateStatus = calculateStatus
module.exports.nestedObjectParser = nestedObjectParser
module.exports.clearVariables = clearVariables


let bodyData = {
    ulbs: [],
    design_year: "",
    status: "REJECTED",
    formId: 4,
    multi: true
}
const IGNORE_YEARS = {
    [YEAR_CONSTANTS["21_22"]]: [
        ObjectId(YEAR_CONSTANTS["20_21"]),
        ObjectId(YEAR_CONSTANTS["21_22"]),
    ],
    [YEAR_CONSTANTS["22_23"]]: [
        ObjectId(YEAR_CONSTANTS["20_21"]),
        ObjectId(YEAR_CONSTANTS["21_22"]),
        ObjectId(YEAR_CONSTANTS["22_23"]),
    ],
    [YEAR_CONSTANTS["23_24"]]: [
        ObjectId(YEAR_CONSTANTS["20_21"]),
        ObjectId(YEAR_CONSTANTS["21_22"]),
        ObjectId(YEAR_CONSTANTS["22_23"]),
        ObjectId(YEAR_CONSTANTS["23_24"]),
    ],
};
async function sequentialReview(req, res) {
    try {
        let { decoded: user, body: bodyData } = req;
        let { design_year, formId, ulbs, status, multi, getReview } = bodyData;
        if (
            user.role !== USER_ROLE["MoHUA"] ||
            status !== "REJECTED"
        ) {
            return Response.BadRequest(
                res,
                {},
                "Only MoHUA can sequentially reject!"
            );
        }
        let designYear = "design_year";
        formId === FORMIDs["dur"]
            ? (designYear = "designYear")
            : (designYear = "design_year");

        const modelName = formId === FORMIDs['twentyEightSlb'] ? ModelNames['twentyEightSlbs'] : ModelNames['dur'];

        let query = {
            ulb: { $in: ulbs },
            [designYear]: { $nin: IGNORE_YEARS[design_year] },
        };
        let forms = await moongose.model(modelName).find(query).lean();
        if (!Array.isArray(forms) || !forms.length) {
            return Response.BadRequest(res, {}, "No Forms Found!");
        }
        //   if (design_year === YEAR_CONSTANTS["21_22"]) {
        let params = {
            forms,
            formId,
            modelName,
            res,
            user,
            getReview
        };
        let formsUpdated = await checkForms(params);
        //   } else {
        if (formsUpdated) {
            let msg = getReview ? `${formsUpdated} form will be rejected` : `${formsUpdated} form rejected`
            return Response.OK(res, {
                autoReject: true
            }, msg);
        } else {
            return Response.OK(res, {
                autoReject: false

            }, "No Forms Updated!");
        }
        //   }
    } catch (error) {
        return Response.BadRequest(res, {}, `${error.message}`);
    }
}
module.exports.sequentialReview = sequentialReview;

async function checkForms(params) { 
    try {
        let { forms, formId, modelName, res, user, getReview } = params;
        let designYear = "design_year";
        Number(formId) === FORMIDs["dur"]
            ? (designYear = "designYear")
            : (designYear = "design_year");
        let formCount = 0;
        for (let form of forms) {
            if (getReview) {
                if (form[designYear].toString() === YEAR_CONSTANTS["22_23"]) {
                    !checkIfUlbCanEditForm2223(form) ? formCount++ : "";
                } else {
                    !checkIfUlbCanEditForm(form?.currentFormStatus) ? formCount++ : "";
                }
            } else {
                if (form[designYear].toString() === YEAR_CONSTANTS["22_23"]) {
                    if (!checkIfUlbCanEditForm2223(form)) {
                        let output = await rejectForm2223(form, modelName, user);
                        if (output) {
                            formCount++;
                        }
                    }
                } else {
                    if (!checkIfUlbCanEditForm(form?.currentFormStatus)) {
                        let output = await rejectForm(form, formId, modelName, user);
                        if (output) {
                            formCount++;
                        }
                    }
                }
            }
        }
        return formCount;
    } catch (error) {
        return Response.BadRequest(res, {}, error.message);
    }
}

async function rejectForm(form, formId, modelName, user) {
    try {
        let { role: actionTakenByRole, _id: actionTakenBy } = user;
        let updateObj = {
            currentFormStatus: MASTER_STATUS["In Progress"],
            isDraft: true,
            actionTakenByRole,
            actionTakenBy: ObjectId(actionTakenBy),
        };
        let updatedForm = await moongose.model(modelName).findOneAndUpdate(
            { _id: form._id },
            {
                $set: updateObj,
            },
            { new: true }
        );
        if (updatedForm) {
            return await saveStatusAndHistory(formId, updatedForm, user);
        }
    } catch (error) {
        throw `rejectForm:: ${error.message}`;
    }
}
async function saveStatusAndHistory(formId, updatedForm, user) {
    try {
        let bodyData = {
            formId,
            recordId: ObjectId(updatedForm._id),
            data: updatedForm,
        };
        /* Saving the form history of the user. */
        let formHistoryStatus = await saveFormHistory({
            body: bodyData,
            // session
        });

        let currentStatusData = {
            formId,
            recordId: ObjectId(updatedForm._id),
            status: MASTER_STATUS["In Progress"],
            level: FORM_LEVEL["form"],
            shortKey: "form_level",
            rejectReason: "",
            responseFile: "",
            actionTakenByRole: user.role,
            actionTakenBy: ObjectId(user._id),
        };
        let statusSaved = await saveCurrentStatus({
            body: currentStatusData,
        });
        let statusHistory = {
            formId,
            recordId: ObjectId(updatedForm._id),
            shortKey: "form_level",
            data: currentStatusData,
        };
        let statusHistoryStatus = await saveStatusHistory({
            body: statusHistory,
            //  session
        });

        if (formHistoryStatus && statusSaved && statusHistoryStatus) {
            return 1;
        }
        return 0;
    } catch (error) {
        throw `saveStatusAndHistory:: ${error.message}`;
    }
}

async function rejectForm2223(form, modelName, user) {
    try {
        let updateObj = {
            actionTakenByRole: user.role,
            actionTakenBy: ObjectId(user._id),
            status: "PENDING",
            isDraft: true,
            modifiedAt: new Date(),
        };
        delete form["history"];
        let updatedForm = await moongose.model(modelName).findOneAndUpdate(
            { _id: form._id },
            {
                $set: updateObj,
                $push: { history: form },
            },
            { new: true }
        );
        if (updatedForm) {
            return 1;
        }
        return 0;
    } catch (error) {
        throw `rejectForm2223:: ${error.message}`;
    }
}
function checkIfUlbCanEditForm2223(form) {
    try {
        let { status, actionTakenByRole, isDraft } = form;
        const formType = "ULB";
        let formStatus = calculateStatus(
            status,
            actionTakenByRole,
            isDraft,
            formType
        );
        const ulbEditStatusArray = [
            StatusList["In_Progress"],
            StatusList["Not_Started"],
            StatusList["Rejected_By_MoHUA"],
            StatusList["Rejected_By_State"],
        ];
        if (ulbEditStatusArray.includes(formStatus)) {
            return true;
        }
        return false;
    } catch (error) {
        throw `checkIfUlbCanEditForm2223 :: ${error.message}`;
    }
}

function checkUlbAccess(input, customSlice) {
    let ulbVariable = "access_";
    let year = input.split("").slice(customSlice).join("").replace("-", "");
    return ulbVariable + year;
}

module.exports.checkUlbAccess = checkUlbAccess;

function getLastYearUlbAccess(input) {
    let year = input.split('-');
    let lastYear = `${String(Number(year[0]) - 1)}-${String(Number(year[1]) - 1)}`;
    return checkUlbAccess(lastYear, 2);
}
module.exports.getLastYearUlbAccess = getLastYearUlbAccess
function checkIfUlbCanEditForm(currentFormStatus) {
    try {
        const ulbEditStatusArray = [
            MASTER_STATUS["Not Started"],
            MASTER_STATUS["In Progress"],
            MASTER_STATUS["Returned By MoHUA"],
            MASTER_STATUS["Returned By State"],
        ];
        if (ulbEditStatusArray.includes(currentFormStatus)) {
            return true;
        }
        return false;
    } catch (error) {
        throw `checkFormIfUlbCanEdit:: ${error.message}`;
    }
}

async function saveFormLevelHistory(masterFormId, formSubmit, actionTakenByRole, actionTakenBy, currentStatus) {
    let currentStatusData = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit._id),
        status: currentStatus,
        level: FORM_LEVEL["form"],
        shortKey: FORM_LEVEL_SHORTKEY["form"],
        rejectReason: "",
        responseFile: "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
    };
    await saveCurrentStatus({
        body: currentStatusData,
    });

    let statusHistory = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit._id),
        shortKey: FORM_LEVEL_SHORTKEY["form"],
        data: currentStatusData,
    };
    await saveStatusHistory({
        body: statusHistory,
    });
}
/**
 * The function `checkYearValidity` checks if a given year is not equal to specific year constants.
 * @param year - The `year` parameter is the year that you want to check for validity. 
 * @returns a boolean value indicating whether the `year` passed as an argument is not equal to the
 * values stored in the `YEAR_CONSTANTS` object for the keys "21_22" and "22_23".
 */
function isYearWithinRange(year){
    try {
        return ![YEAR_CONSTANTS["21_22"],YEAR_CONSTANTS["22_23"]].includes(year)
    } catch (error) {
        throw new Error(`checkYearValidity:: ${error.message}`)
    }
}
/**
 * The function `getFinancialYear` calculates the financial year based on the input date.
 * @param date - The `date` parameter in the `getFinancialYear` function is used to determine the
 * financial year based on the month of the given date. If the month is January, February, or March,
 * the financial year is considered to be the previous year followed by a hyphen and the last two
 * digits
 * @returns The function `getFinancialYear` returns the financial year based on the input date. 
 */
const getFinancialYear = (date) => {
  try {
    let fiscalyear = "";
    if (date.getMonth() + 1 <= 3) {
      fiscalyear =
        date.getFullYear() -
        1 +
        "-" +
        date.toLocaleDateString("en", { year: "2-digit" });
    } else {
      fiscalyear =
        date.getFullYear() +
        "-" +
        (parseInt(date.toLocaleDateString("en", { year: "2-digit" })) + 1);
    }
    return fiscalyear;
  } catch (error) {
    throw new Error(`getFinancialYear::  ${error.message}`);
  }
};
module.exports.getFinancialYear = getFinancialYear;
module.exports.saveFormLevelHistory = saveFormLevelHistory
module.exports.isYearWithinRange = isYearWithinRange