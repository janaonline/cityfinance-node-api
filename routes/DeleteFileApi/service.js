const request = require('request')
const LinkPFMS = require('../../models/LinkPFMS');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const AnnualAccounts = require('../../models/AnnualAccounts');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const GrantDistribution = require('../../models/GrantDistribution');
const XVFcGrantULBForm = require('../../models/XVFcGrantForm');
const WaterRejenuvation = require('../../models/WaterRejenuvation&Recycling');
const StateGTCertificate = require('../../models/StateGTCertificate');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');

const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');

const DataCollectionForm = require('../../models/DataCollectionForm');

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
        let keyArr = { "cert": "", "otherDocs": "", "responseFile_state": "", "responseFile_mohua": "" }
        let dataMissingFile = await getMissingArray(data, keyArr);
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
        let keyArr = { "proof": "", "rateCard": "", "ptCollection": "", "responseFile_state": "", "responseFile_mohua": "" }
        let dataMissingFile = await getMissingArray(data, keyArr);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.annualAccountData = async (req, res) => {
    try {
        // let query = [
        //     {
        //         $lookup: {
        //             from: "ulbs",
        //             localField: "ulb",
        //             foreignField: "_id",
        //             as: "ulb"
        //         }
        //     },
        //     { $unwind: "$ulb" },
        //     {
        //         $lookup: {
        //             from: "states",
        //             localField: "ulb.state",
        //             foreignField: "_id",
        //             as: "state"
        //         }
        //     },
        //     { $unwind: "$state" },
        //     {
        //         $project: {
        //             _id: "$state._id",
        //             year: "$design_year",
        //             stateName: "$state.name",
        //             stateCode: "$state.code",
        //             ulbName: "$ulb.name",
        //             ulbCode: "$ulb.code",
        //             "audited_audited_bal_sheet_pdf": "$audited.provisional_data.bal_sheet.pdf.url",
        //             "audited_audited_bal_sheet_excel": "$audited.provisional_data.bal_sheet.excel.url",
        //             "audited_bal_sheet_schedules_pdf": "$audited.provisional_data.bal_sheet_schedules.pdf.url",
        //             "audited_bal_sheet_schedules_excel": "$audited.provisional_data.bal_sheet_schedules.excel.url",
        //             "audited_inc_exp_pdf": "$audited.provisional_data.inc_exp.pdf.url",
        //             "audited_inc_exp_excel": "$audited.provisional_data.inc_exp.excel.url",
        //             "audited_inc_exp_schedules_pdf": "$audited.provisional_data.inc_exp_schedules.pdf.url",
        //             "audited_inc_exp_schedules_excel": "$audited.provisional_data.inc_exp_schedules.excel.url",
        //             "audited_cash_flow_pdf": "$audited.provisional_data.cash_flow.pdf.url",
        //             "audited_cash_flow_excel": "$audited.provisional_data.cash_flow.excel.url",
        //             "audited_auditor_report_pdf": "$audited.provisional_data.auditor_report.pdf.url",
        //             "audited_auditor_report_excel": "$audited.provisional_data.auditor_report.excel.url",
        //             "audited_standardized_data_excel": "$audited.provisional_data.standardized_data.excel.url",
        //             "unAudited_bal_sheet_pdf": "$unAudited.provisional_data.bal_sheet.pdf.url",
        //             "unAudited_bal_sheet_axcel": "$unAudited.provisional_data.bal_sheet.excel.url",
        //             "unAudited_bal_sheet_schedules_pdf": "$unAudited.provisional_data.bal_sheet_schedules.pdf.url",
        //             "unAudited_bal_sheet_schedules_axcel": "$unAudited.provisional_data.bal_sheet_schedules.excel.url",
        //             "unAudited_inc_exp_pdf": "$unAudited.provisional_data.inc_exp.pdf.url",
        //             "unAudited_inc_exp_excel": "$unAudited.provisional_data.inc_exp.excel.url",
        //             "unAudited_inc_exp_schedules_pdf": "$unAudited.provisional_data.inc_exp_schedules.pdf.url",
        //             "unAudited_inc_exp_schedules_excel": "$unAudited.provisional_data.inc_exp_schedules.excel.url",
        //             "unAudited_cash_flow_pdf": "$unAudited.provisional_data.cash_flow.pdf.url",
        //             "unAudited_cash_flow_excel": "$unAudited.provisional_data.cash_flow.excel.url",
        //             "unAudited_auditor_report_pdf": "$unAudited.provisional_data.auditor_report.pdf.url",
        //             "unAudited_auditor_report_excel": "$unAudited.provisional_data.auditor_report.excel.url",
        //             "unAudited_standardized_data_excel": "$unAudited.provisional_data.standardized_data.excel.url"
        //         }
        //     }
        // ]
        let query = [
            {
                $project: {
                    history: "$history",
                }
            },
            { $unwind: "$history" },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "history.ulb",
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
                    "audited_audited_bal_sheet_pdf": "$history.audited.provisional_data.bal_sheet.pdf.url",
                    "audited_audited_bal_sheet_excel": "$history.audited.provisional_data.bal_sheet.excel.url",
                    "audited_bal_sheet_schedules_pdf": "$history.audited.provisional_data.bal_sheet_schedules.pdf.url",
                    "audited_bal_sheet_schedules_excel": "$history.audited.provisional_data.bal_sheet_schedules.excel.url",
                    "audited_inc_exp_pdf": "$history.audited.provisional_data.inc_exp.pdf.url",
                    "audited_inc_exp_excel": "$history.audited.provisional_data.inc_exp.excel.url",
                    "audited_inc_exp_schedules_pdf": "$history.audited.provisional_data.inc_exp_schedules.pdf.url",
                    "audited_inc_exp_schedules_excel": "$history.audited.provisional_data.inc_exp_schedules.excel.url",
                    "audited_cash_flow_pdf": "$history.audited.provisional_data.cash_flow.pdf.url",
                    "audited_cash_flow_excel": "$history.audited.provisional_data.cash_flow.excel.url",
                    "audited_auditor_report_pdf": "$history.audited.provisional_data.auditor_report.pdf.url",
                    "audited_auditor_report_excel": "$history.audited.provisional_data.auditor_report.excel.url",
                    "audited_standardized_data_excel": "$history.audited.provisional_data.standardized_data.excel.url",
                    "unAudited_bal_sheet_pdf": "$history.unAudited.provisional_data.bal_sheet.pdf.url",
                    "unAudited_bal_sheet_axcel": "$history.unAudited.provisional_data.bal_sheet.excel.url",
                    "unAudited_bal_sheet_schedules_pdf": "$history.unAudited.provisional_data.bal_sheet_schedules.pdf.url",
                    "unAudited_bal_sheet_schedules_axcel": "$history.unAudited.provisional_data.bal_sheet_schedules.excel.url",
                    "unAudited_inc_exp_pdf": "$history.unAudited.provisional_data.inc_exp.pdf.url",
                    "unAudited_inc_exp_excel": "$history.unAudited.provisional_data.inc_exp.excel.url",
                    "unAudited_inc_exp_schedules_pdf": "$history.unAudited.provisional_data.inc_exp_schedules.pdf.url",
                    "unAudited_inc_exp_schedules_excel": "$history.unAudited.provisional_data.inc_exp_schedules.excel.url",
                    "unAudited_cash_flow_pdf": "$history.unAudited.provisional_data.cash_flow.pdf.url",
                    "unAudited_cash_flow_excel": "$history.unAudited.provisional_data.cash_flow.excel.url",
                    "unAudited_auditor_report_pdf": "$history.unAudited.provisional_data.auditor_report.pdf.url",
                    "unAudited_auditor_report_excel": "$history.unAudited.provisional_data.auditor_report.excel.url",
                    "unAudited_standardized_data_excel": "$history.unAudited.provisional_data.standardized_data.excel.url"
                }
            }
        ];

        let keyObj = {
            "audited_audited_bal_sheet_pdf": "",
            "audited_audited_bal_sheet_excel": "",
            "audited_bal_sheet_schedules_pdf": "",
            "audited_bal_sheet_schedules_excel": "",
            "audited_inc_exp_pdf": "",
            "audited_inc_exp_excel": "",
            "audited_inc_exp_schedules_pdf": "",
            "audited_inc_exp_schedules_excel": "",
            "audited_cash_flow_pdf": "",
            "audited_cash_flow_excel": "",
            "audited_auditor_report_pdf": "",
            "audited_auditor_report_excel": "",
            "audited_standardized_data_excel": "",
            "unAudited_bal_sheet_pdf": "",
            "unAudited_bal_sheet_axcel": "",
            "unAudited_bal_sheet_schedules_pdf": "",
            "unAudited_bal_sheet_schedules_axcel": "",
            "unAudited_inc_exp_pdf": "",
            "unAudited_inc_exp_excel": "",
            "unAudited_inc_exp_schedules_pdf": "",
            "unAudited_inc_exp_schedules_excel": "",
            "unAudited_cash_flow_pdf": "",
            "unAudited_cash_flow_excel": "",
            "unAudited_auditor_report_pdf": "",
            "unAudited_auditor_report_excel": "",
            "unAudited_standardized_data_excel": ""
        };

        let data = await AnnualAccounts.aggregate(query);
        let dataMissingFile = await getMissingArray(data, keyObj);
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
        // let query = [
        //     {
        //         $lookup: {
        //             from: "states",
        //             localField: "state",
        //             foreignField: "_id",
        //             as: "state"
        //         }
        //     },
        //     { $unwind: "$state" },
        //     {
        //         $project: {
        //             _id: "$state._id",
        //             year: "$design_year",
        //             stateName: "$state.name",
        //             stateCode: "$state.code",
        //             stateNotification: "$stateNotification.url",
        //             responseFile_mohua: "$responseFile_mohua.url",
        //             responseFile_state: "$responseFile_state.url",
        //         }
        //     }
        // ]
        let query = [
            {
                $project: {
                    history: "$history",
                }
            },
            { $unwind: "$history" },
            {
                $lookup: {
                    from: "states",
                    localField: "history.state",
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
                    stateNotification: "$history.stateNotification.url",
                    responseFile_mohua: "$history.responseFile_mohua.url",
                    responseFile_state: "$history.responseFile_state.url",
                }
            }
        ];
        
        let data = await StateFinanceCommissionFormation.aggregate(query);
        let dataMissingFile = await getMissingArray(data, { stateNotification: "", responseFile_mohua: "", responseFile_state: "" });
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
                    responseFile_state: "$responseFile_state.url",
                }
            }
        ]
        let data = await PropertyTaxFloorRate.aggregate(query);
        let arrKey = { comManual: "", floorRate: "", stateNotification: "", responseFile_mohua: "", responseFile_state: "" }
        let dataMissingFile = await getMissingArray(data, arrKey);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.stateGTCertificates = async (req, res) => {
    let condition = {};
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
                    million_tied: "$million_tied.pdfUrl",
                    nonmillion_tied: "$nonmillion_tied.pdfUrl",
                    nonmillion_untied: "$nonmillion_untied.pdfUrl"
                }
            }
        ]
        let data = await StateGTCertificate.aggregate(query);
        let dataMissingFile = await getMissingArray(data);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.grantTransCertificate = async (req, res) => {
    let condition = {};
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
                    responseFile_mohua: "$responseFile_mohua.url",
                    responseFile_state: "$responseFile_state.url",
                    ptCollection: "$ptCollection.url",
                    responseFile: "$responseFile.url",
                    file: "$file.url"
                }
            }
        ]
        let data = await GrantTransferCertificate.aggregate(query);
        let arrkey = { responseFile_mohua: "", responseFile_state: "", ptCollection: "", responseFile: "", file: "" }
        let dataMissingFile = await getMissingArray(data, arrkey);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.gfcFormCollection = async (req, res) => {
    let condition = {};
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
                    responseFile_mohua: "$responseFile_mohua.url",
                    responseFile_state: "$responseFile_state.url",
                    responseFile: "$responseFile.url",
                    cert: "$cert.url"
                }
            }
        ]
        GfcFormCollection
        let data = await GfcFormCollection.aggregate(query);
        // let oldData = await OdfFormCollection.aggregate(query);
        // data.push(...oldData);
        let arrkey = { responseFile_mohua: "", responseFile_state: "", cert: "", responseFile: "" }
        let dataMissingFile = await getMissingArray(data, arrkey);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
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
                    waterPotability: { $arrayElemAt: ["$waterPotability.documents.waterPotabilityPlan.url", 0] },
                    cityPlan: { $arrayElemAt: ["$millionPlusCities.documents.cityPlan.url", 0] },
                    serviceLevelPlan: { $arrayElemAt: ["$millionPlusCities.documents.serviceLevelPlan.url", 0] },
                    solidWastePlan: { $arrayElemAt: ["$millionPlusCities.documents.solidWastePlan.url", 0] }
                }
            }
        ]
        let data = await XVFcGrantULBForm.aggregate(query);
        let arrkey = { "garbageFreeCities": "", "waterSupplyCoverage": "", "waterBalancePlan": "", "waterPotability": "", "cityPlan": "", "serviceLevelPlan": "", "solidWastePlan": "" }
        let dataMissingFile = await getMissingArray(data, arrkey);
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
                    as: "state"
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
                    // uaData: "$uaData",
                    photo: { $arrayElemAt: ["$uaData.waterBodies.photos.url", 0] },
                    declaration: "$declaration.url"
                }
            }
        ]
        let data = await WaterRejenuvation.aggregate(query);
        // console.log("kl",data);process.exit()
        let arrKey = { "photo": "" }
        // if (data && data.length) {
        //     let i = 0;
        //     for (let pf of data) {

        //         if (pf?.uaData?.length) {
        //             for (let kl of pf.uaData) {
        //                 if (kl?.waterBodies.length > 0) {
        //                     for (let el of kl.waterBodies) {
        //                         if (el?.photos?.url) {
        //                             pf[`photo_${i}`] = el?.photos?.url;
        //                             i++;
        //                         }
        //                     }
        //                 }
        //             }
        //         }
        //         delete pf.uaData
        //     }
        // }
        // console.log("data",data)
        let dataMissingFile = await getMissingArray(data, arrKey);
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
        let keyArr = { url: "" }
        let data = await GrantDistribution.aggregate(query);
        let dataMissingFile = await getMissingArray(data, keyArr);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.dataCollectionForm = async (req, res) => {
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
                    documents_15_16_pdf: { $arrayElemAt: ["$documents.financial_year_2015_16.pdf.url", 0] },
                    documents_15_16_excel: { $arrayElemAt: ["$documents.financial_year_2015_16.excel.url", 0] },
                    documents_16_17_pdf: { $arrayElemAt: ["$documents.financial_year_2016_17.pdf.url", 0] },
                    documents_16_17_excel: { $arrayElemAt: ["$documents.financial_year_2016_17.excel.url", 0] },
                    documents_17_18_pdf: { $arrayElemAt: ["$documents.financial_year_2017_18.pdf.url", 0] },
                    documents_17_18_excel: { $arrayElemAt: ["$documents.financial_year_2017_18.excel.url", 0] },
                    documents_18_19_pdf: { $arrayElemAt: ["$documents.financial_year_2018_19.pdf.url", 0] },
                    documents_18_19_excel: { $arrayElemAt: ["$documents.financial_year_2018_19.excel.url", 0] },
                }
            }
        ]
        let data = await DataCollectionForm.aggregate(query);
        // console.log("data",data)
        let arrkey = {
            "documents_15_16_pdf": "", "documents_15_16_excel": "", "documents_16_17_pdf": "", "documents_16_17_excel": "", "documents_17_18_pdf": ""
            , "documents_17_18_excel": "", "documents_18_19_pdf": "", "documents_18_19_excel": ""
        }

        let dataMissingFile = await getMissingArray(data, arrkey);
        return res.send(dataMissingFile);
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
// DataCollectionForm
const getMissingArray = (data, arrkey) => {
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
                        for (let key in arrkey) {
                            // if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                            let url = el[key];
                            try {
                                if (url) {
                                    console.log("documnetcounter", documnetcounter)
                                    documnetcounter++;
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
                                }
                            } catch (error) {
                                console.log('working', error)
                                // `error` will be whatever you passed to `reject()` at the top
                            }
                            // }
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
            console.log("resp?.statusCode", resp?.statusCode)
            if (!error && resp?.statusCode == 200) {
                reject(url)
            } else if (resp?.statusCode == undefined) {
                reject(url)
            } else {
                resolve(url);
            }
        });
    });
}