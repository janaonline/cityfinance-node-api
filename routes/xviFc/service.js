const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const UlbLedger = require("../../models/UlbLedger");
// const DataCollectionForm = require("../../models/DataCollectionForm");
const AnnualAccountData = require("../../models/AnnualAccounts");
const XviFcForm1Tabs = require("../../models/XviFcForm1Tab");
const FormsJson = require("../../models/FormsJson");
const XviFcForm1DataCollection = require("../../models/XviFcForm1DataCollection");
const Year = require("../../models/Year");

const { financialYearTableHeader, priorTabsForXviFcForm, form1QuestionKeys, form2QuestionKeys, form1TempDb, form2TempDb, getInputKeysByType } = require("./form_json");
const { tabsUpdationService, keyDetailsForm1, keyDetailsForm2 } = require("../../util/xvifc_form")

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
        let xviFcFormTable = form_type === 'form1' ? form1TempDb : form_type === 'form2' ? Object.assign(form1TempDb, form2TempDb) : "Form not found!!";

        if (xviFcFormTable === "Form not found!!") {
            return res.status(404).json({ status: false, message: "Form not found!!" });
        }
        let formKeys = form_type === 'form1' ? form1QuestionKeys : form_type === 'form2' ? form1QuestionKeys.concat(form2QuestionKeys) : [];
        let allKeysDetails = form_type === 'form1' ? keyDetailsForm1 : form_type === 'form2' ? Object.assign(keyDetailsForm1, keyDetailsForm2) : {};

        for (let index = 0; index < formKeys.length; index++) {
            if (xviFcFormTable.hasOwnProperty(formKeys[index])) {
                let obj = xviFcFormTable[formKeys[index]];

                xviFcFormTable[formKeys[index]] = getColumnWiseData(allKeysDetails, formKeys[index], obj, xviFcFormTable.isDraft, "", role, currentFormStatus);
                xviFcFormTable['readonly'] = true;
            } else {
                xviFcFormTable[formKeys[index]] = getColumnWiseData(
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
        // delete temp.create;
        temp.save();

        return res.status(201).json({ status: true, message: "Form json created!", data: dataArray });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something went wrong!" });
    }
};

module.exports.getForm = async (req, res) => {
    let ulbId = req.query.ulb;
    let userForm = await Ulb.findOne({ _id: ObjectId(ulbId) }, { formType: 1 }).lean();

    if (userForm.formType == "form1") {
        try {
            let form1Data = await getForm1(ulbId, req.query.role, "");
            return res.status(200).json({ status: true, message: `Sucessfully fetched form 1!`, data: form1Data });
        }
        catch (error) {
            console.log("err", error);
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
    } else if (userForm.formType == "form2") {
        try {
            let form2Data = await getForm2(ulbId, req.query.role, "");
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

        if (existingSubmitData.length <= 0) {
            ulbData_form = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true });
            return res.status(200).json({ status: true, message: "Data successfully saved as draft!" });
        }
        else if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS') {
            // If tab sent is less that total tab - keep what is there in DB, add only sent tab.
            for (let formData of existingSubmitData[0].tab) {
                index = ulbData_form.tab.findIndex(x => x.tabKey === formData.tabKey);
                // Check each question.
                for (let eachObj of formData.data) {
                    quesIndex = ulbData_form.tab[index].data.findIndex((x) => x.key === eachObj.key);
                    if (quesIndex <= -1) {
                        ulbData_form.tab[index].data.push(eachObj);
                    }
                }
                // Check tab.
                if (index <= -1) {
                    ulbData_form.tab.push(formData);
                }
            }

            let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true });
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
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });
        let validateSubmitData = ulbData_form.formId === 16 ? ulbData_form.tab.length === 4 : (ulbData_form.formId === 17 ? ulbData_form.tab.length === 5 : false); // Get count of tabs received from frontend.

        if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS' && validateSubmitData) {
            // Check validation and update data from "saveAsDraftValue" to "value".

            let getFormData = ulbData_form.formId == 16 ? await getForm1(ulbId, roleName, ulbData_form) : ulbData_form.formId == 17 ? await getForm2(ulbId, roleName, ulbData_form) : "";
            // let validatedData = await checkValidations(ulbData_form, getFormData);

            if (getFormData.validationCounter > 0) {
                return res.status(400).json({ status: true, message: "Validation failed", data: getFormData });
            } else {
                ulbData_form.formStatus = 'SUBMITTED';

                let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form, { upsert: true });
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

