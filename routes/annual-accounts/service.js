const AnnualAccountData = require("../../models/AnnualAccounts");
const ActionPlan = require('../../models/ActionPlans')
const WaterRejuvenation = require('../../models/WaterRejenuvation&Recycling')
const DUR = require('../../models/UtilizationReport')
const SLB = require('../../models/XVFcGrantForm')
const Ulb = require("../../models/Ulb");
const User = require('../../models/User')
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const catchAsync = require('../../util/catchAsync')
const Year = require('../../models/Year')
const moment = require("moment");
const util = require('util')
const UlbFinancialData = require('../../models/UlbFinancialData')
const DataCollection = require('../../models/DataCollectionForm')
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const GTC = require('../../models/StateGTCertificate')
const findPreviousYear = require('../../util/findPreviousYear')
const {calculateStatus} =require('../CommonActionAPI/service')
const STATUS_LIST = require('../../util/newStatusList')
const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};
exports.createUpdate = async (req, res) => {
  try {
    let { design_year, isDraft } = req.body;
    req.body.actionTakenBy = req?.decoded._id;
    req.body.actionTakenByRole = req?.decoded.role;
    req.body.ulb = req?.decoded.ulb;
    const ulb = req?.decoded.ulb;
    req.body.modifiedAt = new Date();

    let currentAnnualAccounts;
    if (req.body?.status == "REJECTED") {
      if (req.body.unAudited.submit_annual_accounts) {
        let proData = req.body.unAudited.provisional_data;
        for (const key in proData) {
          if (key == "auditor_report") continue;
          if (proData[key]?.status == "REJECTED") {
            proData[key].status = "PENDING";
            proData[key].rejectReason = null;
          }
        }
      }
      if (req.body.audited.submit_annual_accounts) {
        let proData = req.body.audited.provisional_data;
        for (const key in proData) {
          if (proData[key]?.status == "REJECTED") {
            proData[key].status = "PENDING";
            proData[key].rejectReason = null;
          }
        }
      }
      req.body.status = "PENDING";
      currentAnnualAccounts = await AnnualAccountData.findOne({
        ulb: ObjectId(ulb),
        design_year: ObjectId(design_year),
        isActive: true,
      }).select({
        history: 0,
      });
    }

    let annualAccountData;
    if (
      !req.body.unAudited.submit_annual_accounts &&
      !req.body.audited.submit_annual_accounts
    ) {
      req.body.status = "N/A";
    }
    if (currentAnnualAccounts) {
      annualAccountData = await AnnualAccountData.findOneAndUpdate(
        { ulb: ObjectId(ulb), isActive: true },
        { $set: req.body, $push: { history: currentAnnualAccounts } }
      );
    } else {
      annualAccountData = await AnnualAccountData.findOneAndUpdate(
        { ulb: ObjectId(ulb), design_year: ObjectId(design_year) },
        req.body,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    // await UpdateMasterSubmitForm(req, "annualAccounts");

    return res.status(200).json({
      msg: "AnnualAccountData Submitted!",
      isCompleted: !annualAccountData.isDraft,
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};


exports.dataset = catchAsync (async (req,res)=>{
  let {
    year,
    state,
    ulb,
    type,
    category,
    nature,
    getQuery,
    globalName,
    getCount,
  } = req.query;
  console.log(category, type);
  if (!category || !year || !type) {
    return res.status(400).json({
      success: false,
      message: "Missing Categoryor Year or Type",
    });
  }
  let finalData = [];
  if (type == "Raw Data PDF") {
    type = "pdf";
  } else if (type == "Raw Data Excel") {
    type = "excel";
  } else if (type == "Standardised Excel" || type == "Standardised PDF") {
    if (type == "Standardised Excel") {
      type = "excel";
    } else if (type == "Standardised PDF") {
      type = "pdf";
    }
    let query = [
      {
        $match: {
          financialYear: year,
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
    ];
    if (ulb && ulb != "undefined") {
      query.push({
        $match: {
          "ulb.name": ulb,
        },
      });
    } else if (state && ObjectId.isValid(state)) {
      query.push({
        $match: {
          "state._id": ObjectId(state),
        },
      });
    }
    let query_extn = [
      {
        $project: {
          ulbId: "$ulb._id",
          ulbName: "$ulb.name",
          state: "$state.name",
          modifiedAt: "$modifiedAt",
          balance_pdf: "$overallReport.pdfUrl",
          balance_excel: "$overallReport.excelUrl",
          income_pdf: "$overallReport.pdfUrl",
          income_excel: "$overallReport.excelUrl",
        },
      },
      {
        $project: {
          ulbId: 1,
          ulbName: 1,
          state: 1,
          modifiedAt: 1,
          file: `$${category}_${type}`,
        },
      },
      {
        $match: {
          file: { $exists: true, $ne: null },
        },
      },
      {
        $sort: {
          modifiedAt: -1,
        },
      },
    ];
    query.push(...query_extn);
    if (getQuery) return res.status(200).json(query);
    let fileData = await UlbFinancialData.aggregate(query);
    fileData.forEach((el) => {
      let data = {
        ulbId: null,
        ulbName: "",
        state: "",
        fileName: "",
        fileUrl: "",
        modifiedAt: "",
        type: type,
        audited: "",
        year: "",
      };
      data.ulbId = el?.ulbId;
      data.state = el?.state;
      data.ulbName = el?.ulbName;
      data.modifiedAt = el?.modifiedAt;
      data.year = year;
      data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}`;
      data.fileUrl = el?.file;

      finalData.push(data);
    });
    return res.status(200).json({
      success: true,
      data: finalData,
    });
  }

  if (year != "2019-20" && year != "2020-21") {
    let query_dataCollection = [
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
    ];
    let query_extn = [
      {
        $project: {
          ulbId: "$ulb._id",
          state: "$state.name",
          ulbName: "$ulb.name",
          modifiedAt: "$modifiedAt",
          "2015-16_income_pdf": "$documents.financial_year_2015_16.pdf",
          "2015-16_income_excel": "$documents.financial_year_2015_16.excel",
          "2015-16_balance_pdf": "$documents.financial_year_2015_16.pdf",
          "2015-16_balance_excel": "$documents.financial_year_2015_16.excel",
          "2016-17_income_pdf": "$documents.financial_year_2016_17.pdf",
          "2016-17_income_excel": "$documents.financial_year_2016_17.excel",
          "2016-17_balance_pdf": "$documents.financial_year_2016_17.pdf",
          "2016-17_balance_excel": "$documents.financial_year_2016_17.excel",
          "2017-18_income_pdf": "$documents.financial_year_2017_18.pdf",
          "2017-18_income_excel": "$documents.financial_year_2017_18.excel",
          "2017-18_balance_pdf": "$documents.financial_year_2017_18.pdf",
          "2017-18_balance_excel": "$documents.financial_year_2017_18.excel",
          "2018-19_income_pdf": "$documents.financial_year_2018_19.pdf",
          "2018-19_income_excel": "$documents.financial_year_2018_19.excel",
          "2018-19_balance_pdf": "$documents.financial_year_2018_19.pdf",
          "2018-19_balance_excel": "$documents.financial_year_2018_19.excel",
        },
      },

      {
        $project: {
          ulbId: 1,
          ulbName: 1,
          state: 1,
          modifiedAt: 1,
          file: { $arrayElemAt: [`$${year}_${category}_${type}`, 0] },
        },
      },
      {
        $match: {
          "file.url": { $exists: true, $ne: null },
        },
      },
      {
        $sort: {
          modifiedAt: -1,
        },
      },
    ];

    if (ulb && ulb != "undefined") {
      query_dataCollection.push({
        $match: {
          "ulb.name": ulb,
        },
      });
    } else if (state && ObjectId.isValid(state)) {
      query_dataCollection.push({
        $match: {
          "state._id": ObjectId(state),
        },
      });
    }
    query_dataCollection.push(...query_extn);
    if (getQuery) return res.status(200).json(query_dataCollection);
    let fileData = await DataCollection.aggregate(query_dataCollection);

    fileData.forEach((el) => {
      let data = {
        ulbId: null,
        ulbName: "",
        state: "",
        fileName: "",
        fileUrl: "",
        modifiedAt: "",
        type: type,
        audited: "",
        year: "",
      };
      data.ulbId = el?.ulbId;
      data.state = el?.state;
      data.ulbName = el?.ulbName;
      data.modifiedAt = el?.modifiedAt;
      data.year = year;
      data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}`;
      data.fileUrl = el?.file?.url;

      finalData.push(data);
    });
  } else {
    let query = [
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
    ];
    if (ulb && ulb != "undefined") {
      query.push({
        $match: {
          "ulb.name": ulb,
        },
      });
    } else if (state && ObjectId.isValid(state)) {
      query.push({
        $match: {
          "state._id": ObjectId(state),
        },
      });
    }
    if (year == "2019-20") {
      let query_extn = [
        {
          $project: {
            ulbId: "$ulb._id",
            ulbName: "$ulb.name",
            state: "$state.name",
            modifiedAt: "$modifiedAt",
            "2019-20_balance_pdf":
              "$audited.provisional_data.bal_sheet.pdf.url",
            "2019-20_balance_excel":
              "$audited.provisional_data.bal_sheet.excel.url",
            "2019-20_income_pdf": "$audited.provisional_data.inc_exp.pdf.url",
            "2019-20_income_excel":
              "$audited.provisional_data.inc_exp.excel.url",
          },
        },
        {
          $project: {
            ulbId: 1,
            ulbName: 1,
            state: 1,
            modifiedAt: 1,
            file: `$${year}_${category}_${type}`,
          },
        },
        {
          $match: {
            file: { $exists: true, $ne: null },
          },
        },
        {
          $sort: {
            modifiedAt: -1,
          },
        },
      ];
      query.push(...query_extn);
      if (getQuery) return res.status(200).json(query);
      let fileData = await AnnualAccountData.aggregate(query);

      fileData.forEach((el) => {
        let data = {
          ulbId: null,
          ulbName: "",
          state: "",
          fileName: "",
          fileUrl: "",
          modifiedAt: "",
          type: type,
          audited: "",
          year: "",
        };
        data.ulbId = el?.ulbId;
        data.state = el?.state;
        data.ulbName = el?.ulbName;
        data.modifiedAt = el?.modifiedAt;
        data.year = year;
        data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}`;
        data.fileUrl = el?.file;

        finalData.push(data);
      });
    } else if (year == "2020-21") {
      let query_extn = [
        {
          $project: {
            ulbId: "$ulb._id",
            ulbName: "$ulb.name",
            state: "$state.name",
            modifiedAt: "$modifiedAt",
            "2020-21_balance_pdf":
              "$unAudited.provisional_data.bal_sheet.pdf.url",
            "2020-21_balance_excel":
              "$unAudited.provisional_data.bal_sheet.excel.url",
            "2020-21_income_pdf": "$unAudited.provisional_data.inc_exp.pdf.url",
            "2020-21_income_excel":
              "$unAudited.provisional_data.inc_exp.excel.url",
          },
        },
        {
          $project: {
            ulbId: 1,
            ulbName: 1,
            state: 1,
            modifiedAt: 1,
            file: `$${year}_${category}_${type}`,
          },
        },
        {
          $match: {
            file: { $exists: true, $ne: null },
          },
        },
        {
          $sort: {
            modifiedAt: -1,
          },
        },
      ];
      query.push(...query_extn);
      if (getQuery) return res.status(200).json(query);
      let fileData = await AnnualAccountData.aggregate(query);

      fileData.forEach((el) => {
        let data = {
          ulbId: null,
          ulbName: "",
          state: "",
          fileName: "",
          fileUrl: "",
          modifiedAt: "",
          type: type,
          audited: "",
          year: "",
        };
        data.ulbId = el?.ulbId;
        data.state = el?.state;
        data.ulbName = el?.ulbName;
        data.modifiedAt = el?.modifiedAt;
        data.year = year;
        data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}`;
        data.fileUrl = el?.file;

        finalData.push(data);
      });
    }
  }
  if (globalName) {
    finalData = finalData.filter((val) => {
      return val.fileName.toLowerCase().includes(globalName.toLowerCase());
    });
  }
  if (getCount) {
    finalData = finalData.length;
  }
return res.status(200).json({
  success: true,
  data: finalData
})
})

exports.nmpcEligibility = catchAsync(async(req,res)=>{

  let user = req.decoded
  let cutOff_annual = 25;
  let cutOff_util_nmpc = 100;
  let cutOff_util_mpc = 100;
  let cutOff_slb = 100;
  let { state_id } = req.query;
    let state = user?.state ?? state_id;
  let totalULBs = [
    {
      $match:{
        state:ObjectId(state)
      }
    },
    {
        $lookup:{
            from:"states",
            localField:"state",
            foreignField:"_id",
            as:"state"
            }
        },
        {
            $unwind:"$state"
            },
            {
                $match:{
                    "state.accessToXVFC": true
                    }
                },
    {
       
        $match:{
            $or:[{censusCode:{$exists :true, $ne: '', $ne: null}},{sbCode:{$exists :true, $ne: '', $ne: null}}]
            }
        },
        {
            $lookup:{
                   from:"users",
            localField:"_id",
            foreignField:"ulb",
            as:"user"
                }
            },
            {
                $unwind:"$user"
                },
                {
                  $count:"totalULBCount"
                }
    ]

    let totalNMPCs = [
     {
$match:{
  isMillionPlus: "No"
}
     },
     ...totalULBs
    ]
    let totalMPCs = [
      {
 $match:{
   isMillionPlus: "Yes"
 }
      },
      ...totalULBs
     ]
//common stages of different forms
    let common = [{
      $lookup:{
      from:"ulbs",
      localField:"ulb",
      foreignField:"_id",
      as:"ulb"
    }
  },{
    $unwind:"$ulb"
  },
  {
    $match:{
      "ulb.state": ObjectId(state)
    }
  }]
  let query_filled_annual = [
    {
        $match:{$and:[{"audited.submit_annual_accounts":true},{"unAudited.submit_annual_accounts":true}, {isDraft: false}]}
        },
        {
        $count:"filled"
        }
        ]
        let query_filled_util_nmpc = [
          {
            $match:{
              "ulb.isMillionPlus": "No"
            }
          },
          {
              $match:{status:"APPROVED"}
              },
              {
              $count:"filled"
              }
              ]
              let query_filled_util_mpc = [
                {
                  $match:{
                    "ulb.isMillionPlus": "Yes"
                  }
                },
                {
                    $match:{status:"APPROVED"}
                    },
                    {
                    $count:"filled"
                    }
                    ]
                    let query_filled_slb_mpc = [  
                      {
                        $match:{
                          "ulb.isMillionPlus": "Yes"
                        }
                      },
                      {
                          $match:{"waterManagement.status":"APPROVED"}
                          },
                          {
                          $count:"filled"
                          }
                          ]

let actionPlanSubmit = false, waterRejSubmit = false;
                       let actionPlanData =    await ActionPlan.findOne({state:ObjectId(state)}).lean()
                       let waterRejData =    await WaterRejuvenation.findOne({state:ObjectId(state)}).lean()
if(actionPlanData){
if((actionPlanData['status'] == 'PENDING' && actionPlanData['isDraft'] == false)|| (actionPlanData['status'] == null && actionPlanData['isDraft'] == false) || actionPlanData['status'] == 'APPROVED' ){
actionPlanSubmit = true
}
}
if(waterRejData){
  if((waterRejData['status'] == 'PENDING' && waterRejData['isDraft'] == false) || waterRejData['status'] == 'APPROVED' ){
    waterRejSubmit = true
  }
  }

                    query_filled_annual.unshift(...common) 
                    query_filled_util_nmpc.unshift(...common) 
                    query_filled_util_mpc.unshift(...common) 
                    query_filled_slb_mpc.unshift(...common) 

                    console.log(util.inspect(totalULBs, {showHidden: false, depth: null}))
                    console.log(util.inspect(totalNMPCs, {showHidden: false, depth: null}))
                    console.log(util.inspect(totalMPCs, {showHidden: false, depth: null}))
                    console.log(util.inspect(query_filled_slb_mpc, {showHidden: false, depth: null}))
                    let { totalULBCount, totalNMPCCount, totalMPCCount, filledData_annual, filledData_util_nmpc, filledData_util_mpc, filledData_slb_mpc } = await new Promise(async (resolve, reject) => {
                      let prms1 = new Promise(async (rslv, rjct) => {
                          let output =  await Ulb.aggregate(totalULBs)
                          rslv(output);
                      });
                      let prms2 = new Promise(async (rslv, rjct) => {
                          let output =  await Ulb.aggregate(totalNMPCs)
                          rslv(output);
                      });
                      let prms3 = new Promise(async (rslv, rjct) => {
                          let output =    await Ulb.aggregate(totalMPCs);
                          rslv(output);
                      });
                      let prms4 = new Promise(async (rslv, rjct) => {
                          let output = await AnnualAccountData.aggregate(query_filled_annual);
                          rslv(output);
                      });
                      let prms5 = new Promise(async (rslv, rjct) => {
                          let output = await DUR.aggregate(query_filled_util_nmpc);
                          rslv(output);
                      });
                      let prms6 = new Promise(async (rslv, rjct) => {
                          let output = await DUR.aggregate(query_filled_util_mpc);
                          rslv(output);
                      });
                      let prms7 = new Promise(async (rslv, rjct) => {
                          let output =  await SLB.aggregate(query_filled_slb_mpc);
                          rslv(output);
                      });
                      Promise.all([prms1, prms2, prms3, prms4, prms5,prms6, prms7]).then(
                          (outputs) => {
                              let totalULBCount = outputs[0];
                              let totalNMPCCount = outputs[1];
                              let totalMPCCount = outputs[2];
                              let filledData_annual = outputs[3];
                              let filledData_util_nmpc = outputs[4];
                              let filledData_util_mpc = outputs[5];
                              let filledData_slb_mpc = outputs[6];
      
                              if (totalULBCount && totalNMPCCount && totalMPCCount && filledData_annual && filledData_util_nmpc && filledData_util_mpc && filledData_slb_mpc) {
                                  resolve({ totalULBCount, totalNMPCCount, totalMPCCount, filledData_annual , filledData_util_nmpc, filledData_util_mpc, filledData_slb_mpc});
                              } else {
                                  reject({ message: "No Data Found" });
                              }
                          },
                          (e) => {
                              reject(e);
                          }
                      );
                  });
      

  let approvedForms_annual = 0;
  let approvedForms_slb_mpc = 0;
  let approvedForms_util_mpc = 0;
  let approvedForms_util_nmpc = 0;
  
  year2021 = await Year.findOne({year:'2020-21'}).lean();
  year2122 = await Year.findOne({year:'2021-22'}).lean();

  let gtc2021Data = await GTC.findOne({state:ObjectId(state), design_year:ObjectId(year2021._id),  installment:"2"})
  let gtc2122Data = await GTC.findOne({state:ObjectId(state), design_year:ObjectId(year2122._id), installment:"1"})

let gtc2021_untied = false;
let gtc2122_untied = false;
let gtc2021Url_untied = "";
let gtc2122Url_untied = "";

let gtc2021_tied = false;
let gtc2122_tied = false;
let gtc2021Url_tied = "";
let gtc2122Url_tied = "";


let gtc2021_mpc = false;
let gtc2021Url_mpc = "";


  if(gtc2021Data){
    if(gtc2021Data['nonmillion_untied']?.pdfUrl != null || gtc2021Data['nonmillion_untied']?.pdfUrl != ""  ){
      gtc2021_untied = true;
      gtc2021Url_untied = gtc2021Data['nonmillion_untied']?.pdfUrl;
    }
    if(gtc2021Data['nonmillion_tied']?.pdfUrl != null || gtc2021Data['nonmillion_tied']?.pdfUrl != ""  ){
      gtc2021_tied = true;
      gtc2021Url_tied = gtc2021Data['nonmillion_tied']?.pdfUrl;
    }
    if(gtc2021Data['million_tied']?.pdfUrl != null || gtc2021Data['million_tied']?.pdfUrl != ""  ){
      gtc2021_mpc = true;
      gtc2021Url_mpc = gtc2021Data['million_tied']?.pdfUrl;
    }
  }
  if(gtc2122Data){
    if(gtc2122Data['nonmillion_untied']?.pdfUrl != null || gtc2122Data['nonmillion_untied']?.pdfUrl != ""  ){
      gtc2122_untied = true;
      gtc2122Url_untied = gtc2122Data['nonmillion_untied']?.pdfUrl;
    }
    if(gtc2122Data['nonmillion_tied']?.pdfUrl != null || gtc2122Data['nonmillion_tied']?.pdfUrl != ""  ){
      gtc2122_tied = true;
      gtc2122Url_tied = gtc2122Data['nonmillion_tied']?.pdfUrl;
    }
  }


let total = totalULBCount[0]?.totalULBCount 
let totalNMPC = totalNMPCCount[0]?.totalULBCount
let totalMPC = totalMPCCount[0]?.totalULBCount
  approvedForms_annual = filledData_annual[0]?.filled;
  approvedForms_util_nmpc = filledData_util_nmpc[0]?.filled;
  approvedForms_util_mpc = filledData_util_mpc[0]?.filled;
  approvedForms_slb_mpc = filledData_slb_mpc[0]?.filled;
  //calculating percentage
let percentage_annual = parseInt(approvedForms_annual/total * 100) ? parseInt(approvedForms_annual/total * 100)  : 0 
let percentage_util_nmpc = parseInt(approvedForms_util_nmpc/totalNMPC * 100) ? parseInt(approvedForms_util_nmpc/totalNMPC * 100)  :0
let percentage_util_mpc = parseInt(approvedForms_util_mpc/totalMPC * 100)? parseInt(approvedForms_util_mpc/totalMPC * 100) : 0
let percentage_slb_mpc = parseInt(approvedForms_slb_mpc/totalMPC * 100)? parseInt(approvedForms_slb_mpc/totalMPC * 100)  : 0

let nmpc_untied_1st_inst_eligible = gtc2021_untied;
let nmpc_tied_1st_inst_eligible = gtc2021_tied;

let nmpc_untied_2nd_inst_eligible = (percentage_annual >= cutOff_annual) && gtc2122_untied ;
let nmpc_tied_2nd_inst_eligible = (percentage_annual >= cutOff_annual)  && (percentage_util_nmpc >= cutOff_util_nmpc) && gtc2122_tied;

let mpc_eligible = (percentage_annual >= cutOff_annual) &&
                   (percentage_util_mpc >= cutOff_util_mpc) && 
                   (percentage_slb_mpc>=cutOff_slb) && 
                   gtc2021_mpc && 
                   waterRejSubmit && 
                   actionPlanSubmit ;
return res.json({
  success: true,
  nmpc_tied:{
    secondInstallment:{
      totalNMPCs: totalNMPC,
      approvedForms_util:approvedForms_util_nmpc,
      percentage_util : percentage_util_nmpc,
      cutOff_util:cutOff_util_nmpc,
      eligible:nmpc_tied_2nd_inst_eligible,
      gtcSubmitted: gtc2122_tied,
      gtcLink:gtc2122Url_tied,
    },
    firstInstallment:{
      eligible:nmpc_tied_1st_inst_eligible,
      gtcSubmitted: gtc2021_tied,
      gtcLink:gtc2021Url_tied,
    }
  },
  nmpc_untied:{
    secondInstallment:{
      totalULBs : total,
      approvedForms_annual:approvedForms_annual,
      percentage_annual : percentage_annual,
      cutOff_annual:cutOff_annual,
      gtcSubmitted: gtc2122_untied,
      gtcLink:gtc2122Url_untied,
      eligible:nmpc_untied_2nd_inst_eligible
    },
    firstInstallment:{
      gtcSubmitted: gtc2021_untied,
      gtcLink:gtc2021Url_untied,
      eligible:nmpc_untied_1st_inst_eligible
    }
  },
  mpc:{
eligible:mpc_eligible,
totalMPCs : totalMPC,
gtcSubmitted: gtc2021_mpc,
gtcLink:gtc2021Url_mpc,
approvedForms_util:approvedForms_util_mpc,
percentage_util : percentage_util_mpc,
cutOff_util:cutOff_util_mpc,
approvedForms_slb:approvedForms_slb_mpc,
percentage_slb : percentage_slb_mpc,
cutOff_slb:cutOff_slb,
actionPlan:actionPlanSubmit,
waterRej: waterRejSubmit

  }
 
  
})

})
exports.getAccounts = async (req, res) => {
  try {
    
    let { design_year, ulb } = req.query;
    let ulbData = await Ulb.findOne({_id: ObjectId(ulb)}).lean();
    let currYearData = await Year.findOne({_id: ObjectId(design_year)}).lean();
    let prevYearVal;
     prevYearVal = findPreviousYear(currYearData.year);
     let prevYearData = await Year.findOne({year: prevYearVal }).lean();
let prevStatus = await AnnualAccountData.findOne({
  ulb: ObjectId(ulb),
  design_year: prevYearData._id
}).select({status:1, isDraft:1, actionTakenByRole:1}).lean()

let status = '' ;
if(prevStatus){
  status = calculateStatus(prevStatus.status, prevStatus.actionTakenByRole, prevStatus.isDraft, "ULB")
}
 let annualAccountData = {}
console.log(status)
let dataCollection = {}
 dataCollection = await DataCollection.findOne({ulb: ObjectId(ulb)}).lean()
let dataSubmittedByOpenPage = false
if(dataCollection && dataCollection.hasOwnProperty("documents") && (dataCollection?.documents?.financial_year_2019_20?.pdf).length > 0){
  dataSubmittedByOpenPage = true
  status = 'Submitted through Open Page'
}
if(status == STATUS_LIST.Under_Review_By_MoHUA || status == STATUS_LIST.Approved_By_MoHUA || dataSubmittedByOpenPage ){
  annualAccountData['action'] = 'not_show';
  annualAccountData['url'] = `Your previous Year's form status is - ${status}`;
}else{
  annualAccountData['action'] = 'redirect'
  annualAccountData['url'] = `Your previous Year's form status is - ${status} .Kindly submit Annual Accounts for the previous year at - <a href=${req.currentUrl}/oldhome>Click Here!</a> . `;
}
let obj = annualAccountData;
    if (req.decoded.role == "ULB") ulb = req?.decoded.ulb;
   
    annualAccountData =  await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year,
      isActive: true,
    }).select({ history: 0 });
    if(!annualAccountData) {

      return res.status(400).json(obj);

    }
  
    annualAccountData = JSON.parse(JSON.stringify(annualAccountData));
    if (
      req.decoded.role === "MoHUA" &&
      annualAccountData.actionTakenByRole === "STATE" &&
      annualAccountData.status == "APPROVED"
    ) {
      annualAccountData.status = "PENDING";
      if (annualAccountData.unAudited.submit_annual_accounts) {
        let proData = annualAccountData.unAudited.provisional_data;
        for (const key in proData) {
          if (key == "auditor_report") continue;
          proData[key].status = "PENDING";
          proData[key].rejectReason = null;
        }
      }
      if (annualAccountData.audited.submit_annual_accounts) {
        let proData = annualAccountData.audited.provisional_data;
        for (const key in proData) {
          proData[key].rejectReason = null;
          proData[key].status = "PENDING";
        }
      }
    }
Object.assign(annualAccountData, obj)
    
    return res.status(200).json(annualAccountData);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getCSVAudited = catchAsync(async (req, res) => {
  let filename = "Annual_Accounts-Audited.csv";


  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  res.write(
    "ULB name, Census Code, SB Code, ULB Code, State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Auditor Report, Standardized Excel, Form Status  \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let statusList=[
    'In Progress',
    'Submitted',
    'Not Submitted',
    'Approved By State',
    'Under Review By State',
    'Rejected By State',
    'Approved By MoHUA',
    'Under Review By MoHUA',
    'Rejected By MoHUA'
  ]
  let Audited_data = await AnnualAccountData.aggregate([
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb"
      }
    },
    {
      $unwind: "$ulb"
    },
    {
      $lookup: {
        from: "states",
        localField: "ulb.state",
        foreignField: "_id",
        as: "state"
      }
    },
    {
      $unwind: "$state"
    },
    {

      $project: {
        ulbName: "$ulb.name",
        censusCode: "$ulb.censusCode",
        sbCode: "$ulb.sbCode",
        ulbCode:"$ulb.code",
        state:"$state.name",
        submittedOn: "$createdAt",
        bal_sheet: "$audited.provisional_data.bal_sheet.pdf.url",
        bal_sheet_schedules: "$audited.provisional_data.bal_sheet_schedules.pdf.url",
        inc_exp: "$audited.provisional_data.inc_exp.pdf.url",
        inc_exp_schedules: "$audited.provisional_data.inc_exp_schedules.pdf.url",
        cash_flow: "$audited.provisional_data.cash_flow.pdf.url",
        auditor_report: "$audited.provisional_data.auditor_report.pdf.url",
        standardized_excel: "$audited.standardized_data.excel.url",
        audited_answer:"$audited.submit_annual_accounts",
        unaudited_answer: "$unAudited.submit_annual_accounts",
        isDraft:"$isDraft",
        status:"$status",
        role:"$actionTakenByRole"
      }
    }]).exec((err, data) => {
      if (err) {
        res.json({
          success: false,
          msg: "Invalid Payload",
          data: err.toString(),
        });
      } else {
        for(el of data){
          if(!el.submittedOn){
            el.submittedOn = 'Not Submitted'
          }
          if(!el.bal_sheet){
            el.bal_sheet = 'Not Submitted'
          }
          if(!el.bal_sheet_schedules){
            el.bal_sheet_schedules = 'Not Submitted'
          }
          if(!el.inc_exp){
            el.inc_exp = 'Not Submitted'
          }
          if(!el.inc_exp_schedules){
            el.inc_exp_schedules = 'Not Submitted'
          }
          if(!el.cash_flow){
            el.cash_flow = 'Not Submitted'
          }
          if(!el.auditor_report){
            el.auditor_report = 'Not Submitted'
          }
  
          if(el.role == 'ULB' && el.isDraft){
el['formStatus'] = statusList[0]
          }else if(el.role == 'ULB' && !el.isDraft){
            if(el.audited_answer && el.unaudited_answer){
              el['formStatus'] = statusList[1]
            }else{
              el['formStatus'] = statusList[2]
            }

          }else if(el.role == 'STATE' && el.isDraft){
            el['formStatus'] = statusList[4]
          }else if(el.role == 'STATE' && !el.isDraft){
            if(el.status =='APPROVED'){
              el['formStatus'] = statusList[3]
            }else if(el.status =='REJECTED'){
              el['formStatus'] = statusList[5]
            }

          }else if(el.role == 'MoHUA' && el.isDraft){
            el['formStatus'] = statusList[8]
          }else if(el.role == 'MoHUA' && !el.isDraft){
            if(el.status =='APPROVED'){
              el['formStatus'] = statusList[7]
            }else if(el.status =='REJECTED'){
              el['formStatus'] = statusList[9]

            }

          }

        }
        for (el of data) {
          res.write(
            el.ulbName +
            "," +
            el.censusCode +
            "," +
            el.sbCode +
            "," +
            el.ulbCode +
            "," +
            el.state +
            "," +
            el.submittedOn +
            "," +
            el.bal_sheet +
            "," +
            el.bal_sheet_schedules +
            "," +
            el.inc_exp +
            "," +
            el.inc_exp_schedules +
            "," +
            el.cash_flow +
            "," +
            el.auditor_report +
            "," +
            el.standardized_excel +
            "," +
            el.formStatus +
            "," +
            "\r\n"
          );
        }
        res.end();

      }
    })

})
exports.getCSVUnaudited = catchAsync(async (req, res) => {
  let filename = "Annual_Accounts-Provisional.csv";


  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  res.write(
    "ULB name, Census Code, SB Code, ULB Code,  State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Standardized Excel, Form Status \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let statusList=[
    'In Progress',
    'Submitted',
    'Not Submitted',
    'Approved By State',
    'Under Review By State',
    'Rejected By State',
    'Approved By MoHUA',
    'Under Review By MoHUA',
    'Rejected By MoHUA'
  ]
  let Unaudited_data = await AnnualAccountData.aggregate([
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb"
      }
    },
    {
      $unwind: "$ulb"
    },
    {
      $lookup: {
        from: "states",
        localField: "ulb.state",
        foreignField: "_id",
        as: "state"
      }
    },
    {
      $unwind: "$state"
    },
    {

      $project: {
        ulbName: "$ulb.name",
        censusCode: "$ulb.censusCode",
        sbCode: "$ulb.sbCode",
        ulbCode:"$ulb.code",
        state:"$state.name",
        submittedOn: "$createdAt",
        bal_sheet: "$unAudited.provisional_data.bal_sheet.pdf.url",
        bal_sheet_schedules: "$unAudited.provisional_data.bal_sheet_schedules.pdf.url",
        inc_exp: "$unAudited.provisional_data.inc_exp.pdf.url",
        inc_exp_schedules: "$unAudited.provisional_data.inc_exp_schedules.pdf.url",
        cash_flow: "$unAudited.provisional_data.cash_flow.pdf.url",
        standardized_excel: "$unAudited.standardized_data.excel.url",
        audited_answer:"$audited.submit_annual_accounts",
        unaudited_answer: "$unAudited.submit_annual_accounts",
        isDraft:"$isDraft",
        status:"$status",
        role:"$actionTakenByRole"
      }
    }]).exec((err, data) => {
      if (err) {
        res.json({
          success: false,
          msg: "Invalid Payload",
          data: err.toString(),
        });
      } else {
        for(el of data){
          if(!el.submittedOn){
            el.submittedOn = 'Not Submitted'
          }
          if(!el.bal_sheet){
            el.bal_sheet = 'Not Submitted'
          }
          if(!el.bal_sheet_schedules){
            el.bal_sheet_schedules = 'Not Submitted'
          }
          if(!el.inc_exp){
            el.inc_exp = 'Not Submitted'
          }
          if(!el.inc_exp_schedules){
            el.inc_exp_schedules = 'Not Submitted'
          }
          if(!el.cash_flow){
            el.cash_flow = 'Not Submitted'
          }

          if(el.role == 'ULB' && el.isDraft){
            el['formStatus'] = statusList[0]
                      }else if(el.role == 'ULB' && !el.isDraft){
                        if(el.audited_answer && el.unaudited_answer){
                          el['formStatus'] = statusList[1]
                        }else{
                          el['formStatus'] = statusList[2]
                        }
            
                      }else if(el.role == 'STATE' && el.isDraft){
                        el['formStatus'] = statusList[4]
                      }else if(el.role == 'STATE' && !el.isDraft){
                        if(el.status =='APPROVED'){
                          el['formStatus'] = statusList[3]
                        }else if(el.status =='REJECTED'){
                          el['formStatus'] = statusList[5]
                        }
            
                      }else if(el.role == 'MoHUA' && el.isDraft){
                        el['formStatus'] = statusList[8]
                      }else if(el.role == 'MoHUA' && !el.isDraft){
                        if(el.status =='APPROVED'){
                          el['formStatus'] = statusList[7]
                        }else if(el.status =='REJECTED'){
                          el['formStatus'] = statusList[9]
            
                        }
            
                      }
         
        }
        for (el of data) {
          res.write(
            el.ulbName +
            "," +
            el.censusCode +
            "," +
            el.sbCode +
            "," +
            el.ulbCode +
            "," +
            el.state +
            "," +
            el.submittedOn +
            "," +
            el.bal_sheet +
            "," +
            el.bal_sheet_schedules +
            "," +
            el.inc_exp +
            "," +
            el.inc_exp_schedules +
            "," +
            el.cash_flow +
            "," +
            el.standardized_excel +
            "," +
            el.formStatus +
            "," +
            "\r\n"
          );
        }
        res.end();

      }
    })

})
exports.dashboard = catchAsync(async (req,res)=>{
let user = req.decoded;
let {state_id} = req.query
if(state_id == 'null'){
  state_id = null
}

let data = {
  audited:{
notStarted:0,
inProgress:0,
submitted:0,
notSubmitted:0,
approvedbyState:0,
approvedByMoHUA:0
  },
  provisional:{
    notStarted:0,
inProgress:0,
submitted:0,
notSubmitted:0,
approvedbyState:0,
approvedByMoHUA:0

  }
}
let state = user.state ?? state_id
if(user.role == 'STATE'){
let query_audited = [
  {
      $project:{
         "answer": "$audited.submit_annual_accounts",
          data:"$audited.provisional_data",
          actionTakenByRole:1,
          isDraft:1,
          status:1,
          ulb:1
          }
      },
    {
        $group:{
            _id:{
                role:"$actionTakenByRole",
                isDraft:"$isDraft",
                status:"$status",
                answer:"$answer"
                },
                count:{$sum:1},
                ulb:{$addToSet:"$ulb"}
            }
        } ,
  ]
  let query_unAudited = [
    {
        $project:{
           "answer": "$unAudited.submit_annual_accounts",
            data:"$unAudited.provisional_data",
            actionTakenByRole:1,
            isDraft:1,
            status:1,
            ulb:1
            }
        },
      {
          $group:{
              _id:{
                  role:"$actionTakenByRole",
                  isDraft:"$isDraft",
                  status:"$status",
                  answer:"$answer"
                  },
                  count:{$sum:1},
                  ulb:{$addToSet:"$ulb"}
              }
          } ,
    ]

    let { audited, unAudited} = await new Promise(async (resolve, reject) => {
      let prms1 = new Promise(async (rslv, rjct) => {
          // console.log(util.inspect(query_totalULBs, { showHidden: false, depth: null }))
          let output = await AnnualAccountData.aggregate(query_audited);
          rslv(output);
      });
      let prms2 = new Promise(async (rslv, rjct) => {
          // console.log(util.inspect(query_totalApproved, { showHidden: false, depth: null }))
          let output = await AnnualAccountData.aggregate(query_unAudited);
          rslv(output);
      });
    
      Promise.all([prms1, prms2]).then(
          (outputs) => {
              let audited = outputs[0];
              let unAudited = outputs[1];
      

              if (audited && unAudited ) {
                  resolve({ audited, unAudited});
              } else {
                  reject({ message: "No Data Found" });
              }
          },
          (e) => {
              reject(e);
          }
      );
  });
for(let el of audited){
  // clicked No
  if(!el._id.answer){
data.audited.notSubmitted = data.audited.notSubmitted + el.count 
  }else{
    // clicked Yes
        if(el._id.role == 'ULB' && el._id.isDraft){
            data.audited.inProgress = data.audited.inProgress + el.count 
        }else if(el._id.role == 'ULB' && !el._id.isDraft){
          data.audited.submitted = data.audited.submitted + el.count 
        }
  }
}
}else if (user.role == 'MoHUA' || 'ADMIN' || 'PARTNER' ){

}else{
  return res.status(403).json({
    success: false,
    message:"Not Authenticated to Access this Data"
  })
}
})

exports.action = async (req, res) => {
  try {
    let { ulb, design_year, isDraft } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();
    req.body.actionTakenByRole = req.decoded.role;
    let currentAnnualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });

    let allReasons = [];
    let finalStatus = "APPROVED";
    if (req.body.unAudited.submit_annual_accounts) {
      let unAudited = {};
      let proData = req.body.unAudited.provisional_data;
      for (const key in proData) {
        if (key == "auditor_report") continue;
        unAudited[key] = proData[key]?.rejectReason;
        if (proData[key]?.status == "REJECTED") {
          finalStatus = "REJECTED";
        }
      }
      allReasons.push(unAudited);
    }
    if (req.body.audited.submit_annual_accounts) {
      let audited = {};
      let proData = req.body.audited.provisional_data;
      for (const key in proData) {
        audited[key] = proData[key]?.rejectReason;
        if (proData[key]?.status == "REJECTED") {
          finalStatus = "REJECTED";
        }
      }
      allReasons.push(audited);
    }
    req.body.status = finalStatus;
    if (req.body.status == "REJECTED") req.body.rejectReason = allReasons;

    const newAnnualAccountData = await AnnualAccountData.findOneAndUpdate(
      { ulb: ObjectId(ulb), isActive: true },
      { $set: req.body, $push: { history: currentAnnualAccountData } }
    );

    if (!newAnnualAccountData) {
      return res.status(400).json({
        msg: "no AnnualAccountData found",
      });
    }

    await UpdateMasterSubmitForm(req, "annualAccounts");

    return res.status(200).json({
      msg: "Action Submitted!",
      newAnnualAccountData: { status: req.body.status },
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

function csvData_Provisional() {
  return (field = {
    ulbName: "ULB name",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    submittedOn: "Submission Date",
    bal_sheet: "Balance Sheet",
    bal_sheet_schedules: "Balance Sheet Schedules",
    inc_exp: "Income Expenditure",
    inc_exp_schedules: "Income Expenditure Schedules",
    cash_flow: "Cash Flow",

  });
}
function csvData_Audited() {
  return (field = {
    ulbName: "ULB name",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    submittedOn: "Submission Date",
    bal_sheet: "Balance Sheet",
    bal_sheet_schedules: "Balance Sheet Schedules",
    inc_exp: "Income Expenditure",
    inc_exp_schedules: "Income Expenditure Schedules",
    cash_flow: "Cash Flow",
    auditor_report: "Auditor Report"

  });
}

