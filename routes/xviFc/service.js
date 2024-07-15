const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const AnnualAccountData = require("../../models/AnnualAccounts");
const XviFcForm1Tabs = require("../../models/XviFcForm1Tab");
const FormsJson = require("../../models/FormsJson");
const XviFcForm1DataCollection = require("../../models/XviFcFormDataCollection");

const { financialYearTableHeader, priorTabsForXviFcForm, form1QuestionKeys, form2QuestionKeys, slbKeys, form1TempDb, form2TempDb, getInputKeysByType } = require("./form_json");
const { tabsUpdationService, keyDetailsForm1, keyDetailsForm2 } = require("../../util/xvifc_form")
const ExcelJS = require('exceljs');


// One time function.
module.exports.createxviFcFormTabs = async (req, res) => {
    let response = {
        success: true,
        message: "",
    };
    try {
        let dataArray = req.body;
        await XviFcForm1Tabs.insertMany(dataArray);
        response.success = true;
        response.message = "DB successfully updated!!";

        return res.status(201).json(response);
    } catch (err) {
        response.success = false;
        let message = err.message;
        response.message = message;
        console.log("error in createxviFcForm1Tabs:::", err.message);
    }
    res.status(400).json(response);
};

module.exports.createxviFcFormJson = async (req, res) => {
    try {

        let ulbId = req.query.ulb;
        let role = "ULB";
        let currentFormStatus = "NOT_STARTED";
        let ulbData = await Ulb.findOne({ _id: ObjectId(ulbId) }, { name: 1, state: 1, formType: 1 }).lean();
        let form_type = ulbData.formType;
        let stateId = ulbData.state;
        let xviFcFormTabs = await XviFcForm1Tabs.find().lean();
        if (form_type == "form1") {
            xviFcFormTabs = xviFcFormTabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form1" });
            xviFcFormTabs.forEach((tab) => {
                tab.formType = "form1";
            });
        }
        if (form_type == "form2") {
            xviFcFormTabs = xviFcFormTabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form2" });
            xviFcFormTabs.forEach((tab) => {
                tab.formType = "form2";
            });
        }
        let xviFcFormTable = form_type === 'form1' ? form1TempDb : form_type === 'form2' ? form2TempDb : "Form not found!!";

        if (xviFcFormTable === "Form not found!!") {
            return res.status(404).json({ status: false, message: "Form not found!!" });
        }
        let formKeys = form_type === 'form1' ? form1QuestionKeys : form_type === 'form2' ? form1QuestionKeys.concat(form2QuestionKeys) : [];
        let allKeysDetails = form_type === 'form1' ? keyDetailsForm1 : form_type === 'form2' ? keyDetailsForm2 : {};
        allKeysDetails["formType"] = form_type;

        for (let index = 0; index < formKeys.length; index++) {
            if (xviFcFormTable.hasOwnProperty(formKeys[index])) {
                let obj = xviFcFormTable[formKeys[index]];

                xviFcFormTable[formKeys[index]] = await getColumnWiseData(allKeysDetails, formKeys[index], obj, xviFcFormTable.isDraft, "", role, currentFormStatus);
                xviFcFormTable['readonly'] = true;
            } else {
                xviFcFormTable[formKeys[index]] = await getColumnWiseData(
                    formKeys,
                    formKeys[index],
                    {
                        value: "",
                        status: "NOT_STARTED",
                    },
                    null,
                    "",
                    role,
                    // data?.currentFormStatus
                    currentFormStatus
                );
            }
        }

        // Create a json structure - questions.
        let modifiedTabs = await getModifiedTabsXvifcForm(xviFcFormTabs, xviFcFormTable, form_type);

        // Update the json with the pdf links - Already on Cityfinance.
        let fileDataJson = modifiedTabs[2].data[0].year;
        modifiedTabs[2].data[0].year = await getUploadDocLinks(ulbId, fileDataJson);

        // Add Primary keys to the keyDetails{}  - financialData.
        let financialData = modifiedTabs[1].data;
        modifiedTabs[1].data = form_type === 'form1' ? await getUpdatedFinancialData_headers(financialData) : form_type === 'form2' ? await getUpdatedFinancialData_headersForm2(financialData) : "";

        // Add Primary keys to the keyDetails{} - accountingPractices.
        let accountingPractices = modifiedTabs[3].data;
        modifiedTabs[3].data = await getUpdatedAccountingPractices_headers(accountingPractices);

        // Add Primary keys to the keyDetails{} - serviceLevelBenchmark.
        if (form_type === 'form2') {
            let serviceLevelBenchmark = modifiedTabs[4].data;
            modifiedTabs[4].data = await getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmark);
        }

        let viewData = {
            ulb: "",
            ulbName: "",
            stateId: "",
            stateName: "",
            tabs: modifiedTabs,
            financialYearTableHeader
        };


        let dataArray = req.body;
        dataArray["data"] = viewData;
        let temp = await FormsJson.create(dataArray);
        delete temp.modifiedAt;
        temp.save();

        return res.status(201).json({ status: true, message: "Form json created!", data: dataArray });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something went wrong!" });
    }
};

module.exports.getForm = async (req, res) => {
    let ulbId = req.query.ulb;
    let userForm = await Ulb.findOne({ _id: ObjectId(ulbId) }, { formType: 1, name: 1, state: 1, _id: 1, censusCode: 1, sbCode: 1 }).lean();
    let stateData = await State.findOne({ _id: ObjectId(userForm.state) }, { name: 1, _id: 1 }).lean();

    if (userForm.formType == "form1") {
        try {
            let form1Data = await getForm1(userForm, stateData, req.query.role, "");
            return res.status(200).json({ status: true, message: `Sucessfully fetched form 1!`, data: form1Data });
        }
        catch (error) {
            console.log("err", error);
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
    } else if (userForm.formType == "form2") {
        try {
            let form2Data = await getForm2(userForm, stateData, req.query.role, "");
            return res.status(200).json({ status: true, message: `Sucessfully fetched form 2`, data: form2Data });
        }
        catch (error) {
            console.log("err", error);
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
    } else {
        return res.status(404).json({ status: false, message: "Form not found for the user." });
    }

};

module.exports.saveAsDraftForm = async (req, res) => {
    try {
        let ulbData_form = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });

        let userForm = await Ulb.findOne({ _id: ulbId }, { formType: 1, name: 1, state: 1, _id: 1, censusCode: 1, sbCode: 1 }).lean();
        let stateData = await State.findOne({ _id: userForm.state }, { name: 1 }).lean();
        let ulbEligibleStatus = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED_BY_STATE', 'RETURNED_BY_XVIFC'];
        ulbData_form.censusCode = userForm.censusCode;
        ulbData_form.sbCode = userForm.sbCode;
        ulbData_form.ulbName = userForm.name;
        ulbData_form.state = userForm.state;
        ulbData_form.formId = userForm.formType == 'form1' ? 16 : userForm.formType == 'form2' ? 17 : 'N/A';
        ulbData_form.stateName = stateData.name;

        if (existingSubmitData.length <= 0) {
            ulbData_form = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true }).exec();
            return res.status(200).json({ status: true, message: "Data successfully saved as draft!" });
        }
        else if (existingSubmitData.length > 0 && ulbEligibleStatus.includes(existingSubmitData[0].formStatus)) {

            existingSubmitData[0].formStatus = 'IN_PROGRESS';

            // If tab sent is less that total tab - keep what is there in DB, add only sent tab.
            for (let formData of existingSubmitData[0].tab) {
                index = ulbData_form.tab.findIndex(x => x.tabKey === formData.tabKey);
                // Check each question.
                for (let eachObj of formData.data) {
                    if (index > -1) {
                        quesIndex = ulbData_form.tab[index].data.findIndex((x) => x.key === eachObj.key);
                        if (quesIndex <= -1) {
                            ulbData_form.tab[index].data.push(eachObj);
                        } else {
                            if (ulbData_form.tab[index].data[quesIndex]) {
                                eachObj = ulbData_form.tab[index].data[quesIndex];
                            }
                        }
                    }
                }
                // Check tab.
                if (index <= -1) {
                    ulbData_form.tab.push(formData);
                }
            }

            let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true }).exec();;
            return res.status(200).json({ status: true, message: "Data successfully saved as draft!" });
        } else {
            return res.status(208).json({ status: true, message: "Form already submitted!" });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: "Data not saved as draft!" });
    }
};

module.exports.submitFrom = async (req, res) => {
    try {
        let ulbData_form = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let roleName = "ULB"; // TODO: make dynamic.
        let userForm = await Ulb.findOne({ _id: ulbId }, { formType: 1, name: 1, state: 1, _id: 1, censusCode: 1, sbCode: 1 }).lean();
        let stateData = await State.findOne({ _id: userForm.state }, { name: 1 }).lean();
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });
        let validateSubmitData = userForm.formType === 'form1' ? ulbData_form.tab.length === 4 : (userForm.formType === 'form2' ? ulbData_form.tab.length === 5 : false); // Get count of tabs received from frontend.

        if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS' && validateSubmitData) {
            // Check validation and update data from "saveAsDraftValue" to "value".
            let getFormData = userForm.formType === 'form1' ? await getForm1(ulbId, roleName, ulbData_form) : userForm.formType === 'form2' ? await getForm2(ulbId, roleName, ulbData_form) : "";

            if (getFormData.validationCounter > 0) {
                return res.status(400).json({ status: true, message: "Validation failed", data: getFormData });
            } else {
                ulbData_form.formStatus = 'UNDER_REVIEW_BY_STATE';
                ulbData_form.tracker = []
                ulbData_form.tracker.push({ eventName: "UNDER_REVIEW_BY_STATE", eventDate: new Date(), submittedBy: ulbId });
                ulbData_form.submittedAt = new Date();
                ulbData_form.submittedBy = ulbId;
                ulbData_form.censusCode = userForm.censusCode;
                ulbData_form.sbCode = userForm.sbCode;
                ulbData_form.ulbName = userForm.name;
                ulbData_form.stateId = userForm.state;
                ulbData_form.stateName = stateData.name;

                let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true }).exec();
                return res.status(200).json({ status: true, message: "DB successfully updated" });
            }
        } else {
            let errorMessage = existingSubmitData.length > 0 && (existingSubmitData[0].formStatus !== 'IN_PROGRESS') ? "Form already submitted!" : "Either data is incomplete or form not found!";
            return res.status(400).json({ status: true, message: errorMessage });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error });
    }
};

