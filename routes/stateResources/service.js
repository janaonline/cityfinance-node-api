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
const { getAllCurrAndPrevYearsObjectIds, getDesiredYear } = require("../../service/years");
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
    return !(isNaN(Number(str)) || [undefined, ""].includes(str));
}

const handleDatabaseUpload = async (req, res, next) => {
    let workbook;
    let worksheet;
    const { design_year, templateName, uploadType } = req.body;

    if(!design_year || !isValidObjectId(design_year))  {
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

        if (templateName == 'dulyElected') await updateDulyElectedTemplate(req, res, next, worksheet, workbook, design_year, templateName);
        if (templateName == 'gsdp') await updateGsdpTemplate(req, res, next, worksheet, workbook, design_year, templateName);
        if (templateName == 'stateGsdp') await updatestateGsdpTemplate(req, res, next, worksheet, workbook);

        /* Category file upload needs to be create for every states */
        // const uploaded = await CategoryFileUpload.findOne({
        //     subCategoryId: ObjectId(req.body?.subCategoryId),
        //     design_year : ObjectId(req.body?.design_year)
        // });

        // if (uploaded) {
        //     req.body.id = uploaded._id;
        // }
        next();
    } catch (err) {
        if (err.validationErrors?.length) {
            err.validationErrors.forEach(({ r, c, message = 'Some error' }) => {
                const cell = worksheet.getCell(r, c);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
                cell.note = {
                  texts: [{ text: message }],
                };
            })
            const buffer = await workbook.xlsx.writeBuffer();
            res.setHeader('Content-Disposition', `attachment; filename=${templateName}-errors.xlsx`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            return res.send(buffer);
        } else if(err.invalidSheet) {
            return res.status(400).send({ success: false, message: err.invalidSheet || err })
        }
        console.log(err);
        return res.status(500).json({
            status: true,
            message: err || "Something went wrong",
        });
    }
}

const dulyElectedTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    const { design_year } = req.query;
    const { yearName } = getDesiredYear(design_year);
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
            { header: 'State Code', key: 'stateCode', width: 20},
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
                    let: { ulbId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$ulbId", "$$ulbId"] },
                                        { $eq: ["$design_year", ObjectId(design_year)] }
                                    ]
                                }
                            }
                        }
                    ],
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
                            if: { $eq: [`$dulyElected.${yearName}.eligible`, true] },
                            then: 'Duly Elected',
                            else: {
                                $cond: {
                                    if: { $eq: [`$dulyElected.${yearName}.eligible`, false] },
                                    then: 'Not Elected',
                                    else: ''
                                }
                            }
                        }
                    },
                    electedDate: `$dulyElected.${yearName}.electedDate`,
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

