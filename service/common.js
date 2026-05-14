const { createFileDownloadToken } = require('../util/file-token');
const { FILE_DOWNLOAD } = require('../config/app_config');

const ObjectId = require('mongoose').Types.ObjectId;
module.exports.camelize = (dashString = '') => {
    return dashString.replace(/(?<!\p{L})\p{L}|\s+/gu,
        m => +m === 0 ? "" : m.toUpperCase())
        .replace(/^./,
            m => m?.toLowerCase());
}

module.exports.getPaginationParams = (query) => {
    const skip = query.skip !== undefined ? parseInt(query.skip) : 0;
    const limit = query.limit ? parseInt(query.limit) : 10;
    return { limit, skip };
}

module.exports.tableResponse = array => {
    function flattenObject(obj, prefix = '') {
        return Object.keys(obj).reduce((acc, key) => {
            const propName = prefix ? `${prefix}_${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                Object.assign(acc, flattenObject(obj[key], propName));
            } else {
                acc[propName] = obj[key];
            }
            return acc;
        }, {});
    }
    const json = JSON.parse(JSON.stringify(array));
    return json.map(item => flattenObject(item));
}

module.exports.getMultipleRandomElements = (arr, num) => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

module.exports.getPageNo = (query) => {
    const skip = query.skip !== undefined ? parseInt(query.skip) : 0;
    return skip + 1;
}
module.exports.cubeRootOfNegative = (num) => {
    if (num >= 0) {
        return Math.pow(num, 1 / 3);
    } else {
        const realPart = Math.pow(Math.abs(num), 1 / 3);
        const imaginaryPart = Math.sqrt(3) * Math.sqrt(Math.pow(Math.abs(num), 2 / 3)) / 2;
        return {
            real: -1 * realPart / 2,
            imaginary: imaginaryPart
        };
    }
}

module.exports.isValidObjectId = (id) => {
    if (ObjectId.isValid(id)) {
        if (String(new ObjectId(id)) === id) {
            return true;
        }
        return false;
    }
    return false;
}

module.exports.getPopulationBucket = (populationBucket) => {
    let cat = '';
    switch (populationBucket) {
        case 1:
            cat = '4M+';
            break;
        case 2:
            cat = '1M - 4M';
            break;
        case 3:
            cat = '100K - 1M';
            break;
        case 4:
            cat = '<100K';
            break;
    }
    return cat;
}
const KEYS = {
    url: 'url',
    link: 'link',
    imageUrl: 'imageUrl',
    downloadUrl: 'downloadUrl',
    pdfUrl: 'pdfUrl',
    excelUrl: 'excelUrl'
}

const _appBaseUrl = FILE_DOWNLOAD.APP_BASE_URL;
const _ttlMs = FILE_DOWNLOAD.LINK_TTL_MS;

/**
 * Recursively replaces relative S3 paths in known URL fields with
 * encrypted, time-limited app download tokens.
 * Expiry is computed once on the top-level call and shared across all
 * recursive calls so every token in one export has the same TTL window.
 *
 * @param {object}  obj
 * @param {object}  params   - key whitelist (defaults to KEYS)
 * @param {boolean} flag     - when true, merges params with KEYS (existing behaviour)
 * @param {number}  [_exp]   - shared expiry ms (set internally on recursion)
 */
const concatenateUrls = (obj, params = KEYS, flag = false, _exp) => {
    try {
        const exp = _exp || Date.now() + _ttlMs;
        if (flag) { params = Object.assign(params, KEYS); }
        for (var key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                obj[key] = concatenateUrls(obj[key], params, false, exp);
            } else if (typeof obj[key] === 'string' && obj[params[key]]) {
                if (obj[params[key]] !== "Already Uploaded on Cityfinance") {
                    const token = createFileDownloadToken({ path: obj[key], exp, disposition: 'attachment' });
                    obj[key] = `${_appBaseUrl}/file/download?signature=${token}`;
                }
            }
        }
        return obj;
    } catch (error) {
        throw { message: `concatenateUrls: ${error.message}` }
    }
}

module.exports.concatenateUrls = concatenateUrls;
