const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../../models/Ulb');
const LineItem = require('../../../models/LineItem');
const LedgerLog = require('../../../models/LedgerLog');
const { populationCategoryData } = require('../../utils/queryTemplates');
const { getPopulationCategory } = require('../../common/common');
const { totRevenueArr, totOwnRevenueArr, revExpenditureArr, capexArr } = require('../../utils/ledgerFormulas');
const ALLOWED_COMPARE_TYPES = ['ulb', 'state', 'national', 'popCat', 'ulbType', 'ulbs'];
const ALLOWED_LINEITEMS = ['revenue', 'ownRevenue', 'revex', 'capex'];
const CAPEX = ['capex'];
const ALLOWED_CALC_TYPES = ['total', 'perCapita', 'mix'];
const LINE_ITEMS_MAP = {
    'revenue': totRevenueArr,
    'ownRevenue': totOwnRevenueArr,
    'revex': revExpenditureArr,
    'capex': capexArr,
};
const LABEL_MAP = {
    ulb: '$ulbName',
    popCat: 'Population category Avg',
    ulbType: 'ULB Type Avg',
    state: 'State Avg',
    national: 'National Avg'
};
const OWN_REV = ['100', ...totOwnRevenueArr.map(e => e.split('.')[1])];
const GRAPH_COLORS = ["#62b6cb", "#1b4965", "#bee9e8", "#43B5A0", "#F4A261", "#5885AF", "#F6D743", '#f43f5e', '#B388FF'];
const LINE_COLOR = '#f43f5e';
const ROUND_UP = 0;

// TODO: Clean code - DRY

/**
 * 
 * @param {string[]} years: arrray of years.
 * @param {string[]} compareType: must be ALLOWED_COMPARE_TYPES
 * @param {string} ulbId
 * @param {string} lineItem: must be ALLOWED_LINEITEMS
 * @param {string} calcType: must be ALLOWED_CALC_TYPES
 * @param {string[]} compareUlbs: array of ulb ids.
 */
module.exports.financialIndicators = async (req, res) => {
    try {
        const { years, compareType, ulbId, lineItem, calcType, compareUlbs } = req.body;

        // Validate req.body.
        validateReqBody(req.body);

        // Add Year-1 (For calculating CAGR one extra year is required.)
        years.sort((a, b) => a.localeCompare(b));
        if (CAPEX.includes(lineItem)) {
            const year = years[0].split('-').map((y) => Number(y - 1)).join('-');
            years.unshift(year);
        }

        // Get line items.
        const lineItemsResult = await LineItem.find({}, { code: 1, name: 1 });
        const lineItemsMap = Object.fromEntries(lineItemsResult.map(doc => [doc.code, doc.name]));

        // Get ulb data.
        const ulbData = await Ulb.findById(ulbId).lean();
        if (!ulbData) return res.status(404).json({ success: false, error: 'ULB not found' });
        const populationCategory = getPopulationCategory(ulbData.population);

        // This will work as key(s) for compare data.
        const compareIdMap = {
            ulb: ulbId,
            state: ulbData.state?.toString(),
            ulbType: ulbData.ulbType,
            popCat: populationCategory,
        };

        // Handle comparison types
        let data = {};
        if (calcType === 'mix') {
            const mixData = await getMixData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType);
            data = createResStructureMixData(mixData, lineItemsMap);
        } else if (calcType === 'total') {
            const totalData = await getWeightedAvgData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType);
            data = createResStructureWeighedAvgData(totalData, lineItem, years);
        } else if (calcType === 'perCapita') {
            const perCapitaData = await getPerCapitaData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType)
            data = createResStructurePerCapitaData(perCapitaData, lineItem, years);
        } else throw new Error("Invalid calcType");

        return res.status(200).json({
            success: data.success !== false,
            data,
        });
    } catch (err) {
        console.error('Failed to get financial data', err);
        return res
            .status(500)
            .json({ success: false, error: `Error: ${err.message}` });
    }
};

