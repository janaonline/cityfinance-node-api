

const MainCategory = require('../../models/Master/MainCategory');
const State = require('../../models/State');
const CategoryFileUpload = require('../../models/CategoryFileUpload');
const { stateFormSubmission } = require('../../service/email-template');
const { loadExcelByUrl } = require('../../util/worksheet')

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
    try {
        const data = await CategoryFileUpload.aggregate([
            {
                $match:
                    { module: 'state_resource' }
            },
            {
                $unwind: {
                    path: "$relatedIds",
                }
            },
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
                $project: {
                    file: 1,
                    stateName: '$state.name',
                    categoryName: '$category.name',
                    subCategoryName: '$subCategory.name'
                }
            }
        ]);
        return res.status(200).json({
            status: true,
            message: "Successfully saved data!",
            data: data,
        });
    }
    catch (err) {
        console.log(err);
    }
}

const getMainCategory = async (req, res, next) => {
    try {
        const data = await MainCategory.aggregate([
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
            data: data,
        });
    }
    catch (err) {
        console.log(err);
    }
}





module.exports = {
    handleDatabaseUpload,
    getMainCategory,
    getResourceList
}