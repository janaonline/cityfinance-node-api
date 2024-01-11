module.exports.camelize = (dashString = '')=>{
    return dashString.replace( /(?<!\p{L})\p{L}|\s+/gu,
              m => +m === 0 ? "" : m.toUpperCase() )
    .replace( /^./, 
             m => m?.toLowerCase() );
}


/**
 * The function `concatenateUrls` takes an object and an array of keys, and concatenates the values of
 * the specified keys with a predefined URL.
 * @param obj - The `obj` parameter is an object that contains key-value pairs. Each key represents a
 * property name, and each value represents the corresponding value for that property.
 * @param keys - The `keys` parameter is an object whose value we want to cancatenate.
 */
const KEYS  = {
    url: 'url',
    link: 'link',
    imageUrl: 'imageUrl',
    downloadUrl: 'downloadUrl',
    pdfUrl: 'pdfUrl',
    excelUrl: 'excelUrl'
}
const concatenateUrls = (obj, params = KEYS,flag = false) => {
    try {
        if(flag){ params = Object.assign(params, KEYS); }
        for (var key in obj) {
            if ( key !== 'history' && typeof obj[key] === 'object' && obj[key] !== null) {
               obj[key] = concatenateUrls(obj[key], params);
            } else if (typeof obj[key] === 'string' && obj[params[key]]) {
                obj[key] = process.env.AZURE_STORAGE_URL + obj[key]
            }
        }
        return obj;
    } catch (error) {
        throw {message: `concatenateUrls: ${error.message}` }
    }
}

module.exports.concatenateUrls = concatenateUrls