const ExcelJS = require("exceljs");
const ObjectId = require("mongoose").Types.ObjectId;
// const ensureArray = require('ensure-array');

const MainCategory = require('../../models/Master/MainCategory');
const Ulb = require('../../models/Ulb');
const GrantAllocation2324 = require('../../models/GrantAllocation2324');
const State = require('../../models/State');
const CategoryFileUpload = require('../../models/CategoryFileUpload');
const { loadExcelByUrl } = require('../../util/worksheet');
const { isValidObjectId } = require("mongoose");
const { isValidDate } = require("../../util/helper");
const {getStorageBaseUrl} = require('./../../service/getBlobUrl');
const StateGsdpData = require("../../models/StateGsdp");
const { getAllCurrAndPrevYearsObjectIds } = require("../../service/years");
// const { query } = require("express");

const GSDP_OPTIONS = {
    ELIGIBLE: 'eligible',
    NOT_ELIGIBLE: 'not eligible'
}

const DULY_ELECTED_OPTIONS = {
    DULY_ELECTED: 'duly elected',
    NOT_ELECTED: 'not elected'
}


const isValidNumber = str => {
    return !isNaN(Number(str));
}

const handleDatabaseUpload = async (req, res, next) => {
    let workbook;
    let worksheet;
    const templateName = req.body.templateName;
    const uploadType = req.body.uploadType;

    if(!req.body.design_year || !isValidObjectId(req.body?.design_year))  {
        return res.status(400).json({
            success: false,
            message: "design_year is required.",
        });
    }

    if (uploadType != 'database') return next();

    try {
        const remoteUrl = getStorageBaseUrl() + req.body.files?.[0].url;
        workbook = await loadExcelByUrl(remoteUrl);
        worksheet = workbook.getWorksheet(1);

        if (templateName == 'dulyElected') await updateDulyElectedTemplate(req, res, next, worksheet, workbook);
        if (templateName == 'gsdp') await updateGsdpTemplate(req, res, next, worksheet, workbook);
        if (templateName == 'stateGsdp') await updatestateGsdpTemplate(req, res, next, worksheet, workbook);

        const uploaded = await CategoryFileUpload.findOne({
            subCategoryId: ObjectId(req.body?.subCategoryId),
            design_year : ObjectId(req.body?.design_year)
        });

        if (uploaded) {
            req.body.id = uploaded._id;
        }
        next();
    } catch (err) {
        console.log(err);
        if (err.validationErrors?.length) {
            err.validationErrors.forEach(({ r, c, message = 'Some error' }) => {
                const cell = worksheet.getCell(r, c);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
                cell.note = {
                    texts: [{ text: message }]
                };
            })
            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Disposition', `attachment; filename=${templateName}-errors.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buffer);
        }

        return res.status(500).json({
            status: true,
            message: err || "Something went wront",
        });
    }
}

const dulyElectedTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    try {
        const relatedIds = Array.isArray(req.query.relatedIds) ? req.query.relatedIds : [req.query.relatedIds];
        const startingRow = 3;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');
        worksheet.getColumn(2).eachCell(cell => {

        })
        worksheet.columns = [
            { header: '_id', key: '_id', width: 20, hidden: true },
            { header: 'S no', key: 'sno', },
            { header: 'State Name', key: 'stateName', width: 20 },
            { header: 'State Code', key: 'stateCode', },
            { header: 'ULB Name', key: 'name', width: 30, hidden: true },
            { header: 'ULB City Finance Code', key: 'code' },
            { header: 'Census Code', key: 'censusCode' },
            { header: 'Area (As per Census 2011)', key: 'area' },
            { header: 'Population (As per Census 2011)', key: 'population', width: 20 },
            { header: 'Status of ULBs (Duly Elected/Not elected)', key: 'isDulyElected', width: 20, },
            { header: 'Elected Date as per the State', key: 'electedDate', width: 20 },
            { header: 'untiedGrantAmount', key: 'untiedGrantAmount', width: 20 },
            { header: 'untiedGrantPercent', key: 'untiedGrantPercent', width: 20 },
            { header: 'tiedGrantAmount', key: 'tiedGrantAmount', width: 20 },
            { header: 'tiedGrantPercent', key: 'tiedGrantPercent', width: 20 },
        ];

        const emptyRowsArray = Array.from({ length: startingRow - 1 }, () => Array.from({ length: worksheet.columnCount }, () => ''));
        console.log('emptyRowsArray', emptyRowsArray);
        worksheet.addRows(emptyRowsArray);

        const columnsToHide = [2]; // Index of the column to hide (columns are 0-indexed)
        columnsToHide.forEach(columnIndex => {
            worksheet.getColumn(columnIndex + 1).header.hidden = true;
        });

        worksheet.getRows(1, startingRow).forEach(row => {
            row.eachCell({ includeEmpty: true }, cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'ffbdd7ee' }
                };
            });
        });
        const query = [
            {
                $match: {
                    isActive: true,
                    state: { $in: relatedIds.map(id => ObjectId(id)) }
                }
            },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            {
                $unwind: '$state'
            },
            {
                $lookup: {
                    from: "grantallocation2324",
                    localField: "_id",
                    foreignField: "ulbId",
                    as: "grantallocation2324"
                }
            },
            {
                $project: {
                    _id: { $toString: '$_id' },
                    sno: '',
                    stateName: '$state.name',
                    stateCode: '$state.code',
                    name: 1,
                    code: 1,
                    censusCode: 1,
                    area: 1,
                    population: 1,
                    isDulyElected: {
                        $cond: {
                            if: { $eq: ["$isDulyElected", true] },
                            then: 'Duly Elected',
                            else: {
                                $cond: {
                                    if: { $eq: ["$isDulyElected", false] },
                                    then: 'Not Elected',
                                    else: ''
                                }
                            }
                        }
                    },
                    electedDate: 1,
                    untiedGrantAmount: { $arrayElemAt: ['$grantallocation2324.untiedGrantAmount', 0] },
                    untiedGrantPercent: { $arrayElemAt: ['$grantallocation2324.untiedGrantPercent', 0] },
                    tiedGrantAmount: { $arrayElemAt: ['$grantallocation2324.tiedGrantAmount', 0] },
                    tiedGrantPercent: { $arrayElemAt: ['$grantallocation2324.tiedGrantPercent', 0] },
                }
            }
        ];

        const ulbData = await Ulb.aggregate(query);


        worksheet.addRows(ulbData.map((value, sno) => ({ ...value, sno: sno + 1 })), { startingRow, properties: { outlineLevel: 1 } });

        // console.log('worksheet', worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);


    } catch (err) {
        console.log(err)
    }
}

