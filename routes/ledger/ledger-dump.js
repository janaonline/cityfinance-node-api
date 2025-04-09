const LineItem = require('../../models/LineItem');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const { getDate } = require('../../util/helper')
const ExcelJS = require('exceljs');
const moment = require('moment');
const ObjectId = require("mongoose").Types.ObjectId;

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
    '5dd10c2685c951b54ec1d766',
];

// Line items eliminated: ["1001", "1002", "1003", "1004", "1005", "1006", "1007"]
const lineItemEliminated = [
    ObjectId('5df8c7b9f280e1079283cf37'),
    ObjectId('5df8c7d2f280e1079283cf38'),
    ObjectId('5df8c7e4f280e1079283cf39'),
    ObjectId('5df8c7f1f280e1079283cf3a'),
    ObjectId('5df8c7fdf280e1079283cf3b'),
    ObjectId('5df8c80df280e1079283cf3c'),
    ObjectId('5df8c826f280e1079283cf3d'),
];

// Get Line Items From DB.
async function getLineItemsFromDB(financialData = null) {
    // Headers for the overview data. 
    let overviewHeaders = [
        { 'code': null, '_id': 'code', 'isActive': true, 'name': 'ULB Code' },
        { 'code': null, '_id': 'name', 'isActive': true, 'name': 'ULB Name' },
        { 'code': null, '_id': 'population', 'isActive': true, 'name': 'Population' },
        { 'code': null, '_id': 'state', 'isActive': true, 'name': 'State' },
        // { 'code': null, '_id': 'amrut', 'isActive': true, 'name': 'AMRUT'},
        { 'code': null, '_id': 'year', 'isActive': true, 'name': 'Financial Year' },
        { 'code': null, '_id': 'lastModifiedAt', 'isActive': true, 'name': 'Modified Date' },
        { 'code': null, '_id': 'audit_status', 'isActive': true, 'name': 'Audited/ Provisional' },
        { 'code': null, '_id': 'audit_firm', 'isActive': true, 'name': 'Audit firm name' },
        { 'code': null, '_id': 'audit_date', 'isActive': true, 'name': 'Audit Date' },
        { 'code': null, '_id': 'partner_name', 'isActive': true, 'name': 'Partner name' },
        // { 'code': null, '_id': 'icai_membership_number', 'isActive': true, 'name': 'ICAI No.'},
        { 'code': null, '_id': 'doc_source', 'isActive': true, 'name': 'Document Source' },
        { 'code': null, '_id': 'isStandardizable', 'isActive': true, 'name': 'Is Standardizable?' },
        { 'code': null, '_id': 'isStandardizableComment', 'isActive': true, 'name': 'File Comments ' },
        { 'code': null, '_id': 'dataFlagComment', 'isActive': true, 'name': 'Data Comments' },
        { 'code': null, '_id': 'dataFlag', 'isActive': true, 'name': 'No. of Data Flags failed' },
    ];

    // Add Input sheet headers only if financialData = TRUE - If user wants only overview sheet data.
    if (!financialData || financialData?.toLowerCase() == 'false') return overviewHeaders;

    // Line items to be calculated (Not stored in DB).
    overviewHeaders = overviewHeaders.concat([
        { 'code': null, '_id': 'totOwnRevenue', 'isActive': true, 'name': 'Total Own Revenue' },
        { 'code': null, '_id': 'totRevenue', 'isActive': true, 'name': 'Total Revenue' },
        { 'code': null, '_id': 'revExpenditure', 'isActive': true, 'name': 'Revenue Expenditure' },
        { 'code': null, '_id': 'totExpenditure', 'isActive': true, 'name': 'Total Expenditure' },
        { 'code': null, '_id': 'capex', 'isActive': true, 'name': 'GB + CWIP' },
        { 'code': null, '_id': 'bsSize', 'isActive': true, 'name': 'Total Balance Sheet Size' }
    ])

    // Headers (Line items) for the input sheet data.
    const lineItems = await LineItem.find({ "code": { $nin: ["1001", "1002", "1003", "1004", "1005", "1006", "1007"] } }, { _id: 1, isActive: 1, name: 1, code: 1 }).lean();
    // const lineItems = await LineItem.find({}, { _id: 1, isActive: 1, name: 1, code: 1 }).lean();
    lineItems.forEach(item => {
        item.code = Number(item.code);
    });
    lineItems.sort((a, b) => a.code - b.code);

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
async function fetchAllData(ulbCode = null, year = null, stateId = null) {
    const matchCondition = { isActive: true };
    if (ulbCode) matchCondition['code'] = ulbCode;
    if (stateId) matchCondition['state'] = ObjectId(stateId);

    const matchCondition2 = [{ $eq: ['$ulb', '$$ulbId'] }];
    if (year) matchCondition2.push({ $eq: ["$financialYear", year] });

    const matchCondition3 = [{ $not: { $in: ["$$ulbledger.lineItem", lineItemEliminated] } }];

    const query = [
        { $match: matchCondition },
        { $project: { _id: 1 } },
        {
            $lookup: {
                from: "ulbledgers",
                let: { ulbId: '$_id' },
                pipeline: [{ $match: { $expr: { $and: matchCondition2 } } }],
                as: "ulbledgers"
            }
        },
        {
            $project: {
                ulbledgers: {
                    $filter: {
                        input: "$ulbledgers",
                        as: "ulbledger",
                        cond: { $and: matchCondition3 }
                    }
                }
            }
        },
        {
            $project: {
                "ulbledgers.lineItem": 1,
                "ulbledgers.amount": 1,
                "ulbledgers.financialYear": 1
            }
        }
    ];

    return Ulb.aggregate(query).cursor().exec();
}
// Fetch data from DB - Overview sheet.
async function fetchAllDataOverview(ulbCode = null, year = null, stateId = null, isStandardizable = null) {
    const matchCondition = { isActive: true };
    if (ulbCode) matchCondition['code'] = ulbCode;
    if (stateId) matchCondition['state'] = ObjectId(stateId);

    const matchCondition2 = [{ $eq: ['$ulb_id', '$$ulbId'] }];
    if (year) matchCondition2.push({ $eq: ["$year", year] });
    if (isStandardizable?.toLowerCase() == 'false') matchCondition2.push({ $eq: ['$isStandardizable', 'No'] });

    const query = [
        { $match: matchCondition },
        {
            $project: {
                _id: 1,
                code: 1,
                name: 1,
                state: 1,
                population: 1
            }
        },
        {
            $lookup: {
                from: "ledgerlogs",
                let: { ulbId: "$_id" },
                pipeline: [{ $match: { $expr: { $and: matchCondition2 } } }],
                as: "ledgerlogs"
            }
        },
        { $match: { "ledgerlogs.0": { $exists: true } } },
        {
            $project: {
                "stateData": 0,
                "ledgerlogs.excel_url": 0,
                "ledgerlogs.wards": 0,
                "ledgerlogs.ulb_code": 0,
                // "ledgerlogs.ulb": 0,
                "ledgerlogs.state_code": 0,
                // "ledgerlogs.state": 0,
                "ledgerlogs.population": 0,
                "ledgerlogs.financialYear": 0,
                "ledgerlogs.design_year": 0,
                "ledgerlogs.area": 0,
                "ledgerlogs.tracker": 0,
                "ledgerlogs.verified_by": 0,
                "ledgerlogs.verified_at": 0,
                "ledgerlogs.icai_membership_number": 0,
                "ledgerlogs.dataFlagComment": 0,
                "ledgerlogs.created_by": 0,
                "ledgerlogs.created_at": 0,
            }
        }
    ];

    return Ulb.aggregate(query).cursor().exec();
}
// Get _id from states collection based on state code.
// Eg: Input: AP; Output: 5dcf9d7216a06aed41c748dd
async function getStateId(stateCode = false) {
    if (!stateCode) return null;
    const state = await State.findOne({ code: stateCode }, { _id: 1 }).lean();
    return state?._id || null;
}

module.exports.getLedgerDump = async (req, res) => {
    try {
        const { ulbCode, stateCode, financialData, year, isStandardizable } = req.query;

        if (ulbCode && stateCode && !ulbCode.includes(stateCode))
            throw new Error(`Mismatch: ULB with '${ulbCode}' is not part of '${stateCode}'.`);

        if (isStandardizable?.toLowerCase() == 'false' && financialData?.toLowerCase() == 'true')
            throw new Error('"financialData" cannot be "TRUE" if "isStandardizable" is "FALSE"');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ledgerDump');
        const stateId = await getStateId(stateCode);

        // Create an array of line items (used to define headers of excel)
        const lineitems = await getLineItemsFromDB(financialData);

        // Define columns - Add the headers to worksheet.
        const columns = lineitems.map((lineitem) => ({
            header: lineitem.code ? `${lineitem.name} (${lineitem.code})` : lineitem.name,
            key: lineitem._id,
            width: 15
        }));
        worksheet.columns = columns;

        // Fetch data from DB - Overview sheet; Memoize overview collection in overviewData{}
        // Eg: ulbId_year - 5dd24729437ba31f7eb42e94_2020-21
        const overviewData = {};
        const cursorOverview = await fetchAllDataOverview(ulbCode, year, stateId, isStandardizable);
        for (let doc = await cursorOverview.next(); doc != null; doc = await cursorOverview.next()) {
            // if (doc?.code == 'MH213') console.log("doc", JSON.stringify(doc, null, 2))
            let { _id, population, state, code, name, lastModifiedAt } = doc;
            for (let eachYearOverviewData of doc.ledgerlogs) {
                let key = `${doc._id}_${eachYearOverviewData.year}`;
                overviewData[key] = Object.assign({}, { _id, population, state, code, name, lastModifiedAt }, eachYearOverviewData);
            }
        }

        // If financialData = TRUE - User wants input sheet data.
        if (financialData?.toLowerCase() == 'true') {
            // Iterate through each document in the cursor (array received from DB) - Input Sheet.
            const cursorInputData = await fetchAllData(ulbCode, year, stateId);
            let eachRowObj = {};
            for (let doc = await cursorInputData.next(); doc != null; doc = await cursorInputData.next()) {
                for (let eachLineItem of doc.ulbledgers) {
                    const key = `${doc._id}_${eachLineItem.financialYear}`;
                    if (!eachRowObj[key]) {
                        eachRowObj[key] = {
                            ulb_id: doc._id,
                            year: eachLineItem.financialYear,
                            code: doc.ulb_id,
                        };
                    }
                    const lineItemIdStr = eachLineItem.lineItem.toString();

                    // Calculate fields dynamically.
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, totOwnRevenueArr, "totOwnRevenue");
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, totRevenueArr, "totRevenue");
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, revExpenditureArr, "revExpenditure");
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, totExpenditureArr, "totExpenditure");
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, capexArr, "capex");
                    updateTotals(eachRowObj, key, lineItemIdStr, eachLineItem.amount, bsSizeArr, "bsSize");

                    if (eachLineItem.amount !== null && eachLineItem.amount !== "") {
                        eachRowObj[key][eachLineItem.lineItem] = eachLineItem.amount;
                    }
                }
            }

            // Iterate through each row in eachRowObj (input sheet data), add overview data.
            Object.values(eachRowObj).forEach((row) => {
                const key = `${row.ulb_id}_${row.year}`;
                const ulbOverviewObj = overviewData[key];
                if (ulbOverviewObj) {
                    Object.assign(row, ulbOverviewObj)
                    row['lastModifiedAt'] = getDate(ulbOverviewObj.lastModifiedAt);
                }
                if (!row.code) row['code'] = row.ulb_id;
                delete overviewData[key];
                worksheet.addRow(row);
            });
        }

        // Add the remaining data from "Overview" collection - input data unavailable.
        Object.values(overviewData).forEach((row) => {
            row.lastModifiedAt = getDate(row.lastModifiedAt);
            worksheet.addRow(row);
        });

        // Stream the workbook to the response
        let filename = `All_Ledgers_${(moment().format("DD-MMM-YY_HH-mm-ss"))}`;
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        res.send(buffer);
        res.end();

    } catch (error) {
        console.error('Error generating ledger dump:', error.message);
        res.status(500).send(`Error: ${error.message}`);
    }
}
