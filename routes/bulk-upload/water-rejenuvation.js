const moment = require("moment");
const CONSTANTS = require('../../_helper/constants');
const { MASTER_STATUS, YEAR_CONSTANTS, } = require("../../util/FormNames");
const State = require("../../models/State")
const UA = require("../../models/UA")
const Ulb = require("../../models/Ulb");
const LineItem = require("../../models/LineItem");
const UlbLedger = require("../../models/UlbLedger");
const LedgerLog = require("../../models/LedgerLog");
const Redis = require('../../service/redis')
const ObjectId = require('mongoose').Types.ObjectId;
const Year = require('../../models/Year')


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
        if (data) {
            mergedStateData = await Promise.all(data.stateDetails.map(async stateDetail => {
                const statedata = await State.findOne({ code: stateDetail["State Code"] }).lean();
                if (statedata) {
                    return {
                        state: statedata._id,
                        state_code: stateDetail["State Code"],
                        design_year: YEAR_CONSTANTS['22_23'],
                        uaData: [],
                        status: MASTER_STATUS["Submission Acknowledged By MoHUA"],
                        isDraft: false
                    };
                }
            }));

            const waterBodies = addKeyInArray(data["waterBodies"],"array_type","waterBodies");
            const reuseWater = addKeyInArray(data["reuseWater"],"array_type","reuseWater");
            const serviceLevelIndicators = addKeyInArray(data["serviceLevelIndicators"],"array_type","serviceLevelIndicators");

            const entries = [...waterBodies, ...reuseWater, ...serviceLevelIndicators];


            for (const element of mergedStateData) {
                for (const entry of entries) {
                    const uaCode = entry["UA Code"];
                    const uadata = await UA.findOne({ UACode: uaCode }).lean();

                    // Find the index of the current UA data in uaData array of the element
                    const uaIndex = element.uaData.findIndex(ua => ua.ua.equals(uadata._id));

                    if (uaIndex === -1 && element.state_code === entry["State Code"]) {
                        // If UA entry doesn't exist, push a new one
                        const ua_data = {
                            "ua": uadata._id,
                            "ua_code":entry["UA Code"],
                            "status": "Submission Acknowledged By MoHUA",
                            "rejectReason": "",
                            "waterBodies": [],
                            "reuseWater": [],
                            "serviceLevelIndicators": []
                        };

                        // Now you can push the entry data into the appropriate sub-array
                        if (entry.array_type == "waterBodies") {
                            ua_data.waterBodies.push(entry);
                        } else if (entry.array_type == "reuseWater") {
                            ua_data.reuseWater.push(entry);
                        } else if (entry.array_type == "serviceLevelIndicators") {
                            ua_data.serviceLevelIndicators.push(entry);
                        }

                        element.uaData.push(ua_data);
                    }else if (uaIndex !== -1){
                        // If UA entry exists, update the appropriate sub-array
                        if (entry.array_type == "waterBodies") {
                            element.uaData[uaIndex].waterBodies.push(entry);
                        } else if (entry.array_type == "reuseWater") {
                            element.uaData[uaIndex].reuseWater.push(entry);
                        } else if (entry.array_type == "serviceLevelIndicators") {
                            element.uaData[uaIndex].serviceLevelIndicators.push(entry);
                        }
                    }
                }
                //delete element.state_code;
            };


        } else {
            return res.status(400).json({
                success: false,
                message: 'No row Found!'
            })
        }

        return res.status(200).json({
            success: true,
            //data: mergedStateData,
             data2: data,
            message: 'User Found!'
        })
    } catch (e) {
        return res.json({
            success: false,
            message: e.message
        })
    }
}

/**The function adds a new key-value pair to each object in an array.*/
function addKeyInArray(dataArray,newkey,newvalue) {
    return dataArray.map(obj => ({ ...obj, [newkey]: newvalue }));
}

