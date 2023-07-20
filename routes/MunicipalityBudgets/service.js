

const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb');
const Response = require('../../service/response')

module.exports.getDocuments = async (req, res) => {
    try {
        const {
            ulbName, year, state, category
        } = req.query;
        const $match = {
            ...(state ? { state: ObjectId(state) } : {
                state: { $in: [ObjectId('5dcf9d7316a06aed41c748eb'), ObjectId('5dcf9d7516a06aed41c748fa')] }
            }),
            ...(category && { ulbType: ObjectId(category) }),
            ...(ulbName && { name: { $regex: ulbName, '$options': 'i' } }),
        }
        const query = [
            ...(Object.keys($match).length ? [{ $match }] : []),
            {
                $lookup: {
                    from: 'states',
                    localField: 'state',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            {
                $unwind: {
                    "path": "$state",
                    "preserveNullAndEmptyArrays": true
                }
            },
            {
                $lookup: {
                    from: 'fiscalrankingmappers',
                    let: { ulbId: "$_id", ulbName: "$name", state: '$state' },
                    pipeline: [
                        {
                            $match: {
                                ...(year && { year: ObjectId(year) }),
                                type: "appAnnualBudget",
                                'file.name': { $ne: '' },
                                'file.url': { $ne: '' },
                                $expr: { "$eq": ["$ulb", "$$ulbId"] },
                            }
                        },
                        {
                            $lookup: {
                                from: 'years',
                                localField: 'year',
                                foreignField: '_id',
                                as: 'year'
                            }
                        },
                        {
                            $unwind: {
                                "path": "$year",
                                "preserveNullAndEmptyArrays": true
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                state: 1,
                                year: '$year.year',
                                name: { $concat: ['$$state.name', '_', '$$ulbName', '_', '$year.year']},
                                url: '$file.url',
                                type: 'pdf',
                                modifiedAt: { $toDate: "$_id" }
                            }
                        },
                    ],
                    as: 'documents',
                }
            },
            { $unwind: '$documents' },
            { $replaceRoot: { newRoot: '$documents' } },
            { $limit: 12 },
        ];
        const response = await Ulb.aggregate(query).allowDiskUse(true);

        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}

const fakeInsights = [
    {
        state: '',
        type: '',
        ulbCount: 4788,
        atLeastOneYearCount: 2633,
        fy2020_21: 53,
        fy2021_22: 55,
        fy2022_23: 51,
        fy2023_24: 53,
    },
    {
        state: '5dcf9d7316a06aed41c748eb',
        type: '',
        ulbCount: 50,
        atLeastOneYearCount: 45,
        fy2020_21: 84,
        fy2021_22: 90,
        fy2022_23: 86,
        fy2023_24: 84,
    },
    {
        state: '5dcf9d7516a06aed41c748fa',
        type: '',
        ulbCount: 666,
        atLeastOneYearCount: 628,
        fy2020_21: 93,
        fy2021_22: 94,
        fy2022_23: 94,
        fy2023_24: 92,
    },
    //--------------------------Municipal Corporation
    {
        state: '',
        type: '5dcfa67543263a0e75c71697',
        ulbCount: 252,
        atLeastOneYearCount: 224,
        fy2020_21: 72,
        fy2021_22: 89,
        fy2022_23: 58,
        fy2023_24: 72,
    },
    {
        state: '5dcf9d7316a06aed41c748eb',
        type: '5dcfa67543263a0e75c71697',
        ulbCount: 9,
        atLeastOneYearCount: 9,
        fy2020_21: 100,
        fy2021_22: 100,
        fy2022_23: 100,
        fy2023_24: 100,
    },
    {
        state: '5dcf9d7516a06aed41c748fa',
        type: '5dcfa67543263a0e75c71697',
        ulbCount: 21,
        atLeastOneYearCount: 21,
        fy2020_21: 100,
        fy2021_22: 100,
        fy2022_23: 100,
        fy2023_24: 100,
    },
    //---------------------------Town Panchayat----------
    {
        state: '',
        type: '5dcfa66b43263a0e75c71696',
        ulbCount: 2450,
        atLeastOneYearCount: 1241,
        fy2020_21: 49,
        fy2021_22: 51,
        fy2022_23: 48,
        fy2023_24: 49,
    },
    {
        state: '5dcf9d7316a06aed41c748eb',
        type: '5dcfa66b43263a0e75c71696',
        ulbCount: 29,
        atLeastOneYearCount: 24,
        fy2020_21: 72,
        fy2021_22: 83,
        fy2022_23: 76,
        fy2023_24: 72,
    },
    {
        state: '5dcf9d7516a06aed41c748fa',
        type: '5dcfa66b43263a0e75c71696',
        ulbCount: 501,
        atLeastOneYearCount: 476,
        fy2020_21: 94,
        fy2021_22: 95,
        fy2022_23: 94,
        fy2023_24: 94,
    },
    //---------------------------Municipality----------
    {
        state: '',
        type: '5dcfa64e43263a0e75c71695',
        ulbCount: 2086,
        atLeastOneYearCount: 1168,
        fy2020_21: 56,
        fy2021_22: 56,
        fy2022_23: 54,
        fy2023_24: 56,
    },
    {
        state: '5dcf9d7316a06aed41c748eb',
        type: '5dcfa64e43263a0e75c71695',
        ulbCount: 12,
        atLeastOneYearCount: 12,
        fy2020_21: 100,
        fy2021_22: 100,
        fy2022_23: 100,
        fy2023_24: 100,
    },
    {
        state: '5dcf9d7516a06aed41c748fa',
        type: '5dcfa64e43263a0e75c71695',
        ulbCount: 144,
        atLeastOneYearCount: 134,
        fy2020_21: 89,
        fy2021_22: 89,
        fy2022_23: 93,
        fy2023_24: 83,
    },
]
module.exports.getHeatmap = async (req, res) => {
    try {

        const {
            category
        } = req.query;
        const response = await Ulb.aggregate([
            {
                "$match": {
                    "isActive": true,
                    ...(category && { ulbType: ObjectId(category) }),
                }
            },
            {
                $lookup: {
                    from: 'fiscalrankings',
                    localField: '_id',
                    foreignField: 'ulb',
                    as: 'frArray'
                }
            },
            {
                $group: {
                    _id: '$state', approvedUlbsCount: {
                        $sum: {
                            $cond: {
                                if: { $in: [{ $arrayElemAt: ['$frArray.currentFormStatus', 0] }, [8, 9, 10, 11]] },
                                then: 1,
                                else: 0
                            },
                        }

                    },
                    totalUlb: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'states',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'stateData'
                }
            },
            {
                $project: {
                    _id: { $arrayElemAt: ['$stateData.name', 0] },
                    stateId: { $arrayElemAt: ['$stateData._id', 0] },
                    code: { $arrayElemAt: ['$stateData.code', 0] },
                    percentage: { $multiply: [{ $divide: ["$approvedUlbsCount", "$totalUlb"] }, 100] },
                }
            }
        ]);

        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}

module.exports.getInsights = async (req, res) => {
    try {
        const {
            state = '', category = ''
        } = req.query;

        const response = fakeInsights.find(insight => insight.state == state && insight.type == category) || {
            state: '',
            category: '',
            ulbCount: 0,
            atLeastOneYearCount: 0,
            fy2020_21: 0,
            fy2021_22: 0,
            fy2022_23: 0,
            fy2023_24: 0,
        };

        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}
