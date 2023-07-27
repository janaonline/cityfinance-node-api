const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const ObjectId = require("mongoose").Types.ObjectId;
const Year = require('../../models/Year');
const { ULBMASTER } = require('../../_helper/constants');
const StatusList = require('../../util/newStatusList')
const Ulb = require('../../models/Ulb.js')
const State = require('../../models/State')
//Importing all ULB forms
const AnnualAccounts = require('../../models/AnnualAccounts')
const DUR = require('../../models/UtilizationReport')
const ODF = require('../../models/OdfFormCollection')
const GFC = require('../../models/GfcFormCollection')
const SLB = require('../../models/XVFcGrantForm')
const PFMS = require('../../models/LinkPFMS')
const PropTax = require('../../models/PropertyTaxOp')
const { calculateStatus, calculateStatusMaster } = require('../CommonActionAPI/service')
const SLB28 = require('../../models/TwentyEightSlbsForm')
const PropertyTaxOp = require('../../models/PropertyTaxOp')
const { YEAR_CONSTANTS, MASTER_STATUS_ID, MASTER_FORM_STATUS, MASTER_STATUS } = require('../../util/FormNames');
var outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
//STate Forms
const SFC = require('../../models/StateFinanceCommissionFormation')
const PTFR = require('../../models/PropertyTaxFloorRate')
const GTC_STATE = require('../../models/GrantTransferCertificate')
const GrantDistribution = require('../../models/GrantDistribution')
const ActionPlan = require('../../models/ActionPlans')
const WaterRejuvenation = require('../../models/WaterRejenuvation&Recycling')
const USER_TYPES = require('../../util/userTypes');
const { years } = require('../../service/years');
const { getKeyByValue } = require('../../util/masterFunctions');
const { stat } = require('fs');
const ticks = {
  "green": "../../../assets/form-icon/checked.svg",
  "red": "../../../assets/form-icon/cancel.svg"
}

let FormModelMapping = {
  "AnnualAccountData": ObjectId("62aa1b04729673217e5ca3aa"),
  "UtilizationReport": ObjectId("62aa1c96c9a98b2254632a8a"),
  "PFMSAccount": ObjectId("62aa1cc9c9a98b2254632a8e"),
  "TwentyEightSlbForm": ObjectId("62f0dbbf596298da6d3f4076"),
  "PropertyTaxOp": ObjectId("62aa1ceac9a98b2254632a92")

}
let FormModelMapping_Master = {
  "AnnualAccountData": ObjectId("63ff31d63ae39326f4b2f460"),
  "UtilizationReport": ObjectId("63ff31d63ae39326f4b2f462"),
  "TwentyEightSlbForm": ObjectId("63ff31d63ae39326f4b2f46e"),
  "PropertyTaxOp": ObjectId("63ff31d63ae39326f4b2f464")
}

let FormModelMapping_Master_23_24 = {
  "PropertyTaxOp": ObjectId("642aaf2c3e05d72a8df4b646"),
  "TwentyEightSlbForm": ObjectId("63ff31d63ae39326f4b2f46e"),
  "UtilizationReport": ObjectId("63ff31d63ae39326f4b2f462"),
  "AnnualAccountData": ObjectId("63ff31d63ae39326f4b2f460"),
  "PFMSAccount" : ObjectId("642aaf2c3e05d72a8df4b645")
}

let FormModelMapping_State = {
  "GrantTransferCertificate": ObjectId("62c552c52954384b44b3c386"),
  "PropertyTaxFloorRate": ObjectId("62c5534e2954384b44b3c38a"),
  "StateFinanceCommissionFormation": ObjectId("62c553822954384b44b3c38e"),
  "ActionPlans": ObjectId("62c554772954384b44b3c39a"),
  "GrantDistribution": ObjectId("62c554932954384b44b3c39e"),
  "GrantClaim": ObjectId("62c554cb2954384b44b3c3a2"),
  "WaterRejenuvationRecycling": ObjectId("62c554382954384b44b3c396")

}
let FormModelMappingMaster_State = {
  "GrantTransferCertificate": ObjectId("63ff31d63ae39326f4b2f473"),
  "PropertyTaxFloorRate": ObjectId("63ff31d63ae39326f4b2f474"),
  "StateFinanceCommissionFormation": ObjectId("63ff31d73ae39326f4b2f475"),
  "ActionPlans": ObjectId("63ff31d73ae39326f4b2f478"),
  "GrantDistribution": ObjectId("63ff31d73ae39326f4b2f479"),
  "GrantClaim": ObjectId("63ff31d73ae39326f4b2f47a"),
  "WaterRejenuvationRecycling": ObjectId("63ff31d73ae39326f4b2f477")
}

