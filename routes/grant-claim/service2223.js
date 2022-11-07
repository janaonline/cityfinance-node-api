const axios = require('axios');
const ObjectId = require('mongoose').Types.ObjectId;
const GrantTransferMohua = require('../../models/grantTransferMohua');
const {BackendHeaderHost} =  require('../../util/envUrl');
const GrantTypes = require('../../models/GrantType');
const {CollectionNames} = require('../../util/15thFCstatus');
const GrantClaim = require('../../models/GrantClaim');
const moment = require("moment");
const gtcConstants = {
    mpc_tied : "Million Plus for Water Supply and SWM",
    nmpc_untied: "Non-Million Untied",
    nmpc_tied:"Non-Million Tied"
}

const LOCALHOST = 'localhost:8080';


module.exports.get2223 = async (req, res)=>{

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
    let claimsInformation = {
        npmc_tied: null,
        nmpc_untied: null,
        mpc: null
    }
    const conditions_nmpc_untied_1st = [
      { key: CollectionNames.annualAcc,
        text: `Minimum ${expectedValues.annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${expectedValues.linkPFMS}% Linking of PFMS Account forms Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: ` Grant Transfer Certificate form submission of Previous installment document i.e. 2021-22 Untied 2nd Instalment`,
      },
      { key: CollectionNames.pTAX,
        text: ` Property Tax Floor Rate form submission by State & Approval by MoHUA` },
      { key: CollectionNames.sfc,
        text: `State Finance Commission Notification form submission by State & Approval by MoHUA` },
    ];
    const conditions_nmpc_tied_1st = [
      { 
        key: CollectionNames.dur,
        text: `${expectedValues.dur}% Detailed Utilisation Report form submitted, and Approved by State` },
      {
        key: CollectionNames.annualAcc,
        text: `Minimum ${expectedValues.annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${expectedValues.linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: ` Grant Transfer Certificate form submission of Previous installment document i.e. 2021-22 Tied 2nd Instalment`,
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
        text: `Minimum ${expectedValues.annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${expectedValues.linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate form submission of Previous installment document i.e. 2022-23 Untied 1st Instalment`,
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
     const conditions_nmpc_tied_2nd = [
        { key: CollectionNames.dur,
          text: `${expectedValues.dur}% Detailed Utilisation Report form Submitted, and Approved by State` },
        {
          key: CollectionNames.annualAcc,
          text: `Minimum ${expectedValues.annualAccounts}% Annual Account form submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
        },
        {
          key: CollectionNames.linkPFMS,
          text: `${expectedValues.linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
        },
        {
          key: CollectionNames.gtc,
          text: `Grant Transfer Certificate form submission of Previous installment document i.e. 2022-23 Tied 1st Instalment`,
        },
        { 
          key: CollectionNames.pTAX,
          text: `Property Tax Floor Rate form submission by State & Approval by MoHUA` },
        { 
          key: CollectionNames.sfc,
          text: `State Finance Commission Notification form submission by State & Approval by MoHUA` },
     ] 
    const conditions_mpc_tied_1st = [
      { 
        key: CollectionNames.dur,
        text: `${expectedValues.dur}% Detailed Utilization Report form Submitted, and Approved by State` },
      {
        key: CollectionNames.annualAcc,
        text: `Minimum ${expectedValues.annualAccounts}% Annual Account Form Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in 25%`,
      },
      {
        key: CollectionNames.linkPFMS,
        text: `${expectedValues.linkPFMS}% Linking of PFMS Account form Filled, Submitted, and Approved by State`,
      },
      {
        key: CollectionNames['twentyEightSlbs'],
        text: `${expectedValues.twentyEightSlbs}% 28 Slbs form  Submitted, and Approved by State`
      },
      {
        key: CollectionNames.odf,
        text: `${expectedValues.odf}% Open Defecation Free Forms Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.gfc,
        text: `${expectedValues.gfc}% Garbage Free City Forms Submitted, and Approved by State`,
      },
      {
        key: CollectionNames.slb,
        text: `${expectedValues.slb}% SLBs for Water Supply and Sanitation form Filled, Submitted, and Approved by State `
      },
      {
        key: CollectionNames.gtc,
        text: `Grant Transfer Certificate Form Submission of Previous year document i.e. 2021-22`
      },
      {
        key: CollectionNames.pTAX,
        text: ` Property Tax Floor Rate form Submission by State & Approval by MoHUA`
      },
      {
        key: CollectionNames.sfc,
        text: `State Finance Commission Notication form Submission by State & Approval by MoHUA`
      }

    ];
    const { financialYear, stateId } = req.query;
    try {
      let dashboardData = await getDashboardData(req, stateId, financialYear);
    //   let grantClaimedData = await GrantsClaimed.findOne({
    //     state: ObjectId(stateId),
    //     financialYear: ObjectId(financialYear),
    //   }).lean();
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

    //   if (grantClaimedData) {
    //     if (grantClaimedData.hasOwnProperty("nmpc_tied")) {
    //       if (grantClaimedData["nmpc_tied"][0]["installment"] === "1") {
    //         nmpc_tied_1_GrantData = grantClaimedData["nmpc_tied"][0];
    //       } else if (grantClaimedData["nmpc_tied"][1]["installment"] === "2") {
    //         nmpc_tied_2_GrantData = grantClaimedData["nmpc_tied"][1];
    //       }
    //     }
    //     if (grantClaimedData.hasOwnProperty("nmpc_untied")) {
    //       if (grantClaimedData["nmpc_untied"][0]["installment"] === "1") {
    //         nmpc_untied_1_GrantData = grantClaimedData["nmpc_untied"][0];
    //       } else if (
    //         grantClaimedData["nmpc_untied"][1]["installment"] === "2"
    //       ) {
    //         nmpc_untied_2_GrantData = grantClaimedData["nmpc_untied"][1];
    //       }
    //     }
    //     if (grantClaimedData.hasOwnProperty("mpc")) {
    //       if (grantClaimedData["mpc"] !== "NA") {
    //         mpc_tied_1_GrantData = grantClaimedData["mpc"];
    //       }
    //     }
    //   }
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

async function getDashboardData(req,stateId, financialYear) {
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
        let { data } = await axios.get(
          `https://${host}/api/v1/dashboard?formType=${formType[key][j]}&design_year=${financialYear}&stateId=${stateId}&installment=${key}`,
          {
            params: {},
            headers: { "x-access-token": req.headers["x-access-token"] },
          }
        );
        if (!data) throw new Error("Failed to fetch dashboard data!");
        if (!dashboardData[formType[key][j]]) {
          dashboardData[formType[key][j]] = {
            [key]: data.data,
          };
        } else {
          //2nd installment data
          dashboardData[formType[key][j]]["2"] = data.data;
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
