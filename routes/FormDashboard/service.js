const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const {calculateStatus} = require('../CommonActionAPI/service');
const StatusList = require('../../util/newStatusList');
const StateFinanceCommission = require('../../models/StateFinanceCommissionFormation');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const ActionPlan = require('../../models/ActionPlans');
const WaterRejenuvation = require('../../models/WaterRejenuvation&Recycling');
const DUR = require('../../models/UtilizationReport');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const StateGTCCertificate = require('../../models/StateGTCertificate');
const SLB = require('../../models/XVFcGrantForm');
const State = require('../../models/State');
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require('mongoose').Types.ObjectId;
const {CollectionNames, ModelNames, FormPathMappings, ModelNamesToFormId} = require('../../util/15thFCstatus');
const { YEAR_CONSTANTS, MASTER_STATUS, FormNames, USER_ROLE, FormURL, MASTER_STATUS_ID, MASTER_FORM_STATUS,  INSTALLMENT_TYPE } = require('../../util/FormNames');
const UA = require('../../models/UA');
const {getPopulationDataQueries} = require('./query')
const Response = require('../../service/response');
const response = require('../../service/response');

const CUTOFF =  {
    STATE:{
        nmpc_untied: {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100
        },
        nmpc_tied : {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100
        },
        mpc_tied: {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100,
        }
    },
    ULB:{
        nmpc_untied: {
            [CollectionNames.annualAcc]: 25,
            [CollectionNames.linkPFMS]: 100,
        },
        nmpc_tied : {
            [CollectionNames.annualAcc]: 25,
            [CollectionNames.linkPFMS]: 100,
            [CollectionNames.dur]: 100,
        },
        mpc_tied: {
            [CollectionNames.annualAcc]: 25,
            [CollectionNames.linkPFMS]: 100,
            [CollectionNames.dur]: 100,
            [CollectionNames.twentyEightSlbs]: 100,
            [CollectionNames.slb]:100,
            [CollectionNames.odf]:100,
            [CollectionNames.gfc]:100,
        }
    }
}
const CUTOFF2324 =  {
    STATE:{
        nmpc_untied: {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100
        },
        nmpc_tied : {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100
        },
        mpc_tied: {
            [CollectionNames.gtc]: 100,
            [CollectionNames.sfc]: 100,
            [CollectionNames.pTAX]:100,
            [CollectionNames.slbScoring]:100,
            [CollectionNames.actionPlan]:100,
            [CollectionNames.waterRej]:100
        }
    },
    ULB:{
        nmpc_untied: {
            [CollectionNames.annualAcc]: 100,
            [CollectionNames.linkPFMS]: 100,
            [CollectionNames.propTaxOp]:100,

        },
        nmpc_tied : {
            [CollectionNames.annualAcc]: 100,
            [CollectionNames.linkPFMS]: 100,
            [CollectionNames.dur]: 100,
            [CollectionNames.propTaxOp]:100,

        },
        mpc_tied: {
            [CollectionNames.annualAcc]: 100,
            [CollectionNames.linkPFMS]: 100,
            [CollectionNames.dur]: 100,
            [CollectionNames.twentyEightSlbs]: 100,
            [CollectionNames.slb]:100,
            [CollectionNames.odf]:100,
            [CollectionNames.gfc]:100,
            [CollectionNames.propTaxOp]:100,

        }
    }
}

const TYPE = {
     "million_tied": "mpc_tied",
     "nonmillion_tied": "nmpc_tied",
     "nonmillion_untied": "nmpc_untied"
}
function gtcSubmitCondition(type, installment, state, designYear){
    let condition = {};
    let query = [];
    let submitConditionState = [
        {
            isDraft: false,
            actionTakenByRole: "STATE",
            status: "PENDING", 
        },
        {
            isDraft: false,
            actionTakenByRole: "MoHUA",
            status: "APPROVED"
        }
    ]
    installment =  Number(installment);
    if(type === "nmpc_untied" ){
        if(installment ===1){
            condition ={
                design_year: ObjectId(designYear),
                state: ObjectId(state),
                year: ObjectId(YEAR_CONSTANTS['21_22']),
                type:"nonmillion_untied",
                installment:2
            }
        } else if( installment ===2){
            condition ={
                design_year: ObjectId(designYear),
                state: ObjectId(state),
                year: ObjectId(YEAR_CONSTANTS['22_23']),
                type:"nonmillion_untied",
                installment:1
            }
        }
    } else if( type === "nmpc_tied"){
        if(installment === 1){
            condition ={
                design_year: ObjectId(designYear),
                state: ObjectId(state),
                year: ObjectId(YEAR_CONSTANTS['21_22']),
                type:"nonmillion_tied",
                installment:2
            }
        } else if( installment ===2){
            condition ={
                design_year: ObjectId(designYear),
                state: ObjectId(state),
                year: ObjectId(YEAR_CONSTANTS['22_23']),
                type:"nonmillion_tied",
                installment:1
            }
        }
    }else if(type === "mpc_tied"){
        if(installment === 1 ){
            condition = {
                type:"million_tied",
                installment,
                design_year: ObjectId(designYear),
                state: ObjectId(state),
                year: ObjectId(YEAR_CONSTANTS['21_22'])
            }
        }
    }
    
    condition.$or = [...submitConditionState]
    query.push({
        $match: condition
    });
    return query;
}

function gtcSubmitCondition2324(type, installment, state, designYear){
    try {
        const conditions = [
            {
              type: 'nmpc_untied',
              installments: ['2', '1'],
              years: [ YEAR_CONSTANTS['23_24'], YEAR_CONSTANTS['22_23'],],
              condition: 'nonmillion_untied',
            },
            {
              type: 'nmpc_tied',
              installments: ['2', '1'],
              years: [ YEAR_CONSTANTS['23_24'], YEAR_CONSTANTS['22_23']],
              condition: 'nonmillion_tied',
            },
            {
              type: 'mpc_tied',
              installments: ['1'],
              years: [YEAR_CONSTANTS['22_23']],
              condition: 'million_tied',
            },
          ];
        
          const condition = {};
          const submitConditionState2223 = [
            {
              isDraft: false,
              actionTakenByRole: 'MoHUA',
              status: 'APPROVED',
            },
            {
                isDraft: false,
                actionTakenByRole: 'STATE',
                status: 'PENDING',
              },
          ];
          let submitConditionState = [
            {
                currentFormStatus:{
                    $in:[
                        MASTER_STATUS['Under Review By MoHUA'],
                        MASTER_STATUS['Submission Acknowledged By MoHUA'],
                    ]
                }
            }
        ]
        const firstInstallment = '1'
          for (const item of conditions) {
            if (item.type === type && item.installments.includes(installment)) {
              const index = item.installments.indexOf(installment);
        
              condition.design_year = installment === firstInstallment ? ObjectId(YEAR_CONSTANTS['22_23']) : ObjectId(designYear);
            //   condition.state = ObjectId(state);
              condition.year = ObjectId(item.years[index]);
              condition.type = item.condition;
              condition.installment = installment === firstInstallment ? Number(item.installments[index])+1 : Number(firstInstallment);
            if(type === TYPE['million_tied']){
                condition.installment = Number(firstInstallment);
            }
              break;
            }
          }
          condition.$or = designYear === YEAR_CONSTANTS['22_23'] ? submitConditionState2223 :(installment === firstInstallment ? submitConditionState2223 : submitConditionState );
          return [{
            $match: condition,
          }];
    } catch (error) {
        throw(`gtcSubmitCondition2324:: ${error.message}`)
    }
}

