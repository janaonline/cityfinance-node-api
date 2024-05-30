const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const UlbLedger = require("../../models/UlbLedger");
const DataCollectionForm = require("../../models/DataCollectionForm");
const AnnualAccountData = require("../../models/AnnualAccounts");
const XviFcForm1Tabs = require("../../models/XviFcForm1Tab");
const FormsJson = require("../../models/FormsJson");
const XviFcForm1DataCollection = require("../../models/XviFcForm1DataCollection");
const { financialYearTableHeader, tempDb, keys, getInputKeysByType } = require("./form1_json");
const { financialYearTableHeaderForm2, tempDbForm2, keysForm2, getInputKeysByTypeForm2 } = require("./form2_json");
const { getFromForUlb } = require("./ulbsAccessForm");
const { yearsObj } = require("./xviFC_year");

let priorTabsForXviFcForm1 = {
    "demographicData": "s1",
    "financialData": "s2",
    "uploadDoc": "s3",
    "accountPractice": "s4",
};

let priorTabsForXviFcForm2 = {
    "demographicData": "s1",
    "financialData": "s2",
    "uploadDoc": "s3",
    "accountPractice": "s4",
    "serviceLevelBenchmark": "s5"
};

module.exports.createxviFcForm1Tabs = async (req, res) => {
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

module.exports.createxviFcForm1Json = async (req, res) => {
    try {
        let ulbId = req.query.ulb;
        let ulbData = await Ulb.findOne({ _id: ObjectId(ulbId) }, { name: 1, state: 1 });
        let stateId = ulbData.state;
        let stateData = await State.findOne({ _id: ObjectId(stateId) }, { name: 1 });

        let xviFCForm1Tabs = await XviFcForm1Tabs.find({ formType: "form1" }).lean();
        let xviFCForm1Table = tempDb;
        let role = "ULB";
        let currentFormStatus = "PENDING";

        for (let index = 0; index < keys.length; index++) {
            if (xviFCForm1Table.hasOwnProperty(keys[index])) {
                let obj = xviFCForm1Table[keys[index]];
                xviFCForm1Table[keys[index]] = getColumnWiseData(keys[index], obj, xviFCForm1Table.isDraft, "", role, currentFormStatus);
                xviFCForm1Table['readonly'] = true;

            } else {
                xviFCForm1Table[keys[index]] = getColumnWiseData(
                    keys[index],
                    {
                        value: "",
                        status: "PENDING",
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
        let modifiedTabs = await getModifiedTabsXvifcForm1(xviFCForm1Tabs, xviFCForm1Table);

        // Update the json with the pdf links - Already on Cityfinance.
        let fileDataJson = modifiedTabs[2].data.auditedAnnualFySt.year;
        modifiedTabs[2].data.auditedAnnualFySt.year = await getUploadDocLinks(ulbId, fileDataJson);

        // Add Primary keys to the keyDetails{}  - financialData.
        let financialData = modifiedTabs[1].data;
        modifiedTabs[1].data = await getUpdatedFinancialData_headers(financialData, Object.keys(financialData));

        // Add Primary keys to the keyDetails{} - accountingPractices.
        let accountingPractices = modifiedTabs[3].data;
        modifiedTabs[3].data = await getUpdatedAccountingPractices_headers(accountingPractices, Object.keys(accountingPractices));

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

        return res.status(200).json({ status: true, message: "DB successfully updated", data: dataArray });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something went wrong!" });
    }
};

module.exports.createxviFcForm2Json = async (req, res) => {
    try {

        let ulbId = req.query.ulb;
        let ulbData = await Ulb.findOne({ _id: ObjectId(ulbId) }, { name: 1, state: 1 });
        let stateId = ulbData.state;
        let stateData = await State.findOne({ _id: ObjectId(stateId) }, { name: 1 });

        let xviFCForm2Tabs = await XviFcForm1Tabs.find({ formType: "form2" }).lean();
        let xviFCForm2Table = tempDbForm2;
        let role = "ULB";
        let currentFormStatus = "PENDING";

        for (let index = 0; index < keysForm2.length; index++) {
            if (xviFCForm2Table.hasOwnProperty(keysForm2[index])) {
                let obj = xviFCForm2Table[keysForm2[index]];
                xviFCForm2Table[keysForm2[index]] = getColumnWiseDataForm2(keysForm2[index], obj, xviFCForm2Table.isDraft, "", role, currentFormStatus);
                xviFCForm2Table['readonly'] = true;
            } else {
                xviFCForm2Table[keysForm2[index]] = getColumnWiseDataForm2(
                    keys[index],
                    {
                        value: "",
                        status: "PENDING",
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
        let modifiedTabs = await getModifiedTabsXvifcForm2(xviFCForm2Tabs, xviFCForm2Table);

        // Update the json with the pdf links - Already on Cityfinance.
        let fileDataJson = modifiedTabs[2].data.auditedAnnualFySt.year;
        modifiedTabs[2].data.auditedAnnualFySt.year = await getUploadDocLinks(ulbId, fileDataJson);

        // Add Primary keys to the keyDetails{}  - financialData.
        let financialData = modifiedTabs[1].data;
        modifiedTabs[1].data = await getUpdatedFinancialData_headersForm2(financialData, Object.keys(financialData));

        // Add Primary keys to the keyDetails{} - accountingPractices.
        let accountingPractices = modifiedTabs[3].data;
        modifiedTabs[3].data = await getUpdatedAccountingPractices_headers(accountingPractices, Object.keys(accountingPractices));

        // Add Primary keys to the keyDetails{} - serviceLevelBenchmark.
        let serviceLevelBenchmark = modifiedTabs[4].data;
        modifiedTabs[4].data = await getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmark, Object.keys(serviceLevelBenchmark));

        let viewData = {
            ulb: "",
            ulbName: "",
            stateId: "",
            stateName: "",
            tabs: modifiedTabs,
            // financialYearTableHeaderForm2
            financialYearTableHeader
        };


        let dataArray = req.body;
        dataArray["data"] = viewData;
        let temp = await FormsJson.create(dataArray);
        delete temp.modifiedAt;
        // delete temp.create;
        temp.save();

        return res.status(200).json({ status: true, message: "DB successfully updated", data: dataArray });
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
            let form1Data = await getForm1(ulbId, req.query.role);
            return res.status(200).json({ status: true, message: "Success fetched data!", data: form1Data });
        }
        catch (error) {
            console.log("err", error);
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
    } else if (userForm.formType == "form2") {
        try {
            let form2Data = await getForm2(ulbId, req.query.role);
            return res.status(200).json({ status: true, message: "Success fetched data!", data: form2Data });
        }
        catch (error) {
            console.log("err", error);
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
    } else {
        return res.status(400).json({ status: false, message: "Form not found for the user." });
    }

};

async function getForm1(userId, roleName) {
    let ulbId = userId;
    let role = roleName;
    let from1AnswerFromDb = await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm1Tabs = await XviFcForm1Tabs.find({ formType: "form1" }).lean();
    let xviFCForm1Table = tempDb;

    let currentFormStatus = from1AnswerFromDb && from1AnswerFromDb.formStatus ? from1AnswerFromDb.formStatus : '';

    for (let index = 0; index < keys.length; index++) {
        if (xviFCForm1Table.hasOwnProperty(keys[index])) {
            let obj = xviFCForm1Table[keys[index]];
            xviFCForm1Table[keys[index]] = getColumnWiseData(keys[index], obj, xviFCForm1Table.isDraft, "", role, currentFormStatus);
            xviFCForm1Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;
        }
    }

    // Create a json structure - questions.
    let from1QuestionFromDb = await getModifiedTabsXvifcForm1(xviFCForm1Tabs, xviFCForm1Table);


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
                                }
                            }
                        }

                        if (eachQuestionObj.key == "uploadDoc") {
                            for (let eachObj of eachQuestionObj.data) {
                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file[0].name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file[0].url;
                                }
                            }
                        }

                        if (eachQuestionObj.key == "demographicData" || eachQuestionObj.key == 'accountPractice') {
                            if (selectedData.key && eachQuestionObj.data[selectedData.key] && selectedData.key == eachQuestionObj.data[selectedData.key].key) {
                                eachQuestionObj.data[selectedData.key].value = selectedData.saveAsDraftValue;
                            }
                        }

                    }
                }
            }
        }
    }

    // Add Primary keys to the keyDetails{}  - financialData.
    let financialData = from1QuestionFromDb[1].data;
    from1QuestionFromDb[1].data = await getUpdatedFinancialData_headers(financialData, Object.keys(financialData));

    // Update the json with the pdf links - Already on Cityfinance.
    let fileDataJson = from1QuestionFromDb[2].data[0].year;
    from1QuestionFromDb[2].data[0].year = await getUploadDocLinks(ulbId, fileDataJson);

    // Add Primary keys to the keyDetails{} - accountingPractices.
    let accountingPractices = from1QuestionFromDb[3].data;
    from1QuestionFromDb[3].data = await getUpdatedAccountingPractices_headers(accountingPractices, Object.keys(accountingPractices));

    let viewData = {
        ulb: ulbId,
        // ulbName: ulbData.name,
        // stateId: stateId,
        // stateName: stateData.name,
        tabs: from1QuestionFromDb,
        financialYearTableHeader
    };

    return viewData;

}

