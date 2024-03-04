const axios = require('axios');
const { MASTER_STATUS, YEAR_CONSTANTS, } = require("../../util/FormNames");
const State = require("../../models/State")
const UA = require("../../models/UA")
const IndicatorLineItems = require("../../models/indicatorLineItems");
const Year = require('../../models/Year')
const {saveWaterRejenuvation} = require("../waterRejenuvation/service");
const fs = require('fs');
const url = require('url');

const waterBodiesKeyMap = {
    "Project Name": "name",
    "Name of water body": "nameOfBody",
    "Area": "area",
    "photos": "photos",
    "Latitude": "lat",
    "Longitude": "long",
    "BOD in mg/L (Current)": "bod",
    "BOD in mg/L (Expected)": "bod_expected",
    "COD in mg/L (Current)": "cod",
    "COD in mg/L (Expected)": "cod_expected",
    "DO in mg/L (Current)": "do",
    "DO in mg/L(Expected)": "do_expected",
    "TDS in mg/L (Current)": "tds",
    "TDS in mg/L(Expected)": "tds_expected",
    "Turbidity in  NTU (Current)": "turbidity",
    "Turbidity in  NTU(Expected)": "turbidity_expected",
    "Project Details": "details",
    "Preparation of  DPR": "dprPreparation",
    "Completion  of tendering process": "dprCompletion",
    "%  of  work completion": "workCompletion",
}
const reuseWaterKeyMap = {
    "Project Name": "name",
    "Latitude": "lat",
    "Longitude": "long",
    "Proposed capacity of STP(MLD)": "stp",
    "Proposed water quantity  to be reused(MLD)": "treatmentPlant",
    "Target customers/ consumer for  reuse of  water": "targetCust",
    "Preparation of  DPR": "dprPreparation",
    "Completion of tendering process": "dprCompletion",
    "%  of  work completion": "workCompletion"
}
const serviceLevelIndicatorsKeyMap = {
    "Project Name": "name",
    "Physical  Components": "component",
    "Indicator": "indicator", /// need to load from constant
    "Existing  (As- is)": "existing",
    "After  (To-be)": "after",
    "Estimated  Cost (Amount  in  INR Lakhs)": "cost",
    "Preparation of  DPR": "dprPreparation",
    "Completion of tendering process": "dprCompletion",
    "%  of  work completion": "workCompletion"
}

module.exports = async function (req, res) {
    try {
        let user = req.decoded;
        let data = req.body.jsonArray;
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User Not Found!'
            })
        }
        let mergedStateData = {};
        const lineItems = await IndicatorLineItems.find({ type: "water supply" }, { lineItemId: 1, name: 1 }).lean();
        const lineItemsKeyValue = Object.fromEntries(lineItems.map(item => [item.name, item.lineItemId]));  
        if (data) {
            mergedStateData = await Promise.all(data.stateDetails.map(async stateDetail => {
                let declarationUrl = {}
                if(stateDetail['declaration']){
                    const parsedUrl = new URL(stateDetail['declaration']);
                    const objectKey = decodeURIComponent(parsedUrl.pathname.slice(1));
                    const name = objectKey.split('/')
                    declarationUrl.url = parsedUrl;
                    declarationUrl.name = name[name.length - 1];
                   // declarationUrl = retriveS3Url(stateDetail);
                }
                const statedata = await State.findOne({ code: stateDetail["State Code"] }).lean();
                if (statedata) {
                    return {
                        state: statedata._id,
                        state_code: stateDetail["State Code"],
                        design_year: YEAR_CONSTANTS['22_23'],
                        declaration:declarationUrl,
                        uaData: [],
                        status: MASTER_STATUS["Submission Acknowledged By MoHUA"],
                        isDraft: false,
                        entry_type:"bulkupload"
                    };
                }
            }));

            const waterBodies = addReplaceKeysInArray(data["waterBodies"],"array_type","waterBodies",waterBodiesKeyMap);
            const reuseWater = addReplaceKeysInArray(data["reuseWater"],"array_type","reuseWater",reuseWaterKeyMap);
            const serviceLevelIndicators = addReplaceKeysInArray(data["serviceLevelIndicators"],"array_type","serviceLevelIndicators",serviceLevelIndicatorsKeyMap);
            waterBodies.forEach(body => {
                const parsedUrl = new URL(body.photos);
                const objectKey = decodeURIComponent(parsedUrl.pathname.slice(1));
                const name = objectKey.split('/')
                body.photos = [{
                    "url": parsedUrl,
                    "name": name[name.length - 1]
                }];
            })
            const entries = [...waterBodies, ...reuseWater, ...serviceLevelIndicators];

            await createWSSJson(mergedStateData, entries, lineItemsKeyValue);

            // delete unused keys from array..
            const keysToDelete = ['State Name', 'State Code', 'UA Name', 'UA Code'];
            mergedStateData.forEach(item => {
                item.uaData.forEach(uaItem => {
                    uaItem.waterBodies = deleteKeys(uaItem.waterBodies, keysToDelete);
                    uaItem.reuseWater = deleteKeys(uaItem.reuseWater, keysToDelete);
                    uaItem.serviceLevelIndicators = deleteKeys(uaItem.serviceLevelIndicators, keysToDelete);
                });
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'No row Found!'
            })
        }
        // mergedStateData.forEach(async (item) => {
        //     Object.assign(req.body, {...item});
        //     await saveWaterRejenuvation(req, res);
        // });

        return res.status(200).json({
            success: true,
            data: mergedStateData,
            message: 'User Found!'
        })
    } catch (e) {
        return res.json({
            success: false,
            message: e.message
        })
    }
}
//STATE/2022-23/projects_wss/HR/
// async function retriveS3Url(url, objectKey) {
//     try {
//         const response = await axios.get(url, { responseType: 'stream' });

