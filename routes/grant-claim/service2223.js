const axios = require('axios');
const ObjectId = require('mongoose').Types.ObjectId;
const GrantTransferMohua = require('../../models/grantTransferMohua');
const {BackendHeaderHost} =  require('../../util/envUrl');
const GrantTypes = require('../../models/GrantType');
const {CollectionNames, ModelNames} = require('../../util/15thFCstatus');
const GrantClaim = require('../../models/GrantClaim');
const moment = require("moment");
const { YEAR_CONSTANTS,  YEAR_CONSTANTS_IDS } = require('../../util/FormNames');
const gtcConstants = {
    mpc_tied : "Million Plus for Water Supply and SWM",
    nmpc_untied: "Non-Million Untied",
    nmpc_tied:"Non-Million Tied"
}
const {ELIGIBLITY, INSTALLMENT_TITLE,ROMAN_NUMERALS, ORDER} = require('./constants')
const {dashboard} = require('../../routes/FormDashboard/service');
const UA = require('../../models/UA');
const LOCALHOST = 'localhost:8080';


module.exports.get2223 = async (req, res)=>{
  try {

  const { financialYear, stateId } = req.query;

  const IdToYear = YEAR_CONSTANTS_IDS[financialYear];
    let expectedValues = {
        annualAccounts: 25,
        utilReport: 100,
        slb: 100,
        linkPFMS: 100,
        dur:100,
        odf: 100,
        gfc: 100,
        twentyEightSlbs: 100
    }
    let expectedValues2324 = {
      [IdToYear]:{
        annualAccounts: 100,
        utilReport: 100,
        slb: 100,
        linkPFMS: 100,
        dur:100,
        odf: 100,
        gfc: 100,
        twentyEightSlbs: 100,
        propertyTaxOp: 100,
        slbScoring: 100,
      }
  }
  let conditionLastYear = financialYear === YEAR_CONSTANTS['22_23'] ? YEAR_CONSTANTS_IDS[YEAR_CONSTANTS['21_22']] : YEAR_CONSTANTS_IDS[YEAR_CONSTANTS['22_23']] ;
  let conditionCurrentYear = financialYear === YEAR_CONSTANTS['22_23'] ? YEAR_CONSTANTS_IDS[YEAR_CONSTANTS['22_23']] : YEAR_CONSTANTS_IDS[YEAR_CONSTANTS['23_24']] 
    const conditions_nmpc_untied_1st = [
      { key: CollectionNames.annualAcc,
        text: `Minimum ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts }% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${financialYear === YEAR_CONSTANTS['22_23'] ? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.linkPFMS : expectedValues2324[IdToYear].linkPFMS}% Linking of PFMS Account forms Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.propTaxOp,
        text: `${expectedValues2324[IdToYear].propertyTaxOp}% Property Tax & UC form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate form submission of Previous installment document i.e. ${conditionLastYear} Untied 2nd Instalment`,
      },
      { key: CollectionNames.pTAX,
        text: `Property Tax Floor Rate form submission by State & Approval by MoHUA` },
      { key: CollectionNames.sfc,
        text: `State Finance Commission Notification form submission by State & Approval by MoHUA` },
    ];
    const conditions_nmpc_tied_1st = [
      { 
        key: CollectionNames.dur,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.dur : expectedValues2324[IdToYear].dur}% Detailed Utilisation Report form submitted, and Approved by State` },
      {
        key: CollectionNames.annualAcc,
        text: `Minimum ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.linkPFMS : expectedValues2324[IdToYear].linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.propTaxOp,
        text: `${expectedValues2324[IdToYear].propertyTaxOp}% Property Tax & UC form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate form submission of Previous installment document i.e. ${conditionLastYear } Tied 2nd Instalment`,
      },
      { 
        key: CollectionNames.pTAX,
        text: `Property Tax Floor Rate form submission by State & Approval by MoHUA` },
      { 
        key: CollectionNames.sfc,
        text: `State Finance Commission Notification form submission by State & Approval by MoHUA` },
    ]; 
    const conditions_nmpc_untied_2nd = [
      {
        key: CollectionNames.annualAcc,
        text: `Minimum ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.linkPFMS : expectedValues2324[IdToYear].linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.propTaxOp,
        text: `${expectedValues2324[IdToYear].propertyTaxOp}% Property Tax & UC form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate form submission of Previous installment document i.e. ${conditionCurrentYear} Untied 1st Instalment`,
      },
      { 
        key: CollectionNames.pTAX,
        text: `Property Tax Floor Rate form submission by State & Approval by MoHUA` 
      },
      { 
        key: CollectionNames.sfc,
        text: `State Finance Commission Notification form submission by State & Approval by MoHUA` 
      },
    ];
     let conditions_nmpc_tied_2nd = [
        { key: CollectionNames.dur,
          text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.dur : expectedValues2324[IdToYear].dur}% Detailed Utilisation Report form Submitted, and Approved by State` },
        {
          key: CollectionNames.annualAcc,
          text: `Minimum ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}%`,
        },
        {
          key: CollectionNames.linkPFMS,
          text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.linkPFMS : expectedValues2324[IdToYear].linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
        },
        {
          key: CollectionNames.propTaxOp,
          text: `${expectedValues2324[IdToYear].propertyTaxOp}% Property Tax & UC form Filled, Submitted, and Approved by State`,
        },
        {
          key: CollectionNames.gtc,
          text: `Grant Transfer Certificate form submission of Previous installment document i.e. ${conditionCurrentYear} Tied 1st Instalment`,
        },
        { 
          key: CollectionNames.pTAX,
          text: `Property Tax Floor Rate form submission by State & Approval by MoHUA` },
        { 
          key: CollectionNames.sfc,
          text: `State Finance Commission Notification form submission by State & Approval by MoHUA` },
     ] 
    let conditions_mpc_tied_1st = [
      { 
        key: CollectionNames.dur,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.dur : expectedValues2324[IdToYear].dur}% Detailed Utilization Report form Submitted, and Approved by State` },
      {
        key: CollectionNames.annualAcc,
        text: `Minimum ${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.annualAccounts : expectedValues2324[IdToYear].annualAccounts}% Annual Account Form Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in 25%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.linkPFMS : expectedValues2324[IdToYear].linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames['twentyEightSlbs'],
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.twentyEightSlbs : expectedValues2324[IdToYear].twentyEightSlbs}% 28 Slbs form  Submitted, and Approved by State`
      },
      {
        key: CollectionNames.odf,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.odf : expectedValues2324[IdToYear].odf}% Open Defecation Free Forms Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gfc,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.gfc : expectedValues2324[IdToYear].gfc}% Garbage Free City Forms Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.slb,
        text: `${financialYear === YEAR_CONSTANTS['22_23']? expectedValues.slb : expectedValues2324[IdToYear].slb}% SLBs for Water Supply and Sanitation form Filled, Submitted, and Approved by State `
      },
      {
        key: CollectionNames.propTaxOp,
        text: `${expectedValues2324[IdToYear].propertyTaxOp}% Details of Property Tax and User Charges form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate Form Submission of Previous year document i.e. ${conditionLastYear}`
      },
      {
        key: CollectionNames.pTAX,
        text: `Property Tax Floor Rate form Submission by State & Approval by MoHUA`
      },
      {
        key: CollectionNames.sfc,
        text: `State Finance Commission Notication form Submission by State & Approval by MoHUA`
      },
      {
        key: CollectionNames.actionPlan,
        text: `Action Plan form Submission by State & Approval by MoHUA`
      },
      {
        key: CollectionNames.slbScoring,
        text: `${expectedValues2324[IdToYear].slbScoring}% Indicators for Water Supply and Sanitation Submission by ULBs part of UA`
      },
      {
        key: CollectionNames.waterRej,
        text: `Projects for Water Supply and Sanitation form Submission by State & Approval by MoHUA`
      }

    ];
    if(![YEAR_CONSTANTS['22_23']].includes(financialYear)){
      conditions_nmpc_tied_2nd = updateConditions(conditions_nmpc_tied_2nd, CollectionNames.dur)
    }
    const hasUA =  await UA.find({
      state : ObjectId(stateId)
    }).lean();
    if(!hasUA.length){
      conditions_mpc_tied_1st = removeLastThreeEntries(conditions_mpc_tied_1st);
    }
      let dashboardData = await getDashboardData(req,res, stateId, financialYear);
      let nmpc_untied_1 ={},
        nmpc_untied_2 ={},
        nmpc_tied_1 = {},
        nmpc_tied_2 = {},
        mpc_tied_1 = {};
      let nmpc_untied_1_GrantData= {},
        nmpc_untied_2_GrantData={},
        nmpc_tied_1_GrantData={},
        nmpc_tied_2_GrantData={},
        mpc_tied_1_GrantData = {};

        let grantClaimObj = {
          submissionDate: "",
          recommendationDate: "",
          releaseDate: "",
          amountReleased: "",
          amountAssigned: "",
          name: "",
          year: "",
          installment: "",
          GrantType: "",
          noOfUlb: "",
          status: "Eligibility Condition Pending",
        };

    const grantTypes = await GrantTypes.find({})
      .select({ _id: 1, name: 1 })
      .lean();
    let grantTypesObj = {};
    for(let i =0 ; i<grantTypes.length; i++){
        grantTypesObj['nmpc_tied'] = grantTypes[i]['name'] === gtcConstants.nmpc_tied ? grantTypes[i] : grantTypesObj['nmpc_tied'] ;
        grantTypesObj['nmpc_untied'] = grantTypes[i]['name'] === gtcConstants.nmpc_untied ? grantTypes[i] : grantTypesObj['nmpc_untied'] ;
        grantTypesObj['mpc_tied'] = grantTypes[i]['name'] === gtcConstants.mpc_tied ? grantTypes[i] : grantTypesObj['mpc_tied'] ;
    }
    const grantClaimedData = await GrantTransferMohua.findOne({
      state: ObjectId(stateId),
      design_year: ObjectId(financialYear),
    }).lean();

    let grantClaimData = await GrantClaim.findOne({
      financialYear: ObjectId(financialYear),
      state: ObjectId(stateId),
    }).lean();
    let submitCondition = {
      mpc_tied: {},
      nmpc_tied: {},
      nmpc_untied: {}
    };
    if (grantClaimData) {
      let grantTypes = {
        mpc: "mpc",
        nmpc_tied: "nmpc_tied",
        nmpc_untied: "nmpc_untied",
      };
      for (let key in grantClaimData) {
        if (grantTypes[key]) {
          for (let i = 0; i < grantClaimData[key].length; i++) {
            let grant = grantClaimData[key][i];
            if (key === "mpc") {
              if (grant.installment === "1") {
                submitCondition["mpc_tied"]["1"] = grant;
              }
            } else if (key === "nmpc_tied") {
              if (grant.installment === "1") {
                submitCondition["nmpc_tied"]["1"] = grant;
              } else if (grant.installment === "2") {
                submitCondition["nmpc_tied"]["2"] = grant;
              }
            } else if (key === "nmpc_untied") {
              if (grant.installment === "1") {
                submitCondition["nmpc_untied"]["1"] = grant;
              } else if (grant.installment === "2") {
                submitCondition["nmpc_untied"]["2"] = grant;
              }
            }
          }
        }
      }
    }

    let conditionSuccess = {
      nmpc_untied_1_success: submitCondition["nmpc_untied"]["1"]?.dates?.submittedOn
        ? false
        : calculateSuccess(
          dashboardData["nmpc_untied"]["1"],
          submitCondition["nmpc_untied"]["1"]
        ),
      nmpc_untied_2_success: submitCondition["nmpc_untied"]["2"]?.dates?.submittedOn
      ? false
      :calculateSuccess(
        dashboardData["nmpc_untied"]["2"],
        submitCondition["nmpc_untied"]["2"]
      ),
      nmpc_tied_1_success: submitCondition["nmpc_tied"]["1"]?.dates?.submittedOn
      ? false
      :calculateSuccess(
        dashboardData["nmpc_tied"]["1"],
        submitCondition["nmpc_tied"]["1"]
      ),
      nmpc_tied_2_success: submitCondition["nmpc_tied"]["1"]?.dates?.submittedOn
      ? false
      :calculateSuccess(
        dashboardData["nmpc_tied"]["2"],
        submitCondition["nmpc_tied"]["2"]
      ),
      mpc_tied_1_success:  submitCondition["mpc_tied"]["1"]?.dates?.submittedOn
      ? false
      : calculateSuccess(
        dashboardData["mpc_tied"]["1"],
        submitCondition["mpc_tied"]["1"]
      )
    };
    if(!grantClaimedData){
      nmpc_untied_1 = {
        conditions: conditions_nmpc_untied_1st,
        nmpc_untied_1_GrantData: grantClaimObj,
        dashboardData: dashboardData["nmpc_untied"]["1"],
        conditionSuccess: conditionSuccess['nmpc_untied_1_success']
      };
      nmpc_untied_2 = {
        conditions: conditions_nmpc_untied_2nd,
        nmpc_untied_2_GrantData: grantClaimObj,
        dashboardData: dashboardData["nmpc_untied"]["2"],
        conditionSuccess: conditionSuccess['nmpc_untied_2_success']
      };
      nmpc_tied_1 = {
        conditions: conditions_nmpc_tied_1st,
        nmpc_tied_1_GrantData: grantClaimObj,
        dashboardData: dashboardData["nmpc_tied"]["1"],
        conditionSuccess: conditionSuccess['nmpc_tied_1_success']
      };
      nmpc_tied_2 = {
        conditions: conditions_nmpc_tied_2nd,
        nmpc_tied_2_GrantData: grantClaimObj,
        dashboardData: dashboardData["nmpc_tied"]["2"],
        conditionSuccess: conditionSuccess['nmpc_tied_2_success']
      };
      mpc_tied_1 = {
        conditions: conditions_mpc_tied_1st,
        mpc_tied_1_GrantData: grantClaimObj,
        dashboardData: dashboardData["mpc_tied"]["1"],
        conditionSuccess: conditionSuccess['mpc_tied_1_success']
      };

      let submitClaim = {
        nmpc_untied_1,
        nmpc_untied_2,
        nmpc_tied_1,
        nmpc_tied_2,
        mpc_tied_1,
      };
      if((![YEAR_CONSTANTS['22_23']].includes(financialYear))){
        // update2324Conditions(submitClaim);
        submitClaim =  generateOutputObject(submitClaim)
        return res.status(200).json({
          data: submitClaim,
        });
      }
      return res.status(200).json({
        data: submitClaim,
      });
    }

    for (let i = 0; i < grantClaimedData.stateData.length; i++) {
      let grantClaim = grantClaimedData.stateData[i];

      if (grantClaim['GrantType'].toString() === grantTypesObj['nmpc_untied']['_id'].toString()) {
        if (grantClaim["installment"] === 1) {
          nmpc_untied_1_GrantData = grantClaim;
          nmpc_untied_1_GrantData.status = getGrantStatus(
            grantClaim,
            conditionSuccess.nmpc_untied_1_success,
            submitCondition["nmpc_untied"]["1"]
          );
          
        } else if (grantClaim["installment"] === 2) {
          nmpc_untied_2_GrantData = grantClaim;
          nmpc_untied_2_GrantData.status = getGrantStatus(
            grantClaim,
            conditionSuccess.nmpc_untied_2_success,
            submitCondition["nmpc_untied"]["2"]
          );

        }
      }
      if (
        grantClaim["GrantType"].toString() ===
        grantTypesObj["nmpc_tied"]["_id"].toString()
      ) {
        if (grantClaim["installment"] === 1) {
          nmpc_tied_1_GrantData = grantClaim;
          nmpc_tied_1_GrantData.status = getGrantStatus(
            grantClaim,
            conditionSuccess.nmpc_tied_1_success,
            submitCondition["nmpc_tied"]["1"]
          );
        } else if (grantClaim["installment"] === 2) {
          nmpc_tied_2_GrantData = grantClaim;
          nmpc_tied_2_GrantData.status = getGrantStatus(
            grantClaim,
            submitCondition.nmpc_tied_2_success,
            submitCondition["nmpc_tied"]["2"]
          );
        }
      }
      if (
        grantClaim["GrantType"].toString() ===
        grantTypesObj["mpc_tied"]["_id"].toString()
      ) {
        if (grantClaim["installment"] === 1) {
          mpc_tied_1_GrantData = grantClaim;
          mpc_tied_1_GrantData.status = getGrantStatus(
            grantClaim,
            conditionSuccess.mpc_tied_1_success,
            submitCondition["mpc_tied"]["1"]
          );
        }
      }
    }
    
    
      nmpc_untied_1 = {
        conditions: conditions_nmpc_untied_1st,
        nmpc_untied_1_GrantData,
        dashboardData: dashboardData["nmpc_untied"]["1"],
        conditionSuccess: conditionSuccess['nmpc_untied_1_success']
      };
      nmpc_untied_2 = {
        conditions: conditions_nmpc_untied_2nd,
        nmpc_untied_2_GrantData,
        dashboardData: dashboardData["nmpc_untied"]["2"],
        conditionSuccess: conditionSuccess['nmpc_untied_2_success']
      };
      nmpc_tied_1 = {
        conditions: conditions_nmpc_tied_1st,
        nmpc_tied_1_GrantData,
        dashboardData: dashboardData["nmpc_tied"]["1"],
        conditionSuccess: conditionSuccess['nmpc_tied_1_success']
      };
      nmpc_tied_2 = {
        conditions: conditions_nmpc_tied_2nd,
        nmpc_tied_2_GrantData,
        dashboardData: dashboardData["nmpc_tied"]["2"],
        conditionSuccess: conditionSuccess['nmpc_tied_2_success']
      };
      mpc_tied_1 = {
        conditions: conditions_mpc_tied_1st,
        mpc_tied_1_GrantData,
        dashboardData: dashboardData["mpc_tied"]["1"],
        conditionSuccess: conditionSuccess['mpc_tied_1_success']
      };

      let submitClaim = {
        nmpc_untied_1,
        nmpc_untied_2,
        nmpc_tied_1,
        nmpc_tied_2,
        mpc_tied_1,
      };
      // let grantClaimData = await GrantClaim.findOne({
      //   state: ObjectId(stateId),
      //   financialYear: ObjectId(financialYear)
      // }).lean();
      if(![YEAR_CONSTANTS['22_23']].includes(financialYear)){
        // update2324Conditions(submitClaim);
        submitClaim =  generateOutputObject(submitClaim)
        return res.status(200).json({
          data: submitClaim,
        });
      }
      return res.status(200).json({
        data: submitClaim,
      });
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
      
    
    
}