async function getForm2(userId, roleName) {

    let ulbId = userId;
    let role = roleName;
    let from2AnswerFromDb = await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
    let xviFCForm2Tabs = await XviFcForm1Tabs.find({ formType: "form2" }).lean();
    let xviFCForm2Table = tempDbForm2;

    let currentFormStatus = from2AnswerFromDb && from2AnswerFromDb.formStatus ? from2AnswerFromDb.formStatus : '';

    for (let index = 0; index < keysForm2.length; index++) {
        if (xviFCForm2Table.hasOwnProperty(keysForm2[index])) {
            let obj = xviFCForm2Table[keysForm2[index]];
            xviFCForm2Table[keysForm2[index]] = getColumnWiseDataForm2(keysForm2[index], obj, xviFCForm2Table.isDraft, "", role, currentFormStatus);
            xviFCForm2Table['readonly'] = role == 'ULB' && (currentFormStatus == 'IN_PROGRESS' || currentFormStatus == 'NOT_STARTED') ? false : true;
        }
    }

    // Create a json structure - questions.
    let from2QuestionFromDb = await getModifiedTabsXvifcForm2(xviFCForm2Tabs, xviFCForm2Table);

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
                                }
                            }
                        }

                        if (eachQuestionObj.key == "uploadDoc") {
                            for (let eachObj of eachQuestionObj.data) {
                                let yearDataIndex = eachObj.year.findIndex(x => x.key === selectedData.key)
                                if (yearDataIndex > -1 && selectedData.key == eachObj.year[yearDataIndex].key) {
                                    eachObj.year[yearDataIndex].file.name = selectedData.file[0].name;
                                    eachObj.year[yearDataIndex].file.url = selectedData.file[0].url;
                                }
                            }
                        }
                        if (eachQuestionObj.key == "demographicData" || eachQuestionObj.key == 'accountPractice') {
                            if (selectedData.key && eachQuestionObj.data[selectedData.key] && selectedData.key == eachQuestionObj.data[selectedData.key].key) {
                                eachQuestionObj.data[selectedData.key].value = selectedData.saveAsDraftValue;

                            }
                        }

                    }
                }
            }
        }
    }

    // Add Primary keys to the keyDetails{}  - financialData.
    let financialData = from2QuestionFromDb[1].data;
    from2QuestionFromDb[1].data = await getUpdatedFinancialData_headersForm2(financialData, Object.keys(financialData));

    // Update the json with the pdf links - Already on Cityfinance.
    let fileDataJson = from2QuestionFromDb[2].data[0].year;
    from2QuestionFromDb[2].data[0].year = await getUploadDocLinks(ulbId, fileDataJson);

    // Add Primary keys to the keyDetails{} - accountingPractices.
    let accountingPractices = from2QuestionFromDb[3].data;
    from2QuestionFromDb[3].data = await getUpdatedAccountingPractices_headers(accountingPractices, Object.keys(accountingPractices));

    // Add Primary keys to the keyDetails{} - serviceLevelBenchmark.
    let serviceLevelBenchmark = from2QuestionFromDb[4].data;
    from2QuestionFromDb[4].data = await getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmark, Object.keys(serviceLevelBenchmark));

    let viewData = {
        ulb: ulbId,
        // ulbName: ulbData.name,
        // stateId: stateId,
        // stateName: stateData.name,
        tabs: from2QuestionFromDb,
        // financialYearTableHeaderForm2
        financialYearTableHeader
    };

    return viewData;

};

module.exports.saveAsDraftForm1 = async (req, res) => {
    try {
        let ulbData_form1 = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });

        if (existingSubmitData.length <= 0) {
            ulbData_form1 = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
            return res.status(200).json({ status: true, message: "DB successfully updated", data: ulbData_form1 ? ulbData_form1 : "" });
        }
        else if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS') {
            // If tab sent is less that total tab 
            for (let form1Data of existingSubmitData[0].tab) {
                index = ulbData_form1.tab.findIndex(x => x.tabKey === form1Data.tabKey);
                if (index <= -1) {
                    ulbData_form1.tab.push(form1Data);
                }
            }

            let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
            return res.status(200).json({ status: true, message: "DB successfully updated", data: updatedData ? updatedData : "" });
        } else {
            return res.status(200).json({ status: true, message: "Form already submitted!" });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error });
    }
};

module.exports.submitForm1 = async (req, res) => {
    try {
        let ulbData_form1 = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });
        let validateSubmitData = ulbData_form1.formId === 16 ? ulbData_form1.tab.length === 4 : (ulbData_form1.formId === 17 ? ulbData_form1.tab.length === 5 : false); // Check if all the tabs data are sent from fortend.

        if (existingSubmitData.length > 0 && existingSubmitData[0].formStatus === 'IN_PROGRESS' && validateSubmitData) {
            // When form is submitted -> update the "value" from "saveAsDraftValue".
            for (let selectForm1Tab of ulbData_form1.tab) {
                for (let eachQuesInSelectedTab of selectForm1Tab.data) {
                    eachQuesInSelectedTab.value = eachQuesInSelectedTab.saveAsDraftValue;
                }
            }
            ulbData_form1.formStatus = 'SUBMITTED';

            let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
            return res.status(200).json({ status: true, message: "DB successfully updated", data: updatedData ? updatedData : "" });
        } else {
            let errorMessage = existingSubmitData.length > 0 && (existingSubmitData[0].formStatus !== 'IN_PROGRESS') ? "Form already submitted!" : "Invalid form data!";
            return res.status(200).json({ status: true, message: errorMessage });
        }
    } catch (error) {
        console.log(error);
        return res.status(400).json({ status: false, message: error });
    }
};

module.exports.saveAsDraftForm2 = async (req, res) => {
    try {
        let ulbData_form1 = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });

        if (existingSubmitData.length > 0) {
            for (let form1Data of existingSubmitData[0].tab) {
                index = ulbData_form1.tab.findIndex(x => x.tabKey === form1Data.tabKey);
                if (index <= -1) {
                    ulbData_form1.tab.push(form1Data);
                }
            }
        }
        let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
        return res.status(200).json({ status: true, message: "DB successfully updated", data: updatedData ? updatedData : "" });
    } catch (error) {
        return res.status(400).json({ status: false, message: error });
    }
};

module.exports.submitFrom2 = async (req, res) => {
    try {
        let ulbData_form1 = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let existingSubmitData = await XviFcForm1DataCollection.find({ ulb: ulbId });

        if (existingSubmitData.length > 0) {
            for (let form1Data of existingSubmitData[0].tab) {
                index = ulbData_form1.tab.findIndex(x => x.tabKey === form1Data.tabKey);
                if (index <= -1) {
                    ulbData_form1.tab.push(form1Data);
                }
            }
        }
        let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
        return res.status(200).json({ status: true, message: "DB successfully updated", data: updatedData ? updatedData : "" });
    } catch (error) {
        return res.status(400).json({ status: false, message: error });
    }
};