function stateGtcCertificateSubmmitedForms(type, installment, state){
    let condition = {};
    let cond = {};
    conditionLookup = {
        $lookup:{
        from: "users",
        foreignField: "_id",
        localField: "actionTakenBy",
        as:"user"}
    }
    conditionUnwind = {$unwind: "$user"}
   
    let query = [];
    let submitConditionState = [
        {
            isDraft: false,
            "user.role": "STATE",
            status: "PENDING", 
        },
        {
            isDraft: false,
            "user.role": "MoHUA",
            status: "APPROVED"
        }
    ]
    installment =  Number(installment);
    if(type === "nmpc_untied" || type === "nmpc_tied"){
        if( installment === 1)
            cond ={
                state: ObjectId(state),
                design_year: ObjectId("606aaf854dff55e6c075d219"),
                installment:"2"
            }
    }else if(type === "mpc_tied"){
        if(installment === 1 ){
            cond = {
                installment: "1",
                state: ObjectId(state),
                design_year: ObjectId("606aaf854dff55e6c075d219")
            }
        }
    }
    
    cond.$or = [...submitConditionState]
    query.push(
        conditionLookup,
        conditionUnwind,
        {
        $match: cond
    });
    return query;
}

const FormObjectIds = {
    [CollectionNames.annualAcc]: ObjectId("62aa1b04729673217e5ca3aa"),
    [CollectionNames.gtc]: ObjectId("62aa1bbec9a98b2254632a86"),
    [CollectionNames.dur]: ObjectId("62aa1c96c9a98b2254632a8a"),
    [CollectionNames.linkPFMS]: ObjectId("62aa1cc9c9a98b2254632a8e"),
    [CollectionNames.slb]: ObjectId("62aa1d4fc9a98b2254632a96"),
    [CollectionNames.odf]: ObjectId("62aa1d6ec9a98b2254632a9a"),
    [CollectionNames.gfc]: ObjectId("62aa1d82c9a98b2254632a9e"),
    [CollectionNames.sfc]: ObjectId("62c553822954384b44b3c38e"),
    [CollectionNames.pTAX]: ObjectId("62c5534e2954384b44b3c38a"),
    [CollectionNames.twentyEightSlbs]: ObjectId("62f0dbbf596298da6d3f4076")
}

function getCollections(type, installment){
    let collections = [];
    let condition = `${type}_${installment}`;
    
    switch(condition){
        case "nmpc_untied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission];
            break;
        case "nmpc_untied_2":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission];
            break;
        case "nmpc_tied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR]
            break;
        case "nmpc_tied_2":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR];
            break;
        case "mpc_tied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR, 
                TwentyEightSlbsForm, OdfFormCollection, GfcFormCollection, SLB, 
            ]
            break;            
    }
    return collections;
} 


function getCollections2324(type, installment) {
  const collectionsMap = {
    nmpc_untied_1: [
      AnnualAccounts,
      LinkPFMS,
      GrantTransferCertificate,
      StateFinanceCommission,
      PropertyTaxOp,
    ],
    nmpc_untied_2: [
      AnnualAccounts,
      LinkPFMS,
      GrantTransferCertificate,
      StateFinanceCommission,
      PropertyTaxOp,
    ],
    nmpc_tied_1: [
      AnnualAccounts,
      LinkPFMS,
      GrantTransferCertificate,
      StateFinanceCommission,
      PropertyTaxOp,
      DUR,
    ],
    nmpc_tied_2: [
      AnnualAccounts,
      LinkPFMS,
      GrantTransferCertificate,
      StateFinanceCommission,
      PropertyTaxOp,
      DUR
    ],
    mpc_tied_1: [
      AnnualAccounts,
      LinkPFMS,
      GrantTransferCertificate,
      StateFinanceCommission,
      PropertyTaxOp,
      DUR,
      TwentyEightSlbsForm,
      OdfFormCollection,
      GfcFormCollection,
      SLB,
      ActionPlan,
      WaterRejenuvation,
    ],
  };
  for(let key in collectionsMap){
    collectionsMap[key].push(PropertyTaxFloorRate)
  }
  const condition = `${type}_${installment}`;

  return collectionsMap[condition] || [];
}
  
const COLORS = {
    ULB: {
      formName: "ULB Forms",
      approvedColor: '#E67E15',
      submittedColor: '#f7bf88',
      border: '#E67E15'
    },
    STATE: {
      formName: "State Forms",
      approvedColor: '#059B05',
      submittedColor: '#f7bf88',
      border: '#059B05'
    }
  };
const ELIGIBLITY = {
    YES: "Eligible for Grant Claim",
    NO: "Not yet eligible for Grant Claim",
}
/**
 * The function takes in form data and returns a formatted object with specific properties based on the
 * form category and model name.
 * @param formCategory - A string indicating the category of the form, either "ULB" or "STATE".
 * @param modelName - The name of the model for which the form data is being retrieved.
 * @param sidemenuForms - An array of objects containing information about the forms displayed in the
 * side menu.
 * @param reviewForm - Unfortunately, I cannot provide a complete answer without knowing the data type
 * and structure of the `reviewForm` parameter. However, based on the code snippet, it seems that
 * `reviewForm` is an object that contains a `url` property used to construct the `formData` object's
 * `link`
 * @returns an object containing various properties related to the form data, such as the form
 * category, approved and submitted colors, border, form name, icon, and link. The specific properties
 * returned depend on the input parameters and the conditions met within the function.
 */
function getFormData(formCategory, modelName, sidemenuForms, reviewForm, design_year) {
  let formData = {};
  if (formCategory === "ULB") {
    formData["approvedColor"] = "#E67E15";
    formData["submittedColor"] = "#f7bf88";
    formData["border"] = "#E67E15";
  } else if (formCategory === "STATE") {
    formData["approvedColor"] = "#059B05";
    formData["submittedColor"] = "#f7bf88";
    formData["border"] = "#059B05";
  }
  let element = sidemenuForms.find((el) => {
    return el._id === FormPathMappings[modelName];
  });

  //First 4 cases where ModelName is not equal to path in sidemenu form
  if (
    modelName === CollectionNames.annualAcc &&
    element._id === "AnnualAccounts"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.annualAcc]
    }`;
  } else if (
    modelName === CollectionNames.linkPFMS &&
    element._id === "LinkPFMS"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.linkPFMS]
    }`;
  } else if (
    modelName === CollectionNames.slb &&
    element._id === "XVFcGrantForm"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}`;
  } else if (
    modelName === CollectionNames.twentyEightSlbs &&
    element._id === "TwentyEightSlbsForm"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.twentyEightSlbs]
    }`;
  } else if (
    modelName === CollectionNames.dur &&
    element._id === "UtilizationReport"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.dur]
    }`;
  } else if (
    modelName === CollectionNames.gtc &&
    element._id === "GrantTransferCertificate"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = ![YEAR_CONSTANTS['22_23']].includes(design_year) ? FormURL['23_24']['GTC_STATE'] : `/${element.url}`;
  } else if (
    modelName === CollectionNames.twentyEightSlbs &&
    element._id === "TwentyEightSlbsForm"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.twentyEightSlbs]
    }`;
  } else if (
    modelName === CollectionNames.odf &&
    element._id === "OdfFormCollection"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.odf]
    }`;
  } else if (
    modelName === CollectionNames.gfc &&
    element._id === "GfcFormCollection"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${reviewForm.url}/${
      FormObjectIds[CollectionNames.gfc]
    }`;
  } else if (
    modelName === CollectionNames.sfc &&
    element._id === "StateFinanceCommissionFormation"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${element.url}`;
  } else if (
    modelName === CollectionNames.pTAX &&
    element._id === "PropertyTaxFloorRate"
  ) {
    formData["formName"] = element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${element.url}`;
  } else if (
    modelName === CollectionNames.propTaxOp &&
    element._id === "PropertyTaxOp"
  ) {
    formData["formName"] = ![YEAR_CONSTANTS['22_23']].includes(design_year) ? FormNames['detailPTaxOp'] : element.name;
    formData["icon"] = element.icon;
    formData["link"] = `/${element.url}`;
  } else if (
    [CollectionNames.actionPlan, CollectionNames.waterRej].includes(modelName)
  ) {
    getFormsLinkIcon(element, formData);
  }
  /* 
     The function handles the form link based on the user's role and design year.
 */
  handleFormLinkBasedOnRole(
    design_year,
    formCategory,
    modelName,
    formData,
    reviewForm
  );
  return formData;
}

