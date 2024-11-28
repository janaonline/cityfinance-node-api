const AnnualAccountData = require("../../models/AnnualAccounts");
const ObjectId = require("mongoose").Types.ObjectId;
const { years } = require("../../service/years");

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

        // Add a check - check if balance sheet url is available.
        if (type === "pdf" || type === "excel") {
            addUrlCheck(auditedArr, unAuditedArr, 'audited', type);
            addUrlCheck(unAuditedArr, unAuditedArr, 'unAudited', type);
        }

        if (ulbName) ulb_state_match = Object.assign({}, ulb_state_match, { "name": ulbName });
        if (stateId) ulb_state_match = Object.assign({}, ulb_state_match, { "state": ObjectId(stateId) });

        // Function to push conditions into the arrays
        function addUrlCheck(auditedArr, unAuditedArr, fileType, type) {
            const filePath = `$aaData.${fileType}.provisional_data.bal_sheet.${type}.url`;

            auditedArr.push({
                $and: [
                    { $ne: [filePath.replace(`${fileType}`, "audited"), null] },
                    { $ne: [filePath.replace(`${fileType}`, "audited"), ""] }
                ]
            });

            unAuditedArr.push({
                $and: [
                    { $ne: [filePath.replace(`${fileType}`, "unAudited"), null] },
                    { $ne: [filePath.replace(`${fileType}`, "unAudited"), ""] }
                ]
            });
        }

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

/**
 * @description
 * let CONDITION = "Do you wish to submit Audited/Provisional Accounts for 20xy-xz?"
 * Based on the value of "showOptionBox", {{CONDITION}} will be shown or hidden on the frontend for the current year.
 * 
 * Logic:
 * 1. If accessYear == module year (i.e., for new ULBs), set "showOptionBox" to true.
 * 2. For old ULBs:
 *    a. - If the response/ answer to {{CONDITION}} is "No", set "showOptionBox" to true
 *       - For all design year (21-22 onwards, audited/ provisional) {{CONDITION}} must be "NO".
 *    b. - If {{CONDITION}} is "Yes" for any one design year, set "showOptionBox" to false
 *       - For any one design year (21-22 onwards, audited/ provisional) if {{CONDITION}} is "Yes".
 *       - If the "showOptionBox" is false then the {{CONDITION}} must be true, so that the next questions are shown.
 * 3. This logic applies from design year 24-25 onwards.
 */
module.exports.showOptionBox = async (ulbData, currYearObj, prevYearObj) => {
    let showOptionBox = true;

    // New ULB --> showOptionBox = true
    const currYearKey = getYearKey(currYearObj.year);
    const prevYearKey = getYearKey(prevYearObj.year);
    if (ulbData[currYearKey] && !ulbData[prevYearKey]) return true;

    // Any one {{CONDITION}} is "Yes" for perv years --> showOptionBox = false;
    return await checkPrevYrFilledStatus(ulbData._id);
}

// eg: Input: 2024-25, Output: access_2425
function getYearKey(year) {
    let yearArr = year.split("-")
    return "access_" + `${(yearArr[0]).toString().slice(-2)}${(yearArr[1]).toString().slice(-2)}`
}

async function checkPrevYrFilledStatus(ulbId) {
    const aaFilledStatusReport = await AnnualAccountData.aggregate([
        {
            $match: {
                ulb: ObjectId(ulbId),
                design_year: {
                    $in: [
                        // TODO: make the array dynamic.
                        ObjectId('606aaf854dff55e6c075d219'), // 2021-22
                        ObjectId('606aafb14dff55e6c075d3ae'), // 2022-23
                        ObjectId('606aafc14dff55e6c075d3ec'), // 2023-24
                        ObjectId('606aafcf4dff55e6c075d424'), // 2024-25
                        ObjectId('606aafda4dff55e6c075d48f'), // 2025-26
                    ]
                },
                $or: [
                    //Under Review By State, Under Review By MoHUA, Submission Acknowledged By MoHUA
                    { currentFormStatus: { $in: [3, 4, 6] } },
                    {
                        status: { $in: ["PENDING", "APPROVED"] },
                        isDraft: false
                    }
                ]
            }
        },
        {
            $group: {
                _id: "$ulb",
                auditedTrueCount: { $sum: { $cond: [{ $eq: ["$audited.submit_annual_accounts", true] }, 1, 0] } },
                auditedFalseCount: { $sum: { $cond: [{ $eq: ["$audited.submit_annual_accounts", false] }, 1, 0] } },
                unAditedTrueCount: { $sum: { $cond: [{ $eq: ["$unAudited.submit_annual_accounts", true] }, 1, 0] } },
                unAuditedFalseCount: { $sum: { $cond: [{ $eq: ["$unAudited.submit_annual_accounts", false] }, 1, 0] } },
            }
        },
        {
            $project: {
                audited: {
                    true: "$auditedTrueCount",
                    false: "$auditedFalseCount"
                },
                unAudited: {
                    true: "$unAditedTrueCount",
                    false: "$unAuditedFalseCount"
                }
            }
        }
    ]);

    // If ULB is not found --> showOptionBox.
    if (!aaFilledStatusReport.length) return true;

    // If any one filled status is true return true; else false;
    if (aaFilledStatusReport[0].audited.true > 0 || aaFilledStatusReport[0].unAudited.true > 0) return false;
    else return true;

}