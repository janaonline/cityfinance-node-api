const ExcelJS = require('exceljs');
const moment = require('moment');
const LineItem = require('../../models/LineItem');
const ledgerLog = require('../../models/LedgerLog');
const {
    lineItemsEliminated,
    totOwnRevenueArr,
    totRevenueArr,
    revExpenditureArr,
    totExpenditureArr,
    capexArr,
    bsSizeArr,
} = require('../utils/ledgerFormulas');

// Get Line Items From DB.
async function getLineItemsFromDB(financialData = null) {
    // Headers for the overview data.
    let overviewHeaders = [
        { code: 'code', isActive: true, name: 'ULB Code' },
        { code: 'name', isActive: true, name: 'ULB Name' },
        { code: 'population', isActive: true, name: 'Population' },
        { code: 'state', isActive: true, name: 'State' },
        { code: 'year', isActive: true, name: 'Financial Year' },
        { code: 'lastModifiedAt', isActive: true, name: 'Modified Date' },
        { code: 'audit_status', isActive: true, name: 'Audited/ Provisional' },
        { code: 'audit_firm', isActive: true, name: 'Audit firm name' },
        { code: 'audit_date', isActive: true, name: 'Audit Date' },
        { code: 'partner_name', isActive: true, name: 'Partner name' },
        { code: 'doc_source', isActive: true, name: 'Document Source' },
        { code: 'isStandardizable', isActive: true, name: 'Is Standardizable?' },
        { code: 'isStandardizableComment', isActive: true, name: 'File Comments ' },
        { code: 'dataFlagComment', isActive: true, name: 'Data Comments' },
        { code: 'dataFlag', isActive: true, name: 'No. of Data Flags failed' },
    ];

    // Add Input sheet headers only if financialData = TRUE - If user wants only overview sheet data.
    if (!financialData || financialData?.toLowerCase() == 'false')
        return overviewHeaders;

    // Line items to be calculated (Not stored in DB).
    overviewHeaders = overviewHeaders.concat([
        { code: 'totOwnRevenue', isActive: true, name: 'Total Own Revenue' },
        { code: 'totRevenue', isActive: true, name: 'Total Revenue' },
        { code: 'revExpenditure', isActive: true, name: 'Revenue Expenditure' },
        { code: 'totExpenditure', isActive: true, name: 'Total Expenditure' },
        { code: 'capex', isActive: true, name: 'GB + CWIP' },
        { code: 'bsSize', isActive: true, name: 'Total Balance Sheet Size' },
    ]);

    // Headers (Line items) for the input sheet data.
    const lineItems = await LineItem.find(
        { code: { $nin: lineItemsEliminated } },
        { _id: 1, isActive: 1, name: 1, code: 1 }
    ).lean();

    lineItems.forEach((item) => {
        item.code = Number(item.code);
        item.isLineItem = true;
    });
    lineItems.sort((a, b) => a.code - b.code);

    return overviewHeaders.concat(lineItems);
}

// Fetch data from DB - ledgerLogs.
async function fetchLedgerLogs(ulbCode = null, year = null, stateCode = null, isStandardizable = null, financialData = 'false') {
    // Filter conditions on `ledgerLogs` collection.
    const matchCondition = {};
    if (isStandardizable?.toLowerCase() == 'false')
        matchCondition['isStandardizable'] = { $ne: 'No' };
    if (ulbCode) matchCondition['ulb_code'] = ulbCode;
    if (stateCode) matchCondition['state_code'] = stateCode;
    if (year) matchCondition['year'] = year;

    // Filter conditions on `ulbs` collection.
    const matchCondition2 = {
        // $expr: { $and: [{ $eq: ["$_id", "$$ulbId"] }, { $eq: ["$state", ObjectId(stateId)] }] },
        $expr: { $eq: ['$_id', '$$ulbId'] },
        isActive: true,
    };

    // If financialData = false remove lineItems.
    const hideLineItems = {};
    if (financialData?.toLowerCase() == 'false') hideLineItems['lineItems'] = 0;

    const query = [
        { $match: matchCondition },
        {
            $project: {
                excel_url: 0,
                wards: 0,
                ulb_code: 0,
                ulb_code_year: 0,
                state_code: 0,
                population: 0,
                financialYear: 0,
                design_year: 0,
                area: 0,
                tracker: 0,
                verified_by: 0,
                verified_at: 0,
                icai_membership_number: 0,
                created_by: 0,
                created_at: 0,
                reverified_at: 0,
                reverified_by: 0,
                ...hideLineItems,
            },
        },
        {
            $addFields: {
                totOwnRevenue: { $sum: totOwnRevenueArr },
                totRevenue: { $sum: totRevenueArr },
                revExpenditure: { $sum: revExpenditureArr },
                totExpenditure: { $sum: totExpenditureArr },
                capex: { $sum: capexArr },
                bsSize: { $sum: bsSizeArr },
            },
        },
        {
            $lookup: {
                from: 'ulbs',
                let: { ulbId: '$ulb_id' },
                pipeline: [
                    { $match: matchCondition2 },
                    {
                        $project: {
                            name: 1,
                            code: 1,
                            population: 1,
                        },
                    },
                ],
                as: 'ulbData',
            },
        },
        {
            $unwind: {
                path: '$ulbData',
                preserveNullAndEmptyArrays: false,
            },
        },
    ];

    return ledgerLog.aggregate(query).cursor().exec();
}

module.exports.getLedgerDump = async (req, res) => {
    try {
        const { ulbCode, stateCode, financialData, year, isStandardizable } = req.query;

        if (ulbCode && stateCode && !ulbCode.includes(stateCode))
            throw new Error(`Mismatch: ULB with '${ulbCode}' is not part of '${stateCode}'.`);

        if (isStandardizable?.toLowerCase() == 'false' && financialData?.toLowerCase() == 'true')
            throw new Error('"financialData" cannot be "TRUE" if "isStandardizable" is "FALSE"');

        // Create an array of line items (used to define headers of excel)
        const lineitems = await getLineItemsFromDB(financialData);

        // Create workbook.
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
        const fileName = `All_Ledgers_${moment().format('DD-MMM-YY_HH-mm-ss')}`;
        const sheet = workbook.addWorksheet('Ledger Dump');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);

        // Define columns - Add the headers to worksheet.
        sheet.columns = lineitems.map((lineitem) => ({
            header: lineitem.isLineItem
                ? `${lineitem.name} (${lineitem.code})`
                : lineitem.name,
            key: lineitem.code,
            width: 15,
        }));

        // Fetch data from ledgerLogs - DB.
        const cursorLedger = await fetchLedgerLogs(ulbCode, year, stateCode, isStandardizable, financialData);
        for (let doc = await cursorLedger.next(); doc != null; doc = await cursorLedger.next()) {
            // Input: { a: 1, b: 2, c: { p: 1, q: 2 }, d: { r: 1 } }
            // Output: { a: 1, b: 2, p: 1, q: 2, r: 1 }; Only one layer.
            const { ulbData, lineItems, ...rest } = doc;
            const flatObj = { ...rest, ...ulbData, ...lineItems };
            sheet.addRow(flatObj).commit();
        }

        sheet.commit();
        await workbook.commit();
        res.end();

    } catch (error) {
        console.error('Error generating ledger dump:', error);
        res.status(500).send(`Error: ${error.message}`);
    }
};