/**
  The function handles the form link based on the user's role and design year.
 */
function handleFormLinkBasedOnRole(design_year, formCategory, modelName, formData, reviewForm) {
    if (![YEAR_CONSTANTS['22_23']].includes(design_year)) {
        if ([USER_ROLE['ULB']].includes(formCategory)) {
            const ignoreForms = [CollectionNames.slb];
            updateFormLink(modelName, formData, reviewForm, ignoreForms);
        } else {
            formData.link = `/state-form${formData.link}`;
        }
    }
}

/**
 * The function updates the link property of the formData object based on the modelName and reviewForm
 * parameters.
 */
function updateFormLink(modelName,formData,reviewForm,ignoreForms){
    let modelExist = Object.values(CollectionNames).includes(modelName)
    if(modelExist && !ignoreForms.includes(modelName)){
        formData.link = `/state-form/${reviewForm.url}?formId=${ModelNamesToFormId[modelName]}`
    } else {
        formData.link = `/stateform/${reviewForm.url}`
    }
}
 
function getFormsLinkIcon(element,  formData) {
    if (element._id === "ActionPlans") {
        formData["formName"] = element.name;
        formData['icon'] = element.icon;
        formData['link'] = `/${element.url}`;
    } else if (element._id === "WaterRejenuvationRecycling") {
        formData["formName"] = element.name;
        formData['icon'] = element.icon;
        formData['link'] = `/${element.url}`;
    }
}

function approvedForms(forms, formCategory, design_year, modelName){
    let numOfApprovedForms = 0;
    for(let i =0 ; i < forms.length; i++){
        let element = forms[i];
        if(!element){ 
            break;
        }
        let {status, actionTakenByRole: role, isDraft, currentFormStatus} = element
        if(!role){
            role = element?.user?.role;
        }
        if(
            ![ YEAR_CONSTANTS['22_23']].includes(design_year) && 
            ![CollectionNames.linkPFMS, CollectionNames.sfc].includes(modelName) &&
            currentFormStatus
        ){
            switch(formCategory){
                case "ULB":
                    if( [
                    MASTER_STATUS['Submission Acknowledged By MoHUA'],
                    MASTER_STATUS['Under Review By MoHUA']].includes(currentFormStatus)){
                        numOfApprovedForms++;
                    }
                    break;
                case "STATE":
                    if([
                    MASTER_STATUS['Submission Acknowledged By MoHUA'],
                    ].includes(currentFormStatus) ){
                        numOfApprovedForms++;
                    }
                    break;
            } 
        }else{
            switch(formCategory){
                case "ULB":
                    if( (calculateStatus(status, role, isDraft, formCategory) === StatusList.Approved_By_MoHUA) ||
                        (calculateStatus(status, role, isDraft, formCategory) === StatusList.Under_Review_By_MoHUA)){
                        numOfApprovedForms++;
                    }
                    break;
                case "STATE":
                    if((calculateStatus(status, role, isDraft, formCategory) === StatusList.Approved_By_MoHUA) ){
                        numOfApprovedForms++;
                    }
                    break;
            } 
        }
    }
    return numOfApprovedForms;
}
function UASubmittedForms(forms, formCategory, design_year, modelName) {
  try {
    let numOfUAUlbSubmittedForms = 0;
    for (let i = 0; i < forms.length; i++) {
      let element = forms[i];
      if (!element) {
        break;
      }
      let { actionTakenByRole: role, currentFormStatus, ulb } = element;
      if (!role) {
        role = element?.["user"]["role"];
      }
        if (
          [
            MASTER_STATUS["Under Review By State"]
          ].includes(currentFormStatus) &&
            ulb?.isUA === "Yes" &&
            formCategory === "ULB"
        ) {
            numOfUAUlbSubmittedForms++;
        }
    }
    return numOfUAUlbSubmittedForms;
  } catch (error) {
    throw `UASubmittedForms:: ${error.message}`;
  }
}
function getQuery(modelName, formType, designYear, formCategory, stateId){
    let query = [];
    let condition = {};
    let designYearField = "design_year";
    if(modelName == CollectionNames.dur) designYearField = "designYear"
        
    let nmpcConditionUlb = [],
        mpcConditionUlb = [];
    const defaultProjectStage = {
        actionTakenByRole:1,
        isDraft:1,
        ulb:1,
        [designYearField]:1,
        status:1
    }
        nmpcConditionUlb =[
            { $project: defaultProjectStage },
            {
                $lookup:{
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb",
                }
            },
            {$unwind: "$ulb" },
            {
                $match:{
                    "ulb.isMillionPlus":"No",
                }
            }
        ];
        mpcConditionUlb = [
            { $project:   defaultProjectStage },
            {
                $lookup:{
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb",
                }
            },
            {$unwind: "$ulb" },
            {
                $match:{
                    "ulb.isUA":"Yes"   
                }
            } 
        ];
        if (formCategory === "ULB") {
          if (["nmpc_untied", "nmpc_tied"].includes(formType)) {
            updatePopulationCondition(nmpcConditionUlb, modelName)
            query.push(...nmpcConditionUlb);
          } else if (formType === "mpc_tied") {
            updatePopulationCondition(mpcConditionUlb, modelName)
            query.push(...mpcConditionUlb);
          }
        }

    let submitConditionUlb = [{
        "isDraft": false,
        "actionTakenByRole": {$in:["ULB", "MoHUA", "STATE"]},
        "status": {$in:["PENDING","APPROVED"]}
    }]

    let submitConditionState = [
        {
            isDraft: false,
            actionTakenByRole: {$in:["STATE", "MoHUA"]},
            status: {$in:["PENDING", "APPROVED"]}, 
        }
    ]
    switch(formCategory){
        case "ULB":
            switch(modelName){
                case CollectionNames.annualAcc:
                    condition = {
                        audited :{
                            submit_annual_accounts: true
                        },
                        unAudited: {
                            submit_annual_accounts: true
                        },
                        isDraft: false
                    };
                    query.push({
                        $match: {
                            design_year: ObjectId(designYear),
                            "ulb.state": ObjectId(stateId),
                            $or:[...submitConditionUlb,condition]
                        }
                    });
                    break;
                case CollectionNames.linkPFMS:
                    condition = {
                        linkPFMS:'Yes',
                        isUlbLinkedWithPFMS: 'Yes',
                        isDraft: false
                    };
                    query.push({
                        $match: {
                            design_year: ObjectId(designYear),
                            "ulb.state": ObjectId(stateId),
                            $or:[...submitConditionUlb,condition]
                        }
                    });
                    break;
                case CollectionNames.twentyEightSlbs:
                case CollectionNames.gfc:
                case CollectionNames.odf: 
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            "ulb.state": ObjectId(stateId),
                            $or:[...submitConditionUlb]
                    }
                    });
                    break;
                case CollectionNames.slb:
                    condition = {
                        blank: false,
                        isDraft: false
                    }
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            "ulb.state": ObjectId(stateId),
                            $or:[...submitConditionUlb, condition]
                    }
                    });
                    break;
                case CollectionNames.dur:
                    query.push({
                        $match: {
                            designYear: ObjectId(designYear),
                            "ulb.state": ObjectId(stateId),
                            $or: [...submitConditionUlb]
                    }
                    })  
                    break;
            }
            break;
        case "STATE":
            switch(modelName){
                case CollectionNames.sfc:
                case CollectionNames.pTAX:
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            state: ObjectId(stateId),
                            $or:[...submitConditionState]
                    }
                    })  
                    break;
                }
            break;
    }
    return query;
}
/* Fields to project */
const ProjectStageForPopulation = {
    [CollectionNames.annualAcc]:{
        "audited.submit_annual_accounts" :1,
        "unAudited.submit_annual_accounts": 1,
        "isDraft": 1
    },
    [CollectionNames.linkPFMS]: {
        linkPFMS:1,
        isUlbLinkedWithPFMS: 1,
        isDraft: 1
    },
    [CollectionNames.slb]:{
        blank: 1,
        isDraft: 1
    }
}
/**
 * The function `updatePopulationCondition` updates a specific condition in a JavaScript object based
 * on a given model name.
 * @param condition - The `condition` parameter is an array of objects that represents the stages of a
 * MongoDB aggregation pipeline. Each object in the array represents a stage in the pipeline.
 * @param modelName - The `modelName` parameter is a string that represents the name of the model for
 * which the population condition is being updated.
 */