// Validate request body.
const validateReqBody = ({ years, compareType, ulbId, lineItem, calcType, compareUlbs }) => {
    if (!Array.isArray(years) || years.length === 0) {
        throw new Error("Parameter 'years' is required and must be a non-empty array.");
    } else {
        // Year must be between 2015-16 and 2026-27 (inclusive)
        const regex = /^(201[5-9]|202[0-6])-(?:1[6-9]|2[0-7])$/
        const bool = years.every((year) => regex.test(year));
        if (!bool)
            throw new Error("'years' has invalid year.");
    }

    if (!compareType.length || !ALLOWED_COMPARE_TYPES.includes(compareType)) {
        throw new Error("Parameter 'compareType' is required.");
    }

    if (!ulbId || !ObjectId.isValid(ulbId)) {
        throw new Error("Parameter 'ulbId' is required and must be a valid ObjectId.");
    }

    if (!lineItem || !ALLOWED_LINEITEMS.includes(lineItem)) {
        throw new Error("Parameter 'lineItem' is invalid.");
    }

    if (!calcType || !ALLOWED_CALC_TYPES.includes(calcType)) {
        throw new Error("Parameter 'type' is invalid.");
    }

    if (compareType === 'ulbs') {
        if (!Array.isArray(compareUlbs)) {
            throw new Error("Parameter 'compareUlbs' must be an array when compareType is 'ulbs'.");
        }

        if (compareUlbs.length < 1 || compareUlbs.length > 3) {
            throw new Error("You must provide between 1 and 3 ULBs to compare when compareType is 'ulbs'.");
        }

        const invalidIds = compareUlbs.filter(id => !ObjectId.isValid(id));
        if (invalidIds.length > 0) {
            throw new Error(`Invalid ObjectIds in 'compareUlbs': ${invalidIds.join(', ')}`);
        }
    }
}

// -----  MIX DATA -----
// Get mix data.
async function getMixData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType) {
    let compareQueries = [];

    // Always fetch ULB data - for only 1 year.
    const ulbQuery = buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], ulbId, 'ulb', lineItem);

    if (Array.isArray(compareUlbs) && compareType === 'ulbs') {
        // Case: Compare with up to 3 ULBs (by ID)
        compareQueries = compareUlbs.slice(0, 3).map(id =>
            buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], id, 'ulb', lineItem)
        );
    } else {
        // Case: Compare with one of national/state/popCat/ulbType
        const compareId = compareIdMap[compareType] || '';
        compareQueries = [buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], compareId, compareType, lineItem)];
    }

    // Run all queries in parallel
    const [ulbLedgerData, ...compareResults] = await Promise.all([
        LedgerLog.aggregate(ulbQuery),
        ...compareQueries.map(query => LedgerLog.aggregate(query)),
    ]);


    // Response object
    return { ulbLedgerData, compareResults };
}

// Get mix query.
function buildMixPipeline(lineItemsArr, year, compareId, groupBy, lineItem) {
    if (!Array.isArray(lineItemsArr) || lineItemsArr.length === 0) {
        throw new Error("lineItemsArr must be a non-empty array.");
    }

    const fields = lineItemsArr.map(lineItem => lineItem.split('.')[1]);
    const matchStage = {
        isStandardizable: { $ne: 'No' },
        year
    };
    const groupStage = {
        _id: { year: "$year" },
        'ulbName': { $first: "$ulbsData.name" },
        // 'state': { $first: "$ulbsData.state" },
        // 'ulbType': { $first: "$ulbsData.ulbType" },
        // 'popCat': { $first: "$popCat" },
    };
    const matchFromUlbs = {
        'ulbsData.isActive': true,
        'ulbsData.isPublish': true
    };

    // Dynamic match condition based on groupBy
    const groupByMapping = {
        ulb: () => (matchStage["ulb_id"] = ObjectId(compareId)),
        state: () => (matchFromUlbs["ulbsData.state"] = ObjectId(compareId)),
        ulbType: () => (matchFromUlbs["ulbsData.ulbType"] = ObjectId(compareId)),
        popCat: () => (matchFromUlbs["popCat"] = compareId)
    };

    if (groupBy in groupByMapping) {
        groupByMapping[groupBy]();
    }

    // Add sum fields for each metric
    fields.forEach(key => {
        groupStage[`total${key}`] = { $sum: `$lineItems.${key}` };
    });

    // Calculate total of all metrics
    const addFieldsStageTotal = {
        total: {
            $add: fields.map(key => `$total${key}`)
        }
    };

    // Calculate mix (percentage) for each metric
    const addFieldsStageMix = {};
    fields.forEach(key => {
        addFieldsStageMix[`mix${key}`] = {
            $cond: [
                { $ne: ["$total", 0] },
                {
                    $round: [
                        { $multiply: [{ $divide: [`$total${key}`, "$total"] }, 100] },
                        ROUND_UP
                    ]
                },
                0
            ]
        };
    });

    // Final projection stage
    const projectStage = {
        _id: 0,
        year: "$_id.year",
        groupBy: groupBy,
        lineItem,
        // state: 1,
        // ulbType: 1,
        // popCat: 1,
        mix: Object.fromEntries(fields.map(key => [key, `$mix${key}`]))
    };

    // Will be used as label for the chart.
    if (LABEL_MAP.hasOwnProperty(groupBy)) {
        projectStage.label = LABEL_MAP[groupBy];
    }

    // Final aggregation pipeline
    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "ulbs",
                localField: "ulb_id",
                foreignField: "_id",
                as: "ulbsData"
            }
        },
        { $unwind: { path: "$ulbsData", preserveNullAndEmptyArrays: false } },
        { $addFields: { popCat: populationCategoryData('$ulbsData.population') } },
        { $match: matchFromUlbs },
        { $group: groupStage },
        { $addFields: addFieldsStageTotal },
        { $addFields: addFieldsStageMix },
        { $project: projectStage }
    ];

    // console.log(JSON.stringify(pipeline, null, 2))
    return pipeline;
}

