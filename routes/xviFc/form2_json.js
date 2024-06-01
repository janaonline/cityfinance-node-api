const { years } = require("./xviFC_year");
// module.exports.notRequiredValidations = ['caMembershipNo', 'population11', 'otherUpload']

let financialYearTableHeader = ["2022-23", "2021-22", "2020-21", "2019-20", "2018-19", "2017-18", "2016-17", "2015-16"];

let eachQuestionkeysForm2 = [
    "nameOfUlb",
    "nameOfState",
    "pop2011",
    "popApril2024",
    "areaOfUlb",
    "yearOfElection",
    "isElected",
    "yearOfConstitution",
    "yearOfSlb",

    "sourceOfFd",
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
    "grantsWithoutState",
    "otherGrants",
    "totalGrants",
    "assignedRevAndCom",
    "otherRevenue",
    "totalRevenue",
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
    "centralStateBorrow",
    "bonds",
    "bankAndFinancial",
    "otherBorrowing",
    "grossBorrowing",
    "receivablePTax",
    "receivableFee",
    "otherReceivable",
    "totalReceivable",
    "totalCashAndBankBal",

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

    "auditedAnnualFySt",

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
    "incidenceOfWaterLogging"
]

let tempDb2 = {
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
    "yearOfSlb": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "sourceOfFd": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "pTax": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "otherTax": {
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
    "rentalIncome": {
        status: "Na",
        value: "",
        isDraft: true
    },
    "totOwnRevenue": {
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
    "centralGrants": {
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
    "adExp": {
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
    "grossBorrowing": {
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

function getInputKeysByType(selectedKeyDetails, dataSource) {
    let obj = {
        key: selectedKeyDetails.key,
        label: selectedKeyDetails.label,
        postion: selectedKeyDetails.displayPriority,
        required: selectedKeyDetails.required,
        info: selectedKeyDetails.info,
        placeHolder: selectedKeyDetails.placeHolder ? selectedKeyDetails.placeHolder : "",
        formFieldType: selectedKeyDetails.formFieldType,
        canShow: true,
    }

    if (selectedKeyDetails.formFieldType === "number") {
        obj.warning = [];
        obj.max = selectedKeyDetails.max;
        obj.min = selectedKeyDetails.min;
        obj.decimal = selectedKeyDetails.decimal;
        obj.validation = selectedKeyDetails.validation;
        obj.logic = selectedKeyDetails.logic;
        obj.warning.push({ "value": 0, "condition": "eq", "message": 'Are you sure you want to continue with 0' });
    }
    else if (selectedKeyDetails.formFieldType === "radio" || selectedKeyDetails.formFieldType === "dropdown") {
        obj.options = selectedKeyDetails.options;
        obj.showInputBox = selectedKeyDetails.showInputBox;
        obj.inputBoxValue = "";
    }
    else if (selectedKeyDetails.formFieldType === "file") {
        obj.max = selectedKeyDetails.max;
        obj.min = selectedKeyDetails.min;
        obj.bottomText = "Maximum of 5MB";
        obj.instruction = selectedKeyDetails.instruction;
    }

    if (selectedKeyDetails.year > 1) {
        let positionCounter = 1;
        let yearData = [];
        for (let year of financialYearTableHeader) {
            let eachYearobj = {};
            eachYearobj.warning = [];
            eachYearobj["label"] = `FY ${year}`;
            eachYearobj["key"] = `fy${year}_${selectedKeyDetails.key}`;
            eachYearobj["postion"] = positionCounter++;
            eachYearobj["type"] = selectedKeyDetails.key;
            eachYearobj["formFieldType"] = selectedKeyDetails.formFieldType;
            eachYearobj["value"] = "";

            if (selectedKeyDetails.formFieldType === "number") {
                eachYearobj.warning.push({ "value": 0, "condition": "eq", "message": 'Are you sure you want to continue with 0' });
                if (selectedKeyDetails.warning) eachYearobj.warning.push(selectedKeyDetails.warning);
            }

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
            }

            yearData.push(eachYearobj);
        }
        obj.year = yearData;
    } else obj.value = "";

    return obj;

}

// module.exports.xviFcForm1Tabs = xviFcForm1Tabs; Getting from DB.
module.exports.financialYearTableHeaderForm2 = financialYearTableHeader;
module.exports.tempDbForm2 = tempDb2;
module.exports.keysForm2 = eachQuestionkeysForm2;
module.exports.getInputKeysByTypeForm2 = getInputKeysByType;