function updatePopulationCondition(condition, modelName){
    try {
        let projectStage =  condition.find(el=> el.hasOwnProperty("$project"));
        projectStage['$project'] = {...projectStage['$project'],...ProjectStageForPopulation[modelName] }
    } catch (error) {
        throw {message: `updatePopulationCondition:  ${error.message}`}
    }
}

function getQuery2324(modelName, formType, designYear, formCategory, stateId){
    let query = [];
    let condition = {};
    let nmpcConditionUlb = [],
        mpcConditionUlb = [];

        nmpcConditionUlb =[
            {
                $lookup:{
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb",
                }
            },
            {$unwind: "$ulb" },
            {
                $match:{
                    "ulb.isActive":true,
                    "ulb.isMillionPlus":"No",
                }
            }
        ];
        mpcConditionUlb = [
            {
                $lookup:{
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb",
                }
            },
            {$unwind: "$ulb" },
            {
                $match:{
                    "ulb.isActive":true,
                    $or:[
                        {
                            "ulb.isMillionPlus":"Yes",
                            "ulb.isUA":"Yes"
                        },
                        {
                            "ulb.isMillionPlus":"No",
                            "ulb.isUA": "Yes"
                        }
                    ]     
                }
            } 
        ];
    if(formType === "nmpc_untied" || formType === "nmpc_tied"){
        if( formCategory === "ULB"){
            query.push(...nmpcConditionUlb);
        }
    } else if( formType === "mpc_tied"){
        if( formCategory === "ULB"){
            query.push(...mpcConditionUlb)
        }
    }

    let submitConditionUlb = [{
        currentFormStatus:{
            $in:[
                MASTER_STATUS['Submission Acknowledged By MoHUA'],
                MASTER_STATUS['Under Review By MoHUA'],
                MASTER_FORM_STATUS['UNDER_REVIEW_BY_STATE']
            ]
        }
    }]
    
    let submitConditionState = [
        {
            currentFormStatus:{
                $in:[
                    MASTER_STATUS['Submission Acknowledged By MoHUA'],
                MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA']

                ]
            }
        }
    ]
    let submitConditionUlb2223 = [
        {
            isDraft: false,
            actionTakenByRole: "STATE",
            status: "PENDING"
        },{
        isDraft: false,
        actionTakenByRole: "STATE",
        status: "APPROVED"
    },{
        isDraft: false,
        actionTakenByRole: "MoHUA",
        status:"APPROVED"
    }]

    let submitConditionState2223 = [
        {
            isDraft: false,
            actionTakenByRole: "STATE",
            status: "PENDING"
        },
        {
            isDraft: false,
            actionTakenByRole: "MoHUA",
            status: "APPROVED"
        }
    ]
    switch(formCategory){
        case "ULB":
            switch(modelName){
                case CollectionNames.annualAcc:
                    condition = {
                        audited :{
                            submit_annual_accounts: true
                        },
                        unAudited: {
                            submit_annual_accounts: true
                        },
                        isDraft: false
                    };
                    query.push({
                        $match: {
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionUlb,condition]
                        }
                    });
                    break;
                case CollectionNames.linkPFMS:
                    condition = {
                        linkPFMS:'Yes',
                        isUlbLinkedWithPFMS: 'Yes',
                        isDraft: false
                    };
                    query.push({
                        $match: {
                            design_year: ObjectId(YEAR_CONSTANTS['22_23']),
                            $or:[...submitConditionUlb2223,condition]
                        }
                    });
                    break;
                case CollectionNames.twentyEightSlbs:
                case CollectionNames.gfc:
                case CollectionNames.odf: 
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionUlb]
                    }
                    });
                    break;
                case CollectionNames.slb:
                    // condition = {
                    //     blank: false,
                    //     isCompleted : true,
                    // }
                    // query.push({
                    //     $match:{
                    //         design_year: ObjectId(YEAR_CONSTANTS['21_22']),
                    //         "ulb.state": ObjectId(stateId),
                    //         $or:[...submitConditionUlb2223, condition]
                    // }
                    // });
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionUlb]
                    }
                    });
                    break;
                case CollectionNames.dur:
                    query.push({
                        $match: {
                            designYear: ObjectId(designYear),
                            $or: [...submitConditionUlb]
                    }
                    })  
                    break;
                case CollectionNames.propTaxOp:
                query.push({
                    $match: {
                        design_year: ObjectId(designYear),
                        $or: [...submitConditionUlb]
                }
                })  
                break;

            }
            break;
        case "STATE":
            switch(modelName){
                case CollectionNames.sfc:
                case CollectionNames.pTAX:
                    query.push({
                        $match:{
                            design_year: ObjectId(YEAR_CONSTANTS['22_23']),
                            $or:[...submitConditionState2223]
                    }
                    })  
                    break;
                case CollectionNames.actionPlan:
                case CollectionNames.waterRej:
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionState]
                    }
                    })  
                    break;
                }
            break;
    }
    if(formCategory === "ULB"){
        addStatusData(modelName, query);  
    }
    return query;
}

