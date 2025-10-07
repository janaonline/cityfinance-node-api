const AnnualAccountData = require("../../models/AnnualAccounts");
const Year = require("../../models/Year");
const ObjectId = require("mongoose").Types.ObjectId;
const { years } = require("../../service/years");

/* Get the list of basic details of ULBs present in "UlbLedger" i.e "Standardised Excel".*/
module.exports.getStandardizedUlbsList = async (ulbName = null, ulbId = null, stateId = null, year = "2021-22", skip = 0, limit = 10) => {
    try {
        const matchCondition1 = {
            isStandardizable: { $ne: 'No' },
            year: year,
        };
        const matchCondition2 = {};

        if (ulbId) matchCondition1['ulb_id'] = ObjectId(ulbId);
        else if (ulbName) matchCondition2['ulb.name'] = ulbName;

        if (stateId) matchCondition2['ulbData.state'] = ObjectId(stateId);

        return [
            { $match: matchCondition1 },
            {
                $project: {
                    lastModifiedAt: 1,
                    ulb_id: 1,
                    year: 1,
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    let: { ulbId: "$ulb_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$ulbId"] } } },
                        { $project: { name: 1, state: 1 } }
                    ],
                    as: "ulbData"
                }
            },
            {
                $unwind: {
                    path: '$ulbData',
                    preserveNullAndEmptyArrays: false
                }
            },
            { $match: matchCondition2 },
            {
                $lookup: {
                    from: "states",
                    let: { stateId: '$ulbData.state' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$_id', '$$stateId'] } } },
                        { $project: { name: 1, _id: 0 } }
                    ],
                    as: "stateData"
                }
            },
            { $addFields: { stateName: { $arrayElemAt: ["$stateData.name", 0] } } },
            { $unset: 'stateData' },
            {
                "$project": {
                    "type": "excel",
                    "modifiedAt": "$lastModifiedAt",
                    "stateName": 1,
                    "ulb": "$ulbData.name",
                    "ulbId": "$ulbData._id",
                    "section": "standardised",
                    "category": "balance",
                    "year": 1,
                    "fileName": {
                        "$concat": ["$stateName", "_", "$ulbData.name", "_", "balance", "_", year]
                    }
                }
            },
            // {
            //     $sort: {
            //         modifiedAt: -1,
            //         stateName: -1,
            //     }
            // },
            { $skip: Number(skip) },
            { $limit: Number(limit) },
        ]
    } catch (error) {
        console.error("Failed to create query: ", error);
    }
};

