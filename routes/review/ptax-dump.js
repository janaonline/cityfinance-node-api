const Ulb = require('../../models/Ulb');
const ObjectId = require("mongoose").Types.ObjectId;
const ExcelJS = require('exceljs');
const moment = require('moment');


const questionKeys = [

    { 'displayPriority': '1.1', 'header': 'Did the ULB collect property tax in FY 22-23?', 'key': 'ulbCollectPtax', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.2', 'header': 'On which financial year ULB was formed?', 'key': 'ulbFinancialYear', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.3', 'header': 'Has the ULB passed the resolution for collecting property tax?', 'key': 'ulbPassedResolPtax', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.4', 'header': 'Please submit the copy of resolution', 'key': 'resolutionFile', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.5', 'header': 'Has the ULB adopted notification for charging property tax?', 'key': 'notificationPropertyTax', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.6', 'header': 'What was the notification adoption date?', 'key': 'notificationAdoptionDate', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.7', 'header': 'The adopted notification was issued by?', 'key': 'notificationIssuedBy', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.8', 'header': 'Upload a copy of the notification', 'key': 'notificationFile', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '1.9', 'header': 'Total property tax demand (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'dmdIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.10', 'header': 'Current property tax demand (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'cdmdIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.11', 'header': 'Arrear property tax demand (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'admdIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.12', 'header': 'Total property tax demand (excluding cess, other taxes, user charges if any)', 'key': 'dmdexcludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.13', 'header': 'Other tax demand (Demand figure for each type of tax other than property tax collected)', 'key': 'taxTypeDemandChild', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '1.14', 'header': 'Cess demand (Demand figure for each type of cess collected)', 'key': 'cessDemandChild', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '1.15', 'header': 'Do you collect any user charges along with Property Tax?', 'key': 'doesUserChargesDmnd', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.16', 'header': 'User charges demand (Demand figure for each type of user charge collected along with property tax)', 'key': 'userChargesDmndChild', 'multipleYear': true, 'childData': 5 },
    { 'displayPriority': '1.17', 'header': 'Total property tax collection (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'collectIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.18', 'header': 'Current property tax collection (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'cuCollectIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.19', 'header': 'Arrear property tax collection (including cess, other taxes, AND excluding user charges if user charges are collected with property tax)', 'key': 'arCollectIncludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.20', 'header': 'Total property tax collection (excluding cess,other taxes, user charges if any)', 'key': 'collectExcludingCess', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '1.21', 'header': 'Other tax collections (Collection figure for each type of tax other than property tax collected)', 'key': 'taxTypeCollectionChild', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '1.22', 'header': 'Cess collection (Collection figure for each type of cess collected)', 'key': 'cessCollectChild', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '1.23', 'header': 'User charges collection (Collection figure for each type of user charge collected along with property tax)', 'key': 'userChargesCollectionChild', 'multipleYear': true, 'childData': 5 },
    { 'displayPriority': '2.1', 'header': 'Total number of properties mapped in the ULB (including properties exempted from paying property tax)', 'key': 'totalMappedPropertiesUlb', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.2', 'header': 'Total number of properties exempted from paying property tax', 'key': 'totalPropertiesTax', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.3', 'header': 'Total number of properties from which property tax was demanded', 'key': 'totalPropertiesTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.4', 'header': 'Total number of properties from which property tax was collected', 'key': 'totalPropertiesTaxDmCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.5', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'resValuePropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.6', 'header': 'Number of properties from which property tax was demanded', 'key': 'resNoPropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.7', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'resValuePropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.8', 'header': 'Number of properties from which property tax was collected', 'key': 'resNoPropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.9', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'comValuePropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.10', 'header': 'Number of properties from which property tax was demanded', 'key': 'comNoPropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.11', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'comValuePropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.12', 'header': 'Number of properties from which property tax was collected', 'key': 'comNoPropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.13', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'indValuePropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.14', 'header': 'Number of properties from which property tax was demanded', 'key': 'indNoPropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.15', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'indValuePropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.16', 'header': 'Number of properties from which property tax was collected', 'key': 'indNoPropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.17', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'govValuePropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.18', 'header': 'Number of properties from which property tax was demanded', 'key': 'govNoPropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.19', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'govValuePropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.20', 'header': 'Number of properties from which property tax was collected', 'key': 'govNoPropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.21', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'insValuePropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.22', 'header': 'Number of properties from which property tax was demanded', 'key': 'insNoPropertyTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.23', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'insValuePropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.24', 'header': 'Number of properties from which property tax was collected', 'key': 'insNoPropertyTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.25', 'header': 'Property Type', 'key': 'otherValuePropertyType', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '2.26', 'header': 'Value of property tax demanded (INR lakhs)', 'key': 'otherValuePropertyTaxDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '2.27', 'header': 'Number of properties from which property tax was demanded', 'key': 'otherNoPropertyTaxDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '2.28', 'header': 'Value of property tax collected (INR lakhs)', 'key': 'otherValuePropertyTaxCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '2.29', 'header': 'Number of properties from which property tax was collected', 'key': 'otherNoPropertyTaxCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '3.1', 'header': 'Number of properties that paid online (through website or mobile application)', 'key': 'noOfPropertiesPaidOnline', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '3.2', 'header': 'Total collections made via online channel i.e. through website or mobile application (INR lakhs)', 'key': 'totalCollectionOnline', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '4.1', 'header': 'Please submit the property tax rate card', 'key': 'propertyTaxValuationDetails', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '5.1', 'header': 'Are water charges being collected in the ULB?', 'key': 'notificationWaterCharges', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.2', 'header': 'Which entity is collecting the water charges?', 'key': 'entityWaterCharges', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.3', 'header': 'Please fill the name of', 'key': 'entity	', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.4', 'header': 'Upload a copy of gazette notification that notifies water charges', 'key': 'notificationWaterChargesFile', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.5', 'header': 'Total water charges demand', 'key': 'waterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.6', 'header': 'Current water charges demand', 'key': 'cuWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.7', 'header': 'Arrear water charges demand', 'key': 'arWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.8', 'header': 'Total water charges collection', 'key': 'waterChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.9', 'header': 'Current water charges collection', 'key': 'cuWaterChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.10', 'header': 'Arrear water charges collection', 'key': 'arWaterChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.11', 'header': 'Total Number of connections from which water charges was demanded', 'key': 'waterChrgConnectionDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.12', 'header': 'Total Number of connections from which water charges were collected', 'key': 'waterChrgConnectionCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.13', 'header': 'Value of water charges demanded (INR lakhs)', 'key': 'resValueWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.14', 'header': 'Number of Connections from which water charges was demanded', 'key': 'resNoWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.15', 'header': 'Value of water charges collected from connections (INR lakhs)', 'key': 'resValueWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.16', 'header': 'Number of connections from which water charges was collected', 'key': 'resNoWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.17', 'header': 'Value of water charges demanded (INR lakhs)', 'key': 'comValueWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.18', 'header': 'Number of connections from which water charges was demanded', 'key': 'comNoWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.19', 'header': 'Value of water charges collected from connections (INR lakhs)', 'key': 'comValueWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.20', 'header': 'Number of connections from which water charges was collected', 'key': 'comNoWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.21', 'header': 'Value of water charges demanded (INR lakhs)', 'key': 'indValueWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.22', 'header': 'Number of connections from which water charges was demanded', 'key': 'indNoWaterChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.23', 'header': 'Value of water charges collected from connections (INR lakhs)', 'key': 'indValueWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.24', 'header': 'Number of connections from which water charges was collected', 'key': 'indNoWaterChrgCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.25', 'header': 'Property Type', 'key': 'othersValueWaterType', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.26', 'header': 'Value of water charges demanded (INR lakhs)', 'key': 'othersValueWaterChrgDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '5.27', 'header': 'Number of connections from which water charges was demanded', 'key': 'othersNoWaterChrgDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '5.28', 'header': 'Value of water charges collected from connections (INR lakhs)', 'key': 'othersValueWaterChrgCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '5.29', 'header': 'Number of connections from which water charges was collected', 'key': 'othersNoWaterChrgCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '5.30', 'header': 'Please provide the water tariff sheet', 'key': 'waterChrgTariffDetails', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '5.31', 'header': 'What is the O&M cost of service delivery for water? (INR lakhs)', 'key': 'omCostDeleveryWater', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '5.32', 'header': 'Please provide the working sheet for O&M cost calculation', 'key': 'omCostWaterService', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.1', 'header': 'Are sewerage charges being collected in the ULB?', 'key': 'doesColSewerageCharges', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.2', 'header': 'Which entity is collecting the sewerage charges?', 'key': 'entitySewerageCharges', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.3', 'header': 'Please fill the name of the entity', 'key': 'entityNaSewerageCharges', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.4', 'header': 'Upload a copy of gazette notification that notifies collection of sewerage charges', 'key': 'copyGazetteNotificationSewerage', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.5', 'header': 'Total sewerage charges demand', 'key': 'totalSewergeChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.6', 'header': 'Current sewerage charges demand', 'key': 'curSewergeChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.7', 'header': 'Arrear sewerage charges demand', 'key': 'arrSewergeChrgDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.8', 'header': 'Total sewerage charges collection', 'key': 'totalSewergeChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.9', 'header': 'Current sewerage charges collection', 'key': 'curSewergeChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.10', 'header': 'Arrear sewerage charges collection', 'key': 'arrSewergeChrgCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.11', 'header': 'Total number of connections from which sewerage charges was demanded', 'key': 'totalSewergeConnectionDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.12', 'header': 'Total number of connections from which sewerage charges were collected', 'key': 'totalSewergeConnectionCol', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.13', 'header': 'Value of sewerage charges demanded (INR lakhs)', 'key': 'resValueSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.14', 'header': 'Number of connections from which sewerage charges was demanded', 'key': 'resNoSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.15', 'header': 'Value of sewerage charges collected from connections (INR lakhs)', 'key': 'resValueSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.16', 'header': 'Number of connections from which sewerage charges was collected', 'key': 'resNoSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.17', 'header': 'Value of sewerage charges demanded (INR lakhs)', 'key': 'comValueSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.18', 'header': 'Number of connections from which sewerage charges was demanded', 'key': 'comNoSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.19', 'header': 'Value of sewerage charges collected from connections (INR lakhs)', 'key': 'comValueSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.20', 'header': 'Number of connections from which sewerage charges was collected', 'key': 'comNoSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.21', 'header': 'Value of sewerage charges demanded (INR lakhs)', 'key': 'indValueSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.22', 'header': 'Number of connections from which sewerage charges was demanded', 'key': 'indNoSewerageTaxDm', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.23', 'header': 'Value of sewerage charges collected from connections (INR lakhs)', 'key': 'indValueSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.24', 'header': 'Number of connections from which sewerage charges was collected', 'key': 'indNoSewerageTaxCollected', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.25', 'header': 'Property Type', 'key': 'otherValueSewerageType', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.26', 'header': 'Value of sewerage charges demanded (INR lakhs)', 'key': 'otherValueSewerageTaxDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '6.27', 'header': 'Number of connections from which sewerage charges was demanded', 'key': 'otherNoSewerageTaxDm', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '6.28', 'header': 'Value of sewerage charges collected from connections (INR lakhs)', 'key': 'otherValueSewerageTaxCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '6.29', 'header': 'Number of connections from which sewerage charges was collected', 'key': 'otherNoSewerageTaxCollected', 'multipleYear': true, 'childData': 10 },
    { 'displayPriority': '6.30', 'header': 'Please provide the sewerage tariff sheet', 'key': 'sewerageChrgTarrifSheet', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '6.31', 'header': 'What is the O&M cost of service delivery for sewerage ?(INR lakhs)', 'key': 'omCostDeleverySewerage', 'multipleYear': true, 'childData': null },
    { 'displayPriority': '6.32', 'header': 'Please provide the working sheet for O&M cost calculation', 'key': 'omCostSewerageService', 'multipleYear': false, 'childData': null },
    { 'displayPriority': '7.1', 'header': 'Upload Signed PDF', 'key': 'signedPdf', 'multipleYear': false, 'childData': null },
];

async function getEligibleYears(designYear, yearObj) {
    try {
        // when designYear = 24-25 -> yearObj should be 18-19 to 23-24 (designYear - 1) key value pair;
        // when designYear = 24-25 -> dataYear should be 23-24 (designYear - 1);
        // when designYear = 23-24 -> dataYear should be 18-19; exception.

        // Get mongo id of (designYear - 1).
        let temp = yearObj[designYear];
        let prevYear = temp.split('-').map((ele) => Number(ele) - 1).join("-");
        let dataYear = "63735a5bd44534713673c1ca";
        if (designYear == "606aafc14dff55e6c075d3ec") dataYear = "63735a5bd44534713673c1ca";
        else dataYear = Object.keys(yearObj).find((key) => yearObj[key] === prevYear);

        // Delete unwanted years from "yearObj".
        if (designYear) {
            let deleteFlag = false;
            for (const key in yearObj) {
                if (deleteFlag || key === designYear) {
                    deleteFlag = true;
                    delete yearObj[key];
                }
            }
        }
        return dataYear;
    } catch (error) {
        console.error('Error validating years:', error);
        throw new Error(`Please check start and end years. ${error.message}`);
    }
}

async function getColumHeaders(eligibleDataYear, yearObj) {
    let basicDetails = [
        { header: "ULB Name", key: "name", width: 25 },
        { header: "CF Code", key: "code", width: 12 },
        { header: "Census Code", key: "censusCode", width: 12 },
        { header: "SB Code", key: "sbCode", width: 12 },
        { header: "State", key: "state", width: 20 },
        { header: "Design Year", key: "design_year", width: 12 },
        { header: "Form Status", key: "currentFormStatus", width: 12 },
        { header: "State Comments", key: "", width: 12 },
        { header: "State Files", key: "", width: 12 },
        { header: "MoHUA Comments", key: "", width: 12 },
        { header: "MoHUA Files", key: "", width: 12 },
    ];
    let columnsHeader = questionKeys.flatMap((ele) => {
        if (ele.childData) {
            let headers = [];
            for (let i = 1; i <= ele.childData; i++) {
                if (ele.multipleYear) {
                    headers.push({
                        header: `Input Value`,
                        // key: `${ele.key}_${key}` //To be corrected.
                    });
                    headers.push(...Object.entries(yearObj).map(([key, value]) => ({
                        header: `${value}_${ele.displayPriority}.${i}_${ele.header}`,
                        key: `${ele.key}_${key}_${i}`,
                        width: 25
                    })));
                } else {
                    headers.push({
                        header: `${ele.displayPriority}.${i}_${ele.header}`,
                        key: `${ele.key}_${eligibleDataYear}_${i}`,
                        width: 25
                    });
                }
            }
            return headers;
        }
        else {
            if (ele.multipleYear) {
                return Object.entries(yearObj).map(([key, value]) => ({
                    header: `${value}_${ele.displayPriority}_${ele.header}`,
                    key: `${ele.key}_${key}`,
                    width: 25
                }));
            } else {
                return {
                    header: `${ele.displayPriority}_${ele.header}`,
                    key: `${ele.key}_${eligibleDataYear}`,
                    width: 25
                };
            }
        }
    });
    let columnsHeaderFinal = basicDetails.concat(columnsHeader);
    return columnsHeaderFinal;
}

async function fetchPtaxData(designYear) {

    const designYearOps = [
        '606aafc14dff55e6c075d3ec', // 23-24
        '606aafcf4dff55e6c075d424', // 24-25
        '606aafda4dff55e6c075d48f', // 25-26
    ];
    const target = designYearOps
        .slice(0, designYearOps.indexOf(designYear) + 1)
        .map(ObjectId);

    return Ulb.aggregate([
        {
            $match: {
                _id: ObjectId("5fa24660072dab780a6f13bd")
            }
        },
        {
            $project: {
                name: 1,
                code: 1,
                censusCode: 1,
                sbCode: 1,
                state: 1
            }
        },
        {
            $lookup: {
                from: "propertytaxops",
                let: {
                    firstUsers: target,
                    secondUser: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $in: [
                                            "$design_year",
                                            "$$firstUsers"
                                        ]
                                    },
                                    { $eq: ["$ulb", "$$secondUser"] }
                                ]
                            }
                        }
                    }
                ],
                as: "propertytaxop"
            }
        },
        {
            $lookup: {
                from: "propertytaxopmappers",
                localField: "propertytaxop._id",
                foreignField: "ptoId",
                as: "propertytaxopmapper"
            }
        },
        {
            $lookup: {
                from: "propertymapperchilddatas",
                localField: "propertytaxop._id",
                foreignField: "ptoId",
                as: "propertymapperchilddata"
            }
        }
    ]).cursor().exec()
}

