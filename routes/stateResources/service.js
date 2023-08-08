

const MainCategory = require('../../models/Master/MainCategory');
const State = require('../../models/State');
const CategoryFileUpload = require('../../models/CategoryFileUpload');
const { stateFormSubmission } = require('../../service/email-template');
const ObjectId = require("mongoose").Types.ObjectId;
const { loadExcelByUrl } = require('../../util/worksheet');

const handleDatabaseUpload = async (req, res, next) => {
    return next();

    console.log(req.body.file);
    const remoteUrl = req.body.file.url;

    loadExcelByUrl(remoteUrl).then(workbook => {
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow((row, rowNumber) => {
            // Process each row of the worksheet
            console.log(`Row ${rowNumber}: ${row.values}`);
        });

    })
}


const getResourceList = async (req, res, next) => {
    const skip = +req.query.skip || 0;
    const limit = +req.query.limit || 2;
    const { categoryId, stateId } = req.query;

    try {
        const query = [
            {
                $match: { 
                    module: 'state_resource',
                }
            },
            {
                $unwind: {
                    path: "$relatedIds",
                }
            },
            ...(categoryId || stateId ? [
                {
                    $match: { 
                        ...(categoryId && { categoryId: ObjectId(categoryId)}),
                        ...(stateId && { relatedIds: ObjectId(stateId)})
                    }
                },
            ] : []),
            {
                $lookup: {
                    from: 'states',
                    localField: 'relatedIds',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            {
                $group: {
                    _id: "$relatedIds",
                    documents: { $push: "$$ROOT" },
                }
            },
            { $unwind: '$documents' },
            { $replaceRoot: { newRoot: '$documents' } },
            {
                $lookup: {
                    from: 'maincategories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory'
                }
            },
            {
                $unwind: '$state'
            },
            {
                $unwind: '$category'
            },
            {
                $unwind: '$subCategory'
            },
            {
                $group: {
                    _id: {
                        state: '$state',
                        category: '$category',
                        subCategory: '$subCategory',

                    },
                    documents: { $push: "$$ROOT" },
                }
            },
            {
                $project: {
                    _id: 0,
                    file: 1,
                    stateName: '$_id.state.name',
                    categoryName: '$_id.category.name',
                    subCategoryName: '$_id.subCategory.name',
                    "documents": '$documents.file',
                }
            },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    documents: [
                        { $limit: skip + limit },
                        { $skip: skip },
                    ]
                }
            }
        ];
        const [ categoryResult ] = await CategoryFileUpload.aggregate(query);
        const documents  = categoryResult.documents || {};
        const totalDocuments = categoryResult?.totalCount?.[0]?.count || 0;
        const states = await State.find().select('name _id');
        const categories = await MainCategory.aggregate([
            {
                $match: { typeOfCategory: "state_resource", isActive: true }
            },
            {
                $lookup: {
                    from: "subcategories",
                    localField: "_id",
                    foreignField: "categoryId",
                    as: "subCategories",
                }
            },
            {
                $project: {
                    name: 1,
                    subCategories: 1
                }
            }
        ]);
        return res.status(200).json({
            status: true,
            message: "Successfully saved data!",
            data: {
                documents,
                states,
                categories,
                totalDocuments
            },
        });
    }
    catch (err) {
        console.log(err);
    }
}






module.exports = {
    handleDatabaseUpload,
    getResourceList
}