/* Get the list of basic details of ULBs whose "Raw files" are available. (2019 onwards) */
module.exports.getRawUlbsList19Onwards = async (year = "2021-22", stateId = null, ulbName = null, ulbId = null, type = "pdf", category, skip = 0, limit = 10) => {
    try {
        const matchCondition = {};
        const year_id = years[year];
        const auditedArr = [{ $eq: ["$aaData.audited.year", { $toObjectId: year_id }] }];
        const unAuditedArr = [{ $eq: ["$aaData.unAudited.year", { $toObjectId: year_id }] }];

        // Add a check - check if balance sheet url is available.
        if (type === "pdf" || type === "excel") {
            addUrlCheck(auditedArr, unAuditedArr, 'audited', type);
            addUrlCheck(unAuditedArr, unAuditedArr, 'unAudited', type);
        }

        if (ulbId) matchCondition['_id'] = ObjectId(ulbId);
        else if (ulbName) matchCondition['name'] = ulbName;

        if (stateId) matchCondition['state'] = ObjectId(stateId);

        matchCondition['isPublish'] = true;

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
            { $match: matchCondition },
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
module.exports.getRawUlbsList15To18 = async (year = "2015-16", stateId = null, ulbName = null, ulbId = null, type = "pdf", category, skip = 0, limit = 10) => {

    try {
        const matchCondition = {};

        if (ulbId) matchCondition['_id'] = ObjectId(ulbId);
        else if (ulbName) matchCondition['name'] = ulbName;

        if (stateId) matchCondition['state'] = ObjectId(stateId);

        matchCondition['isPublish'] = true;


        return [
            { $match: matchCondition },
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

/* Get the list of ULBs whose "Budget Pdf" are available. */
module.exports.getBudgetPdfs = async (year = "2021-22", stateId = null, ulbName = null, ulbId = null, type = "pdf", category, skip = 0, limit = 10) => {
    try {
        const matchCondition = { "isPublish": true };

        if (ulbId) matchCondition['_id'] = ObjectId(ulbId);
        else if (ulbName) matchCondition['name'] = ulbName;

        if (stateId) matchCondition['state'] = ObjectId(stateId);

        const query = [
            { $match: matchCondition },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            {
                $unwind: {
                    path: "$state",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "budgetdocuments",
                    localField: "_id",
                    foreignField: "ulb",
                    as: "budgetDocs"
                }
            },
            { $match: { budgetDocs: { $ne: [] } } },
            {
                $project: {
                    ulbId: "$_id",
                    ulbName: "$name",
                    state: "$state.name",
                    budgetDocs: 1
                }
            },
            { $unwind: "$budgetDocs" },
            { $unwind: "$budgetDocs.yearsData" },
            { $match: { "budgetDocs.yearsData.designYear": year } },
            {
                $addFields: {
                    cfrFiles: {
                        $filter: {
                            input: "$budgetDocs.yearsData.files",
                            as: "file",
                            cond: { $eq: ["$$file.source", "cfr"] }
                        }
                    },
                    ulbFiles: {
                        $filter: {
                            input: "$budgetDocs.yearsData.files",
                            as: "file",
                            cond: {
                                $and: [
                                    { $eq: ["$$file.type", "pdf"] },
                                    { $eq: ["$$file.source", "ulb"] }
                                ]
                            }
                        }
                    },
                    dnfFiles: {
                        $filter: {
                            input: "$budgetDocs.yearsData.files",
                            as: "file",
                            cond: { $eq: ["$$file.source", "dni"] }
                        }
                    }
                }
            },
            {
                $addFields: {
                    selectedFiles: {
                        $cond: [
                            { $gt: [{ $size: "$cfrFiles" }, 0] },
                            "$cfrFiles",
                            {
                                $cond: [
                                    { $gt: [{ $size: "$ulbFiles" }, 0] },
                                    "$ulbFiles",
                                    "$dnfFiles"
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: "$ulbId",
                    ulbId: "$ulbId",
                    ulbName: 1,
                    state: 1,
                    year: "$budgetDocs.yearsData.designYear",
                    fileName: { $concat: ["$state", "_", "$ulbName", "_", "$budgetDocs.yearsData.designYear"] },
                    fileUrl: { $arrayElemAt: ["$selectedFiles.url", 0] },
                    modifiedAt: { $arrayElemAt: ["$selectedFiles.createdAt", 0] },
                    type,
                    section: "budgetPdf"
                }
            },
            { $skip: Number(skip) },
            { $limit: Number(limit) }
        ]

        // console.log(JSON.stringify(query, null, 2));
        return query;

    } catch (error) {
        console.error("Failed to create query: ", error);
    }
};

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

// eg: Input: 21, Output: obj of 2021-22, 2022-23, 2023-24... 
// sameple output [ { _id: 606aaf854dff55e6c075d219, year: '2021-22', isActive: true }...]
async function getDesiredYears(yr) {
    return await Year.aggregate(
        [{
            $match: {
                $expr: {
                    $gt: [{ $toInt: { $arrayElemAt: [{ $split: ["$year", "-"] }, 1] } }, yr]
                }
            }
        }]
    );
}

async function checkPrevYrFilledStatus(ulbId) {
    const yearObj = await getDesiredYears(21);
    const yearToBeChecked = yearObj.map((ele) => ObjectId(ele._id));

    const aaFilledStatusReport = await AnnualAccountData.aggregate([
        {
            $match: {
                ulb: ObjectId(ulbId),
                design_year: { $in: yearToBeChecked },
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