const request = require('request')
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const StateGTCCertificate = require('../../models/StateGTCertificate');
const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb')
const {saveStatusAndHistory} = require("../CommonFormSubmission/service")
const { checkForUndefinedVaribales, mutateResponse, getFlatObj } = require("../../routes/CommonActionAPI/service")
const { getKeyByValue, saveFormHistory, grantDistributeOptions, emailTriggerWithMohuaAction } = require("../../util/masterFunctions");
const { years } = require('../../service/years');
const GtcInstallmentForm = require("../../models/GtcInstallmentForm")
const TransferGrantDetailForm = require("../../models/TransferGrantDetailForm")
const { grantsWithUlbTypes, installment_types, singleInstallmentTypes,warningkeys,getMessagesForRadioButton } = require("./constants")
const FormsJson = require("../../models/FormsJson");
const {previousFormsAggregation,getPFMSFilledQuery} = require("./aggregation")
const { MASTER_STATUS, MASTER_STATUS_ID ,MASTER_FORM_STATUS} = require('../../util/FormNames');
const userTypes = require("../../util/userTypes");
const {findPreviousYear} = require("../../util/findPreviousYear")
const {FORMIDs} = require("../../util/FormNames")
const {getAccessYearKey } = require('../../routes/masterForm/service');




let gtcYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
let GtcFormTypes = [
    "nonmillion_untied",
    "million_tied",
    "nonmillion_tied"
]
let alerts = {
    "prevForm":`Your previous year's GTC form is not complete. <a href="${process.env.HOSTNAME}/stateform2223/gtCertificate">Click Here!</a> to access previous year form.`,
    "installmentMsg":(year)=>{
        return `1st Installment (${year}) GTC has to be uploaded first before uploading 2nd Installment (${year}) GTC`
    }
}

