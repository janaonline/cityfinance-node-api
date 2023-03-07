const FormHistory = require("../models/FormHistory");
const CurrentStatus = require("../models/CurrentStatus");
const StatusHistory = require("../models/StatusHistory");
const { MODEL_PATH } = require("../util/FormNames");

module.exports.saveFormHistory = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { body, session } = params;
      let masterFormHistory = await FormHistory.create(body);
      resolve(1);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports.saveCurrentStatus = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { body, session } = params;
      if (body.recordId) {
        let currentStatus = await CurrentStatus.findOneAndUpdate(
          { recordId: body.recordId, shortKey: body.shortKey },
          { $set: body },
          { upsert: true,
            //  session
             }
        );
      }
      resolve(1);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports.saveStatusHistory = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { body , session} = params;
      let currentStatus = await StatusHistory.create(body, 
        // { session }
        );
      resolve(1);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports.modelPath = (formId) => {
  return MODEL_PATH[formId];
};

module.exports.getKeyByValue = (object, value)=>{
  return Object.keys(object).find(key => object[key] === value);
}