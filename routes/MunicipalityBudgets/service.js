

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
