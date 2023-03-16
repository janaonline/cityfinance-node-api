const { dbModels } = require("./../models/Master/index");
const ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
    create: (modelName) => {
        return async (req, res, next) => {
            try {
                // console.log("req.body",req.body);process.exit();

                let data = await dbModels[modelName].create(req.body);
                return res.status(200).json({
                    status: true,
                    message: "Successfully saved data!",
                    data: data,
                });
            } catch (error) {
                return res.status(400).json({
                    status: false,
                    message: "Something went wrong!",
                    err: error.message,
                });
            }
        }
    },
    update: (modelName, key) => {
        return async (req, res, next) => {
            try {
                let condition = { [key]: ObjectId(req.params[key]) }
                let data = await dbModels[modelName].findOne(condition).lean();
                if (data) {
                    let data = await dbModels[modelName].update(condition, req.body).lean();
                    return res.status(200).json({
                        status: true,
                        message: "Successfully saved data!",
                        data: data,
                    });
                } else {
                    return res.status(400).json({
                        status: false,
                        message: `Unauthorized ${modelName} `,
                        err: {},
                    });
                }
            } catch (error) {
                return res.status(400).json({
                    status: false,
                    message: "Something went wrong!",
                    err: error.message,
                });
            }
        }
    }
}