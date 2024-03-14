
const AnnualAccounts = require('../../models/AnnualAccounts')
var request = require('request')
var AWS = require('aws-sdk');
const { serverToS3Upload } = require('../../service/s3-services');
var s3 = new AWS.S3();
module.exports.moveFileS3 = async function (req, res) {
    try {
        let URData = await AnnualAccounts.find({}, { audited: 1, '_id': 1, unAudited: 1 }).limit(10).lean();
        // console.log("URData", URData); process.exit();
        if (URData && URData.length) {
            for (let el of URData) {
                let d = await putDataObjectWise(el, ['audited', 'unAudited']);
            }
        }
        // let d = await put_from_url();
    } catch (error) {
        console.log(error)
    }
}

let putDataObjectWise = (el, objKey) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (objKey.length) {
                for (let index = 0; index < objKey.length; index++) {
                    let obj = el[objKey[index]];
                    for (const key in obj) {
                        if (typeof obj[key] === "object") {
                            for (const subKey in obj[key]) {
                                let subSubObj = obj[key][subKey];
                                for (const subSubKey in subSubObj) {
                                    let fileObj = subSubObj[subSubKey];
                                    // console.log(!learnRegExp('https://jana-cityfinance.s3.ap-south-1.amazonaws.com'))
                                    // && !learnRegExp('https://jana-cityfinance.s3.ap-south-1.amazonaws.com')
                                    if (typeof fileObj === "object" && fileObj.url !== null && fileObj.url !== "") {
                                        let ulr = await put_from_url(fileObj.url);
                                        console.log("dsad", ulr); process.exit()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {

        }
    })
}

async function put_from_url(url, cb) {
    try {
        let checkurl = await doRequest(url);
    } catch (error) {
    }
}

function doRequest(url) {
    return new Promise(async (resolve, reject) => {
        let url = `https://${process.env.PROD_HOST}/objects/86f95557-a3ba-4f68-b496-1a47b043f80b.pdf`;
        let options = {
            url: url,
            encoding: null
        }
        let resp = await request(options)
            console.log("req.files[0].path",resp.body);process.exit()
            try {
                let dd = await serverToS3Upload(body);
                console.log("data", dd); process.exit()
            } catch (error) {

            }
            // if (!error && resp?.statusCode == 404) {
            //     resolve(body)
            // } else {
            //     reject(url);
            // }
    });
}

 //    let data = await s3.putObject({
                //         Bucket: process.env.AWS_ACCESS_KEY_ID,
                //         Key: process.env.AWS_SECRET_ACCESS_KEY,
                //         ACL: "public-read",
                //         Body: body // buffer
                //     });