// Create response structure.
function createResStructureMixData(mixData, lineItemsMap) {
    // console.log(mixData)
    if (!mixData.ulbLedgerData.length) return { msg: 'Data not available.', success: false }

    const { ulbLedgerData, compareResults } = mixData;
    const lineItem = ulbLedgerData[0].lineItem;
    const ulbData = ulbLedgerData[0].mix;

    const lineItemKeys = Object.keys(ulbData);
    const legendColors = GRAPH_COLORS.slice(0, lineItemKeys.length);
    const labels = [];

    const data = [];

    // Reusable function to transform data
    const buildDataArray = (mix) => {
        let ownRevenue = 0;
        const remainingData = [];
        const labelList = [];

        for (const [code, value] of Object.entries(mix)) {
            if (OWN_REV.includes(code) && lineItem === 'revenue') {
                ownRevenue += value;
            } else {
                remainingData.push(value);
                labelList.push(lineItemsMap[code] || code);
            }
        }

        return { ownRevenue, remainingData, labelList };
    };

    // Primary ULB data
    const { ownRevenue, remainingData, labelList } = buildDataArray(ulbData);
    if (lineItem === 'revenue') labels.push('Own revenue', ...labelList);
    else labels.push(...labelList);

    data.push({
        label: ulbLedgerData[0].label,
        data: [ownRevenue, ...remainingData],
    });

    // Comparison data
    for (const compArr of compareResults) {
        const firstItem = compArr[0];
        const compLabel = firstItem?.label || 'Data unavailable';

        if (firstItem) {
            if (lineItem === 'revenue') {
                const { ownRevenue, remainingData } = buildDataArray(firstItem.mix);
                data.push({
                    label: compLabel,
                    data: [ownRevenue, ...remainingData],
                });
            } else {
                data.push({
                    label: compLabel,
                    data: Object.values(firstItem.mix),
                });
            }
        } else {
            data.push({ label: compLabel, data: [] });
        }
    }

    return {
        chartType: 'gaugeChart',
        labels,
        legendColors,
        data
    };

}

// -----  TOTAL(s)/ Weighed Avg DATA -----
// Get Weighed data.
async function getWeightedAvgData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType) {
    let compareQueries = [];

    // Always fetch ULB data - for only 1 year.
    const ulbQuery = buildWeightedAvgPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, ulbId, 'ulb', compareIdMap);

    if (Array.isArray(compareUlbs) && compareType === 'ulbs') {
        // Case: Compare with up to 3 ULBs (by ID)
        compareQueries = compareUlbs.slice(0, 3).map(id =>
            buildWeightedAvgPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, id, 'ulb', compareIdMap)
        );
    } else {
        // Case: Compare with one of national/state/popCat/ulbType
        const compareId = compareIdMap[compareType] || '';
        compareQueries = [buildWeightedAvgPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, compareId, compareType, compareIdMap)];
    }

    // Run all queries in parallel
    const [ulbLedgerData, ...compareResults] = await Promise.all([
        LedgerLog.aggregate(ulbQuery),
        ...compareQueries.map(query => LedgerLog.aggregate(query)),
    ]);


    // Response object
    return { ulbLedgerData, compareResults };
}