async function getForm1(userId, roleName, submittedData) {
    let ulbId = userId;
    let role = roleName;
    let from1AnswerFromDb = submittedData ? submittedData : await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm1Tabs = await XviFcForm1Tabs.find().lean();

    xviFCForm1Tabs = xviFCForm1Tabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form1" });
    xviFCForm1Tabs.forEach((tab) => {
        tab.formType = "form1";
    });

    let xviFCForm1Table = form1TempDb;
    let currentFormStatus = from1AnswerFromDb && from1AnswerFromDb.formStatus ? from1AnswerFromDb.formStatus : '';

    for (let index = 0; index < form1QuestionKeys.length; index++) {
        if (xviFCForm1Table.hasOwnProperty(form1QuestionKeys[index])) {
            let obj = xviFCForm1Table[form1QuestionKeys[index]];
            xviFCForm1Table[form1QuestionKeys[index]] = getColumnWiseData(keyDetailsForm1, form1QuestionKeys[index], obj, xviFCForm1Table.isDraft, "", role, currentFormStatus);
            xviFCForm1Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;
        }
    }

    // Create a json structure - questions.
    let from1QuestionFromDb = await getModifiedTabsXvifcForm(xviFCForm1Tabs, xviFCForm1Table, "form1");
    let validationCounter = 0;

    if (from1AnswerFromDb) {
        for (let eachQuestionObj of from1QuestionFromDb) {
            let indexOfKey = from1AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);

            if (indexOfKey > -1) {
                if (from1AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from1AnswerFromDb.tab[indexOfKey].data) {

                        if (eachQuestionObj.key == "financialData") {
                            for (let eachObj of eachQuestionObj.data) {
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
                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file[0].name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file[0].url;


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
        // ulbName: ulbData.name,
        // stateId: stateId,
        // stateName: stateData.name,
        tabs: from1QuestionFromDb,
        validationCounter,
        financialYearTableHeader
    };

    return viewData;

}

async function getForm2(userId, roleName, submittedData) {

    let ulbId = userId;
    let role = roleName;
    let from2AnswerFromDb = submittedData ? submittedData : await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm2Tabs = await XviFcForm1Tabs.find().lean();
    xviFCForm2Tabs = xviFCForm2Tabs.filter((x) => { return x.formType == "form1_2" || x.formType == "form2" });
    xviFCForm2Tabs.forEach((tab) => {
        tab.formType = "form2";
    });
    let xviFCForm2Table = Object.assign(form1TempDb, form2TempDb);
    let currentFormStatus = from2AnswerFromDb && from2AnswerFromDb.formStatus ? from2AnswerFromDb.formStatus : '';
    let keyDetails = Object.assign(keyDetailsForm1, keyDetailsForm2);
    let mergedForm2QuestionKeys = form1QuestionKeys.concat(form2QuestionKeys);


    for (let index = 0; index < mergedForm2QuestionKeys.length; index++) {
        if (xviFCForm2Table.hasOwnProperty(mergedForm2QuestionKeys[index])) {
            let obj = xviFCForm2Table[mergedForm2QuestionKeys[index]];
            xviFCForm2Table[mergedForm2QuestionKeys[index]] = getColumnWiseData(keyDetails, mergedForm2QuestionKeys[index], obj, xviFCForm2Table.isDraft, "", role, currentFormStatus);
            xviFCForm2Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;
        }
    }
    // Create a json structure - questions.
    let from2QuestionFromDb = await getModifiedTabsXvifcForm(xviFCForm2Tabs, xviFCForm2Table, "form2");
    let validationCounter = 0;

    if (from2AnswerFromDb) {
        for (let eachQuestionObj of from2QuestionFromDb) {
            let indexOfKey = from2AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);

            if (indexOfKey > -1) {
                if (from2AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from2AnswerFromDb.tab[indexOfKey].data) {

                        if (eachQuestionObj.key == "financialData" || eachQuestionObj.key == "serviceLevelBenchmark") {
                            for (let eachObj of eachQuestionObj.data) {
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
                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file[0].name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file[0].url;


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
                                if (selectedData.key && eachObj.key && selectedData.key == eachObj.key) {
                                    eachObj.value = selectedData.saveAsDraftValue;

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
        // ulbName: ulbData.name,
        // stateId: stateId,
        // stateName: stateData.name,
        tabs: from2QuestionFromDb,
        validationCounter,
        financialYearTableHeader
    };

    return viewData;

};

const getColumnWiseData = (allKeys, key, obj, isDraft, dataSource = "", role, formStatus) => {
    switch (key) {
        case "nameOfUlb": {
            return {
                ...getInputKeysByType(allKeys["nameOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "nameOfState": {
            return {
                ...getInputKeysByType(allKeys["nameOfState"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pop2011": {
            return {
                ...getInputKeysByType(allKeys["pop2011"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "popApril2024": {
            return {
                ...getInputKeysByType(allKeys["popApril2024"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "areaOfUlb": {
            return {
                ...getInputKeysByType(allKeys["areaOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfElection": {
            return {
                ...getInputKeysByType(allKeys["yearOfElection"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "isElected": {
            return {
                ...getInputKeysByType(allKeys["isElected"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfConstitution": {
            return {
                ...getInputKeysByType(allKeys["yearOfConstitution"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfSlb": {
            return {
                ...getInputKeysByType(allKeys["yearOfSlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "sourceOfFd": {
            return {
                ...getInputKeysByType(allKeys["sourceOfFd"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pTax": {
            return {
                ...getInputKeysByType(allKeys["pTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherTax": {
            return {
                ...getInputKeysByType(allKeys["otherTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "taxRevenue": {
            return {
                ...getInputKeysByType(allKeys["taxRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "feeAndUserCharges": {
            return {
                ...getInputKeysByType(allKeys["feeAndUserCharges"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "interestIncome": {
            return {
                ...getInputKeysByType(allKeys["interestIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherIncome": {
            return {
                ...getInputKeysByType(allKeys["otherIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "rentalIncome": {
            return {
                ...getInputKeysByType(allKeys["rentalIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totOwnRevenue": {
            return {
                ...getInputKeysByType(allKeys["totOwnRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralSponsoredScheme": {
            return {
                ...getInputKeysByType(allKeys["centralSponsoredScheme"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "unionFinanceGrants": {
            return {
                ...getInputKeysByType(allKeys["unionFinanceGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralGrants": {
            return {
                ...getInputKeysByType(allKeys["centralGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "sfcGrants": {
            return {
                ...getInputKeysByType(allKeys["sfcGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grantsOtherThanSfc": {
            return {
                ...getInputKeysByType(allKeys["grantsOtherThanSfc"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grantsWithoutState": {
            return {
                ...getInputKeysByType(allKeys["grantsWithoutState"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherGrants": {
            return {
                ...getInputKeysByType(allKeys["otherGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalGrants": {
            return {
                ...getInputKeysByType(allKeys["totalGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "assignedRevAndCom": {
            return {
                ...getInputKeysByType(allKeys["assignedRevAndCom"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherRevenue": {
            return {
                ...getInputKeysByType(allKeys["otherRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalRevenue": {
            return {
                ...getInputKeysByType(allKeys["totalRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "salaries": {
            return {
                ...getInputKeysByType(allKeys["salaries"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pension": {
            return {
                ...getInputKeysByType(allKeys["pension"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherExp": {
            return {
                ...getInputKeysByType(allKeys["otherExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "establishmentExp": {
            return {
                ...getInputKeysByType(allKeys["establishmentExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "oAndmExp": {
            return {
                ...getInputKeysByType(allKeys["oAndmExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "interestAndfinacialChar": {
            return {
                ...getInputKeysByType(allKeys["interestAndfinacialChar"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherRevenueExp": {
            return {
                ...getInputKeysByType(allKeys["otherRevenueExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "adExp": {
            return {
                ...getInputKeysByType(allKeys["adExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalRevenueExp": {
            return {
                ...getInputKeysByType(allKeys["totalRevenueExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "capExp": {
            return {
                ...getInputKeysByType(allKeys["capExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalExp": {
            return {
                ...getInputKeysByType(allKeys["totalExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralStateBorrow": {
            return {
                ...getInputKeysByType(allKeys["centralStateBorrow"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "bonds": {
            return {
                ...getInputKeysByType(allKeys["bonds"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "bankAndFinancial": {
            return {
                ...getInputKeysByType(allKeys["bankAndFinancial"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherBorrowing": {
            return {
                ...getInputKeysByType(allKeys["otherBorrowing"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grossBorrowing": {
            return {
                ...getInputKeysByType(allKeys["grossBorrowing"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "receivablePTax": {
            return {
                ...getInputKeysByType(allKeys["receivablePTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "receivableFee": {
            return {
                ...getInputKeysByType(allKeys["receivableFee"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherReceivable": {
            return {
                ...getInputKeysByType(allKeys["otherReceivable"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalReceivable": {
            return {
                ...getInputKeysByType(allKeys["totalReceivable"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalCashAndBankBal": {
            return {
                ...getInputKeysByType(allKeys["totalCashAndBankBal"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accSystem": {
            return {
                ...getInputKeysByType(allKeys["accSystem"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accProvision": {
            return {
                ...getInputKeysByType(allKeys["accProvision"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accInCashBasis": {
            return {
                ...getInputKeysByType(allKeys["accInCashBasis"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "fsTransactionRecord": {
            return {
                ...getInputKeysByType(allKeys["fsTransactionRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "fsPreparedBy": {
            return {
                ...getInputKeysByType(allKeys["fsPreparedBy"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "revReceiptRecord": {
            return {
                ...getInputKeysByType(allKeys["revReceiptRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "expRecord": {
            return {
                ...getInputKeysByType(allKeys["expRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accSoftware": {
            return {
                ...getInputKeysByType(allKeys["accSoftware"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "onlineAccSysIntegrate": {
            return {
                ...getInputKeysByType(allKeys["onlineAccSysIntegrate"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "muniAudit": {
            return {
                ...getInputKeysByType(allKeys["muniAudit"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totSanction": {
            return {
                ...getInputKeysByType(allKeys["totSanction"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totVacancy": {
            return {
                ...getInputKeysByType(allKeys["totVacancy"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accPosition": {
            return {
                ...getInputKeysByType(allKeys["accPosition"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "auditedAnnualFySt": {
            return {
                ...getInputKeysByType(allKeys["auditedAnnualFySt"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfWs": {
            return {
                ...getInputKeysByType(allKeys["coverageOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "perCapitaOfWs": {
            return {
                ...getInputKeysByType(allKeys["perCapitaOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfMeteringWs": {
            return {
                ...getInputKeysByType(allKeys["extentOfMeteringWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfNonRevenueWs": {
            return {
                ...getInputKeysByType(allKeys["extentOfNonRevenueWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "continuityOfWs": {
            return {
                ...getInputKeysByType(allKeys["continuityOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerWs": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInRedressalCustomerWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "qualityOfWs": {
            return {
                ...getInputKeysByType(allKeys["qualityOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "costRecoveryInWs": {
            return {
                ...getInputKeysByType(allKeys["costRecoveryInWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionRelatedWs": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInCollectionRelatedWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfToiletsSew": {
            return {
                ...getInputKeysByType(allKeys["coverageOfToiletsSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfSewNet": {
            return {
                ...getInputKeysByType(allKeys["coverageOfSewNet"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "collectionEfficiencySew": {
            return {
                ...getInputKeysByType(allKeys["collectionEfficiencySew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "adequacyOfSew": {
            return {
                ...getInputKeysByType(allKeys["adequacyOfSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "qualityOfSew": {
            return {
                ...getInputKeysByType(allKeys["qualityOfSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfReuseSew": {
            return {
                ...getInputKeysByType(allKeys["extentOfReuseSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSew": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInRedressalCustomerSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfCostWaterSew": {
            return {
                ...getInputKeysByType(allKeys["extentOfCostWaterSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSew": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInCollectionSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "householdLevelCoverageLevelSwm": {
            return {
                ...getInputKeysByType(allKeys["householdLevelCoverageLevelSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyOfCollectionSwm": {
            return {
                ...getInputKeysByType(allKeys["efficiencyOfCollectionSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfSegregationSwm": {
            return {
                ...getInputKeysByType(allKeys["extentOfSegregationSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfMunicipalSwm": {
            return {
                ...getInputKeysByType(allKeys["extentOfMunicipalSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfScientificSolidSwm": {
            return {
                ...getInputKeysByType(allKeys["extentOfScientificSolidSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfCostInSwm": {
            return {
                ...getInputKeysByType(allKeys["extentOfCostInSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSwmUser": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInCollectionSwmUser"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSwm": {
            return {
                ...getInputKeysByType(allKeys["efficiencyInRedressalCustomerSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfStormDrainage": {
            return {
                ...getInputKeysByType(allKeys["coverageOfStormDrainage"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "incidenceOfWaterLogging": {
            return {
                ...getInputKeysByType(allKeys["incidenceOfWaterLogging"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        default:
        // code block
    }
};

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
            // else {
            //     tab.data = service.getDynamicObjects(tab.key);
            // }
            //     tab.feedback = await service.getFeedbackForTabs(
            //         conditionForFeedbacks,
            //         tab._id
            //     );
        }
        return modifiedTabs;
    } catch (err) {
        console.log("error in getModifiedTabsFiscalRanking ::: ", err.message);
    }
}

/**
 * Function to update the json with the pdf links - Already on Cityfinance.
 * Step 1: Check if data is available in "UlbLedger" collection - Get the years for which data is available.
 * Step 2: For those years find document (pdf) links in "DataCollectionForm" & "AnnualAccountData" collection.
 * Priority: AnnualAccountData (Audited) > AnnualAccountData (Unaudited) > Document from "DataCollectionForm" collection.
 */
async function getUploadDocLinks(ulbId, fileDataJson) {
    // Get years from UlbLedger.
    let yearsLedgerDataAvailable = await UlbLedger.distinct("financialYear", { $and: [{ "financialYear": { $in: financialYearTableHeader } }, { "ulb": ObjectId(ulbId) }] });

    // Get pdf links from "DataCollectionForm" collection.
    if (yearsLedgerDataAvailable.length > 0) {
        let alreadyOnCfPdfs = {};
        // for (let year of yearsLedgerDataAvailable) {

        //     let dynamicKey = 'documents.financial_year_' + year.replace("-", "_");
        //     let tempDyanamicKey = 'financial_year_' + year.replace("-", "_");
        //     //let availablePdfData = await DataCollectionForm.find({ [`${dynamicKey}`]: { '$exists': 1 }, "ulb": ObjectId(ulbId) }, { [`${dynamicKey}`]: 1 });

        //     if (
        //         availablePdfData[0] &&
        //         availablePdfData[0].documents[tempDyanamicKey].pdf.length > 0 &&
        //         availablePdfData[0].documents[tempDyanamicKey].pdf[0].url
        //     ) {
        //         let obj={}
        //         let temp = { "year": "", "collection": "dataCollectionForm", "availablePdfData": [] };
        //         obj.name=availablePdfData[0].documents[tempDyanamicKey].pdf[0].name
        //         obj.url=availablePdfData[0].documents[tempDyanamicKey].pdf[0].url
        //         obj.type=''
        //         obj.label=''
        //         temp.availablePdfData.push(obj);
        //         temp.year = year;
        //         alreadyOnCfPdfs[year] = temp;
        //     }
        // }

        // Get pdf links from "AnnualAccountDatas" collection.
        let availablePdfData_aa = await AnnualAccountData.find({ "ulb": ObjectId(ulbId) });
        for (let echObj of availablePdfData_aa) {
            let tempObj = {
                "year": "", "collection": "annualAccounts", "type": "", "availablePdfData": []
            };
            let obj = {}

            if (yearsLedgerDataAvailable.indexOf(findYearById(echObj.audited.year)) > -1 && echObj.audited.provisional_data.bal_sheet.pdf.url) {

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
                tempObj.year = findYearById(echObj.audited.year);
                tempObj.type = "audited";
                alreadyOnCfPdfs[tempObj.year] = tempObj;
                tempObj = {
                    "year": "", "collection": "annualAccounts", "type": "", "availablePdfData": []
                };
                obj = {};
            };

            if (yearsLedgerDataAvailable.indexOf(findYearById(echObj.unAudited.year)) > -1 && echObj.unAudited.provisional_data.bal_sheet.pdf.url) {
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
                tempObj.year = findYearById(echObj.unAudited.year);
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
    }
    return fileDataJson;

}

// Pass mongoDB year ID and get year.
async function findYearById(mongoObjId) {
    let years = await Year.find().lean();

    for (let yearObj of years) {
        if (yearObj._id == mongoObjId) {
            return yearObj.year;
        }
    }
    return null; // ID not found
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
        "otherGrantsWithoutState",
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
            "formFieldType": "section",
            "label": "I. Accounting Systems and Processes",
            "data": []
        },
        {
            "key": 'staffing',
            "section": 'accordion',
            "formFieldType": "section",
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
            "label": "IV. STROM WATER DRAINAGE"
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