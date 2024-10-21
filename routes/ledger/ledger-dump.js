const LineItem = require('../../models/LineItem');
const Ulb = require('../../models/Ulb');
const ExcelJS = require('exceljs');
const moment = require('moment');
const ObjectId = require("mongoose").Types.ObjectId

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
async function getLineItemsFromDB() {

    // Headers for the input sheet data.
    const lineItems = await LineItem.find({ "code": { $nin: ["1001", "1002", "1003", "1004", "1005", "1006", "1007"] } }, { _id: 1, isActive: 1, name: 1, code: 1 }).lean();
    // const lineItems = await LineItem.find({}, { _id: 1, isActive: 1, name: 1, code: 1 }).lean();
    lineItems.forEach(item => {
        item.code = Number(item.code);
    });
    lineItems.sort((a, b) => a.code - b.code);

    // Headers for the overview data. 
    const overviewHeaders = [
        { 'code': null, '_id': 'ulb_code', 'isActive': true, 'name': 'ULB Code' },
        { 'code': null, '_id': 'ulb', 'isActive': true, 'name': 'ULB Name' },
        { 'code': null, '_id': 'population', 'isActive': true, 'name': 'Population' },
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
async function fetchAllData(yearFromQuery) {
    // return ULBLedger.find(findQuery.query, findQuery.projection).cursor();

    let matchCondition = [{ $not: { $in: ["$$ulbledger.lineItem", lineItemEliminated] } }];
    // if (yearFromQuery) matchCondition.push({ $eq: ["$$ulbledger.financialYear", yearFromQuery] });

    return Ulb.aggregate(
        [
            { $match: { isActive: true } },
            { $project: { _id: 1 } },
            {
                $lookup: {
                    from: "ulbledgers",
                    localField: "_id",
                    foreignField: "ulb",
                    as: "ulbledgers"
                }
            },
            {
                $project: {
                    ulbledgers: {
                        $filter: {
                            input: "$ulbledgers",
                            as: "ulbledger",
                            cond: { $and: matchCondition }
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
        ]

    ).cursor().exec();
}
// Fetch data from DB - Overview sheet.
async function fetchAllDataOverview(yearFromQuery) {
    // return LedgerLog.find({ ulb: ObjectId("5dd24b8f91344e2300876ca9") }).cursor();

    // let matchCondition = {};
    // if (yearFromQuery) matchCondition = { $eq: ["$$ledgerlog.year", yearFromQuery] };

    return Ulb.aggregate(
        [
            { $match: { isActive: true } },
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
                    localField: "_id",
                    foreignField: "ulb_id",
                    as: "ledgerlogs"
                }
            },
            // {
            //     $project: {
            //         ledgerlogs: {
            //             $filter: {
            //                 input: "$ledgerlogs",
            //                 as: "ledgerlog",
            //                 cond: matchCondition
            //             }
            //         }
            //     }
            // },
            {
                $project: {
                    "ledgerlogs.excel_url": 0,
                    "ledgerlogs.wards": 0,
                    "ledgerlogs.ulb_code": 0,
                    // "ledgerlogs.ulb": 0,
                    "ledgerlogs.state_code": 0,
                    // "ledgerlogs.state": 0,
                    "ledgerlogs.population": 0,
                    "ledgerlogs.lastModifiedAt": 0,
                    "ledgerlogs.financialYear": 0,
                    "ledgerlogs.design_year": 0,
                    "ledgerlogs.area": 0
                }
            }
        ]
    ).cursor().exec();
}

module.exports.getLedgerDump = async (req, res) => {
    try {
        // Create an array of line items (used to define headers of excel)
        let lineitems = await getLineItemsFromDB();

        let yearFromQuery = req.query.financialYear || "";
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
        const overviewData = {};
        const cursorOverview = await fetchAllDataOverview(yearFromQuery);
        for (let doc = await cursorOverview.next(); doc != null; doc = await cursorOverview.next()) {
            // console.log("doc", JSON.stringify(doc, null, 2))
            let { _id, population, state, code, name } = doc;
            for (let eachYearOverviewData of doc.ledgerlogs) {
                let key = `${doc._id}_${eachYearOverviewData.year}`;
                overviewData[key] = Object.assign({}, { _id, population, state, code, name }, eachYearOverviewData);
            }
        }

        // Iterate through each document in the cursor (array received from DB) - Input Sheet.
        const cursorInputData = await fetchAllData(yearFromQuery);
        let eachRowObj = {};
        for (let doc = await cursorInputData.next(); doc != null; doc = await cursorInputData.next()) {
            for (let eachLineItem of doc.ulbledgers) {
                const key = `${doc._id}_${eachLineItem.financialYear}`;
                if (!eachRowObj[key]) {
                    eachRowObj[key] = {
                        ulb_id: doc._id,
                        year: eachLineItem.financialYear,
                    };
                }
                const lineItemIdStr = eachLineItem.lineItem.toString();

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
        // console.log("eachRowObj", JSON.stringify(eachRowObj, null, 2));

        // Iterate through each row in eachRowObj
        Object.values(eachRowObj).forEach((row) => {
            const key = `${row.ulb_id}_${row.year}`;
            const ulbOverviewObj = overviewData[key];

            if (ulbOverviewObj) {
                // row["year"] = ulbOverviewObj.year;
                row["ulb_code"] = ulbOverviewObj.code; // from ulbs collection.
                row["population"] = ulbOverviewObj.population; // from ulbs collection.
                row["ulb"] = ulbOverviewObj.name; // from ulbs collection.
                row["state"] = ulbOverviewObj.state;
                row["audit_status"] = ulbOverviewObj.audit_status;
                row["audit_firm"] = ulbOverviewObj.audit_firm;
                row["partner_name"] = ulbOverviewObj.partner_name;
                row["icai_membership_number"] = ulbOverviewObj.icai_membership_number;
                row["isStandardizable"] = ulbOverviewObj.isStandardizable;
                row["isStandardizableComment"] = ulbOverviewObj.isStandardizableComment;
                row["dataFlag"] = ulbOverviewObj.dataFlag;
                row["dataFlagComment"] = ulbOverviewObj.dataFlagComment;
            }

            delete overviewData[key];
            worksheet.addRow(row);
        });

        // Add the remaining data from "Overview" collection.
        Object.values(overviewData).forEach((row) => {
            let tempObj = {};
            tempObj["ulb_code"] = row.code; // from ulbs collection.
            tempObj["population"] = row.population; // from ulbs collection.
            tempObj["ulb"] = row.name; // from ulbs collection.
            tempObj["year"] = row.year;
            tempObj["state"] = row.state;
            tempObj["audit_status"] = row.audit_status;
            tempObj["audit_firm"] = row.audit_firm;
            tempObj["partner_name"] = row.partner_name;
            tempObj["icai_membership_number"] = row.icai_membership_number;
            tempObj["isStandardizable"] = row.isStandardizable;
            tempObj["isStandardizableComment"] = row.isStandardizableComment;
            tempObj["dataFlag"] = row.dataFlag;
            tempObj["dataFlagComment"] = row.dataFlagComment;

            worksheet.addRow(tempObj);
        })

        // Stream the workbook to the response
        let filename = `All_Ledgers_${(moment().format("DD-MMM-YY_HH-mm-ss"))}`;
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        res.send(buffer);
        res.end();

    } catch (error) {
        console.error('Error generating ledger dump:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}
