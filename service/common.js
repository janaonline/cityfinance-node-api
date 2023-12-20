const ObjectId = require('mongoose').Types.ObjectId;
module.exports.camelize = (dashString = '') => {
    return dashString.replace(/(?<!\p{L})\p{L}|\s+/gu,
        m => +m === 0 ? "" : m.toUpperCase())
        .replace(/^./,
            m => m?.toLowerCase());
}

module.exports.getPaginationParams = (query) => {
    const skip = query.skip !== undefined ? parseInt(query.skip): 0;
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
    const skip = query.skip !== undefined ? parseInt(query.skip): 0;
    return skip + 1;
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