async function validateValues(quesType, ansValue, isPdf = "", fileUrl = "", fileName = "", max = "", min = "", decimal = "") {
    let validation = [];
    if (!ansValue && quesType !== 'file') {
        validation.push({
            name: "required",
            validator: 'required',
            message: "This field cannot be empty!"
        });
    }
    else if (["text", "radio", "dropdown"].includes(quesType) && typeof (ansValue) != 'string') {
        validation.push({
            name: "required",
            validator: 'required',
            message: "This field must be string!"
        });
    }
    else if (quesType === 'number' && typeof (ansValue) != 'number') {
        validation.push({
            name: "required",
            validator: 'required',
            message: "This field must be number!"
        });
    }
    else if (quesType === 'file' && !isPdf && !fileUrl && !fileName) {
        validation.push({
            name: "required",
            validator: 'required',
            message: "This field cannot be empty!"
        });
    }
    else if (quesType === 'number' && typeof (ansValue) == 'number') {
        if (ansValue > max) {
            validation.push({
                name: "required",
                validator: 'required',
                message: "This filed is out of range!"
            });
        }
        if (ansValue < min) {
            validation.push({
                name: "required",
                validator: 'required',
                message: "This filed is min!"
            });
        }
        if (ansValue.toString().includes(".") && ansValue.toString().split('.')[1].length > decimal) {
            validation.push({
                name: "required",
                validator: 'required',
                message: "This filed must be in range - decimal"
            });
        }
    }
    return validation;
}