const dashboard = async (req, res) => {
    try {
        let data = req.query;
        let user = req.decoded;
        let { _id: actionTakenBy, role: actionTakenByRole, state } = user;
        if([USER_ROLE['MoHUA']].includes(actionTakenByRole)){
            state = data?.state ?? data?.stateId
        }
        let collectionArr = getCollections(data.formType, data.installment);
        if(data.design_year === YEAR_CONSTANTS['23_24']){
            collectionArr = getCollections2324(data.formType, data.installment);
        }
        let {states} = data;
       // let states = await State.find({
        //     "accessToXVFC" : true,
        //     "isActive": true
        //  }).lean();
        //  states = states.map((el)=> {
        //     return el._id.toString()
        //     })
        let approvedFormPercent = {} ,
            submittedFormPercent = {},
            totalApprovedUlbForm = {},
            totalSubmittedUlbForm = {},
            totalApprovedStateForm = {},
            totalSubmittedStateForm = {},
            totalUASubmittedUlbForm = {},
            submitUAFormPercent = {},
            totalUlbs = {};

        let { totalUlbNonMillionPlusPipeline, totalUlbMpcAndNmpcUAPipeline, sidemenuPipeline, reviewUlbCondition, indicatorFormCondition } = getQueries(states);
        let hasUA =  await UA.aggregate([{
            $group:{
                _id:"$state"
            }}]
            );
        let hasUAS = JSON.parse(JSON.stringify(hasUA));
        if(data.formType !== "mpc_tied"){
            totalUlbs = await State.aggregate(totalUlbNonMillionPlusPipeline);
        }else{
            totalUlbs = await State.aggregate(totalUlbMpcAndNmpcUAPipeline);
        }
        let [sidemenuForms, reviewSidemenuForm, indicatorSidemenuForm] = await Promise.all([
            Sidemenu.aggregate(sidemenuPipeline),
            Sidemenu.findOne(reviewUlbCondition).lean(),
            Sidemenu.findOne(indicatorFormCondition).lean()
        ]);
        let multi = states?.length >= 1 ? true : false
        if(!Boolean(multi)){
            states = [state];
        }
        let indicatorFormValidationCount = 3;
        let cutOff, statesFormData = {};
        let indicatorFormCount = 0;
            for (let i = 0; i < collectionArr.length; i++) {
              let totalForms = totalUlbs.length ? totalUlbs[0]["totalUlb"] : 0;
              let stateResponse = {
                formName: "",
                approvedColor: "",
                submittedColor: "",
                submittedValue: 0,
                approvedValue: 0,
                totalApproved: 0,
                totalSubmitted: 0,
                cutOff: ``,
                icon: "",
                link: "",
                border: "",
                status: "",
              };
              let ulbResponse = {
                formName: "",
                approvedColor: "",
                submittedColor: "",
                totalApproved: 0,
                totalSubmitted: 0,
                submittedValue: 0,
                approvedValue: 0,
                cutOff: ``,
                icon: "",
                link: "",
                border: "",
                status: "",
              };
              let collection = collectionArr[i];
              let formCategory = "";
              let submitPercent = 0;
              cutOff = 0;
              let totalApprovedForm = 0;
              let modelName = collection.collection.collectionName;
              formCategory = getFormCategory(modelName, formCategory);

              //Get pipeline query, using modelName
              let pipeline = getQuery(
                modelName,
                data.formType,
                data.design_year,
                formCategory,
                state
              );
              if (data.design_year === YEAR_CONSTANTS["23_24"]) {
                pipeline = getQuery2324(
                  modelName,
                  data.formType,
                  data.design_year,
                  formCategory,
                  states
                );
              }
              //Pipeline query condition for Grant transfer cetificate
              if (modelName === CollectionNames.gtc) {
                pipeline = gtcSubmitCondition(
                  data.formType,
                  data.installment,
                  state,
                  data.design_year
                );
                if (![YEAR_CONSTANTS["22_23"]].includes(data.design_year)) {
                  pipeline = gtcSubmitCondition2324(
                    data.formType,
                    data.installment,
                    states,
                    data.design_year
                  );
                }
              }
              //Get submitted forms
              //Get Approved forms percent
              if (![YEAR_CONSTANTS["22_23"]].includes(data.design_year)) {
                modelName === CollectionNames.slb
                  ? (collection = TwentyEightSlbsForm)
                  : "";
              }
              let submittedForms = await collection.aggregate(pipeline).allowDiskUse(true);
              if (
                modelName === CollectionNames.gtc &&
                data.installment === "1" &&
                ![YEAR_CONSTANTS["23_24"]].includes(data.design_year)
              ) {
                let query = stateGtcCertificateSubmmitedForms(
                  data.formType,
                  data.installment,
                  state
                );
                let forms = await StateGTCCertificate.aggregate(query);
                if (forms && submittedForms.length === 0 && forms.length > 0) {
                  submittedForms.push(forms[0]);
                }
              }
              let allSubmittedForms = JSON.parse(
                JSON.stringify(submittedForms)
              );
              [
                CollectionNames["twentyEightSlbs"],
                CollectionNames["odf"],
                CollectionNames["gfc"],
              ].includes(modelName) && data.formType === "mpc_tied"
                ? indicatorFormCount++
                : "";
              for (let state of states) {
                let stateResponseArray = [],
                  ulbResponseArray = [];
                hasUA = hasUAS.find((el) => el._id.toString() === state)
                  ? [hasUAS.find((el) => el._id.toString() === state)]
                  : [];
                if (
                  [
                    CollectionNames.actionPlan,
                    CollectionNames.waterRej,
                  ].includes(modelName) &&
                  !hasUA.length
                ) {
                  continue;
                }
                if(![YEAR_CONSTANTS['22_23']].includes(data.design_year)){
                    submittedForms = getSubmittedForms(formCategory, submittedForms, allSubmittedForms, state);
                }
                totalForms = totalUlbs.find((el) => el._id.toString() === state)
                  ? totalUlbs.find((el) => el._id.toString() === state)[
                      "totalUlb"
                    ]
                  : [];
                ({ submitPercent, totalApprovedForm } = calculateFormStatistics(formCategory, submitPercent, submittedForms, totalForms, submittedFormPercent, modelName, totalApprovedForm, data, approvedFormPercent, totalApprovedUlbForm, totalSubmittedUlbForm, totalUASubmittedUlbForm, submitUAFormPercent, totalApprovedStateForm, totalSubmittedStateForm));

                let formData = getFormData(
                  formCategory,
                  modelName,
                  sidemenuForms,
                  reviewSidemenuForm,
                  data.design_year
                );

                cutOff = getCutOff(data, formCategory, modelName, cutOff);
                //Adding status to formData
                if (approvedFormPercent[modelName] >= cutOff) {
                  formData.status = "Eligible for Grant Claim";
                } else if (approvedFormPercent[modelName] < cutOff) {
                  formData.status = "Not yet eligible for Grant Claim";
                }
                ({ ulbResponse, stateResponse } = createFormResponseObjects(formCategory, ulbResponse, formData, modelName, submittedFormPercent, approvedFormPercent, totalApprovedUlbForm, totalSubmittedUlbForm, totalForms, cutOff, ulbResponseArray, stateResponse, totalApprovedStateForm, totalSubmittedStateForm, stateResponseArray));
                // calculateIndicatorFormRes(statesFormData, state, hasUA, data, indicatorFormCount, indicatorFormValidationCount, ulbResponseArray, cutOff, indicatorSidemenuForm, stateResponseArray);
                  statesFormData[state] = {
                    ulbResponse: (
                      statesFormData[state]?.ulbResponse || []
                    ).concat(ulbResponseArray),
                    stateResponse: (
                      statesFormData[state]?.stateResponse || []
                    ).concat(stateResponseArray),
                  };
              }
            }
        
        if(Boolean(multi)){
            return statesFormData;
        }
        let ulbFormsResponse = statesFormData[state]['ulbResponse'];
        let stateFormsResponse = statesFormData[state]['stateResponse'];
        if (data.flagFunction) {
          return {
            data: [
              {
                formHeader: "ULB Forms",
                approvedColor: "#E67E15",
                submittedColor: "#f7bf88",
                formData: ulbFormsResponse,
              },
              {
                formHeader: "State Forms",
                approvedColor: "#059B05",
                submittedColor: "#f7bf88",
                formData: stateFormsResponse,
              },
            ],
          };
        }
        if(![YEAR_CONSTANTS['22_23']].includes(data.design_year)){
            let ulbForms = {
                formHeader: COLORS['ULB']['formName'],
                approvedColor: COLORS['ULB']['approvedColor'],
                submittedColor: COLORS['ULB']['submittedColor'],
                key: COLORS['ULB']['formName'].split(" ").join("").toLowerCase() ,
                formData: ulbFormsResponse,
              };
            let stateForms = {
                key: COLORS['STATE']['formName'].split(" ").join("").toLowerCase() ,
                formHeader: COLORS['STATE']['formName'],
                approvedColor: COLORS['STATE']['approvedColor'],
                submittedColor: COLORS['STATE']['submittedColor'],
                formData: stateFormsResponse,
              }
            //If mpc have no ulbs, show message
            if (data?.formType === INSTALLMENT_TYPE["mpc"] && !hasUA.length){ 
                return getMpcMsg();
            }
            let newResponse = await updateResponseFormat(ulbForms, stateForms)

        return res.status(200).json({
            success: true,
            data:newResponse,
        })
        }
        return res.status(200).json({
            status: true,
            data: [{
                formHeader:'ULB Forms',
                approvedColor:'#E67E15',
                submittedColor:'#f7bf88',
                formData: ulbFormsResponse
            },
            {
                formHeader:'State Forms',
                approvedColor:'#059B05',
                submittedColor:'#f7bf88',
                formData : stateFormsResponse
            }]
        })

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }

    /**
     * The function returns a message indicating that no ULBs meet the eligibility criteria for the MPC
     * Tied Grant.
     */
    function getMpcMsg() {
        const info = {
            message: `No ULBs meet the eligibility criteria for the MPC Tied Grant.`,
            msgVisible: true
        };
        return response.OK(res, info);
    }
}