let SUB_CATEGORY_CONSTANTS = {
  "Dashboard": 1,
  "Grant Transfer Certificate": 2,
  "Property tax floor rate Notification": 2,
  "State Finance Commission Notification": 2,
  "Grant Allocation to ULBs": 3,
  "Submit Claims for 15th FC Grants": 3
}



const calculateTick = (tooltip, loggedInUserRole, viewFor) => {
  //get 3 parameter formType and compare formType with loggedInUserRole
  if (viewFor === USER_TYPES.ulb) {
    if (loggedInUserRole == USER_TYPES.ulb) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Rejected_By_State ||
        tooltip == StatusList.Rejected_By_MoHUA
      ) {
        return ticks["red"];
      } else {
        return ticks["green"];
      }
    } else if (loggedInUserRole == USER_TYPES.state) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Under_Review_By_State ||
        tooltip == StatusList.Rejected_By_MoHUA
      ) {
        return ticks["red"];
      } else if (
        [
          StatusList.Rejected_By_State ,
          StatusList.Under_Review_By_MoHUA,
          StatusList.Approved_By_MoHUA ,
          MASTER_STATUS_ID[
            MASTER_FORM_STATUS["SUBMISSION_ACKNOWLEDGED_BY_MoHUA"]
          ],
        ].includes(tooltip)
      ) {
        return ticks["green"];
      }
    } else if (
      loggedInUserRole == USER_TYPES.mohua ||
      loggedInUserRole == USER_TYPES.admin
    ) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Under_Review_By_State ||
        tooltip == StatusList.Rejected_By_State ||
        tooltip == StatusList.Under_Review_By_MoHUA
      ) {
        return ticks["red"];
      } else if (
        [
          StatusList.Rejected_By_MoHUA,
          StatusList.Approved_By_MoHUA,
          MASTER_STATUS_ID[
            MASTER_FORM_STATUS["SUBMISSION_ACKNOWLEDGED_BY_MoHUA"]
          ],
        ].includes(tooltip)
      ) {
        return ticks["green"];
      }
    }
  } else if (viewFor === USER_TYPES.state) {
    if (loggedInUserRole == USER_TYPES.state) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Under_Review_By_State ||
        tooltip == StatusList.Rejected_By_MoHUA
      ) {
        return ticks["red"];
      } else if (
        [
            StatusList.Under_Review_By_MoHUA,
            StatusList.Approved_By_MoHUA,
            MASTER_STATUS_ID[
              MASTER_FORM_STATUS["SUBMISSION_ACKNOWLEDGED_BY_MoHUA"]
            ]
          ].includes(tooltip)
      ) {
        return ticks["green"];
      }
    } else if (
      loggedInUserRole == USER_TYPES.mohua ||
      loggedInUserRole == USER_TYPES.admin
    ) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Under_Review_By_MoHUA
      ) {
        return ticks["red"];
      } else if (
        [
          StatusList.Rejected_By_MoHUA,
          StatusList.Approved_By_MoHUA,
          MASTER_STATUS_ID[
            MASTER_FORM_STATUS["SUBMISSION_ACKNOWLEDGED_BY_MoHUA"]
          ],
        ].includes(tooltip)
      ) {
        
        return ticks["green"];
      }
    }
  } else if (viewFor === USER_TYPES.mohua) {
    if (
      loggedInUserRole == USER_TYPES.mohua ||
      loggedInUserRole == USER_TYPES.admin
    ) {
      if (
        tooltip == StatusList.Not_Started ||
        tooltip == StatusList.In_Progress ||
        tooltip == StatusList.Under_Review_By_MoHUA
      ) {
        return ticks["red"];
      } else if (tooltip == StatusList.Under_Review_By_MoHUA) {
        return ticks["green"];
      }
    }
  }
};



