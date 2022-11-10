const request = require('request')
const LinkPFMS = require('../../models/LinkPFMS');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const AnnualAccounts = require('../../models/AnnualAccounts');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const GrantDistribution = require('../../models/GrantDistribution');
const XVFcGrantULBForm = require('../../models/XVFcGrantForm');
const WaterRejenuvation = require('../../models/WaterRejenuvation&Recycling');

const ObjectId = require("mongoose").Types.ObjectId;

module.exports.pfmsaccounts = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    ulbName: "$ulb.name",
                    ulbCode: "$ulb.code",
                    cert: "$cert.url",
                    otherDocs: "$otherDocs.url",
                    responseFile_state: "$responseFile_state.url",
                    responseFile_mohua: "$responseFile_mohua.url"
                }
            }
        ]
        let data = await LinkPFMS.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.propertyTaxOp = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    ulbName: "$ulb.name",
                    ulbCode: "$ulb.code",
                    proof: "$proof.url",
                    rateCard: "$rateCard.url",
                    ptCollection: "$ptCollection.url",
                    responseFile_state: "$responseFile_state.url",
                    responseFile_mohua: "$responseFile_mohua.url"
                }
            }
        ]
        let data = await PropertyTaxOp.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.annualAccountData = async (req, res) => {
    let condition = {};
    let obj = {
        _id: "$state._id",
        year: "$design_year",
        stateName: "$state.name",
        stateCode: "$state.code",
        ulbName: "$ulb.name",
        ulbCode: "$ulb.code"
    };
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    if (req.query.audited_year) {
        condition['audited.year'] = ObjectId(req.query.audited_year);
        obj["standardized_data_pdf"] = "$audited.standardized_data.pdf.url";
        obj["standardized_data_excel"] = "$audited.standardized_data.excel.url"
    }
    if (req.query.unAudited_year) {
        condition['unAudited.year'] = ObjectId(req.query.unAudited_year);
        obj["standardized_data_pdf"] = "$unAudited.standardized_data.pdf.url";
        obj["standardized_data_excel"] = "$unAudited.standardized_data.excel.url"
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: obj
            }
        ]
        let data = await AnnualAccounts.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.statefinancecommissionformation = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    stateNotification: "$stateNotification.url",
                    responseFile_mohua: "$responseFile_mohua.url",
                }
            }
        ]
        let data = await StateFinanceCommissionFormation.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.propertyTaxFloorRate = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    comManual: "$comManual.url",
                    floorRate: "$floorRate.url",
                    stateNotification: "$stateNotification.url",
                    responseFile_mohua: "$responseFile_mohua.url",
                }
            }
        ]
        let data = await PropertyTaxFloorRate.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
// module.exports.propertyTaxFloorRate = async (req, res) => {
//     let condition = {};
//     if (req.query.design_year) {
//         condition['design_year'] = ObjectId(req.query.design_year);
//     }
//     try {
//         let query = [
//             { $match: condition },
//             {
//                 $lookup: {
//                     from: "states",
//                     localField: "state",
//                     foreignField: "_id",
//                     as: "state"
//                 }
//             },
//             { $unwind: "$state" },
//             {
//                 $project: {
//                     _id: "$state._id",
//                     year: "$design_year",
//                     stateName: "$state.name",
//                     stateCode: "$state.code",
//                     comManual: "$comManual.url",
//                     floorRate: "$floorRate.url",
//                     stateNotification: "$stateNotification.url",
//                     responseFile_mohua: "$responseFile_mohua.url",
//                 }
//             }
//         ]
//         let data = await PropertyTaxFloorRate.aggregate(query);
//         let dataMissingFile = await getMissingArray(data);
//         return res.send(dataMissingFile);
//     } catch (error) {
//         return res.status(400).json({
//             status: false,
//             message: error.message
//         });
//     }
// }
module.exports.xvfcGrantForm = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    ulbName: "$ulb.name",
                    ulbCode: "$ulb.code",
                    garbageFreeCities: { $arrayElemAt: ["$solidWasteManagement.documents.garbageFreeCities.url", 0] },
                    waterSupplyCoverage: { $arrayElemAt: ["$solidWasteManagement.documents.waterSupplyCoverage.url", 0] },
                    waterBalancePlan: { $arrayElemAt: ["$millionPlusCities.documents.waterBalancePlan.url", 0] },
                    cityPlan: { $arrayElemAt: ["$millionPlusCities.documents.cityPlan.url", 0] },
                    serviceLevelPlan: { $arrayElemAt: ["$millionPlusCities.documents.serviceLevelPlan.url", 0] },
                    solidWastePlan: { $arrayElemAt: ["$millionPlusCities.documents.solidWastePlan.url", 0] }
                }
            }
        ]
        let data = await XVFcGrantULBForm.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.waterRejenuvation = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
             {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as : "state"
                }
             },
             { $unwind: "$state" },
             { $unwind: "$uaData" },
             { $unwind: "$uaData.waterBodies" },
             {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    photo: { $arrayElemAt: ["$uaData.waterBodies.photos.url", 0] },
                    declaration: "$declaration.url"
                }
             }
        ]
        let data = await WaterRejenuvation.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.grantDistribution = async (req, res) => {
    let condition = {};
    if (req.query.design_year) {
        condition['design_year'] = ObjectId(req.query.design_year);
    }
    try {
        let query = [
            { $match: condition },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
            {
                $project: {
                    _id: "$state._id",
                    year: "$design_year",
                    stateName: "$state.name",
                    stateCode: "$state.code",
                    url: "$url",
                }
            }
        ]
        let data = await GrantDistribution.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}

const getMissingArray = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            let documnetcounter = 1;
            working = 0;
            notWorking = 0;
            let arr = []
            let target = data.length;
            let skip = 0;
            let batch = 150;
            while (skip <= target) {
                const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
                await Promise.all(
                    slice.map(async el => {
                        for (let key in el) {
                            
                            if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                                documnetcounter++;
                                let url = el[key];
                                try {
                                    let response = await doRequest(url);
                                    let obj = {
                                        stateName: "",
                                        stateCode: "",
                                        key: "",
                                        url: "",
                                        year: ""
                                    }
                                    obj.stateName = el.stateName;
                                    obj.stateCode = el.stateCode;
                                    if (el?.ulbName) {
                                        obj.ulbName = el?.ulbName;
                                        obj.ulbCode = el?.ulbCode;
                                    }
                                    obj.key = key;
                                    obj.url = response
                                    obj.year = el.year
                                    // console.log("ppp", obj)
                                    arr.push(obj);
                                } catch (error) {
                                    console.log('working', error)
                                    // `error` will be whatever you passed to `reject()` at the top
                                }
                            }
                        }
                        // console.log("arr", arr)
                    })
                )
                skip += batch;
            }
            resolve({
                data: arr,
                number: arr.length,
                total: documnetcounter
            })
        } catch (error) {
            console.log("error", error)
            reject(error);
        }
    })
}
function doRequest(url) {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            method: 'HEAD'
        }
        request(options, (error, resp, body) => {
            if (!error && resp?.statusCode == 404) {
                resolve(url)
            } else {
                reject(url);
            }
        });
    });
}