/**
 * The function calculates the SLB scoring for a state based on the indicator form data and adds it to
 * the state response array if certain conditions are met.
 */
function calculateIndicatorFormRes(statesFormData, state, hasUA, data, indicatorFormCount, indicatorFormValidationCount, ulbResponseArray, cutOff, indicatorSidemenuForm, stateResponseArray) {
    try {
        const slbScoringEntry = statesFormData[state]?.stateResponse.find(el => el.key === CollectionNames.slbScoring);
        if (hasUA.length && data.formType === "mpc_tied" && !slbScoringEntry) {
            if (indicatorFormCount === indicatorFormValidationCount && ![YEAR_CONSTANTS['22_23']].includes(data.design_year)) {
                const indicatorDependentForms = [...statesFormData?.[state]?.ulbResponse, ...ulbResponseArray];
                let { leastSubmitPercent, leastSubmitNumber, leastApprovedNumber, leastApprovedPercent } = addSlbScoringData(indicatorDependentForms);
                let slbScoring = getSlbScoringResponse(
                    leastSubmitPercent,
                    leastSubmitNumber,
                    leastApprovedNumber,
                    leastApprovedPercent,
                    cutOff,
                    indicatorSidemenuForm
                );
                stateResponseArray.push(slbScoring);
            }
        }
    } catch (error) {
        throw {message: `calculateIndicatorFormRes:: ${error.message}`}
    }
}

function addStatusData(modelName, query) {
    if ([CollectionNames.linkPFMS].includes(modelName)) {
        query.push({
            $group: {
                _id: "$ulb.state",
                forms: {
                    $push: {
                        actionTakenByRole: "$actionTakenByRole",
                        isDraft: "$isDraft",
                        status: "$status",
                        currentFormStatus: { $ifNull:["$currentFormStatus",""]}
                    }
                }
            }
        });
    } else {
        query.push({
            $group: {
                _id: "$ulb.state",
                forms: {
                    $push: {
                        actionTakenByRole: "$actionTakenByRole",
                        isDraft: "$isDraft",
                        status: "$status",
                        currentFormStatus: "$currentFormStatus",
                    }
                }
            }
        });
    }
}

/**
 * The function retrieves population data for a specific state and returns it as a response..
 */
async function getPopulationData(req, res) {
    try {
        let state = req.query.state ?? req.decoded.state;
        const pipeline = getPopulationDataQueries(state);
        const data = await State.aggregate(pipeline);
        const populationData =  buildStateInfo(...data);
        const installmentData = [
            {
              title: 'NMPC - UnTied',
              formType: 'nmpc_untied',
              installments: [
                {
                  installment: '1',
                  key: 'nmpc_untied_1',
                  label: '1st Installment',
                  isActive: true
                },
                {
                  installment: '2',
                  key: 'nmpc_untied_2',
                  label: '2nd Installment',
                  isActive: false
                }
              ]
            },
            {
              title: 'NMPC - Tied',
              formType: 'nmpc_tied',
              installments: [
                {
                  installment: '1',
                  key: 'nmpc_tied_1',
                  label: '1st Installment',
                  isActive: true
                },
                {
                  installment: '2',
                  key: 'nmpc_tied_2',
                  label: '2nd Installment',
                  isActive: false
                }
              ]
            },
            {
              title: 'MPC',
              formType: 'mpc_tied',
              installments: [],
            }
        ];
        const cityTypeInState = getCityTypeData(installmentData);

        return response.OK(res, {populationData,cityTypeInState})
    } catch (error) {
        return response.BadRequest(res, [])
    }
}

module.exports.getPopulationData = getPopulationData

/**
 * The function `buildStateInfo` takes an input object and populates the values from the input object
 * into an output object, which includes an array of data items with keys, labels, icons, values,
 * positions, tooltips, and links.
 */
function buildStateInfo(input) {
  try {
    let output = {
      title: "",
      name: "",
      id: "",
      data: [
        {
          key: "totalUlbs",
          label: "Total ULBs",
          icon: "../../../../assets/dashboard-state/16-location.svg",
        },
        {
          key: "TotalofNMPCs",
          label: "Total no. of NMPCs",
          icon: "../../../../assets/dashboard-state/XMLID_1248_.svg",
        },
        {
          key: "TotalofMPCs",
          label: "Total No. of MPCs ",
          icon: "../../../../assets/dashboard-state/sustainable.svg",
        },
        {
          label: "Total ULBs in UAs ",
          key: "TotalULBsUAs",
          icon: "../../../../assets/dashboard-state/16-location.svg",
        },
        {
          key: "totalDulyElectedNMPCs",
          label: "Total Duly Elected NMPCs ",
          icon: "../../../../assets/dashboard-state/XMLID_1248_.svg",
        },
        {
          key: "totalDulyElectedULBsInUA",
          label: "Total Duly Elected ULBs in UAs",
          icon: "../../../../assets/dashboard-state/sustainable.svg",
        },
        {
          key: "totalEligibleULBsOnPTaxGSDP",
          label: "Total Eligible ULBs based on Property Tax GSDP",
          icon: "../../../../assets/dashboard-state/16-location.svg",
        },
      ],
    };

    // Populate the values from the input object into the output.data array
    for (const item of output.data) {
      const inputValue = input?.[item.key];
      item.value = inputValue !== undefined ? inputValue : 0;
    
    }

    // Set dynamic positions based on the number of items
    output.data.forEach((item, index) => {
      item.position = (index + 1).toString();
      item.tooltip = "";
      item.link = "";
    });

    return output;
  } catch (error) {
    throw { message: `buildStateInfo:: ${error.message}` };
  }
}


async function updateResponseFormat(ulbForm, stateForm){
    try {
        const isAvailableForGrant = calculateGrantAvailable(ulbForm, stateForm);
        const formData = {
            ulbForm,
            stateForm
        };
        return {
            formData,
            isAvailableForGrant
        }
    } catch (error) {
        throw { message: `updateResponseFormat:: ${error.message}`}
    }
}

function calculateGrantAvailable(ulbForm, stateForm){
    try { 
        let formList = [...ulbForm['formData'],...stateForm['formData']]
        for(let form of formList){
            if(form?.status !== ELIGIBLITY['YES']){
                return false;
            }
        }
        return true;
    } catch (error) {
        throw { message: `calculateGrantAvailable:: ${error.message}`}
        
    }
}

/**
 * The function `getCityTypeData` returns an object containing an array of city types with their
 * corresponding view modes, form types, and installment availability.
  */