const updateDulyElectedTemplate = async (req, res, next, worksheet, workbook) => {
    try {
        const validationErrors = [];
        const columnId = 1;
        const columnDulyElected = 10;
        const columnDulyElectedDate = 11;
        const columnUntiedGrantAmount = 12;
        const columnUntiedGrantPercent = 13;
        const columnTiedGrantAmount = 14;
        const columnTiedGrantPercent = 15;

        const _ids = worksheet.getColumn(columnId).values;
        const dulyElectedsColumns = worksheet.getColumn(columnDulyElected).values;
        const dulyElectedsDateColumns = worksheet.getColumn(columnDulyElectedDate).values;
        const untiedGrantAmountColumns = worksheet.getColumn(columnUntiedGrantAmount).values;
        const untiedGrantPercentColumns = worksheet.getColumn(columnUntiedGrantPercent).values;
        const tiedGrantAmountColumns = worksheet.getColumn(columnTiedGrantAmount).values;
        const tiedGrantPercentColumns = worksheet.getColumn(columnTiedGrantPercent).values;





        const dulyElectedUpdateQuery = _ids.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;
            // if (!req.body.ulbIds?.includes('' + _id)) return;

            if (typeof dulyElectedsColumns[index] !== 'string' || !Object.values(DULY_ELECTED_OPTIONS).includes(dulyElectedsColumns[index]?.toLowerCase())) {
                validationErrors.push({
                    r: index,
                    c: columnDulyElected,
                    message: `Please selected "Duly Elected" or "Not Elected"`
                });
            }


            const isDulyElected = typeof dulyElectedsColumns[index] === 'string' ? (dulyElectedsColumns[index]?.toLowerCase() == DULY_ELECTED_OPTIONS.DULY_ELECTED) : null;
            let electedDate = dulyElectedsDateColumns[index];
            if (typeof dulyElectedsDateColumns[index] == 'string') {
                electedDate = new Date(dulyElectedsDateColumns[index]?.split('/')?.reverse()?.join('-'));
            } else if (isValidDate(dulyElectedsDateColumns[index])) {
                electedDate = dulyElectedsDateColumns[index];
            }
            if (electedDate && !isValidDate(electedDate)) {
                validationErrors.push({
                    r: index,
                    c: columnDulyElectedDate,
                    message: `Please selected a valid date in format dd/mm/yyyy`
                });
            }
            const result = {
                updateOne: {
                    filter: { _id: ObjectId(_id) },
                    update: {
                        $set: {
                            isDulyElected,
                            ...(isDulyElected == true && isValidDate(electedDate) && {
                                electedDate
                            })
                        }
                    }
                }
            }
            return result;
        }).filter(i => i);


        const grantAllocation2324UpdateQuery = _ids.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;
            const untiedGrantAmount = untiedGrantAmountColumns[index];
            const untiedGrantPercent = untiedGrantPercentColumns[index];
            const tiedGrantAmount = tiedGrantAmountColumns[index];
            const tiedGrantPercent = tiedGrantPercentColumns[index];

            if (tiedGrantAmount && !isValidNumber(tiedGrantAmount)) {
                validationErrors.push({ r: index, c: columnTiedGrantAmount, message: `Please enter a valid number` });
            }
            if (tiedGrantPercent && !isValidNumber(tiedGrantPercent)) {
                validationErrors.push({ r: index, c: columnTiedGrantPercent, message: `Please enter a valid number` });
            }
            if (untiedGrantAmount && !isValidNumber(untiedGrantAmount)) {
                validationErrors.push({ r: index, c: columnUntiedGrantAmount, message: `Please enter a valid number` });
            }
            if (untiedGrantPercent && !isValidNumber(untiedGrantPercent)) {
                validationErrors.push({ r: index, c: columnUntiedGrantPercent, message: `Please enter a valid number` });
            }

            if (tiedGrantPercent && (+tiedGrantPercent < 0 || +tiedGrantPercent > 100)) {
                validationErrors.push({
                    r: index,
                    c: columnTiedGrantPercent,
                    message: `Should be in range 0-100`
                });
            }

            if (untiedGrantPercent && (+untiedGrantPercent < 0 || +untiedGrantPercent > 100)) {
                validationErrors.push({
                    r: index,
                    c: columnUntiedGrantPercent,
                    message: `Should be in range 0-100`
                });
            }

            const result = {
                updateOne: {
                    filter: { ulbId: ObjectId(_id) },
                    update: {
                        $set: {

                            untiedGrantAmount,
                            untiedGrantPercent,
                            tiedGrantAmount,
                            tiedGrantPercent
                        }
                    },
                    upsert: true
                }
            };
            return result;
        }).filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        const result = await Ulb.bulkWrite(dulyElectedUpdateQuery);
        const result2 = await GrantAllocation2324.bulkWrite(grantAllocation2324UpdateQuery);
        console.log('result', result, result2);
        Promise.resolve("Data updated");
    } catch (err) {
        console.log(err);
        Promise.reject("Something went wrong");
    }
}

const gsdpTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    try {
        const relatedIds = Array.isArray(req.query.relatedIds) ? req.query.relatedIds : [req.query.relatedIds];
        const startingRow = 1;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');

        worksheet.columns = [
            { header: '_id', key: '_id', width: 20, hidden: true },
            { header: 'S no', key: 'sno', },
            { header: 'State Name', key: 'stateName', width: 20 },
            { header: 'State Code', key: 'stateCode', },
            { header: 'ULB Name', key: 'name', width: 30, hidden: true },
            { header: 'ULB Code', key: 'code' },
            { header: 'ULB type', key: 'ulbType' },
            { header: 'Census Code', key: 'censusCode' },
            { header: 'Population (As per Census 2011)', key: 'population', width: 20 },
            { header: 'Is it Million Plus (Yes/No)', key: 'isMillionPlus', width: 20 },
            { header: 'Is it a part of UA (Yes/No)', key: 'isUA', width: 20 },
            { header: 'Name of UA', key: 'uaName', width: 20 },
            { header: 'GSDP Eligibility Condition (Eligible/Not Eligible)', key: 'isGsdpEligible', width: 20 },
        ];

        worksheet.getRows(1, startingRow).forEach(row => {
            row.eachCell({ includeEmpty: true }, cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'ffbdd7ee' }
                };
            });
        });

        const ulbData = await Ulb.aggregate([
            {
                $match: {
                    isActive: true,
                    state: { $in: relatedIds.map(id => ObjectId(id)) }
                }
            },
            {
                $lookup: {
                    from: "states",
                    localField: "state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            {
                $lookup: {
                    from: 'ulbtypes',
                    localField: 'ulbType',
                    foreignField: '_id',
                    as: 'ulbType'
                }
            },
            {
                $lookup: {
                    from: 'uas',
                    localField: 'UA',
                    foreignField: '_id',
                    as: 'ua'
                }
            },
            {
                $unwind: '$state',
            },
            {
                $project: {
                    _id: { $toString: '$_id' },
                    sno: '',
                    stateName: '$state.name',
                    stateCode: '$state.code',
                    name: 1,
                    code: 1,
                    ulbType: { $arrayElemAt: ['$ulbType.name', 0] },
                    censusCode: 1,
                    area: 1,
                    population: 1,
                    isMillionPlus: 1,
                    isUA: 1,
                    uaName: { $arrayElemAt: ['$ua.name', 0] },
                    isDulyElected: 1,
                    isGsdpEligible: {
                        $cond: {
                            if: { $eq: ["$isGsdpEligible", true] },
                            then: 'Eligible',
                            else: {
                                $cond: {
                                    if: { $eq: ["$isGsdpEligible", false] },
                                    then: 'Not Eligible',
                                    else: ''
                                }
                            }
                        }
                    },
                    electedDate: 1
                }
            }
        ]);


        worksheet.addRows(ulbData.map((value, sno) => ({ ...value, sno: sno + 1 })), { startingRow, properties: { outlineLevel: 1 } });

        // console.log('worksheet', worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);


    } catch (err) {
        console.log(err)
    }
}
const stateGsdpTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    try {
        const relatedIds = Array.isArray(req.query.relatedIds) ? req.query.relatedIds : [req.query.relatedIds];
        const startingRow = 1;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');

        worksheet.columns = [
            { header: '_id', key: '_id', width: 20, hidden: true },
            { header: 'S no', key: 'sno', },
            { header: 'State', key: 'stateName', width: 20 },
            { header: 'Average GSDP growth rate of previous 5 years at Constant prices', key: 'constantPrice', width: 30 },
            { header: 'Average GSDP growth rate of previous 5 years at Current prices', key: 'currentPrice', width: 30 },
        ];
        
        worksheet.getRows(1, startingRow).forEach(row => {
            row.height = 60;
            row.alignment = { vertical: "middle", wrapText: true, horizontal: "center"};
            row.eachCell({ includeEmpty: true }, cell => {
                cell.font = {bold: true}
            });
        });

        const stateGsdpData = await State.aggregate([
            {
                $match: {
                    _id: { $in: relatedIds.map(id => ObjectId(id)) }
                }
            },
            {
                $lookup: {
                    from: 'state_gsdp',
                    localField: '_id',
                    foreignField: 'stateId',
                    as: 'gsdp_data'
                }
            },
            {
                $unwind: {
                  path: "$gsdp_data",
                  preserveNullAndEmptyArrays: true
                }
              },
            {
                $addFields: {
                    prices: {
                        $filter: {
                            input: '$gsdp_data.data',
                            as: 'item',
                            cond: { $eq: ['$$item.year', '2018-23'] },
            
                        }
                    }    
                }
            },
            {
                $unwind: {
                  path: "$prices",
                  preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: { $toString: '$_id' },
                    stateName: "$name",
                    constantPrice: '$prices.constantPrice',
                    currentPrice: '$prices.currentPrice',
                }
            }
        ]);

        worksheet.addRows(stateGsdpData.map((value, sno) => ({ ...value, sno: sno + 1 })), { startingRow, properties: { outlineLevel: 1 } });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);


    } catch (err) {
        console.log(err)
    }
}


const updateGsdpTemplate = async (req, res, next, worksheet, workbook) => {
    try {
        const validationErrors = [];
        const columnId = 1;
        const columnGdspElected = 13;

        const _ids = worksheet.getColumn(columnId).values;
        const gdsps = worksheet.getColumn(columnGdspElected).values;

        const gsdpUpdateQuery = _ids.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;
            // if (!req.body.ulbIds?.includes('' + _id)) return;

            if (typeof gdsps[index] !== 'string' || !Object.values(GSDP_OPTIONS).includes(gdsps[index]?.toLowerCase())) {
                validationErrors.push({
                    r: index,
                    c: columnGdspElected,
                    message: `Please selected "Eligible" or "Not Eligible"`
                });
            }

            const isGsdpEligible = typeof gdsps[index] === 'string' ? (gdsps[index]?.toLowerCase() == GSDP_OPTIONS.ELIGIBLE) : null;
            const result = {
                updateOne: {
                    filter: { _id: ObjectId(_id) },
                    update: {
                        $set: {
                            isGsdpEligible,
                        }
                    }
                }
            }
            return result;
        }).filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        await Ulb.bulkWrite(gsdpUpdateQuery);
        Promise.resolve("Data updated");
    } catch (err) {
        console.log(err);
        Promise.reject("Something went wrong");
    }
}

