const ObjectId = require("mongoose").Types.ObjectId;
const XviFcForm1DataCollection = require("../../models/XviFcFormDataCollection");
const ExcelJS = require('exceljs');
// const { xviFcFormData } = require("./temp");
const { financialYearTableHeader } = require("./form_json");


let fin_slb_year = {
    financialData_year: "",
    yearOfConstitution: "",
    serviceLevelBenchmark_year: "",
};
let baseUrl_s3 = 'https://jana-cityfinance-stg.s3.ap-south-1.amazonaws.com';
let baseUrl = 'https://staging.cityfinance.in/resources-dashboard/data-sets/balanceSheet?';

// ----- All data report ----- //
async function getEachTabData(eachTab, obj) {
    let uniqueYear = [];
    let tempArr = [];

    if (eachTab.tabKey == 'demographicData' || eachTab.tabKey == 'accountPractice') {
        for (let eachAns of eachTab.data) {
            if (eachAns["key"] == 'gazetteUpload' || eachAns["key"] == 'pop2024Upload') {
                obj[eachAns["key"]] = eachAns["file"]["url"] ? baseUrl_s3 + eachAns["file"]["url"] : "N/A";
            } else {
                obj[eachAns["key"]] = isNaN(Number(eachAns["value"])) ? eachAns["value"] : Number(eachAns["value"]);
            }
            // Get the answer of yearOfSlb and yearOfConstitution.
            if (eachAns["key"] == 'yearOfConstitution') {
                fin_slb_year.yearOfConstitution = eachAns["value"];
                fin_slb_year.financialData_year =
                    eachAns["value"].includes("In") ? "2015-16" :
                        eachAns["value"].includes("Before") ? "2014-15" :
                            eachAns["value"];

            };
            if (eachAns["key"] == 'yearOfSlb') {
                fin_slb_year.serviceLevelBenchmark_year = eachAns["value"];
            };
        }
    } else {
        // Get Financial array.
        let yindex_fd = -1;
        if (fin_slb_year.financialData_year == "2014-15") {
            yindex_fd = financialYearTableHeader.length;
        } else {
            yindex_fd = fin_slb_year.financialData_year ? financialYearTableHeader.indexOf(fin_slb_year.financialData_year) : -1;
        }
        let tempYearArr_fd = financialYearTableHeader.slice(0, yindex_fd);
        // Get SLB array.
        let yindex_slb = -1;
        yindex_slb = fin_slb_year.serviceLevelBenchmark_year ? financialYearTableHeader.indexOf(fin_slb_year.serviceLevelBenchmark_year) + 1 : -1;
        let tempYearArr_slb = financialYearTableHeader.slice(0, yindex_slb);

        let arr = eachTab.tabKey == 'financialData' || eachTab.tabKey == 'uploadDoc' ? tempYearArr_fd : eachTab.tabKey == 'serviceLevelBenchmark' ? tempYearArr_slb : [];

        // Set Data.
        for (let eachAns of eachTab.data) {
            if (arr.includes(eachAns.year)) {
                let index = uniqueYear.indexOf(eachAns.year)
                if (index > -1) {
                    if (!tempArr[index]) tempArr[index] = {};

                    tempArr[index].year = uniqueYear[index];
                    tempArr[index]['nameOfUlb'] = obj.nameOfUlb;
                    tempArr[index]['nameOfState'] = obj.nameOfState;
                    tempArr[index]['censusCode'] = obj["censusCode"];
                    tempArr[index]['formId'] = obj["formId"];
                    tempArr[index]['formStatus'] = obj["formStatus"].split("_").join(" ");
                    let key = eachAns["key"].split("_")[1];
                    tempArr[index][`${key}`] = isNaN(Number(eachAns["value"])) ? eachAns["value"] : Number(eachAns["value"]);
                    tempArr[index]['yearByUser'] =
                        eachTab.tabKey == 'financialData' || eachTab.tabKey == 'uploadDoc' ? fin_slb_year.yearOfConstitution :
                            eachTab.tabKey == 'serviceLevelBenchmark' ? fin_slb_year.serviceLevelBenchmark_year :
                                "";
                    if (eachAns["key"].includes('auditedAnnualFySt')) {
                        tempArr[index]["verifyStatus"] =
                            eachAns["verifyStatus"] == 2 ? "Approved by ULB" :
                                eachAns["verifyStatus"] == 3 ? "Rejected by ULB" :
                                    "N/A";
                        tempArr[index]["rejectReason"] = eachAns["rejectReason"] && eachAns["verifyStatus"] == 3 ? eachAns["rejectReason"] : "N/A";
                        tempArr[index]["isPdfAvailable"] = eachAns["verifyStatus"] == 2 || eachAns["verifyStatus"] == 3 ? "TRUE" : "FALSE";
                        tempArr[index][`${key}`] = eachAns["verifyStatus"] == 2 ? `${baseUrl}ulbName=${obj.nameOfUlb}` : eachAns["file"]["url"] ? baseUrl_s3 + eachAns["file"]["url"] : "N/A";
                        tempArr[index]["rejectOption"] = eachAns["rejectOption"] && eachAns["verifyStatus"] == 3 ? eachAns["rejectOption"].join(", ") : "N/A";
                    }
                } else {
                    uniqueYear.push(eachAns["year"]);
                    let tempObj = {};

                    tempObj["year"] = eachAns["year"];
                    tempObj['nameOfUlb'] = obj.nameOfUlb;
                    tempObj['nameOfState'] = obj.nameOfState;
                    tempObj['censusCode'] = obj["censusCode"];
                    tempObj['formId'] = obj["formId"];
                    tempObj['formStatus'] = obj["formStatus"].split("_").join(" ");
                    let key = eachAns["key"].split("_")[1];
                    tempObj[`${key}`] = isNaN(Number(eachAns["value"])) ? eachAns["value"] : Number(eachAns["value"]);
                    tempObj['yearByUser'] =
                        eachTab.tabKey == 'financialData' || eachTab.tabKey == 'uploadDoc' ? fin_slb_year.yearOfConstitution :
                            eachTab.tabKey == 'serviceLevelBenchmark' ? fin_slb_year.serviceLevelBenchmark_year :
                                "";
                    if (eachAns["key"].includes('auditedAnnualFySt')) {
                        tempObj["verifyStatus"] =
                            eachAns["verifyStatus"] == 2 ? "Approved by ULB" :
                                eachAns["verifyStatus"] == 3 ? "Rejected by ULB" :
                                    "Already on CF";
                        tempObj["rejectReason"] = eachAns["rejectReason"] && eachAns["verifyStatus"] == 3 ? eachAns["rejectReason"] : "N/A";
                        tempObj["isPdfAvailable"] = eachAns["verifyStatus"] == 2 || eachAns["verifyStatus"] == 3 ? "TRUE" : "FALSE";
                        tempObj[`${key}`] = eachAns["verifyStatus"] == 2 ? `${baseUrl}ulbName=${obj.nameOfUlb}` : eachAns["file"]["url"] ? baseUrl_s3 + eachAns["file"]["url"] : "N/A";
                        tempObj["rejectOption"] = eachAns["rejectOption"] && eachAns["verifyStatus"] == 3 ? eachAns["rejectOption"].join(", ") : "N/A";
                    }

                    tempArr.push(tempObj);
                }
            }
        }
    }
    return tempArr.length > 0 ? tempArr : obj;
}

