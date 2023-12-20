module.exports.camelize = (dashString = '')=>{
    return dashString.replace( /(?<!\p{L})\p{L}|\s+/gu,
              m => +m === 0 ? "" : m.toUpperCase() )
    .replace( /^./, 
             m => m?.toLowerCase() );
}