const updatestateGsdpTemplate = async (req, res, next, worksheet, workbook) => {
    try {
        const validationErrors = [];
        const columnId = 1;
        const columnConstantPrice = 4;
        const columnCurrentPrice = 5;
        const columnState = 3;

        const _ids = worksheet.getColumn(columnId).values;
        const stateGsdpConstantPrices = worksheet.getColumn(columnConstantPrice).values;
        const stateGsdpCurrentPrices = worksheet.getColumn(columnCurrentPrice).values;
        const stateName = worksheet.getColumn(columnState).values;

        const promises = _ids.map(async (_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;

            if (isNaN(stateGsdpConstantPrices[index]) || [undefined, ""].includes(stateGsdpConstantPrices[index])) {
                validationErrors.push({
                    r: index,
                    c: columnConstantPrice,
                    message: `Value should be a number and can't be empty`
                });
            }

            if (isNaN(stateGsdpCurrentPrices[index]) && [undefined, ""].includes(stateGsdpCurrentPrices[index])) {
                validationErrors.push({
                    r: index,
                    c: columnCurrentPrice,
                    message: `Value should be a number and can't be empty`
                });
            }

            let checkStateGsdpData = await StateGsdpData.findOne({ stateId: ObjectId(_id) }).lean();

            if(checkStateGsdpData) {
                validationErrors.push({
                    r: index,
                    c: columnState,
                    message: `Already Uploaded data`
                });
            }
            
            const result = {
                "stateId" : ObjectId(_id),
                "stateName" : stateName[index],
                "data" : [
                    {
                        "year" : "2018-23",
                        "constantPrice" : stateGsdpConstantPrices[index],
                        "currentPrice" : stateGsdpCurrentPrices[index]
                    }
                ],
            }
            return result;
        });

        const results = (await Promise.all(promises)).filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        await StateGsdpData.insertMany(results);
        Promise.resolve("Data updated");
    } catch (err) {
        console.log(err);
        Promise.reject("Something went wrong");
    }
}

const getTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    if (templateName == 'dulyElected') return dulyElectedTemplate(req, res, next);
    if (templateName == 'gsdp') return gsdpTemplate(req, res, next);
    if (templateName == 'stateGsdp') return stateGsdpTemplate(req, res, next);
}

