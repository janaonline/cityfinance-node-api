let csvColsFr = ["State Name",
"ULB Name", //ULB Name
"Design Year",//year
"City Finance Code",
"Census Code", //Census Code
"ULB Type", //ULB Type
"Form Status", //filled
"Created Date", //createdAt
"Last Submitted Date", //modifiedAt
"MoHUA Comments",
"MoHUA Review File URL",
"Population as per 2011 Census", //population11
"Population as on 1st April 2022", //populationFr
"ULB website URL link", //webUrlAnnual
"Name of Commissioner / Executive Officer", //nameCmsnr
"Name of the Nodal Officer", //nameOfNodalOfficer
"Designation of the Nodal Officer",
"Email ID",//email
"Mobile number",//number
"Does the ULB handle water supply services?", //waterSupply
"Does the ULB handle sanitation service delivery?", //sanitationService
"Does your Property Tax include Water Tax?", //propertyWaterTax
"Does your Property Tax include Sanitation/Sewerage Tax?", //propertySanitationTax
"Basic ULB Details_Comment",
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptActl
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptActl
"Total Recepts (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptActl
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2018-19", //totalRcptWaterSupply
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptWaterSupply 
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptWaterSupply
"Water Supply (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptWaterSupply
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2018-19", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2019-20", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2020-21", //totalRcptSanitation
"Sanitation/Sewer (Actual) of Revenue Mobilization Parameter for FY 2021-22", //totalRcptSanitation
"Budget Estimate of Revenue Mobilization Parameter for FY 2019-20", //totalRcptBudget
"Budget Estimate of Revenue Mobilization Parameter for FY 2020-21", //totalRcptBudget
"Budget Estimate of Revenue Mobilization Parameter for FY 2021-22", //totalRcptBudget
"Total Own Revenue of Revenue Mobilization Parameter for FY 2018-19", //totalOwnRvnue
"Total Own Revenue of Revenue Mobilization Parameter for FY 2019-20", //totalOwnRvnue 
"Total Own Revenue of Revenue Mobilization Parameter for FY 2020-21", //totalOwnRvnue
"Total Own Revenue of Revenue Mobilization Parameter for FY 2021-22", //totalOwnRvnue
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2018-19",  //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2019-20", //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2020-21", //totalProperty
"Total Propert Tax Revenue of Revenue Mobilization Parameter for FY 2021-22", //totalProperty
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2018-19", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2019-20", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2020-21", //totalTaxRevWaterSupply
"Revenue of Water Supply of Revenue Mobilization Parameter for FY 2021-22", //totalTaxRevWaterSupply
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2018-19", //totalTaxRevSanitation
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2019-20", //
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2020-21",//
"Revenue of sanitation/Sewerage Supply of Revenue Mobilization Parameter for FY 2021-22",//
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2018-19", //totalFeeChrgWaterSupply
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2019-20", //
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2020-21", //
"Charge for Water Supply of Revenue Mobilization Parameter for FY 2021-22",//
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2018-19", //totalFeeChrgSanitation
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2019-20", //
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2020-21", //
"Charge for sanitation/Sewerage of Revenue Mobilization Parameter for FY 2021-22", //
"Resource Mobilization_Coment",
"Total Capital Expenditure Performance Parameter for FY 2018-19", //totalCaptlExp
"Total Capital Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Expenditure Performance Parameter for FY 2021-22", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2018-19", //totalCaptlExpWaterSupply
"Total Capital Water Supply Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Water Supply Expenditure Performance Parameter for FY 2021-22", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2018-19", //totalCaptlExpSanitation
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2019-20", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2020-21", //
"Total Capital Sanitation/Sewerage Expenditure Performance Parameter for FY 2021-22", //
"Total O & M Expenditure Performance Parameter for FY 2018-19", //totalOmExp
"Total O & M Expenditure Performance Parameter for FY 2019-20", //
"Total O & M Expenditure Performance Parameter for FY 2020-21", //
"Total O & M Expenditure Performance Parameter for FY 2021-22", //
"Total Revenue Expenditure Performance Parameter for FY 2018-19", // totalRevlExp
"Total Revenue Expenditure Performance Parameter for FY 2019-20", //
"Total Revenue Expenditure Performance Parameter for FY 2020-21", //
"Total Revenue Expenditure Performance Parameter for FY 2021-22", //
"O & M Expenditure for Water Supply for FY 2019-20", //totalCaptlExpWaterSupply
"O & M Expenditure for Water Supply for FY 2020-21", //
"O & M Expenditure for Water Supply for FY 2021-22", //
"O & M Expenditure for Sanitation/Sewerage for FY 2019-20", // totalCaptlExpSanitation
"O & M Expenditure for Sanitation/Sewerage for FY 2020-21", //
"O & M Expenditure for Sanitation/Sewerage for FY 2021-22", //
"Total Revenue Expenditure Performance for FY 2019-20",
"Total Revenue Expenditure Performance for FY 2020-21",
"Total Revenue Expenditure Performance for FY 2021-22",
"Expenditure Performance_Comment",
"Date of Audit Report for audited financial statements for FY 2019-20",
"Date of Audit Report for audited financial statements for FY 2020-21",
"Date of Audit Report for audited financial statements for FY 2021-22",
"ULB website URL link of Audited Annual Accounts for FY 2019-20 to FY 2020-21",
"Is the property tax register GIS-based?", //registerGis
"Do you use accounting software?", //accountStwre
"Total Own Revenue Arrears as on 31st March 2022",
"Own Revenue Collection Amount FY 2021-22 - by Cash/Cheque/DD", //ownRevenAmt
"Number of Properties assessed/listed as per Property Tax Register (as on 1st April 2022)", //NoOfProlisted
"Number of Properties exemt from paying Property Tax (as on 1st April 2022)", //NoOfProExemtfromPayProTax
"Number of Properties for which Property Tax has been paid (for FY 2021-22)", //NoOfProwhichProTaxPaid
"Fiscal Governance_Comments",
"Approved Annual Budget financial documents for FY 2020-21",
"Approved Annual Budget financial documents for FY 2021-22",
"Approved Annual Budget financial documents for FY 2022-23",
"Audited Annual Budget financial documents for FY 2020-21",
"Audited Annual Budget financial documents for FY 2021-22",
"Audited Annual Budget financial documents for FY 2022-23",
"Contact Information_comment",
"Self Declaration Download File Link",
"Self Declaration Uploaded File link",
"Self Declaration_comments"]

module.exports = {
    csvColsFr
}