const findStatusAndTooltip = (formData, formId, modelName, loggedInUserRole, viewFor) => {
  
 
  let status = modelName == 'XVFcGrantULBForm' ? formData?.waterManagement?.status : formData.status;
  let actionTakenByRole = formData.actionTakenByRole;
  let isDraft = modelName == 'XVFcGrantULBForm' ? !formData.isCompleted : formData.isDraft;
  let tooltip = calculateStatus(status, actionTakenByRole, isDraft, viewFor);
  let tick = calculateTick(tooltip, loggedInUserRole, viewFor)
  return {
    [formId]: {
      tooltip: tooltip,
      tick: tick
    }
  }

}

const findStatusAndTooltipMaster = (params) => {

  let { formData, formId, loggedInUserRole, viewFor } = params;
  let status = formData.currentFormStatus
  let tooltip = calculateStatusMaster(status);
  
  let tick = calculateTick(tooltip, loggedInUserRole, viewFor)
 
  return {
    [formId]: {
      tooltip: tooltip,
      tick: tick
    }
  }
}

const getPreviousYear = (currentYearId,no)=>{
  try{
    let yearName = getKeyByValue(years,currentYearId)
    let previousYear = `${yearName.split("-")[0]-no}-${yearName.split("-")[1]-no}`
    return years[previousYear]
  }
  catch(err){
    console.log("error in getPreviousYear :: ",err.message)
  }
}

const changeConditionsFor2223Forms = (conditions,year)=>{
let notFormYear = !outDatedYears.includes(getKeyByValue(years,year))
let cond = {...conditions}
if (notFormYear){
  let formYear = getPreviousYear(year,1)
  cond['design_year'] = ObjectId(formYear)
}
return cond
}


const UA_FORM_MODEL = {
  GFC_UA_YES: ObjectId("63ff31d63ae39326f4b2f467"),
  GFC_UA_NO: ObjectId("63ff31d63ae39326f4b2f46b"),
  ODF_UA_YES: ObjectId("63ff31d63ae39326f4b2f466"),
  ODF_UA_NO: ObjectId("63ff31d63ae39326f4b2f46a"),
  XVFcGrantULBForm_UA_YES: ObjectId("63ff31d63ae39326f4b2f465"),
  XVFcGrantULBForm_UA_NO: ObjectId("63ff31d63ae39326f4b2f469")
}

const getformStatus = (data)=>{
  try{
    const formData = {}
    const statusPriorities = [MASTER_FORM_STATUS['NOT_STARTED'], MASTER_FORM_STATUS['IN_PROGRESS'], MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'], MASTER_FORM_STATUS['RETURNED_BY_MoHUA'], MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA']];
    const minStatusIndex = Math.min(...data.map(item => statusPriorities.indexOf(item.currentFormStatus))) 
    const result = statusPriorities[minStatusIndex < 0 ? 1: minStatusIndex];
    formData['currentFormStatus'] = result
    return formData
  }
  catch(err){
    console.log("error in findStatuses :: ",err.message)
  }
}