function update2324Conditions(submitClaim) {
  for (let claims in submitClaim) {
    submitClaim[claims]['conditions'] = submitClaim[claims]['conditions'].filter(el => {
      return el.key !== CollectionNames.pTAX; 
    });
  }
  
}

function updateConditions(condition, collectionName){
  try {
    return condition.filter(el=>{
      return collectionName !== el.key
    })
  } catch (error) {
    throw({message: `updateConditions:: ${error.message}`})
  }
}

function generateOutputObject(input) {
  try {
  let output = {
    formId: '',
    formName: 'Final submission of claims for 15th FC Grants (FY 2023-24)',
    previousYrMsg: '',
    grantsType: ['nmpc_tied', 'nmpc_untied', 'mpc_tied'],
    data: {}
  };
  let order = 0
  for (const key in input) {
    order++;
    const grantData = input[key];
    const grantType = key.replace(/_[0-9]/g, '');
    const installment = key[key.length-1] ?  Number(key[key.length-1]) : 1 ;
    if (!output.data[grantType]) {
      output.data[grantType] = {
        title: `${ORDER[grantType]}. ${INSTALLMENT_TITLE[grantType]}`,
        yearData: [],
        isClose: true,
        id: (output.grantsType.findIndex(el=>el === grantType) +1)
      };
    }
   
    const yearData = {
      key: '',
      title: `${ROMAN_NUMERALS[key]} Installment (FY 2023-24):`,
      installment,
      year: '',
      type: '',
      position: 1,
      conditionSuccess: input[key]['conditionSuccess'],
      buttonName: 'Claim Grant - ',
      amount: input[key][`${key}_GrantData`]['amountAssigned'],
      info: '',
      isShow: true,
      status: input[key]['conditionSuccess'] ? ELIGIBLITY['YES'] : ELIGIBLITY['NO'],
      conditions: []
    };

    for (const condition of grantData.conditions) {
      const dashboardData = input[key]['dashboardData'];
      let percent;
      //  dashboardData.forEach(el=>{
        for(el of dashboardData){
         percent = findConditionKey(percent, el, condition);
        if(percent){
           break;
        }
      }
      
      yearData.conditions.push({
        key: condition.key,
        text: condition.text,
        value: condition.key !== ModelNames['slbScoring'] ? percent?.approvedValue : percent?.submittedValue
      });
    }

    output.data[grantType].yearData.push(yearData);
  }
  output['data'] = sortInputById(output['data']);  
  return output;
  } catch (error) {
      throw({message: `${error.message}`})
  }
}
function sortInputById(input) {
  const sortedEntries = Object.fromEntries(Object.entries(input).sort(([, a], [, b]) => a.id - b.id) );
  return sortedEntries;
}

