const axios = require('axios');
const GrantsClaimed = require("../../models/GrantsClaimed");
const GrantClaim = require("../../models/GrantClaim");
const ObjectId = require('mongoose').Types.ObjectId;
const {BackendHeaderHost} =  require('../../util/envUrl')

module.exports.get2223 = async (req, res)=>{

    let expectedValues = {
        annualAccounts: 25,
        utilReport: 100,
        slb: 100,
        linkPFMS: 100,
        dur:100,
        odf: 100,
        gfc: 100
    }
    let claimsInformation = {
        npmc_tied: null,
        nmpc_untied: null,
        mpc: null
    }
    const conditions_nmpc_untied_1st = [
      {
        1: `Minimum ${expectedValues.annualAccounts}% Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        2: `${expectedValues.linkPFMS}% Filled, Submitted, and Approved by State`,
      },
      {
        3: `Submission of Previous installment document i.e. 2021-22 Untied 2nd Instalment`,
      },
      { 4: `Submission by State & Approval by MoHUA` },
      { 5: `Submission by State & Approval by MoHUA` },
    ];
    const conditions_nmpc_tied_1st = [
      { 1: `${expectedValues.dur}% Submitted, and Approved by State` },
      {
        2: `Minimum ${expectedValues.annualAccounts}% Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        3: `${expectedValues.linkPFMS}% Filled, Submitted, and Approved by State`,
      },
      {
        4: `Submission of Previous installment document i.e. 2021-22 Tied 2nd Instalment`,
      },
      { 5: `Submission by State & Approval by MoHUA` },
      { 6: `Submission by State & Approval by MoHUA` },
    ]; 
    const conditions_nmpc_untied_2nd = [
      {
        1: `Minimum ${expectedValues.annualAccounts}% Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
      },
      {
        2: `${expectedValues.linkPFMS}% Filled, Submitted, and Approved by State`,
      },
      {
        3: `Submission of Previous installment document i.e. 2022-23 Untied 1st Instalment`,
      },
      { 4: `Submission by State & Approval by MoHUA` },
      { 5: `Submission by State & Approval by MoHUA` },
    ];
     const conditions_nmpc_tied_2nd = [
        { 1: `${expectedValues.dur}% Submitted, and Approved by State` },
        {
          2: `Minimum ${expectedValues.annualAccounts}% Submission of Unstandardized data by ULBs and Approved by State ULB having data in Both Years should be considered in ${expectedValues.annualAccounts}%`,
        },
        {
          3: `${expectedValues.linkPFMS}% Filled, Submitted, and Approved by State`,
        },
        {
          4: `Submission of Previous installment document i.e. 2022-23 Tied 1st Instalment`,
        },
        { 5: `Submission by State & Approval by MoHUA` },
        { 6: `Submission by State & Approval by MoHUA` },
     ] 
    const conditions_mpc_tied_1st = [
      { 1: `${expectedValues.dur}% Submitted, and Approved by State` },
      {
        2: `"Minimum ${expectedValues.annualAccounts}% Submission of Unstandardized data by ULBs and Approved by State
        ULB having data in Both Years should be considered in 25%"`,
      },
      {
        3: `${expectedValues.linkPFMS}% Filled, Submitted, and Approved by State`,
      },
      {
        4: `${expectedValues.odf}% Submitted, and Approved by State`,
      },
      {
        5: `${expectedValues.gfc}% Submitted, and Approved by State`,
      },
      {
        6: `${expectedValues.odf}% Submitted, and Approved by State`,
      },
      {
        7: `Submission of Previous year document i.e. 2021-22`
      },
      {
        8: `Submission by State & Approval by MoHUA`
      },
      {
        9: `Submission by State & Approval by MoHUA`
      },
      {
        10: `Submission by State & Approval by MoHUA`
      },

    ];
    const { financialYear, stateId } = req.query;
    try {
      let dashboardData = await getDashboardData(req, stateId, financialYear);
      let grantClaimedData = await GrantsClaimed.findOne({
        state: ObjectId(stateId),
        financialYear: ObjectId(financialYear),
      }).lean();
      let nmpc_untied_1,
        nmpc_untied_2,
        nmpc_tied_1,
        nmpc_tied_2,
        mpc_tied_1 = {};
      let nmpc_untied_1_GrantData,
        nmpc_untied_2_GrantData,
        nmpc_tied_1_GrantData,
        nmpc_tied_2_GrantData,
        mpc_tied_1_GrantData = {};

      if (grantClaimedData) {
        if (grantClaimedData.hasOwnProperty("nmpc_tied")) {
          if (grantClaimedData["nmpc_tied"][0]["installment"] === "1") {
            nmpc_tied_1_GrantData = grantClaimedData["nmpc_tied"][0];
          } else if (grantClaimedData["nmpc_tied"][1]["installment"] === "2") {
            nmpc_tied_2_GrantData = grantClaimedData["nmpc_tied"][1];
          }
        }
        if (grantClaimedData.hasOwnProperty("nmpc_untied")) {
          if (grantClaimedData["nmpc_untied"][0]["installment"] === "1") {
            nmpc_untied_1_GrantData = grantClaimedData["nmpc_untied"][0];
          } else if (
            grantClaimedData["nmpc_untied"][1]["installment"] === "2"
          ) {
            nmpc_untied_2_GrantData = grantClaimedData["nmpc_untied"][1];
          }
        }
        if (grantClaimedData.hasOwnProperty("mpc")) {
          if (grantClaimedData["mpc"] !== "NA") {
            mpc_tied_1_GrantData = grantClaimedData["mpc"];
          }
        }
      }
      nmpc_untied_1 = {
        conditions: conditions_nmpc_untied_1st,
        nmpc_untied_1_GrantData,
        dashboardData: dashboardData["nmpc_untied"]["1"],
      };
      nmpc_untied_2 = {
        conditions: conditions_nmpc_untied_2nd,
        nmpc_untied_2_GrantData,
        dashboardData: dashboardData["nmpc_untied"]["2"],
      };
      nmpc_tied_1 = {
        conditions: conditions_nmpc_tied_1st,
        nmpc_tied_1_GrantData,
        dashboardData: dashboardData["nmpc_tied"]["1"],
      };
      nmpc_tied_2 = {
        conditions: conditions_nmpc_tied_2nd,
        nmpc_tied_2_GrantData,
        dashboardData: dashboardData["nmpc_tied"]["2"],
      };
      mpc_tied_1 = {
        conditions: conditions_mpc_tied_1st,
        mpc_tied_1_GrantData,
        dashboardData: dashboardData["mpc_tied"]["1"],
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

async function getDashboardData(req,stateId, financialYear) {
    let dashboardData = {};
    const formType = {
       1:[ "nmpc_untied", "nmpc_tied", "mpc_tied"],
       2:["nmpc_untied", "nmpc_tied"]
    };
    let host= "";
    host = req.headers.host
    if(host = "localhost:8080"){
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
