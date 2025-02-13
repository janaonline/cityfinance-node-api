const { dbModels } = require("../../models/Master");
const axios = require('axios');
var path = require('path');
var fs = require('fs');
const CategoryFileUpload = require("../../models/CategoryFileUpload");
let appUrl = "http://localhost:8080/"


module.exports.getUrbanReformsStateList = async (req, res, next) => {
    try {
        let data = await CategoryFileUpload.aggregate([
            {
                $match: { module: 'urban_reforms_iv' }
            },
            {
                $unwind: '$relatedIds'
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
                $unwind: '$state'
            },
            {
                $group: {
                    _id: '$state._id',
                    name: { $first: '$state.name' },
                    fileCount: { $sum: 1 } // Counting the files for each state
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);
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
    let condition = { 
        module: 'municipal_bond_repository',
        ...req.query 
    };
    try {
        let data = await dbModels['CategoryFileUpload'].find(condition).sort({ "createdAt": 1 }).populate("categoryId", "name _id").populate("subCategoryId", 'name _id').lean();
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



async function dataStructMaker(folderName, fromFolder, fileType) {
    let filePath = path.join(process.cwd(), fromFolder)
    let s3Url = `${appUrl}api/v1/getS3url`
    var files = fs.readdirSync(filePath);
    try {
        for (let file of files) {
            let payload_arr = []
            let payload = {}
            let file_name = file.replace("&", "and")

            let fileName = file_name.split(".");

            payload["folder"] = folderName
            payload["file_name"] = file_name
            payload["mime_type"] = `application/${fileName[fileName.length - 1]}`
            payload_arr.push(payload)
            let S3response = await axios.post(s3Url, payload_arr)
            let requestUrl = S3response.data.data[0].url

            let fileUrl = S3response.data.data[0].file_url
            let pdffilePath = path.join(filePath, file)
            let pdfFile = await fs.readFileSync(pdffilePath)

            let putS3 = await axios.put(requestUrl, pdfFile)
            let obj = {
                "subCategoryId": "643f9698ac69eeb41db28d96",
                "categoryId": "643f949eac69eeb41db28d93",
                "file": {
                    "url": fileUrl,
                    "name": file_name
                },
                title: file_name.replace("_", " ")
            }

            await dbModels['CategoryFileUpload'].create(obj);
        }
    }
    catch (err) {
        console.log("error in dataStructMaker ::: ", err.message)
    }
}

module.exports.fileUpload = async (req, res, next) => {
    try {
        await dataStructMaker("municipal_bond_repository", "MoUs", "application/pdf")
    } catch (error) {
        console.log(error)
    }
}

// 
