const { dbModels } = require("../../models/Master");
const axios = require('axios');
var path = require('path');
var fs = require('fs');
let appUrl = "http://localhost:8080/"

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

module.exports.uploadFile = () => {
    dataStructMaker("dashboard/municipal_bond_repository", "menuIcon", "application/pdf")
}
async function dataStructMaker(folderName, fromFolder, fileType) {

    let filePath = path.join(process.cwd(), fromFolder)
    let s3Url = `${appUrl}api/v1/getS3url`
    var files = fs.readdirSync(filePath);
    let fileurls = []
    try {
        for (let file of files) {
            let payload_arr = []
            let payload = {}

            payload["folder"] = folderName
            payload["file_name"] = file
            payload["mime_type"] = fileType
            payload_arr.push(payload)

            let S3response = await axios.post(s3Url, payload_arr)
            let requestUrl = S3response.data.data[0].url
            let fileUrl = S3response.data.data[0].file_url
            let file_alias = S3response.data.data[0].file_alias
            let pdffilePath = path.join(filePath, file)
            let pdfFile = await fs.readFileSync(pdffilePath)
            let headers = {
                headers: {
                    'Content-Type': 'application/pdf'
                }
            }
            let putS3 = await axios.put(requestUrl, pdfFile, headers)
            fileurls.push(fileUrl)
            let payLoadForDatabase = {
                "title": "Letter of Appointment of Merchant Banker",
                "file": {
                    "url": fileUrl,
                    "name": file_alias
                },
                "categoryId": "63f8483db22c594024832855",
                "subCategoryId": "63f84f17cc2b9d4981b2636b"
            }
            await createUAlist(payLoadForDatabase)
        }
        console.log(fileurls)
    }
    catch (err) {
        console.log("err",err)
        console.log("error in dataStructMaker ::: ", err.message)
    }
}

async function createUAlist(payload) {
    try {
        let uaUrl = `${appUrl}api/v1/municipalBondRepository/create`
        let response = await axios.post(uaUrl, payload)
        console.log(response)
        console.log(response.data.message)
    }
    catch (err) {
        console.log("creatingUaList",err)
        console.log("error in creatingUaList", err.message)
    }
}
async function getUaId(uaCode) {
    let uAUrl = `${appUrl}api/v1/municipalBondRepository/create`
    try {
        let response = await axios.get(uAUrl)
        return response.data.ua
    }
    catch (err) {
        console.log("error in getUaId :: ", err.message)
    }
}
async function updateToSideMenu(name, url) {
    let sideMenuUrl = `${appUrl}api/v1/UA/menu`
    let fileName = name.split(".")[0]
    let body = {
        "name": name,
        "url": url
    }
    try {
        let response = await axios.put(uAUrl)
        console.log(response.data)
        return response.data
    }
    catch (err) {

    }

}