function getCityTypeData(data) {
  try {
    const result = {
      title: "",
      name: "",
      id: "",
      data: [],
    };
    for (let i = 0; i < data.length; i++) {
      const cityType = data[i];
      const cityTypeObj = {
        title: cityType.title,
        isActive: Boolean(cityType.installments.length),
        viewMode: `tab${i + 1}`,
        formType: cityType.formType,
        isInstallmentAvailable: Boolean(cityType.installments.length),
        installments: cityType.installments.slice(), // Create a shallow copy of the installments array
      };
      result.data.push(cityTypeObj);
    }
    
    return result;
  } catch (error) {}
}
/**
 * The function creates response objects based on the form category and stores them in respective
 * arrays.
 * @param formCategory - The category of the form, either "ULB" or "STATE".
 * @param ulbResponse - An object that represents the response for ULB forms. It contains the following
 * properties:
 * @param formData - The `formData` parameter is an object that contains information about a form. It
 * includes properties such as `formName`, `approvedColor`, `submittedColor`, `icon`, `link`, `border`,
 * and `status`.
 * @param modelName - The `modelName` parameter represents the name of the model or form.
 * @param submittedFormPercent - The parameter "submittedFormPercent" is an object that contains the
 * percentage of submitted forms for each model. The keys of the object represent the model names, and
 * the values represent the corresponding percentage of submitted forms.
 * @param approvedFormPercent - The `approvedFormPercent` parameter is an object that contains the
 * percentage of approved forms for each form model. The keys of the object represent the form model
 * names, and the values represent the corresponding percentage of approved forms.
 * @param totalApprovedUlbForm - An object that contains the total number of approved forms for each
 * ULB (Urban Local Body). The keys of the object are the ULB names and the values are the
 * corresponding total approved forms.
 * @param totalSubmittedUlbForm - The parameter `totalSubmittedUlbForm` represents the total number of
 * ULB forms that have been submitted.
 * @param totalForms - The total number of forms available in the system.
 * @param cutOff - The `cutOff` parameter is a value that represents the threshold or limit for a
 * certain condition or criteria. It is used in the `createFormResponseObjects` function to determine
 * if a form response meets the cutoff or not.
 * @param ulbResponseArray - An array that stores the response objects for ULB forms.
 * @param stateResponse - The `stateResponse` parameter is an object that contains information about a
 * form response for the "STATE" category. It includes the following properties:
 * @param totalApprovedStateForm - The parameter "totalApprovedStateForm" is an object that contains
 * the total number of approved forms for each form model in the state category.
 * @param totalSubmittedStateForm - The parameter "totalSubmittedStateForm" represents the total number
 * of forms submitted by the state.
 * @param stateResponseArray - An array that stores the response objects for forms belonging to the
 * state category.
 * @returns an object that contains the `ulbResponse` and `stateResponse` variables.
 */
function createFormResponseObjects(formCategory, ulbResponse, formData, modelName, submittedFormPercent, approvedFormPercent, totalApprovedUlbForm, totalSubmittedUlbForm, totalForms, cutOff, ulbResponseArray, stateResponse, totalApprovedStateForm, totalSubmittedStateForm, stateResponseArray) {
    if (formCategory === "ULB") {
        ulbResponse = {
            formName: formData["formName"],
            key: modelName,
            approvedColor: formData["approvedColor"],
            submittedColor: formData["submittedColor"],
            submittedValue: submittedFormPercent[modelName],
            approvedValue: approvedFormPercent[modelName],
            totalApproved: totalApprovedUlbForm[modelName],
            totalSubmitted: totalSubmittedUlbForm[modelName],
            totalForms,
            cutOff,
            icon: formData["icon"],
            link: formData["link"],
            border: formData.border,
            status: formData.status,
        };
        ulbResponseArray.push(ulbResponse);
    } else if (formCategory === "STATE") {
        stateResponse = {
            formName: formData["formName"],
            key: modelName,
            approvedColor: formData["approvedColor"],
            submittedColor: formData["submittedColor"],
            submittedValue: submittedFormPercent[modelName],
            approvedValue: approvedFormPercent[modelName],
            totalApproved: totalApprovedStateForm[modelName],
            totalSubmitted: totalSubmittedStateForm[modelName],
            cutOff,
            icon: formData["icon"],
            link: formData["link"],
            border: formData.border,
            status: formData.status,
        };
        stateResponseArray.push(stateResponse);
    }
    return { ulbResponse, stateResponse };
}

/**
 * The function calculates form statistics based on the form category, submission percentage, submitted
 * forms, total forms, model name, and other data.
 * @param formCategory - The form category, which can be either "ULB" or "STATE".
 * @param submitPercent - The percentage of submitted forms out of total forms.
 * @param submittedForms - An array of submitted forms.
 * @param totalForms - The total number of forms in the category (either ULB or STATE).
 * @param submittedFormPercent - An object that stores the percentage of submitted forms for each model
 * name.
 * @param modelName - The `modelName` parameter represents the name of the model or form being
 * processed.
 * @param totalApprovedForm - The total number of approved forms for the given form category and model
 * name.
 * @param data - The "data" parameter is an object that contains various properties related to the form
 * data. It is used to retrieve information such as the design year and other relevant data for
 * calculations in the function.
 * @param approvedFormPercent - An object that stores the percentage of approved forms for each model.
 * @param totalApprovedUlbForm - The parameter `totalApprovedUlbForm` represents the total number of
 * approved forms for the ULB category.
 * @param totalSubmittedUlbForm - The parameter `totalSubmittedUlbForm` represents the total number of
 * ULB forms that have been submitted.
 * @param totalUASubmittedUlbForm - The parameter `totalUASubmittedUlbForm` represents the total number
 * of User Acceptance (UA) submitted forms for the ULB category.
 * @param submitUAFormPercent - The parameter `submitUAFormPercent` is used to store the percentage of
 * forms submitted by Urban Local Bodies (ULBs) that have also been submitted to the Urban Affairs
 * department.
 * @param totalApprovedStateForm - The parameter `totalApprovedStateForm` is an object that stores the
 * total number of approved forms for each state form model. The keys of the object represent the model
 * names, and the values represent the total number of approved forms for each model.
 * @param totalSubmittedStateForm - The parameter "totalSubmittedStateForm" represents the total number
 * of forms that have been submitted for the given state category.
 * @returns an object with two properties: "submitPercent" and "totalApprovedForm".
 */
function calculateFormStatistics(formCategory, submitPercent, submittedForms, totalForms, submittedFormPercent, modelName, totalApprovedForm, data, approvedFormPercent, totalApprovedUlbForm, totalSubmittedUlbForm, totalUASubmittedUlbForm, submitUAFormPercent, totalApprovedStateForm, totalSubmittedStateForm) {
    if (formCategory === "ULB") {
        submitPercent = !isNaN(
            Math.round((submittedForms.length / totalForms) * 100)
        )
            ? Math.round((submittedForms.length / totalForms) * 100)
            : 0;
        submittedFormPercent[modelName] = submitPercent;
        totalApprovedForm = approvedForms(
            submittedForms,
            formCategory,
            data.design_year,
            modelName
        );
        approvedFormPercent[modelName] = !isNaN(
            Math.round((totalApprovedForm / totalForms) * 100)
        )
            ? Math.round((totalApprovedForm / totalForms) * 100)
            : 0;
        totalApprovedUlbForm[modelName] = totalApprovedForm;
        totalSubmittedUlbForm[modelName] = submittedForms.length;
        if ([
            CollectionNames.twentyEightSlbs,
            CollectionNames.gfc,
            CollectionNames.odf,
        ].includes(modelName) &&
            ![YEAR_CONSTANTS["22_23"]].includes(data.design_year)) {
            totalUASubmittedUlbForm[modelName] = UASubmittedForms(
                submittedForms,
                formCategory,
                data.design_year,
                modelName
            );
            submitUAFormPercent[modelName] = Math.round(
                (totalUASubmittedUlbForm[modelName] / totalForms) * 100
            );
        }
    } else if (formCategory === "STATE") {
        if (submittedForms.length === 0) {
            submitPercent = 0;
            submittedFormPercent[modelName] = submitPercent;
            totalApprovedForm = approvedForms(
                submittedForms,
                formCategory,
                data.design_year,
                modelName
            );
            approvedFormPercent[modelName] = 0;
            totalApprovedStateForm[modelName] =
                (totalApprovedForm * 100) / 1;
            totalSubmittedStateForm[modelName] = submittedForms.length;
        } else if (submittedForms.length === 1) {
            submitPercent = 100;
            submittedFormPercent[modelName] = submitPercent;
            totalApprovedForm = approvedForms(
                submittedForms,
                formCategory,
                data.design_year,
                modelName
            );
            approvedFormPercent[modelName] =
                (totalApprovedForm * 100) / 1;
            totalApprovedStateForm[modelName] = totalApprovedForm;
            totalSubmittedStateForm[modelName] = submittedForms.length;
        }
    }
    return { submitPercent, totalApprovedForm };
}

