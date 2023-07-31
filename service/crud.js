const { dbModels } = require("./../models/Master/index");
const ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
    list: (modelName) => {
        return async (req, res, next) => {
            try {
                let condition = { ...req.query };
                let data = await dbModels[modelName].find(condition);
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
    createOrUpdate: (modelName) => {
        return async (req, res, next) => {
            const id = req.body.id;
            delete req.body.id;
            try {
                let data = await dbModels[modelName].updateOne({_id: ObjectId(id)}, req.body, { upsert: true });
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
    deleteById: (modelName) => {
        return async (req, res, next) => {
            const id = req.params.id;
            console.log('deleted', id);
            try {
                let data = await dbModels[modelName].findByIdAndDelete(id);
                return res.status(200).json({
                    status: true,
                    message: "Item deleted!",
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