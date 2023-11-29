module.exports.camelize = (dashString = '') => {
    return dashString.replace(/(?<!\p{L})\p{L}|\s+/gu,
        m => +m === 0 ? "" : m.toUpperCase())
        .replace(/^./,
            m => m?.toLowerCase());
}

module.exports.getPaginationParams = (query) => {
    const limit = query.limit ? parseInt(query.limit) : 10;
    const page = query.page ? parseInt(query.page) : 1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
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
