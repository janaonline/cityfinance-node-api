let financialYearTableHeader = ["2022-23", "2021-22", "2020-21", "2019-20", "2018-19", "2017-18", "2016-17", "2015-16"];

let priorTabsForXviFcForm = {
    "demographicData": "s1",
    "financialData": "s2",
    "uploadDoc": "s3",
    "accountPractice": "s4",
    "serviceLevelBenchmark": "s5"
};

let form1QuestionKeys = [
    "nameOfUlb",
    "nameOfState",
    "pop2011",
    "popApril2024",
    "areaOfUlb",
    "yearOfElection",
    "isElected",
    "yearOfConstitution",

    "sourceOfFd",
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
    "establishmentExp",
    "oAndmExp",
    "interestAndfinacialChar",
    "otherRevenueExp",
    "totalRevenueExp",
    "capExp",
    "totalExp",
    "grossBorrowing",

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
    "totSanction",
    "totVacancy",
    "accPosition",

    "auditedAnnualFySt"
];
let form2QuestionKeys = [
    "yearOfSlb",

    "pTax",
    "noOfRegiProperty",
    "otherTax",
    "rentalIncome",
    "centralSponsoredScheme",
    "unionFinanceGrants",
    "sfcGrants",
    "grantsOtherThanSfc",
    "grantsWithoutState",
    "salaries",
    "pension",
    "otherExp",
    "adExp",
    "centralStateBorrow",
    "bonds",
    "bankAndFinancial",
    "otherBorrowing",
    "receivablePTax",
    "receivableFee",
    "otherReceivable",
    "totalReceivable",
    "totalCashAndBankBal",

    "coverageOfWs",
    "perCapitaOfWs",
    "extentOfMeteringWs",
    "extentOfNonRevenueWs",
    "continuityOfWs",
    "efficiencyInRedressalCustomerWs",
    "qualityOfWs",
    "costRecoveryInWs",
    "efficiencyInCollectionRelatedWs",
    "coverageOfToiletsSew",
    "coverageOfSewNet",
    "collectionEfficiencySew",
    "adequacyOfSew",
    "qualityOfSew",
    "extentOfReuseSew",
    "efficiencyInRedressalCustomerSew",
    "extentOfCostWaterSew",
    "efficiencyInCollectionSew",
    "householdLevelCoverageLevelSwm",
    "efficiencyOfCollectionSwm",
    "extentOfSegregationSwm",
    "extentOfMunicipalSwm",
    "extentOfScientificSolidSwm",
    "extentOfCostInSwm",
    "efficiencyInCollectionSwmUser",
    "efficiencyInRedressalCustomerSwm",
    "coverageOfStormDrainage",
    "incidenceOfWaterLogging",

];

let form1TempDb = {
    "nameOfUlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "nameOfState": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "pop2011": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "popApril2024": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "areaOfUlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "yearOfElection": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "isElected": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "yearOfConstitution": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "sourceOfFd": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "taxRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "feeAndUserCharges": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "interestIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totOwnRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "centralGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "assignedRevAndCom": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "establishmentExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "oAndmExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "interestAndfinacialChar": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherRevenueExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalRevenueExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "capExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "grossBorrowing": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accSystem": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accProvision": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accInCashBasis": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "fsTransactionRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "fsPreparedBy": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "revReceiptRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "expRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accSoftware": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "onlineAccSysIntegrate": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "muniAudit": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totSanction": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totVacancy": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accPosition": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "auditedAnnualFySt": {
        status: "Na",
        value: "",
        isDraft: true
    },
}

let form2TempDb = {
    "nameOfUlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "nameOfState": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "pop2011": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "popApril2024": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "areaOfUlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "yearOfElection": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "isElected": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "yearOfConstitution": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "sourceOfFd": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "taxRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "feeAndUserCharges": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "interestIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totOwnRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "centralGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "assignedRevAndCom": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalRevenue": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "establishmentExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "oAndmExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "interestAndfinacialChar": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherRevenueExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalRevenueExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "capExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "grossBorrowing": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accSystem": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accProvision": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accInCashBasis": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "fsTransactionRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "fsPreparedBy": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "revReceiptRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "expRecord": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accSoftware": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "onlineAccSysIntegrate": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "muniAudit": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totSanction": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totVacancy": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "accPosition": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "auditedAnnualFySt": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "yearOfSlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "pTax": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "noOfRegiProperty": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherTax": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "rentalIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "centralSponsoredScheme": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "unionFinanceGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "sfcGrants": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "grantsOtherThanSfc": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "grantsWithoutState": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "salaries": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "pension": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "adExp": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "centralStateBorrow": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "bonds": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "bankAndFinancial": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherBorrowing": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "receivablePTax": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "receivableFee": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherReceivable": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalReceivable": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totalCashAndBankBal": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "coverageOfWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "perCapitaOfWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfMeteringWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfNonRevenueWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "continuityOfWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInRedressalCustomerWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "qualityOfWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "costRecoveryInWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInCollectionRelatedWs": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "coverageOfToiletsSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "coverageOfSewNet": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "collectionEfficiencySew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "adequacyOfSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "qualityOfSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfReuseSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInRedressalCustomerSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfCostWaterSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInCollectionSew": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "householdLevelCoverageLevelSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyOfCollectionSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfSegregationSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfMunicipalSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfScientificSolidSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "extentOfCostInSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInCollectionSwmUser": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "efficiencyInRedressalCustomerSwm": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "coverageOfStormDrainage": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "incidenceOfWaterLogging": {
        status: "Na",
        value: "",
        isDraft: true
    },
}