module.exports.get = catchAsync(async (req, res) => {
  let user = req.decoded;
  let role = req.query.role;
  let year = req.query.year;
  let _id = req.query._id;
  let cardArr = [], tempData;
  let singleYearForms =  [PTFR,SFC,PFMS]
  let collectionNames = {
    "LinkPFMS" :"PFMSAccount"
  }
  let singleYearFormCollections = ['StateFinanceCommissionFormation','PropertyTaxFloorRate','PFMSAccount']
  let cardObj = {
    label: "",
    key: "",
    link: "",
    title: "",
    message: '',
    tooltip: "",
    image: "",
    background_image: "",
    cardSequence: "",
    color: {
      color_1: "",
      color_2: ""
    }
  }
  let isLatestCreated;
  if ((role == 'ULB' || role == 'STATE') && (!role || !year || !_id))
    return res.status(400).json({
      success: false,
      message: "Data missing"
    })
  let isUA;
  
  let output = []
  if (role == 'ULB') {
    let ulbInfo = await Ulb.findOne({ _id: ObjectId(_id) }).lean();
    isUA = ulbInfo?.isUA
    let accessVariable = await getKeyByValue(years,year)
    accessVariable = `access_${accessVariable.split("-")[0].slice(-2)-1}${accessVariable.split("-")[1].slice(-2)-1}`
    isLatestCreated = !ulbInfo[accessVariable]
    console.log("accessVariable :: ",accessVariable,isLatestCreated)
    FormModelMapping["GfcFormCollection"] = isUA == 'Yes' ? ObjectId("62aa1d82c9a98b2254632a9e") : ObjectId("62aa1dd6c9a98b2254632aae")
    FormModelMapping["OdfFormCollection"] = isUA == 'Yes' ? ObjectId("62aa1d6ec9a98b2254632a9a") : ObjectId("62aa1dc0c9a98b2254632aaa")
    FormModelMapping["XVFcGrantULBForm"] = isUA == 'Yes' ? ObjectId("62aa1d4fc9a98b2254632a96") : ObjectId("62aa1dadc9a98b2254632aa6")

    FormModelMapping_Master_23_24["GfcFormCollection"] = isUA == 'Yes' ? UA_FORM_MODEL['GFC_UA_YES'] : UA_FORM_MODEL['GFC_UA_NO']
    FormModelMapping_Master_23_24["OdfFormCollection"] = isUA == 'Yes' ? UA_FORM_MODEL['ODF_UA_YES'] : UA_FORM_MODEL['ODF_UA_NO']
    FormModelMapping_Master_23_24["XVFcGrantULBForm"] = isUA == 'Yes' ? UA_FORM_MODEL['XVFcGrantULBForm_UA_YES'] : UA_FORM_MODEL['XVFcGrantULBForm_UA_NO']

    let condition = {
      ulb: ObjectId(_id),
    }
    let designYearCond = "design_year"

    let formArr = [AnnualAccounts, DUR, ODF, GFC, PFMS, SLB28, PropertyTaxOp]
    for (el of formArr) {
      if (el == DUR) {
        delete condition['design_year'];
        condition['designYear'] = ObjectId(year)
        designYearCond = "designYear";
      } else {
        delete condition['designYear'];
        condition['design_year'] = ObjectId(year)
        designYearCond = "design_year";
      }
      if(singleYearForms.includes(el) && !isLatestCreated){
        condition = await changeConditionsFor2223Forms(condition,year)
      }
      let formData = await el.findOne(condition).lean()
      
      if (formData) {
        if (formData[designYearCond].toString() === YEAR_CONSTANTS['23_24'] ) {
          output.push(findStatusAndTooltipMaster({ formData, formId: FormModelMapping_Master_23_24[el['modelName']], loggedInUserRole: user.role, viewFor: role }))
        } else {
          output.push(findStatusAndTooltip(formData, FormModelMapping[el['modelName']], el['modelName'], user.role, role))
        }
      }
    }
  } else if (role == 'STATE') {
    let stateInfo = await State.findOne({ _id: ObjectId(_id) }).lean();
    let condition = {
      state: ObjectId(_id),
      design_year: ObjectId(year)
    }
    let formArr = [SFC, PTFR, GTC_STATE,GrantDistribution ,ActionPlan, WaterRejuvenation,GrantDistribution]
    for (el of formArr) {
      dbCondition = {...condition}
      if (![GTC_STATE,GrantDistribution].includes(el)) {
        if(singleYearForms.includes(el)){
          dbCondition = await changeConditionsFor2223Forms(condition,year)
      }
        let formData = await el.findOne(dbCondition).lean()
        if (formData) {
          if (formData.design_year.toString() === YEAR_CONSTANTS['23_24']) {
            output.push(findStatusAndTooltipMaster({ formData, formId: FormModelMappingMaster_State[el['modelName']], loggedInUserRole: user.role, viewFor: role }))
          } else {
            output.push(findStatusAndTooltip(formData, FormModelMapping_State[el['modelName']], el['modelName'], user.role, role))
          }

        }
      } else {
        let formDataArray = await el.find(dbCondition).lean();
        let formData = formDataArray
        if (formDataArray.length > 0) {
          if(outDatedYears.includes(getKeyByValue(years,year))){
            formData = getGTCFinalForm(formDataArray);
            output.push(findStatusAndTooltip(formData, FormModelMapping_State[el['modelName']], el['modelName'], user.role, role))
          }
          else{
            formData = await getformStatus(formDataArray)
            output.push(findStatusAndTooltipMaster({ formData, formId: FormModelMappingMaster_State[el['modelName']], loggedInUserRole: user.role, viewFor: role }))
          }
        }
      }
    }
  }

  let data = await Sidemenu.find({ year: ObjectId(year), role: role, isActive: true }).lean()
  if (data.length) {
    if (role == "ULB") {
      if (isUA == 'Yes') {
        data = data.filter(el => el.category != 'Performance Conditions')
      } else {
        data = data.filter(el => el.category != 'Million Plus City Challenge Fund')
      }

      data.forEach((el,) => {
        if (el.category && el.collectionName != "GTC" && el.collectionName != "SLB") {
          let flag = 0;
          let variableName = collectionNames[el.path] || el.path
          if(singleYearFormCollections.includes(variableName) && !isLatestCreated){
            el._id = FormModelMapping[variableName]
          }
          output.forEach(el2 => {
            if ((el._id).toString() == (Object.keys(el2)[0])) {
              Object.assign(el, el2[Object.keys(el2)[0]])
              flag = 1;
            }
          })
          if (!flag && el.collectionName != "GTC") {
            Object.assign(el, { tooltip: "Not Started", tick: ticks['red'] })
          }
        } else {
          // where tick /cross logic is not applicable
          Object.assign(el, { tooltip: "", tick: "" })
        }


      })
    } else if (role == "STATE") {
      data.forEach((el,) => {
        if (el.category.toLowerCase() != "ulb management" && el.url !== "water-supply"
          && !(["GrantClaim"].includes(`${el.collectionName}`)) && !(el.name === "Dashboard")
        ) {
          let flag = 0;
          if(singleYearFormCollections.includes(el.path)){
            el._id = FormModelMapping_State[el.path]
          }
          output.forEach(el2 => {
            if ((el._id).toString() == (Object.keys(el2)[0])) {
              Object.assign(el, el2[Object.keys(el2)[0]])
              flag = 1;
            }
          })
          if (!flag && el.category.toLowerCase() != "ulb management") {
            Object.assign(el, { tooltip: "Not Started", tick: ticks['red'] })
          }
        } else {
          // where tick /cross logic is not applicable
          Object.assign(el, { tooltip: "", tick: "" })
        }


      })
    }
    // add the formStatus and tooltip

    // adding previous and next url
    // data.sort() sequence
    tempData = data.sort((a, b) => {
      return a.sequence - b.sequence;
    })
    // let result2=[];
    for (let i = 0; i < tempData.length; i++) {
      let entity = tempData[i];
      if (entity?.sequence) {

        if (i === 0) {//first entry
          entity.prevUrl = null;
          if (tempData[i + 1]) {
            entity.nextUrl = `../${tempData[i + 1].url}`;
          }
        } else if (i === (tempData.length - 1)) {//last entry
          entity.prevUrl = `../${tempData[i - 1].url}`;
          entity.nextUrl = null;
        } else {
          entity.prevUrl = `../${tempData[i - 1].url}`;
          entity.nextUrl = `../${tempData[i + 1].url}`;
        }
        // result2.push(entity);

      }
      if (role === "STATE") {
        entity.category = `${entity.category}_${entity.groupSequence}`
      }
    }
    //group the data 
    tempData = groupByKey(data, "category")
  }



  // if (role === "STATE") {
  //   let subCatTempData = tempData[""];
  //   let newSubCat = {};
  //   for (let obj of subCatTempData) {
  //     if (obj && obj.name) {
  //       if (!newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]]) {
  //         newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]] = [obj];
  //         continue;
  //       }
  //       newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]].push(obj);
  //     }
  //   }
  //   tempData[""] = newSubCat;
  // }

  //sorting the data as per sequence no;
  tempData = sortByPosition(tempData);

  //creating card Data
  if (role == "ULB") {
    const ignoreCardsList = ['overview', 'resources'];
    // if(years['2022-23'] === year){
    cardArr = getCards(data, cardObj, ignoreCardsList);
    // }
    cardArr.sort((a, b) => {
      return a?.cardSequence - b?.cardSequence
    })
  }

  return res.status(200).json({
    success: true,
    data: tempData,
    card: role == "ULB" ? cardArr : []
  })
})

