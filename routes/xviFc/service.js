const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const UlbLedger = require("../../models/UlbLedger");
// const DataCollectionForm = require("../../models/DataCollectionForm");
const AnnualAccountData = require("../../models/AnnualAccounts");
const XviFcForm1Tabs = require("../../models/XviFcForm1Tab");
const FormsJson = require("../../models/FormsJson");
const XviFcForm1DataCollection = require("../../models/XviFcFormDataCollection");
const Year = require("../../models/Year");

const { financialYearTableHeader, priorTabsForXviFcForm, form1QuestionKeys, form2QuestionKeys, slbKeys, form1TempDb, form2TempDb, getInputKeysByType } = require("./form_json");
const { tabsUpdationService, keyDetailsForm1, keyDetailsForm2, getFromWiseKeyDetails } = require("../../util/xvifc_form")

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
        // ulbData_form.submittedAt = new Date();
        // ulbData_form.submittedBy = userForm.ulbId;
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
        else if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS') {
            // If tab sent is less that total tab - keep what is there in DB, add only sent tab.
            for (let formData of existingSubmitData[0].tab) {
                index = ulbData_form.tab.findIndex(x => x.tabKey === formData.tabKey);
                // Check each question.
                for (let eachObj of formData.data) {
                    if (index > -1) {
                        quesIndex = ulbData_form.tab[index].data.findIndex((x) => x.key === eachObj.key);
                        if (quesIndex <= -1) {
                            ulbData_form.tab[index].data.push(eachObj);
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
            // let validatedData = await checkValidations(ulbData_form, getFormData);

            if (getFormData.validationCounter > 0) {
                return res.status(400).json({ status: true, message: "Validation failed", data: getFormData });
            } else {
                ulbData_form.formStatus = 'SUBMITTED';
                ulbData_form.tracker = []
                ulbData_form.tracker.push({ eventName: "SUBMITTED", eventDate: new Date(), submittedBy: ulbId });
                ulbData_form.submittedAt = new Date();
                ulbData_form.submittedBy = userForm.ulbId;
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
            xviFCForm1Table[form1QuestionKeys[index]].readonly =  xviFCForm1Table[form1QuestionKeys[index]].autosumValidation == 'sum' ? true : currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED' ? false : true
            xviFCForm1Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;

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
                    //index = frontendYear_Fd ? financialYearTableHeader.indexOf(frontendYear_Fd) : frontendYear_Slb ? financialYearTableHeader.indexOf(frontendYear_Slb) + 1 : -1;
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
                xviFCForm1Table[form1QuestionKeys[index]].year = yearData
            }
        }
    }





    // Create a json structure - questions.
    let from1QuestionFromDb = await getModifiedTabsXvifcForm(xviFCForm1Tabs, xviFCForm1Table, "form1");
    let validationCounter = 0;

    from1QuestionFromDb[0].data[0].value = ulbData.name;
    from1QuestionFromDb[0].data[1].value = stateData.name;

    if (from1AnswerFromDb) {
        for (let eachQuestionObj of from1QuestionFromDb) {
            let indexOfKey = from1AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);

            if (indexOfKey > -1) {
                if (from1AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from1AnswerFromDb.tab[indexOfKey].data) {

                        if (eachQuestionObj.key == "financialData") {
                            for (let eachObj of eachQuestionObj.data) {

                                // console.log(achObj.sumOf2)
                                // console.log(eachObj.autoSumValidation2)

                                // if (eachObj.sumOf2 && eachObj.autoSumValidation2) {
                                //     console.log("inside")
                                //     delete eachObj.sumOf2;
                                //     delete eachObj.autoSumValidation2;
                                // }

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

                                // console.log("selectedData.key", selectedData);
                                // console.log("yearDataIndex", yearDataIndex);

                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {

                                    // console.log("selectedData", selectedData.file);

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
    // let xviFCForm2Table = Object.assign(form1TempDb, form2TempDb);
    // let xviFCForm2Table = { ...form1TempDb, ...form2TempDb };
    let xviFCForm2Table = form2TempDb;
    let currentFormStatus = from2AnswerFromDb && from2AnswerFromDb.formStatus ? from2AnswerFromDb.formStatus : 'NOT_STARTED';


    // Get index of year of constitution from demographic data.
    if (from2AnswerFromDb) {
        demographicTabIndex = from2AnswerFromDb.tab.findIndex((x) => { return x.tabKey == "demographicData" });
        IndexOfYearOfConstitution = from2AnswerFromDb.tab[demographicTabIndex].data.findIndex((x) => { return x.key == "yearOfConstitution" });
        frontendYear_Fd = from2AnswerFromDb.tab[demographicTabIndex].data[IndexOfYearOfConstitution].saveAsDraftValue;
        // Get index of year of slb.
        IndexOfYearOfSlb = from2AnswerFromDb.tab[demographicTabIndex].data.findIndex((x) => { return x.key == "yearOfSlb" });
        frontendYear_Slb = from2AnswerFromDb.tab[demographicTabIndex].data[IndexOfYearOfSlb].saveAsDraftValue;
    }

    // let keyDetails = Object.assign(keyDetailsForm1, keyDetailsForm2);
    // let keyDetails = { ...keyDetailsForm1, ...keyDetailsForm2 };
    let keyDetails = keyDetailsForm2;
    keyDetails["formType"] = "form2";

    let mergedForm2QuestionKeys = form1QuestionKeys.concat(form2QuestionKeys);

    for (let index = 0; index < mergedForm2QuestionKeys.length; index++) {
        if (xviFCForm2Table.hasOwnProperty(mergedForm2QuestionKeys[index])) {
            let obj = xviFCForm2Table[mergedForm2QuestionKeys[index]];
            xviFCForm2Table[mergedForm2QuestionKeys[index]] = await getColumnWiseData(keyDetails, mergedForm2QuestionKeys[index], obj, xviFCForm2Table.isDraft, "", role, currentFormStatus, frontendYear_Fd, frontendYear_Slb);
            xviFCForm2Table[mergedForm2QuestionKeys[index]].readonly =  xviFCForm2Table[mergedForm2QuestionKeys[index]].autosumValidation == 'sum' ? true : currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED' ? false : true
            xviFCForm2Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;

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
    //console.log(xviFCForm2Table['sourceOfFd'])
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

                                // if (eachObj.sumOf2 && eachObj.autoSumValidation2) {
                                //     eachObj.sumOf = eachObj.sumOf2;
                                //     eachObj.autoSumValidation = eachObj.autoSumValidation2;
                                //     delete eachObj.sumOf2;
                                //     delete eachObj.autoSumValidation2;
                                // }


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
                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file.name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file.url;


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
                // rejectReason:"",
            };
        }
        case "popApril2024": {
            let isReadOnly = getReadOnly(formStatus, allKeys["popApril2024"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["popApril2024"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
                // rejectReason:"",
            };
        }
        case "areaOfUlb": {
            let isReadOnly = getReadOnly(formStatus, allKeys["areaOfUlb"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["areaOfUlb"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
                // rejectReason:"",
            };
        }
        case "yearOfElection": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfElection"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfElection"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
                // rejectReason:"",
            };
        }
        case "isElected": {
            let isReadOnly = getReadOnly(formStatus, allKeys["isElected"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["isElected"], isReadOnly, dataSource, allKeys["formType"]),
                ...obj,
                // rejectReason:"",
            };
        }
        case "yearOfConstitution": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfConstitution"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfConstitution"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "yearOfSlb": {
            let isReadOnly = getReadOnly(formStatus, allKeys["yearOfSlb"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["yearOfSlb"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd, frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "sourceOfFd": {
            let isReadOnly = getReadOnly(formStatus, allKeys["sourceOfFd"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["sourceOfFd"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "pTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "noOfRegiProperty": {
            let isReadOnly = getReadOnly(formStatus, allKeys["noOfRegiProperty"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["noOfRegiProperty"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "taxRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["taxRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["taxRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "feeAndUserCharges": {
            let isReadOnly = getReadOnly(formStatus, allKeys["feeAndUserCharges"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["feeAndUserCharges"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "interestIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["interestIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["interestIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "rentalIncome": {
            let isReadOnly = getReadOnly(formStatus, allKeys["rentalIncome"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["rentalIncome"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totOwnRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totOwnRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totOwnRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "centralSponsoredScheme": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralSponsoredScheme"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralSponsoredScheme"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "unionFinanceGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["unionFinanceGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["unionFinanceGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "centralGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "sfcGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["sfcGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["sfcGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "grantsOtherThanSfc": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grantsOtherThanSfc"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grantsOtherThanSfc"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "grantsWithoutState": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grantsWithoutState"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grantsWithoutState"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalGrants": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalGrants"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalGrants"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "assignedRevAndCom": {
            let isReadOnly = getReadOnly(formStatus, allKeys["assignedRevAndCom"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["assignedRevAndCom"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalRevenue": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalRevenue"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalRevenue"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason: "",
            };
        }
        case "salaries": {
            let isReadOnly = getReadOnly(formStatus, allKeys["salaries"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["salaries"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "pension": {
            let isReadOnly = getReadOnly(formStatus, allKeys["pension"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["pension"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "establishmentExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["establishmentExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["establishmentExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "oAndmExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["oAndmExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["oAndmExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "interestAndfinacialChar": {
            let isReadOnly = getReadOnly(formStatus, allKeys["interestAndfinacialChar"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["interestAndfinacialChar"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherRevenueExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherRevenueExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherRevenueExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "adExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["adExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["adExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalRevenueExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalRevenueExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalRevenueExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "capExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["capExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["capExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalExp": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalExp"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalExp"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "centralStateBorrow": {
            let isReadOnly = getReadOnly(formStatus, allKeys["centralStateBorrow"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["centralStateBorrow"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "bonds": {
            let isReadOnly = getReadOnly(formStatus, allKeys["bonds"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["bonds"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "bankAndFinancial": {
            let isReadOnly = getReadOnly(formStatus, allKeys["bankAndFinancial"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["bankAndFinancial"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherBorrowing": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherBorrowing"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherBorrowing"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "grossBorrowing": {
            let isReadOnly = getReadOnly(formStatus, allKeys["grossBorrowing"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["grossBorrowing"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "receivablePTax": {
            let isReadOnly = getReadOnly(formStatus, allKeys["receivablePTax"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["receivablePTax"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "receivableFee": {
            let isReadOnly = getReadOnly(formStatus, allKeys["receivableFee"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["receivableFee"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "otherReceivable": {
            let isReadOnly = getReadOnly(formStatus, allKeys["otherReceivable"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["otherReceivable"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalReceivable": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalReceivable"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalReceivable"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totalCashAndBankBal": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totalCashAndBankBal"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totalCashAndBankBal"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "accSystem": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accSystem"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accSystem"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "accProvision": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accProvision"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accProvision"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "accInCashBasis": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accInCashBasis"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accInCashBasis"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "fsTransactionRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["fsTransactionRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["fsTransactionRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "fsPreparedBy": {
            let isReadOnly = getReadOnly(formStatus, allKeys["fsPreparedBy"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["fsPreparedBy"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "revReceiptRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["revReceiptRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["revReceiptRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "expRecord": {
            let isReadOnly = getReadOnly(formStatus, allKeys["expRecord"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["expRecord"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "accSoftware": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accSoftware"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accSoftware"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "onlineAccSysIntegrate": {
            let isReadOnly = getReadOnly(formStatus, allKeys["onlineAccSysIntegrate"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["onlineAccSysIntegrate"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "muniAudit": {
            let isReadOnly = getReadOnly(formStatus, allKeys["muniAudit"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["muniAudit"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totSanction": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totSanction"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totSanction"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "totVacancy": {
            let isReadOnly = getReadOnly(formStatus, allKeys["totVacancy"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["totVacancy"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "accPosition": {
            let isReadOnly = getReadOnly(formStatus, allKeys["accPosition"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["accPosition"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "auditedAnnualFySt": {
            let isReadOnly = getReadOnly(formStatus, allKeys["auditedAnnualFySt"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["auditedAnnualFySt"], isReadOnly, dataSource, allKeys["formType"], frontendYear_Fd),
                ...obj,
                // rejectReason:"",
            };
        }
        case "coverageOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "perCapitaOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["perCapitaOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["perCapitaOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfMeteringWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfMeteringWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfMeteringWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfNonRevenueWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfNonRevenueWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfNonRevenueWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "continuityOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["continuityOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["continuityOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "qualityOfWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["qualityOfWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["qualityOfWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "costRecoveryInWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["costRecoveryInWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["costRecoveryInWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionRelatedWs": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionRelatedWs"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionRelatedWs"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "coverageOfToiletsSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfToiletsSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfToiletsSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "coverageOfSewNet": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfSewNet"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfSewNet"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "collectionEfficiencySew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["collectionEfficiencySew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["collectionEfficiencySew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "adequacyOfSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["adequacyOfSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["adequacyOfSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "qualityOfSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["qualityOfSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["qualityOfSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfReuseSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfReuseSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfReuseSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfCostWaterSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfCostWaterSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfCostWaterSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSew": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionSew"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionSew"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "householdLevelCoverageLevelSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["householdLevelCoverageLevelSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["householdLevelCoverageLevelSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyOfCollectionSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyOfCollectionSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyOfCollectionSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfSegregationSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfSegregationSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfSegregationSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfMunicipalSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfMunicipalSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfMunicipalSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfScientificSolidSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfScientificSolidSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfScientificSolidSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "extentOfCostInSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["extentOfCostInSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["extentOfCostInSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSwmUser": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInCollectionSwmUser"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInCollectionSwmUser"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSwm": {
            let isReadOnly = getReadOnly(formStatus, allKeys["efficiencyInRedressalCustomerSwm"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["efficiencyInRedressalCustomerSwm"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "coverageOfStormDrainage": {
            let isReadOnly = getReadOnly(formStatus, allKeys["coverageOfStormDrainage"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["coverageOfStormDrainage"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
            };
        }
        case "incidenceOfWaterLogging": {
            let isReadOnly = getReadOnly(formStatus, allKeys["incidenceOfWaterLogging"].autoSumValidation);
            return {
                ...await getInputKeysByType(allKeys["incidenceOfWaterLogging"], isReadOnly, dataSource, allKeys["formType"], '', frontendYear_Slb),
                ...obj,
                // rejectReason:"",
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
    return autosumValidation == 'sum' ? true : formStatus == 'IN_PROGRESS' || formStatus == 'NOT_STARTED' ? false : true
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
            if (yearsLedgerDataAvailable.indexOf(await findYearById(echObj.audited.year)) > -1 && echObj.audited.provisional_data.bal_sheet.pdf.url) {
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

            if (yearsLedgerDataAvailable.indexOf(await findYearById(echObj.unAudited.year)) > -1 && echObj.unAudited.provisional_data.bal_sheet.pdf.url) {
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

    // let years = await Year.find().lean();



    // for (let yearObj of years) {
    //     console.log("yearObj",yearObj);
    //     if (yearObj._id == mongoObjId) {
    //         console.log("yearObj._id>>>>",yearObj._id)
    //         return yearObj.year;
    //     }
    // }
    // return null; // ID not found
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

// ------ Review Table + Dashboard. ------
module.exports.formList = async (req, res) => {

    let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 2;

    let stateId = req.query.state;
    let listOfUlbsFromState = await XviFcForm1DataCollection.find({ state: ObjectId(stateId) }).skip(skip).limit(limit).lean();
    //let listOfUlbsFromState = await XviFcForm1DataCollection.find({ $and: [{ "state": ObjectId(stateId) }, filter] }).sort(sort).skip(skip).limit(limit).lean();
    let totalUlbForm = await XviFcForm1DataCollection.find({ state: stateId }).count().lean();

    if (listOfUlbsFromState) {
        let reviewTableData = [];

        for (let eachUlbForm of listOfUlbsFromState) {
            let obj = {};
            let allTabDataPercent = [];
            // let ulbData = await XviFcForm1DataCollection.find({ ulb: ObjectId(eachUlbForm.ulb) }, { tab: 1 }).lean();
            let ulbData = eachUlbForm.tab;

            // Get Data submission %.
            let dataSubmissionPercent = 0;
            for (let eachTab of ulbData) {
                if (eachTab.data.length > 0) {
                    let eachTabPercent = await getSubmissionPercent(eachTab, eachUlbForm.formId);
                    dataSubmissionPercent += eachTabPercent.submissionPercent;
                    allTabDataPercent.push(eachTabPercent);
                }
            }

            obj["stateName"] = eachUlbForm.stateName;
            obj["ulbName"] = eachUlbForm.ulbName;
            obj["censusCode"] = eachUlbForm.censusCode ? eachUlbForm.censusCode : eachUlbForm.sbCode;
            obj["ulbCategory"] = eachUlbForm.formId == 16 ? "Category 1" : eachUlbForm.formId == 17 ? "Category 2" : "";
            obj["formStatus"] = eachUlbForm.formStatus;
            obj["dataSubmitted"] = Number((dataSubmissionPercent / allTabDataPercent.length).toFixed(2));
            obj["action"] = (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_XVIFC' && user.role == 'XVIFC') || (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_STATE' && user.role == 'XVIFC_STATE') ? 'Review' : 'View';

            reviewTableData.push(obj);
        }

        return res.status(200).json({ status: true, message: "", data: reviewTableData, totalForms: totalUlbForm });
    } else {
        return res.status(404).json({ status: false, message: "Soemthing went wrong" });
    }

};

let denominator = {
    demographicData: 8,
    uploadDoc: 0,
    financialData: 0,
    accountPractice: 13,
    serviceLevelBenchmark: 0
};

async function getSubmissionPercent(eachTabData, formId) {

    let numeratorSaveAsDraft = 0;
    let baseYear = Number(financialYearTableHeader[0].split("-")[1]);

    for (eachAns of eachTabData.data) {

        if (eachTabData.tabKey == 'demographicData') {
            if (eachAns.key == "yearOfConstitution") {
                let temp = baseYear - Number(eachAns.saveAsDraftValue.split("-")[1]);
                denominator["financialData"] = formId == 16 ? temp * 20 : temp * 42;
                denominator["uploadDoc"] = formId == 16 ? temp * 1 : temp * 1;
            }
            if (eachAns.key == "yearOfSlb") {
                denominator["serviceLevelBenchmark"] = (baseYear - Number(eachAns.saveAsDraftValue.split("-")[1]) + 1) * 28;
            }
            denominator.demographicData = formId == 16 ? 8 : 9;
        }

        if (eachTabData.tabKey == 'uploadDoc') {
            if (eachAns.file.url) numeratorSaveAsDraft += 1;
        } else {
            if (eachAns.saveAsDraftValue) numeratorSaveAsDraft += 1;
        }
    }

    return {
        key: eachTabData.tabKey,
        numerator: numeratorSaveAsDraft,
        denominator: denominator[eachTabData.tabKey],
        submissionPercent: Number(((numeratorSaveAsDraft / denominator[eachTabData.tabKey]) * 100).toFixed(2)),
    };
}

module.exports.searchByUlb = async (req, res) => {
    let stateId = req.query.state;

    const { matchingWord, onlyUlb } = req.body;
    if (!matchingWord)
        return res.status(400).json({ message: "ULB not found!" });
    let query = {
        $and: [{ ulbName: { $regex: `${matchingWord}`, $options: 'im' } }, { "state": ObjectId(stateId) }]
    };

    let user = req.decoded,
        // filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 2;

    console.log("sort", sort);
    // let listOfUlbsFromState = await XviFcForm1DataCollection.find({ state: stateId }).sort(sort).skip(skip).limit(limit).lean();
    let listOfUlbsFromState = await XviFcForm1DataCollection.find(query).sort(sort).skip(skip).limit(limit).lean();
    let totalUlbForm = await XviFcForm1DataCollection.find({ state: stateId }).count().lean();

    if (listOfUlbsFromState) {
        let reviewTableData = [];

        for (let eachUlbForm of listOfUlbsFromState) {
            let obj = {};
            let allTabDataPercent = [];
            // let ulbData = await XviFcForm1DataCollection.find({ ulb: ObjectId(eachUlbForm.ulb) }, { tab: 1 }).lean();
            let ulbData = eachUlbForm.tab;

            // Get Data submission %.
            let dataSubmissionPercent = 0;
            for (let eachTab of ulbData) {
                if (eachTab.data.length > 0) {
                    let eachTabPercent = await getSubmissionPercent(eachTab, eachUlbForm.formId);
                    dataSubmissionPercent += eachTabPercent.submissionPercent;
                    allTabDataPercent.push(eachTabPercent);
                }
            }

            obj["stateName"] = eachUlbForm.stateName;
            obj["ulbName"] = eachUlbForm.ulbName;
            obj["censusCode"] = eachUlbForm.censusCode ? eachUlbForm.censusCode : eachUlbForm.sbCode;
            obj["ulbCategory"] = eachUlbForm.formId == 16 ? "Category 1" : eachUlbForm.formId == 17 ? "Category 2" : "";
            obj["formStatus"] = eachUlbForm.formStatus;
            obj["dataSubmitted"] = Number((dataSubmissionPercent / allTabDataPercent.length).toFixed(2));
            obj["action"] = (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_XVIFC' && user.role == 'XVIFC') || (eachUlbForm.formStatus == 'UNDER_REVIEW_BY_STATE' && user.role == 'XVIFC_STATE') ? 'Review' : 'View';

            reviewTableData.push(obj);
        }

        return res.status(200).json({ status: true, message: "", data: reviewTableData, totalForms: totalUlbForm });
    } else {
        return res.status(404).json({ status: false, message: "Soemthing went wrong" });
    }

};
