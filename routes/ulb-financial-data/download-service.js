const mongoose = require('mongoose');
const mime = require('mime');
const sanitizeFilename = require('sanitize-filename');
const UlbFinancialData = require('../../models/UlbFinancialData');
const AnnualAccountData = require('../../models/AnnualAccounts');
const Response = require('../../service').response;
const { years } = require('../../service/years');
const {
    BUCKETNAME,
    getObjectHead,
    getObjectStream,
    normalizeS3ObjectKey,
} = require('../../service/s3-services');

const ObjectId = mongoose.Types.ObjectId;

const DOWNLOAD_FILE_TYPES = {
    pdf: {
        legacyField: 'pdfUrl',
        annualField: 'pdf',
        extension: 'pdf',
        contentType: 'application/pdf',
    },
    excel: {
        legacyField: 'excelUrl',
        annualField: 'excel',
        extension: 'xlsx',
        contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
};

const DOWNLOAD_DOCUMENT_TYPES = {
    BALANCE_SHEET: {
        legacyField: 'balanceSheet',
        annualField: 'bal_sheet',
    },
    SCHEDULES_TO_BALANCE_SHEET: {
        legacyField: 'schedulesToBalanceSheet',
        annualField: 'bal_sheet_schedules',
    },
    INCOME_AND_EXPENDITURE: {
        legacyField: 'incomeAndExpenditure',
        annualField: 'inc_exp',
    },
    SCHEDULES_TO_INCOME_AND_EXPENDITURE: {
        legacyField: 'schedulesToIncomeAndExpenditure',
        annualField: 'inc_exp_schedules',
    },
    TRIAL_BALANCE: {
        legacyField: 'trialBalance',
    },
    AUDIT_REPORT: {
        legacyField: 'auditReport',
        annualField: 'auditor_report',
    },
    OVERALL_REPORT: {
        legacyField: 'overallReport',
    },
    CASH_FLOW_STATEMENT: {
        annualField: 'cash_flow',
    },
};

module.exports.downloadFinancialFile = async (req, res) => {
    // mongoose.set('debug', true);
    try {
        const query = validateDownloadQuery(req.query);
        const fileContext = await resolveFinancialFileForDownload(query);

        if (!fileContext.recordFound) {
            return Response.BadRequest(
                res,
                {},
                'No matching financial document record found.',
                404
            );
        }
        // console.log('Resolved file context:---', fileContext);
        if (!fileContext.fileUrl) {
            return Response.BadRequest(
                res,
                {},
                'Requested file not found for the matching financial document.',
                404
            );
        }

        const objectKey = normalizeS3ObjectKey(fileContext.fileUrl);
        if (!objectKey) {
            return Response.BadRequest(
                res,
                {},
                'Requested file path is invalid.',
                404
            );
        }

        await streamS3Download(res, {
            objectKey,
            downloadFileName: buildDownloadFileName({
                storedFileName: fileContext.storedFileName,
                documentType: query.document_type,
                financialYear: query.financial_year,
                auditType: fileContext.auditType || query.audit_type,
                fileType: query.file_type,
            }),
            fileType: query.file_type,
        });
    } catch (error) {
        console.log('downloadFinancialFile error:', error);

        if (error.statusCode) {
            return Response.BadRequest(
                res,
                error.errors || {},
                error.message,
                error.statusCode
            );
        }

        return Response.InternalError(
            res,
            error,
            'Failed to download the requested financial file.',
            500
        );
    }
};

function validateDownloadQuery(query) {
    const requiredParams = [
        'ulb',
        'financial_year',
        'audit_type',
        'document_type',
        'file_type',
    ];
    const missingParams = requiredParams.filter((key) => !query[key]);

    if (missingParams.length) {
        throw createHttpError(
            400,
            `Missing required query params: ${missingParams.join(', ')}.`
        );
    }

    if (!mongoose.isValidObjectId(query.ulb)) {
        throw createHttpError(400, 'Invalid ulb id.');
    }

    const fileType = String(query.file_type).trim().toLowerCase();
    if (!DOWNLOAD_FILE_TYPES[fileType]) {
        throw createHttpError(
            400,
            `Invalid file_type. Supported values are: ${Object.keys(DOWNLOAD_FILE_TYPES).join(', ')}.`
        );
    }

    const documentType = String(query.document_type).trim().toUpperCase();
    if (!DOWNLOAD_DOCUMENT_TYPES[documentType]) {
        throw createHttpError(
            400,
            `Invalid document_type. Supported values are: ${Object.keys(DOWNLOAD_DOCUMENT_TYPES).join(', ')}.`
        );
    }

    const auditType = normalizeAuditType(query.audit_type);
    if (!auditType) {
        throw createHttpError(
            400,
            'Invalid audit_type. Supported values are: audited, unaudited.'
        );
    }

    if (!/^\d{4}-\d{2}$/.test(String(query.financial_year).trim())) {
        throw createHttpError(400, 'Invalid financial_year.');
    }

    if (
        !years[query.financial_year] &&
        Number(query.financial_year.split('-')[0]) >= 2019
    ) {
        throw createHttpError(400, 'Invalid financial_year.');
    }

    return {
        ulb: String(query.ulb),
        financial_year: String(query.financial_year).trim(),
        audit_type: auditType,
        document_type: documentType,
        file_type: fileType,
    };
}

function normalizeAuditType(auditType) {
    const normalizedValue = String(auditType || '').trim().toLowerCase();

    if (normalizedValue === 'audited') return 'audited';
    if (['unaudited', 'un-audited', 'un_audited'].includes(normalizedValue)) {
        return 'unaudited';
    }

    return null;
}

async function resolveFinancialFileForDownload(query) {
    const startYear = Number(query.financial_year.split('-')[0]);

    if (Number.isNaN(startYear)) {
        throw createHttpError(400, 'Invalid financial_year.');
    }

    if (startYear < 2019) {
        return resolveLegacyFinancialFile(query);
    }

    return resolveAnnualAccountFinancialFile(query);
}

async function resolveLegacyFinancialFile(query) {
    const documentConfig = DOWNLOAD_DOCUMENT_TYPES[query.document_type];
    if (!documentConfig.legacyField) {
        const recordExists = await UlbFinancialData.exists({
            ulb: ObjectId(query.ulb),
            financialYear: query.financial_year,
            audited: query.audit_type === 'audited',
        });

        if (!recordExists && query.audit_type === 'audited') {
            const fallbackRecordExists = await UlbFinancialData.exists({
                ulb: ObjectId(query.ulb),
                financialYear: query.financial_year,
                audited: false,
            });

            return {
                recordFound: !!fallbackRecordExists,
                fileUrl: null,
                storedFileName: null,
                auditType: fallbackRecordExists ? 'unaudited' : query.audit_type,
            };
        }

        return {
            recordFound: !!recordExists,
            fileUrl: null,
            storedFileName: null,
            auditType: query.audit_type,
        };
    }

    const select = {
        [`${documentConfig.legacyField}.${DOWNLOAD_FILE_TYPES[query.file_type].legacyField}`]: 1,
    };
    const record = await UlbFinancialData.findOne(
        {
            ulb: ObjectId(query.ulb),
            financialYear: query.financial_year,
            audited: query.audit_type === 'audited',
        },
        select
    )
        .lean()
        .exec();

    if (!record) {
        if (query.audit_type === 'audited') {
            return resolveLegacyFinancialFile({
                ...query,
                audit_type: 'unaudited',
            });
        }

        return { recordFound: false, fileUrl: null, storedFileName: null, auditType: query.audit_type };
    }

    const fileUrl =
        record?.[documentConfig.legacyField]?.[
        DOWNLOAD_FILE_TYPES[query.file_type].legacyField
        ] || null;

    if (!fileUrl && query.audit_type === 'audited') {
        return resolveLegacyFinancialFile({
            ...query,
            audit_type: 'unaudited',
        });
    }

    return {
        recordFound: true,
        fileUrl,
        storedFileName: null,
        auditType: query.audit_type,
    };
}

async function resolveAnnualAccountFinancialFile(query) {
    const documentConfig = DOWNLOAD_DOCUMENT_TYPES[query.document_type];
    const auditField = query.audit_type === 'audited' ? 'audited' : 'unAudited';
    const yearId = years[query.financial_year];

    if (!documentConfig.annualField) {
        const recordExists = await AnnualAccountData.exists({
            ulb: ObjectId(query.ulb),
            [`${auditField}.year`]: ObjectId(yearId),
        });

        if (!recordExists && query.audit_type === 'audited') {
            return resolveAnnualAccountFinancialFile({
                ...query,
                audit_type: 'unaudited',
            });
        }

        return {
            recordFound: !!recordExists,
            fileUrl: null,
            storedFileName: null,
            auditType: query.audit_type,
        };
    }

    const select = {
        [`${auditField}.provisional_data.${documentConfig.annualField}`]: 1,
    };

    const record = await AnnualAccountData.findOne(
        {
            ulb: ObjectId(query.ulb),
            [`${auditField}.year`]: ObjectId(yearId),
        },
        select
    )
        .lean()
        .exec();

    if (!record) {
        if (query.audit_type === 'audited') {
            return resolveAnnualAccountFinancialFile({
                ...query,
                audit_type: 'unaudited',
            });
        }

        return { recordFound: false, fileUrl: null, storedFileName: null, auditType: query.audit_type };
    }

    const documentData =
        record?.[auditField]?.provisional_data?.[documentConfig.annualField] || null;
    const fileData = documentData?.[DOWNLOAD_FILE_TYPES[query.file_type].annualField] || null;

    if (!fileData?.url && query.audit_type === 'audited') {
        return resolveAnnualAccountFinancialFile({
            ...query,
            audit_type: 'unaudited',
        });
    }

    return {
        recordFound: true,
        fileUrl: fileData?.url || null,
        storedFileName: fileData?.name || null,
        auditType: query.audit_type,
    };
}

function buildDownloadFileName({
    storedFileName,
    documentType,
    financialYear,
    auditType,
    fileType,
}) {
    const fallbackExtension = DOWNLOAD_FILE_TYPES[fileType].extension;
    const sanitizedStoredName = sanitizeFilename(storedFileName || '').trim();

    if (sanitizedStoredName) {
        return sanitizedStoredName;
    }

    const generatedName = sanitizeFilename(
        `${documentType}_${financialYear}_${auditType}`
    ).trim();

    return `${generatedName || 'financial_document'}.${fallbackExtension}`;
}

async function streamS3Download(res, { objectKey, downloadFileName, fileType }) {
    try {
        const head = await getObjectHead({ Bucket: BUCKETNAME, Key: objectKey });
        const contentType =
            head.ContentType ||
            mime.getType(downloadFileName) ||
            DOWNLOAD_FILE_TYPES[fileType].contentType;

        res.status(200);
        res.setHeader('Content-Type', contentType);
        res.setHeader(
            'Content-Disposition',
            buildContentDisposition(downloadFileName)
        );

        if (head.ContentLength != null) {
            res.setHeader('Content-Length', head.ContentLength);
        }

        const fileStream = getObjectStream({ Bucket: BUCKETNAME, Key: objectKey });

        fileStream.on('error', (error) => {
            console.log('S3 stream error:', error);
            if (!res.headersSent) {
                if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
                    return Response.BadRequest(
                        res,
                        {},
                        'Requested file not found in storage.',
                        404
                    );
                }

                return Response.InternalError(
                    res,
                    error,
                    'Failed to download the requested financial file.',
                    500
                );
            }

            res.destroy(error);
        });

        fileStream.pipe(res);
    } catch (error) {
        if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
            throw createHttpError(404, 'Requested file not found in storage.');
        }

        if (error.code === 'Forbidden' || error.code === 'AccessDenied') {
            throw createHttpError(
                500,
                'Access denied while fetching the requested file.'
            );
        }

        throw error;
    }
}

function buildContentDisposition(fileName) {
    const safeFileName =
        sanitizeFilename(fileName || 'financial_document').trim() ||
        'financial_document';
    const encodedFileName = encodeURIComponent(safeFileName);

    return `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
}

function createHttpError(statusCode, message, errors = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errors = errors;
    return error;
}