module.exports.list = catchAsync(async (req, res) => {
  let role = req.query.role;
  let design_year = req.query.design_year;

  let condition = {
    role: role,
    year: ObjectId(design_year),
    isForm: true,
    isActive: true,
  }
  let data = await Sidemenu.find(condition).select({ name: 1, _id: 1, collectionName: 1, path: 1, url: 1, optional: 1, folderName: 1, formId: 1 });

  data = data.filter((value, index, self) =>
    index === self.findIndex((t) => (
      t.collectionName === value.collectionName
    ))
  )
  res.status(200).json({
    success: true,
    data: data
  })
})

module.exports.post = catchAsync(async (req, res) => {
  let data = req.body;
  if (!data.name || !data.url || !data.role || !data.position || !data.year) {
    return res.status(400).json({
      success: false,
      message: "Data missing"
    })

  }
  let year = await Year.findOne({ _id: ObjectId(data.year) }).lean()
  let code = data.role + year.year


  let obj = {
    name: data.name,
    category: data.category ?? "",
    url: data.url,
    role: data.role,
    position: data.position,
    year: ObjectId(data.year),
    code: code,
    icon: data.icon ?? ""

  }
  let menuData = new Sidemenu(obj);

  await menuData.save();

  let fetchedData = await Sidemenu.find({ code: code })

  return res.status(200).json({
    success: true,
    message: "Data Saved",
    data: fetchedData

  })

})