function buildWeightedAvgPipeline(lineItem, lineItemsArr, yearsArr, compareId, groupBy, compareIdMap) {
    // console.log("----------------------", compareId, groupBy)
    // const ulbTypeId = compareIdMap.ulbType
    // if (!ulbTypeId) throw new Error("ULB type is required.");

    if (!Array.isArray(lineItemsArr) || lineItemsArr.length === 0) {
        throw new Error("lineItemsArr must be a non-empty array.");
    }

    // Match input data
    const matchStage = {
        isStandardizable: { $ne: 'No' },
        year: { $in: yearsArr }
    };

    // Lookup ULB data
    const matchFromUlbs = {
        'ulbsData.isActive': true,
        'ulbsData.isPublish': true,
    };

    // if (groupBy !== 'ulb')
    //     matchFromUlbs['ulbsData.ulbType'] = new ObjectId(ulbTypeId);


    // Dynamic filters for groupBy
    const groupByFilters = {
        ulb: () => (matchStage["ulb_id"] = new ObjectId(compareId)),
        state: () => (matchFromUlbs["ulbsData.state"] = new ObjectId(compareId)),
        ulbType: () => (matchFromUlbs["ulbsData.ulbType"] = new ObjectId(compareId)),
        popCat: () => (matchFromUlbs["popCat"] = compareId),
        national: () => { }
    };

    if (groupByFilters[groupBy]) groupByFilters[groupBy]();

    // Add selectedTotal field
    const addSelectedTotalStage = {
        selectedTotal: {
            $add: lineItemsArr.map(expr => ({ $ifNull: [expr, 0] }))
        }
    };

    // To calculate capex add previous years value and subtract from current year.
    let capex = [];
    if (CAPEX.includes(lineItem)) capex = getCapexStage(yearsArr[0]);

    // Project weighted value
    const projectStage = {
        year: 1,
        weightedValue: { $multiply: ["$selectedTotal", "$ulbsData.population"] },
        population: "$ulbsData.population",
        ulbName: "$ulbsData.name",
    };

    // Group by year
    const groupStage = {
        _id: "$year",
        totalWeightedValue: { $sum: "$weightedValue" },
        totalPopulation: { $sum: "$population" },
        ulbName: { $first: "$ulbName" },
    };

    //  Final projection - convert to crores
    const finalProjectStage = {
        _id: 0,
        year: "$_id",
        label: 1,
        weightedAverageCr: {
            $round: [
                {
                    $cond: [
                        { $eq: ["$totalPopulation", 0] },
                        null,
                        { $divide: [{ $divide: ["$totalWeightedValue", "$totalPopulation"] }, 10000000] }
                    ]
                },
                ROUND_UP
            ]
        }
    };

    // Will be used as label for the chart.
    if (LABEL_MAP.hasOwnProperty(groupBy)) {
        finalProjectStage.label = LABEL_MAP[groupBy];
    }

    // Final aggregation pipeline
    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "ulbs",
                localField: "ulb_id",
                foreignField: "_id",
                as: "ulbsData"
            }
        },
        { $unwind: "$ulbsData" },
        { $addFields: { popCat: populationCategoryData('$ulbsData.population') } },
        { $match: matchFromUlbs },
        { $addFields: addSelectedTotalStage },
        ...capex,
        { $project: projectStage },
        { $group: groupStage },
        { $project: finalProjectStage }
    ];

    // console.log(JSON.stringify(pipeline, null, 2))
    return pipeline;
}