const updateDulyElectedTemplate = async (req, res, next, worksheet, workbook, design_year, templateName) => {
    try {
        const { yearName } = getDesiredYear(design_year)
        const validationErrors = [];
        const columnId = 1;
        const columnDulyElected = 10;
        const columnDulyElectedDate = 11;
        const columnUntiedGrantAmount = 12;
        const columnUntiedGrantPercent = 13;
        const columnTiedGrantAmount = 14;
        const columnTiedGrantPercent = 15;
        const stateColumn = 3;

        const _ids = worksheet?.getColumn(columnId).values;
        const dulyElectedsColumns = worksheet?.getColumn(columnDulyElected).values;
        const dulyElectedsDateColumns = worksheet?.getColumn(columnDulyElectedDate).values;
        const untiedGrantAmountColumns = worksheet?.getColumn(columnUntiedGrantAmount).values;
        const untiedGrantPercentColumns = worksheet?.getColumn(columnUntiedGrantPercent).values;
        const tiedGrantAmountColumns = worksheet?.getColumn(columnTiedGrantAmount).values;
        const tiedGrantPercentColumns = worksheet?.getColumn(columnTiedGrantPercent).values;
        const stateName = worksheet?.getColumn(stateColumn).values;
        const uniqueStateNames = Array.isArray(stateName) ? new Set([...stateName]): []

        const stateExist = stateExistsInTemplate(req.body?.relatedIds, Array.from(uniqueStateNames), templateName);
        if(!stateExist) {
            return Promise.reject({ invalidSheet:  "The data in the sheet does not match the selected state(s)."});
        }

        const dulyElectedUpdateQuery = _ids?.map((_id, index) => {
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

            const updateObj = {
                [`dulyElected.${yearName}`]: {
                    "eligible" : isDulyElected,
                    ...(isDulyElected == true && isValidDate(electedDate) && {
                        electedDate
                    })
                },
            }

            const result = {
                updateOne: {
                    filter: { _id: ObjectId(_id) },
                    update: {
                        $set: {...updateObj}
                    }
                }
            }
            return result;
        }).filter(i => i);

        let checkGrantAllocation2324Data = await GrantAllocation2324.find({
            ulbId: {
                $in: _ids?.filter(_id => _id && isValidObjectId(_id)).map(_id => ObjectId(_id)),
            }, design_year: ObjectId(design_year)
        }).lean();

        const grantAllocation2324UpdateQuery = _ids?.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;
            const untiedGrantAmount = untiedGrantAmountColumns[index];
            const untiedGrantPercent = untiedGrantPercentColumns[index];
            const tiedGrantAmount = tiedGrantAmountColumns[index];
            const tiedGrantPercent = tiedGrantPercentColumns[index];

            if (!isValidNumber(tiedGrantAmount)) {
                validationErrors.push({ r: index, c: columnTiedGrantAmount, message: `Please enter a valid number` });
            }
            if (!isValidNumber(tiedGrantPercent)) {
                validationErrors.push({ r: index, c: columnTiedGrantPercent, message: `Please enter a valid number` });
            }
            if (!isValidNumber(untiedGrantAmount)) {
                validationErrors.push({ r: index, c: columnUntiedGrantAmount, message: `Please enter a valid number` });
            }
            if (!isValidNumber(untiedGrantPercent)) {
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

            if(checkGrantAllocation2324Data.find(item => item.ulbId.toString() == _id)) {
                validationErrors.push({
                    r: index,
                    c: stateColumn,
                    message: `Data for ${stateName[index]} cannot be modified as it was already updated.`
                });
            }

            const result = {
                updateOne: {
                    filter: { ulbId: ObjectId(_id), design_year: ObjectId(design_year) },
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
        })?.filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        if(!dulyElectedUpdateQuery || !(dulyElectedUpdateQuery?.length && grantAllocation2324UpdateQuery?.length)) {
            return Promise.reject({ invalidSheet:  "Please upload the correct excel sheet"});
        }

        const result = await Ulb.bulkWrite(dulyElectedUpdateQuery);
        const result2 = await GrantAllocation2324.bulkWrite(grantAllocation2324UpdateQuery);
        // console.log('result', result, result2);
        Promise.resolve("Data updated");
    } catch (err) {
        console.log(err);
        Promise.reject("Something went wrong");
    }
}

const gsdpTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    const { yearName } = getDesiredYear(req.query.design_year)
    try {
        const relatedIds = Array.isArray(req.query.relatedIds) ? req.query.relatedIds : [req.query.relatedIds];
        const startingRow = 1;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');

        worksheet.columns = [
            { header: '_id', key: '_id', width: 20, hidden: true },
            { header: 'S no', key: 'sno', },
            { header: 'State Name', key: 'stateName', width: 20 },
            { header: 'ULB type', key: 'ulbType', width: 30 },
            { header: 'ULB Name', key: 'name', width: 30, hidden: true },
            { header: 'ULB Code', key: 'code' },
            { header: 'State Code', key: 'stateCode' },
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
                            if: { $eq: [`$gsdp.${yearName}.eligible`, true] },
                            then: 'Eligible',
                            else: {
                                $cond: {
                                    if: { $eq: [`$gsdp.${yearName}.eligible`, false] },
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
            { header: 'S no', key: 'sno', hidden: true },
            { header: 'State', key: 'stateName', width: 20 },
            { header: 'Average GSDP growth rate of previous 5 years at Constant prices (2018-19 to 2022-23)', key: 'constantPrice', width: 30 },
            { header: 'Average GSDP growth rate of previous 5 years at Current prices (2018-19 to 2022-23)', key: 'currentPrice', width: 30 },
        ];
        
        worksheet.getRow(startingRow).height = 60;
        worksheet.getRow(startingRow).alignment = { vertical: 'middle', wrapText: true, horizontal: 'center' };
        worksheet.getRow(startingRow).eachCell({ includeEmpty: true }, cell => {
            cell.font = { bold: true };
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
                    path: '$gsdp_data',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    prices: {
                        $filter: {
                            input: '$gsdp_data.data',
                            as: 'item',
                            cond: { $eq: ['$$item.year', '2018-23'] }
                        }
                    }
                }
            },
            {
                $unwind: {
                    path: '$prices',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: { $toString: '$_id' },
                    stateName: '$name',
                    constantPrice: '$prices.constantPrice',
                    currentPrice: '$prices.currentPrice'
                }
            }
        ]);

        worksheet.addRows(stateGsdpData.map((value, sno) => ({ ...value, sno: sno + 1 })), {
            startingRow,
            properties: { outlineLevel: 1 }
        });

        // Set up data validation for 'constantPrice' and 'currentPrice' columns
        const constantPriceColumn = worksheet.getColumn('constantPrice');
        const currentPriceColumn = worksheet.getColumn('currentPrice');

        constantPriceColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            // Apply custom data validation for constantPrice column
            if (rowNumber > 1) {
                cell.dataValidation = {
                    type: 'decimal',
                    operator: 'greaterThanOrEqual',
                    allowBlank: false,
                    showErrorMessage: true,
                    formula1: 0,
                    errorTitle: 'Validation',
                    error: 'Value should be a number'
                };
            }
        });

        currentPriceColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            // Apply custom data validation for currentPrice column
            if (rowNumber > 1) {
                cell.dataValidation = {
                    type: 'decimal',
                    operator: 'greaterThanOrEqual',
                    allowBlank: true,
                    showErrorMessage: true,
                    formula1: 0,
                    errorTitle: 'Validation',
                    error: 'Value should be a number'
                };
            }
        });

        // Set up data validation for 'stateName' column
        const stateNameColumn = worksheet.getColumn('stateName');
        stateNameColumn.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            // Apply custom data validation
            cell.dataValidation = {
                type: 'custom',
                formula1: '0',
                formula2: '0',
                showErrorMessage: true,
                errorTitle: 'Non Editable',
                error: 'State Name cannot be editable',
                errorStyle: 'stop',
                allowBlank: true,
                showInputMessage: false
            };
            if(rowNumber > 1) {
                cell.font = {
                    color: { argb: 'FF808080' }
                };
            }
        });

        // Generate Excel file and send as response
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (err) {
        console.log(err)
    }
}


