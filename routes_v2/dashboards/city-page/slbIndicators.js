const ObjectId = require("mongoose").Types.ObjectId;
const TwentyEightSlbsForm = require('../../../models/TwentyEightSlbsForm');
const { years } = require('../../../service/years');
const UNIT_TYPE = {
    'lpcd': 'litres per capita per day (lpcd)',
    '%': 'Percent',
    'Hours/day': 'Hours per day',
    'Nos./Year': 'Nos. per year',
};

module.exports.slbIndicators = async (req, res) => {
    try {
        let { type, compUlb, ulb, year } = req.query;
        if (!(year in years)) throw new Error("Invalid year.");
        if (!(type)) throw new Error("Invalid indicator type.");
        type = type.toLowerCase();

        const actualYr = years[year];
        const targetYr = years[year.split('-').map(y => Number(y) + 1).join('-')];
        [actualYr, targetYr, ulb].forEach(objId => {
            if (!ObjectId.isValid(objId)) {
                throw new Error(`Invalid ObjectId: ${objId}`);
            }
        });


        const nationalAvgQuery = getNationalAvgQuery(actualYr, type);
        const ulbDataQuery = getUlbDataQuery(ulb, actualYr, targetYr, type);

        const promises = [
            TwentyEightSlbsForm.aggregate(nationalAvgQuery),
            TwentyEightSlbsForm.aggregate(ulbDataQuery),
        ]

        if (compUlb && ObjectId.isValid(compUlb)) {
            const compUlbDataQuery = getUlbDataQuery(compUlb, actualYr, targetYr, type);
            promises.push(TwentyEightSlbsForm.aggregate(compUlbDataQuery));
        }

        const results = await Promise.all(promises);
        const nationalAvg = results[0];
        const ulbData = results[1];
        const compUlbData = results[2];

        const data = createResStruct(nationalAvg, ulbData, compUlbData);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("SLB Metrics Fetch Error:", error.message);
        return res.status(200).json({
            success: false,
            data: [],
            msg: 'Failed to fetch SLB metrics. ',
        });
    }
}

const getNationalAvgQuery = (actualYr, type) => {
    return [
        { $match: { design_year: { $in: [ObjectId(actualYr)] } } },
        {
            $unwind: {
                path: '$data',
                preserveNullAndEmptyArrays: false
            }
        },
        { $match: { 'data.type': type } },
        {
            $group: {
                _id: '$data.question',
                actual: { $avg: '$data.actual.value' }
            }
        },
    ]
}

const getUlbDataQuery = (ulbId, actualYr, targetYr, type) => {
    return [
        {
            $match: {
                ulb: ObjectId(ulbId),
                design_year: { $in: [ObjectId(actualYr), ObjectId(targetYr)] }
            }
        },
        {
            $unwind: {
                path: "$data",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                ulb: 1,
                data: 1,
                design_year: 1
            }
        },
        { $match: { 'data.type': type } },
        {
            $addFields: {
                actual: {
                    $cond: [
                        { $eq: ['$design_year', ObjectId(actualYr)] },
                        "$data.actual.value",
                        null
                    ]
                },
                target: {
                    $cond: [
                        { $eq: ['$design_year', ObjectId(targetYr)] },
                        "$data.target_1.value",
                        null
                    ]
                },
                indicator: '$data.question'
            }
        },
        {
            $group: {
                _id: '$indicator',
                actual: { $max: '$actual' },
                benchmark: { $max: '$target' },
                ulb: { $first: '$ulb' },
                unit: { $first: '$data.unit' },
            }
        },
        {
            $lookup: {
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulbData'
            }
        },
        { $addFields: { ulbName: { $arrayElemAt: ['$ulbData.name', 0] } } },
        { $project: { ulbData: 0 } }
    ]
}

const createResStruct = (nationalAvg = [], ulbData = [], compUlbData = []) => {
    if (!Array.isArray(nationalAvg) || !Array.isArray(ulbData) || !Array.isArray(compUlbData)) {
        throw new TypeError("All arguments must be arrays");
    }

    const result = {};
    for (const item of nationalAvg) {
        if (!item || typeof item._id !== "string") continue;

        result[item._id] = {
            ...(result[item._id] || {}),
            nationalValue: item.actual ?? null,
            name: item._id
        };
    }

    for (const item of ulbData) {
        if (!item || typeof item._id !== "string") continue;

        if (!result[item._id]) {
            result[item._id] = {
                nationalValue: null,
                name: item._id
            };
        }

        result[item._id].value = item.actual ?? null;
        result[item._id].benchMarkValue = item.benchmark ?? null;
        result[item._id].unitType = UNIT_TYPE[item.unit] ?? null;
        result[item._id].ulbName = item.ulbName || "ULB";
    }

    for (const item of compUlbData) {
        if (!item || typeof item._id !== "string") continue;
        if (!result[item._id]) {
            result[item._id] = {
                nationalValue: null,
                name: item._id
            };
        }

        result[item._id].compPercentage = item.actual ?? null;
    }

    return Object.values(result);
}
