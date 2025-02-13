const ObjectId = require("mongoose").Types.ObjectId;
module.exports.mapFilter = async (obj) => {
    return new Promise((resolve, reject) => {
        let filter = {};
        try {

            for (key in obj) {
                if (obj[key] != 'null' && (obj[key] || typeof obj[key] == "boolean")) {
                    if (obj[key].length == 24 && ObjectId.isValid(obj[key])) {
                        filter[key] = ObjectId(obj[key]);
                    } else if (typeof obj[key] == "boolean") {
                        filter[key] = obj[key];
                    }
                    else if (typeof obj[key] == "string" && obj[key] == "true") {
                        filter[key] = true;
                    }
                    else if (typeof obj[key] == "string" && obj[key] == "false" && key != "user") {
                        filter[key] = false;
                    }
                    else if (key == "user") {
                        if (obj[key] == "All Users") {
                            continue;
                        }
                        filter[key] = obj[key];
                    }
                    else if (key == "status") {
                        filter[key] = obj[key];
                    }
                    else if (typeof obj[key] == "string") {
                        filter[key] = { $regex: `^${obj[key]}`, $options: 'i' };
                    }
                    else {
                        filter[key] = obj[key];
                    }
                }
            }
            resolve(filter);
        } catch (e) {
            reject(e)
        }
    })
}
module.exports.mapFilterNew = async(obj) => {
    return new Promise((resolve, reject) => {
        let filter = {};
        try {

            for (key in obj) {
                if (obj[key] != 'null' && (obj[key] || typeof obj[key] == "boolean")) {
                    if (obj[key].length == 24 && ObjectId.isValid(obj[key])) {
                        filter[key] = ObjectId(obj[key]);
                    } else if (typeof obj[key] == "boolean") {
                        filter[key] = obj[key];
                    }
                    else if (typeof obj[key] == "string" && obj[key] == "true") {
                        filter[key] = true;
                    }
                    else if (typeof obj[key] == "string" && obj[key] == "false" && key != "user") {
                        filter[key] = false;
                    }
                    
                    else if (key == "status") {
                        filter[key] = obj[key];
                    }
                    else if (typeof obj[key] == "string") {
                        filter[key] = { $regex: `^${obj[key]}`, $options: 'i' };
                    }
                    else {
                        filter[key] = obj[key];
                    }
                }
            }
            resolve(filter);
        } catch (e) {
            reject(e)
        }
    })
}