

const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb');
const Response = require('../../service/response')

module.exports.getDocuments = async (req, res) => {
    try {
        const response = await Ulb.aggregate([
            // { $match: { "_id": ObjectId("5dcfca53df6f59198c4ac3d5"), } },
            {
                $lookup: {
                    from: 'fiscalrankingmappers',
                    let: { ulbId: "$_id" },
                    pipeline: [
                        {
                            $match: {
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
            { $unwind: '$documents'},
            { $replaceRoot: { newRoot: '$documents' } },
            { $limit: 10},
        ]).allowDiskUse(true);


        return Response.OK(res, response, "Success")
    } catch (error) {
        console.log(error);
        return Response.BadRequest(res, {}, error.message);
    }
}