function findConditionKey(percent, el, condition) {
  percent = el.formData.find(entity => {
    return entity.key === condition.key;
  });
  return percent;
}

function removeLastThreeEntries(arr) {
 return arr.slice(0, arr.length - 3);
}

function calculateSuccess(dashboardData, submitCondition){
    for(let forms of dashboardData){
      for(let form of forms['formData']){
        if(form['approvedValue']< form['cutOff']){
          return false;
        }
      }
    }
    return true;
}

async function getDashboardData(req,res,stateId, financialYear) {
  try {
    let dashboardData = {};
    const formType = {
       1:[ "nmpc_untied", "nmpc_tied", "mpc_tied"],
       2:["nmpc_untied", "nmpc_tied"]
    };
    let host= "";
    host = req.headers.host
    if(host === LOCALHOST){
        host = BackendHeaderHost.Demo
    }
    for(let key in formType){
      for (let j = 0; j < formType[key].length; j++) {
        let dataResponse = [];
        // if(![YEAR_CONSTANTS['21_22'], YEAR_CONSTANTS['22_23']].includes(financialYear)){
          Object.assign(req.query, {
            formType: formType[key][j],
            design_year: financialYear,
            stateId: stateId,
            installment: key,
            flagFunction: true
          });
          dataResponse = await dashboard(req,res);
        // }else{
        //   let { data } = await axios.get(
        //     `https://${host}/api/v1/dashboard?formType=${formType[key][j]}&design_year=${financialYear}&stateId=${stateId}&installment=${key}`,
        //     {
        //       params: {},
        //       headers: { "x-access-token": req.headers["x-access-token"] },
        //     }
        //   );
        //   dataResponse = data
        // }
        if (!dataResponse) throw new Error("Failed to fetch dashboard data!");
        if (!dashboardData[formType[key][j]]) {
          dashboardData[formType[key][j]] = {
            [key]: dataResponse.data,
          };
        } else {
          //2nd installment data
          dashboardData[formType[key][j]]["2"] = dataResponse.data;
        }
      }
    } 

    for(let key in dashboardData){
        let category = dashboardData[key];
        for(let inst in category){
            let installment = category[inst];
            for(let i =0; i<installment.length; i++){
                delete installment[i]["approvedColor"];
                delete installment[i]["submittedColor"];

                let formData = installment[i]["formData"];
                for(let j =0; j< formData.length; j++){
                    delete formData[j]["submittedColor"];
                    delete formData[j]["approvedColor"];
                    delete formData[j]["icon"];
                    delete formData[j]["link"];
                    delete formData[j]["border"];
                }
            }
        }
    }
    return dashboardData;
  } catch (error) {
    throw(`getDashboardData:: ${error.message}`)
  }
}

function getGrantStatus(grantClaim, successCondition, submitCondition){
  let status = "";
  if (successCondition && !submitCondition?.dates?.submittedOn ) {
    status = `Submit Claim for Grant.`;
  } 
  else if(!successCondition && submitCondition?.dates?.submittedOn){
    if (
      !grantClaim.recommendationDate &&
      !grantClaim.releaseDate
    ) {
      status = `Claim for Grant Submitted and Under Process by MoHUA. Date - ${moment(submitCondition?.dates?.submittedOn).format("L")}`;
    } else if (
      grantClaim.recommendationDate &&
      !grantClaim.releaseDate
    ) {
      status = `Claim Recommended to Ministry of Finance.`;
    } else if (
      grantClaim.recommendationDate &&
      grantClaim.releaseDate
    ) {
      if(grantClaim.amountReleased){
        status = `Claim released to State by Ministry of Finance. ${grantClaim.amountReleased}`;
      }else{
        status = `Claim released to State by Ministry of Finance.`;
        
      }
    }
  }
  else if(!successCondition && !submitCondition?.dates?.submittedOn)
  {
    status = `Eligibility Condition Pending.`
  }
  return status;
}
