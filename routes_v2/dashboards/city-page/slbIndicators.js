const ObjectId = require("mongoose").Types.ObjectId;
const TwentyEightSlbsForm = require('../../../models/TwentyEightSlbsForm');
const { years } = require('../../../service/years');
const { ALLOWED_SLB_STATUS } = require('../../common/common');
const UNIT_TYPE = {
    'lpcd': 'litres per capita per day (lpcd)',
    '%': 'Percent',
    'Hours/day': 'Hours per day',
    'Nos./Year': 'Nos. per year',
};
/**
 * Fetch data from TwentyEightSlbsForm collection.
 * If T is designYear then actuals is in design year: T + 1, targets is in design year: T.
 * User requests "actual" (year) in req.query.
 */
module.exports.slbIndicators = async (req, res) => {
    try {
        let { type, compUlb, ulb, year } = req.query;
        if (!(year in years)) throw new Error("Invalid year.");
        if (!(type)) throw new Error("Invalid indicator type.");
        type = type.toLowerCase();

        // designYear = acutals_year + 1
        const designYear = years[year.split('-').map(y => Number(y) + 1).join('-')];
        [designYear, ulb].forEach(objId => {
            if (!ObjectId.isValid(objId)) {
                throw new Error(`Invalid ObjectId: ${objId}`);
            }
        });

        const nationalAvgQuery = getNationalAvgQuery(designYear, type);
        const ulbDataQuery = getUlbDataQuery(ulb, designYear, type);

        const promises = [
            TwentyEightSlbsForm.aggregate(nationalAvgQuery),
            TwentyEightSlbsForm.aggregate(ulbDataQuery),
        ]

        if (compUlb && ObjectId.isValid(compUlb)) {
            const compUlbDataQuery = getUlbDataQuery(compUlb, designYear, type);
            promises.push(TwentyEightSlbsForm.aggregate(compUlbDataQuery));
        }

        const results = await Promise.all(promises);
        const nationalAvg = results[0] || [];
        const ulbData = results[1] || [];
        const compUlbData = results[2] || [];

        const data = createResStruct(nationalAvg, ulbData, compUlbData)?.sort((a, b) => a.name.localeCompare(b.name));

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        console.error("SLB Metrics Fetch Error:", error.message);
        // 400: client errors, 500: unexpected server errors
        const statusCode = error.message && (
            error.message.includes("Invalid year.") ||
            error.message.includes("Invalid indicator type.") ||
            error.message.includes("Invalid ObjectId")
        ) ? 400 : 500;

        return res.status(statusCode).json({
            success: false,
            data: [],
            msg: 'Failed to fetch SLB metrics. ',
        });
    }
}

const getNationalAvgQuery = (designYear, type) => {
    return [
        {
            $match: {
                design_year: { $in: [ObjectId(designYear)] },
                $or: ALLOWED_SLB_STATUS
            }
        },
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

const getUlbDataQuery = (ulbId, designYear, type) => {
    return [
        {
            $match: {
                ulb: ObjectId(ulbId),
                design_year: ObjectId(designYear),
                $or: ALLOWED_SLB_STATUS,
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
            $lookup: {
                from: 'ulbs',
                localField: 'ulb',
                foreignField: '_id',
                as: 'ulbData'
            }
        },
        {
            $addFields: {
                ulbName: { $arrayElemAt: ['$ulbData.name', 0] },
                ulbSlug: { $arrayElemAt: ['$ulbData.slug', 0] },
                benchmark: {
                    $let: {
                        vars: { yearSplit: { $split: [{ $ifNull: ['$data.range', ''] }, '-'] } },
                        in: {
                            $convert: {
                                input: { $arrayElemAt: ["$$yearSplit", 1] },
                                to: "int",
                                onError: null,
                                onNull: null,
                            }
                        }
                    }
                }
            }
        },
        {
            $project: {
                _id: '$data.question',
                ulb: 1,
                unit: '$data.unit',
                benchmark: 1,
                actual: '$data.actual.value',
                ulbName: 1,
                ulbSlug: 1,
            }
        }
    ]
}

// Create response structure.
// eg: [{
//     "value": 98.67,
//     "ulbName": "Ahmedabad Municipal Corporation",
//     "unitType": "Percent",
//     "benchMarkValue": 100,
//     "name": "Coverage of water supply connections",
//     "compPercentage": 100, // if compUlbData.length is > 0
//     "nationalValue": 68.39818181818183
// },...]
const createResStruct = (nationalAvg = [], ulbData = [], compUlbData = []) => {
    const result = {};
    for (const item of nationalAvg) {
        if (!item) continue;

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
        result[item._id].unitType = UNIT_TYPE[item.unit] ?? UNIT_TYPE['%'];
        result[item._id].ulbName = item.ulbName || "ULB";
        result[item._id].ulbSlug = item.ulbSlug || "slug";
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
