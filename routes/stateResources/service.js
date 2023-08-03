

const MainCategory = require('../../models/Master/MainCategory');
const { loadExcelByUrl } = require('../../util/worksheet')

const handleDatabaseUpload = async (req, res, next) => {
    next();

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


const getMainCategory = async (req, res, next) => {
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





module.exports = {
    handleDatabaseUpload,
    getMainCategory
}