// Create response structure.
function createResStructureWeighedAvgData(totalData, lineItem, years) {
    // Remove Year-1 (Added at the beginning.)
    years = removeFirstYear(years, lineItem);

    // Basic validation
    if (!totalData || !Array.isArray(totalData.ulbLedgerData) || totalData.ulbLedgerData.length === 0) {
        return { msg: 'Data not available.', success: false };
    }

    const yearIndexMap = years.reduce((map, year, index) => {
        map[year] = index;
        return map;
    }, {});

    const chartData = [];

    // Prepare main ULB data
    const ulbSubData = new Array(years.length).fill(null);
    for (const entry of totalData.ulbLedgerData) {
        if (entry && yearIndexMap.hasOwnProperty(entry.year)) {
            ulbSubData[yearIndexMap[entry.year]] = entry.weightedAverageCr;
        }
    }

    chartData.push({
        type: 'line',
        label: 'Y-o-Y Growth',
        data: ulbSubData,
        backgroundColor: [LINE_COLOR],
        borderColor: LINE_COLOR,
        fill: false,
    });

    chartData.push({
        type: 'bar',
        label: totalData.ulbLedgerData[0]?.label || 'ULB Data',
        data: [...ulbSubData],
        backgroundColor: [GRAPH_COLORS[0]],
    });

    // Handle comparison datasets
    if (Array.isArray(totalData.compareResults)) {
        totalData.compareResults.forEach((resultSet, index) => {
            const comparisonData = new Array(years.length).fill(null);
            for (const dataPoint of resultSet) {
                if (dataPoint && yearIndexMap.hasOwnProperty(dataPoint.year)) {
                    comparisonData[yearIndexMap[dataPoint.year]] = dataPoint.weightedAverageCr;
                }
            }

            chartData.push({
                type: 'bar',
                label: resultSet[0]?.label || `Comparison ${index + 1}`,
                data: comparisonData,
                backgroundColor: [GRAPH_COLORS[(index + 1) % GRAPH_COLORS.length]],
            });
        });
    }

    // 4 because: only 3 years data has to be shown.
    const ulbCagr = Math.round(getCagr(chartData[0].data, 4), 0);
    const ulbName = chartData[1].label;
    const yr1 = `FY${years[0]}`;
    const yr2 = `FY${years[years.length - 1]}`;
    const amt1Msg = formatAmount(chartData[0].data[0]);
    const amt2Msg = formatAmount(chartData[0].data[chartData[0].data.length - 1]);
    const cagrMsg =
        typeof ulbCagr === 'number' && !isNaN(ulbCagr) && Math.abs(ulbCagr) !== Infinity
            ? `CAGR of ${ulbCagr}% between ${yr1} and ${yr2}`
            : 'CAGR cannot be computed';
    const msg = `${cagrMsg} (${ulbName} numbers for ${yr1} is ${amt1Msg}, and for ${yr2} is ${amt2Msg}.)`

    return {
        chartType: 'barChart',
        labels: years,
        legendColors: [],
        axes: { x: 'Years', y: 'Amt in ₹ Cr' },
        data: chartData,
        info: {
            text: ulbCagr >= 0 ? 'success' : 'danger',
            msg,
        }
    };
}


// ----- Per capita -----
async function getPerCapitaData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType) {
    let compareQueries = [];

    // Always fetch ULB data - for only 1 year.
    const ulbQuery = buildPerCapitaPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, ulbId, 'ulb', compareIdMap);

    if (Array.isArray(compareUlbs) && compareType === 'ulbs') {
        // Case: Compare with up to 3 ULBs (by ID)
        compareQueries = compareUlbs.slice(0, 3).map(id =>
            buildPerCapitaPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, id, 'ulb', compareIdMap)
        );
    } else {
        // Case: Compare with one of national/state/popCat/ulbType
        const compareId = compareIdMap[compareType] || '';
        compareQueries = [buildPerCapitaPipeline(lineItem, LINE_ITEMS_MAP[lineItem], years, compareId, compareType, compareIdMap)];
    }

    // Run all queries in parallel
    const [ulbLedgerData, ...compareResults] = await Promise.all([
        LedgerLog.aggregate(ulbQuery),
        ...compareQueries.map(query => LedgerLog.aggregate(query)),
    ]);


    // Response object
    return { ulbLedgerData, compareResults };
}

