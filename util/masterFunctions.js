const FormHistory = require("../models/FormHistory");
const CurrentStatus = require("../models/CurrentStatus");
const StatusHistory = require("../models/StatusHistory");
const FORMJSON  = require('../models/FormsJson');
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

module.exports.getShortKeys = async (params) => {
  try {
    let {formId} = params;
    const FIRST_INDEX = 0;
    const getForm = await FORMJSON.findOne({formId}).lean();
    let shortKeyArray = [];
    if(getForm && getForm['data']){
      const questionArray =  getForm['data'][FIRST_INDEX]['question']
      for(let question of questionArray){
        question.hasOwnProperty('shortKey') ? shortKeyArray.push(question['shortKey']) : ""
      }
    }
    return shortKeyArray;
  } catch (error) {
    return error.message;
  }
}