/**
 * The function `getSubmittedForms` retrieves submitted forms based on the form category, state, and
 * all submitted forms data.
 * @param formCategory - The form category is a string that specifies the category of the form. It can
 * be either "ULB" or any other category.
 * @param submittedForms - The `submittedForms` parameter is an array that contains the submitted
 * forms.
 * @param allSubmittedForms - An array of objects representing all submitted forms. Each object has
 * properties such as "_id" and "state".
 * @param state - The `state` parameter is a string that represents the state of the form.
 * @returns the value of the variable "submittedForms".
 */
function getSubmittedForms(formCategory, submittedForms, allSubmittedForms, state) {
    if (formCategory === "ULB") {
        submittedForms = allSubmittedForms.find(
            (el) => el._id.toString() === state
        )
            ? allSubmittedForms.find(
                (el) => el._id.toString() === state
            )["forms"]
            : [];
    } else {
        submittedForms = allSubmittedForms.find(
            (el) => el.state.toString() === state
        )
            ? [
                allSubmittedForms.find(
                    (el) => el.state.toString() === state
                ),
            ]
            : [];
    }
    return submittedForms;
}

/**
 * The function `getCutOff` returns the cut-off value based on the given data, form category, model
 * name, and design year.
 * @param data - An object containing information about the data.
 * @param formCategory - The `formCategory` parameter is a string that represents the category of the
 * form. It is used to access the appropriate cutoff values from the `CUTOFF` or `CUTOFF2324` object.
 * @param modelName - The `modelName` parameter is a string that represents the name of a model.
 * @param cutOff - The `cutOff` parameter is a variable that will store the value of the cutoff for a
 * specific form category, form type, and model name.
 * @returns The value of the variable "cutOff" is being returned.
 */
function getCutOff(data, formCategory, modelName, cutOff) {
    if (data.design_year === YEAR_CONSTANTS['23_24']) {
        if (!(CUTOFF2324[formCategory][data.formType][modelName])) {
            cutOff = "NA";
        } else {
            cutOff = CUTOFF2324[formCategory][data.formType][modelName];
        }
    }
    else {
        if (!(CUTOFF[formCategory][data.formType][modelName])) {
            cutOff = "NA";
        } else {
            cutOff = CUTOFF[formCategory][data.formType][modelName];
        }
    }
    return cutOff;
}

/**
 * The function `getFormCategory` determines the form category based on the provided `modelName`.
 * @param modelName - The `modelName` parameter is a string that represents the name of a model.
 * @param formCategory - The `formCategory` parameter is a string that represents the category of a
 * form.
 * @returns The value of the variable `formCategory` is being returned.
 */
function getFormCategory(modelName, formCategory) {
    if (![
        CollectionNames.pTAX,
        CollectionNames.sfc,
        CollectionNames.gtc,
        CollectionNames.actionPlan,
        CollectionNames.waterRej,
    ].includes(modelName)) {
        formCategory = "ULB";
    } else {
        formCategory = "STATE";
    }
    return formCategory;
}

/**
 * The function `getQueries` returns an object containing pipelines and a condition for querying data
 * related to ULBs (Urban Local Bodies) in different states.
 * @param states - An array of states.
 * @returns an object that contains four properties: totalUlbNonMillionPlusPipeline,
 * totalUlbMpcAndNmpcUAPipeline, sidemenuPipeline, and reviewUlbCondition.
 */
function getQueries(states) {
    let totalUlbMpcAndNmpcUAPipeline = [
        
        {
            $lookup: {
                from: "ulbs",
                localField: "_id",
                foreignField: "state",
                as: "ulb",
            },
        },
        { $unwind: "$ulb" },
        {
            $match: {
                "ulb.isActive": true,
                $or: [
                    { "ulb.isMillionPlus": "Yes", "ulb.isUA": "Yes" },
                    {
                        "ulb.isMillionPlus": "No",
                        "ulb.isUA": "Yes",
                    },
                ],
            },
        },

        {
            $group: {
                _id: "$_id",
                totalUlb: { $sum: 1 },
            },
        },
    ];
    let totalUlbNonMillionPlusPipeline = [
        
        {
            $lookup: {
                from: "ulbs",
                localField: "_id",
                foreignField: "state",
                as: "ulb",
            },
        },
        { $unwind: "$ulb" },
        {
            $match: {
                "ulb.isActive": true,
                "ulb.isMillionPlus": "No",
            },
        },
        {
            $group: {
                _id: "$_id",
                totalUlb: { $sum: 1 },
            },
        },
    ];
    let sidemenuPipeline = [
        {
            $match: {
                role: { $in: ["ULB", "STATE"] },
            },
        },
        {
            $group: {
                _id: "$path",
                icon: { $first: "$icon" },
                url: { $first: "$url" },
                name: { $first: "$name" },
            },
        },
    ];
    const reviewUlbCondition = {
        "isActive": true,
        "name": "Review Grant Application"
    };
    const indicatorFormCondition = {
        "folderName" : "indicators_wss",
    }
    return { totalUlbNonMillionPlusPipeline, totalUlbMpcAndNmpcUAPipeline, sidemenuPipeline, reviewUlbCondition, indicatorFormCondition };
}

/**
 * The function returns an object with scoring information based on the least submit percent, least
 * submit number, and cutoff values provided.
 * @param leastSubmitPercent - The percentage of submissions required for eligibility.
 * @param leastSubmitNumber - The `leastSubmitNumber` parameter represents the minimum number of
 * submissions required for a certain condition or criteria.
 * @param cutOff - The `cutOff` parameter is a value that represents the minimum score required for a
 * submission to be considered as approved.
 * @returns an object with the following properties:
 */
function getSlbScoringResponse(leastSubmitPercent, leastSubmitNumber,leastApprovedNumber, leastApprovedPercent, cutOff,indicatorSidemenuForm) {
    return {
        formName: FormNames["indicatorForm"],
        key: ModelNames['slbScoring'],
        approvedColor: COLORS['STATE']['approvedColor'],
        submittedColor: COLORS['STATE']['submittedColor'],
        submittedValue: leastSubmitPercent ?? 0,
        approvedValue: leastApprovedPercent ?? 0,
        totalApproved: leastApprovedNumber ?? 0,
        totalSubmitted: leastSubmitNumber ?? 0,
        cutOff,
        icon: indicatorSidemenuForm['icon'],
        link: `/${indicatorSidemenuForm['url']}`,
        border: COLORS['STATE']['border'] ?? null,
        status: leastSubmitPercent === 100 ? ELIGIBLITY['YES'] : ELIGIBLITY['NO']
    };
}

/**
 * The function `addSlbScoringData` calculates the least submitted percentage and the corresponding
 * number for a given array of ULB responses.
 * @param ulbResponseArray - The `ulbResponseArray` parameter is an array of objects. Each object
 * represents the response data for a specific ULB (Urban Local Body). The objects in the array have
 * the following properties:
 * @returns an object with two properties: leastSubmitPercent and leastSubmitNumber.
 */
function addSlbScoringData(ulbResponseArray){
    try {
        const maxPercent = 100;
        const collectionNamesArr = [CollectionNames['twentyEightSlbs'],CollectionNames['odf'], CollectionNames['gfc']];
        let leastSubmitPercent = maxPercent, leastSubmitNumber,leastApprovedPercent = maxPercent, leastApprovedNumber ;
        for(let ulbResponse of ulbResponseArray ){
            if(collectionNamesArr.includes(ulbResponse.key)){
                if(ulbResponse.submittedValue <= leastSubmitPercent){    
                    leastSubmitPercent = ulbResponse.submittedValue;
                    leastSubmitNumber = ulbResponse.totalSubmitted;
                }
                if(ulbResponse.approvedValue <= leastApprovedPercent){
                    leastApprovedPercent = ulbResponse.approvedValue;
                    leastApprovedNumber = ulbResponse.totalApproved;
                }
            }
        }
        return {leastSubmitPercent, leastSubmitNumber, leastApprovedPercent, leastApprovedNumber};
    } catch (error) {
        throw(`addSlbScoringData:: ${error.message}`)
    }
}
module.exports.dashboard = dashboard