// Json structure.
let keyDetails = {
    nameOfUlb: {
        formFieldType: 'text',
        key: 'nameOfUlb',
        displayPriority: '1',
        label: 'Name of ULB',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    nameOfState: {
        formFieldType: 'text',
        key: 'nameOfState',
        displayPriority: '2',
        label: 'Name of State/Union Territory ',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    pop2011: {
        formFieldType: 'number',
        key: 'pop2011',
        displayPriority: '3',
        label: 'Population as per Census 2011',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0,
        max: 1000000,
        decimal: 0
    },
    popApril2024: {
        formFieldType: 'number',
        key: 'popApril2024',
        displayPriority: '4',
        label: 'Population as per 01 April 2024',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0,
        max: 1000000,
        decimal: 0
    },
    areaOfUlb: {
        formFieldType: 'number',
        key: 'areaOfUlb',
        displayPriority: '5',
        label: 'Area of the ULB (in Sq. Km.)',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0.1,
        max: 1000,
        decimal: 2
    },
    yearOfElection: {
        formFieldType: 'dropdown',
        options: ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
        showInputBox: "",
        key: 'yearOfElection',
        displayPriority: '6',
        label: "Which is the latest year when ULB's election was held?",
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    isElected: {
        formFieldType: 'radio',
        options: ['Yes', 'No'],
        key: 'isElected',
        displayPriority: '7',
        label: 'Is the elected body in place as on 01 April 2024?',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    yearOfConstitution: {
        formFieldType: 'dropdown',
        options: ["2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"],
        showInputBox: "",
        key: 'yearOfConstitution',
        displayPriority: '8',
        label: 'In which year was the ULB constituted?',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    sourceOfFd: {
        formFieldType: 'dropdown',
        options: ["Accounts Finalized & Audited", "Accounts Finalized but Not Audited", "Accounts not Finalized - Provisional data"],
        showInputBox: "",
        key: 'sourceOfFd',
        displayPriority: '*',
        label: 'Please select the source of Financial Data',
        info: '',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    taxRevenue: {
        formFieldType: 'number',
        key: 'taxRevenue',
        displayPriority: '1.1',
        label: 'Tax Revenue',
        info: 'Tax revenue shall include property, water, drainage, sewerage,professional, entertainment and advertisment tax and all other tax revenues.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    feeAndUserCharges: {
        formFieldType: 'number',
        key: 'feeAndUserCharges',
        displayPriority: '1.2',
        label: 'Fee and User Charges',
        info: 'Fees & user charges shall include Water supply, Fees & Sanitation / Sewerage, Garbage collection / Solid waste management, and all other fees & user charges.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    interestIncome: {
        formFieldType: 'number',
        key: 'interestIncome',
        displayPriority: '1.3',
        label: 'Interest Income',
        info: 'Interest income shall include sale from assets, land and other assets.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherIncome: {
        formFieldType: 'number',
        key: 'otherIncome',
        displayPriority: '1.4',
        label: 'Other Income',
        info: 'Other income shall include sale & hire charges, income from investments,interest earned, etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totOwnRevenue: {
        formFieldType: 'number',
        key: 'totOwnRevenue',
        displayPriority: '1',
        label: 'Total Own Revenue',
        info: 'Total own revenue shall include tax revenue, fees & user charges, interest income, and other income.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['1.1', '1.2', '1.3', '1.4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    centralGrants: {
        formFieldType: 'number',
        key: 'centralGrants',
        displayPriority: '2.1',
        label: "Grants for Centre's Initiatives ",
        info: "These grants shall include Union Finance Commission grants, Grants received for Centrally Sponsored Schemes (including state's matching share).",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherGrants: {
        formFieldType: 'number',
        key: 'otherGrants',
        displayPriority: '2.2',
        label: "Other Grants (including State's grants)",
        info: 'These grants shall include State Finance Commission grants, Other State ,Grants, Other grants etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalGrants: {
        formFieldType: 'number',
        key: 'totalGrants',
        displayPriority: '2',
        label: 'Total Grants',
        info: '',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['2.1', '2.2'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    assignedRevAndCom: {
        formFieldType: 'number',
        key: 'assignedRevAndCom',
        displayPriority: '3',
        label: 'Assigned Revenue and Compensation',
        info: 'Assigned Revenue includes share in the revenues of the state government ,allocated to the ULB. This includes Entertainment Tax, Duty on Transfer of Properties,etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherRevenue: {
        formFieldType: 'number',
        key: 'otherRevenue',
        displayPriority: '4',
        label: 'Other Revenue',
        info: 'Other Revenue shall include any other sources of revenue except own ,revenue, assigned revenue and grants',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalRevenue: {
        formFieldType: 'number',
        key: 'totalRevenue',
        displayPriority: '5',
        label: 'Total Revenues',
        info: 'Total Revenue is the sum of: (a) tax revenues, (b) non-tax revenues, (c) assigned (shared) revenue, (c) grants-in-aid, (d) other receipts, etc.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['1', '2', '3', '4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    establishmentExp: {
        formFieldType: 'number',
        key: 'establishmentExp',
        displayPriority: '6.1',
        label: 'Establishment Expenses',
        info: 'Expenses directly incurred on human resources of the ULB such as ,wages, and employee benefits such as retirement and pensions are called establishment expenses',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    oAndmExp: {
        formFieldType: 'number',
        key: 'oAndmExp',
        displayPriority: '6.2',
        label: 'Operation and Maintenance Expenditure',
        info: 'Operation and Maintenance Expenditure shall include O&M expense on water supply + O&M expense on sanitation / sewerage + All other O&M expenses.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    interestAndfinacialChar: {
        formFieldType: 'number',
        key: 'interestAndfinacialChar',
        displayPriority: '6.3',
        label: 'Interest and Finance Charges',
        info: 'Interest and Finance Charges shall include Interest on Loans from Central Govt, State Govt, International agencies, govt bodies, banks, bank charges and other financial expenses, etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherRevenueExp: {
        formFieldType: 'number',
        key: 'otherRevenueExp',
        displayPriority: '6.4',
        label: 'Other Revenue Expenditure',
        info: 'Other expenses shall include programme expenses, revenue grants, contributions & subsidies.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalRevenueExp: {
        formFieldType: 'number',
        key: 'totalRevenueExp',
        displayPriority: '6',
        label: 'Total Revenue Expenditure',
        info: 'Total expenditure shall include establishment expenses, operations & maintenance + interest & finance charges and other expenditure.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['6.1', '6.2', '6.3', '6.4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    capExp: {
        formFieldType: 'number',
        key: 'capExp',
        displayPriority: '7',
        label: 'Capital Expenditure',
        info: 'Capital Expenditure = (Closing Balance Gross Block + Closing Balance Capital Work in Progress) - (Opening Balance Gross Block + Opening Balance Capital Work in Progress)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalExp: {
        formFieldType: 'number',
        key: 'totalExp',
        displayPriority: '8',
        label: 'Total Expenditure',
        info: 'Total Expenditure = Revenue Expenditure + Capital Expenditure',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['6', '7'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    grossBorrowing: {
        formFieldType: 'number',
        key: 'grossBorrowing',
        displayPriority: '9',
        label: 'Gross Borrowings',
        info: 'Gross Borrowings = Sum of All Secured and Unsecured Loans',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    accSystem: {
        formFieldType: 'radio',
        options: [
            'Cash Basis of Accounting',
            'Accrual Basis of Accounting',
            'Modified Cash/ Accrual Accounting'
        ],
        showInputBox: '',
        key: 'accSystem',
        displayPriority: '1',
        label: 'What is the accounting system being followed by the ULB?',
        info: {
            "Cash basis of accounting": "Revenues and expenses are recognised/recorded when the related cash receipts or cash payments take place.",
            "Accrual basis of accounting": "Revenues and expneses are  recognised/recorded as they are earned or incurred (and not as money is received or paid) and recorded in the financial statements of the periods to which they relate.",
            "Modified": "Revenues are recognized/recorded when cash is received and expenses when they are paid, with the exception of capitalizing long-term assets and recording their related depreciation."
        },
        required: true,
        year: 1
    },
    accProvision: {
        formFieldType: 'radio',
        options: [
            'National Municipal Accounting Manual',
            'State-specific Municipal Accounting Manual',
            'Other (Please specify)'
        ],
        showInputBox: 'Other (Please specify)',
        key: 'accProvision',
        displayPriority: '2',
        label: 'What accounting provisions or framework does the ULB follow?',
        info: '',
        required: true,
        year: 1
    },
    accInCashBasis: {
        formFieldType: 'radio',
        options: ['Yes (Please specify)', 'No'],
        showInputBox: 'Yes (Please specify)',
        key: 'accInCashBasis',
        displayPriority: '3',
        label: 'Are there any accounts/books/registers maintained in cash basis?',
        info: 'Types of registers maintained: cash book, receipt register, register of bills for payment, collection register, deposit register, register of fixed assets etc.',
        required: true,
        year: 1
    },
    fsTransactionRecord: {
        formFieldType: 'radio',
        options: ['Yes', 'No'],
        showInputBox: '',
        key: 'fsTransactionRecord',
        displayPriority: '4',
        label: 'Does the ULB initially record transactions on a cash basis and subsequently prepare accrual accounts for consolidation of financial statements?',
        info: '',
        required: true,
        year: 1
    },
    fsPreparedBy: {
        formFieldType: 'radio',
        options: [
            'Internally (by Accounts Department)',
            'External Chartered Accountants',
            'Both'
        ],
        showInputBox: '',
        key: 'fsPreparedBy',
        displayPriority: '5',
        label: "Are the Financial Statements prepared internally by the ULB's accounting department, or are they compiled by an external Chartered Accountant?",
        info: '',
        required: true,
        year: 1
    },
    revReceiptRecord: {
        formFieldType: 'radio',
        options: [
            'Recorded when cash is received',
            'Recorded when they are accrued',
            'Both (Please specify which transactions are recognised in accrual basis)'
        ],
        showInputBox: 'Both (Please specify which transactions are recognised in accrual basis)',
        key: 'revReceiptRecord',
        displayPriority: '6',
        label: 'Is the revenue receipt recorded when the cash is received or when it is accrued/event occurs?',
        info: '',
        required: true,
        year: 1
    },
    expRecord: {
        formFieldType: 'radio',
        options: [
            'Recorded when cash is paid',
            'Recorded when they are accrued',
            'Both (Please specify which transactions are recognised in accrual basis)'
        ],
        showInputBox: 'Both (Please specify which transactions are recognised in accrual basis)',
        key: 'expRecord',
        displayPriority: '7',
        label: 'Is the expense recorded when it is paid or when it is incurred/event occurs?',
        info: '',
        required: true,
        year: 1
    },
    accSoftware: {
        formFieldType: 'radio',
        options: [
            'Centralized system provided by the State',
            'Standalone software',
            'Tally',
            'Other (Please specify)',
            'None'
        ],
        showInputBox: 'Other (Please specify)',
        key: 'accSoftware',
        displayPriority: '8',
        label: 'What accounting software is currently in use by the ULB?',
        info: '',
        required: true,
        year: 1
    },
    onlineAccSysIntegrate: {
        formFieldType: 'radio',
        options: [
            'Yes (Please specify which all system, e.g., tax collection, payroll, asset management)',
            'No'
        ],
        showInputBox: 'Yes (Please specify which all system, e.g., tax collection, payroll, asset management)',
        key: 'onlineAccSysIntegrate',
        displayPriority: '9',
        label: 'Does the online accounting system integrate seamlessly with other municipal systems?',
        info: '',
        required: true,
        year: 1
    },
    muniAudit: {
        formFieldType: 'radio',
        options: ['External Chartered Accountant (CA)', 'State Audit Department'],
        showInputBox: '',
        key: 'muniAudit',
        displayPriority: '10',
        label: 'Who does the municipal audit of financial statements ?',
        info: '',
        required: true,
        year: 1
    },
    totSanction: {
        formFieldType: 'number',
        key: 'totSanction',
        displayPriority: '11',
        label: 'What is the total sanctioned posts for finance & accounts related positions?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: '',
        logic: '',
    },
    totVacancy: {
        formFieldType: 'number',
        key: 'totVacancy',
        displayPriority: '12',
        label: 'What is the total vacancy across finance & accounts related positions?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: 'lessThan',
        logic: '11',
    },
    accPosition: {
        formFieldType: 'number',
        key: 'accPosition',
        displayPriority: '13',
        label: 'How many finance & accounts related positions currently are filled on contractual basis or outsourced?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: '',
        logic: '',
    },
    auditedAnnualFySt: {
        instruction: [
            { "instruction": "Annual Financial Statement should include: Income and Expenditure Statement, Balance Sheet, Schedules to IES and BS, Auditor's Report and if available Receipts & Payments Statement." },
            { "instruction": " All documents pertaining to a specific financial year should be combined into a single PDF before uploading & should not exceed 20 MB." },
            { "instruction": "Please use the following format for naming the documents to be uploaded: nameofthedocument_FY_ULB Name. || Example: Annual accounts_15-16_Jaipur municipal corporation" },
        ],
        formFieldType: 'file',
        key: 'auditedAnnualFySt',
        displayPriority: '',
        label: 'Copy of Audited Annual Financial Statements preferably in English',
        info: '',
        required: true,
        year: 8,
        max: 5,
        min: 0,
        decimal: 0
    },
}

let keyDetailsForm2 = {
    nameOfUlb: {
        formFieldType: 'text',
        key: 'nameOfUlb',
        displayPriority: '1',
        label: 'Name of ULB',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    nameOfState: {
        formFieldType: 'text',
        key: 'nameOfState',
        displayPriority: '2',
        label: 'Name of State/Union Territory ',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    pop2011: {
        formFieldType: 'number',
        key: 'pop2011',
        displayPriority: '3',
        label: 'Population as per Census 2011',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0,
        max: 1000000,
        decimal: 0
    },
    popApril2024: {
        formFieldType: 'number',
        key: 'popApril2024',
        displayPriority: '4',
        label: 'Population as per 01 April 2024',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0,
        max: 1000000,
        decimal: 0
    },
    areaOfUlb: {
        formFieldType: 'number',
        key: 'areaOfUlb',
        displayPriority: '5',
        label: 'Area of the ULB (in Sq. Km.)',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: 0.1,
        max: 1000,
        decimal: 2
    },
    yearOfElection: {
        formFieldType: 'dropdown',
        options: ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
        showInputBox: "",
        key: 'yearOfElection',
        displayPriority: '6',
        label: "Which is the latest year when ULB's election was held?",
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    isElected: {
        formFieldType: 'radio',
        options: ['Yes', 'No'],
        key: 'isElected',
        displayPriority: '7',
        label: 'Is the elected body in place as on 01 April 2024?',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    yearOfConstitution: {
        formFieldType: 'dropdown',
        options: ["2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"],
        showInputBox: "",
        key: 'yearOfConstitution',
        displayPriority: '8',
        label: 'In which year was the ULB constituted?',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    yearOfSlb: {
        formFieldType: 'dropdown',
        options: ["2015-16", "2016-17", "2017-18", "2018-19", "2019-20", "2020-21", "2021-22", "2022-23"],
        showInputBox: "",
        key: 'yearOfSlb',
        displayPriority: '9',
        label: 'From which year is Service Level Benchmark data available?',
        info: '',
        required: true,
        year: 1,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    sourceOfFd: {
        formFieldType: 'dropdown',
        options: ["Accounts Finalized & Audited", "Accounts Finalized but Not Audited", "Accounts not Finalized - Provisional data"],
        showInputBox: "",
        key: 'sourceOfFd',
        displayPriority: '*',
        label: 'Please select the source of Financial Data',
        info: '',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: "",
        max: "",
        decimal: ""
    },
    pTax: {
        formFieldType: 'number',
        key: 'pTax',
        displayPriority: '1.1.1',
        label: 'Property Tax',
        info: 'Property tax shall include only proprty tax levied on residential and commercial properties',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherTax: {
        formFieldType: 'number',
        key: 'otherTax',
        displayPriority: '1.1.2',
        label: 'Other Tax',
        info: 'Other Tax shall include any tax other than property tax levied by the ULB',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    taxRevenue: {
        formFieldType: 'number',
        key: 'taxRevenue',
        displayPriority: '1.1',
        label: 'Tax Revenue',
        info: 'Tax revenue shall include property, water, drainage, sewerage,professional, entertainment and advertisment tax and all other tax revenues.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['1.1.1', '1.1.2'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    feeAndUserCharges: {
        formFieldType: 'number',
        key: 'feeAndUserCharges',
        displayPriority: '1.2',
        label: 'Fee and User Charges',
        info: 'Fees & user charges shall include Water supply, Fees & Sanitation / Sewerage, Garbage collection / Solid waste management, and all other fees & user charges.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    interestIncome: {
        formFieldType: 'number',
        key: 'interestIncome',
        displayPriority: '1.3',
        label: 'Interest Income',
        info: 'Interest income shall include sale from assets, land and other assets.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherIncome: {
        formFieldType: 'number',
        key: 'otherIncome',
        displayPriority: '1.4',
        label: 'Other Income',
        info: 'Other income shall include sale & hire charges, income from investments,interest earned, etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    rentalIncome: {
        formFieldType: 'number',
        key: 'rentalIncome',
        displayPriority: '1.5',
        label: 'Rental Income from Municipal Properties',
        info: 'Rental Income shall include rental incomes earned out of shopping complexes, markets, office buildings, etc',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totOwnRevenue: {
        formFieldType: 'number',
        key: 'totOwnRevenue',
        displayPriority: '1',
        label: 'Total Own Revenue',
        info: 'Total own revenue shall include tax revenue, fees & user charges, interest income, and other income.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['1.1', '1.2', '1.3', '1.4', '1.5'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    centralSponsoredScheme: {
        formFieldType: 'number',
        key: 'centralSponsoredScheme',
        displayPriority: '2.1.1',
        label: "Centrally Sponsored Schemes (Total Centre and State Share)",
        info: "Centrally Sponsored Scheme shall include  Grants received for Centrally Sponsored Schemes (including state's matching share)",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    unionFinanceGrants: {
        formFieldType: 'number',
        key: 'unionFinanceGrants',
        displayPriority: '2.1.2',
        label: "Union Finance Commission Grants",
        info: "Union Finance Commission Grants shall include Union Finance Commission grants",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    centralGrants: {
        formFieldType: 'number',
        key: 'centralGrants',
        displayPriority: '2.1',
        label: "Grants for Centre's Initiatives ",
        info: "Grants for Centre's Initiatives is the sum of all Central Govt. grants such as Union Finance Commission grants, Grants received for Centrally Sponsored Schemes (including state's matching share)",
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['2.1.1', '2.1.2'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    sfcGrants: {
        formFieldType: 'number',
        key: 'sfcGrants',
        displayPriority: '2.2.1',
        label: "State Finance Commission Devolution and Grants",
        info: "State Finance Commission Devolution and Grants shall include State Finance Commission grants",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    grantsOtherThanSfc: {
        formFieldType: 'number',
        key: 'grantsOtherThanSfc',
        displayPriority: '2.2.2',
        label: "Grants from State (other than SFC)",
        info: "Grants from State shall include  Other State Grants (excluding State Finance Commission grants)",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    grantsWithoutState: {
        formFieldType: 'number',
        key: 'grantsWithoutState',
        displayPriority: '2.2.3',
        label: "Other grants",
        info: "Other Grants shall include any other grants received by the ULB",
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherGrants: {
        formFieldType: 'number',
        key: 'otherGrants',
        displayPriority: '2.2',
        label: "Other Grants (including State's grants)",
        info: "Other Grants (including State's grants) is the sum of State Finance Commission grants, Other State Grants, Other grants etc.",
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['2.2.1', '2.2.2', '2.2.3'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalGrants: {
        formFieldType: 'number',
        key: 'totalGrants',
        displayPriority: '2',
        label: 'Total Grants',
        info: '',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['2.1', '2.2'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    assignedRevAndCom: {
        formFieldType: 'number',
        key: 'assignedRevAndCom',
        displayPriority: '3',
        label: 'Assigned Revenue and Compensation',
        info: 'Assigned Revenue includes share in the revenues of the state government ,allocated to the ULB. This includes Entertainment Tax, Duty on Transfer of Properties,etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherRevenue: {
        formFieldType: 'number',
        key: 'otherRevenue',
        displayPriority: '4',
        label: 'Other Revenue',
        info: 'Other Revenue shall include any other sources of revenue except own ,revenue, assigned revenue and grants',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalRevenue: {
        formFieldType: 'number',
        key: 'totalRevenue',
        displayPriority: '5',
        label: 'Total Revenues',
        info: 'Total Revenue is the sum of: (a) tax revenues, (b) non-tax revenues, (c) assigned (shared) revenue, (c) grants-in-aid, (d) other receipts, etc.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['1', '2', '3', '4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    salaries: {
        formFieldType: 'number',
        key: 'salaries',
        displayPriority: '6.1.1',
        label: 'Salaries, Bonus and Wages',
        info: 'Salaries, Bonus & Wages shall include expenses directly incurred on human resources of the ULB such as wages, salaries and bonus',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    pension: {
        formFieldType: 'number',
        key: 'pension',
        displayPriority: '6.1.2',
        label: 'Pension',
        info: 'Pension shall include expenses directly incurred on human resources of the ULB such as pension',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherExp: {
        formFieldType: 'number',
        key: 'otherExp',
        displayPriority: '6.1.3',
        label: 'Others',
        info: 'Others shall include any other expenses directly incurred on human resources of the ULB',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    establishmentExp: {
        formFieldType: 'number',
        key: 'establishmentExp',
        displayPriority: '6.1',
        label: 'Establishment Expenses',
        info: 'Expenses directly incurred on human resources of the ULB such as ,wages, and employee benefits such as retirement and pensions are called establishment expenses',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['6.1.1', '6.1.2', '6.1.3'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    oAndmExp: {
        formFieldType: 'number',
        key: 'oAndmExp',
        displayPriority: '6.2',
        label: 'Operation and Maintenance Expenditure',
        info: 'Operation and Maintenance Expenditure shall include O&M expense on water supply + O&M expense on sanitation / sewerage + All other O&M expenses.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    interestAndfinacialChar: {
        formFieldType: 'number',
        key: 'interestAndfinacialChar',
        displayPriority: '6.3',
        label: 'Interest and Finance Charges',
        info: 'Interest and Finance Charges shall include Interest on Loans from Central Govt, State Govt, International agencies, govt bodies, banks, bank charges and other financial expenses, etc.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    otherRevenueExp: {
        formFieldType: 'number',
        key: 'otherRevenueExp',
        displayPriority: '6.4',
        label: 'Other Revenue Expenditure',
        info: 'Other expenses shall include programme expenses, revenue grants, contributions & subsidies.',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    adExp: {
        formFieldType: 'number',
        key: 'adExp',
        displayPriority: '6.5',
        label: 'Administrative Expenses',
        info: 'Administrative Expenses shall include Indirect expenses  which relate to the ULB as a whole, such as Rents, Rates & Taxes, Office maintenance, Communications, Books & periodicals, Printing & Stationary, Travel Expenditure, Law Charges etc. ',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalRevenueExp: {
        formFieldType: 'number',
        key: 'totalRevenueExp',
        displayPriority: '6',
        label: 'Total Revenue Expenditure',
        info: 'Total expenditure shall include establishment expenses, operations & maintenance + interest & finance charges and other expenditure.',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['6.1', '6.2', '6.3', '6.4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    capExp: {
        formFieldType: 'number',
        key: 'capExp',
        displayPriority: '7',
        label: 'Capital Expenditure',
        info: 'Capital Expenditure = (Closing Balance Gross Block + Closing Balance Capital Work in Progress) - (Opening Balance Gross Block + Opening Balance Capital Work in Progress)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    totalExp: {
        formFieldType: 'number',
        key: 'totalExp',
        displayPriority: '8',
        label: 'Total Expenditure',
        info: 'Total Expenditure = Revenue Expenditure + Capital Expenditure',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['6', '7'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: 0
    },
    centralStateBorrow: {
        formFieldType: 'number',
        key: 'centralStateBorrow',
        displayPriority: '9.1',
        label: 'Central and State Government',
        info: 'Central and State Government includes the sum of All Secured and Unsecured Loans from Central and State Government',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    bonds: {
        formFieldType: 'number',
        key: 'bonds',
        displayPriority: '9.2',
        label: 'Bonds',
        info: 'Bonds includes the sum of bond amounts issued by the ULB',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    bankAndFinancial: {
        formFieldType: 'number',
        key: 'bankAndFinancial',
        displayPriority: '9.3',
        label: 'Banks and Financial Institutions',
        info: 'Banks and Financial Institutions includes the sum of all secured and Unsecured Loans from banks and other financial institution',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    otherBorrowing: {
        formFieldType: 'number',
        key: 'otherBorrowing',
        displayPriority: '9.4',
        label: 'Others',
        info: 'Others includes the sum of all other types of loans',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    grossBorrowing: {
        formFieldType: 'number',
        key: 'grossBorrowing',
        displayPriority: '9',
        label: 'Gross Borrowings',
        info: 'Gross Borrowings = Sum of All Secured and Unsecured Loans',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['9.1', '9.2', '9.3', '9.4'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    receivablePTax: {
        formFieldType: 'number',
        key: 'receivablePTax',
        displayPriority: '10.1',
        label: 'Receivables for Property Tax',
        info: 'Receivables for Property Tax includes total amounts due towards property taxes',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    receivableFee: {
        formFieldType: 'number',
        key: 'receivableFee',
        displayPriority: '10.2',
        label: 'Receivables for Fee and User Charges',
        info: 'Receivables for Fee and User Chargesincludes total amounts due towards fee and user charges',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    otherReceivable: {
        formFieldType: 'number',
        key: 'otherReceivable',
        displayPriority: '10.3',
        label: 'Other Receivables',
        info: 'Other Receivables shall include any other amount due for taxes, goods sold or services rendered by ULB',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    totalReceivable: {
        formFieldType: 'number',
        key: 'totalReceivable',
        displayPriority: '10',
        label: 'Total Receivables',
        info: 'Total Receivables is the sum of total amounts due for taxes, goods sold or services rendered by ULB',
        required: true,
        year: 8,
        validation: 'sum',
        logic: ['10.1', '10.2', '10.3'],
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    totalCashAndBankBal: {
        formFieldType: 'number',
        key: 'totalCashAndBankBal',
        displayPriority: '11',
        label: 'Total Cash and Bank Balance',
        info: 'Total Cash & Bank Balance shall include cash held by the ULB and any money held in any bank/post office by the ULB (including municipal fund, special fund and grant funds)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: -999999999999999,
        max: 999999999999999,
        decimal: ''
    },
    accSystem: {
        formFieldType: 'radio',
        options: [
            'Cash Basis of Accounting',
            'Accrual Basis of Accounting',
            'Modified Cash/ Accrual Accounting'
        ],
        showInputBox: '',
        key: 'accSystem',
        displayPriority: '1',
        label: 'What is the accounting system being followed by the ULB?',
        info: {
            "Cash basis of accounting": "Revenues and expenses are recognised/recorded when the related cash receipts or cash payments take place.",
            "Accrual basis of accounting": "Revenues and expneses are  recognised/recorded as they are earned or incurred (and not as money is received or paid) and recorded in the financial statements of the periods to which they relate.",
            "Modified": "Revenues are recognized/recorded when cash is received and expenses when they are paid, with the exception of capitalizing long-term assets and recording their related depreciation."
        },
        required: true,
        year: 1
    },
    accProvision: {
        formFieldType: 'radio',
        options: [
            'National Municipal Accounting Manual',
            'State-specific Municipal Accounting Manual',
            'Other (Please specify)'
        ],
        showInputBox: 'Other (Please specify)',
        key: 'accProvision',
        displayPriority: '2',
        label: 'What accounting provisions or framework does the ULB follow?',
        info: '',
        required: true,
        year: 1
    },
    accInCashBasis: {
        formFieldType: 'radio',
        options: ['Yes (Please specify)', 'No'],
        showInputBox: 'Yes (Please specify)',
        key: 'accInCashBasis',
        displayPriority: '3',
        label: 'Are there any accounts/books/registers maintained in cash basis?',
        info: 'Types of registers maintained: cash book, receipt register, register of bills for payment, collection register, deposit register, register of fixed assets etc.',
        required: true,
        year: 1
    },
    fsTransactionRecord: {
        formFieldType: 'radio',
        options: ['Yes', 'No'],
        showInputBox: '',
        key: 'fsTransactionRecord',
        displayPriority: '4',
        label: 'Does the ULB initially record transactions on a cash basis and subsequently prepare accrual accounts for consolidation of financial statements?',
        info: '',
        required: true,
        year: 1
    },
    fsPreparedBy: {
        formFieldType: 'radio',
        options: [
            'Internally (by Accounts Department)',
            'External Chartered Accountants',
            'Both'
        ],
        showInputBox: '',
        key: 'fsPreparedBy',
        displayPriority: '5',
        label: "Are the Financial Statements prepared internally by the ULB's accounting department, or are they compiled by an external Chartered Accountant?",
        info: '',
        required: true,
        year: 1
    },
    revReceiptRecord: {
        formFieldType: 'radio',
        options: [
            'Recorded when cash is received',
            'Recorded when they are accrued',
            'Both (Please specify which transactions are recognised in accrual basis)'
        ],
        showInputBox: 'Both (Please specify which transactions are recognised in accrual basis)',
        key: 'revReceiptRecord',
        displayPriority: '6',
        label: 'Is the revenue receipt recorded when the cash is received or when it is accrued/event occurs?',
        info: '',
        required: true,
        year: 1
    },
    expRecord: {
        formFieldType: 'radio',
        options: [
            'Recorded when cash is paid',
            'Recorded when they are accrued',
            'Both (Please specify which transactions are recognised in accrual basis)'
        ],
        showInputBox: 'Both (Please specify which transactions are recognised in accrual basis)',
        key: 'expRecord',
        displayPriority: '7',
        label: 'Is the expense recorded when it is paid or when it is incurred/event occurs?',
        info: '',
        required: true,
        year: 1
    },
    accSoftware: {
        formFieldType: 'radio',
        options: [
            'Centralized system provided by the State',
            'Standalone software',
            'Tally',
            'Other (Please specify)',
            'None'
        ],
        showInputBox: 'Other (Please specify)',
        key: 'accSoftware',
        displayPriority: '8',
        label: 'What accounting software is currently in use by the ULB?',
        info: '',
        required: true,
        year: 1
    },
    onlineAccSysIntegrate: {
        formFieldType: 'radio',
        options: [
            'Yes (Please specify which all system, e.g., tax collection, payroll, asset management)',
            'No'
        ],
        showInputBox: 'Yes (Please specify which all system, e.g., tax collection, payroll, asset management)',
        key: 'onlineAccSysIntegrate',
        displayPriority: '9',
        label: 'Does the online accounting system integrate seamlessly with other municipal systems?',
        info: '',
        required: true,
        year: 1
    },
    muniAudit: {
        formFieldType: 'radio',
        options: ['External Chartered Accountant (CA)', 'State Audit Department'],
        showInputBox: '',
        key: 'muniAudit',
        displayPriority: '10',
        label: 'Who does the municipal audit of financial statements ?',
        info: '',
        required: true,
        year: 1
    },
    totSanction: {
        formFieldType: 'number',
        key: 'totSanction',
        displayPriority: '11',
        label: 'What is the total sanctioned posts for finance & accounts related positions?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: '',
        logic: '',
    },
    totVacancy: {
        formFieldType: 'number',
        key: 'totVacancy',
        displayPriority: '12',
        label: 'What is the total vacancy across finance & accounts related positions?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: 'lessThan',
        logic: '11',
    },
    accPosition: {
        formFieldType: 'number',
        key: 'accPosition',
        displayPriority: '13',
        label: 'How many finance & accounts related positions currently are filled on contractual basis or outsourced?',
        info: '',
        required: true,
        year: 1,
        max: 9999,
        min: 0,
        decimal: 0,
        validation: '',
        logic: '',
    },
    auditedAnnualFySt: {
        instruction: [
            { "instruction": "Annual Financial Statement should include: Income and Expenditure Statement, Balance Sheet, Schedules to IES and BS, Auditor's Report and if available Receipts & Payments Statement." },
            { "instruction": " All documents pertaining to a specific financial year should be combined into a single PDF before uploading & should not exceed 20 MB." },
            { "instruction": "Please use the following format for naming the documents to be uploaded: nameofthedocument_FY_ULB Name. || Example: Annual accounts_15-16_Jaipur municipal corporation" },
        ],
        formFieldType: 'file',
        key: 'auditedAnnualFySt',
        displayPriority: '',
        label: 'Copy of Audited Annual Financial Statements preferably in English',
        info: '',
        required: true,
        year: 8,
        max: 5,
        min: 0,
        decimal: 0
    },
    coverageOfWs: {
        formFieldType: 'number',
        key: 'coverageOfWs',
        displayPriority: 1,
        label: 'Coverage of water supply connections (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    perCapitaOfWs: {
        formFieldType: 'number',
        key: 'perCapitaOfWs',
        displayPriority: 2,
        label: 'Per capita supply of water(lpcd)',
        info: '',
        placeholder: 'litres per capita per day (lpcd)|Range(0-999)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 999,
        decimal: 2,
        warning: { "value": 135, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 135 lpcd' }
    },
    extentOfMeteringWs: {
        formFieldType: 'number',
        key: 'extentOfMeteringWs',
        displayPriority: 3,
        label: 'Extent of metering of water connections (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfNonRevenueWs: {
        formFieldType: 'number',
        key: 'extentOfNonRevenueWs',
        displayPriority: 4,
        label: 'Extent of non-revenue water (NRW) (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    continuityOfWs: {
        formFieldType: 'number',
        key: 'continuityOfWs',
        displayPriority: 5,
        label: 'Continuity of water supplied (hours)',
        info: '',
        placeholder: 'Hours per day|Range(0-24)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 24,
        decimal: 0,
    },
    efficiencyInRedressalCustomerWs: {
        formFieldType: 'number',
        key: 'efficiencyInRedressalCustomerWs',
        displayPriority: 6,
        label: 'Efficiency in redressal of customer complaints related to water supply (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 80, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 80 lpcd' }
    },
    qualityOfWs: {
        formFieldType: 'number',
        key: 'qualityOfWs',
        displayPriority: 7,
        label: 'Quality of water supplied (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    costRecoveryInWs: {
        formFieldType: 'number',
        key: 'costRecoveryInWs',
        displayPriority: 8,
        label: 'Cost recovery in water supply service (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    efficiencyInCollectionRelatedWs: {
        formFieldType: 'number',
        key: 'efficiencyInCollectionRelatedWs',
        displayPriority: 9,
        label: 'Efficiency in collection of water supply-related charges (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 90, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 90 lpcd' }
    },
    coverageOfToiletsSew: {
        formFieldType: 'number',
        key: 'coverageOfToiletsSew',
        displayPriority: 10,
        label: 'Coverage of toilets (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    coverageOfSewNet: {
        formFieldType: 'number',
        key: 'coverageOfSewNet',
        displayPriority: 11,
        label: 'Coverage of sewerage network (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    collectionEfficiencySew: {
        formFieldType: 'number',
        key: 'collectionEfficiencySew',
        displayPriority: 12,
        label: 'Collection efficiency of sewerage network (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    adequacyOfSew: {
        formFieldType: 'number',
        key: 'adequacyOfSew',
        displayPriority: 13,
        label: 'Adequacy of sewerage treatment capacity (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    qualityOfSew: {
        formFieldType: 'number',
        key: 'qualityOfSew',
        displayPriority: 14,
        label: 'Quality of sewerage treatment (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfReuseSew: {
        formFieldType: 'number',
        key: 'extentOfReuseSew',
        displayPriority: 15,
        label: 'Extent of reuse and recycling of sewage (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    efficiencyInRedressalCustomerSew: {
        formFieldType: 'number',
        key: 'efficiencyInRedressalCustomerSew',
        displayPriority: 16,
        label: 'Efficiency in redressal of customer complaints related to sewerage (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfCostWaterSew: {
        formFieldType: 'number',
        key: 'extentOfCostWaterSew',
        displayPriority: 17,
        label: 'Extent of cost recovery in waste water management (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    efficiencyInCollectionSew: {
        formFieldType: 'number',
        key: 'efficiencyInCollectionSew',
        displayPriority: 18,
        label: 'Efficiency in collection of sewage water charges (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 90, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 90 lpcd' }
    },
    householdLevelCoverageLevelSwm: {
        formFieldType: 'number',
        key: 'householdLevelCoverageLevelSwm',
        displayPriority: 19,
        label: 'Household level coverage (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    efficiencyOfCollectionSwm: {
        formFieldType: 'number',
        key: 'efficiencyOfCollectionSwm',
        displayPriority: 20,
        label: 'Efficiency of collection of municipal solid waste (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfSegregationSwm: {
        formFieldType: 'number',
        key: 'extentOfSegregationSwm',
        displayPriority: 21,
        label: 'Extent of segregation of municipal solid waste (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfMunicipalSwm: {
        formFieldType: 'number',
        key: 'extentOfMunicipalSwm',
        displayPriority: 22,
        label: 'Extent of municipal solid waste recovered (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 80, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 80 lpcd' }
    },
    extentOfScientificSolidSwm: {
        formFieldType: 'number',
        key: 'extentOfScientificSolidSwm',
        displayPriority: 23,
        label: 'Extent of scientific disposal of municipal solid waste (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    extentOfCostInSwm: {
        formFieldType: 'number',
        key: 'extentOfCostInSwm',
        displayPriority: 24,
        label: 'Extent of cost recovery in SWM services (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    efficiencyInCollectionSwmUser: {
        formFieldType: 'number',
        key: 'efficiencyInCollectionSwmUser',
        displayPriority: 25,
        label: 'Efficiency in collection of SWM user charges (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 90, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 90 lpcd' }
    },
    efficiencyInRedressalCustomerSwm: {
        formFieldType: 'number',
        key: 'efficiencyInRedressalCustomerSwm',
        displayPriority: 26,
        label: 'Efficiency in redressal of customer complaints related to SWM (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
        warning: { "value": 80, "condition": "gt", "message": 'Please note that the entered value exceeds the threshold of 80 lpcd' }
    },
    coverageOfStormDrainage: {
        formFieldType: 'number',
        key: 'coverageOfStormDrainage',
        displayPriority: 27,
        label: 'Coverage of storm water drainage network (%)',
        info: '',
        placeholder: 'Percent|Range(0-100)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 100,
        decimal: 2,
    },
    incidenceOfWaterLogging: {
        formFieldType: 'number',
        key: 'incidenceOfWaterLogging',
        displayPriority: 28,
        label: 'Incidence of water logging',
        info: '',
        placeholder: 'Nos. per year|Range(0-9999)',
        required: true,
        year: 8,
        validation: '',
        logic: '',
        min: 0,
        max: 9999,
        decimal: 0,
    }
}

// Json structure - with updated Year[].
const getColumnWiseData = (key, obj, isDraft, dataSource = "", role, formStatus) => {
    switch (key) {
        case "nameOfUlb":
            return {
                ...getInputKeysByType(keyDetails["nameOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "nameOfState":
            return {
                ...getInputKeysByType(keyDetails["nameOfState"], dataSource),
                ...obj,
                readonly: true,
                // rejectReason:"",
            };
        case "pop2011":
            return {
                ...getInputKeysByType(keyDetails["pop2011"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "popApril2024":
            return {
                ...getInputKeysByType(keyDetails["popApril2024"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "areaOfUlb":
            return {
                ...getInputKeysByType(keyDetails["areaOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "yearOfElection":
            return {
                ...getInputKeysByType(keyDetails["yearOfElection"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "isElected":
            return {
                ...getInputKeysByType(keyDetails["isElected"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        case "yearOfConstitution":
            return {
                ...getInputKeysByType(keyDetails["yearOfConstitution"], dataSource),
                ...obj,
                readonly: false
            };
        case "sourceOfFd":
            return {
                ...getInputKeysByType(keyDetails["sourceOfFd"], dataSource),
                ...obj,
                readonly: false
            };
        case "taxRevenue":
            return {
                ...getInputKeysByType(keyDetails["taxRevenue"], dataSource),
                ...obj,
                readonly: false
            };
        case "feeAndUserCharges":
            return {
                ...getInputKeysByType(keyDetails["feeAndUserCharges"], dataSource),
                ...obj,
                readonly: false
            };
        case "interestIncome":
            return {
                ...getInputKeysByType(keyDetails["interestIncome"], dataSource),
                ...obj,
                readonly: false
            };
        case "otherIncome":
            return {
                ...getInputKeysByType(keyDetails["otherIncome"], dataSource),
                ...obj,
                readonly: false
            };
        case "totOwnRevenue":
            return {
                ...getInputKeysByType(keyDetails["totOwnRevenue"], dataSource),
                ...obj,
                readonly: false
            };
        case "centralGrants":
            return {
                ...getInputKeysByType(keyDetails["centralGrants"], dataSource),
                ...obj,
                readonly: false
            };
        case "otherGrants":
            return {
                ...getInputKeysByType(keyDetails["otherGrants"], dataSource),
                ...obj,
                readonly: false
            };
        case "totalGrants":
            return {
                ...getInputKeysByType(keyDetails["totalGrants"], dataSource),
                ...obj,
                readonly: false
            };
        case "assignedRevAndCom":
            return {
                ...getInputKeysByType(keyDetails["assignedRevAndCom"], dataSource),
                ...obj,
                readonly: false
            };
        case "otherRevenue":
            return {
                ...getInputKeysByType(keyDetails["otherRevenue"], dataSource),
                ...obj,
                readonly: false
            };
        case "totalRevenue":
            return {
                ...getInputKeysByType(keyDetails["totalRevenue"], dataSource),
                ...obj,
                readonly: false
            };
        case "establishmentExp":
            return {
                ...getInputKeysByType(keyDetails["establishmentExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "oAndmExp":
            return {
                ...getInputKeysByType(keyDetails["oAndmExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "interestAndfinacialChar":
            return {
                ...getInputKeysByType(keyDetails["interestAndfinacialChar"], dataSource),
                ...obj,
                readonly: false
            };
        case "otherRevenueExp":
            return {
                ...getInputKeysByType(keyDetails["otherRevenueExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "totalRevenueExp":
            return {
                ...getInputKeysByType(keyDetails["totalRevenueExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "capExp":
            return {
                ...getInputKeysByType(keyDetails["capExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "totalExp":
            return {
                ...getInputKeysByType(keyDetails["totalExp"], dataSource),
                ...obj,
                readonly: false
            };
        case "grossBorrowing":
            return {
                ...getInputKeysByType(keyDetails["grossBorrowing"], dataSource),
                ...obj,
                readonly: false
            };
        case "accSystem":
            return {
                ...getInputKeysByType(keyDetails["accSystem"], dataSource),
                ...obj,
                readonly: false
            };
        case "accProvision":
            return {
                ...getInputKeysByType(keyDetails["accProvision"], dataSource),
                ...obj,
                readonly: false
            };
        case "accInCashBasis":
            return {
                ...getInputKeysByType(keyDetails["accInCashBasis"], dataSource),
                ...obj,
                readonly: false
            };
        case "fsTransactionRecord":
            return {
                ...getInputKeysByType(keyDetails["fsTransactionRecord"], dataSource),
                ...obj,
                readonly: false
            };
        case "fsPreparedBy":
            return {
                ...getInputKeysByType(keyDetails["fsPreparedBy"], dataSource),
                ...obj,
                readonly: false
            };
        case "revReceiptRecord":
            return {
                ...getInputKeysByType(keyDetails["revReceiptRecord"], dataSource),
                ...obj,
                readonly: false
            };
        case "expRecord":
            return {
                ...getInputKeysByType(keyDetails["expRecord"], dataSource),
                ...obj,
                readonly: false
            };
        case "accSoftware":
            return {
                ...getInputKeysByType(keyDetails["accSoftware"], dataSource),
                ...obj,
                readonly: false
            };
        case "onlineAccSysIntegrate":
            return {
                ...getInputKeysByType(keyDetails["onlineAccSysIntegrate"], dataSource),
                ...obj,
                readonly: false
            };
        case "muniAudit":
            return {
                ...getInputKeysByType(keyDetails["muniAudit"], dataSource),
                ...obj,
                readonly: false
            };
        case "totSanction":
            return {
                ...getInputKeysByType(keyDetails["totSanction"], dataSource),
                ...obj,
                readonly: false
            };
        case "totVacancy":
            return {
                ...getInputKeysByType(keyDetails["totVacancy"], dataSource),
                ...obj,
                readonly: false
            };
        case "accPosition":
            return {
                ...getInputKeysByType(keyDetails["accPosition"], dataSource),
                ...obj,
                readonly: false
            };
        case "auditedAnnualFySt":
            return {
                ...getInputKeysByType(keyDetails["auditedAnnualFySt"], dataSource),
                ...obj,
                readonly: false
            };
        default:
        // code block
    }
};
const getColumnWiseDataForm2 = (key, obj, isDraft, dataSource = "", role, formStatus) => {
    switch (key) {
        case "nameOfUlb": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["nameOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "nameOfState": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["nameOfState"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pop2011": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["pop2011"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "popApril2024": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["popApril2024"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "areaOfUlb": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["areaOfUlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfElection": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["yearOfElection"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "isElected": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["isElected"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfConstitution": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["yearOfConstitution"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "yearOfSlb": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["yearOfSlb"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "sourceOfFd": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["sourceOfFd"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pTax": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["pTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherTax": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "taxRevenue": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["taxRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "feeAndUserCharges": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["feeAndUserCharges"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "interestIncome": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["interestIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherIncome": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "rentalIncome": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["rentalIncome"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totOwnRevenue": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totOwnRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralSponsoredScheme": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["centralSponsoredScheme"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "unionFinanceGrants": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["unionFinanceGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralGrants": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["centralGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "sfcGrants": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["sfcGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grantsOtherThanSfc": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["grantsOtherThanSfc"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grantsWithoutState": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["grantsWithoutState"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherGrants": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalGrants": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalGrants"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "assignedRevAndCom": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["assignedRevAndCom"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherRevenue": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalRevenue": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalRevenue"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "salaries": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["salaries"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "pension": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["pension"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "establishmentExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["establishmentExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "oAndmExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["oAndmExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "interestAndfinacialChar": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["interestAndfinacialChar"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherRevenueExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherRevenueExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "adExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["adExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalRevenueExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalRevenueExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "capExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["capExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalExp": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalExp"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "centralStateBorrow": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["centralStateBorrow"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "bonds": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["bonds"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "bankAndFinancial": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["bankAndFinancial"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherBorrowing": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherBorrowing"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "grossBorrowing": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["grossBorrowing"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "receivablePTax": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["receivablePTax"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "receivableFee": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["receivableFee"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "otherReceivable": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["otherReceivable"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalReceivable": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalReceivable"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totalCashAndBankBal": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totalCashAndBankBal"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accSystem": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["accSystem"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accProvision": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["accProvision"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accInCashBasis": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["accInCashBasis"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "fsTransactionRecord": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["fsTransactionRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "fsPreparedBy": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["fsPreparedBy"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "revReceiptRecord": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["revReceiptRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "expRecord": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["expRecord"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accSoftware": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["accSoftware"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "onlineAccSysIntegrate": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["onlineAccSysIntegrate"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "muniAudit": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["muniAudit"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totSanction": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totSanction"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "totVacancy": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["totVacancy"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "accPosition": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["accPosition"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "auditedAnnualFySt": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["auditedAnnualFySt"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["coverageOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "perCapitaOfWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["perCapitaOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfMeteringWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfMeteringWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfNonRevenueWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfNonRevenueWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "continuityOfWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["continuityOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInRedressalCustomerWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "qualityOfWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["qualityOfWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "costRecoveryInWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["costRecoveryInWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionRelatedWs": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInCollectionRelatedWs"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfToiletsSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["coverageOfToiletsSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfSewNet": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["coverageOfSewNet"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "collectionEfficiencySew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["collectionEfficiencySew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "adequacyOfSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["adequacyOfSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "qualityOfSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["qualityOfSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfReuseSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfReuseSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInRedressalCustomerSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfCostWaterSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfCostWaterSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSew": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInCollectionSew"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "householdLevelCoverageLevelSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["householdLevelCoverageLevelSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyOfCollectionSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyOfCollectionSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfSegregationSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfSegregationSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfMunicipalSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfMunicipalSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfScientificSolidSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfScientificSolidSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "extentOfCostInSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["extentOfCostInSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInCollectionSwmUser": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInCollectionSwmUser"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "efficiencyInRedressalCustomerSwm": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["efficiencyInRedressalCustomerSwm"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "coverageOfStormDrainage": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["coverageOfStormDrainage"], dataSource),
                ...obj,
                readonly: false,
                // readonly: getReadOnly(formStatus, isDraft, role, obj.status),
                // rejectReason:"",
            };
        }
        case "incidenceOfWaterLogging": {
            return {
                ...getInputKeysByTypeForm2(keyDetailsForm2["incidenceOfWaterLogging"], dataSource),
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

async function getModifiedTabsXvifcForm1(tabs, xviFCForm1Table) {
    try {
        let modifiedTabs = [...tabs];
        let service = new tabsUpdationServiceFR(xviFCForm1Table);
        for (var tab of modifiedTabs) {
            if (tab.id === priorTabsForXviFcForm1["demographicData"]) {
                tab.data = await service.getDataForDemographicDataTab();
            } else if (tab.id === priorTabsForXviFcForm1["financialData"]) {
                tab.data = await service.getDataForfinancialData();
            } else if (tab.id === priorTabsForXviFcForm1["accountPractice"]) {
                tab.data = await service.getDataForAccountingPractices();
            } else if (tab.id === priorTabsForXviFcForm1["uploadDoc"]) {
                tab.data = await service.getDataForUploadDoc();
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
class tabsUpdationServiceFR {
    constructor(xviFCForm1Table) {
        this.detail = { ...xviFCForm1Table };
    }
    async getDataForDemographicDataTab() {
        return [
            { ...this.detail.nameOfUlb },
            { ...this.detail.nameOfState },
            { ...this.detail.pop2011 },
            { ...this.detail.popApril2024 },
            { ...this.detail.areaOfUlb },
            { ...this.detail.yearOfElection },
            { ...this.detail.isElected },
            { ...this.detail.yearOfConstitution },
        ];
    }
    async getDataForfinancialData() {
        return [
            { ...this.detail.sourceOfFd },
            { ...this.detail.taxRevenue },
            { ...this.detail.feeAndUserCharges },
            { ...this.detail.interestIncome },
            { ...this.detail.otherIncome },
            { ...this.detail.totOwnRevenue },
            { ...this.detail.centralGrants },
            { ...this.detail.otherGrants },
            { ...this.detail.totalGrants },
            { ...this.detail.assignedRevAndCom },
            { ...this.detail.otherRevenue },
            { ...this.detail.totalRevenue },
            { ...this.detail.establishmentExp },
            { ...this.detail.oAndmExp },
            { ...this.detail.interestAndfinacialChar },
            { ...this.detail.otherRevenueExp },
            { ...this.detail.totalRevenueExp },
            { ...this.detail.capExp },
            { ...this.detail.totalExp },
            { ...this.detail.grossBorrowing }
        ];
    }
    async getDataForAccountingPractices() {
        return [
            { ...this.detail.accSystem },
            { ...this.detail.accProvision },
            { ...this.detail.accInCashBasis },
            { ...this.detail.fsTransactionRecord },
            { ...this.detail.fsPreparedBy },
            { ...this.detail.revReceiptRecord },
            { ...this.detail.expRecord },
            { ...this.detail.accSoftware },
            { ...this.detail.onlineAccSysIntegrate },
            { ...this.detail.muniAudit },
            { ...this.detail.totSanction },
            { ...this.detail.totVacancy },
            { ...this.detail.accPosition },
        ];
    }
    async getDataForUploadDoc() {
        return [
            { ...this.detail.auditedAnnualFySt }
        ];
    }
}
async function getModifiedTabsXvifcForm2(tabs, xviFCForm2Table) {
    try {
        let modifiedTabs = [...tabs];
        let service = new tabsUpdationServiceFR2(xviFCForm2Table);
        for (var tab of modifiedTabs) {
            if (tab.id === priorTabsForXviFcForm2["demographicData"]) {
                let tempVar = await service.getDataForDemographicDataTab();
                tab.data = [];
                tab.data = tempVar
            } else if (tab.id === priorTabsForXviFcForm2["financialData"]) {
                tab.data = await service.getDataForfinancialData();
            } else if (tab.id === priorTabsForXviFcForm2["accountPractice"]) {
                tab.data = await service.getDataForAccountingPractices();
            } else if (tab.id === priorTabsForXviFcForm2["uploadDoc"]) {
                tab.data = await service.getDataForUploadDoc();
            } else if (tab.id === priorTabsForXviFcForm2["serviceLevelBenchmark"]) {
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
class tabsUpdationServiceFR2 {
    constructor(xviFCForm1Table) {
        this.detail = { ...xviFCForm1Table };
    }
    async getDataForDemographicDataTab() {
        return [
            { ...this.detail.nameOfUlb },
            { ...this.detail.nameOfState },
            { ...this.detail.pop2011 },
            { ...this.detail.popApril2024 },
            { ...this.detail.areaOfUlb },
            { ...this.detail.yearOfElection },
            { ...this.detail.isElected },
            { ...this.detail.yearOfConstitution },
            { ...this.detail.yearOfSlb },
        ];
    }
    async getDataForfinancialData() {
        return [
            { ...this.detail.sourceOfFd },
            { ...this.detail.pTax },
            { ...this.detail.otherTax },
            { ...this.detail.taxRevenue },
            { ...this.detail.feeAndUserCharges },
            { ...this.detail.interestIncome },
            { ...this.detail.otherIncome },
            { ...this.detail.rentalIncome },
            { ...this.detail.totOwnRevenue },
            { ...this.detail.centralSponsoredScheme },
            { ...this.detail.unionFinanceGrants },
            { ...this.detail.centralGrants },
            { ...this.detail.sfcGrants },
            { ...this.detail.grantsOtherThanSfc },
            { ...this.detail.grantsWithoutState },
            { ...this.detail.otherGrants },
            { ...this.detail.totalGrants },
            { ...this.detail.assignedRevAndCom },
            { ...this.detail.otherRevenue },
            { ...this.detail.totalRevenue },
            { ...this.detail.salaries },
            { ...this.detail.pension },
            { ...this.detail.otherExp },
            { ...this.detail.establishmentExp },
            { ...this.detail.oAndmExp },
            { ...this.detail.interestAndfinacialChar },
            { ...this.detail.otherRevenueExp },
            { ...this.detail.adExp },
            { ...this.detail.totalRevenueExp },
            { ...this.detail.capExp },
            { ...this.detail.totalExp },
            { ...this.detail.centralStateBorrow },
            { ...this.detail.bonds },
            { ...this.detail.bankAndFinancial },
            { ...this.detail.otherBorrowing },
            { ...this.detail.grossBorrowing },
            { ...this.detail.receivablePTax },
            { ...this.detail.receivableFee },
            { ...this.detail.otherReceivable },
            { ...this.detail.totalReceivable },
            { ...this.detail.totalCashAndBankBal }
        ];
    }
    async getDataForAccountingPractices() {
        return [
            { ...this.detail.accSystem },
            { ...this.detail.accProvision },
            { ...this.detail.accInCashBasis },
            { ...this.detail.fsTransactionRecord },
            { ...this.detail.fsPreparedBy },
            { ...this.detail.revReceiptRecord },
            { ...this.detail.expRecord },
            { ...this.detail.accSoftware },
            { ...this.detail.onlineAccSysIntegrate },
            { ...this.detail.muniAudit },
            { ...this.detail.totSanction },
            { ...this.detail.totVacancy },
            { ...this.detail.accPosition },
        ];
    }
    async getDataForUploadDoc() {
        return [
            { ...this.detail.auditedAnnualFySt }
        ];
    }
    async getDataForServiceLevelBenchmark() {
        return {
            "coverageOfWs": { ...this.detail.coverageOfWs },
            "perCapitaOfWs": { ...this.detail.perCapitaOfWs },
            "extentOfMeteringWs": { ...this.detail.extentOfMeteringWs },
            "extentOfNonRevenueWs": { ...this.detail.extentOfNonRevenueWs },
            "continuityOfWs": { ...this.detail.continuityOfWs },
            "efficiencyInRedressalCustomerWs": { ...this.detail.efficiencyInRedressalCustomerWs },
            "qualityOfWs": { ...this.detail.qualityOfWs },
            "costRecoveryInWs": { ...this.detail.costRecoveryInWs },
            "efficiencyInCollectionRelatedWs": { ...this.detail.efficiencyInCollectionRelatedWs },
            "coverageOfToiletsSew": { ...this.detail.coverageOfToiletsSew },
            "coverageOfSewNet": { ...this.detail.coverageOfSewNet },
            "collectionEfficiencySew": { ...this.detail.collectionEfficiencySew },
            "adequacyOfSew": { ...this.detail.adequacyOfSew },
            "qualityOfSew": { ...this.detail.qualityOfSew },
            "extentOfReuseSew": { ...this.detail.extentOfReuseSew },
            "efficiencyInRedressalCustomerSew": { ...this.detail.efficiencyInRedressalCustomerSew },
            "extentOfCostWaterSew": { ...this.detail.extentOfCostWaterSew },
            "efficiencyInCollectionSew": { ...this.detail.efficiencyInCollectionSew },
            "householdLevelCoverageLevelSwm": { ...this.detail.householdLevelCoverageLevelSwm },
            "efficiencyOfCollectionSwm": { ...this.detail.efficiencyOfCollectionSwm },
            "extentOfSegregationSwm": { ...this.detail.extentOfSegregationSwm },
            "extentOfMunicipalSwm": { ...this.detail.extentOfMunicipalSwm },
            "extentOfScientificSolidSwm": { ...this.detail.extentOfScientificSolidSwm },
            "extentOfCostInSwm": { ...this.detail.extentOfCostInSwm },
            "efficiencyInCollectionSwmUser": { ...this.detail.efficiencyInCollectionSwmUser },
            "efficiencyInRedressalCustomerSwm": { ...this.detail.efficiencyInRedressalCustomerSwm },
            "coverageOfStormDrainage": { ...this.detail.coverageOfStormDrainage },
            "incidenceOfWaterLogging": { ...this.detail.incidenceOfWaterLogging },
        }
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
function findYearById(mongoObjId) {
    for (let [year, yearId] of Object.entries(yearsObj)) {
        if (yearId == mongoObjId) {
            return year;
        }
    }
    return null; // ID not found
}

// Update the json - add the keys/ questions as per the key header - Financial Data - Form 1 Json.
async function getUpdatedFinancialData_headers(allFinancialData, allFinancialDataKeys) {
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
            "tableRow": []
        },
        {
            "key": "revenue",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "I. REVENUE",
            "tableRow": []
        },
        {
            "key": "expenditure",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "II. EXPENDITURE",
            "tableRow": []
        },
        {
            "key": "borrowings",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "III. BORROWINGS",
            "tableRow": []
        }
    ];
    for (let eachObj of allFinancialData) {
        if (commonPrimaryKey.indexOf(eachObj.key) > -1) {
            data[0].tableRow.push(eachObj);
        }
        if (revenue.indexOf(eachObj.key) > -1) {
            data[1].tableRow.push(eachObj);
        }
        if (expenditure.indexOf(eachObj.key) > -1) {
            data[2].tableRow.push(eachObj);
        }
        if (borrowings.indexOf(eachObj.key) > -1) {
            data[3].tableRow.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Financial Data - Form 2 Json.
async function getUpdatedFinancialData_headersForm2(allFinancialData, allFinancialDataKeys) {
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
            "tableRow": []
        },
        {
            "key": "revenue",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "I. REVENUE",
            "tableRow": []
        },
        {
            "key": "expenditure",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "II. EXPENDITURE",
            "tableRow": []
        },
        {
            "key": "borrowings",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "III. BORROWINGS",
            "tableRow": []
        },
        {
            "key": "receivables",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "IV. RECEIVABLES",
            "tableRow": []
        },
        {
            "key": "cashAndBank",
            "section": 'accordion',
            "formFieldType": "table",
            "label": "V. CASH and BANK BALANCE",
            "tableRow": []
        },
    ];
    for (let eachObj of allFinancialData) {
        if (commonPrimaryKey.indexOf(eachObj.key) > -1) {
            data[0].tableRow.push(eachObj);
        }
        if (revenue.indexOf(eachObj.key) > -1) {
            data[1].tableRow.push(eachObj);
        }
        if (expenditure.indexOf(eachObj.key) > -1) {
            data[2].tableRow.push(eachObj);
        }
        if (borrowings.indexOf(eachObj.key) > -1) {
            data[3].tableRow.push(eachObj);
        }
        if (receivables.indexOf(eachObj.key) > -1) {
            data[4].tableRow.push(eachObj);
        }
        if (cashAndBank.indexOf(eachObj.key) > -1) {
            data[5].tableRow.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Accounting Practices.
async function getUpdatedAccountingPractices_headers(accountingPracticesData, accountingPracticesKeys) {
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
            "formArrays": []
        },
        {
            "key": 'staffing',
            "section": 'accordion',
            "formFieldType": "section",
            "label": "II.Staffing - Finance & Accounts Department",
            "formArrays": []
        },
    ];
    for (eachObj of accountingPracticesData) {
        if (accSysAndProcess.indexOf(eachObj.key) > -1) {
            data[0].formArrays.push(eachObj);
        }
        if (staffing.indexOf(eachObj.key) > -1) {
            data[1].formArrays.push(eachObj);
        }
    }
    return data;
}
// Update the json - add the keys/ questions as per the key header - Service Level Benchmark.
async function getUpdatedServiceLevelBenchmark_headers(serviceLevelBenchmarkData, serviceLevelBenchmarkKeys) {
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
    let data = {
        waterSupply: { "label": "I. WATER SUPPLY" },
        sewerage: { "label": "II. SEWERAGE" },
        solidWaste: { "label": "III. SOLID WASTE MANAGEMENT" },
        stromWater: { "label": "IV. STROM WATER DRAINAGE" },
    };
    for (key of serviceLevelBenchmarkKeys) {
        if (waterSupply.indexOf(key) > -1) {
            data.waterSupply[key] = serviceLevelBenchmarkData[key];
        }
        if (sewerage.indexOf(key) > -1) {
            data.sewerage[key] = serviceLevelBenchmarkData[key];
        }
        if (solidWaste.indexOf(key) > -1) {
            data.solidWaste[key] = serviceLevelBenchmarkData[key];
        }
        if (stromWater.indexOf(key) > -1) {
            data.stromWater[key] = serviceLevelBenchmarkData[key];
        }
    }
    return data;
}