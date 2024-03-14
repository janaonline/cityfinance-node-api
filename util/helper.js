const userTypes = require("./userTypes")
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

    /* The `getOriginalQueryParams` function takes a `req` object as a parameter, which is
    typically the request object in a Node.js application. It extracts the query parameters
    from the URL and returns them as an object. */
    this.getOriginalQueryParams = (req) => {
        return req._parsedOriginalUrl.query.split('&').reduce((result, str) => {
            const [key, value] = str.split('=');
            return { ...result, [key]: value };
        }, {})
    }


    this.isEmptyObj = (obj) => {
        return Object.keys(obj).length == 0 && obj.constructor === Object
    }
    this.isReadOnly = ({ isDraft, status, currentFormStatus, role }) => {
        if ([1, 2, 5, 7].includes(currentFormStatus) && role === userTypes.ulb) {
            return false
        }
        else {
            return true
        }
    }
    this.roundValue = (key) => {
        if (typeof key == 'number') {
            return Number(key).toFixed(2)
        }
        return key || ""
    }
    this.convertValue = (objData) => {
        const { data, keyArr } = objData;
        let arr = [];
        if (data.length > 0) {
            for (let el of data) {
                if (keyArr.length) {
                    for (let pf of keyArr) {
                        if (el.hasOwnProperty(pf)) {
                            el[pf] =
                                el[pf] !== null && el[pf] !== "" ? Number(el[pf]).toFixed(2) : "";
                        }
                    }
                    arr.push(el);
                }
            }
        }
        return arr;
    };
    this.removeEscapeChars = (entity) => {
        return !entity ? entity : entity.replace(/(\n|,)/gm, " ");
    }
    this.formatDate = (date) => {
      try {
        if (date) {
          date = new Date(date);
          // let dateF = new Date()
          return [
            padTo2Digits(date.getDate()),
            padTo2Digits(date.getMonth() + 1),
            date.getFullYear(),
          ].join("/");
          // return [dateF.getDate(), (dateF.getMonth() + 1), dateF.getFullYear()].join('/');
        } else {
          return "";
        }
      } catch (error) {
        throw Error({ message: `formatDate:: ${err.message}` });
      }
    };
    this.isValidDate = (d) => {
        return d instanceof Date && !isNaN(d);
    }
}
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
module.exports = new Helper();