const getCategoryWiseResource = async (req, res, next) => {

    try {
        const query = [
            {
                $match: {
                    module: 'state_resource',
                    design_year: ObjectId(req.query?.design_year)
                },
            },
            {
                $unwind: {
                    path: "$relatedIds",
                }
            },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory'
                }
            },
            {
                $match: {
                    'subCategory.uploadType': 'file',
                    relatedIds: ObjectId(req.params.stateId || req.decoded.state)
                }
            },
            {
                $group: {
                    _id: '$categoryId',
                    documents: {
                        $push: {
                            $mergeObjects: [
                                '$$ROOT.file',
                                { createdAt: '$$ROOT.createdAt' }
                            ]
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $lookup: {
                    from: 'maincategories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $project: {
                    name: { $arrayElemAt: ['$category.name', 0] },
                    documents: 1
                }
            }
        ];
        const data = await CategoryFileUpload.aggregate(query);
        return res.status(200).json({
            status: true,
            message: "Fetched Successfully",
            data,
        });
    } catch (err) {
        console.log(err);
    }
}

const removeStateFromFiles = async (req, res, next) => {
    try {
        const {
            stateId,
            fileIds
        } = req.body;

        const data = await CategoryFileUpload.updateMany(
            { _id: { $in: fileIds } },
            { $pull: { relatedIds: stateId } }
        );
        return res.status(200).json({
            status: true,
            message: "State removed!",
            data,
        });

    }
    catch (err) {
        console.log(err);
    }
}

const getResourceList = async (req, res, next) => {
    const skip = +req.query.skip || 0;
    const limit = +req.query.limit || 2;
    const { categoryId, stateId, subCategoryId, design_year } = req.query;
    const allCurrAndPrevYearIds = getAllCurrAndPrevYearsObjectIds(design_year);

    try {
        const query = [
            {
                $match: {
                    module: 'state_resource',
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $addFields: {
                    relatedIdsCopy: "$relatedIds"
                }
            },
            {
                $unwind: {
                    path: "$relatedIds",
                }
            },
            ...(categoryId || stateId || subCategoryId || design_year ? [
                {
                    $match: {
                        ...(categoryId && { categoryId: ObjectId(categoryId) }),
                        ...(subCategoryId && { subCategoryId: ObjectId(subCategoryId) }),
                        ...(stateId && { relatedIds: ObjectId(stateId) }),
                        ...(design_year && { design_year: ObjectId(design_year) }),
                    }
                },
            ] : []),
            {
                $lookup: {
                    from: 'states',
                    localField: 'relatedIds',
                    foreignField: '_id',
                    as: 'state'
                }
            },
            {
                $group: {
                    _id: "$relatedIds",
                    documents: { $push: "$$ROOT" },
                }
            },
            { $unwind: '$documents' },
            { $replaceRoot: { newRoot: '$documents' } },
            {
                $lookup: {
                    from: 'maincategories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory'
                }
            },
            {
                $unwind: '$state'
            },
            {
                $unwind: '$category'
            },
            {
                $unwind: '$subCategory'
            },
            {
                $group: {
                    _id: {
                        state: '$state',
                        category: '$category',
                        subCategory: '$subCategory',
                    },
                    documents: { $push: "$$ROOT" },
                }
            },
            {
                $project: {
                    _id: 0,
                    file: 1,
                    state: '$_id.state',
                    category: '$_id.category',
                    subCategory: '$_id.subCategory',
                    files: {
                        $map: {
                            input: '$documents',
                            as: 'doc',
                            in: {
                                name: '$$doc.file.name',
                                url: '$$doc.file.url',
                                relatedIds: '$$doc.relatedIdsCopy',
                                relatedId: '$$doc.relatedIds',
                                createdAt: '$$doc.createdAt',
                                _id: '$$doc._id',
                            }
                        }
                    }
                }
            },
            { $sort: { "files.0.createdAt": -1 } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    documents: [
                        { $limit: skip + limit },
                        { $skip: skip },
                    ]
                }
            }
        ];
        const [categoryResult] = await CategoryFileUpload.aggregate(query);
        const documents = categoryResult.documents || {};
        const totalDocuments = categoryResult?.totalCount?.[0]?.count || 0;
        const states = await State.find({ isUT: false }).select('name _id');
        const categories = await MainCategory.aggregate([
            {
                $match: { typeOfCategory: "state_resource", isActive: true }
            },
            {
                $lookup: {
                    from: "subcategories",
                    let: { mainCategoryId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$$mainCategoryId", "$categoryId"] },
                                        { $in: ["$design_year", allCurrAndPrevYearIds] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "subCategories"
                }
            },
            {
                $project: {
                    name: 1,
                    subCategories: 1
                }
            }
        ]);
        return res.status(200).json({
            status: true,
            message: "Fetched Successfully",
            data: {
                documents,
                states,
                categories,
                totalDocuments
            },
        });
    }
    catch (err) {
        console.log(err);
    }
}

const createOrUpdate = async (req, res, next) => {
    const { id, files, design_year } = req.body;
    delete req.body.id;
    delete req.body.files;
    delete req.body.actionType;
    try {
        data = [];
        for (let file of files) {
            let result = await CategoryFileUpload.updateOne(
                { _id: ObjectId(id), design_year: ObjectId(design_year) },
                {
                    ...req.body,
                    design_year: ObjectId(design_year),
                    module: 'state_resource',
                    file
                },
                { upsert: true }
            );
            data.push(result);
        }
        return res.status(200).json({
            status: true,
            message: "Successfully saved data!",
            data: data,
        });
    } catch (error) {
        let message = "Something went wrong!";
        return res.status(400).json({
            status: false,
            message: error.message || message,
            err: error.message,
        });
    }
}






module.exports = {
    handleDatabaseUpload,
    getResourceList,
    getTemplate,
    getCategoryWiseResource,
    removeStateFromFiles,
    createOrUpdate
}