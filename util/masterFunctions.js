const FormHistory = require("../models/FormHistory");
const CurrentStatus = require("../models/CurrentStatus");
const StatusHistory = require("../models/StatusHistory");
const FORMJSON  = require('../models/FormsJson');
const User = require('../models/User');
const Sidemenu = require('../models/Sidemenu');
const Service = require('../service')
const { MODEL_PATH, YEAR_CONSTANTS_IDS, MASTER_STATUS_ID } = require("../util/FormNames");
const ObjectId = require("mongoose").Types.ObjectId;
const {years} = require("../service/years")
const grantDistributeOptions = {
  "Yes":"As per Census 2011",
  "No":"As per SFC Recommendations"
}


const getLabels = (formName)=>{
  try{
    switch (formName){
      case "GtcInstallmentForm":
        const {grantInstallmentLabels} = require("./labels")
        return grantInstallmentLabels
        break
      default:
        false
        break
    }
  }
  catch(err){
    console.log("error in getLabels ::: ",err.message)
  }
}

module.exports.radioSchema = (key,formName,options=["Yes","No"])=>{
  options.push(null)
  let labels = getLabels(formName)
  let keyName = labels && labels[key] ? labels[key] : key
  return {
      type:String,
      enum:options,
      required:[false,`${keyName} is required`],
      default:null
  }
}
module.exports.pdfSchema = (required = false)=>{
  return {
      url: {type: String,required:required},
      name: {type: String,required:required},
  }
}
module.exports.limitValidationSchema = (keyName,min,max,mandatory=false)=>{
  return {
      type:Number,
      min:min,
      max:[max,`${keyName} must not be greater than ${max}`],
      required : mandatory,
      default:null,
  }
}


module.exports.ledgerCodes = {
  "410":"5dd10c2785c951b54ec1d779",
  "412":"5dd10c2785c951b54ec1d774"
}
module.exports.ledgerFields = {
  "fixedAsset":{
    "codes":["410"],
    "logic":"",
    "calculatedFrom":["faLandBuild","faOther"],
    "yearsApplicable":[years['2018-19'],years['2019-20']]
  },
  "CaptlExp":{
    "codes":["410","412"],
    "logic":"CurrentCodeYear - PreviousCodeYear",
    "calculatedFrom":["CaptlExpWaterSupply","CaptlExpSanitation","CaptExpOther"],
    "yearsApplicable":[years['2018-19'],years['2019-20']]
  }
}
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
    try {grantDistributeOptions
      const { body, session } = params;
      if (body.recordId) {
        let currentStatus = await CurrentStatus.findOneAndUpdate(
          { recordId: body.recordId, shortKey: body.shortKey , actionTakenByRole: body.actionTakenByRole},
          { $set: body },
          { upsert: true,
            new :true,
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

function checkForCalculationsForDurForm(reports){
  let validator = {
    valid : false,
    messages : [],
    errors : []
  }
  let validationMessages = {
    "projectExpMatch": "Sum of all project wise expenditure amount does not match total expenditure amount provided in the XVFC summary section. Kindly recheck the amounts.",
    "expWmSwm": " The total expenditure in the component wise grants must not exceed the amount of expenditure incurred during the year.",
    "negativeBal": "Closing balance is negative because Expenditure amount is greater than total tied grants amount available. Please recheck the amounts entered."
  }
  try{
   
    let exp = +(parseFloat(reports.grantPosition.expDuringYr)).toFixed(2)
    let projectSum = 0
    
    if(reports?.projects?.length > 0){
      projectSum = +(reports.projects.reduce((a,b)=> parseFloat(a) + parseFloat(b.expenditure),0).toFixed(2))
    }
    
    let closingBal = +reports.grantPosition.closingBal
    let expWm = 0
    for(let a of reports.categoryWiseData_wm){
      expWm += parseFloat(a.grantUtilised)
    }
    let expSwm =  reports.categoryWiseData_swm.reduce((a,b)=> parseFloat(a.grantUtilised) + parseFloat(b.grantUtilised))
    let sumWmSm = +(expWm + expSwm).toFixed(2)
    if(closingBal < 0){
      console.log("1")
      validator.errors.push(false)
      validator.messages.push(validationMessages['negativeBal'])
    }
    if(sumWmSm !== exp){
      console.log("2")
      validator.errors.push(false)
      validator.messages.push(validationMessages['expWmSwm'])
    }
    if(exp !== projectSum){
      
      validator.errors.push(false)
      validator.messages.push(validationMessages['projectExpMatch'])
    }

    if(validator.errors.every(item => item === true)){
      validator.valid = true
    }
    else{
      validator.valid = false
    }


  }
  catch(err){
    console.log("error in checkForCalculationsForDurForm ::: ",err.message)
  }
  return validator
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

function getCurrentYear(currentYear, design_year) {
  const lastYear = (currentYear % 100) + 1;
  design_year = ObjectId(years[`${currentYear}-${lastYear}`])

  return design_year;
}

function getAccessYear(design_year, accessYear) {
  let yearConstraint = YEAR_CONSTANTS_IDS[design_year];
  accessYear = "access_" + yearConstraint.split("-")[0].slice(-2) + yearConstraint.split("-")[1].slice(-2);
  return accessYear;
}

async function emailTriggerWithMohuaAction(state, statusId, rejectReason, formId) {
  try {
    let users = await User.find({ state: state, role: "STATE" })
      .populate("state", "name");
    let formName = await Sidemenu.findOne({ formId: formId, isActive: true });

    users?.forEach(async (user) => {
      let payload = {
        formName: formName?.name,
        email: user.email,
        isApproved: (MASTER_STATUS_ID[+statusId] === 'Submission Acknowledged By MoHUA'),
        stateName: user?.state?.name,
        reasonForRejection: rejectReason,
        status: MASTER_STATUS_ID[+statusId]
      };
      let emailTemplate = Service.emailTemplate.alertStateWithMohuaAction(payload);
      let mailOptions = {
        Destination: {
          /* required */
          ToAddresses: [user?.email]
        },
        Message: {
          /* required */
          Body: {
            /* required */
            Html: {
              Charset: "UTF-8",
              Data: emailTemplate.body,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: emailTemplate.subject,
          },
        },
        Source: process.env.EMAIL,
        /* required */
        ReplyToAddresses: [process.env.EMAIL],
      };
      await Service.sendEmail(mailOptions);
    });

  } catch (error) {
    throw error;
  }
}

function getFinancialYear() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate the financial year based on the current month
  const financialYear = (currentMonth <= 3) ? currentYear - 1 : currentYear;
  return financialYear;
}



module.exports.grantDistributeOptions = grantDistributeOptions
module.exports.getCurrentYear = getCurrentYear;
module.exports.emailTriggerWithMohuaAction = emailTriggerWithMohuaAction;
module.exports.getAccessYear = getAccessYear;
module.exports.getFinancialYear = getFinancialYear;
module.exports.checkForCalculationsForDurForm = checkForCalculationsForDurForm