const ObjectId = require("mongoose").Types.ObjectId;
const { years } = require("../../service/years");

/* Create year (key and value) from db */
// TODO: Make this dynamic.
// const years = {
//     '2017-18': '63735a4bd44534713673bfbf',
//     '2018-19': '63735a5bd44534713673c1ca',
//     '2019-20': '607697074dff55e6c0be33ba',
//     '2020-21': '606aadac4dff55e6c075c507',
//     '2021-22': '606aaf854dff55e6c075d219',
//     '2022-23': '606aafb14dff55e6c075d3ae',
//     '2023-24': '606aafc14dff55e6c075d3ec',
//     '2024-25': '606aafcf4dff55e6c075d424',
//     '2025-26': '606aafda4dff55e6c075d48f',
// }

/* Get the list of basic details of ULBs present in "UlbLedger" i.e "Standardised Excel".*/
module.exports.getStandardizedUlbsList = async (ulbName = null, stateId = null, year = "2021-22", skip = 0, limit = 10) => {
    try {
        let ulb_state_match = {};

        if (ulbName) ulb_state_match = Object.assign({}, ulb_state_match, { "ulb.name": ulbName });
        if (stateId) ulb_state_match = Object.assign({}, ulb_state_match, { "ulb.state": ObjectId(stateId) });

        return [
            { $match: { financialYear: year } },
            {
                $group: {
                    _id: "$ulb",
                    modifiedAt: { $addToSet: "$modifiedAt" }
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            { $match: ulb_state_match },
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
                    modifiedAt: 1,
                    "ulb._id": 1,
                    "ulb.name": 1,
                    "ulb.state": 1,
                    "ulb.code": 1,
                    "state._id": 1,
                    "state.name": 1,
                    "state.code": 1
                }
            },
            {
                $project: {
                    type: "excel",
                    modifiedAt: { $arrayElemAt: ["$modifiedAt", 0] },
                    state: "$state._id",
                    ulb: "$ulb.name",
                    ulbId: "$ulb._id",
                    section: "standardised",
                    category: "balance",
                    year: year,
                    fileName: {
                        $concat: ["$state.name", "_", "$ulb.name", "_", "balance", "_", year]
                    }
                }
            },
            { $skip: Number(skip) },
            { $limit: Number(limit) },
        ]
    } catch (error) {
        console.error("Failed to create query: ", error);
    }
};

/* Get the list of basic details of ULBs whose "Raw files" are available. (2019 onwards) */
module.exports.getRawUlbsList19Onwards = async (year = "2021-22", stateId = null, ulbName = null, type = "pdf", category, skip = 0, limit = 10) => {
    try {
        let ulb_state_match = {};
        let year_id = years[year];
        let auditedArr = [{ $eq: ["$aaData.audited.year", { $toObjectId: year_id }] }];
        let unAuditedArr = [{ $eq: ["$aaData.unAudited.year", { $toObjectId: year_id }] }];

        if (type === "pdf") {
            auditedArr.push({ $eq: ["$aaData.audited.submit_annual_accounts", true] });
            unAuditedArr.push({ $eq: ["$aaData.unAudited.submit_annual_accounts", true] });
        }
        if (type === "excel") {
            auditedArr.push({ $ne: ["$aaData.unAudited.provisional_data.bal_sheet.excel.url", ""] });
            unAuditedArr.push({ $ne: ["$aaData.unAudited.provisional_data.bal_sheet.excel.url", ""] });
        }

        if (ulbName) ulb_state_match = Object.assign({}, ulb_state_match, { "name": ulbName });
        if (stateId) ulb_state_match = Object.assign({}, ulb_state_match, { "state": ObjectId(stateId) });

        return [
            { $match: ulb_state_match },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "stateData"
                }
            },
            { $unwind: "$stateData" },
            // {
            //     $sort: {
            //         "stateData.name": 1,
            //         "name": 1
            //     }
            // },
            {
                $lookup: {
                    from: "annualaccountdatas",
                    localField: "_id",
                    foreignField: "ulb",
                    as: "aaData"
                }
            },
            { $unwind: "$aaData" },
            {
                $match: {
                    $or: [
                        { "aaData.audited.year": ObjectId(year_id) },
                        { "aaData.unAudited.year": ObjectId(year_id) }
                    ]
                }
            },
            {
                $addFields: {
                    audited: {
                        $cond: [
                            { $and: auditedArr }, // condition
                            { $concat: ["$stateData.name", "_", "$name", "_", year, "_", "audited"] }, // if condition pass.
                            null // if condition fails.
                        ]
                    },
                    unAudited: {
                        $cond: [
                            { $and: unAuditedArr },
                            { $concat: ["$stateData.name", "_", "$name", "_", year, "_", "unAudited"] },
                            null
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    unAudited: 1,
                    audited: 1,
                    "stateData.name": 1,
                    "stateData.isUT": 1,
                    "stateData.isActive": 1,
                    "aaData.modifiedAt": 1
                }
            },
            {
                $match: {
                    $or: [
                        { audited: { $ne: null } },
                        { unAudited: { $ne: null } }
                    ]
                }
            },
            {
                $project: {
                    auditType: {
                        $cond: [
                            { $eq: ["$audited", null] },
                            "unAudited",
                            "audited"
                        ]
                    },
                    fileName: {
                        $cond: [
                            { $eq: ["$audited", null] },
                            "$unAudited",
                            "$audited"
                        ]
                    },
                    fileUrl: null,
                    modifiedAt: "$aaData.modifiedAt",
                    state: "$stateData.name",
                    type: type,
                    ulbId: "$_id",
                    ulbName: "$name",
                    year: year
                }
            },
            // {
            //   $sort: {
            // "stateData.name": 1,
            // name: 1,
            // "aaData.modifiedAt": -1
            //   }
            // },
            { $skip: Number(skip) },
            { $limit: Number(limit) }
        ]
    } catch (error) {
        console.error("Failed to create query: ", error);
    }
};

