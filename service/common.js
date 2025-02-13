const { getStorageBaseUrl } = require('./getBlobUrl');

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
/**
 * The function `concatenateUrls` takes an object and an array of keys, and concatenates the values of
 * the specified keys with a predefined URL.
 * @param obj - The `obj` parameter is an object that contains key-value pairs. Each key represents a
 * property name, and each value represents the corresponding value for that property.
 * @param keys - The `keys` parameter is an object whose value we want to cancatenate.
 */
const KEYS = {
    url: 'url',
    link: 'link',
    imageUrl: 'imageUrl',
    downloadUrl: 'downloadUrl',
    pdfUrl: 'pdfUrl',
    excelUrl: 'excelUrl'
}
const concatenateUrls = (obj, params = KEYS, flag = false) => {
    try {
        if (flag) { params = Object.assign(params, KEYS); }
        for (var key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                obj[key] = concatenateUrls(obj[key], params);
            } else if (typeof obj[key] === 'string' && obj[params[key]]) {
                if (obj[params[key]] !== "Already Uploaded on Cityfinance") obj[key] = getStorageBaseUrl() + obj[key]
            }
        }
        return obj;
    } catch (error) {
        throw { message: `concatenateUrls: ${error.message}` }
    }
}

module.exports.concatenateUrls = concatenateUrls
