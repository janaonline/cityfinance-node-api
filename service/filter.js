const ObjectId = require("mongoose").Types.ObjectId;
module.exports = async (obj)=>{
    return new Promise((resolve, reject)=>{
        let filter = {};
        try {
            for(key in obj){
                if(obj[key]){
                    if(obj[key].length == 24 && ObjectId.isValid(obj[key])){
                        filter[key] = ObjectId(obj[key]);
                    }else if(typeof obj[key] == "boolean"){
                        filter[key] = obj[key];
                    }else if(typeof obj[key] == "string"){
                        filter[key] = {$regex:obj[key]};
                    }else{
                        filter[key] = obj[key];
                    }
                }
            }
            resolve(filter);
        }catch (e) {
            reject(e)
        }
    })
}