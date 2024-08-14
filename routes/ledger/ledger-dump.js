const ULBLedger = require('../../models/UlbLedger');
const LedgerLog = require('../../models/LedgerLog');
const LineItem = require('../../models/LineItem');
const ExcelJS = require('exceljs');
const moment = require('moment');

const totOwnRevenueArr = [
    '5dd10c2485c951b54ec1d74b',
    '5dd10c2685c951b54ec1d762',
    '5dd10c2485c951b54ec1d74a',
    '5dd10c2885c951b54ec1d77e',
    '5dd10c2385c951b54ec1d748',
];

const totRevenueArr = [
    '5dd10c2485c951b54ec1d74b',
    '5dd10c2485c951b54ec1d74f',
    '5dd10c2685c951b54ec1d762',
    '5dd10c2485c951b54ec1d74a',
    '5dd10c2885c951b54ec1d77e',
    '5dd10c2685c951b54ec1d761',
    '5dd10c2585c951b54ec1d75b',
    '5dd10c2785c951b54ec1d778',
    '5dd10c2385c951b54ec1d748',
    '5dd10c2785c951b54ec1d776',
];

const revExpenditureArr = [
    '5dd10c2385c951b54ec1d743',
    '5dd10c2585c951b54ec1d753',
    '5dd10c2585c951b54ec1d75a',
    '5dd10c2585c951b54ec1d756',
    '5dd10c2685c951b54ec1d760',
];

const totExpenditureArr = [
    '5dd10c2585c951b54ec1d753',
    '5dd10c2585c951b54ec1d75a',
    '5dd10c2585c951b54ec1d756',
    '5dd10c2685c951b54ec1d760',
    '5dd10c2785c951b54ec1d77c',
    '5dd10c2585c951b54ec1d75f',
    '5dd10c2485c951b54ec1d74e',
    '5dd10c2385c951b54ec1d746',
    '5dd10c2585c951b54ec1d755',
    '5dd10c2385c951b54ec1d743',
];

const capexArr = [
    '5dd10c2785c951b54ec1d779',
    '5dd10c2785c951b54ec1d774',
];

const bsSizeArr = [
    '5dd10c2385c951b54ec1d742',
    '5dd10c2785c951b54ec1d779',
    '5dd10c2785c951b54ec1d77b',
    '5dd10c2785c951b54ec1d774',
    '5dd10c2785c951b54ec1d77d',
    '5dd10c2585c951b54ec1d751',
    '5dd10c2885c951b54ec1d77f',
    '5dd10c2885c951b54ec1d781',
    '5dd10c2685c951b54ec1d76d',
    '5dd10c2785c951b54ec1d777',
    '5dd10c2585c951b54ec1d757',
    '5dd10c2685c951b54ec1d76a',
    '5dd10c2585c951b54ec1d75c',

];

// Get Line Items From DB.
async function getLineItemsFromDB() {

    // Headers for the input sheet data.
    const lineItems = await LineItem.find({}, { _id: 1, isActive: 1, name: 1, code: 1 }).lean();

    // Headers for the overview data. 
    const overviewHeaders = [
        { 'code': null, '_id': 'ulb_code', 'isActive': true, 'name': 'ULB Code' },
        { 'code': null, '_id': 'ulb', 'isActive': true, 'name': 'ULB Name' },
        // { 'code': null, '_id': 'population', 'isActive': true, 'name': 'Census 2011 Population'},
        { 'code': null, '_id': 'state', 'isActive': true, 'name': 'State' },
        // { 'code': null, '_id': 'amrut', 'isActive': true, 'name': 'AMRUT'},
        { 'code': null, '_id': 'year', 'isActive': true, 'name': 'Financial Year' },
        { 'code': null, '_id': 'audit_status', 'isActive': true, 'name': 'Audited/ Provisional' },
        { 'code': null, '_id': 'audit_firm', 'isActive': true, 'name': 'Audit firm name' },
        { 'code': null, '_id': 'partner_name', 'isActive': true, 'name': 'Partner name' },
        // { 'code': null, '_id': 'icai_membership_number', 'isActive': true, 'name': 'ICAI No.'},
        { 'code': null, '_id': 'isStandardizable', 'isActive': true, 'name': 'Is Standardizable?' },
        { 'code': null, '_id': 'isStandardizableComment', 'isActive': true, 'name': 'File Comments ' },
        { 'code': null, '_id': 'dataFlagComment', 'isActive': true, 'name': 'Data Comments' },
        { 'code': null, '_id': 'dataFlag', 'isActive': true, 'name': 'No. of Data Flags failed' },
        { 'code': null, '_id': 'totOwnRevenue', 'isActive': true, 'name': 'Total Own Revenue' },
        { 'code': null, '_id': 'totRevenue', 'isActive': true, 'name': 'Total Revenue' },
        { 'code': null, '_id': 'revExpenditure', 'isActive': true, 'name': 'Revenue Expenditure' },
        { 'code': null, '_id': 'totExpenditure', 'isActive': true, 'name': 'Total Expenditure' },
        { 'code': null, '_id': 'capex', 'isActive': true, 'name': 'GB + CWIP' },
        { 'code': null, '_id': 'bsSize', 'isActive': true, 'name': 'Total Balance Sheet Size' }
    ];

    return overviewHeaders.concat(lineItems);
}