function buildPerCapitaPipeline(lineItem, lineItemsArr, yearsArr, compareId, groupBy, compareIdMap) {
    // const ulbTypeId = compareIdMap.ulbType;
    // if (!ulbTypeId) throw new Error("ULB type is required.");

    if (!Array.isArray(lineItemsArr) || lineItemsArr.length === 0) {
        throw new Error("lineItemsArr must be a non-empty array.");
    }

    const matchStage = {
        isStandardizable: { $ne: 'No' },
        year: { $in: yearsArr }
    };

    const matchFromUlbs = {
        'ulbsData.isActive': true,
        'ulbsData.isPublish': true,
    };

    // if (groupBy !== 'ulb')
    //     matchFromUlbs['ulbsData.ulbType'] = new ObjectId(ulbTypeId);

    const groupByFilters = {
        ulb: () => (matchStage["ulb_id"] = new ObjectId(compareId)),
        state: () => (matchFromUlbs["ulbsData.state"] = new ObjectId(compareId)),
        popCat: () => (matchFromUlbs["popCat"] = compareId),
        national: () => { }
    };

    if (groupByFilters[groupBy]) groupByFilters[groupBy]();

    const addSelectedTotalStage = {
        selectedTotal: {
            $add: lineItemsArr.map(expr => ({ $ifNull: [expr, 0] }))
        }
    };

    // To calculate capex add previous years value and subtract from current year.
    let capex = [];
    if (CAPEX.includes(lineItem)) capex = getCapexStage(yearsArr[0]);

    // Calculate per capita per document
    const projectStage = {
        year: 1,
        perCapitaValue: {
            $cond: [
                { $eq: ["$ulbsData.population", 0] },
                null,
                { $divide: ["$selectedTotal", "$ulbsData.population"] }
            ]
        },
        ulbName: "$ulbsData.name",
    };

    // Grouping by year to compute avg of per capita values
    const groupStage = {
        _id: "$year",
        averagePerCapita: { $avg: "$perCapitaValue" },
        ulbName: { $first: "$ulbName" },
    };

    const finalProjectStage = {
        _id: 0,
        year: "$_id",
        label: 1,
        perCapitaCr: {
            $round: [
                {
                    $cond: [
                        { $eq: ["$averagePerCapita", null] },
                        null,
                        // { $divide: ["$averagePerCapita", 10000000] }  // convert to crores
                        "$averagePerCapita"
                    ]
                },
                ROUND_UP
            ]
        }
    };

    if (LABEL_MAP.hasOwnProperty(groupBy)) {
        finalProjectStage.label = LABEL_MAP[groupBy];
    }
    const pipeline = [
        { $match: matchStage },
        {
            $lookup: {
                from: "ulbs",
                localField: "ulb_id",
                foreignField: "_id",
                as: "ulbsData"
            }
        },
        { $unwind: "$ulbsData" },
        { $addFields: { popCat: populationCategoryData('$ulbsData.population') } },
        { $match: matchFromUlbs },
        { $addFields: addSelectedTotalStage },
        ...capex,
        { $project: projectStage },
        { $group: groupStage },
        { $project: finalProjectStage }
    ];

    // console.log(JSON.stringify(pipeline, null, 2))
    return pipeline;
}