const updateGsdpTemplate = async (req, res, next, worksheet, workbook, design_year, templateName) => {
    try {
        const validationErrors = [];
        const columnId = 1;
        const columnGdspElected = 13;
        const columnState = 3;

        const _ids = worksheet?.getColumn(columnId).values;
        const gdsps = worksheet?.getColumn(columnGdspElected).values;
        const stateName = worksheet?.getColumn(columnState).values;
        const {yearName} = getDesiredYear(design_year);

        const uniqueStateNames = Array.isArray(stateName) ? new Set([...stateName]): []

        const stateExist = stateExistsInTemplate(req.body?.relatedIds, Array.from(uniqueStateNames), templateName);
        if(!stateExist) {
            return Promise.reject({ invalidSheet:  "The data in the sheet does not match the selected state(s)."});
        }

        let gsdpUploadedData = await Ulb.find({
            _id: { $in: _ids?.filter(_id => _id && isValidObjectId(_id)).map(_id => ObjectId(_id)) },
            [`gsdp.${yearName}.upload`]: true
        }).lean(); 

        const gsdpUpdateQuery = _ids?.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;
            // if (!req.body.ulbIds?.includes('' + _id)) return;

            if (typeof gdsps[index] !== 'string' || !Object.values(GSDP_OPTIONS).includes(gdsps[index]?.toLowerCase())) {
                validationErrors.push({
                    r: index,
                    c: columnGdspElected,
                    message: `Please selected "Eligible" or "Not Eligible"`
                });
            }

            if (gsdpUploadedData.find(item => item._id.toString() == _id)) {
                validationErrors.push({
                    r: index,
                    c: columnState,
                    message: `Data for ${stateName[index]} cannot be modified as it was already updated.`
                });
            }

            const isGsdpEligible = typeof gdsps[index] === 'string' ? (gdsps[index]?.toLowerCase() == GSDP_OPTIONS.ELIGIBLE) : null;
            const updateObj = {
                [`gsdp.${yearName}`]: {
                    "eligible" : isGsdpEligible,
                    "upload" : true,
                },
            }
            const result = {
                updateOne: {
                    filter: { _id: ObjectId(_id) },
                    update: {
                        $set: {...updateObj}
                    }
                }
            }
            return result;
        })?.filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        if(!gsdpUpdateQuery.length) {
            return Promise.reject({ invalidSheet:  "Please upload the correct excel sheet"});
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

        const _ids = worksheet?.getColumn(columnId).values;
        const stateGsdpConstantPrices = worksheet?.getColumn(columnConstantPrice).values;
        const stateGsdpCurrentPrices = worksheet?.getColumn(columnCurrentPrice).values;
        let stateNameExcel = worksheet?.getColumn(columnState).values;
        const filteredStateIds = _ids?.filter(_id => _id && isValidObjectId(_id)).map(_id => _id.toString());

        const stateExist = stateExistsInTemplate(req.body?.relatedIds, filteredStateIds);
        if(!stateExist) {
            return Promise.reject({ invalidSheet:  "The data in the sheet does not match the selected state(s)."});
        }

        let checkStateGsdpData = await StateGsdpData.find({ stateId: {
            $in: _ids?.filter(_id => _id && isValidObjectId(_id)).map(_id => ObjectId(_id))
        } }).lean();    

        const stateData = await State.find({
            _id: { $in: _ids?.filter((_id) => _id && isValidObjectId(_id)).map((_id) => ObjectId(_id)), },
        }).lean();

       const results = _ids?.map((_id, index) => {
            if (!_id || !isValidObjectId(_id)) return;

            if (isNaN(stateGsdpConstantPrices[index]) || [undefined, ""].includes(stateGsdpConstantPrices[index])) {
                validationErrors.push({
                    r: index,
                    c: columnConstantPrice,
                    message: `Value should be a number and can't be empty`
                });
            }

            if (isNaN(stateGsdpCurrentPrices[index]) || [undefined, ""].includes(stateGsdpCurrentPrices[index])) {
                validationErrors.push({
                    r: index,
                    c: columnCurrentPrice,
                    message: `Value should be a number and can't be empty`
                });
            }

            const selectedState = stateData.find(item => item._id.toString() == _id);
            let stateName = stateNameExcel[index];

            if(selectedState) {
                stateName = selectedState.name;
            }

            if(checkStateGsdpData.find(item => item.stateId.toString() == _id)) {
                validationErrors.push({
                    r: index,
                    c: columnState,
                    message: `Data for ${stateName} cannot be modified as it was already updated.`
                });
            }
            
            const result = {
                "stateId" : ObjectId(_id),
                "stateName" : stateName,
                "data" : [
                    {
                        "year" : "2018-23",
                        "constantPrice" : stateGsdpConstantPrices[index],
                        "currentPrice" : stateGsdpCurrentPrices[index],
                        "updatedOn": new Date()
                    }
                ],
            }
            return result;
        })?.filter(i => i);

        if (validationErrors.length) {
            return Promise.reject({ validationErrors });
        }

        if(!results || !results.length) {
            return Promise.reject({ invalidSheet:  "Please upload the correct excel sheet"});
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

const stateExistsInTemplate = (existingStateArr, excelStateIdsOrName, templateName = "stateGsdp") => {
    let notFound = true;
    let excelStateNameOrId = removeUndefinedAndEmpty(excelStateIdsOrName);
    if (existingStateArr.length != excelStateNameOrId.length) return notFound = false;
    existingStateArr.forEach((state) => {
        if (["gsdp", "dulyElected"].includes(templateName)) {
            if (!excelStateNameOrId.includes(state.name.toString())) notFound = false;
        } else {
            if (!excelStateNameOrId.includes(state._id.toString())) notFound = false;
        }
    });
    return notFound;
};

function removeUndefinedAndEmpty(stateArr) {
    return stateArr.filter(item => item !== undefined && item !== "" && item !== "State Name");
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