/* Get the list of basic details of ULBs whose "Raw files" are available. (2015 to 2018) */
module.exports.getRawUlbsList15To18 = async (year = "2015-16", stateId = null, ulbName = null, type = "pdf", category, skip = 0, limit = 10) => {

    try {
        let ulb_state_match = {};
        if (ulbName) ulb_state_match = Object.assign({}, ulb_state_match, { "name": ulbName });
        if (stateId) ulb_state_match = Object.assign({}, ulb_state_match, { "state": ObjectId(stateId) });

        return [
            { $match: ulb_state_match },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "stateData"
                }
            },
            { $unwind: "$stateData" },
            // {
            //   $sort: {
            //     "stateData.name": 1,
            //     name: 1
            //   }
            // }
            {
                $lookup: {
                    from: "datacollectionforms",
                    localField: "_id",
                    foreignField: "ulb",
                    as: "aaData"
                }
            },
            { $unwind: { path: "$aaData" } },
            {
                $addFields: {
                    [type]: {
                        $cond: {
                            if: { $ne: [`$aaData.documents.financial_year_${year.replace('-', '_')}.${type}.url}`, ""] },
                            then: {
                                name: { $arrayElemAt: [`$aaData.documents.financial_year_${year.replace('-', '_')}.${type}.name`, 0] },
                                url: { $arrayElemAt: [`$aaData.documents.financial_year_${year.replace('-', '_')}.${type}.url`, 0] }
                            },
                            else: null
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    code: 1,
                    state: 1,
                    data: 1,
                    "stateData.name": 1,
                    // "stateData.isUT": 1,
                    // "stateData.code": 1,
                    "stateData.isActive": 1,
                    pdf: 1,
                    excel: 1,
                    "aaData.modifiedAt": 1,
                }
            },
            { $match: { [`${type}.url`]: { $ne: null } } },
            {
                $project: {
                    fileName: {
                        $cond: [
                            { $ne: [`$${type}.url`, null] },
                            { $concat: ["$stateData.name", "_", "$name", "_", year] },
                            null
                        ]
                    },
                    fileUrl: `$${type}.url`,
                    modifiedAt: "$aaData.modifiedAt",
                    state: "$stateData.name",
                    type: type,
                    ulbId: "$_id",
                    ulbName: "$name",
                    year: year
                }
            },
            { $skip: Number(skip) },
            { $limit: Number(limit) }
        ]

    } catch (error) {
        console.error("Failed to create query: ", error);
    }
}