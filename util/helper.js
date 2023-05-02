function Helper() {
    this.isKeyValueMatched = function (obj, key, val) {
        let res = false
        let keys = Object.keys(obj);
        let index = keys.indexOf(key);
        if (index > -1 && obj[key] == val) {
            res = true;
        }
        return res;
    }
    this.objectIdToStringArr = function (arr) {
        let resArr = [];
        arr.forEach((objectId) => {
            resArr.push(objectId.toString());
        });
        return resArr;
    }
    this.validateKeys = function (keyArr, obj) {
        let result = true;
        const helperObj = new Helper();
        keyArr.some((k) => {
            if (!((k in obj) && helperObj.isValidString(obj[k]))) {
                result = false;
            }
        });
        return result;
    }
    this.isValidString = function (str, minCharCount = 1) {
        if (str == undefined || str.length == 0 || str.length < minCharCount) {
            return 0;
        } else {
            return 1;
        }
    }
    this.deleteKeysInObject = (data, deleteKyes) => {
        if (deleteKyes.length) {
            for (const key of deleteKyes) {
                if (data.hasOwnProperty(key)) {
                    delete data[key]
                }
            }
            return data;
        }
    }
    this.isEmptyObj = (obj) => {
        return Object.keys(obj).length == 0 && obj.constructor === Object
    }
    this.isReadOnly = ({ isDraft, status ,currentFormStatus }) => {
        return ![1, 2, 5, 7].includes(currentFormStatus)
    }
}
module.exports = new Helper();