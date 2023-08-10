const ExcelJS = require("exceljs");
const ObjectId = require("mongoose").Types.ObjectId;

const MainCategory = require('../../models/Master/MainCategory');
const Ulb = require('../../models/Ulb');
const State = require('../../models/State');
const CategoryFileUpload = require('../../models/CategoryFileUpload');
const { stateFormSubmission } = require('../../service/email-template');
const { loadExcelByUrl } = require('../../util/worksheet');

const handleDatabaseUpload = async (req, res, next) => {
    return next();

    console.log(req.body.file);
    const remoteUrl = req.body.file.url;

    loadExcelByUrl(remoteUrl).then(workbook => {
        const worksheet = workbook.getWorksheet(1);
        worksheet.eachRow((row, rowNumber) => {
            // Process each row of the worksheet
            console.log(`Row ${rowNumber}: ${row.values}`);
        });

    })
}

const dulyElectedTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    try {

        const startingRow = 3;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');

        worksheet.columns = [
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

        const ulbData = await Ulb.aggregate([
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
            { $limit: 10 },
            {
                $project: {
                    sno: 'sno',
                    stateName: '$state.name',
                    stateCode: '$state.code',
                    name: 1,
                    code: 1,
                    censusCode: 1,
                    area: 1,
                    population: 1,
                    isDulyElected: 1,
                    electedDate: 1
                }
            }
        ]);



        worksheet.addRows(ulbData, { startingRow, properties: { outlineLevel: 1 } });

        // console.log('worksheet', worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);


    } catch (err) {
        console.log(err)
    }
}

const gsdpTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    try {

        const startingRow = 1;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('My Sheet');

        worksheet.columns = [
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
                $unwind: '$state'
            },
            {
                $project: {
                    sno: 'sno',
                    stateName: '$state.name',
                    stateCode: '$state.code',
                    name: 1,
                    code: 1,
                    ulbType: { $arrayElemAt: ['$ulbType.name', 0]},
                    censusCode: 1,
                    area: 1,
                    population: 1,
                    isMillionPlus: 1,
                    isUA: 1,
                    uaName: { $arrayElemAt: ['$ua.name', 0]},
                    isDulyElected: 1,
                    electedDate: 1
                }
            }
        ]);



        worksheet.addRows(ulbData, { startingRow, properties: { outlineLevel: 1 } });

        // console.log('worksheet', worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Disposition', `attachment; filename=${templateName}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);


    } catch (err) {
        console.log(err)
    }
}

const getTemplate = async (req, res, next) => {
    const templateName = req.params.templateName;
    if (templateName == 'dulyElected') return dulyElectedTemplate(req, res, next);
    if (templateName == 'gsdp') return gsdpTemplate(req, res, next);
}

const getCategoryWiseResource = async (req, res, next) => {
    try {
        const query = [
            {
                $match: {
                    module: 'state_resource',
                },
            },
            {
                $unwind: {
                    path: "$relatedIds",
                }
            },
            {
                $group: {
                    _id: '$categoryId',
                    documents: { $push: "$$ROOT.file" }
                }
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
            message: "Successfully saved data!",
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
        console.log('deletable ids', req.body);

        const data = await CategoryFileUpload.findOneAndUpdate({
            _id: { $in: fileIds }
        }, {
            $pull: {
                relatedIds: stateId
            }
        });
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
    const { categoryId, stateId } = req.query;

    try {
        const query = [
            {
                $match: {
                    module: 'state_resource',
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
            ...(categoryId || stateId ? [
                {
                    $match: {
                        ...(categoryId && { categoryId: ObjectId(categoryId) }),
                        ...(stateId && { relatedIds: ObjectId(stateId) })
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
                                _id: '$$doc._id',
                            }
                        }
                    }
                }
            },
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
        const states = await State.find().select('name _id');
        const categories = await MainCategory.aggregate([
            {
                $match: { typeOfCategory: "state_resource", isActive: true }
            },
            {
                $lookup: {
                    from: "subcategories",
                    localField: "_id",
                    foreignField: "categoryId",
                    as: "subCategories",
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
            message: "Successfully saved data!",
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






module.exports = {
    handleDatabaseUpload,
    getResourceList,
    getTemplate,
    getCategoryWiseResource,
    removeStateFromFiles
}