// Create response structure.
function createResStructurePerCapitaData(totalData, lineItem, years) {
    // Remove Year-1 (Added at the beginning.)
    years = removeFirstYear(years, lineItem);

    // Basic validation
    if (!totalData || !Array.isArray(totalData.ulbLedgerData) || totalData.ulbLedgerData.length === 0) {
        return { msg: 'Data not available.', success: false };
    }

    const yearIndexMap = years.reduce((map, year, index) => {
        map[year] = index;
        return map;
    }, {});

    const chartData = [];

    // Prepare main ULB data
    const ulbSubData = new Array(years.length).fill(null);
    for (const entry of totalData.ulbLedgerData) {
        if (entry && yearIndexMap.hasOwnProperty(entry.year)) {
            ulbSubData[yearIndexMap[entry.year]] = entry.perCapitaCr;
        }
    }

    // chartData.push({
    //     type: 'line',
    //     label: 'Y-o-Y Growth',
    //     data: ulbSubData,
    //     backgroundColor: [LINE_COLOR],
    //     borderColor: LINE_COLOR,
    //     fill: false,
    // });

    chartData.push({
        type: 'bar',
        label: totalData.ulbLedgerData[0]?.label || 'ULB Data',
        data: [...ulbSubData],
        backgroundColor: [GRAPH_COLORS[0]],
    });

    // Handle comparison datasets
    if (Array.isArray(totalData.compareResults)) {
        totalData.compareResults.forEach((resultSet, index) => {
            const comparisonData = new Array(years.length).fill(null);
            for (const dataPoint of resultSet) {
                if (dataPoint && yearIndexMap.hasOwnProperty(dataPoint.year)) {
                    comparisonData[yearIndexMap[dataPoint.year]] = dataPoint.perCapitaCr;
                }
            }

            chartData.push({
                type: 'bar',
                label: resultSet[0]?.label || `Comparison ${index + 1}`,
                data: comparisonData,
                backgroundColor: [GRAPH_COLORS[(index + 1) % GRAPH_COLORS.length]],
            });
        });
    }

    // 3 because: only 3 years data is show
    const ulbAvg = Math.round(getAvg(chartData[0].data, 3), 0);
    const comAvg = Math.round(getAvg(chartData[1].data, 3), 0);
    const diff = ulbAvg - comAvg;

    const ulbName = chartData[0].label;
    const comName = chartData[1].label;

    return {
        chartType: 'barChart',
        labels: years,
        legendColors: [],
        axes: { x: 'Years', y: 'Amt in ₹' },
        data: chartData,
        info: {
            text: ulbAvg > comAvg ? 'success' : 'danger',
            msg: `${ulbName} per capita is Rs.${Math.abs(diff)} ${diff >= 0 ? 'higher' : 'lower'} than ${comName} between FY${years[0]} and FY${years[years.length - 1]} (Avg. of ${ulbName} per Capita is Rs.${ulbAvg.toFixed(2)}, ${comName} per capita is Rs.${comAvg.toFixed(2)})`,
        }
    };
}

// Accepts array and len return average.
function getAvg(arr, len) {
    if (!Array.isArray(arr)) { throw new TypeError("First argument must be an array.") }
    if (typeof len !== "number" || len <= 0) {
        return 0;
        // throw new RangeError("Invalid array length specified.")
    }
    if (len === 0) return 0;

    const total = arr.reduce((acc, curr) => acc + curr, 0);
    return total / len;
}

// Calculate CAGR.
function getCagr(arr, yrs) {
    if (!Array.isArray(arr) || arr.length < 2 || yrs <= 0) {
        return 0;
        // throw new Error("Invalid input: need at least 2 values and positive number of years");
    }

    const startValue = arr[0];
    const endValue = arr[arr.length - 1];

    // if (startValue <= 0 || endValue <= 0) {
    //     throw new Error("Values must be positive for CAGR calculation");
    // }

    const cagr = (Math.pow(endValue / startValue, 1 / yrs) - 1) * 100;
    return +cagr.toFixed(2);
}

// Remove first year - If added at the begining of financialIndicators().
function removeFirstYear(years, lineItem) {
    if (CAPEX.includes(lineItem)) {
        years = years.slice(1);
    }
    return years;
}

// Get capex stage - aggregation pipeline
function getCapexStage(year) {
    return [
        {
            $setWindowFields: {
                partitionBy: "$ulb_id", // group by ulb_id
                sortBy: { year: 1 }, // sort by year ascending
                output: {
                    prevYrAmt: {
                        $shift: {
                            output: "$selectedTotal",
                            by: -1, // get next doc’s amt (since years increase)
                            default: null
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                selectedTotal: {
                    $cond: [
                        { $ifNull: ["$prevYrAmt", false] },
                        { $subtract: ["$selectedTotal", "$prevYrAmt"] },
                        null
                    ]
                }
            }
        },
        { $match: { year: { $ne: year } } }
    ];
}

/**
 * Formats a numeric amount into a string with Indian currency notation and 'Cr' suffix.
 * @param {number} amt - The amount to format.
 * @returns {string} The formatted amount string or 'N/A' (if invalid).
 */
function formatAmount(amt) {
    return typeof amt === 'number' && !isNaN(amt) ?
        `Rs.${amt.toLocaleString('en-IN')} Cr` :
        'N/A';
}