module.exports.pTax = async (req, res) => {
    try {

        const yearObj = {
            '63735a5bd44534713673c1ca': '2018-19',
            '607697074dff55e6c0be33ba': '2019-20',
            '606aadac4dff55e6c075c507': '2020-21',
            '606aaf854dff55e6c075d219': '2021-22',
            '606aafb14dff55e6c075d3ae': '2022-23',
            '606aafc14dff55e6c075d3ec': '2023-24',
            '606aafcf4dff55e6c075d424': '2024-25',
            '606aafda4dff55e6c075d48f': '2025-26',
        }

        const designYear = req.query.designYear || '606aafc14dff55e6c075d3ec';
        const eligibleDataYear = await getEligibleYears(designYear, yearObj);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ptax');

        // Define columns
        console.time("create-header");
        let columns1 = await getColumHeaders(eligibleDataYear, yearObj);
        worksheet.columns = columns1
        console.timeEnd("create-header");

        // Get the data from all 3 ptax collections.
        console.time("fetch-ops");
        const cursorOps = await fetchPtaxData(designYear);
        let tempArr = [];
        let mappers = {};
        let tempObj = {};
        // Iterate through each document in the cursor (array received from DB).
        for (let doc = await cursorOps.next(); doc != null; doc = await cursorOps.next()) {
            mappers = {};
            mappers = doc.propertytaxopmapper.reduce((acc, ulbObj) => {
                const key = `${ulbObj.type}_${ulbObj.year}`;
                if (ulbObj.value !== null || ulbObj.value !== "") { acc[key] = Number(ulbObj.value) || ulbObj.value; console.log(ulbObj.value) }
                else if (ulbObj?.file?.url) acc[key] = ulbObj.file.url;
                else if (ulbObj.date) acc[key] = moment(ulbObj.date).format('DD-MMM-YYYY');
                else acc[key] = 'P/a'; //TODO: correct this.
                return acc;
            }, {});
            tempObj = doc.propertymapperchilddata.reduce((acc, ulbObj) => {
                const key = `${ulbObj.type}_${ulbObj.year}_${ulbObj.replicaNumber}`;
                if (ulbObj.value) acc[key] = Number(ulbObj.value) || ulbObj.value;
                else if (ulbObj?.file?.url) acc[key] = ulbObj.file.url;
                else if (ulbObj.date) acc[key] = moment(ulbObj.date).format('DD-MMM-YYYY'); // To be corrected
                else acc[key] = 'N/A';//TODO: correct this.
                return acc;
            }, {});

            // Get the design year form the ops collection arr.
            let latestYearOpsData = doc.propertytaxop.find((ele) => ele.design_year.toString() == designYear);

            mappers["name"] = doc.name;
            mappers["code"] = doc.code;
            mappers["censusCode"] = doc.censusCode;
            mappers["sbCode"] = doc.sbCode;
            mappers["state"] = doc.state;
            mappers["currentFormStatus"] = latestYearOpsData?.currentFormStatus || 'Not Started';
            mappers["design_year"] = latestYearOpsData?.design_year || null;

            mappers = Object.assign(mappers, tempObj);
            tempArr.push(mappers);
        }
        console.timeEnd("fetch-ops");
        // return res.send({ tempArr, columns1 })

        console.time('add-rows');
        // Iterate through each row in eachRowObj
        tempArr.forEach((row) => {
            worksheet.addRow(row);
        });
        console.timeEnd('add-rows');

        console.time('style-header');
        // Style header.
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        // worksheet.eachRow({ includeEmpty: true }, (row) => {
        //     row.eachCell({ includeEmpty: true }, (cell) => {
        //         cell.font = { size: 10 };
        //     });
        // });
        worksheet.views = [
            { state: 'normal', zoomScale: 90 }
        ];
        console.timeEnd('style-header');

        console.time('write-excel');
        let filename = `PTAX_${(moment().format("DD-MMM-YY_HH-mm-ss"))}`;
        // Stream the workbook to the response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        await workbook.xlsx.write(res);
        console.timeEnd('write-excel');
        res.end();

    } catch (error) {
        console.error('Error generating dump:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}