function getInputKeysByType(selectedKeyDetails, isReadOnly, dataSource, formType, frontendYear_Fd, frontendYear_Slb) {

    let obj = {
        key: selectedKeyDetails.key,
        readonly: isReadOnly,
        class: selectedKeyDetails.autoSumValidation && selectedKeyDetails.autoSumValidation == 'sum' ? selectedKeyDetails.class + " " + "fw-bold" : selectedKeyDetails.class,
        label: selectedKeyDetails.label,
        position: selectedKeyDetails.displayPriority,
        quesPos: selectedKeyDetails.quesPos,
        required: selectedKeyDetails.required,
        info: selectedKeyDetails.info,
        placeHolder: "",
        formFieldType: selectedKeyDetails.formFieldType,
        canShow: true,
        validations: selectedKeyDetails.validations,
    }

    if (selectedKeyDetails.required == true) {
        obj.validations = [];
        obj.validations.push(
            {
                name: "required",
                validator: 'required',
                message: "Please fill in this required field."
            },
        )
    }

    if (selectedKeyDetails.formFieldType === "number" || selectedKeyDetails.formFieldType === "amount") {
        obj.warning = [];
        obj.sumOf = [];
        obj.validations = [];
        obj.max = selectedKeyDetails.max;
        obj.min = selectedKeyDetails.min;
        obj.decimal = selectedKeyDetails.decimal;
        if (selectedKeyDetails.sumOf && selectedKeyDetails.sumOf.length > 0) {
            obj.autoSumValidation = selectedKeyDetails.autoSumValidation;
            obj.sumOf = selectedKeyDetails.sumOf;
            obj.sumOrder = selectedKeyDetails.sumOrder;
        }
        // obj.autoSumValidation = selectedKeyDetails.autoSumValidation;
        // obj.autoSumValidation2 = selectedKeyDetails.autoSumValidation2;
        // obj.sumOf = selectedKeyDetails.sumOf;
        // obj.sumOf2 = selectedKeyDetails.sumOf2;

        obj.warning.push({ "value": 0, "condition": "eq", "message": 'Are you sure you want to continue with 0' });
        if (selectedKeyDetails.warning) obj.warning.push(selectedKeyDetails.warning);

        obj.validations.push(
            {
                name: "min",
                validator: selectedKeyDetails.min,
                message: selectedKeyDetails.max > 99999999999999 ? "Please enter a valid number with at most 15 digits." : `Please enter a number between ${selectedKeyDetails.min} and ${selectedKeyDetails.max}.`
            },
            {
                name: "max",
                validator: selectedKeyDetails.max,
                message: selectedKeyDetails.max > 99999999999999 ? "Please enter a valid number with at most 15 digits." : `Please enter a number between ${selectedKeyDetails.min} and ${selectedKeyDetails.max}.`
            },
        )
        obj.validations.push(
            {
                name: "decimal",
                validator: selectedKeyDetails.decimal,
                message: !selectedKeyDetails.decimal ? "Please enter a whole number for this field." : `Please enter number with at most ${selectedKeyDetails.decimal} places.`,
            }
        )
        if (selectedKeyDetails.validation) obj.validations.push(selectedKeyDetails.validation);
    }
    else if (selectedKeyDetails.formFieldType === "radio" || selectedKeyDetails.formFieldType === "dropdown") {
        obj.options = selectedKeyDetails.options;
        obj.showInputBox = selectedKeyDetails.showInputBox;
        obj.inputBoxValue = "";
    }
    else if (selectedKeyDetails.formFieldType === "file") {
        obj.max = selectedKeyDetails.max;
        obj.min = selectedKeyDetails.min;
        obj.bottomText = "Maximum of 20MB";
        obj.instruction = selectedKeyDetails.instruction;
    }

    if (selectedKeyDetails.year > 1) {
        let positionCounter = 1;
        let yearData = [];

        if (frontendYear_Fd && frontendYear_Fd.includes("In")) frontendYear_Fd = "2015-16";
        if (frontendYear_Fd && frontendYear_Fd.includes("Before")) frontendYear_Fd = "2014-15";

        let index = -1;
        if (frontendYear_Fd == "2014-15") {
            index = financialYearTableHeader.length;
        } else {
            index = frontendYear_Fd ? financialYearTableHeader.indexOf(frontendYear_Fd) : frontendYear_Slb ? financialYearTableHeader.indexOf(frontendYear_Slb) + 1 : -1;
        }

        for (let i = 0; i < index; i++) {
            let eachYearobj = {};
            // eachYearobj.warning = [];
            eachYearobj["label"] = `FY ${financialYearTableHeader[i]}`;
            eachYearobj["key"] = `fy${financialYearTableHeader[i]}_${selectedKeyDetails.key}`;
            eachYearobj["year"] = financialYearTableHeader[i];
            eachYearobj["position"] = positionCounter++;
            // eachYearobj["type"] = selectedKeyDetails.key;
            eachYearobj["refKey"] = selectedKeyDetails.key;
            eachYearobj["formFieldType"] = selectedKeyDetails.formFieldType;
            eachYearobj["value"] = "";

            // if (selectedKeyDetails.formFieldType === "number" || selectedKeyDetails.formFieldType === "amount") eachYearobj.warning.push({ "value": 0, "condition": "eq", "message": 'Are you sure you want to continue with 0' });

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
                // eachYearobj["allowedFileTypes"] = ['pdf'];
            }

            yearData.push(eachYearobj);
        }
        obj.year = yearData;
    } else obj.value = "";

    return obj;
}

module.exports.financialYearTableHeader = financialYearTableHeader;
module.exports.priorTabsForXviFcForm = priorTabsForXviFcForm;
module.exports.form1QuestionKeys = form1QuestionKeys;
module.exports.form2QuestionKeys = form2QuestionKeys;
module.exports.form1TempDb = form1TempDb;
module.exports.form2TempDb = form2TempDb;
module.exports.getInputKeysByType = getInputKeysByType;