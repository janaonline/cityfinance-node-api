const ObjectId = require('mongoose').Types.ObjectId;
const Ulb = require('../../../models/Ulb');
const LineItem = require('../../../models/LineItem');
const LedgerLog = require('../../../models/LedgerLog');
const { populationCategoryData } = require('../../utils/queryTemplates')
const { getPopulationCategory } = require('../../common/common')
const { totRevenueArr, totOwnRevenueArr, revExpenditureArr, capexArr } = require('../../utils/ledgerFormulas');
const ALLOWED_COMPARE_TYPES = ['ulb', 'state', 'national', 'popCat', 'ulbType', 'ulbs'];
const ALLOWED_LINEITEMS = ['revenue', 'ownRevenue', 'revex', 'capex'];
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
const GRAPH_COLORS = ["#62b6cb", "#1b4965", "#bee9e8", "#43B5A0", "#F4A261", "#5885AF", "#F6D743"];
const LINE_COLOR = '#f43f5e';
const ROUND_UP = 0;

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
            // return res.status(200).json({
            //     success: true,
            //     totalData
            // });
        }

        return res.status(200).json({
            success: true,
            data
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
    const ulbQuery = buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], ulbId, 'ulb');

    if (Array.isArray(compareUlbs) && compareType === 'ulbs') {
        // Case: Compare with up to 3 ULBs (by ID)
        compareQueries = compareUlbs.slice(0, 3).map(id =>
            buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], id, 'ulb')
        );
    } else {
        // Case: Compare with one of national/state/popCat/ulbType
        const compareId = compareIdMap[compareType] || '';
        compareQueries = [buildMixPipeline(LINE_ITEMS_MAP[lineItem], years[0], compareId, compareType)];
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
function buildMixPipeline(lineItemsArr, year, compareId, groupBy) {
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
        // groupBy: groupBy,
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
    if (!mixData.ulbLedgerData.length) return { msg: 'Data not available.' }

    // Create labels and legend colors - because res structure is same - use 1st element.
    const labels = [];
    const ulbData = mixData.ulbLedgerData[0].mix;
    const lineItemLen = Object.keys(ulbData).length;
    const legendColors = GRAPH_COLORS.slice(0, lineItemLen);
    const data = [];
    const ulbObj = {
        label: mixData.ulbLedgerData[0].label,
        data: [],
    };

    for (const [lineItemCode, value] of Object.entries(ulbData)) {
        labels.push(lineItemsMap[lineItemCode]);
        ulbObj.data.push(value);
    }
    data.push(ulbObj);

    // Push remaining data - compareUlbs/ national/ state/ popCat/ ulbType.
    for (const compArr of mixData['compareResults']) {
        const compUlbObj = {
            label: compArr[0].label,
            data: [],
        };

        compUlbObj.data.push(...Object.values(compArr[0].mix));
        data.push(compUlbObj);
    }

    return {
        chartType: 'gaugeChart',
        labels,
        legendColors,
        data: data
    }

    // const mixData = {
    //     "ulbLedgerData": [
    //         {
    //             "year": "2021-22",
    //             "mix": {
    //                 "110": 37,
    //                 "130": 1,
    //                 "140": 54,
    //                 "150": 0,
    //                 "180": 8
    //             },
    //             "label": "Mysore Municipal Corporation"
    //         }
    //     ],
    //     "compareResults": [
    //         [
    //             {
    //                 "year": "2021-22",
    //                 "mix": {
    //                     "110": 65,
    //                     "130": 3,
    //                     "140": 30,
    //                     "150": 0,
    //                     "180": 2
    //                 },
    //                 "label": "State Avg"
    //             }
    //         ]
    //     ]
    // }
}

// -----  TOTAL(s)/ Weighed Avg DATA -----
// Get mix data.
async function getWeightedAvgData(compareIdMap, lineItem, ulbId, years, compareUlbs, compareType) {
    let compareQueries = [];

    // Always fetch ULB data - for only 1 year.
    const ulbQuery = buildWeightedAvgPipeline(LINE_ITEMS_MAP[lineItem], years, ulbId, 'ulb', compareIdMap);

    if (Array.isArray(compareUlbs) && compareType === 'ulbs') {
        // Case: Compare with up to 3 ULBs (by ID)
        compareQueries = compareUlbs.slice(0, 3).map(id =>
            buildWeightedAvgPipeline(LINE_ITEMS_MAP[lineItem], years, id, 'ulb', compareIdMap)
        );
    } else {
        // Case: Compare with one of national/state/popCat/ulbType
        const compareId = compareIdMap[compareType] || '';
        compareQueries = [buildWeightedAvgPipeline(LINE_ITEMS_MAP[lineItem], years, compareId, compareType, compareIdMap)];
    }

    // Run all queries in parallel
    const [ulbLedgerData, ...compareResults] = await Promise.all([
        LedgerLog.aggregate(ulbQuery),
        ...compareQueries.map(query => LedgerLog.aggregate(query)),
    ]);


    // Response object
    return { ulbLedgerData, compareResults };
}

function buildWeightedAvgPipeline(lineItemsArr, yearsArr, compareId, groupBy, compareIdMap) {
    // console.log("----------------------", compareId, groupBy)
    const ulbTypeId = compareIdMap.ulbType
    if (!ulbTypeId) throw new Error("ULB type is required.");

    if (!Array.isArray(lineItemsArr) || lineItemsArr.length === 0) {
        throw new Error("lineItemsArr must be a non-empty array.");
    }

    // Match input data
    const matchStage = {
        isStandardizable: { $ne: 'No' },
        year: { $in: yearsArr.slice(0, 3) }
    };

    // Lookup ULB data
    const matchFromUlbs = {
        'ulbsData.isActive': true,
        'ulbsData.isPublish': true,
    };

    if (groupBy !== 'ulb')
        matchFromUlbs['ulbsData.ulbType'] = new ObjectId(ulbTypeId);


    // Dynamic filters for groupBy
    const groupByFilters = {
        ulb: () => (matchStage["ulb_id"] = new ObjectId(compareId)),
        state: () => (matchFromUlbs["ulbsData.state"] = new ObjectId(compareId)),
        // Commented ulbType because it is by default required.
        // ulbType: () => (matchFromUlbs["ulbsData.ulbType"] = new ObjectId(compareId)),
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
        { $project: projectStage },
        { $group: groupStage },
        { $project: finalProjectStage }
    ];

    // console.log(JSON.stringify(pipeline, null, 2))
    return pipeline;
}
