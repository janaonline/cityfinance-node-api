const FormHistory = require("../models/FormHistory");
const CurrentStatus = require("../models/CurrentStatus");
const StatusHistory = require("../models/StatusHistory");


module.exports.saveFormHistory = (params) => {
    return new Promise(async (resolve, reject) => {
      try {
        const { body } = params;
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
        const { body } = params;
        if(body.recordId){
  
          let currentStatus = await CurrentStatus.findOneAndUpdate({recordId: body.recordId},body,{upsert: true});
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
        const { body } = params;
        let currentStatus = await StatusHistory.create(body);
        resolve(1);
      } catch (error) {
        reject(error);
      }
    });
  };
  
  