let warnings = {
    "electedMpcToMpc": "Total Elected MPCs should be less than equal to Total MPCs",
    "electedNmpcToNmpc": "Total Elected NMPCs should be less than equal to Total NMPCs",
    "transferAmtMtch": "Amount transferred should be equal to amount received.",
    "intTransferAmtMtch": "Amount transferred should be equal to amount received."
}
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
        let conditionPrevOne =
        {
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "2"
        }
        let conditionPrevTwo =
        {
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "1",
        }

        if (data.design_year !== ObjectId("606aaf854dff55e6c075d219")) {
            conditionPrevTwo['status'] = "APPROVED"
            conditionPrevOne['status'] = "APPROVED"
        }

        const prevFormData = await StateGTCCertificate.findOne(conditionPrevOne).lean();
        const prevFormDataMillionTied = await StateGTCCertificate.findOne(conditionPrevTwo).lean();
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
            for (let i = 0; i < forms.length; i++) {
                let form = forms[i];
                if (form.status === "PENDING" && actionTakenByRole === "MoHUA") {
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
                            console.log("suresh", response)
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

const checkForPreviousForms = async (design_year, state) => {
    let validator = {
        valid: true,
        "message": ""
    }
    try {
        let year = parseInt(getKeyByValue(years, design_year))
        let prevYearName = (year - 1).toString() + "-" + `${year.toString().slice(-2)}`
        let yearId = ObjectId(years[prevYearName])
        let gtcFormsLength = await GrantTransferCertificate.find({
            "design_year": yearId,
            "state": ObjectId(state),
        }).countDocuments()
        if (gtcFormsLength < 8) {
            validator.valid = false
            validator.message = alerts['prevForm']
        }
    }
    catch (err) {
        console.log("error in checkForPreviousForms ::", err.message)
    }
    return validator;
}

const getRejectedFields = (currentFormStatus, formStatuses, installment, inputAllowed, role) => {
    try {
        let prevInstallment = installment - 1
        let allowedStatuses = [MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'],MASTER_FORM_STATUS['RETURNED_BY_MoHUA'],MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA']]
        if (prevInstallment && !allowedStatuses.includes(formStatuses?.[prevInstallment]) && role === userTypes.state) {
            return true
        }
        else {
            return inputAllowed.includes(currentFormStatus) && role === userTypes.state ? false : true
        }
    }
    catch (err) {
        console.log("error in  getRejectedgetRejectedFieldsFields::::  ", err.message)
    }
}

const getManipulatedJson = async (installment, type, design_year, formJson, fieldsTohide, state, role, formStatuses,previousYearData) => {
    let keysToBeDeleted = ["_id", "createdAt", "modifiedAt", "actionTakenByRole", "actionTakenBy", "ulb", "design_year"]
    let mformObject = {
        "language": [],
    }
    let fileSchema = {
        "name": "",
        "url": ""
    }
    try {
        let file = {...fileSchema}
        let gtcForm = await GrantTransferCertificate.findOne({
            year: ObjectId(design_year),
            installment,
            type,
            state
        }, { history: 0 }).lean() || {}
        gtcForm.currentFormStatus = gtcForm.hasOwnProperty("currentFormStatus") ? gtcForm.currentFormStatus : 1
        let yearName = getKeyByValue(years, design_year)
        file = gtcForm && gtcForm.file ? gtcForm.file : file
        let installmentForm = await GtcInstallmentForm.findOne({
            gtcForm: gtcForm?._id,
            formType: type,
            installment,
            year: yearName,
            state: ObjectId(state)
        }).populate("transferGrantdetail").lean()
        mformObject._id = installmentForm?._id
        // console.log("installmentForm ::: ",installmentForm)
        if (installmentForm === null) {
            installmentForm = await GtcInstallmentForm().toObject({ virtuals: true })
            installmentForm.ulbType = grantsWithUlbTypes[type].ulbType
            installmentForm.grantType = grantsWithUlbTypes[type].grantType
            installmentForm.year = getKeyByValue(years, design_year)
        }
        if (installmentForm?.transferGrantdetail && installmentForm?.transferGrantdetail.length === 0) {
            let transerGrantForm = await TransferGrantDetailForm().toObject({virtuals:true})
            installmentForm['transferGrantdetail'] = [transerGrantForm]
        }
        let inputAllowed = [MASTER_FORM_STATUS['IN_PROGRESS'],MASTER_FORM_STATUS['NOT_STARTED'],MASTER_FORM_STATUS['RETURNED_BY_MoHUA']]
        installmentForm.installment_type = installment_types[installment]
        let installmentObj = { ...installmentForm }
        installmentObj['warnings'] = {
            "accountLinked" : {
                "2":await getMessagesForRadioButton()['accountLinked']['2']
            }
        }
        installmentObj['accountLinked'] = previousYearData.pfmsFilledPerc === 100 ? "Yes" : "No"
        installmentObj['propertyTaxNotif']  = previousYearData?.isPfrFilled
        installmentObj['sfcNotification'] = previousYearData?.IsSfcFormFilled
        installmentObj['sfcNotificationCopy'] = previousYearData.sfcFile || {...fileSchema}
        installmentObj['propertyTaxNotifCopy'] = previousYearData.pfrFile || {...fileSchema}
        let flattedForm = await getFlatObj(installmentObj)
        flattedForm['modelName'] = "GtcInstallmentForm"
        flattedForm['fieldsTohide'] = fieldsTohide
        let shouldDisableFields = getRejectedFields(gtcForm?.currentFormStatus, formStatuses, installment, inputAllowed, role)
        formStatuses[installment] = gtcForm?.currentFormStatus
        if (installmentForm?.transferGrantdetail && installmentForm?.transferGrantdetail.length > 0) {
            installmentForm.transferGrantdetail = installmentForm?.transferGrantdetail.map(item => item.disableFields = shouldDisableFields)
        }
        flattedForm['disableFields'] = shouldDisableFields
        let questionJson = await mutateResponse([...formJson.data], flattedForm, keysToBeDeleted, "STATE")
        mformObject['language'] = questionJson
        mformObject['language'][0].isQuestionDisabled = shouldDisableFields
        mformObject['isQuestionDisabled'] = shouldDisableFields
        // let questionD = questionJson[0]['question'].find(item => item.shortKey === "transferGrantdetail_tableview_addbutton")['childQuestionData'][0]
        // let questionR = questionD.map(item => item.ans)
        // console.log("questionR ::: ",questionR)
        let data = {
            "data": [mformObject]
        }
        flattedForm = {}
        const statusId = gtcForm.currentFormStatus;
        const canTakeAction = (statusId == MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'] && role == userTypes.mohua);
        let rejectReason_mohua = gtcForm?.rejectReason_mohua || '';
        let responseFile_mohua = gtcForm?.responseFile_mohua || {
            name: '',
            url: ''
        }
        let status = MASTER_STATUS_ID[gtcForm.currentFormStatus]
        return { questionResponse: data, file, status, statusId, rejectReason_mohua, responseFile_mohua, canTakeAction };
    }
    catch (err) {
        console.log("error in getManipulatedJson ::: ", err)
    }
}

const getJson = async (state, design_year, role,previousYearData) => {
    try {
        var formStatuses = {}
        let fieldsTohide = []
        let ulb = await Ulb.findOne({
            "state": ObjectId(state),
            "isMillionPlus": "Yes"
        }, { isMillionPlus: 1 })
        let stateIsMillion = ulb?.isMillionPlus === "Yes" ? true : false
        let forms = await FormsJson.find({
            "formId":{"$in":[FORMIDs['GTC_STATE'],FORMIDs['GTC_TABLE_STRUCTURE']]},
            "design_year":design_year
        }).lean()
        let basicEmptyStructure = forms.find(item => item.formId === FORMIDs['GTC_TABLE_STRUCTURE']).data
        let formJson = forms.find(item => item.formId === FORMIDs['GTC_STATE'])
        if (!stateIsMillion) {
            basicEmptyStructure = basicEmptyStructure.filter(item => item.type != "million")
            fieldsTohide = ["totalMpc", "totalElectedMpc"]
        }
        let returnableJson = []
        for (let carousel of basicEmptyStructure) {
            for (let question of carousel.questions) {
                question.questionresponse = ""
                let { questionResponse, file, status, statusId, rejectReason_mohua, responseFile_mohua, canTakeAction } = await getManipulatedJson(question.installment, question.type, design_year, { ...formJson }, fieldsTohide, ObjectId(state), role, formStatuses,previousYearData)
                question.status = status
                question.statusId = statusId
                question.questionresponse = JSON.parse(JSON.stringify(questionResponse))
                question.file = file
                question.canTakeAction = canTakeAction;
                question.rejectReason_mohua = rejectReason_mohua;
                question.responseFile_mohua = responseFile_mohua;
            }
            returnableJson.push({ ...carousel })
        }
        return { json: [...returnableJson], stateIsMillion: stateIsMillion }
    }
    catch (err) {
        console.log("error in getJson :::  ", err.message)
        return []
    }
}

async function getPreviousYearData(state,design_year){
    let response = {}, prevYearPFMSAllFilled, currentYearPFMSAllFilled ;
    try{
        let params = {
            state:ObjectId(state),
            design_year:ObjectId(design_year),
            prevYear :ObjectId(years[findPreviousYear(getKeyByValue(years,design_year))]),
        }
        let prevAccessYearKey = await getAccessYearKey(params.prevYear.toString());
        let ulbsActiveLastYear = await Ulb.countDocuments({
            state: params.state,
            [prevAccessYearKey]: true,
            isActive: true
        });
        let currentAccessYearKey = await getAccessYearKey(params.design_year.toString());
        ({ response, prevYearPFMSAllFilled, currentYearPFMSAllFilled } = await getPFMSFilledData(params, prevAccessYearKey, currentAccessYearKey, response, design_year, prevYearPFMSAllFilled, currentYearPFMSAllFilled, ulbsActiveLastYear));
    }
    catch(err){
        console.log("error in getPreviousYearData :: ",err.message)
    }
    return response
}

/**
 * The function `getPFMSFilledData` retrieves data related to PFMS filled forms for ULBs based on
 * specified parameters and access years.
 * @param params - The `params` object contains the following properties:
 * @param prevAccessYearKey - `prevAccessYearKey` is a key that represents the previous access year in
 * the data.
 * @param currentAccessYearKey - The `currentAccessYearKey` parameter is used to specify the key for
 * the current access year in the database. 
 * @param response - The `response` parameter in the `getPFMSFilledData` function is used to store the
 * response data obtained from the database queries
 * @param design_year - Design year is used as a parameter in the function to filter the PFMS filled
 * data for the current year. It is passed as an ObjectId in the function call to getPFMSFilledData.
 * @param prevYearPFMSAllFilled - The `prevYearPFMSAllFilled` parameter in the `getPFMSFilledData`
 * function is used to store the aggregated data 
 * @param currentYearPFMSAllFilled - The `currentYearPFMSAllFilled` parameter in the
 * `getPFMSFilledData` 
 * @param ulbsActiveLastYear - `ulbsActiveLastYear` is the number of ULBs (Urban Local Bodies) that
 * were active in the previous year.
 * @returns The function `getPFMSFilledData` is returning an object with three properties: `response`,
 * `prevYearPFMSAllFilled`, and `currentYearPFMSAllFilled`.
 */
async function getPFMSFilledData(params, prevAccessYearKey, currentAccessYearKey, response, design_year, prevYearPFMSAllFilled, currentYearPFMSAllFilled, ulbsActiveLastYear) {
   try {
     let ulbsCreatedThisYear = await Ulb.countDocuments({
         state: params.state,
         [prevAccessYearKey]: false,
         [currentAccessYearKey]: true,
         isActive: true
     });
     let query = await previousFormsAggregation(params, currentAccessYearKey);
     response = await Ulb.aggregate(query).allowDiskUse(true);
     let pfmsFilledLastQuery = getPFMSFilledQuery(params, prevAccessYearKey, null, params.prevYear);
     let pfmsFilledCurrentQuery = getPFMSFilledQuery(params, prevAccessYearKey, currentAccessYearKey, ObjectId(design_year));
     prevYearPFMSAllFilled = await Ulb.aggregate(pfmsFilledLastQuery);
     currentYearPFMSAllFilled = await Ulb.aggregate(pfmsFilledCurrentQuery);
     response["prevYearPFMSAllFilled"] =
         ulbsActiveLastYear - prevYearPFMSAllFilled[0]?.pfmsFilledCount;
     response["currentYearPFMSAllFilled"] = ulbsCreatedThisYear ?
         ulbsCreatedThisYear - (currentYearPFMSAllFilled.length ? currentYearPFMSAllFilled[0]?.pfmsFilledCount : 0) : 0;
     return { response, prevYearPFMSAllFilled, currentYearPFMSAllFilled };
 
   } catch (error) {
    console.log(error.message)
   }
}


async function addWarnings(previousYearData,design_year){
    try{
        let sfcLink = `<a href="stateform2223/fc-formation" target="_blank"> Click here to fill previous form</a>`
        let propertyTaxLink = `<a href="stateform2223/property-tax" target="_blank"> Click here to fill previous form</a>`
        let reviewPfmsLink = `<a href="stateform2223/review-ulb-form" target="_blank"> Click here to check for the ulbs</a>`
        if(!previousYearData['prevYearPFMSAllFilled'] && previousYearData['currentYearPFMSAllFilled']){
         reviewPfmsLink = `<a href="state-form/${design_year}/review-ulb-form" target="_blank"> Click here to check for the ulbs</a>`    
        }
        let warnings = await getMessagesForRadioButton(sfcLink,propertyTaxLink,reviewPfmsLink)
        let errors = []
        if(previousYearData[0].IsSfcFormFilled === 'No'){
            errors.push(warnings['recomAvail']['2'])
        }
        if(previousYearData[0].isPfrFilled === "No"){
            errors.push(warnings['propertyTaxNotif']['2'])
        }
        if(previousYearData[0].pfmsFilledPerc < 100){
            errors.push(warnings['accountLinked']['2'])
        }
        return errors
    }
    catch(err){
        console.log("error in addWarnings ::: ",err.message)
    }
}



module.exports.getInstallmentForm = async (req, res, next) => {
    let response = {
        success: false,
        message: "",
        data: [],
        errors: []
    }
    try {
        let responseData = []
        let { design_year, state, formType } = req.query
        let { role } = req.decoded
        let previousYearData = await getPreviousYearData(state,design_year);
        response.errors = await addWarnings(previousYearData, design_year)
        let validator = await checkForUndefinedVaribales({
            "design year": design_year,
            "state": state
        })
        if (!validator.valid) {
            response.message = validator.message
            return res.json(response)
        }
        let formValidator = await checkForPreviousForms(design_year, state)
        if (!formValidator.valid) {
            response.success = false;
            response.message = formValidator.message
            response.errors = [formValidator.message]
            return res.json(response)
        }
        response.success = !response.errors.length 
        response.message = ""
        let { json, stateIsMillion } = await getJson(state, design_year, role,previousYearData[0])
        response.data = json
        response.stateIsMillion = stateIsMillion
    }
    catch (err) {
        console.log("error in getInstallmentForm ::: ", err.message)
        if (["demo", "staging"].includes(process.env.ENV)) {
            response.message = err.message
        }
    }
    return res.json(response)
}

async function checkPreviousInstallment(params) {
    let validator = {
        valid: true,
        message: ""
    }
    try {
        let { installment, year, type, isDraft, status, financialYear, design_year, state, installment_type } = params
        let prevInstallment = parseInt(installment) - 1
        if (prevInstallment <= 0 || singleInstallmentTypes.includes(type)) {
            return validator
        }
        let yearName = getKeyByValue(years, year)
        let prevGtcForm = await GrantTransferCertificate.findOne({
            installment: prevInstallment,
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            installment_type: installment_type
        })
        if (prevGtcForm == null) {
            validator.valid = false
            validator.message = alerts.installmentMsg(yearName)
            return validator
        }

    }
    catch (err) {
        console.log("error in checkPreviousInstallment ::: ", err.message)
    }
    return validator
}

async function checkValidationsInstallmentForm(payload, transferDetail) {
    let validator = {
        valid: true,
        "message": "",
        "errors": []
    }
    try {
        if (payload['totalElectedNmpc'] != undefined && payload['totalNmpc'] != undefined) {
            if (parseFloat(payload['totalElectedNmpc']) > parseFloat(payload['totalNmpc'])) {
                validator.valid = false
                validator.errors.push(warnings['electedNmpcToNmpc'])
            }
        }
        if (payload['totalElectedMpc'] != undefined && payload['totalMpc'] != undefined) {
            if (parseFloat(payload['totalElectedMpc']) > parseFloat(payload['totalMpc'])) {
                validator.valid = false
                validator.errors.push(warnings['electedMpcToMpc'])
            }
        }
        if (payload['recAmount'] != undefined) {
            let totalTransAmountSum = transferDetail.reduce((result, value) => parseFloat(result) + parseFloat(value.transAmount), 0)
            if (totalTransAmountSum != payload['recAmount']) {
                validator.valid = false
                validator.errors.push(warnings['transferAmtMtch'])
            }
        }
    }
    catch (err) {
        validator.message = err.message
        console.log("error in checkValidationsInstallmentForm ::: ", err.message)
    }
    return validator
}

const appendFormId = async (transferGrantData, gtcInstallment) => {
    try {
        let data = transferGrantData.map((item) => {
            item.installmentForm = gtcInstallment._id
            let insertedValues = {
                "insertOne": {
                    document: item
                }
            }
            return insertedValues
        })
        return data
    }
    catch (err) {
        console.log("error in appendFormId ::: ", err.message)
    }
    return transferGrantData
}
async function handleInstallmentForm(params) {
    let validator = {
        valid: true,
        message: "",
        errors: ""
    }

    let { installment, year, type, status, financialYear, design_year, state, data, gtcFormId, statusId: currentFormStatus } = params
    try {
        year = getKeyByValue(years, year)
        let runValidators = [MASTER_STATUS['In Progress']].includes(currentFormStatus) ? false : true
        let transferGrantData = data['transferGrantdetail']
        delete data['transferGrantdetail']
        data.grantType = grantsWithUlbTypes[type].grantType
        data.ulbType = grantsWithUlbTypes[type].ulbType
        let payload = {
            installment,
            year,
            formType: type,
            gtcForm: ObjectId(gtcFormId),
            
        }
        Object.assign(payload, data)
        payload.grantDistribute = grantDistributeOptions[payload.grantDistribute] || null
        let installmentValidatior = await checkValidationsInstallmentForm(payload, transferGrantData)
        if (!installmentValidatior.valid && runValidators) {
            validator.message = "Not valid"
            validator.valid = false
            validator.errors = installmentValidatior.errors
            return validator
        }
        // console.log("transferGrantData", transferGrantData)
        let gtcInstallment = await GtcInstallmentForm.findOneAndUpdate({
            installment,
            year,
            formType: type,
            state: ObjectId(state)
        }, payload, { upsert: true, new: true, runValidators: runValidators })
        let totalTransAmount = transferGrantData.reduce((result, value) => parseFloat(result) + parseFloat(value.transAmount), 0) || 0
        let totalIntTransfer = transferGrantData.reduce((result, value) => parseFloat(result) + parseFloat(value.intTransfer), 0) || 0
        transferGrantData = await appendFormId(transferGrantData, gtcInstallment)
        //delete Previous data
        let idsTobeDeleted = await TransferGrantDetailForm.find({
            installmentForm: gtcInstallment._id
        },{
            "_id":1
        }).lean()
        console.log("idsTobeDeleted :: ",idsTobeDeleted)
        idsTobeDeleted = idsTobeDeleted.map( item=> item._id)
        console.log("idsTobeDeleted ::: ",idsTobeDeleted)
        // insert new Data
        let insertedData = await TransferGrantDetailForm.bulkWrite(transferGrantData, { runValidators })
        await TransferGrantDetailForm.deleteMany({
            "_id":{
                "$in":idsTobeDeleted
            }
        })
        let grantDetailIds = Object.values(insertedData.insertedIds)
        // updateIds and total
        let ele = await GtcInstallmentForm.findOneAndUpdate({
            "_id": gtcInstallment._id,

        }, {
            "transferGrantdetail": grantDetailIds,
            "totalIntTransfer": totalIntTransfer,
            "totalTransAmount": totalTransAmount,
           
        })

        validator.valid = true
        validator.message = ""
    }
    catch (err) {
        console.log("error in handleInstallmentForm ::: ", err)
        validator.message = "Not valid"
        validator.valid = false
        let ele = await GrantTransferCertificate.findOneAndUpdate({
            "_id": ObjectId(gtcFormId)
        }, {
            "$set": {
                currentFormStatus: 2
            }
        })
        validator.errors = Object.keys(err.errors).map(item => err.errors[item]['properties']['message'])
    }
    return validator
}

async function getOrCreateFormId(params) {
    try {
        let { installment, year, type, isDraft, status, financialYear, design_year, state, file, statusId: currentFormStatus } = params
        let gtcForm = await GrantTransferCertificate.findOneAndUpdate({
            installment,
            year: ObjectId(year),
            type,
            design_year: ObjectId(design_year),
            state: ObjectId(state)
        }, {
            installment,
            year: ObjectId(year),
            type,
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            currentFormStatus: currentFormStatus,
            file: file,
            "rejectReason_mohua" : '',
            "responseFile_mohua"  :''
        }, { upsert: true, new: true })
        return gtcForm._id
    }
    catch (err) {
        console.log("error in getOrCreateFormId ::: ", err.message)
        return null
    }
}

module.exports.createOrUpdateInstallmentForm = async (req, res) => {
    let response = {
        "success": true,
        "message": "",
        "errors": []
    }
    try {
        let { installment, type, isDraft, status, financialYear, year, state, statusId: currentFormStatus, installment_type } = req.body
        let role = req.decoded.role
        let userId = req.decoded._id
        if (role !== userTypes.state) {
            response.success = false
            response.message = "Not Permitted"
            response.message = ["Not Permitted"]
            return response.status(405).json(response)
        }
        let formSubmit = [JSON.parse(JSON.stringify(req.body))]
        let params = {
            "installment id": installment,
            "year id ": year,
            "type": type,
            "isDraft": isDraft,
            "status": currentFormStatus,
            "financialYear": financialYear,
            "year": year,
            "state": state
        }
        let runValidators = [MASTER_FORM_STATUS['IN_PROGRESS']].includes(currentFormStatus) ? false : true
        let validator = await checkForUndefinedVaribales(params)
        if (!validator.valid) {
            response.success = false
            response.message = validator.message
            return res.status(405).json(response)
        }
        let installmentValidator = await checkPreviousInstallment(req.body)
        if (!installmentValidator.valid && runValidators) {
            response.message = installmentValidator.message
            response.success = false
            return res.status(405).json(response)
        }
        let gtcFormId = await getOrCreateFormId(req.body)
        formSubmit[0]['_id'] = gtcFormId
        if (!gtcFormId) {
            throw { message: "something went wrong" }
        }
        req.body.gtcFormId = gtcFormId
        req.body._id =  gtcFormId
        req.body.formSubmit = [JSON.parse(JSON.stringify(req.body))]
        let installmentFormValidator = await handleInstallmentForm(req.body)
        // console.log("installmentFormValidator ::: ", installmentFormValidator)
        if (!installmentFormValidator.valid && runValidators) {
            response.success = false
            response.message = installmentFormValidator.errors
            // response.errors = installmentFormValidator.errors
            return res.status(405).json(response)
        }
        
        let actionTakenByRole = role
        let actionTakenBy = userId
        let formBodyStatus = currentFormStatus
        await createHistory({ currentFormStatus, gtcFormId ,formSubmit , actionTakenByRole , actionTakenBy , formBodyStatus })
        response.success = true
        response.message = "Success"
        return res.status(200).json(response)

    }
    catch (err) {
        console.log("error in createInstallmentForm :::: ", err)
        response.success = false
        response.message = "Something went wrong"
        if (["demo", "staging"].includes(process.env.ENV)) {
            response.message = err.message
        }
    }
    return res.status(400).json(response)
}

module.exports.installmentAction = async (req, res) => {

    try {
        let {role,mohua} = req.decoded
        if(role !== userTypes.mohua){
            return res.json({
                "success":true,
                "message":"Not permitted"
            })
        }
        const {
            key,
            rejectReason_mohua,
            responseFile_mohua,
            statusId,
            installment,
            design_year,
            state,
        } = req.body;

        const found = await GrantTransferCertificate.findOneAndUpdate({
            installment,
            // year: ObjectId(year),
            // type,
            type:key,
            design_year: ObjectId(design_year),
            state: ObjectId(state)
        }, {
            $set: {
                actionTakenBy: mohua || state,
                actionTakenByRole:role,
                currentFormStatus: statusId,
                rejectReason_mohua,
                responseFile_mohua
            }
        });
        req.body._id = found?._id
        req.body.rejectReason = rejectReason_mohua
        req.body.responseFile = responseFile_mohua
        req.body.financialYear = design_year
        let formSubmit = [{...req.body,type:key,currentFormStatus:statusId}]
        await createHistory({ formBodyStatus : Number(statusId),formSubmit, actionTakenByRole:role , actionTakenBy: mohua || state  })
        if(!found) return res.status(404).json({ message: 'Installment not found'});
        res.status(200).json({
            success: true,
            message: 'Action recorded'
        });

        //Send mail to state when mahua take action in this form.
        await emailTriggerWithMohuaAction(state, statusId, rejectReason_mohua, FORMIDs['GTC_STATE'])
        return;
    }
    catch (err) {
        let message = ["demo","staging"].includes(process.env.ENV) ? err.message : "something went wrong"
         return res.status(404).json({
            success : true,
            message,
        })
    }
}

async function createHistory(params) {
    try {
        let {formBodyStatus,actionTakenBy,actionTakenByRole,formSubmit,formType} = params
        let formData = formSubmit[0]
        console.log("formData :: ",getKeyByValue(years,formData.financialYear))
        let shortKey = `${formData.type}_${getKeyByValue(years,formData.financialYear)}_${formData.installment}`
        console.log("shortKey :: ",shortKey)
            let historyParams = {
                formBodyStatus,
                actionTakenBy:actionTakenBy,
                actionTakenByRole:actionTakenByRole,
                formSubmit:formSubmit,
                formType:"GTC_STATE",
                shortKey:shortKey
            }
            
            await saveStatusAndHistory(historyParams)
    }
    catch (err) {
        console.log("error in createHistory ::: ", err.message)
    }
}

function doRequest(url) {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            method: 'HEAD'
        }
        request(options, (error, resp, body) => {
            if (!error && resp?.statusCode == 200) {
                reject(url)
            } else if (resp?.statusCode == undefined) {
                reject(url)
            } else {
                resolve(url);
            }
        });
    });
}

