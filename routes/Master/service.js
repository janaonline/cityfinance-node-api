const { dbModels } = require("../../models/Master");

module.exports.categoryList = async (req, res, next) => {
    let condition = { ...req.query };
    try {
        let data = await dbModels['MainCategory'].find(condition).lean();
        return res.status(200).json({
            status: true,
            message: "Successfully fetched data!",
            data: data,
        });
    } catch (error) {
        return res.status(400).json({
            status: true,
            message: "Something went wrong!",
            err: error.message,
        });
    }
}

module.exports.subCategoryList = async (req, res, next) => {
    let condition = { ...req.query };
    try {
        let data = await dbModels['SubCategory'].find(condition).lean();
        return res.status(200).json({
            status: true,
            message: "Successfully saved data!",
            data: data,
        });
    } catch (error) {
        return res.status(400).json({
            status: true,
            message: "Something went wrong!",
            err: error.message,
        });
    }
}
module.exports.categoryFileUploadList = async (req, res, next) => {
    let condition = { ...req.query };
    try {
        let data = await dbModels['CategoryFileUpload'].find(condition).populate("categoryId", "name _id").populate("subCategoryId", 'name _id').lean();
        return res.status(200).json({
            status: true,
            message: "Successfully saved data!",
            data: data,
        });
    } catch (error) {
        return res.status(400).json({
            status: true,
            message: "Something went wrong!",
            err: error.message,
        });
    }
}