//         const tempFilePath = 'temp-file.tmp';
//         const writer = fs.createWriteStream(tempFilePath);

//         response.data.pipe(writer);

//         return new Promise((resolve, reject) => {
//             writer.on('finish', () => {
//                 const fileStream = fs.createReadStream(tempFilePath);
//                 const params = {
//                     Bucket: bucketName,
//                     Key: objectKey,
//                     Body: fileStream
//                 };
//                 s3.upload(params, (err, data) => {
//                     if (err) {
//                         console.error('Error uploading to S3:', err);
//                         resolve({ url: '', status: false });
//                     } else {
//                         console.log('File uploaded to S3 successfully:', data.Location);

//                         fs.unlinkSync(tempFilePath);

//                         resolve({ url: data.Location, status: true });
//                     }
//                 });
//             });

//             writer.on('error', (err) => {
//                 console.error('Error writing to temporary file:', err);
//                 resolve({ url: '', status: false });
//             });
//         });
//     } catch (error) {
//         console.error('Error fetching file from URL:', error);
//         return { url: '', status: false };
//     }
// }

/**
 * The function create a JSON object with specific data structure and values.
 */
async function createWSSJson(mergedStateData, entries, lineItemsKeyValue) {
    for (const element of mergedStateData) {
        for (const entry of entries) {
             // Trim all values in the entry object
            for (const key in entry) {
                if (entry.hasOwnProperty(key) && typeof entry[key] === 'string') {
                    entry[key] = entry[key].trim();
                }
            }
            entry.isDisable = true; // added isDisable Key
            const uaCode = entry["UA Code"];
            const uadata = await UA.findOne({ UACode: uaCode }).lean();
            // Find the index of the current UA data in uaData array of the element
            const uaIndex = element.uaData.findIndex(ua => ua.ua.equals(uadata._id));

            if (uaIndex === -1 && element.state_code === entry["State Code"]) {
                // If UA entry doesn't exist, push a new one
                const ua_data = {
                    "ua": uadata._id,
                    "status": "Submission Acknowledged By MoHUA",
                    "rejectReason": "",
                    "waterBodies": [],
                    "reuseWater": [],
                    "serviceLevelIndicators": [],
                    "foldCard": true
                };
                // Now you can push the entry data into the appropriate sub-array
                if (entry.array_type == "waterBodies") {
                    ua_data.waterBodies.push(entry);
                } else if (entry.array_type == "reuseWater") {
                    ua_data.reuseWater.push(entry);
                } else if (entry.array_type == "serviceLevelIndicators") {
                    entry.indicator = lineItemsKeyValue[entry.indicator];
                    ua_data.serviceLevelIndicators.push(entry);
                }

                element.uaData.push(ua_data);
            } else if (uaIndex !== -1) {
                // If UA entry exists, update the appropriate sub-array
                if (entry.array_type == "waterBodies") {
                    element.uaData[uaIndex].waterBodies.push(entry);
                } else if (entry.array_type == "reuseWater") {
                    element.uaData[uaIndex].reuseWater.push(entry);
                } else if (entry.array_type == "serviceLevelIndicators") {
                    entry.indicator = lineItemsKeyValue[entry.indicator];
                    element.uaData[uaIndex].serviceLevelIndicators.push(entry);
                }
            }
        }
        delete element.state_code;
    };
}

/** The function takes an array of objects, replaces specified keys in each object according to a key
 * map, and adds a new key-value pair to each object. */
function addReplaceKeysInArray(dataArray,newkey,newvalue,keyMap) {
    return dataArray.map(obj => ({ ...replaceArrayKeys(obj, keyMap), [newkey]: newvalue }));
}

function replaceArrayKeys(obj, keyMap) {
    const newObj = {};
    for (const [oldKey] of Object.entries(obj)) {
        const updatedKey = keyMap[oldKey] || oldKey;
        newObj[updatedKey] = obj[oldKey];
    }
    return newObj;
}

/** The `deleteKeys` function deletes specified keys from an array of objects or a single object */
function deleteKeys(data, keysToDelete) {
    if (Array.isArray(data)) {
        // If the data is an array
        return data.map(item => {
            keysToDelete.forEach(key => delete item[key]);
            return item;
        });
    } else if (typeof data === 'object') {
        // If the data is an object
        keysToDelete.forEach(key => delete data[key]);
        return data;
    } else {
        throw new Error("Unsupported data type");
    }
}