async function getForm1(ulbData, stateData, roleName, submittedData) {
    let ulbId = ulbData._id;
    let role = roleName;
    let demographicTabIndex;
    let IndexOfYearOfConstitution;
    let frontendYear_Fd;
    let from1AnswerFromDb = submittedData ? submittedData : await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm1Tabs = await XviFcForm1Tabs.find().lean();
    let ulbEligibleStatus = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED_BY_STATE', 'RETURNED_BY_XVIFC'];

    xviFCForm1Tabs = xviFCForm1Tabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form1" });
    xviFCForm1Tabs.forEach((tab) => {
        tab.formType = "form1";
    });
    let xviFCForm1Table = form1TempDb;
    let currentFormStatus = from1AnswerFromDb && from1AnswerFromDb.formStatus ? from1AnswerFromDb.formStatus : 'NOT_STARTED';
    // Get index of year of constitution from demographic data.
    if (from1AnswerFromDb) {
        demographicTabIndex = from1AnswerFromDb.tab.findIndex((x) => { return x.tabKey == "demographicData" });
        IndexOfYearOfConstitution = from1AnswerFromDb.tab[demographicTabIndex].data.findIndex((x) => { return x.key == "yearOfConstitution" });
        frontendYear_Fd = from1AnswerFromDb.tab[demographicTabIndex].data[IndexOfYearOfConstitution].saveAsDraftValue;
    }

    // let keyDetails = await getFromWiseKeyDetails("form1");
    let keyDetails = keyDetailsForm1;
    keyDetails["formType"] = "form1";
    for (let index = 0; index < form1QuestionKeys.length; index++) {
        if (xviFCForm1Table.hasOwnProperty(form1QuestionKeys[index])) {
            let obj = xviFCForm1Table[form1QuestionKeys[index]];
            xviFCForm1Table[form1QuestionKeys[index]] = await getColumnWiseData(keyDetails, form1QuestionKeys[index], obj, xviFCForm1Table.isDraft, "", role, currentFormStatus, frontendYear_Fd);
            xviFCForm1Table[form1QuestionKeys[index]].readonly =
                keyDetails[form1QuestionKeys[index]].autoSumValidation == 'sum' ? true : ulbEligibleStatus.includes(currentFormStatus) ? false : true;

            if (form1QuestionKeys[index] == 'nameOfUlb' || form1QuestionKeys[index] == 'nameOfState') {
                xviFCForm1Table[form1QuestionKeys[index]].readonly = true;
            }
            xviFCForm1Table['readonly'] = role == 'ULB' && ulbEligibleStatus.includes(currentFormStatus) ? false : true;

            if (keyDetails[form1QuestionKeys[index]].year > 1) {
                let selectedKeyDetails = {};
                let quekey = form1QuestionKeys[index];
                selectedKeyDetails = keyDetails[quekey];
                let positionCounter = 1;
                let yearData = [];
                if (frontendYear_Fd && frontendYear_Fd.includes("In")) frontendYear_Fd = "2015-16";
                if (frontendYear_Fd && frontendYear_Fd.includes("Before")) frontendYear_Fd = "2014-15";

                let yindex = -1;
                if (frontendYear_Fd == "2014-15") {
                    yindex = financialYearTableHeader.length;
                } else {
                    yindex = frontendYear_Fd ? financialYearTableHeader.indexOf(frontendYear_Fd) : -1;
                }
                for (let i = 0; i < yindex; i++) {
                    let eachYearobj = {};
                    eachYearobj["label"] = `FY ${financialYearTableHeader[i]}`;
                    eachYearobj["key"] = `fy${financialYearTableHeader[i]}_${selectedKeyDetails.key}`;
                    eachYearobj["year"] = financialYearTableHeader[i];
                    eachYearobj["position"] = positionCounter++;
                    eachYearobj["refKey"] = selectedKeyDetails.key;
                    eachYearobj["formFieldType"] = selectedKeyDetails.formFieldType;
                    eachYearobj["value"] = "";
                    if (selectedKeyDetails.formFieldType === "file") {
                        eachYearobj["isPdfAvailable"] = "";
                        eachYearobj["file"] = {
                            "name": "",
                            "url": ""
                        };
                        eachYearobj["fileAlreadyOnCf"] = [{
                            "name": "",
                            "url": "",
                            "type": "",
                            "label": ""
                        }];
                        eachYearobj["fileRejectOptions"] = [
                            "Balance Sheet",
                            "Schedules To Balance Sheet",
                            "Income And Expenditure",
                            "Schedules To Income And Expenditure",
                            "Cash Flow Statement",
                            "Auditor Report",
                        ];
                        eachYearobj["verifyStatus"] = 1;
                        eachYearobj["rejectOption"] = "";
                        eachYearobj["rejectReason"] = "";
                        eachYearobj["allowedFileTypes"] = ['pdf'];
                    }

                    yearData.push(eachYearobj);
                }
                xviFCForm1Table[form1QuestionKeys[index]].year = yearData;
            }
        }
    }

    // Create a json structure - questions.
    let from1QuestionFromDb = await getModifiedTabsXvifcForm(xviFCForm1Tabs, xviFCForm1Table, "form1");
    let validationCounter = 0;

    from1QuestionFromDb[0].data[0].value = ulbData.name;
    from1QuestionFromDb[0].data[1].value = stateData.name;

    from1QuestionFromDb[1].instruction = "All data should be in consonance with audited accounts or information already submitted on CityFinance, wherever applicable. Amount entered should be in Rupees.";
     let indexOfYearOfConstitution = from1QuestionFromDb[0].data.findIndex((x)=>{return x.key =='yearOfConstitution'})
    if(from1QuestionFromDb[0].data[indexOfYearOfConstitution].value=='After 2022-23'){
        from1QuestionFromDb[1].message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
        from1QuestionFromDb[2].message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
    }else{
        from1QuestionFromDb[1].message='';
        from1QuestionFromDb[2].message='';
    }

    if (from1AnswerFromDb) {
        for (let eachQuestionObj of from1QuestionFromDb) {
            let indexOfKey = from1AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);
            if (eachQuestionObj.key == "financialData") {
                eachQuestionObj.instruction = "All data should be in consonance with audited accounts or information already submitted on CityFinance, wherever applicable. Amount entered should be in Rupees.";
            }
            if (indexOfKey > -1) {
                if (from1AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from1AnswerFromDb.tab[indexOfKey].data) {

                        if (eachQuestionObj.key == "financialData") {
                            for (let eachObj of eachQuestionObj.data) {

                                if (eachObj.year.length <= 0) {
                                    eachQuestionObj.message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
                                }

                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].value = selectedData.saveAsDraftValue;

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, "", "", "", eachObj.max, eachObj.min, eachObj.decimal);
                                        eachObj.year[yearDataIndex].validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }

                        if (eachQuestionObj.key == "uploadDoc") {
                            for (let eachObj of eachQuestionObj.data) {

                                let yearIndex = eachObj.year.findIndex(x => x.key === selectedData.key);
                                if (yearIndex > -1 && (eachObj.key == 'gazetteUpload' || eachObj.key == 'pop2024Upload')) {
                                    eachObj.year = [];
                                    eachObj.year[0] = {
                                        "label": "",
                                        "key": eachObj.key,
                                        "year": "",
                                        "position": 1,
                                        "refKey": eachObj.key,
                                        "formFieldType": 'file',
                                        "allowedFileTypes": ['pdf'],
                                        "max": 20,
                                        "bottomText": "Maximum of 20MB",
                                        "file": { "name": "", "url": "" }
                                    }

                                    eachObj.year[0].file.name = yearIndex > -1 && selectedData && selectedData.file.name ? selectedData.file.name : "";
                                    eachObj.year[0].file.url = yearIndex > -1 && selectedData && selectedData.file.url ? selectedData.file.url : "";

                                }

                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)

                                if (eachObj.year.length <= 0 && eachObj.key == 'auditedAnnualFySt') {
                                    eachQuestionObj.message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form"
                                }

                                if (yearDataIndex > -1 && eachObj.key == 'auditedAnnualFySt' && selectedData.key == eachObj.year[yearDataIndex].key) {

                                    eachObj.year[yearDataIndex].file.name = selectedData.file.name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file.url;
                                    eachObj.year[yearDataIndex].verifyStatus = selectedData.verifyStatus ? selectedData.verifyStatus : 1;
                                    eachObj.year[yearDataIndex].rejectOption = selectedData.rejectOption ? selectedData.rejectOption : "";
                                    eachObj.year[yearDataIndex].rejectReason = selectedData.rejectReason ? selectedData.rejectReason : "";

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, selectedData.isPdfAvailable, eachObj.year[yearDataIndex].file.url, eachObj.year[yearDataIndex].file.name, "", "", "");
                                        eachObj.year[yearDataIndex].validation = [];
                                        eachObj.year[yearDataIndex].validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }

                        if (eachQuestionObj.key == "demographicData" || eachQuestionObj.key == "accountPractice") {
                            for (let eachObj of eachQuestionObj.data) {
                                if (selectedData.key && eachObj.key && selectedData.key == eachObj.key) {
                                    eachObj.value = selectedData.saveAsDraftValue;

                                    if (eachObj.key == "nameOfUlb") eachObj.value = ulbData.name;
                                    if (eachObj.key == "nameOfState") eachObj.value = stateData.name;
                                    if (selectedData.reason) eachObj.reason = selectedData.reason;

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, "", "", "", eachObj.max, eachObj.min, eachObj.decimal);
                                        eachObj.validation = [];
                                        eachObj.validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Add Primary keys to the keyDetails{}  - financialData.
    let financialData = from1QuestionFromDb[1].data;
    from1QuestionFromDb[1].data = await getUpdatedFinancialData_headers(financialData);

    // Update the json with the pdf links - Already on Cityfinance.
    let fileDataJson = from1QuestionFromDb[2].data[0].year;
    from1QuestionFromDb[2].data[0].year = await getUploadDocLinks(ulbId, fileDataJson);

    // Add Primary keys to the keyDetails{} - accountingPractices.
    let accountingPractices = from1QuestionFromDb[3].data;
    from1QuestionFromDb[3].data = await getUpdatedAccountingPractices_headers(accountingPractices);

    let viewData = {
        ulb: ulbId,
        censusCode: ulbData.censusCode,
        sbCode: ulbData.sbCode,
        ulbName: ulbData.name,
        stateId: stateData._id,
        stateName: stateData.name,
        tabs: from1QuestionFromDb,
        formStatus: currentFormStatus,
        validationCounter,
        financialYearTableHeader
    };

    return viewData;

}

async function getForm2(ulbData, stateData, roleName, submittedData) {

    let ulbId = ulbData._id;
    let role = roleName;
    let demographicTabIndex;
    let IndexOfYearOfConstitution;
    let frontendYear_Fd;
    let frontendYear_Slb;
    let IndexOfYearOfSlb;
    let from2AnswerFromDb = submittedData ? submittedData : await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm2Tabs = await XviFcForm1Tabs.find().lean();
    xviFCForm2Tabs = xviFCForm2Tabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form2" });
    xviFCForm2Tabs.forEach((tab) => {
        tab.formType = "form2";
    });
    let xviFCForm2Table = form2TempDb;
    let currentFormStatus = from2AnswerFromDb && from2AnswerFromDb.formStatus ? from2AnswerFromDb.formStatus : 'NOT_STARTED';
    let ulbEligibleStatus = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED_BY_STATE', 'RETURNED_BY_XVIFC'];


    // Get index of year of constitution from demographic data.
    if (from2AnswerFromDb) {
        demographicTabIndex = from2AnswerFromDb.tab.findIndex((x) => { return x.tabKey == "demographicData" });
        IndexOfYearOfConstitution = from2AnswerFromDb.tab[demographicTabIndex].data.findIndex((x) => { return x.key == "yearOfConstitution" });
        frontendYear_Fd = from2AnswerFromDb.tab[demographicTabIndex].data[IndexOfYearOfConstitution].saveAsDraftValue;
        // Get index of year of slb.
        IndexOfYearOfSlb = from2AnswerFromDb.tab[demographicTabIndex].data.findIndex((x) => { return x.key == "yearOfSlb" });
        if (IndexOfYearOfSlb > -1)
            frontendYear_Slb = from2AnswerFromDb.tab[demographicTabIndex].data[IndexOfYearOfSlb].saveAsDraftValue;
    }

    let keyDetails = keyDetailsForm2;
    keyDetails["formType"] = "form2";
    let mergedForm2QuestionKeys = form1QuestionKeys.concat(form2QuestionKeys);

    for (let index = 0; index < mergedForm2QuestionKeys.length; index++) {
        if (xviFCForm2Table.hasOwnProperty(mergedForm2QuestionKeys[index])) {
            let obj = xviFCForm2Table[mergedForm2QuestionKeys[index]];
            xviFCForm2Table[mergedForm2QuestionKeys[index]] = await getColumnWiseData(keyDetails, mergedForm2QuestionKeys[index], obj, xviFCForm2Table.isDraft, "", role, currentFormStatus, frontendYear_Fd, frontendYear_Slb);
            xviFCForm2Table[mergedForm2QuestionKeys[index]].readonly = keyDetails[mergedForm2QuestionKeys[index]].autoSumValidation == 'sum' ? true : ulbEligibleStatus.includes(currentFormStatus) ? false : true
            xviFCForm2Table['readonly'] = role == 'ULB' && ulbEligibleStatus.includes(currentFormStatus) ? false : true;
            if (mergedForm2QuestionKeys[index] == 'nameOfUlb' || mergedForm2QuestionKeys[index] == 'nameOfState') {
                xviFCForm2Table[mergedForm2QuestionKeys[index]].readonly = true;
            }
            if (keyDetails[mergedForm2QuestionKeys[index]].year > 1) {
                let selectedKeyDetails = {};
                let quekey = mergedForm2QuestionKeys[index];
                selectedKeyDetails = keyDetails[quekey];
                let positionCounter = 1;
                let yearData = [];
                if (frontendYear_Fd && frontendYear_Fd.includes("In")) frontendYear_Fd = "2015-16";
                if (frontendYear_Fd && frontendYear_Fd.includes("Before")) frontendYear_Fd = "2014-15";

                let yindex = -1;
                if (frontendYear_Fd == "2014-15") {
                    yindex = financialYearTableHeader.length;
                } else {
                    if (slbKeys.includes(mergedForm2QuestionKeys[index])) {
                        yindex = frontendYear_Slb ? financialYearTableHeader.indexOf(frontendYear_Slb) + 1 : -1;
                    } else {
                        yindex = frontendYear_Fd ? financialYearTableHeader.indexOf(frontendYear_Fd) : -1;
                    }
                }
                for (let i = 0; i < yindex; i++) {
                    let eachYearobj = {};
                    eachYearobj["label"] = `FY ${financialYearTableHeader[i]}`;
                    eachYearobj["key"] = `fy${financialYearTableHeader[i]}_${selectedKeyDetails.key}`;
                    eachYearobj["year"] = financialYearTableHeader[i];
                    eachYearobj["position"] = positionCounter++;
                    eachYearobj["refKey"] = selectedKeyDetails.key;
                    eachYearobj["formFieldType"] = selectedKeyDetails.formFieldType;
                    eachYearobj["value"] = "";
                    if (selectedKeyDetails.formFieldType === "file") {
                        eachYearobj["isPdfAvailable"] = "";
                        eachYearobj["file"] = {
                            "name": "",
                            "url": ""
                        };
                        eachYearobj["fileAlreadyOnCf"] = [{
                            "name": "",
                            "url": "",
                            "type": "",
                            "label": ""
                        }];
                        eachYearobj["fileRejectOptions"] = [
                            "Balance Sheet",
                            "Schedules To Balance Sheet",
                            "Income And Expenditure",
                            "Schedules To Income And Expenditure",
                            "Cash Flow Statement",
                            "Auditor Report",
                        ];
                        eachYearobj["verifyStatus"] = 1;
                        eachYearobj["rejectOption"] = "";
                        eachYearobj["rejectReason"] = "";
                        eachYearobj["allowedFileTypes"] = ['pdf'];
                    }

                    yearData.push(eachYearobj);
                }
                xviFCForm2Table[mergedForm2QuestionKeys[index]].year = yearData
            }

        }
    }
    // Create a json structure - questions.
    let from2QuestionFromDb = await getModifiedTabsXvifcForm(xviFCForm2Tabs, xviFCForm2Table, "form2");
    let validationCounter = 0;

    if (from2AnswerFromDb) {
        for (let eachQuestionObj of from2QuestionFromDb) {
            let indexOfKey = from2AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);
            if (eachQuestionObj.key == "financialData") eachQuestionObj.instruction = "All data should be in consonance with audited accounts or information already submitted on CityFinance, wherever applicable. Amount entered should be in Rupees.";
            if (indexOfKey > -1) {
                if (from2AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from2AnswerFromDb.tab[indexOfKey].data) {

                        if (eachQuestionObj.key == "financialData" || eachQuestionObj.key == "serviceLevelBenchmark") {

                            for (let eachObj of eachQuestionObj.data) {

                                if (eachObj.year.length <= 0) {
                                    eachQuestionObj.message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form"
                                }

                                let yearDataIndex = eachObj.year.findIndex((x) => { return x.key === selectedData.key })

                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {

                                    eachObj.year[yearDataIndex].value = selectedData.saveAsDraftValue;

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, "", "", "", eachObj.max, eachObj.min, eachObj.decimal);
                                        eachObj.year[yearDataIndex].validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }

                        if (eachQuestionObj.key == "uploadDoc") {
                            for (let eachObj of eachQuestionObj.data) {
                                if (eachObj.year.length <= 0 && eachObj.key == 'auditedAnnualFySt') {
                                    eachQuestionObj.message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form."
                                }

                                let yearIndex = eachObj.year.findIndex(x => x.key === selectedData.key);
                                if (yearIndex > -1 && (eachObj.key == 'gazetteUpload' || eachObj.key == 'pop2024Upload')) {
                                    eachObj.year = [];
                                    eachObj.year[0] = {
                                        "label": "",
                                        "key": eachObj.key,
                                        "year": "",
                                        "position": 1,
                                        "refKey": eachObj.key,
                                        "formFieldType": 'file',
                                        "allowedFileTypes": ['pdf'],
                                        "max": 20,
                                        "bottomText": "Maximum of 20MB",
                                        "file": { "name": "", "url": "" }
                                    }

                                    eachObj.year[0].file.name = yearIndex > -1 && selectedData && selectedData.file.name ? selectedData.file.name : "";
                                    eachObj.year[0].file.url = yearIndex > -1 && selectedData && selectedData.file.url ? selectedData.file.url : "";

                                }

                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)

                                if (yearDataIndex > -1 && eachObj.key == 'auditedAnnualFySt' && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file.name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file.url;
                                    eachObj.year[yearDataIndex].verifyStatus = selectedData.verifyStatus ? selectedData.verifyStatus : 1;
                                    eachObj.year[yearDataIndex].rejectOption = selectedData.rejectOption ? selectedData.rejectOption : "";
                                    eachObj.year[yearDataIndex].rejectReason = selectedData.rejectReason ? selectedData.rejectReason : "";

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, selectedData.isPdfAvailable, eachObj.year[yearDataIndex].file.url, eachObj.year[yearDataIndex].file.name, "", "", "");
                                        eachObj.year[yearDataIndex].validation = [];
                                        eachObj.year[yearDataIndex].validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }

                        if (eachQuestionObj.key == "demographicData" || eachQuestionObj.key == 'accountPractice') {
                            for (let eachObj of eachQuestionObj.data) {

                                if (selectedData.key == "nameOfUlb") selectedData.saveAsDraftValue = ulbData.name;
                                if (selectedData.key == "nameOfState") selectedData.saveAsDraftValue = stateData.name;

                                if (selectedData.key && eachObj.key && selectedData.key == eachObj.key) {
                                    eachObj.value = selectedData.saveAsDraftValue;

                                    if (selectedData.reason) eachObj.reason = selectedData.reason;

                                    if (submittedData) {
                                        let validationArr = await validateValues(selectedData.formFieldType, selectedData.saveAsDraftValue, "", "", "", eachObj.max, eachObj.min, eachObj.decimal);
                                        eachObj.validation = [];
                                        eachObj.validation = validationArr;
                                        validationCounter = validationArr.length > 0 ? validationCounter + 1 : validationCounter;
                                    }
                                }
                            }
                        }

                    }
                }
            }
        }
    }

    from2QuestionFromDb[0].data[0].value = ulbData.name;
    from2QuestionFromDb[0].data[1].value = stateData.name;

    let indexOfYearOfConstitution = from2QuestionFromDb[0].data.findIndex((x)=>{return x.key =='yearOfConstitution'});
    if(from2QuestionFromDb[0].data[indexOfYearOfConstitution].value=='After 2022-23'){
        from2QuestionFromDb[1].message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
        from2QuestionFromDb[2].message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
        from2QuestionFromDb[4].message = "We are collecting data till the year 2023-24. Since your ULB was recently constituted, it's not mandatory for you to fill in the financial section data. Please fill in the rest of the form";
    }else{
        from2QuestionFromDb[1].message='';
        from2QuestionFromDb[2].message='';
        from2QuestionFromDb[4].message='';
    }
    from2QuestionFromDb[1].instruction = "All data should be in consonance with audited accounts or information already submitted on CityFinance, wherever applicable. Amount entered should be in Rupees.";

    // Add Primary keys to the keyDetails{}  - financialData.
    let financialData = from2QuestionFromDb[1].data;
    from2QuestionFromDb[1].data = await getUpdatedFinancialData_headersForm2(financialData);

    // Update the json with the pdf links - Already on Cityfinance.
    let fileDataJson = from2QuestionFromDb[2].data[0].year;
    from2QuestionFromDb[2].data[0].year = await getUploadDocLinks(ulbId, fileDataJson);

    // Add Primary keys to the keyDetails{} - accountingPractices.
    let accountingPractices = from2QuestionFromDb[3].data;
    from2QuestionFromDb[3].data = await getUpdatedAccountingPractices_headers(accountingPractices);

    // Add Primary keys to the keyDetails{} - serviceLevelBenchmark.
    let serviceLevelBenchmark = from2QuestionFromDb[4].data;
    from2QuestionFromDb[4].data = await getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmark);

    let viewData = {
        ulb: ulbId,
        ulbName: ulbData.name,
        censusCode: ulbData.censusCode,
        sbCode: ulbData.sbCode,
        stateId: stateData._id,
        stateName: stateData.name,
        tabs: from2QuestionFromDb,
        formStatus: currentFormStatus,
        validationCounter,
        financialYearTableHeader
    };

    return viewData;

};

async function getColumnWiseData(allKeys, key, obj, isDraft, dataSource = "", role, formStatus, frontendYear_Fd, frontendYear_Slb) {
    switch (key) {
        case "nameOfUlb": {
            return {
                ...await getInputKeysByType(allKeys["nameOfUlb"], true, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "nameOfState": {
            return {
                ...await getInputKeysByType(allKeys["nameOfState"], true, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "pop2011": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pop2011"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pop2011"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "popApril2024": {
            let isReadOnly = getReadOnly(formStatus, allKeys["popApril2024"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["popApril2024"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "areaOfUlb": {
            let isReadOnly = getReadOnly(formStatus, allKeys["areaOfUlb"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["areaOfUlb"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "yearOfElection": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfElection"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfElection"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "isElected": {
            let isReadOnly = getReadOnly(formStatus, allKeys["isElected"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["isElected"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "yearOfConstitution": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfConstitution"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfConstitution"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "yearOfSlb": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfSlb"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfSlb"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd, frontendYear_Slb),
                ...obj,
            };
        }
        case "sourceOfFd": {
            let isReadOnly = getReadOnly(formStatus, allKeys["sourceOfFd"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["sourceOfFd"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "pTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "noOfRegiProperty": {
            let isReadOnly = getReadOnly(formStatus, allKeys["noOfRegiProperty"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["noOfRegiProperty"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "taxRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["taxRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["taxRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "feeAndUserCharges": {
            let isReadOnly = getReadOnly(formStatus, allKeys["feeAndUserCharges"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["feeAndUserCharges"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "interestIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["interestIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["interestIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "rentalIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["rentalIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["rentalIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totOwnRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totOwnRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totOwnRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "centralSponsoredScheme": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralSponsoredScheme"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralSponsoredScheme"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "unionFinanceGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["unionFinanceGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["unionFinanceGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "centralGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "sfcGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["sfcGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["sfcGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "grantsOtherThanSfc": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grantsOtherThanSfc"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grantsOtherThanSfc"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "grantsWithoutState": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grantsWithoutState"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grantsWithoutState"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "assignedRevAndCom": {
            let isReadOnly = getReadOnly(formStatus, allKeys["assignedRevAndCom"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["assignedRevAndCom"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "salaries": {
            let isReadOnly = getReadOnly(formStatus, allKeys["salaries"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["salaries"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "pension": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pension"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pension"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "establishmentExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["establishmentExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["establishmentExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "oAndmExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["oAndmExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["oAndmExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "interestAndfinacialChar": {
            let isReadOnly = getReadOnly(formStatus, allKeys["interestAndfinacialChar"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["interestAndfinacialChar"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherRevenueExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherRevenueExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherRevenueExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "adExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["adExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["adExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalRevenueExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalRevenueExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalRevenueExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "capExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["capExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["capExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "centralStateBorrow": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralStateBorrow"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralStateBorrow"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "bonds": {
            let isReadOnly = getReadOnly(formStatus, allKeys["bonds"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["bonds"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "bankAndFinancial": {
            let isReadOnly = getReadOnly(formStatus, allKeys["bankAndFinancial"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["bankAndFinancial"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherBorrowing": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherBorrowing"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherBorrowing"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "grossBorrowing": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grossBorrowing"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grossBorrowing"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "receivablePTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["receivablePTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["receivablePTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "receivableFee": {
            let isReadOnly = getReadOnly(formStatus, allKeys["receivableFee"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["receivableFee"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "otherReceivable": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherReceivable"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherReceivable"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalReceivable": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalReceivable"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalReceivable"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totalCashAndBankBal": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalCashAndBankBal"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalCashAndBankBal"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "accSystem": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accSystem"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accSystem"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "accProvision": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accProvision"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accProvision"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "accInCashBasis": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accInCashBasis"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accInCashBasis"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "fsTransactionRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["fsTransactionRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["fsTransactionRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "fsPreparedBy": {
            let isReadOnly = getReadOnly(formStatus, allKeys["fsPreparedBy"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["fsPreparedBy"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "revReceiptRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["revReceiptRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["revReceiptRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "expRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["expRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["expRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "accSoftware": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accSoftware"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accSoftware"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "onlineAccSysIntegrate": {
            let isReadOnly = getReadOnly(formStatus, allKeys["onlineAccSysIntegrate"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["onlineAccSysIntegrate"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "muniAudit": {
            let isReadOnly = getReadOnly(formStatus, allKeys["muniAudit"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["muniAudit"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totSanction": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totSanction"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totSanction"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "totVacancy": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totVacancy"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totVacancy"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "accPosition": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accPosition"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accPosition"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "auditedAnnualFySt": {
            let isReadOnly = getReadOnly(formStatus, allKeys["auditedAnnualFySt"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["auditedAnnualFySt"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
            };
        }
        case "gazetteUpload": {
            let isReadOnly = getReadOnly(formStatus, allKeys["gazetteUpload"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["gazetteUpload"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "pop2024Upload": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pop2024Upload"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pop2024Upload"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
            };
        }
        case "coverageOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "perCapitaOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["perCapitaOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["perCapitaOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfMeteringWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfMeteringWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfMeteringWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfNonRevenueWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfNonRevenueWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfNonRevenueWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "continuityOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["continuityOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["continuityOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInRedressalCustomerWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "qualityOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["qualityOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["qualityOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "costRecoveryInWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["costRecoveryInWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["costRecoveryInWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInCollectionRelatedWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionRelatedWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionRelatedWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "coverageOfToiletsSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfToiletsSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfToiletsSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "coverageOfSewNet": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfSewNet"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfSewNet"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "collectionEfficiencySew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["collectionEfficiencySew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["collectionEfficiencySew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "adequacyOfSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["adequacyOfSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["adequacyOfSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "qualityOfSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["qualityOfSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["qualityOfSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfReuseSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfReuseSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfReuseSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInRedressalCustomerSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfCostWaterSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfCostWaterSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfCostWaterSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInCollectionSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "householdLevelCoverageLevelSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["householdLevelCoverageLevelSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["householdLevelCoverageLevelSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyOfCollectionSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyOfCollectionSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyOfCollectionSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfSegregationSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfSegregationSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfSegregationSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfMunicipalSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfMunicipalSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfMunicipalSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfScientificSolidSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfScientificSolidSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfScientificSolidSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "extentOfCostInSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfCostInSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfCostInSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInCollectionSwmUser": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionSwmUser"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionSwmUser"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "efficiencyInRedressalCustomerSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "coverageOfStormDrainage": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfStormDrainage"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfStormDrainage"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        case "incidenceOfWaterLogging": {
            let isReadOnly = getReadOnly(formStatus, allKeys["incidenceOfWaterLogging"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["incidenceOfWaterLogging"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
            };
        }
        default:
        // code block
    }
};

/**
 * Function to check if the question is readonly.
 * If form status is IN_PROGRESS or NOT_STARTED - readonly = true.
 * If validation = "sum" i.e if question is autosum - readonly = true.
 * If validation = "sum" i.e if question is auto sum - class = "fw-bold".
 */
function getReadOnly(formStatus, autosumValidation) {
    let ulbEligibleStatus = ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED_BY_STATE', 'RETURNED_BY_XVIFC'];
    return autosumValidation == 'sum' ? true : ulbEligibleStatus.includes(formStatus) ? false : true
}

async function getModifiedTabsXvifcForm(tabs, xviFcFormTable, formType) {
    try {
        let modifiedTabs = [...tabs];
        let service = new tabsUpdationService(xviFcFormTable);
        for (var tab of modifiedTabs) {
            if (tab.id === priorTabsForXviFcForm["demographicData"]) {
                let tempVar = await service.getDataForDemographicDataTab(formType);
                tab.data = [];
                tab.data = tempVar
            } else if (tab.id === priorTabsForXviFcForm["financialData"]) {
                tab.data = await service.getDataForfinancialData(formType);
            } else if (tab.id === priorTabsForXviFcForm["accountPractice"]) {
                tab.data = await service.getDataForAccountingPractices();
            } else if (tab.id === priorTabsForXviFcForm["uploadDoc"]) {
                tab.data = await service.getDataForUploadDoc();
            } else if (tab.id === priorTabsForXviFcForm["serviceLevelBenchmark"]) {
                tab.data = await service.getDataForServiceLevelBenchmark();
            }
        }
        return modifiedTabs;
    } catch (err) {
        console.log("error in getModifiedTabsFiscalRanking ::: ", err.message);
    }
}

/**
 * Function to update the json with the pdf links - Already on Cityfinance.
 * Step 1: Find the pdf with formStatus - "Under review by State", "Under review by MoHUA", "Apporved by MoHUA".
 * Step 2: For those years find document (pdf) links in "DataCollectionForm" & "AnnualAccountData" collection.
 * Priority: AnnualAccountData (Audited) > AnnualAccountData (Unaudited) > Document from "DataCollectionForm" collection.
 */
async function getUploadDocLinks(ulbId, fileDataJson) {
    let alreadyOnCfPdfs = {};

    // Get pdf links from "AnnualAccountDatas" collection.
    let availablePdfData_aa = await AnnualAccountData.find({ "ulb": ObjectId(ulbId) });
    let currentFormStatus = [3, 4, 6];

    for (let echObj of availablePdfData_aa) {
        let tempObj = {
            "year": "", "collection": "annualAccounts", "type": "", "availablePdfData": []
        };
        let obj = {}
        if (echObj.audited.provisional_data && echObj.audited.provisional_data.bal_sheet.pdf.url && (currentFormStatus.includes(echObj.currentFormStatus) || echObj.status == 'APPROVED')) {
            obj.name = echObj.audited.provisional_data.bal_sheet.pdf.name
            obj.url = echObj.audited.provisional_data.bal_sheet.pdf.url
            obj.type = 'bal_sheet'
            obj.label = 'Balance Sheet'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.audited.provisional_data.bal_sheet_schedules.pdf.name
            obj.url = echObj.audited.provisional_data.bal_sheet_schedules.pdf.url
            obj.type = 'bal_sheet_schedules'
            obj.label = 'Schedules To Balance Sheet'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.audited.provisional_data.inc_exp.pdf.name
            obj.url = echObj.audited.provisional_data.inc_exp.pdf.url
            obj.type = 'inc_exp'
            obj.label = 'Income And Expenditure'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.audited.provisional_data.inc_exp_schedules.pdf.name
            obj.url = echObj.audited.provisional_data.inc_exp_schedules.pdf.url
            obj.type = 'inc_exp_schedules'
            obj.label = 'Schedules To Income And Expenditure'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.audited.provisional_data.cash_flow.pdf.name
            obj.url = echObj.audited.provisional_data.cash_flow.pdf.url
            obj.type = 'cash_flow'
            obj.label = 'Cash Flow Statement'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.audited.provisional_data.auditor_report.pdf.name
            obj.url = echObj.audited.provisional_data.auditor_report.pdf.url
            obj.type = 'auditor_report'
            obj.label = 'Auditor Report'
            tempObj.availablePdfData.push(obj);
            // tempObj.availablePdfData = echObj.audited.provisional_data.bal_sheet.pdf;
            tempObj.year = await findYearById(echObj.audited.year);
            tempObj.type = "audited";
            alreadyOnCfPdfs[tempObj.year] = tempObj;

            tempObj = {
                "year": "", "collection": "annualAccounts", "type": "", "availablePdfData": []
            };
            obj = {};
        };

        if (echObj.unAudited.provisional_data && echObj.unAudited.provisional_data.bal_sheet.pdf.url && (currentFormStatus.includes(echObj.currentFormStatus) || echObj.status == 'APPROVED')) {
            obj.name = echObj.unAudited.provisional_data.bal_sheet.pdf.name
            obj.url = echObj.unAudited.provisional_data.bal_sheet.pdf.url
            obj.type = 'bal_sheet'
            obj.label = 'Balance Sheet'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.unAudited.provisional_data.bal_sheet_schedules.pdf.name
            obj.url = echObj.unAudited.provisional_data.bal_sheet_schedules.pdf.url
            obj.type = 'bal_sheet_schedules'
            obj.label = 'Schedules To Balance Sheet'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.unAudited.provisional_data.inc_exp.pdf.name
            obj.url = echObj.unAudited.provisional_data.inc_exp.pdf.url
            obj.type = 'inc_exp'
            obj.label = 'Income And Expenditure'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.unAudited.provisional_data.inc_exp_schedules.pdf.name
            obj.url = echObj.unAudited.provisional_data.inc_exp_schedules.pdf.url
            obj.type = 'inc_exp_schedules'
            obj.label = 'Schedules To Income And Expenditure'
            tempObj.availablePdfData.push(obj);
            obj = {}
            obj.name = echObj.unAudited.provisional_data.cash_flow.pdf.name
            obj.url = echObj.unAudited.provisional_data.cash_flow.pdf.url
            obj.type = 'cash_flow'
            obj.label = 'Cash Flow Statement'
            tempObj.availablePdfData.push(obj);
            // tempObj.availablePdfData = echObj.unAudited.provisional_data.bal_sheet.pdf;
            tempObj.year = await findYearById(echObj.unAudited.year);
            tempObj.type = "unaudited";
            alreadyOnCfPdfs[tempObj.year] = tempObj;
            tempObj = {
                "year": "", "collection": "annualAccounts", "type": "", "availablePdfData": []
            };
            obj = {};
        }
    }

    // Append the links in the json.
    for (let echYrObj of fileDataJson) {
        let fy = echYrObj.label.split(" ")[1];

        if (alreadyOnCfPdfs[fy]) {
            echYrObj.isPdfAvailable = alreadyOnCfPdfs[fy].availablePdfData[0].url ? true : false;
            echYrObj.fileAlreadyOnCf = alreadyOnCfPdfs[fy].availablePdfData;
        } else {
            echYrObj.isPdfAvailable = false;
        }
    }
    return fileDataJson;

}

// Pass mongoDB year ID and get year.
async function findYearById(mongoObjId) {
    let yearData = [
        { "id": "606aadac4dff55e6c075c507", "year": "2020-21" },
        { "id": "606aaf854dff55e6c075d219", "year": "2021-22" },
        { "id": "606aafb14dff55e6c075d3ae", "year": "2022-23" },
        { "id": "606aafc14dff55e6c075d3ec", "year": "2023-24" },
        { "id": "606aafcf4dff55e6c075d424", "year": "2024-25" },
        { "id": "606aafda4dff55e6c075d48f", "year": "2025-26" },
        { "id": "607697074dff55e6c0be33ba", "year": "2019-20" },
        { "id": "63735a4bd44534713673bfbf", "year": "2017-18" },
        { "id": "63735a5bd44534713673c1ca", "year": "2018-19" }
    ]

    let yearIndex = yearData.findIndex((x) => { return x.id == mongoObjId })

    if (yearIndex > -1) { return yearData[yearIndex].year }
    else return '';
}

// Update the json - add the keys/ questions as per the key header - Financial Data - Form 1 Json.
async function getUpdatedFinancialData_headers(allFinancialData) {
    let commonPrimaryKey = [
        "sourceOfFd"
    ];
    let revenue = [
        "taxRevenue",
        "feeAndUserCharges",
        "interestIncome",
        "otherIncome",
        "totOwnRevenue",
        "centralGrants",
        "otherGrants",
        "totalGrants",
        "assignedRevAndCom",
        "otherRevenue",
        "totalRevenue",
    ];
    let expenditure = [
        "establishmentExp",
        "oAndmExp",
        "interestAndfinacialChar",
        "otherRevenueExp",
        "totalRevenueExp",
        "capExp",
        "totalExp",
    ];
    let borrowings = [
        "grossBorrowing"
    ];
    let data = [
        {
            "key": "commonPrimaryKey",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "",
            "data": []
        },
        {
            "key": "revenue",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "I. REVENUE",
            "data": []
        },
        {
            "key": "expenditure",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "II. EXPENDITURE",
            "data": []
        },
        {
            "key": "borrowings",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "III. BORROWINGS",
            "data": []
        }
    ];
    for (let eachObj of allFinancialData) {
        if (commonPrimaryKey.indexOf(eachObj.key) > -1) {
            data[0].data.push(eachObj);
        }
        if (revenue.indexOf(eachObj.key) > -1) {
            data[1].data.push(eachObj);
        }
        if (expenditure.indexOf(eachObj.key) > -1) {
            data[2].data.push(eachObj);
        }
        if (borrowings.indexOf(eachObj.key) > -1) {
            data[3].data.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Financial Data - Form 2 Json.
async function getUpdatedFinancialData_headersForm2(allFinancialData) {
    let commonPrimaryKey = [
        "sourceOfFd"
    ];
    let revenue = [
        "pTax",
        "noOfRegiProperty",
        "otherTax",
        "taxRevenue",
        "feeAndUserCharges",
        "interestIncome",
        "otherIncome",
        "rentalIncome",
        "totOwnRevenue",
        "centralSponsoredScheme",
        "unionFinanceGrants",
        "centralGrants",
        "sfcGrants",
        "grantsOtherThanSfc",
        "grantsWithoutState",
        "otherGrants",
        "totalGrants",
        "assignedRevAndCom",
        "otherRevenue",
        "totalRevenue",
    ];
    let expenditure = [
        "salaries",
        "pension",
        "otherExp",
        "establishmentExp",
        "oAndmExp",
        "interestAndfinacialChar",
        "otherRevenueExp",
        "adExp",
        "totalRevenueExp",
        "capExp",
        "totalExp",
    ];
    let borrowings = [
        "centralStateBorrow",
        "bonds",
        "bankAndFinancial",
        "otherBorrowing",
        "grossBorrowing",
    ];
    let receivables = [
        "receivablePTax",
        "receivableFee",
        "otherReceivable",
        "totalReceivable",
    ];
    let cashAndBank = [
        "totalCashAndBankBal",
    ]
    let data = [
        {
            "key": "commonPrimaryKey",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "",
            "data": []
        },
        {
            "key": "revenue",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "I. REVENUE",
            "data": []
        },
        {
            "key": "expenditure",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "II. EXPENDITURE",
            "data": []
        },
        {
            "key": "borrowings",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "III. BORROWINGS",
            "data": []
        },
        {
            "key": "receivables",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "IV. RECEIVABLES",
            "data": []
        },
        {
            "key": "cashAndBank",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "V. CASH and BANK BALANCE",
            "data": []
        },
    ];
    for (let eachObj of allFinancialData) {
        if (commonPrimaryKey.indexOf(eachObj.key) > -1) {
            data[0].data.push(eachObj);
        }
        if (revenue.indexOf(eachObj.key) > -1) {
            data[1].data.push(eachObj);
        }
        if (expenditure.indexOf(eachObj.key) > -1) {
            data[2].data.push(eachObj);
        }
        if (borrowings.indexOf(eachObj.key) > -1) {
            data[3].data.push(eachObj);
        }
        if (receivables.indexOf(eachObj.key) > -1) {
            data[4].data.push(eachObj);
        }
        if (cashAndBank.indexOf(eachObj.key) > -1) {
            data[5].data.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Accounting Practices.
async function getUpdatedAccountingPractices_headers(accountingPracticesData) {
    let accSysAndProcess = [
        "accSystem",
        "accProvision",
        "accInCashBasis",
        "fsTransactionRecord",
        "fsPreparedBy",
        "revReceiptRecord",
        "expRecord",
        "accSoftware",
        "onlineAccSysIntegrate",
        "muniAudit",
    ];
    let staffing = [
        "totSanction",
        "totVacancy",
        "accPosition",
    ];
    let data = [
        {
            "key": 'accSysAndProcess',
            "section": 'accordion',
            "formFieldType": "questionnaire",
            "label": "I. Accounting Systems and Processes",
            "data": []
        },
        {
            "key": 'staffing',
            "section": 'accordion',
            "formFieldType": "questionnaire",
            "label": "II.Staffing - Finance & Accounts Department",
            "data": []
        },
    ];
    for (eachObj of accountingPracticesData) {
        if (accSysAndProcess.indexOf(eachObj.key) > -1) {
            data[0].data.push(eachObj);
        }
        if (staffing.indexOf(eachObj.key) > -1) {
            data[1].data.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Service Level Benchmark.
async function getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmarkData) {
    let waterSupply = [
        "coverageOfWs",
        "perCapitaOfWs",
        "extentOfMeteringWs",
        "extentOfNonRevenueWs",
        "continuityOfWs",
        "efficiencyInRedressalCustomerWs",
        "qualityOfWs",
        "costRecoveryInWs",
        "efficiencyInCollectionRelatedWs",
    ];
    let sewerage = [
        "coverageOfToiletsSew",
        "coverageOfSewNet",
        "collectionEfficiencySew",
        "adequacyOfSew",
        "qualityOfSew",
        "extentOfReuseSew",
        "efficiencyInRedressalCustomerSew",
        "extentOfCostWaterSew",
        "efficiencyInCollectionSew",
    ];
    let solidWaste = [
        "householdLevelCoverageLevelSwm",
        "efficiencyOfCollectionSwm",
        "extentOfSegregationSwm",
        "extentOfMunicipalSwm",
        "extentOfScientificSolidSwm",
        "extentOfCostInSwm",
        "efficiencyInCollectionSwmUser",
        "efficiencyInRedressalCustomerSwm",
    ];
    let stromWater = [
        "coverageOfStormDrainage",
        "incidenceOfWaterLogging",
    ];
    let data = [
        {
            "key": "waterSupply",
            "section": 'accordion',
            "formFieldType": "table",
            "data": [],
            "label": "I. WATER SUPPLY"
        },
        {
            "key": "sewerage",
            "section": 'accordion',
            "formFieldType": "table",
            "data": [],
            "label": "II. SEWERAGE"
        },
        {
            "key": "solidWaste",
            "section": 'accordion',
            "formFieldType": "table",
            "data": [],
            "label": "III. SOLID WASTE MANAGEMENT"
        },
        {
            "key": "stromWater",
            "section": 'accordion',
            "formFieldType": "table",
            "data": [],
            "label": "IV. STORM WATER DRAINAGE"
        },
    ];

    for (let eachObj of serviceLevelBenchmarkData) {
        if (waterSupply.indexOf(eachObj.key) > -1) {
            data[0].data.push(eachObj);
        }
        if (sewerage.indexOf(eachObj.key) > -1) {
            data[1].data.push(eachObj);
        }
        if (solidWaste.indexOf(eachObj.key) > -1) {
            data[2].data.push(eachObj);
        }
        if (stromWater.indexOf(eachObj.key) > -1) {
            data[3].data.push(eachObj);
        }
    }
    return data;
}

// ------ Review Table + Dashboard. ------ //
module.exports.formList = async (req, res) => {
    let tabCount = 0;
    let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let stateId = user.state;
    let matchParams = user.role == 'XVIFC' ? { isActive: true } : user.role == 'XVIFC_STATE' ? { $and: [{ state: ObjectId(stateId) }, { isActive: true }] } : "";
    let searchText = req.body.searchText ? req.body.searchText : "";

    matchParams = user.role == 'XVIFC' ? {
        $and: [{ name: { $regex: `${searchText}`, $options: 'im' } }, { isActive: true }, { isUT: false }, filter]
    } : user.role == 'XVIFC_STATE' ? { $and: [{ state: ObjectId(stateId) }, { isActive: true }, filter, { name: { $regex: `${searchText}`, $options: 'im' } }] } : "";

    if (filter.formStatus == 'NOT_STARTED') {
        filter.formStatus = null;
        matchParams = user.role == 'XVIFC' ? {
            $and: [{ name: { $regex: `${searchText}`, $options: 'im' } }, { isActive: true }, { isUT: false }, filter]
        } : user.role == 'XVIFC_STATE' ? { $and: [{ state: ObjectId(stateId) }, { isActive: true }, filter, { name: { $regex: `${searchText}`, $options: 'im' } }] } : "";
    }

    let listOfUlbsFromState = [];

    if (!filter.formStatus || (filter.formStatus == 'NOT_STARTED' && Object.keys(sort).length > 0) || filter.formStatus == 'NOT_STARTED') {

        listOfUlbsFromState = await Ulb.aggregate(
            [
                {
                    $lookup: {
                        from: "xvifcformdatacollections",
                        localField: "_id",
                        foreignField: "ulb",
                        as: "tab",
                    },
                },
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "stateResult",
                    },
                },
                {
                    $unwind: {
                        path: "$tab",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$stateResult",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        formType: { $first: "$formType" },
                        censusCode: { $first: "$censusCode" },
                        sbCode: { $first: "$sbCode" },
                        name: { $first: "$name" },
                        ulbName: { $first: "$name" },
                        state: { $first: "$state" },
                        stateName: { $first: "$stateResult.name" },
                        isUT: { $first: "$stateResult.isUT" },
                        formStatus: { $first: "$tab.formStatus" },
                        tabs: { $first: "$tab.tab" },
                        isActive: { $first: "$isActive" },
                        tab: { $first: "$tab" }
                    }
                },
                {
                    $addFields: {
                        formId: {
                            $cond: [
                                { $eq: ["$formType", "form1"] },
                                16,
                                17
                            ]
                        }
                    }
                },
                {
                    $match: matchParams
                },
                {
                    $project: {
                        _id: 1,
                        censusCode: 1,
                        sbCode: 1,
                        code: 1,
                        name: 1,
                        ulbName: 1,
                        state: 1,
                        isActive: 1,
                        formType: 1,
                        formId: 1,
                        tabs: 1,
                        stateName: 1,
                        formStatus: 1,
                        isUT: 1,
                    }
                },
                {
                    $facet: {
                        paginatedResults: [
                            { $skip: skip * limit },
                            { $limit: limit },
                            { $sort: Object.keys(sort).length > 0 ? sort : { name: 1 } }
                        ],
                        totalCount: [
                            {
                                $count: "count"
                            }
                        ]
                    }
                }
            ]
        ).allowDiskUse(true);

        totalUlbForm = listOfUlbsFromState[0].totalCount.length > 0 ? listOfUlbsFromState[0].totalCount[0].count : 0;
        listOfUlbsFromState = listOfUlbsFromState[0].paginatedResults;
    }
    else {
        matchParams = user.role == 'XVIFC' ? filter : user.role == 'XVIFC_STATE' ? { $and: [{ state: ObjectId(stateId) }, filter, { ulbName: { $regex: `${searchText}`, $options: 'im' } }] } : "";
        listOfUlbsFromState = await XviFcForm1DataCollection.find(matchParams).sort(Object.keys(sort).length > 0 ? sort : { formStatus: -1, ulbName: 1 }).skip(skip).limit(limit).lean();
        totalUlbForm = await XviFcForm1DataCollection.find(matchParams).count().lean();
    }

    if (listOfUlbsFromState.length > 0) {
        let reviewTableData = [];

        for (let eachUlbForm of listOfUlbsFromState) {

            let obj = {};
            let allTabDataPercent = [];
            // let ulbData = await XviFcForm1DataCollection.find({ ulb: ObjectId(eachUlbForm.ulb) }, { tab: 1 }).lean();
            let ulbData = eachUlbForm.tabs ? eachUlbForm.tabs : eachUlbForm.tab;

            // Get Data submission %.
            let dataSubmissionPercent = 0;
            if (ulbData && ulbData.length > 0) {
                let demographicDataIndex = ulbData.findIndex((x) => { return x.tabKey == 'demographicData' })
                let temp = ulbData[0];
                ulbData[0] = ulbData[demographicDataIndex];
                ulbData[demographicDataIndex] = temp;
                for (let eachTab of ulbData) {
                    if (eachTab.data.length > 0) {
                        // eachUlbForm.name = eachUlbForm.ulbName ? eachUlbForm.ulbName : eachUlbForm.name;
                        eachUlbForm.formId = eachUlbForm.formId ? eachUlbForm.formId : eachUlbForm.formType == 'form1' ? 16 : 17;
                        tabCount = eachUlbForm.formId == 16 ? 4 : 5;
                        let eachTabPercent = await getSubmissionPercent(eachTab, eachUlbForm.formId);
                        dataSubmissionPercent += eachTabPercent.submissionPercent;
                        allTabDataPercent.push(eachTabPercent);
                    }
                }
            }
            eachUlbForm.formType = eachUlbForm.formId ? eachUlbForm.formId == 16 ? 'form1' : 'form2' : eachUlbForm.formType;
            obj["stateName"] = eachUlbForm.stateName;
            obj["stateId"] = eachUlbForm.state;
            obj["ulbName"] = eachUlbForm.ulbName ? eachUlbForm.ulbName : eachUlbForm.name;
            obj["ulbId"] = eachUlbForm.ulb ? eachUlbForm.ulb : eachUlbForm._id;
            obj["censusCode"] = eachUlbForm.censusCode ? eachUlbForm.censusCode : eachUlbForm.sbCode;
            obj["ulbCategory"] = eachUlbForm.formType == 'form1' ? "Category 1" : eachUlbForm.formType == 'form2' ? "Category 2" : "";
            obj["formStatus"] = eachUlbForm.formStatus ? eachUlbForm.formStatus : "NOT_STARTED";
            obj["dataSubmitted"] = ulbData ? Math.round(Number(dataSubmissionPercent / tabCount)) : 0;
            obj["action"] = (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_XVIFC' && user.role == 'XVIFC') || (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_STATE' && user.role == 'XVIFC_STATE') || (eachUlbForm.formStatus == 'SUBMITTED') ? 'Review' : 'View';
            obj["statusClass"] = eachUlbForm.formStatus == 'IN_PROGRESS' ? 'status-in-progress' : eachUlbForm.formStatus == 'SUBMITTED' || eachUlbForm.formStatus == 'UNDER_REVIEW_BY_STATE' ? 'status-under-review' : 'status-not-started';

            if (!eachUlbForm.isUT)
                reviewTableData.push(obj);
        }

        if (filter.formId) {
            filter.formId = filter.formId == 16 ? 'Category 1' : 'Category 2';
            reviewTableData = reviewTableData.filter((x) => { return x.ulbCategory == filter.formId });
        }

        return res.status(200).json({ status: true, message: "", data: reviewTableData, totalForms: totalUlbForm });
    } else {
        return res.status(404).json({ status: false, message: "ULB not found.", data: listOfUlbsFromState });
    }

};

let denominator = {
    demographicData: 8,
    uploadDoc: 0,
    financialData: 0,
    accountPractice: 13,
    serviceLevelBenchmark: 0,
    yearOfSlb: '',
    yearOfConstitution: ''

};

async function getSubmissionPercent(eachTabData, formId) {

    let numeratorSaveAsDraft = 0;
    let baseYear = Number(financialYearTableHeader[0].split("-")[1]);

    for (eachAns of eachTabData.data) {

        if (eachTabData.tabKey == 'demographicData') {
            if (eachAns.key == "yearOfConstitution" && eachAns.saveAsDraftValue) {
                let temp = baseYear - Number(eachAns.saveAsDraftValue.split("-")[1]);
                if (eachAns.saveAsDraftValue.includes('Before')) {
                    temp = temp + 1;
                }
                denominator["financialData"] = formId == 16 ? temp * 20 : temp * 42;
                denominator["uploadDoc"] = formId == 16 ? temp * 1 : temp * 1;
                denominator.yearOfConstitution = eachAns.saveAsDraftValue;
            }
            if (eachAns.key == "yearOfSlb" && eachAns.saveAsDraftValue) {
                denominator["serviceLevelBenchmark"] = (baseYear - Number(eachAns.saveAsDraftValue.split("-")[1]) + 1) * 28;
                denominator.yearOfSlb = eachAns.saveAsDraftValue;
            }
        }
        denominator.demographicData = formId == 16 ? 8 : 9;


        if (eachTabData.tabKey == 'demographicData' || eachTabData.tabKey == 'accountPractice') {
            if (eachAns.saveAsDraftValue || eachAns.saveAsDraftValue === 0) numeratorSaveAsDraft += 1;
        }
        else {
            let frontendYear_Fd;
            let frontendYear_Slb;
            if (eachTabData.tabKey == "financialData" || eachTabData.tabKey == 'uploadDoc') {
                frontendYear_Fd = denominator.yearOfConstitution;

                if (frontendYear_Fd && frontendYear_Fd.includes("In")) frontendYear_Fd = "2015-16";
                if (frontendYear_Fd && frontendYear_Fd.includes("Before")) frontendYear_Fd = "2014-15";

                let yindex = -1;
                if (frontendYear_Fd == "2014-15") {
                    yindex = financialYearTableHeader.length;
                } else {
                    yindex = frontendYear_Fd ? financialYearTableHeader.indexOf(frontendYear_Fd) : -1;
                }

                let tempYearArr = financialYearTableHeader.slice(0, yindex);
                if (tempYearArr.includes(eachAns.year) && (eachAns.saveAsDraftValue || eachAns.saveAsDraftValue === 0)) {
                    numeratorSaveAsDraft += 1;
                }
                if (eachTabData.tabKey == 'uploadDoc') {
                    if (tempYearArr.includes(eachAns.year) && (eachAns.key != 'gazetteUpload' && eachAns.key != 'pop2024Upload') && (eachAns.file.url || eachAns.verifyStatus == 2 || eachAns.verifyStatus == 3)) numeratorSaveAsDraft += 1;
                }
            } else if (eachTabData.tabKey == "serviceLevelBenchmark") {
                frontendYear_Slb = denominator.yearOfSlb;
                let yindex = -1;

                yindex = frontendYear_Slb ? financialYearTableHeader.indexOf(frontendYear_Slb) + 1 : -1;
                let tempYearArr = financialYearTableHeader.slice(0, yindex);
                if (tempYearArr.includes(eachAns.year) && (eachAns.saveAsDraftValue || eachAns.saveAsDraftValue === 0)) {
                    numeratorSaveAsDraft += 1;
                }
            }

        }
    }
    return {
        key: eachTabData.tabKey,
        numerator: numeratorSaveAsDraft,
        denominator: denominator[eachTabData.tabKey],
        submissionPercent: Number((numeratorSaveAsDraft / denominator[eachTabData.tabKey]) * 100)
    };
}

// ------ Approve froms submitted by ULBs ------ //
module.exports.approveUlbForms = async (req, res) => {
    try {
        let user = req.decoded;
        // let ulbId = req.body.ulb;
        let ulbIds = req.body.ulbs;
        let approveDataList = [];
        let ulbDataForms = await XviFcForm1DataCollection.find({ ulb: { $in: ulbIds.map(id => ObjectId(id)) } });

        for (let ulbDataForm of ulbDataForms) {
            let approveData = {};

            // State Approval
            if (user.role == 'XVIFC_STATE' && ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE' && user.state == ulbDataForm.state) {
                approveData = await approveByState(user.state);
            }
            // XVIFC Approval
            else if (user.role == 'XVIFC' && (ulbDataForm.formStatus == 'UNDER_REVIEW_BY_XVIFC' || ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE')) {
                approveData = await approveByXvifc(user._id);
                if (ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE')
                    approveData.tracker.remark = "State verification was bypassed by XVIFC";
            }
            else {
                return res.status(400).json({ status: false, message: `Action cannot be taken as the current form status is ${ulbDataForm.formStatus} for ULB ID ${ulbDataForm.ulb}` });
            }

            ulbDataForm.formStatus = approveData.formStatus;
            ulbDataForm.tracker.push(approveData.tracker);

            approveDataList.push({
                updateOne: {
                    filter: { ulb: ObjectId(ulbDataForm.ulb) },
                    update: {
                        $set: {
                            formStatus: ulbDataForm.formStatus,
                            tracker: ulbDataForm.tracker
                        }
                    }
                }
            });
        }

        if (approveDataList.length > 0) {
            await XviFcForm1DataCollection.bulkWrite(approveDataList);
            return res.status(200).json({ status: true, message: "Form approved successfully." });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error });
    }
};

async function approveByState(userId) {
    let approveData = {};
    approveData["formStatus"] = "UNDER_REVIEW_BY_XVIFC";
    approveData["tracker"] = { eventName: "UNDER_REVIEW_BY_XVIFC", eventDate: new Date(), submittedBy: userId };
    return approveData;
}
async function approveByXvifc(userId) {
    let approveData = {};
    approveData["formStatus"] = "APPROVED_BY_XVIFC";
    approveData["tracker"] = { eventName: "APPROVED_BY_XVIFC", eventDate: new Date(), submittedBy: userId };
    return approveData;
}


// ------ Reject froms submitted by ULBs ------ //
module.exports.rejectUlbForms = async (req, res) => {
    try {
        let user = req.decoded;
        let ulbIds = req.body.ulbs;
        let rejectMessage = req.body.rejectMessage;
        let rejectionDataList = [];
        let ulbDataForms = await XviFcForm1DataCollection.find({ ulb: { $in: ulbIds.map(id => ObjectId(id)) } });

        for (let ulbDataForm of ulbDataForms) {
            let rejectData = {};

            // Rejection State.
            if (user.role == 'XVIFC_STATE' && ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE' && user.state == ulbDataForm.state) {
                rejectData = await rejectedByState(user.state, rejectMessage);
            }
            // Rejection XVIFC.
            else if (user.role == 'XVIFC' && (ulbDataForm.formStatus == 'UNDER_REVIEW_BY_XVIFC' || ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE')) {
                rejectData = await rejectedByXvifc(user._id, rejectMessage);
                if (ulbDataForm.formStatus == 'UNDER_REVIEW_BY_STATE')
                    rejectData.tracker.remark = "State verification was bypassed by XVIFC";
            }
            else { return res.status(400).json({ status: false, message: 'Action cannot be taken as the current form status is ' + ulbDataForm.formStatus }); }

            ulbDataForm.formStatus = rejectData.formStatus;
            ulbDataForm.tracker.push(rejectData.tracker);
            ulbDataForm.rejectReason = rejectMessage;
            ulbDataForm.rejectedBy = rejectData.rejectedBy;

            rejectionDataList.push({
                updateOne: {
                    filter: { ulb: ObjectId(ulbDataForm.ulb) },
                    update: {
                        $set: {
                            formStatus: ulbDataForm.formStatus,
                            tracker: ulbDataForm.tracker,
                            rejectReason: ulbDataForm.rejectReason,
                            rejectedBy: ulbDataForm.rejectedBy,
                        }
                    }
                }
            });
        }

        if (rejectionDataList.length > 0) {
            await XviFcForm1DataCollection.bulkWrite(rejectionDataList);
            return res.status(200).json({ status: true, message: "Form rejected successfully." });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error });
    }
};

async function rejectedByState(userId, rejectMessage) {
    let rejectData = {};
    rejectData["formStatus"] = "RETURNED_BY_STATE";
    rejectData["tracker"] = { eventName: "RETURNED_BY_STATE", eventDate: new Date(), submittedBy: userId, reason: rejectMessage };
    rejectData["rejectedBy"] = userId;
    return rejectData;
}
async function rejectedByXvifc(userId, rejectMessage) {
    let rejectData = {};
    rejectData["formStatus"] = "RETURNED_BY_XVIFC";
    rejectData["tracker"] = { eventName: "RETURNED_BY_XVIFC", eventDate: new Date(), submittedBy: userId, reason: rejectMessage };
    rejectData["rejectedBy"] = userId;
    return rejectData;
}

// ----- Progress report ----- //
module.exports.progressReport = async (req, res) => {

    let user = req.decoded;
    let stateId = user.state;
    let matchParams = user.role == 'XVIFC' ? { isActive: true } : user.role == 'XVIFC_STATE' ? { $and: [{ state: ObjectId(stateId) }] } : "";

    let listOfUlbsFromState = [];
    let totalUlbForm = 0;
    let tabCount = 0;

    listOfUlbsFromState = await Ulb.aggregate([
        {
            $lookup: {
                from: "xvifcformdatacollections",
                localField: "_id",
                foreignField: "ulb",
                as: "tab",
            },
        },
        {
            $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "stateResult",
            },
        },
        {
            $match: matchParams
        },
        {
            $unwind: {
                path: "$tab",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: "$stateResult",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                formType: { $first: "$formType" },
                censusCode: { $first: "$censusCode" },
                sbCode: { $first: "$sbCode" },
                name: { $first: "$name" },
                ulbName: { $first: "$name" },
                state: { $first: "$state" },
                stateName: { $first: "$stateResult.name" },
                isUT: { $first: "$stateResult.isUT" },
                formStatus: { $first: "$tab.formStatus" },
                tabs: { $first: "$tab.tab" },
                isActive: { $first: "$isActive" },
                tab: { $first: "$tab" }
            }
        },
        {
            $project: {
                _id: 1,
                censusCode: 1,
                sbCode: 1,
                code: 1,
                name: 1,
                ulbName: 1,
                state: 1,
                isActive: 1,
                formType: 1,
                tabs: 1,
                stateName: 1,
                formStatus: 1,
                isUT: 1,
            }
        },
        { $sort: { formStatus: -1, stateName: 1, name: 1 } }
    ]).allowDiskUse(true);

    if (listOfUlbsFromState.length > 0) {
        let reviewTableData = [];

        for (let eachUlbForm of listOfUlbsFromState) {

            let obj = {};
            let allTabDataPercent = [];
            let ulbData = eachUlbForm.tabs ? eachUlbForm.tabs : eachUlbForm.tab;

            // Get Data submission %.
            let dataSubmissionPercent = 0;
            if (ulbData && ulbData.length > 0) {
                let demographicDataIndex = ulbData.findIndex((x) => { return x.tabKey == 'demographicData' })
                let temp = ulbData[0];
                ulbData[0] = ulbData[demographicDataIndex];
                ulbData[demographicDataIndex] = temp;
                for (let eachTab of ulbData) {
                    if (eachTab.data.length > 0) {
                        eachUlbForm.formId = eachUlbForm.formId ? eachUlbForm.formId : eachUlbForm.formType == 'form1' ? 16 : 17;
                        tabCount = eachUlbForm.formId == 16 ? 4 : 5;
                        let eachTabPercent = await getSubmissionPercent(eachTab, eachUlbForm.formId);
                        dataSubmissionPercent += eachTabPercent.submissionPercent;
                        allTabDataPercent.push(eachTabPercent);
                    }
                }
            }
            eachUlbForm.formType = eachUlbForm.formId ? eachUlbForm.formId == 16 ? 'form1' : 'form2' : eachUlbForm.formType;
            obj["stateName"] = eachUlbForm.stateName;
            obj["ulbName"] = eachUlbForm.ulbName ? eachUlbForm.ulbName : eachUlbForm.name;
            obj["censusCode"] = eachUlbForm.censusCode ? eachUlbForm.censusCode : eachUlbForm.sbCode;
            obj["ulbCategory"] = eachUlbForm.formType == 'form1' ? "Category 1" : eachUlbForm.formType == 'form2' ? "Category 2" : "";
            obj["formStatus"] = eachUlbForm.formStatus ? eachUlbForm.formStatus : "NOT_STARTED";
            obj["dataSubmitted"] = ulbData ? Math.round(Number(dataSubmissionPercent / tabCount)) : 0;
            obj["demographicData"] = 0;
            obj["financialData"] = 0;
            obj["uploadDoc"] = 0;
            obj["accountPractice"] = 0;
            obj["serviceLevelBenchmark"] = eachUlbForm.formType == 'form1' ? "N/A" : eachUlbForm.formType == 'form2' ? 0 : "";

            for (let tab of allTabDataPercent) {
                obj[tab.key] = tab.submissionPercent;
            }

            if (!eachUlbForm.isUT)
                reviewTableData.push(obj);
        }

        let formStatusData = await getFormStatusSummary(reviewTableData);

        // Create a new workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        let sheetName = user.role == 'XVIFC' ? 'XVIFC Progress' : 'State Progress';
        const worksheet_1 = workbook.addWorksheet(sheetName);
        const worksheet_2 = workbook.addWorksheet('Form Status Summary');

        // Define the columns
        // Submission % of each tab
        worksheet_1.columns = [
            { header: '#', key: 'rowSlNo', width: 7 },
            { header: 'State', key: 'stateName', width: 15 },
            { header: 'ULB Name', key: 'ulbName', width: 40 },
            { header: 'Census Code', key: 'censusCode', width: 12 },
            { header: 'ULB Category', key: 'ulbCategory', width: 12 },
            { header: 'Form Status', key: 'formStatus', width: 20 },
            { header: 'Data Submitted (%)', key: 'dataSubmitted', width: 15, style: { numFmt: '0.00' } },
            { header: 'Demographic Data Filled (%)', key: 'demographicData', width: 15, style: { numFmt: '0.00' } },
            { header: 'Financial Data Filled (%)', key: 'financialData', width: 15, style: { numFmt: '0.00' } },
            { header: 'Document Upload (%)', key: 'uploadDoc', width: 15, style: { numFmt: '0.00' } },
            { header: 'Accounting Practices Data Filled (%)', key: 'accountPractice', width: 15, style: { numFmt: '0.00' } },
            { header: 'Service Level Benchmark Data Filled (%)', key: 'serviceLevelBenchmark', width: 15, style: { numFmt: '0.00' } },
        ];
        // Form status count.
        worksheet_2.columns = [
            { header: '#', key: 'rowSlNo', width: 7 },
            { header: 'State', key: 'stateName', width: 25 },
            { header: 'Total ULBs', key: 'totalUlbs', width: 12 },
            { header: 'Not Started', key: 'NOT_STARTED', width: 12 },
            { header: 'In Progress', key: 'IN_PROGRESS', width: 12 },
            { header: 'Under review by State', key: 'UNDER_REVIEW_BY_STATE', width: 12 },
            { header: 'Returned by State', key: 'RETURNED_BY_STATE', width: 12 },
            { header: 'Under review by XVIFC', key: 'UNDER_REVIEW_BY_XVIFC', width: 12 },
            { header: 'Returned by XVIFC', key: 'RETURNED_REVIEW_BY_XVIFC', width: 12 },
            { header: 'Approved by XVIFC', key: 'APPROVED_REVIEW_BY_XVIFC', width: 12 },
        ];

        // Add rows to the worksheet
        let rowSlNo = 1;
        reviewTableData.forEach(item => {
            item["rowSlNo"] = rowSlNo++;
            worksheet_1.addRow(item);
        });

        rowSlNo = 1;
        formStatusData.forEach(item => {
            item["rowSlNo"] = rowSlNo++;
            worksheet_2.addRow(item);
        });

        // Create a buffer to store the Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set file name.
        const now = new Date();
        const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const timeString = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
        const filename = `${user.role}_FORM_PROGRESS_${dateString}_${timeString}.xlsx`;

        // Set the response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Send the buffer as the response
        return res.send(buffer);

    } else {
        return res.status(404).json({ status: false, message: "Data download failed." });
    }

};

async function getFormStatusSummary(reviewTableData) {

    const uniqueStates = [...new Set(reviewTableData.map(item => item.stateName))];

    let formStatusRes = [];
    let formStatusObj = {};

    for (state of uniqueStates) {
        formStatusObj = {};
        formStatusObj["stateName"] = state;
        formStatusObj["totalUlbs"] = reviewTableData.filter((x) => { return x.stateName == state }).length;
        formStatusObj["NOT_STARTED"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'NOT_STARTED' }).length;
        formStatusObj["IN_PROGRESS"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'IN_PROGRESS' }).length;
        formStatusObj["UNDER_REVIEW_BY_STATE"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'UNDER_REVIEW_BY_STATE' }).length;
        formStatusObj["RETURNED_BY_STATE"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'RETURNED_BY_STATE' }).length;
        formStatusObj["UNDER_REVIEW_BY_XVIFC"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'UNDER_REVIEW_BY_XVIFC' }).length;
        formStatusObj["RETURNED_REVIEW_BY_XVIFC"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'RETURNED_REVIEW_BY_XVIFC' }).length;
        formStatusObj["APPROVED_REVIEW_BY_XVIFC"] = reviewTableData.filter((x) => { return x.stateName == state && x.formStatus == 'APPROVED_REVIEW_BY_XVIFC' }).length;

        formStatusRes.push(formStatusObj);
    }
    return formStatusRes;
};