module.exports.dataDump = async (req, res) => {
    // Fetch data from database.
    let formStatuses = ['UNDER_REVIEW_BY_STATE', 'UNDER_REVIEW_BY_XVIFC', 'APPROVED_BY_XVIFC'];
    let xviFcFormData = await XviFcForm1DataCollection.find({ "formStatus": { $in: formStatuses } });
    let demographicDataAllUlbs = [];
    let financialDataAllUlbs = [];
    let accountPracticeAllUlbs = [];
    let uploadDocAllUlbs = [];
    let serviceLevelBenchmarkAllUlbs = [];
    let upload_financial = {}; // TODO: to be removed.
    for (let ulbForm of xviFcFormData) {
        fin_slb_year = {
            financialData_year: "",
            yearOfConstitution: "",
            serviceLevelBenchmark_year: "",
        };
        // Make the demographic at element one.
        let demographicDataIndex = ulbForm.tab.findIndex((x) => { return x.tabKey == 'demographicData' });
        if (demographicDataIndex > -1) {
            let temp = ulbForm.tab[0];
            ulbForm.tab[0] = ulbForm.tab[demographicDataIndex];
            ulbForm.tab[demographicDataIndex] = temp;
        } else {
            return res.status(400).json({ status: false, message: "Incomplete data in DB!" });
        }
        // Merge financial and upload array.
        // upload_financial = { 'data': [] };
        upload_financial = { "tabKey": "", "data": [] };
        let financialDataIndex = ulbForm.tab.findIndex((x) => { return x.tabKey == 'financialData' });
        let uploadDocIndex = ulbForm.tab.findIndex((x) => { return x.tabKey == 'uploadDoc' });
        // upload_financial["data"] = ulbForm.tab[financialDataIndex].data.concat(ulbForm.tab[uploadDocIndex].data);
        upload_financial["data"] = ulbForm.tab[financialDataIndex].data.concat(ulbForm.tab[uploadDocIndex].data);
        upload_financial["tabKey"] = "financialData";

        // Get gazetteUpload and pop2024Upload - add to demographic.
        let gazetteUpload_pop2024Upload = ulbForm.tab[uploadDocIndex].data.filter((x) => { return x.key == 'gazetteUpload' || x.key == 'pop2024Upload' });
        ulbForm.tab[0].data = ulbForm.tab[0].data.concat(gazetteUpload_pop2024Upload);

        // Loop over each tab for particular ULB.
        for (let eachTab of ulbForm.tab) {
            let obj = {};
            obj["nameOfState"] = ulbForm.stateName;
            obj["nameOfUlb"] = ulbForm.ulbName;
            obj["censusCode"] = Number(ulbForm.censusCode ? ulbForm.censusCode : ulbForm.sbCode);
            obj["formId"] = ulbForm.formId == 16 ? 'Category 1' : 'Category 2';
            obj["formStatus"] = ulbForm.formStatus.split("_").join(" ");

            switch (eachTab.tabKey) {
                case "demographicData": demographicDataAllUlbs.push(await getEachTabData(eachTab, obj)); break;
                case "financialData":
                    financialDataAllUlbs = financialDataAllUlbs.concat(await getEachTabData(upload_financial, obj));
                    break;
                case "accountPractice": accountPracticeAllUlbs.push(await getEachTabData(eachTab, obj)); break;
                // case "uploadDoc":
                //     uploadDocAllUlbs = uploadDocAllUlbs.concat(await getEachTabData(eachTab, obj));
                //     break;
                case "serviceLevelBenchmark":
                    serviceLevelBenchmarkAllUlbs = serviceLevelBenchmarkAllUlbs.concat(await getEachTabData(eachTab, obj));
                    break;
            }
        }
    }

    // return res.send({
    // "demographicData": demographicDataAllUlbs,
    // "financialData": financialDataAllUlbs,
    // "accountPractice": accountPracticeAllUlbs,
    // "uploadDoc": uploadDocAllUlbs,
    // "serviceLevelBenchmark": serviceLevelBenchmarkAllUlbs,
    // });

    // Create a new workbook and add a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet_1 = workbook.addWorksheet('Demographic_Data_All_ULBs');
    const worksheet_2 = workbook.addWorksheet('Financial & Docs_All_ULBs');
    const worksheet_3 = workbook.addWorksheet('Accounting_Practice_All_ULBs');
    const worksheet_4 = workbook.addWorksheet('Financial & Docs_Selected_ULBs');
    const worksheet_5 = workbook.addWorksheet('ServiceLevelBenchmark');
    // const worksheet_6 = workbook.addWorksheet('Documents_All_ULBs');

    // Define the columns
    // Demographic - All ULBs.
    worksheet_1.columns = [
        { header: '#', key: 'rowSlNo', width: 5 },
        { header: 'State', key: 'nameOfState', width: 15 },
        { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
        { header: 'Census Code', key: 'censusCode', width: 12 },
        { header: 'ULB Category', key: 'formId', width: 12 },
        { header: 'Form Status', key: 'formStatus', width: 20 },
        { header: 'Population as per Census 2011', key: 'pop2011', width: 15 },
        { header: 'Population as per 01 April 2024', key: 'popApril2024', width: 15 },
        { header: 'Area as on 01 April 2024 (in Sq. Km.)', key: 'areaOfUlb', width: 15 },
        { header: 'In which year was the ULB constituted?', key: 'yearOfConstitution', width: 15 },
        { header: "Which is the latest year when ULB's election was held?", key: 'yearOfElection', width: 15 },
        { header: 'Is the elected body in place as on 01 April 2024?', key: 'isElected', width: 15 },

        { header: 'Gazette notification regarding the constitution of the ULB.', key: 'gazetteUpload', width: 15 },
        { header: 'Population estimate as on 01 April 2024 (Supporting Doc)', key: 'pop2024Upload', width: 15 },
    ];
    // Financial - All ULBs.
    worksheet_2.columns = [
        { header: '#', key: 'rowSlNo', width: 5 },
        { header: 'State', key: 'nameOfState', width: 15 },
        { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
        { header: 'Census Code', key: 'censusCode', width: 12 },
        { header: 'ULB Category', key: 'formId', width: 12 },
        { header: 'Form Status', key: 'formStatus', width: 20 },
        { header: 'Year', key: 'year', width: 12 },

        { header: "In which year was the ULB constituted?", key: "yearByUser", width: 15 },
        { header: "Please select the source of Financial Data", key: "sourceOfFd", width: 15 },
        { header: "Tax Revenue", key: "taxRevenue", width: 15 },
        { header: "Fee and User Charges", key: "feeAndUserCharges", width: 15 },
        { header: "Interest Income", key: "interestIncome", width: 15 },
        { header: "Other Income", key: "otherIncome", width: 15 },
        { header: "Total Own Revenue", key: "totOwnRevenue", width: 15 },
        { header: "Grants for Centre's Initiatives ", key: "centralGrants", width: 15 },
        { header: "Other Grants (including State's grants)", key: "otherGrants", width: 15 },
        { header: "Total Grants", key: "totalGrants", width: 15 },
        { header: "Assigned Revenue and Compensation", key: "assignedRevAndCom", width: 15 },
        { header: "Other Revenue", key: "otherRevenue", width: 15 },
        { header: "Total Revenues", key: "totalRevenue", width: 15 },
        { header: "Establishment Expenses", key: "establishmentExp", width: 15 },
        { header: "Operation and Maintenance Expenditure", key: "oAndmExp", width: 15 },
        { header: "Interest and Finance Charges", key: "interestAndfinacialChar", width: 15 },
        { header: "Other Revenue Expenditure", key: "otherRevenueExp", width: 15 },
        { header: "Total Revenue Expenditure", key: "totalRevenueExp", width: 15 },
        { header: "Capital Expenditure", key: "capExp", width: 15 },
        { header: "Total Expenditure", key: "totalExp", width: 15 },
        { header: "Gross Borrowings", key: "grossBorrowing", width: 15 },

        { header: "Copy of Audited Annual Financial Statements URL", key: "auditedAnnualFySt", width: 15 },
        { header: "Is PDF Available on CityFinance", key: "isPdfAvailable", width: 15 },
        { header: "Rejection Reason (If any)", key: "rejectReason", width: 15 },
        { header: "Rejected Files", key: "rejectOption", width: 15 },
        { header: "File verification Status", key: "verifyStatus", width: 15 },

        // { header: "Copy of Audited Annual Financial Statements URL", key: "auditedAnnualFySt", width: 15 },
    ];
    // Accounting Practice - All ULBs.
    worksheet_3.columns = [
        { header: '#', key: 'rowSlNo', width: 5 },
        { header: 'State', key: 'nameOfState', width: 15 },
        { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
        { header: 'Census Code', key: 'censusCode', width: 12 },
        { header: 'ULB Category', key: 'formId', width: 12 },
        { header: 'Form Status', key: 'formStatus', width: 20 },
        // { header: 'Year', key: 'year', width: 12 },

        { header: "What is the accounting system being followed by the ULB?", key: "accSystem", width: 15 },
        { header: "What accounting provisions or framework does the ULB follow?", key: "accProvision", width: 15 },
        { header: "Are there any accounts/books/registers maintained in cash basis?", key: "accInCashBasis", width: 15 },
        { header: "Does the ULB initially record transactions on a cash basis and subsequently prepare accrual accounts for consolidation of financial statements?", key: "fsTransactionRecord", width: 15 },
        { header: "Are the Financial Statements prepared internally by the ULB's accounting department, or are they compiled by an external Chartered Accountant?", key: "fsPreparedBy", width: 15 },
        { header: "Is the revenue receipt recorded when the cash is received or when it is accrued/event occurs? ", key: "revReceiptRecord", width: 15 },
        { header: "Is the expense recorded when it is paid or when it is incurred/event occurs?", key: "expRecord", width: 15 },
        { header: "What accounting software is currently in use by the ULB?", key: "accSoftware", width: 15 },
        { header: "Does the online accounting system integrate seamlessly with other municipal/ State/ Central systems?", key: "onlineAccSysIntegrate", width: 15 },
        { header: "Who does the municipal audit of financial statements ?", key: "muniAudit", width: 15 },
        { header: "What is the total sanctioned posts for finance & accounts related positions?", key: "totSanction", width: 15 },
        { header: "What is the total vacancy across finance & accounts related positions?", key: "totVacancy", width: 15 },
        { header: "How many finance & accounts related positions currently are filled on contractual basis or outsourced?", key: "accPosition", width: 15 },
    ]
    // Financial - Form 2.
    worksheet_4.columns = [
        { header: '#', key: 'rowSlNo', width: 5 },
        { header: 'State', key: 'nameOfState', width: 15 },
        { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
        { header: 'Census Code', key: 'censusCode', width: 12 },
        { header: 'ULB Category', key: 'formId', width: 12 },
        { header: 'Form Status', key: 'formStatus', width: 20 },
        { header: 'Year', key: 'year', width: 12 },

        { header: "In which year was the ULB constituted?", key: "yearByUser", width: 15 },
        { header: "Please select the source of Financial Data", key: "sourceOfFd", width: 15 },
        { header: "Property Tax", key: "pTax", width: 15 },
        { header: "Number of registered properties", key: "noOfRegiProperty", width: 15 },
        { header: "Other Tax", key: "otherTax", width: 15 },
        { header: "Tax Revenue", key: "taxRevenue", width: 15 },
        { header: "Fee and User Charges", key: "feeAndUserCharges", width: 15 },
        { header: "Interest Income", key: "interestIncome", width: 15 },
        { header: "Other Income", key: "otherIncome", width: 15 },
        { header: "Rental Income from Municipal Properties", key: "rentalIncome", width: 15 },
        { header: "Total Own Revenue", key: "totOwnRevenue", width: 15 },
        { header: "Centrally Sponsored Schemes (Total Centre and State Share)", key: "centralSponsoredScheme", width: 15 },
        { header: "Union Finance Commission Grants", key: "unionFinanceGrants", width: 15 },
        { header: "Grants for Centre's Initiatives ", key: "centralGrants", width: 15 },
        { header: "State Finance Commission Devolution and Grants", key: "sfcGrants", width: 15 },
        { header: "Grants from State (other than SFC)", key: "grantsOtherThanSfc", width: 15 },
        { header: "Other grants", key: "grantsWithoutState", width: 15 },
        { header: "Other Grants (including State's grants)", key: "otherGrants", width: 15 },
        { header: "Total Grants", key: "totalGrants", width: 15 },
        { header: "Assigned Revenue and Compensation", key: "assignedRevAndCom", width: 15 },
        { header: "Other Revenue", key: "otherRevenue", width: 15 },
        { header: "Total Revenues", key: "totalRevenue", width: 15 },
        { header: "Salaries, Bonus and Wages", key: "salaries", width: 15 },
        { header: "Pension", key: "pension", width: 15 },
        { header: "Others", key: "otherExp", width: 15 },
        { header: "Establishment expenses", key: "establishmentExp", width: 15 },
        { header: "Operation and Maintenance Expenditure", key: "oAndmExp", width: 15 },
        { header: "Interest and Finance Charges", key: "interestAndfinacialChar", width: 15 },
        { header: "Other Revenue Expenditure", key: "otherRevenueExp", width: 15 },
        { header: "Administrative Expenses", key: "adExp", width: 15 },
        { header: "Total Revenue Expenditure", key: "totalRevenueExp", width: 15 },
        { header: "Capital Expenditure", key: "capExp", width: 15 },
        { header: "Total Expenditure", key: "totalExp", width: 15 },
        { header: "Central and State Government", key: "centralStateBorrow", width: 15 },
        { header: "Bonds", key: "bonds", width: 15 },
        { header: "Banks and Financial Institutions", key: "bankAndFinancial", width: 15 },
        { header: "Others", key: "otherBorrowing", width: 15 },
        { header: "Gross Borrowings", key: "grossBorrowing", width: 15 },
        { header: "Receivables for Property Tax", key: "receivablePTax", width: 15 },
        { header: "Receivables for Fee and User Charges", key: "receivableFee", width: 15 },
        { header: "Other Receivables", key: "otherReceivable", width: 15 },
        { header: "Total Receivables", key: "totalReceivable", width: 15 },
        { header: "Total Cash and Bank Balance", key: "totalCashAndBankBal", width: 15 },

        { header: "Copy of Audited Annual Financial Statements URL", key: "auditedAnnualFySt", width: 15 },
        { header: "Is PDF Available on CityFinance", key: "isPdfAvailable", width: 15 },
        { header: "Rejection Reason (If any)", key: "rejectReason", width: 15 },
        { header: "Rejected Files", key: "rejectOption", width: 15 },
        { header: "File verification Status", key: "verifyStatus", width: 15 },

        // { header: "Copy of Audited Annual Financial Statements URL", key: "auditedAnnualFySt", width: 15 },
    ]
    // Service Level Benchmark - Form 2.
    worksheet_5.columns = [
        { header: '#', key: 'rowSlNo', width: 5 },
        { header: 'State', key: 'nameOfState', width: 15 },
        { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
        { header: 'Census Code', key: 'censusCode', width: 12 },
        { header: 'ULB Category', key: 'formId', width: 12 },
        { header: 'Form Status', key: 'formStatus', width: 20 },
        { header: 'Year', key: 'year', width: 12 },

        { header: "From which year is Service Level Benchmark data available?", key: "yearByUser", width: 15 },
        { header: "Coverage of water supply connections (%)", key: "coverageOfWs", width: 15 },
        { header: "Per capita supply of water(lpcd)", key: "perCapitaOfWs", width: 15 },
        { header: "Extent of metering of water connections (%)", key: "extentOfMeteringWs", width: 15 },
        { header: "Extent of non-revenue water (NRW) (%)", key: "extentOfNonRevenueWs", width: 15 },
        { header: "Continuity of water supplied (hours/day)", key: "continuityOfWs", width: 15 },
        { header: "Efficiency in redressal of customer complaints related to water supply (%)", key: "efficiencyInRedressalCustomerWs", width: 15 },
        { header: "Quality of water supplied (%)", key: "qualityOfWs", width: 15 },
        { header: "Cost recovery in water supply service (%)", key: "costRecoveryInWs", width: 15 },
        { header: "Efficiency in collection of water supply-related charges (%)", key: "efficiencyInCollectionRelatedWs", width: 15 },
        { header: "Coverage of toilets (%)", key: "coverageOfToiletsSew", width: 15 },
        { header: "Coverage of sewerage network (%)", key: "coverageOfSewNet", width: 15 },
        { header: "Collection efficiency of sewerage network (%)", key: "collectionEfficiencySew", width: 15 },
        { header: "Adequacy of sewerage treatment capacity (%)", key: "adequacyOfSew", width: 15 },
        { header: "Quality of sewerage treatment (%)", key: "qualityOfSew", width: 15 },
        { header: "Extent of reuse and recycling of sewage (%)", key: "extentOfReuseSew", width: 15 },
        { header: "Efficiency in redressal of customer complaints related to sewerage (%)", key: "efficiencyInRedressalCustomerSew", width: 15 },
        { header: "Extent of cost recovery in waste water management (%)", key: "extentOfCostWaterSew", width: 15 },
        { header: "Efficiency in collection of sewage water charges (%)", key: "efficiencyInCollectionSew", width: 15 },
        { header: "Household level coverage (%)", key: "householdLevelCoverageLevelSwm", width: 15 },
        { header: "Efficiency of collection of municipal solid waste (%)", key: "efficiencyOfCollectionSwm", width: 15 },
        { header: "Extent of segregation of municipal solid waste (%)", key: "extentOfSegregationSwm", width: 15 },
        { header: "Extent of municipal solid waste recovered (%)", key: "extentOfMunicipalSwm", width: 15 },
        { header: "Extent of scientific disposal of municipal solid waste (%)", key: "extentOfScientificSolidSwm", width: 15 },
        { header: "Extent of cost recovery in SWM services (%)", key: "extentOfCostInSwm", width: 15 },
        { header: "Efficiency in collection of SWM user charges (%)", key: "efficiencyInCollectionSwmUser", width: 15 },
        { header: "Efficiency in redressal of customer complaints related to SWM (%)", key: "efficiencyInRedressalCustomerSwm", width: 15 },
        { header: "Coverage of storm water drainage network (%)", key: "coverageOfStormDrainage", width: 15 },
        { header: "Number of incidents of water logging", key: "incidenceOfWaterLogging", width: 15 },
    ]
    // Documents Uploaded - This is added in financial sheet.
    // worksheet_6.columns = [
    //     { header: '#', key: 'rowSlNo', width: 5 },
    //     { header: 'State', key: 'nameOfState', width: 15 },
    //     { header: 'ULB Name', key: 'nameOfUlb', width: 40 },
    //     { header: 'Census Code', key: 'censusCode', width: 12 },
    //     { header: 'ULB Category', key: 'formId', width: 12 },
    //     { header: 'Form Status', key: 'formStatus', width: 20 },
    //     { header: 'Year', key: 'year', width: 12 },

    //     { header: "In which year was the ULB constituted?", key: "yearByUser", width: 15 },
    //     { header: "Copy of Audited Annual Financial Statements URL", key: "auditedAnnualFySt", width: 15 },
    //     { header: "Is PDF Available on CityFinance", key: "isPdfAvailable", width: 15 },
    //     { header: "Rejection Reason (If any)", key: "rejectReason", width: 15 },
    //     { header: "Rejected Files", key: "rejectOption", width: 15 },
    //     { header: "File verification Status", key: "verifyStatus", width: 15 },

    // ]

    let data = [];
    // Add rows to the worksheet
    let rowSlNo = 1;
    demographicDataAllUlbs.forEach(item => {
        item["rowSlNo"] = rowSlNo++;
        worksheet_1.addRow(item);
    });

    rowSlNo = 1;
    financialDataAllUlbs.forEach(item => {
        item["rowSlNo"] = rowSlNo++;
        worksheet_2.addRow(item);
    });

    rowSlNo = 1;
    accountPracticeAllUlbs.forEach(item => {
        item["rowSlNo"] = rowSlNo++;
        worksheet_3.addRow(item);
    });

    rowSlNo = 1;
    financialDataAllUlbs.forEach(item => {
        if (item.formId == 'Category 2') {
            item["rowSlNo"] = rowSlNo++;
            worksheet_4.addRow(item);
        }
    });

    rowSlNo = 1;
    serviceLevelBenchmarkAllUlbs.forEach(item => {
        item["rowSlNo"] = rowSlNo++;
        worksheet_5.addRow(item);
    });

    // rowSlNo = 1;
    // uploadDocAllUlbs.forEach(item => {
    //     item["rowSlNo"] = rowSlNo++;
    //     worksheet_6.addRow(item);
    // });

    // Create a buffer to store the Excel file
    const buffer = await workbook.xlsx.writeBuffer();

    // Set file name.
    const now = new Date();
    const dateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const timeString = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
    const filename = `XVIFC_DataDump_${dateString}_${timeString}.xlsx`;
    // const filename = `XVIFC_DataDump.xlsx`;

    // Set the response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Send the buffer as the response
    return res.send(buffer);
};