// Calculate Totals.
function updateTotals(rowObj, key, lineItemIdStr, amount, categoryArr, categoryKey) {
    if (categoryArr.includes(lineItemIdStr)) {
        if (!rowObj[key][categoryKey]) rowObj[key][categoryKey] = 0;
        if (amount !== null && amount !== "") {
            rowObj[key][categoryKey] += Number(amount);
        }
    }
}

// Fetch data from DB - Input sheet.
async function fetchAllData(findQuery) {
    return ULBLedger.find(findQuery.query, findQuery.projection).cursor();
}
// Fetch data from DB - Overview sheet.
async function fetchAllDataOverview() {
    return LedgerLog.find().cursor();
}

module.exports.getLedgerDump = async (req, res) => {
    try {

        // Create an array of line items (used to define headers of excel)
        let lineitems = await getLineItemsFromDB();

        const findQuery = {};
        findQuery.query = req.query.financialYear ? { financialYear: req.query.financialYear } : {};
        findQuery.projection = { amount: 1, audit_status: 1, financialYear: 1, lineItem: 1, ulb: 1 };

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ledgerDump');

        // Define columns
        const columns = lineitems.map((lineitem) => ({
            header: lineitem.code ? `${lineitem.name} (${lineitem.code})` : lineitem.name,
            key: lineitem._id,
            width: 15
        }));
        worksheet.columns = columns;

        // Fetch data from DB - Overview sheet.
        const overviewData = [];
        const cursorOverview = await fetchAllDataOverview();
        for (let doc = await cursorOverview.next(); doc != null; doc = await cursorOverview.next()) {
            overviewData.push(doc);
        }

        // Iterate through each document in the cursor (array received from DB) - Input Sheet.
        const cursorInputData = await fetchAllData(findQuery);
        let eachRowObj = {};
        for (let doc = await cursorInputData.next(); doc != null; doc = await cursorInputData.next()) {
            const key = `${doc.ulb}_${doc.financialYear}`;

            if (!eachRowObj[key]) {
                eachRowObj[key] = {
                    // ulb_id: doc.ulb,
                    ulb_code: doc.ulb,
                    year: doc.financialYear,
                    audit_status: doc.audit_status
                };
            }
            const lineItemIdStr = doc.lineItem.toString();

            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totOwnRevenueArr, "totOwnRevenue");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totRevenueArr, "totRevenue");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, revExpenditureArr, "revExpenditure");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, totExpenditureArr, "totExpenditure");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, capexArr, "capex");
            updateTotals(eachRowObj, key, lineItemIdStr, doc.amount, bsSizeArr, "bsSize");

            if (doc.amount === null || doc.amount === "") {
                eachRowObj[key][doc.lineItem] = "N/A";
            } else {
                eachRowObj[key][doc.lineItem] = doc.amount;
            }
        }

        // Create a lookup map for overviewData for faster access
        const overviewLookup = overviewData.reduce((acc, ulbObj) => {
            const key = `${ulbObj.ulb_id}_${ulbObj.year}`;
            acc[key] = ulbObj;
            return acc;
        }, {});

        // Iterate through each row in eachRowObj
        Object.values(eachRowObj).forEach((row) => {
            const key = `${row.ulb_code}_${row.year}`;
            const ulbOverviewObj = overviewLookup[key];

            if (ulbOverviewObj) {
                row["ulb_code"] = ulbOverviewObj.ulb_code;
                row["ulb"] = ulbOverviewObj.ulb;
                row["state"] = ulbOverviewObj.state;
                row["audit_firm"] = ulbOverviewObj.audit_firm;
                row["partner_name"] = ulbOverviewObj.partner_name;
                row["icai_membership_number"] = ulbOverviewObj.icai_membership_number;
                row["isStandardizable"] = ulbOverviewObj.isStandardizable;
                row["isStandardizableComment"] = ulbOverviewObj.isStandardizableComment;
                row["dataFlag"] = ulbOverviewObj.dataFlag;
                row["dataFlagComment"] = ulbOverviewObj.dataFlagComment;
            }

            worksheet.addRow(row);
        });

        let filename = `All_Ledgers_${(moment().format("DD-MMM-YY_HH-mm-ss"))}`;
        // Stream the workbook to the response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating ledger dump:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}
