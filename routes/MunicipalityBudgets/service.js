

const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb');
const Response = require('../../service/response')

module.exports.getDocuments = async (req, res) => {
    try {
        const {
            ulbName, year, state
        } = req.query;
        const $match = {
            ...(state && { state: ObjectId(state) }),
            ...(ulbName && { name: { $regex: ulbName, '$options' : 'i' } }),
        }
        const query = [
            ...(Object.keys($match).length ? [{$match}] : []),
            {
                $lookup: {
                    from: 'fiscalrankingmappers',
                    let: { ulbId: "$_id", ulbName: "$name", state: '$state' },
                    pipeline: [
                        {
                            $match: {
                                ...(year && {year: ObjectId(year)}),
                                type: "appAnnualBudget",
                                'file.name': { $exists: true},
                                'file.url': { $exists: true},
                                $expr: { "$eq": ["$ulb", "$$ulbId"] },
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                name: "$file.name",
                                url: '$file.url',
                                type: 'pdf',
                                modifiedAt: { $toDate: "$$ulbId" }
                            }
                        },
                    ],
                    as: 'documents',
                }
            },
            { $unwind: '$documents' },
            { $replaceRoot: { newRoot: '$documents' } },
            { $limit: 10 },
        ];
        const response = await Ulb.aggregate(query).allowDiskUse(true);

        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}
module.exports.getInsights = async (req, res) => {
    try {
        const response = {
            ulbCount: 4788,
            atLeastOneYearCount: 2633,
            fy2020_21: '53%', 
            fy2021_22: '55%', 
            fy2022_23: '51%', 
            fy2023_24: '53%', 
        };

        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}
