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
const { yearsObj } = require("./xviFC_year");

let priorTabsForXviFcForm1 = {
    "demographicData": "s1",
    "financialData": "s2",
    "uploadDoc": "s3",
    "accountPractice": "s4",
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

        // console.log("Inside Create xviFc Form1 Json");

        let ulbId = req.query.ulb;
        let ulbData = await Ulb.findOne({ _id: ObjectId(ulbId) }, { name: 1, state: 1 });
        let stateId = ulbData.state;
        let stateData = await State.findOne({ _id: ObjectId(stateId) }, { name: 1 });

        let xviFCForm1Tabs = await XviFcForm1Tabs.find().lean();
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


module.exports.getForm1 = async (req, res) => {
    try {
        let ulbId = req.query.ulb;
        let roleName = req.query.role;
        let from1AnswerFromDb = await XviFcForm1DataCollection.findOne({ ulb: ObjectId(ulbId) });
        let xviFCForm1Tabs = await XviFcForm1Tabs.find().lean();
        let xviFCForm1Table = tempDb;
        
        let role = roleName;
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



       if(from1AnswerFromDb){
        for (let eachQuestionObj of from1QuestionFromDb) {
            let indexOfKey = from1AnswerFromDb.tab.findIndex(x => x.tabKey === eachQuestionObj.key);

            if (indexOfKey > -1) {
                if (from1AnswerFromDb.tab[indexOfKey].tabKey == eachQuestionObj.key) {

                    for (let selectedData of from1AnswerFromDb.tab[indexOfKey].data) {
                        if (eachQuestionObj.key == "financialData") {
                            let questionKeyFinancialData = selectedData.key.split("_")[1]
                            let yearDataIndex = eachQuestionObj.data[questionKeyFinancialData].year.findIndex(x => x.key === selectedData.key)
                            if (yearDataIndex > -1 && selectedData.key == eachQuestionObj.data[questionKeyFinancialData].year[yearDataIndex].key) {
                                eachQuestionObj.data[questionKeyFinancialData].year[yearDataIndex].value = selectedData.saveAsDraftValue;
                            }
                        }

                        if (eachQuestionObj.key == "uploadDoc") {
                            let questionKeyFinancialData = selectedData.key.split("_")[1]
                            let yearDataIndex = eachQuestionObj.data[questionKeyFinancialData].year.findIndex(x => x.key === selectedData.key)
                            if (yearDataIndex > -1 && selectedData.key == eachQuestionObj.data[questionKeyFinancialData].year[yearDataIndex].key) {
                                eachQuestionObj.data[questionKeyFinancialData].year[yearDataIndex].file.name = selectedData.file[0].name;
                                eachQuestionObj.data[questionKeyFinancialData].year[yearDataIndex].file.url = selectedData.file[0].url;
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
        let fileDataJson = from1QuestionFromDb[2].data.auditedAnnualFySt.year;
        from1QuestionFromDb[2].data.auditedAnnualFySt.year = await getUploadDocLinks(ulbId, fileDataJson);

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

        return res.status(200).json({ status: true, message: "Success fetched data!", data: viewData });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something went wrong!" });
    }
};

module.exports.submitFrom1 = async (req, res) => {
    try {
        let ulbData_form1 = req.body;
        let ulbId = ObjectId(req.query.ulb);
        let updatedData = await XviFcForm1DataCollection.findOneAndUpdate({ ulb: ulbId }, ulbData_form1, { upsert: true });
        return res.status(200).json({ status: true, message: "DB successfully updated", data: updatedData ? updatedData : "" });
    } catch (error) {
        return res.status(400).json({ status: false, message: error });
    }
};

// Clone.
// module.exports.getForm1 = async (req, res) => {
//     try {
//         let ulbId = req.query.ulb;
//         let ulbData = await Ulb.findOne({ _id: ObjectId(ulbId) }, { name: 1, state: 1 });
//         let stateId = ulbData.state;
//         let stateData = await State.findOne({ _id: ObjectId(stateId) }, { name: 1 });
//         let xviFCForm1Tabs = await XviFcForm1Tabs.find().lean();
//         let xviFCForm1Table = tempDb;

//         let role = "ULB";
//         let currentFormStatus = "PENDING";

//         for (let index = 0; index < keys.length; index++) {
//             if (xviFCForm1Table.hasOwnProperty(keys[index])) {
//                 let obj = xviFCForm1Table[keys[index]];
//                 xviFCForm1Table[keys[index]] = getColumnWiseData(keys[index], obj, xviFCForm1Table.isDraft, "", role, currentFormStatus);
//                 xviFCForm1Table['readonly'] = true;

//             } else {
//                 xviFCForm1Table[keys[index]] = getColumnWiseData(
//                     keys[index],
//                     {
//                         value: "",
//                         status: "PENDING",
//                     },
//                     null,
//                     "",
//                     role,
//                     // data?.currentFormStatus
//                     currentFormStatus
//                 );
//             }
//         }

//         // Create a json structure - questions.
//         let modifiedTabs = await getModifiedTabsXvifcForm1(xviFCForm1Tabs, xviFCForm1Table);

//         // Update the json with the pdf links - Already on Cityfinance.
//         let fileDataJson = modifiedTabs[2].data.auditedAnnualFySt.year;
//         modifiedTabs[2].data.auditedAnnualFySt.year = await getUploadDocLinks(ulbId, fileDataJson);

//         // Add Primary keys to the keyDetails{}  - financialData.
//         let financialData = modifiedTabs[1].data;
//         modifiedTabs[1].data = await getUpdatedFinancialData_headers(financialData, Object.keys(financialData));

//         // Add Primary keys to the keyDetails{} - accountingPractices.
//         let accountingPractices = modifiedTabs[3].data;
//         modifiedTabs[3].data = await getUpdatedAccountingPractices_headers(accountingPractices, Object.keys(accountingPractices));

//         let viewData = {
//             ulb: ulbId,
//             ulbName: ulbData.name,
//             stateId: stateId,
//             stateName: stateData.name,
//             tabs: modifiedTabs,
//             financialYearTableHeader
//         };

//         return res.status(200).json({ status: true, message: "Success fetched data!", data: viewData });
//     } catch (error) {
//         console.log("err", error);
//         return res.status(400).json({ status: false, message: "Something went wrong!" });
//     }
// };

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
        displayPriority: '',
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
        displayPriority: '',
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
            { "instruction_1": "Text 1" },
            { "instruction_2": "Text 2" },
            { "instruction_3": "Text 3" },
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
        return {
            "nameOfUlb": { ...this.detail.nameOfUlb },
            "nameOfState": { ...this.detail.nameOfState },
            "pop2011": { ...this.detail.pop2011 },
            "popApril2024": { ...this.detail.popApril2024 },
            "areaOfUlb": { ...this.detail.areaOfUlb },
            "yearOfElection": { ...this.detail.yearOfElection },
            "isElected": { ...this.detail.isElected },
            "yearOfConstitution": { ...this.detail.yearOfConstitution },
        };
    }
    async getDataForfinancialData() {
        return {
            "sourceOfFd": { ...this.detail.sourceOfFd },
            "taxRevenue": { ...this.detail.taxRevenue },
            "feeAndUserCharges": { ...this.detail.feeAndUserCharges },
            "interestIncome": { ...this.detail.interestIncome },
            "otherIncome": { ...this.detail.otherIncome },
            "totOwnRevenue": { ...this.detail.totOwnRevenue },
            "centralGrants": { ...this.detail.centralGrants },
            "otherGrants": { ...this.detail.otherGrants },
            "totalGrants": { ...this.detail.totalGrants },
            "assignedRevAndCom": { ...this.detail.assignedRevAndCom },
            "otherRevenue": { ...this.detail.otherRevenue },
            "totalRevenue": { ...this.detail.totalRevenue },
            "establishmentExp": { ...this.detail.establishmentExp },
            "oAndmExp": { ...this.detail.oAndmExp },
            "interestAndfinacialChar": { ...this.detail.interestAndfinacialChar },
            "otherRevenueExp": { ...this.detail.otherRevenueExp },
            "totalRevenueExp": { ...this.detail.totalRevenueExp },
            "capExp": { ...this.detail.capExp },
            "totalExp": { ...this.detail.totalExp },
            "grossBorrowing": { ...this.detail.grossBorrowing }
        };
    }
    async getDataForAccountingPractices() {
        return {
            "accSystem": { ...this.detail.accSystem },
            "accProvision": { ...this.detail.accProvision },
            "accInCashBasis": { ...this.detail.accInCashBasis },
            "fsTransactionRecord": { ...this.detail.fsTransactionRecord },
            "fsPreparedBy": { ...this.detail.fsPreparedBy },
            "revReceiptRecord": { ...this.detail.revReceiptRecord },
            "expRecord": { ...this.detail.expRecord },
            "accSoftware": { ...this.detail.accSoftware },
            "onlineAccSysIntegrate": { ...this.detail.onlineAccSysIntegrate },
            "muniAudit": { ...this.detail.muniAudit },
            "totSanction": { ...this.detail.totSanction },
            "totVacancy": { ...this.detail.totVacancy },
            "accPosition": { ...this.detail.accPosition },
        };
    }
    async getDataForUploadDoc() {
        return {
            "auditedAnnualFySt": { ...this.detail.auditedAnnualFySt }
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

    console.log("Data in ledger", yearsLedgerDataAvailable);

    // Get pdf links from "DataCollectionForm" collection.
    if (yearsLedgerDataAvailable.length > 0) {
        let alreadyOnCfPdfs = {};
        for (let year of yearsLedgerDataAvailable) {

            let dynamicKey = 'documents.financial_year_' + year.replace("-", "_");
            let tempDyanamicKey = 'financial_year_' + year.replace("-", "_");
            let availablePdfData = await DataCollectionForm.find({ [`${dynamicKey}`]: { '$exists': 1 }, "ulb": ObjectId(ulbId) }, { [`${dynamicKey}`]: 1 });

            if (
                availablePdfData[0] &&
                availablePdfData[0].documents[tempDyanamicKey].pdf.length > 0 &&
                availablePdfData[0].documents[tempDyanamicKey].pdf[0].url
            ) {
                let obj={}
                let temp = { "year": "", "collection": "dataCollectionForm", "availablePdfData": [] };
                obj.name=availablePdfData[0].documents[tempDyanamicKey].pdf[0].name
                obj.url=availablePdfData[0].documents[tempDyanamicKey].pdf[0].url
                obj.type=''
                obj.label=''
                temp.availablePdfData.push(obj);
                temp.year = year;
                // alreadyOnCfPdfs.push(temp);
                alreadyOnCfPdfs[year] = temp;
            }
        }

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
                obj={}
                obj.name = echObj.audited.provisional_data.bal_sheet_schedules.pdf.name
                obj.url = echObj.audited.provisional_data.bal_sheet_schedules.pdf.url
                obj.type = 'bal_sheet_schedules'
                obj.label = 'Schedules To Balance Sheet'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.audited.provisional_data.inc_exp.pdf.name
                obj.url = echObj.audited.provisional_data.inc_exp.pdf.url
                obj.type = 'inc_exp'
                obj.label = 'Income And Expenditure'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.audited.provisional_data.inc_exp_schedules.pdf.name
                obj.url = echObj.audited.provisional_data.inc_exp_schedules.pdf.url
                obj.type = 'inc_exp_schedules'
                obj.label = 'Schedules To Income And Expenditure'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.audited.provisional_data.cash_flow.pdf.name
                obj.url = echObj.audited.provisional_data.cash_flow.pdf.url
                obj.type = 'cash_flow'
                obj.label = 'Cash Flow Statement'
                tempObj.availablePdfData.push(obj);
                obj={}
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
                obj={};
            };

            if (yearsLedgerDataAvailable.indexOf(findYearById(echObj.unAudited.year)) > -1 && echObj.unAudited.provisional_data.bal_sheet.pdf.url) {
                obj.name = echObj.unAudited.provisional_data.bal_sheet.pdf.name
                obj.url = echObj.unAudited.provisional_data.bal_sheet.pdf.url
                obj.type = 'bal_sheet'
                obj.label = 'Balance Sheet'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.unAudited.provisional_data.bal_sheet_schedules.pdf.name
                obj.url = echObj.unAudited.provisional_data.bal_sheet_schedules.pdf.url
                obj.type = 'bal_sheet_schedules'
                obj.label = 'Schedules To Balance Sheet'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.unAudited.provisional_data.inc_exp.pdf.name
                obj.url = echObj.unAudited.provisional_data.inc_exp.pdf.url
                obj.type = 'inc_exp'
                obj.label = 'Income And Expenditure'
                tempObj.availablePdfData.push(obj);
                obj={}
                obj.name = echObj.unAudited.provisional_data.inc_exp_schedules.pdf.name
                obj.url = echObj.unAudited.provisional_data.inc_exp_schedules.pdf.url
                obj.type = 'inc_exp_schedules'
                obj.label = 'Schedules To Income And Expenditure'
                tempObj.availablePdfData.push(obj);
                obj={}
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
                obj={};
            }
        }

        // Append the links in the json.
        for (let echYrObj of fileDataJson) {
            let fy = echYrObj.label.split(" ")[1];

            if (alreadyOnCfPdfs[fy]) {
                echYrObj.isPdfAvailable = alreadyOnCfPdfs[fy].availablePdfData.url ? true : false;
                echYrObj.fileAlreadyOnCf=[];
                echYrObj.fileAlreadyOnCf.push(alreadyOnCfPdfs[fy].availablePdfData)
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

// Update the json - add the keys/ questions as per the key header - Financial Data.
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
    let data = {
        commonPrimaryKey: {},
        revenue: { "label": "I. REVENUE" },
        expenditure: { "label": "II. EXPENDITURE" },
        borrowings: { "label": "III. BORROWINGS" }
    };
    for (let key of allFinancialDataKeys) {
        if (commonPrimaryKey.indexOf(key) > -1) {
            data.commonPrimaryKey[key] = allFinancialData[key];
        }
        if (revenue.indexOf(key) > -1) {
            data.revenue[key] = allFinancialData[key];
        }
        if (expenditure.indexOf(key) > -1) {
            data.expenditure[key] = allFinancialData[key];
        }
        if (borrowings.indexOf(key) > -1) {
            data.borrowings[key] = allFinancialData[key];
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
    let data = {
        accSysAndProcess: { "label": "I. Accounting Systems and Processes" },
        staffing: { "label": "II.Staffing - Finance & Accounts Department" },
    };
    for (key of accountingPracticesKeys) {
        if (accSysAndProcess.indexOf(key) > -1) {
            data.accSysAndProcess[key] = accountingPracticesData[key];
        }
        if (staffing.indexOf(key) > -1) {
            data.staffing[key] = accountingPracticesData[key];
        }
    }
    return data;
}