module.exports.put = catchAsync(async (req, res) => {

})


module.exports.delete = catchAsync(async (req, res) => {

})

const sortByPosition = (data) => {
  for (let key in data) {
    data[key].sort((a, b) => {
      return a.position - b.position;
    });
  }


  return data;
};
const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})


function getCards(data, cardObj, ignoreCardsList) {
  let cardArr = [];
  data.forEach(el => {
    if (!ignoreCardsList.includes(el.name.toLowerCase())) {
      cardObj.image = el?.icon;
      cardObj.key = el?.collectionName;
      cardObj.label = el?.name;
      cardObj.title = el?.cardLabel;
      cardObj.message = el?.cardMessage;
      cardObj.tooltip = el?.tooltip;
      cardObj.link = el?.url;
      cardObj.background_image = el?.background_image;
      cardObj.color = el?.color;
      cardObj.cardSequence = el?.cardSequence
      cardArr.push(cardObj);
      cardObj = {
        label: "",
        key: "",
        link: "",
        title: "",
        message: '',
        tooltip: "",
        image: "",
        background_image: "",
        color: {},
        cardSequence: ""
      };
    }


  });
  return cardArr;
}

function getGTCFinalForm(formArray) {
  let formData = "";
  let approvedForm = 0;
  let pendingForm = 0;
  let pendingFormData = "";
  for (let i = 0; i < formArray.length; i++) {
    formData = formArray[i];
    if (formData.status === "REJECTED") {//return rejected form if any rejected
      return formData;
    } else if (formData.status === "APPROVED") {
      approvedForm++;
    } else if (formData.status === "PENDING") {
      pendingForm++;
      pendingFormData = formData;
    }
  }
  if (approvedForm === 8) {//if all forms approved
    return formData;
  }
  if (pendingForm === 8) {
    //if all forms are submit, to get Under review by mohua status
    return pendingFormData;
  }
  if (approvedForm < 8 && pendingForm > 0) {
    //if any form is pending, In progress
    pendingFormData.isDraft = true;
    return pendingFormData;
  } else if (approvedForm < 8 && pendingForm === 0) {
    //if all forms submitted are approved but all 8 are not submitted.
    //In progress
    formData.status = 'PENDING';
    formData.actionTakenByRole = 'STATE';
    formData.isDraft = true;
    return formData;
  }

}