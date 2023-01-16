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
const { findPreviousYear } = require('../../util/findPreviousYear')
const { calculateTabwiseStatus } = require('./utilFunc')
const { calculateStatus } = require('../CommonActionAPI/service')
const UlbLedger = require('../../models/UlbLedger')
const STATUS_LIST = require('../../util/newStatusList')
const LineItem = require('../../models/LineItem')
const { groupByKey } = require('../../util/group_list_by_key')
const ExcelJS = require("exceljs");
const { canTakenAction } = require('../CommonActionAPI/service')
const fs = require("fs");
const Service = require('../../service');
const { FormNames, YEAR_CONSTANTS } = require('../../util/FormNames');
var https = require('https');
var request = require('request')
function doRequest(url) {
  return new Promise(function (resolve, reject) {
    request(url, function (error, resp, body) {
      if (!error && resp?.statusCode == 404) {
        resolve(url)

      } else {
        reject(url);
      }
    });
  });
}
module.exports.fileDeFuncFiles = async (req, res) => {
  let query = [
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
      $group: {
        _id: {
          ulb: "$ulb._id",
          year: "$design_year"
        },
        ulbName: { $first: "$ulb.name" },
        ulbcode: { $first: "$ulb.code" },
        bal_sheet_aud_pdf: { $first: "$audited.provisional_data.bal_sheet.pdf.url" },
        bal_sheet_aud_ex: { $first: "$audited.provisional_data.bal_sheet.excel.url" },

        bal_sheetSch_aud_pdf: { $first: "$audited.provisional_data.bal_sheet_schedules.pdf.url" },
        bal_sheetSch_aud_ex: { $first: "$audited.provisional_data.bal_sheet_schedules.excel.url" },

        inc_exp_aud_pdf: { $first: "$audited.provisional_data.inc_exp.pdf.url" },
        inc_exp_aud_ex: { $first: "$audited.provisional_data.inc_exp.excel.url" },

        inc_exp_schedules_aud_pdf: { $first: "$audited.provisional_data.inc_exp_schedules.pdf.url" },
        inc_exp_schedules_aud_ex: { $first: "$audited.provisional_data.inc_exp_schedules.excel.url" },

        cash_flow_aud_pdf: { $first: "$audited.provisional_data.cash_flow.pdf.url" },
        cash_flow_aud_ex: { $first: "$audited.provisional_data.cash_flow.excel.url" },

        auditor_report_aud_pdf: { $first: "$audited.provisional_data.auditor_report.pdf.url" },


        bal_sheet_unaud_pdf: { $first: "$unAudited.provisional_data.bal_sheet.pdf.url" },
        bal_sheet_unaud_ex: { $first: "$unAudited.provisional_data.bal_sheet.excel.url" },

        bal_sheetSch_unaud_pdf: { $first: "$unAudited.provisional_data.bal_sheet_schedules.pdf.url" },
        bal_sheetSch_unaud_ex: { $first: "$unAudited.provisional_data.bal_sheet_schedules.excel.url" },

        inc_exp_unaud_pdf: { $first: "$unAudited.provisional_data.inc_exp.pdf.url" },
        inc_exp_unaud_ex: { $first: "$unAudited.provisional_data.inc_exp.excel.url" },

        inc_exp_schedules_unaud_pdf: { $first: "$unAudited.provisional_data.inc_exp_schedules.pdf.url" },
        inc_exp_schedules_unaud_ex: { $first: "$unAudited.provisional_data.inc_exp_schedules.excel.url" },

        cash_flow_unaud_pdf: { $first: "$unAudited.provisional_data.cash_flow.pdf.url" },
        cash_flow_unaud_ex: { $first: "$unAudited.provisional_data.cash_flow.excel.url" },



      }
    },


  ]
  let data = await AnnualAccountData.aggregate(query);
  let documnetcounter = 1;
  working = 0;
  notWorking = 0;
  let arr = []
  for (let el of data) {


    for (let key in el) {
      if (key != '_id' && key != 'ulbName' && key != 'ulbcode' && el[key]) {
        let url = el[key];
        // let url = 'https://cityfinance.in/objects/31e1883d-7eef-4b2f-9e29-18d598056a5d.pdf'
        try {
          let response = await doRequest(url);

          let obj = {
            ulbName: "",
            ulbCame: "",
            key: "",
            url: "",
            year: ""
          }
          obj.ulbName = el.ulbName;
          obj.ulbCode = el.ulbcode;
          obj.key = key;
          obj.url = response
          obj.year = el['_id']['year']
          arr.push(obj);

        } catch (error) {
          // `error` will be whatever you passed to `reject()` at the top
        }



      }


    }
  }

  return res.send(arr);

}


const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};

function doRequest(url) {
  return new Promise(function (resolve, reject) {
    let options = {
      url: url,
      method: 'HEAD'
    }
    request(options, function (error, resp, body) {
      if (!error && resp?.statusCode == 404) {
        resolve(url)

      } else {
        reject(url);
      }
    });
  });
}

module.exports.fileDeFuncFiles = async (req, res) => {
  let query = [
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
      $group: {
        _id: {
          ulb: "$ulb._id",
          year: "$design_year"
        },
        ulbName: { $first: "$ulb.name" },
        ulbcode: { $first: "$ulb.code" },
        bal_sheet_aud_pdf: { $first: "$audited.provisional_data.bal_sheet.pdf.url" },
        bal_sheet_aud_ex: { $first: "$audited.provisional_data.bal_sheet.excel.url" },

        bal_sheetSch_aud_pdf: { $first: "$audited.provisional_data.bal_sheet_schedules.pdf.url" },
        bal_sheetSch_aud_ex: { $first: "$audited.provisional_data.bal_sheet_schedules.excel.url" },

        inc_exp_aud_pdf: { $first: "$audited.provisional_data.inc_exp.pdf.url" },
        inc_exp_aud_ex: { $first: "$audited.provisional_data.inc_exp.excel.url" },

        inc_exp_schedules_aud_pdf: { $first: "$audited.provisional_data.inc_exp_schedules.pdf.url" },
        inc_exp_schedules_aud_ex: { $first: "$audited.provisional_data.inc_exp_schedules.excel.url" },

        cash_flow_aud_pdf: { $first: "$audited.provisional_data.cash_flow.pdf.url" },
        cash_flow_aud_ex: { $first: "$audited.provisional_data.cash_flow.excel.url" },

        auditor_report_aud_pdf: { $first: "$audited.provisional_data.auditor_report.pdf.url" },


        bal_sheet_unaud_pdf: { $first: "$unAudited.provisional_data.bal_sheet.pdf.url" },
        bal_sheet_unaud_ex: { $first: "$unAudited.provisional_data.bal_sheet.excel.url" },

        bal_sheetSch_unaud_pdf: { $first: "$unAudited.provisional_data.bal_sheet_schedules.pdf.url" },
        bal_sheetSch_unaud_ex: { $first: "$unAudited.provisional_data.bal_sheet_schedules.excel.url" },

        inc_exp_unaud_pdf: { $first: "$unAudited.provisional_data.inc_exp.pdf.url" },
        inc_exp_unaud_ex: { $first: "$unAudited.provisional_data.inc_exp.excel.url" },

        inc_exp_schedules_unaud_pdf: { $first: "$unAudited.provisional_data.inc_exp_schedules.pdf.url" },
        inc_exp_schedules_unaud_ex: { $first: "$unAudited.provisional_data.inc_exp_schedules.excel.url" },
        cash_flow_unaud_pdf: { $first: "$unAudited.provisional_data.cash_flow.pdf.url" },
        cash_flow_unaud_ex: { $first: "$unAudited.provisional_data.cash_flow.excel.url" },
      }
    },
  ]

  let data = await AnnualAccountData.aggregate(query);
  let documnetcounter = 1;
  working = 0;
  notWorking = 0;
  let arr = []
  let target = data.length;
  console.log(target)
  let skip = 0;
  let batch = 150;
  while (skip <= target) {
    const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
    await Promise.all(
      slice.map(async el => {
        for (let key in el) {


          if (key != '_id' && key != 'ulbName' && key != 'ulbcode' && el[key]) {
            documnetcounter++;
            let url = el[key];
            // let url = 'https://cityfinance.in/objects/31e1883d-7eef-4b2f-9e29-18d598056a5d.pdf'
            try {
              let response = await doRequest(url);

              let obj = {
                ulbName: "",
                ulbCame: "",
                key: "",
                url: "",
                year: ""
              }
              obj.ulbName = el.ulbName;
              obj.ulbCode = el.ulbcode;
              obj.key = key;
              obj.url = response
              obj.year = el['_id']['year']
              console.log(obj)
              arr.push(obj);

            } catch (error) {
              //console.log('working', error)
              // `error` will be whatever you passed to `reject()` at the top
            }
          }
        }
      })
    )
    //for(let el of data){



    ///}
    console.log(skip)
    skip += batch;
  }
  return res.send({
    data: arr,
    number: arr.length,
    total: documnetcounter
  });
}

// const calculateTabwiseStatusAndOverallStatus = (formData) => {
// let audited = formData['audited'];
// let unAudited = formData['unAudited'];
// let auditedAns = formData['audited']['submit_annual_accounts']
// let unAuditedAns = formData['unAudited']['submit_annual_accounts']
// let actionTakenByRole = formData['actionTakenByRole']
// if(actionTakenByRole == 'ULB'){
//   formData.audited['status'] = "PENDING"
//   formData.unAudited['status'] = "PENDING"
// }else if(actionTakenByRole != 'ULB'){
//   if(auditedAns){
//   for(let key in audited['provisional_data']){
//     if(typeof key == 'object' && key != null ){
//       if(audited['provisional_data'][key]['status'] == 'REJECTED'){
//         formData.audited['status'] = "REJECTED"
//         break;
//       }
//     }
//   }  

//   }
//   if(unAuditedAns){
//     for(let key in unAudited['provisional_data']){
//       if(typeof unAudited['provisional_data'][key] == 'object' && key != null ){
//         if(unAudited['provisional_data'][key]['status'] == 'REJECTED'){
//           formData.unAudited['status'] = "REJECTED"
//           break;
//         }
//       }
//     }  

//   }
// }
// if(formData.audited['status'] == "APPROVED" && formData.unAudited['status'] == "APPROVED" ){
//   formData['status'] = "APPROVED"
// }else if(formData.audited['status'] == "PENDING" && formData.unAudited['status'] == "PENDING" ){
//   formData['status'] = "PENDING"
// }else{
//   formData['status'] = "REJECTED"
// }
// return formData;

// }
// const calculateCanTakeActionFileWise = (fileStatus, actionTakenByRole, loggedInUser) => {
// if(loggedInUser == 'ULB'){
// return false
// }else if(loggedInUser == 'STATE'){
// if(actionTakenByRole == 'ULB' && fileStatus != 'APPROVED'){
//   return true;
// }
// }else if(loggedInUser == 'MoHUA'){
//   if(actionTakenByRole == 'STATE' && fileStatus == 'APPROVED'){
//     return true;
//   }
// }
// }
exports.createUpdate = async (req, res) => {
  try {
    let { design_year, isDraft } = req.body;

    req.body.actionTakenBy = req?.decoded._id;
    req.body.actionTakenByRole = req?.decoded.role;
    const formName = FormNames["annualAcc"];
    const { name: ulbName } = req.decoded;

    req.body.ulb = req?.decoded.ulb;
    const ulb = req?.decoded.ulb;
    req.body.modifiedAt = new Date();
    req.body['status'] = "PENDING";
    let userData = await User.find({
      $or: [
        {
          isDeleted: false,
          ulb: ObjectId(ulb),
          role: "ULB"
        },
        {
          isDeleted: false,
          state: ObjectId(req?.decoded.state),
          role: "STATE",
          isNodalOfficer: true,
        },
      ],
    }).lean();

    let emailAddress = [];
    let ulbUserData = {},
      stateUserData = {};
    for (let i = 0; i < userData.length; i++) {
      if (userData[i]) {
        if (userData[i].role === "ULB") {
          ulbUserData = userData[i];
        } else if (userData[i].role === "STATE") {
          stateUserData = userData[i];
        }
      }
      if (ulbUserData && ulbUserData.commissionerEmail) {
        emailAddress.push(ulbUserData.commissionerEmail);
      }
      if (stateUserData && stateUserData.email) {
        emailAddress.push(stateUserData.email);
      }
      ulbUserData = {};
      stateUserData = {};
    }
    //unique email address
    emailAddress = Array.from(new Set(emailAddress));

    let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(ulbName, formName);
    let mailOptions = {
      Destination: {
        /* required */
        ToAddresses: emailAddress,
      },
      Message: {
        /* required */
        Body: {
          /* required */
          Html: {
            Charset: "UTF-8",
            Data: ulbTemplate.body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: ulbTemplate.subject,
        },
      },
      Source: process.env.EMAIL,
      /* required */
      ReplyToAddresses: [process.env.EMAIL],
    };



    let formData = {};
    let data = req.body;
    formData = { ...data };
    formData["actionTakenByRole"] = req.body.actionTakenByRole;
    formData["actionTakenBy"] = ObjectId(req.body.actionTakenBy);
    formData['status'] = 'PENDING';
    formData["ulbSubmit"] = "";
    let proData, audData
    if (!req.body.unAudited.hasOwnProperty("provisional_data") || !req.body.audited.hasOwnProperty("provisional_data")) {
      return res.json({
        success: false,
        message: "Incorrect Format in Req Data"
      })
    }
    if (req.body.unAudited.submit_annual_accounts) {
      proData = req.body.unAudited.provisional_data;
      for (const key in proData) {
        if (key == "auditor_report") continue;
        if (proData[key]['status'] == 'REJECTED') {
          proData[key].status = "PENDING";
          proData[key].rejectReason = null;
        }




      }
    }
    if (req.body.audited.submit_annual_accounts) {
      audData = req.body.audited.provisional_data;
      for (const key in audData) {
        if (audData[key]['status'] == 'REJECTED') {
          audData[key].status = "PENDING";
          audData[key].rejectReason = null;
        }
      }
    }
    formData['unAudited']['provisional_data'] = proData ?? req.body.unAudited.provisional_data;
    formData['audited']['provisional_data'] = audData ?? req.body.audited.provisional_data;

    req.body.status = "PENDING";
    currentAnnualAccounts = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });

    let condition = {};
    condition.design_year = design_year;
    condition.ulb = ulb;

    if (req.body.ulb) {
      formData["ulb"] = ObjectId(ulb);
    }

    if (design_year) {
      formData["design_year"] = ObjectId(design_year);
    }

    const submittedForm = await AnnualAccountData.findOne(condition);
    if (formData['design_year'] == '606aaf854dff55e6c075d219') {
      formData.modifiedAt = Date.now();
      const addedHistory = await AnnualAccountData.findOneAndUpdate(
        condition,
        formData,
        { new: true, runValidators: true, upsert: true }
      );
      await UpdateMasterSubmitForm(req, "annualAccounts");
      return res.status(200).json({
        status: true,
        message: "form submitted",
        data: addedHistory,
        isCompleted: formData.isDraft ? false : true
      })
    }
    if (design_year != "606aaf854dff55e6c075d219")
      formData = calculateTabwiseStatus(formData);

    if (submittedForm && !submittedForm.isDraft && submittedForm.actionTakenByRole == 'ULB') {// form already submitted
      return res.status(200).json({
        status: true,
        message: "Form already submitted."
      })
    } else if (submittedForm && submittedForm.isDraft) {
      if (formData.isDraft) {
        formData.modifiedAt = Date.now();
        const addedHistory = await AnnualAccountData.findOneAndUpdate(
          condition,
          formData,
          { new: true, runValidators: true }
        );
        return res.status(200).json({
          status: true,
          message: "form submitted",
          data: addedHistory
        })
      } else if (!formData.isDraft) {
        let currentData = {}
        formData['ulbSubmit'] = new Date();
        Object.assign(currentData, formData)

        formData['history'] = submittedForm['history']
        formData["history"].push(currentData);
        delete formData["_id"];
        const addedHistory = await AnnualAccountData.findOneAndUpdate(
          condition,
          formData
        );
        if (addedHistory) {//email trigger after form submission
          Service.sendEmail(mailOptions);
        }

        return res.status(200).json({
          status: true,
          message: "form submitted",
          data: addedHistory,
        });

      }
    }
    if (!submittedForm && !isDraft) {// final submit in first attempt
      formData["ulbSubmit"] = new Date();
      const form = await AnnualAccountData.create(formData);
      if (form) {
        formData.createdAt = form.createdAt;
        formData.modifiedAt = form.modifiedAt;
        await form.save();
        const addedHistory = await AnnualAccountData.findOneAndUpdate(
          condition,
          { $push: { "history": formData } },
          { new: true, runValidators: true }
        );
        if (!addedHistory) {
          return res.status(400).json({
            status: false,
            message: "Form history not added."
          })
        } else {
          if (addedHistory) {//email trigger after form submission
            Service.sendEmail(mailOptions);
          }

          return res.status(200).json({
            status: true,
            message: "form submitted",
            data: addedHistory
          })
        }
      }
    } else if (!submittedForm && isDraft) {

      formData.audited.status = "PENDING";
      formData.unAudited.status = 'PENDING';

      const form = await AnnualAccountData.create(formData);
      if (form) {
        formData.createdAt = form.createdAt;
        await form.save()
        formData.modifiedAt = Date.now();
        const addedHistory = await AnnualAccountData.findOneAndUpdate(
          condition,
          formData,
          { new: true, runValidators: true }
        );
        return res.status(200).json({
          status: true,
          message: "form submitted",
          data: addedHistory
        })
      }
    }
    let annualAccountData;
    if (
      !req.body.unAudited.submit_annual_accounts &&
      !req.body.audited.submit_annual_accounts
    ) {
      req.body.status = "N/A";
    }
    req.body.status = "PENDING"
    if (currentAnnualAccounts) {
      annualAccountData = await AnnualAccountData.findOneAndUpdate(
        { ulb: ObjectId(ulb), design_year: ObjectId(design_year), isActive: true },
        { $set: req.body, $push: { history: currentAnnualAccounts } },
        { new: true, runValidators: true }
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



    return res.status(200).json({
      msg: "AnnualAccountData Submitted!",
      isCompleted: !annualAccountData.isDraft,
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.datasetDownload = catchAsync(async (req, res) => {
  let data = [], columns = [], rows = [];
  data = Array.isArray(req.body) ? req.body : []

  let output = {}
  columns = [
    {
      header: "Head Of Account",
      key: "headOfAccount"
    },
    {
      header: "Code",
      key: "code"
    },
    {
      header: "Line Item",
      key: "lineIteName"
    },
    {
      header: "Amount in INR",
      key: "amount"
    }

  ]
  let ledgerData = []
  for (let el of data) {
    let headofAccounts = [];
    if (el.category == "income") {
      headofAccounts.push("Revenue", "Expense")
    } else if (el.category == "balance") {
      headofAccounts.push("Asset", "Liability")
    }
    let lineItems = await LineItem.aggregate([{
      $match: {
        $or: [{ headOfAccount: headofAccounts[0] }, { headOfAccount: headofAccounts[1] }]

      }
    },
    {
      $group: {
        _id: null,
        id: { $addToSet: "$_id" }
      }
    },
    {
      $project: {
        "_id": 0,
        "id": 1
      }
    }

    ])
    ledgerData = await UlbLedger.aggregate([
      {
        $match: {
          ulb: ObjectId(el.ulbId),
          financialYear: el.year,
          lineItem: { $in: lineItems[0]['id'] }
        }
      },

      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineItem"
        }
      },
      { $unwind: "$lineItem" },
      {
        $project: {
          category: el.category,
          headOfAccount: "$lineItem.headOfAccount",
          code: "$lineItem.code",
          lineIteName: "$lineItem.name",
          amount: "$amount",

        }
      },
      { $sort: { "code": 1 } }
    ])
    // console.log("1")
  }
  // console.log("2")
  // rows = ledgerData
  // console.log(ledgerData, columns)
  output = {
    columns: columns,
    rows: ledgerData
  }
  return getExcel(req, res, output);
})

let getExcel = async (req, res, data) => {
  try {
    // console.log(data);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");
    const imageId2 = workbook.addImage({
      buffer: fs.readFileSync("uploads/logos/Group 1.jpeg"),
      extension: "png",
    });
    worksheet.addImage(imageId2, {
      tl: { col: 0, row: 0 },
      br: { col: 8, row: 2 }
    });
    // worksheet.addImage(imageId2, "A1:F3");
    // data.columns.push({ header: "S.no", key: "sno" });
    worksheet.columns = data.columns.map((value) => {
      let temp = {
        header: value.header,
        key: value.key,
      };
      return temp;
    });
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    data.rows.map((value, i) => {
      // value.sno = i + 1;
      console.log(value)
      worksheet.addRow(value);
    });
    worksheet.addRow({ headOfAccount: "Can't find what you are looking for? Reach out to us at contact@cityfinance.in" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=" + "Vishu.xlsx");
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });
  } catch (err) {
    console.error(err.message);
    return res.status(400).json(err);
  }
};

exports.dataset = catchAsync(async (req, res) => {
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
  } else if (type == "Standardised Excel") {
    if (!category)
      category = "income"
    let query = [
      {
        $match: {
          financialYear: year
        }
      },
      {
        $group: {
          _id: "$ulb",
          modifiedAt: { $addToSet: "$modifiedAt" }
        }
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "_id",
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
          type: "excel",
          modifiedAt: { $arrayElemAt: ["$modifiedAt", 0] },
          state: "$state._id",
          ulb: "$ulb.name",
          ulbId: "$ulb._id",
          section: "standardised",
          category: category,
          year: year,
          fileName: {
            $concat: ["$state.name", "_", "$ulb.name", "_", category, "_", year]
          }

        }
      }
    ]
    if (ulb) {
      query.push({
        $match: {
          ulb: ulb
        }
      })
    }
    if (state) {
      query.push({
        $match: {
          "state": ObjectId(state)
        }
      })
    }
    let data = await UlbLedger.aggregate(query)
    if (data.length) {
      return res.status(200).json({
        success: true,
        data: data
      })
    }

  }

  if (year != "2019-20" && year != "2020-21" && !(Number(year.split("-")[1])>20)) {
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
      data.fileUrl = [el?.file?.url];
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
      {
        $lookup:{
            from: "years",
            localField: "unAudited.year",
            foreignField:"_id",
            as: "unAuditedYear"
        }
    },
    {
        $unwind: "$unAuditedYear"
    },
    {
        $lookup:{
            from: "years",
            localField: "audited.year",
            foreignField:"_id",
            as: "auditedYear"
        }
    },
    {
        $unwind: "$auditedYear"
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
    //match for audited and unAudited docs with given year
    const queryYear =  await Year.findOne({year}).lean();
    let queryUnaudited = query.slice();
    query.push({
      $match: {
          $expr: { $or:[
              // {$eq: [ "$unAuditedYear._id",  queryYear._id ]},
              {$eq: ["$auditedYear._id", ObjectId(queryYear._id)]}
              ] },
      }
    })
    queryUnaudited.push({
      $match: {
        $expr: { $or:[
            {$eq: [ "$unAuditedYear._id",  ObjectId(queryYear._id) ]},
            // {$eq: ["$auditedYear._id", queryYear._id]}
            ] },
    }
    })
    // if (year == "2019-20") {
      let query_extn = [
        {
          $project: {
            ulbId: "$ulb._id",
            ulbName: "$ulb.name",
            state: "$state.name",
            modifiedAt: "$modifiedAt",
            [`${year}_balance_pdf`]: [
              "$audited.provisional_data.bal_sheet.pdf.url",
              "$audited.provisional_data.bal_sheet_schedules.pdf.url",
            ],
            [`${year}_balance_excel`]: [
              "$audited.provisional_data.bal_sheet.excel.url",
              "$audited.provisional_data.bal_sheet_schedules.excel.url",
            ],
            [`${year}_income_pdf`]: [
              "$audited.provisional_data.inc_exp.pdf.url",
              "$audited.provisional_data.inc_exp_schedules.pdf.url",
            ],
            [`${year}_income_excel`]: [
              "$audited.provisional_data.inc_exp.excel.url",
              "$audited.provisional_data.inc_exp_schedules.excel.url",
            ],
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
            file: { 
              $exists: true,
               $ne: null
           },
          },
        },
        {
          $sort: {
            modifiedAt: -1,
          },
        },
      ];
      let query_extn_unAudited = [
        {
          $project: {
            ulbId: "$ulb._id",
            ulbName: "$ulb.name",
            state: "$state.name",
            modifiedAt: "$modifiedAt",
            [`${year}_balance_pdf`]: [
              "$unAudited.provisional_data.bal_sheet.pdf.url",
              "$unAudited.provisional_data.bal_sheet_schedules.pdf.url",
            ],
            [`${year}_balance_excel`]: [
              "$unAudited.provisional_data.bal_sheet.excel.url",
              "$unAudited.provisional_data.bal_sheet_schedules.excel.url",
            ],
            [`${year}_income_pdf`]: [
              "$unAudited.provisional_data.inc_exp.pdf.url",
              "$unAudited.provisional_data.inc_exp_schedules.pdf.url",
            ],
            [`${year}_income_excel`]: [
              "$unAudited.provisional_data.inc_exp.excel.url",
              "$unAudited.provisional_data.inc_exp_schedules.excel.url",
            ],
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
            file: { 
              $exists: true,
               $ne: null
           },
          },
        },
        {
          $sort: {
            modifiedAt: -1,
          },
        },
      ]
      query.push(...query_extn);
      queryUnaudited.push(...query_extn_unAudited);
      if (getQuery) return res.status(200).json({query,queryUnaudited});
      let [fileData, fileDataUnAudited] = await Promise.all( [AnnualAccountData.aggregate(query), AnnualAccountData.aggregate(queryUnaudited)]);

      [fileData,fileDataUnAudited].forEach((outerEl,idx) => {
        let fileType = ""
        idx === 0 ?  fileType = "audited": fileType = "unAudited"
        outerEl.forEach((el) => {
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
        data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}_${fileType}`;
        data.fileUrl = el?.file;
  
        finalData.push(data);
      })
      }
      
      
      )


    // } 
    // else if (year == "2020-21") {
    //   let query_extn = [
    //     {
    //       $project: {
    //         ulbId: "$ulb._id",
    //         ulbName: "$ulb.name",
    //         state: "$state.name",
    //         modifiedAt: "$modifiedAt",
    //         "2020-21_balance_pdf":
    //           ["$unAudited.provisional_data.bal_sheet.pdf.url",
    //             "$unAudited.provisional_data.bal_sheet_schedules.pdf.url"],
    //         "2020-21_balance_excel":
    //           ["$unAudited.provisional_data.bal_sheet.excel.url",
    //             "$unAudited.provisional_data.bal_sheet_schedules.excel.url"
    //           ],
    //         "2020-21_income_pdf": ["$unAudited.provisional_data.inc_exp.pdf.url",
    //           "$unAudited.provisional_data.inc_exp_schedules.pdf.url"],
    //         "2020-21_income_excel":
    //           ["$unAudited.provisional_data.inc_exp.excel.url",
    //             "$unAudited.provisional_data.inc_exp_schedules.excel.url"
    //           ],
    //       },
    //     },
    //     {
    //       $project: {
    //         ulbId: 1,
    //         ulbName: 1,
    //         state: 1,
    //         modifiedAt: 1,
    //         file: `$${year}_${category}_${type}`,
    //       },
    //     },
    //     {
    //       $match: {
    //         file: { $exists: true, $ne: null },
    //       },
    //     },
    //     {
    //       $sort: {
    //         modifiedAt: -1,
    //       },
    //     },
    //   ];
    //   query.push(...query_extn);
    //   if (getQuery) return res.status(200).json(query);
    //   let fileData = await AnnualAccountData.aggregate(query);

    //   fileData.forEach((el) => {
    //     let data = {
    //       ulbId: null,
    //       ulbName: "",
    //       state: "",
    //       fileName: "",
    //       fileUrl: "",
    //       modifiedAt: "",
    //       type: type,
    //       audited: "",
    //       year: "",
    //     };
    //     data.ulbId = el?.ulbId;
    //     data.state = el?.state;
    //     data.ulbName = el?.ulbName;
    //     data.modifiedAt = el?.modifiedAt;
    //     data.year = year;
    //     data.fileName = `${el?.state}_${el?.ulbName}_${category}_${year}`;
    //     data.fileUrl = el?.file;

    //     finalData.push(data);
    //   });
    // }
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

exports.nmpcEligibility = catchAsync(async (req, res) => {

  let user = req.decoded
  let cutOff_annual = 25;
  let cutOff_util_nmpc = 100;
  let cutOff_util_mpc = 100;
  let cutOff_slb = 100;
  let { state_id } = req.query;
  let state = user?.state ?? state_id;
  let totalULBs = [
    {
      $match: {
        state: ObjectId(state)
      }
    },
    {
      $lookup: {
        from: "states",
        localField: "state",
        foreignField: "_id",
        as: "state"
      }
    },
    {
      $unwind: "$state"
    },
    {
      $match: {
        "state.accessToXVFC": true
      }
    },
    {

      $match: {
        $or: [{ censusCode: { $exists: true, $ne: '', $ne: null } }, { sbCode: { $exists: true, $ne: '', $ne: null } }]
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "ulb",
        as: "user"
      }
    },
    {
      $unwind: "$user"
    },
    {
      $count: "totalULBCount"
    }
  ]

  let totalNMPCs = [
    {
      $match: {
        isMillionPlus: "No"
      }
    },
    ...totalULBs
  ]
  let totalMPCs = [
    {
      $match: {
        isMillionPlus: "Yes"
      }
    },
    ...totalULBs
  ]
  //common stages of different forms
  let common = [{
    $lookup: {
      from: "ulbs",
      localField: "ulb",
      foreignField: "_id",
      as: "ulb"
    }
  }, {
    $unwind: "$ulb"
  },
  {
    $match: {
      "ulb.state": ObjectId(state)
    }
  }]
  let query_filled_annual = [
    {
      $match: { $and: [{ "audited.submit_annual_accounts": true }, { "unAudited.submit_annual_accounts": true }, { isDraft: false }] }
    },
    {
      $count: "filled"
    }
  ]
  let query_filled_util_nmpc = [
    {
      $match: {
        "ulb.isMillionPlus": "No"
      }
    },
    {
      $match: { status: "APPROVED" }
    },
    {
      $count: "filled"
    }
  ]
  let query_filled_util_mpc = [
    {
      $match: {
        "ulb.isMillionPlus": "Yes"
      }
    },
    {
      $match: { status: "APPROVED" }
    },
    {
      $count: "filled"
    }
  ]
  let query_filled_slb_mpc = [
    {
      $match: {
        "ulb.isMillionPlus": "Yes"
      }
    },
    {
      $match: { "waterManagement.status": "APPROVED" }
    },
    {
      $count: "filled"
    }
  ]

  let actionPlanSubmit = false, waterRejSubmit = false;
  let actionPlanData = await ActionPlan.findOne({ state: ObjectId(state) }).lean()
  let waterRejData = await WaterRejuvenation.findOne({ state: ObjectId(state) }).lean()
  if (actionPlanData) {
    if ((actionPlanData['status'] == 'PENDING' && actionPlanData['isDraft'] == false) || (actionPlanData['status'] == null && actionPlanData['isDraft'] == false) || actionPlanData['status'] == 'APPROVED') {
      actionPlanSubmit = true
    }
  }
  if (waterRejData) {
    if ((waterRejData['status'] == 'PENDING' && waterRejData['isDraft'] == false) || waterRejData['status'] == 'APPROVED') {
      waterRejSubmit = true
    }
  }

  query_filled_annual.unshift(...common)
  query_filled_util_nmpc.unshift(...common)
  query_filled_util_mpc.unshift(...common)
  query_filled_slb_mpc.unshift(...common)

  console.log(util.inspect(totalULBs, { showHidden: false, depth: null }))
  console.log(util.inspect(totalNMPCs, { showHidden: false, depth: null }))
  console.log(util.inspect(totalMPCs, { showHidden: false, depth: null }))
  console.log(util.inspect(query_filled_slb_mpc, { showHidden: false, depth: null }))
  let { totalULBCount, totalNMPCCount, totalMPCCount, filledData_annual, filledData_util_nmpc, filledData_util_mpc, filledData_slb_mpc } = await new Promise(async (resolve, reject) => {
    let prms1 = new Promise(async (rslv, rjct) => {
      let output = await Ulb.aggregate(totalULBs)
      rslv(output);
    });
    let prms2 = new Promise(async (rslv, rjct) => {
      let output = await Ulb.aggregate(totalNMPCs)
      rslv(output);
    });
    let prms3 = new Promise(async (rslv, rjct) => {
      let output = await Ulb.aggregate(totalMPCs);
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
      let output = await SLB.aggregate(query_filled_slb_mpc);
      rslv(output);
    });
    Promise.all([prms1, prms2, prms3, prms4, prms5, prms6, prms7]).then(
      (outputs) => {
        let totalULBCount = outputs[0];
        let totalNMPCCount = outputs[1];
        let totalMPCCount = outputs[2];
        let filledData_annual = outputs[3];
        let filledData_util_nmpc = outputs[4];
        let filledData_util_mpc = outputs[5];
        let filledData_slb_mpc = outputs[6];

        if (totalULBCount && totalNMPCCount && totalMPCCount && filledData_annual && filledData_util_nmpc && filledData_util_mpc && filledData_slb_mpc) {
          resolve({ totalULBCount, totalNMPCCount, totalMPCCount, filledData_annual, filledData_util_nmpc, filledData_util_mpc, filledData_slb_mpc });
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

  year2021 = await Year.findOne({ year: '2020-21' }).lean();
  year2122 = await Year.findOne({ year: '2021-22' }).lean();

  let gtc2021Data = await GTC.findOne({ state: ObjectId(state), design_year: ObjectId(year2021._id), installment: "2" })
  let gtc2122Data = await GTC.findOne({ state: ObjectId(state), design_year: ObjectId(year2122._id), installment: "1" })

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


  if (gtc2021Data) {
    if (gtc2021Data['nonmillion_untied']?.pdfUrl != null || gtc2021Data['nonmillion_untied']?.pdfUrl != "") {
      gtc2021_untied = true;
      gtc2021Url_untied = gtc2021Data['nonmillion_untied']?.pdfUrl;
    }
    if (gtc2021Data['nonmillion_tied']?.pdfUrl != null || gtc2021Data['nonmillion_tied']?.pdfUrl != "") {
      gtc2021_tied = true;
      gtc2021Url_tied = gtc2021Data['nonmillion_tied']?.pdfUrl;
    }
    if (gtc2021Data['million_tied']?.pdfUrl != null || gtc2021Data['million_tied']?.pdfUrl != "") {
      gtc2021_mpc = true;
      gtc2021Url_mpc = gtc2021Data['million_tied']?.pdfUrl;
    }
  }
  if (gtc2122Data) {
    if (gtc2122Data['nonmillion_untied']?.pdfUrl != null || gtc2122Data['nonmillion_untied']?.pdfUrl != "") {
      gtc2122_untied = true;
      gtc2122Url_untied = gtc2122Data['nonmillion_untied']?.pdfUrl;
    }
    if (gtc2122Data['nonmillion_tied']?.pdfUrl != null || gtc2122Data['nonmillion_tied']?.pdfUrl != "") {
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
  let percentage_annual = parseInt(approvedForms_annual / total * 100) ? parseInt(approvedForms_annual / total * 100) : 0
  let percentage_util_nmpc = parseInt(approvedForms_util_nmpc / totalNMPC * 100) ? parseInt(approvedForms_util_nmpc / totalNMPC * 100) : 0
  let percentage_util_mpc = parseInt(approvedForms_util_mpc / totalMPC * 100) ? parseInt(approvedForms_util_mpc / totalMPC * 100) : 0
  let percentage_slb_mpc = parseInt(approvedForms_slb_mpc / totalMPC * 100) ? parseInt(approvedForms_slb_mpc / totalMPC * 100) : 0

  let nmpc_untied_1st_inst_eligible = gtc2021_untied;
  let nmpc_tied_1st_inst_eligible = gtc2021_tied;

  let nmpc_untied_2nd_inst_eligible = (percentage_annual >= cutOff_annual) && gtc2122_untied;
  let nmpc_tied_2nd_inst_eligible = (percentage_annual >= cutOff_annual) && (percentage_util_nmpc >= cutOff_util_nmpc) && gtc2122_tied;

  let mpc_eligible = (percentage_annual >= cutOff_annual) &&
    (percentage_util_mpc >= cutOff_util_mpc) &&
    (percentage_slb_mpc >= cutOff_slb) &&
    gtc2021_mpc &&
    waterRejSubmit &&
    actionPlanSubmit;
  return res.json({
    success: true,
    nmpc_tied: {
      secondInstallment: {
        totalNMPCs: totalNMPC,
        approvedForms_util: approvedForms_util_nmpc,
        percentage_util: percentage_util_nmpc,
        cutOff_util: cutOff_util_nmpc,
        eligible: nmpc_tied_2nd_inst_eligible,
        gtcSubmitted: gtc2122_tied,
        gtcLink: gtc2122Url_tied,
      },
      firstInstallment: {
        eligible: nmpc_tied_1st_inst_eligible,
        gtcSubmitted: gtc2021_tied,
        gtcLink: gtc2021Url_tied,
      }
    },
    nmpc_untied: {
      secondInstallment: {
        totalULBs: total,
        approvedForms_annual: approvedForms_annual,
        percentage_annual: percentage_annual,
        cutOff_annual: cutOff_annual,
        gtcSubmitted: gtc2122_untied,
        gtcLink: gtc2122Url_untied,
        eligible: nmpc_untied_2nd_inst_eligible
      },
      firstInstallment: {
        gtcSubmitted: gtc2021_untied,
        gtcLink: gtc2021Url_untied,
        eligible: nmpc_untied_1st_inst_eligible
      }
    },
    mpc: {
      eligible: mpc_eligible,
      totalMPCs: totalMPC,
      gtcSubmitted: gtc2021_mpc,
      gtcLink: gtc2021Url_mpc,
      approvedForms_util: approvedForms_util_mpc,
      percentage_util: percentage_util_mpc,
      cutOff_util: cutOff_util_mpc,
      approvedForms_slb: approvedForms_slb_mpc,
      percentage_slb: percentage_slb_mpc,
      cutOff_slb: cutOff_slb,
      actionPlan: actionPlanSubmit,
      waterRej: waterRejSubmit

    }


  })

})
exports.getAccounts = async (req, res) => {
  try {
    let role = req.decoded.role;
    let { design_year, ulb } = req.query;
    if (!ulb || ulb == null || ulb == 'null') {
      ulb = req.decoded.ulb;
    }
    let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
    let currYearData = await Year.findOne({ _id: ObjectId(design_year) }).lean();
    let prevYearVal;
    prevYearVal = findPreviousYear(currYearData.year);
    let prevYearData = await Year.findOne({ year: prevYearVal }).lean();
    let prevStatus = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: prevYearData._id
    }).select({ status: 1, isDraft: 1, actionTakenByRole: 1 }).lean()

    let status = '';
    if (prevStatus) {
      status = calculateStatus(prevStatus.status, prevStatus.actionTakenByRole, prevStatus.isDraft, "ULB")
    }
    let annualAccountData = {}
    console.log(status)
    let dataCollection = {}
    dataCollection = await DataCollection.findOne({ ulb: ObjectId(ulb) }).lean()
    let dataSubmittedByOpenPage = false
    if (dataCollection && dataCollection.hasOwnProperty("documents") && Array.isArray(dataCollection?.documents?.financial_year_2019_20?.pdf) && (dataCollection?.documents?.financial_year_2019_20?.pdf).length > 0) {
      dataSubmittedByOpenPage = true
      status = 'Submitted through Open Page'
    }
    let obj = {}
    if (!ulbData.access_2122) {
      obj['action'] = 'not_show';
      obj['url'] = ``;
    } else {
      if (status == STATUS_LIST.Under_Review_By_MoHUA || status == STATUS_LIST.Under_Review_By_State || status == STATUS_LIST.Approved_By_MoHUA || dataSubmittedByOpenPage) {
        annualAccountData['action'] = 'not_show';
        annualAccountData['url'] = `Your previous Year's form status is - ${status}`;
      } else {
        annualAccountData['action'] = 'redirect'
        annualAccountData['url'] = `Your previous Year's form status is - ${status ? status : 'Not Submitted'} .Kindly submit Annual Accounts for the previous year at - <a href=${req.get("origin")}/upload-annual-accounts target="_blank">Click Here!</a> . `;
      }
    }

    obj = annualAccountData;



    ulb = req?.decoded.ulb ?? ulb;


    annualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year
    }).select({ history: 0 });
    if (!annualAccountData) {

      return res.status(400).json(obj);

    }
    annualAccountData = JSON.parse(JSON.stringify(annualAccountData));
    if (
      req.decoded.role === "MoHUA" &&
      annualAccountData.actionTakenByRole === "STATE" &&
      annualAccountData.status == "APPROVED"
    ) {
      // annualAccountData.status = "PENDING";
      if (annualAccountData.design_year !== YEAR_CONSTANTS["22_23"]) {
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

    }
    Object.assign(annualAccountData, obj)
    Object.assign(annualAccountData, { canTakeAction: canTakenAction(annualAccountData['status'], annualAccountData['actionTakenByRole'], annualAccountData['isDraft'], "ULB", role) })
    // Object.assign(annualAccountData, {canTakeAction: false })
    if (annualAccountData?.status === "PENDING" && (role === "STATE" || role === "MoHUA")) {
      annualAccountData.unAudited.rejectReason_state = "";
      annualAccountData.unAudited.responseFile_state = {
        url: "",
        name: ""
      }
      annualAccountData.unAudited.rejectReason_mohua = ""
      annualAccountData.unAudited.responseFile_mohua = {
        url: "",
        name: ""
      }
      annualAccountData.audited.rejectReason_state = "";
      annualAccountData.audited.responseFile_state = {
        url: "",
        name: ""
      }
      annualAccountData.audited.rejectReason_mohua = ""
      annualAccountData.audited.responseFile_mohua = {
        url: "",
        name: ""
      }

      clearResponseReason(annualAccountData);

    }
    return res.status(200).json(annualAccountData);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

function clearResponseReason(formData) {

  for (let key in formData) {
    if (key === "audited" || key === "unAudited") {
      for (let innerKey in formData[key]) {
        if (innerKey === "provisional_data") {
          for (let innerKey2 in formData[key][innerKey]) {
            if (
              typeof formData[key][innerKey][innerKey2] === "object" &&
              formData[key][innerKey][innerKey2] != null
            ) {
              formData[key][innerKey][innerKey2].rejectReason_state = "";
              formData[key][innerKey][innerKey2].responseFile_state = {
                url: "",
                name: ""
              };
              formData[key][innerKey][innerKey2].rejectReason_mohua = ""
              formData[key][innerKey][innerKey2].responseFile_mohua = {
                url: "",
                name: ""
              };
            }
          }
        }
      }
    }
  }
}
exports.getCSVAudited = catchAsync(async (req, res) => {
  let filename = "Annual_Accounts-Audited.csv";


  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  res.write(
    "Design Year,Data Year,ULB name, Census Code, SB Code, ULB Code, State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Auditor Report, Standardized Excel, Form Status  \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let statusList = [
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
    // {$match : {"ulb" : ObjectId("5fa2465f072dab780a6f1292")}},
    {
      $lookup: {
        from: "years",
        localField: "design_year",
        foreignField: "_id",
        as: "year"
      }
    },
    {
      $unwind: "$year"
    },
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
      $lookup: {
        from: "years",
        localField: "audited.year",
        foreignField: "_id",
        as: "dataYear"
      }
    },
    { $unwind: "$dataYear" },
    {

      $project: {
        ulbName: "$ulb.name",
        censusCode: "$ulb.censusCode",
        sbCode: "$ulb.sbCode",
        ulbCode: "$ulb.code",
        state: "$state.name",
        submittedOn: "$createdAt",
        bal_sheet: "$audited.provisional_data.bal_sheet.pdf.url",
        bal_sheet_schedules: "$audited.provisional_data.bal_sheet_schedules.pdf.url",
        inc_exp: "$audited.provisional_data.inc_exp.pdf.url",
        inc_exp_schedules: "$audited.provisional_data.inc_exp_schedules.pdf.url",
        cash_flow: "$audited.provisional_data.cash_flow.pdf.url",
        auditor_report: "$audited.provisional_data.auditor_report.pdf.url",
        standardized_excel: "$audited.standardized_data.excel.url",
        audited_answer: "$audited.submit_annual_accounts",
        unaudited_answer: "$unAudited.submit_annual_accounts",
        isDraft: "$isDraft",
        status: "$status",
        role: "$actionTakenByRole",
        dataYear: "$dataYear.year",
        year: "$year.year"
      }
    }]).exec((err, data) => {
      if (err) {
        res.json({
          success: false,
          msg: "Invalid Payload",
          data: err.toString(),
        });
      } else {
        for (el of data) {
          if (!el.submittedOn) {
            el.submittedOn = 'Not Submitted'
          }
          if (!el.bal_sheet) {
            el.bal_sheet = 'Not Submitted'
          }
          if (!el.bal_sheet_schedules) {
            el.bal_sheet_schedules = 'Not Submitted'
          }
          if (!el.inc_exp) {
            el.inc_exp = 'Not Submitted'
          }
          if (!el.inc_exp_schedules) {
            el.inc_exp_schedules = 'Not Submitted'
          }
          if (!el.cash_flow) {
            el.cash_flow = 'Not Submitted'
          }
          if (!el.auditor_report) {
            el.auditor_report = 'Not Submitted'
          }

          if (el.role == 'ULB' && el.isDraft) {
            el['formStatus'] = statusList[0]
          } else if (el.role == 'ULB' && !el.isDraft) {
            if (el.audited_answer && el.unaudited_answer) {
              el['formStatus'] = statusList[1]
            } else {
              el['formStatus'] = statusList[2]
            }

          } else if (el.role == 'STATE' && el.isDraft) {
            el['formStatus'] = statusList[4]
          } else if (el.role == 'STATE' && !el.isDraft) {
            if (el.status == 'APPROVED') {
              el['formStatus'] = statusList[3]
            } else if (el.status == 'REJECTED') {
              el['formStatus'] = statusList[5]
            }
          } else if (el.role == 'MoHUA' && el.isDraft) {
            el['formStatus'] = statusList[0]
            // el['formStatus'] = statusList[8]
          } else if (el.role == 'MoHUA' && !el.isDraft) {
            if (el.status == 'APPROVED') {
              el['formStatus'] = statusList[7]
            } else if (el.status == 'REJECTED') {
              el['formStatus'] = statusList[8] 
            }
          }
        }

        for (el of data) {
          res.write(
            el.year +
            "," +
            el.dataYear +
            "," +
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
    "Design Year,Data Year,ULB name, Census Code, SB Code, ULB Code,  State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Standardized Excel, Form Status \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let statusList = [
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
        from: "years",
        localField: "design_year",
        foreignField: "_id",
        as: "year"
      }
    },
    {
      $unwind: "$year"
    },
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
    { $unwind: "$state" },
    {
      $lookup: {
        from: "years",
        localField: "unAudited.year",
        foreignField: "_id",
        as: "dataYear"
      }
    },
    { $unwind: "$dataYear" },
    {
      $project: {
        ulbName: "$ulb.name",
        censusCode: "$ulb.censusCode",
        sbCode: "$ulb.sbCode",
        ulbCode: "$ulb.code",
        state: "$state.name",
        submittedOn: "$createdAt",
        bal_sheet: "$unAudited.provisional_data.bal_sheet.pdf.url",
        bal_sheet_schedules: "$unAudited.provisional_data.bal_sheet_schedules.pdf.url",
        inc_exp: "$unAudited.provisional_data.inc_exp.pdf.url",
        inc_exp_schedules: "$unAudited.provisional_data.inc_exp_schedules.pdf.url",
        cash_flow: "$unAudited.provisional_data.cash_flow.pdf.url",
        standardized_excel: "$unAudited.standardized_data.excel.url",
        audited_answer: "$audited.submit_annual_accounts",
        unaudited_answer: "$unAudited.submit_annual_accounts",
        isDraft: "$isDraft",
        status: "$status",
        role: "$actionTakenByRole",
        dataYear: "$dataYear.year",
        year: "$year.year"
      }
    }]).exec((err, data) => {
      if (err) {
        res.json({
          success: false,
          msg: "Invalid Payload",
          data: err.toString(),
        });
      } else {
        for (el of data) {
          if (!el.submittedOn) {
            el.submittedOn = 'Not Submitted'
          }
          if (!el.bal_sheet) {
            el.bal_sheet = 'Not Submitted'
          }
          if (!el.bal_sheet_schedules) {
            el.bal_sheet_schedules = 'Not Submitted'
          }
          if (!el.inc_exp) {
            el.inc_exp = 'Not Submitted'
          }
          if (!el.inc_exp_schedules) {
            el.inc_exp_schedules = 'Not Submitted'
          }
          if (!el.cash_flow) {
            el.cash_flow = 'Not Submitted'
          }

          if (el.role == 'ULB' && el.isDraft) {
            el['formStatus'] = statusList[0]
          } else if (el.role == 'ULB' && !el.isDraft) {
            if (el.audited_answer && el.unaudited_answer) {
              el['formStatus'] = statusList[1]
            } else {
              el['formStatus'] = statusList[2]
            }

          } else if (el.role == 'STATE' && el.isDraft) {
            el['formStatus'] = statusList[4]
          } else if (el.role == 'STATE' && !el.isDraft) {
            if (el.status == 'APPROVED') {
              el['formStatus'] = statusList[3]
            } else if (el.status == 'REJECTED') {
              el['formStatus'] = statusList[5]
            }

          } else if (el.role == 'MoHUA' && el.isDraft) {
            el['formStatus'] = statusList[8]
          } else if (el.role == 'MoHUA' && !el.isDraft) {
            if (el.status == 'APPROVED') {
              el['formStatus'] = statusList[7]
            } else if (el.status == 'REJECTED') {
              el['formStatus'] = statusList[9]

            }

          }

        }
        for (el of data) {
          res.write(
            el.year +
            "," +
            el.dataYear +
            "," +
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
exports.dashboard = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query
  if (state_id == 'null') {
    state_id = null
  }

  let data = {
    audited: {
      notStarted: 0,
      inProgress: 0,
      submitted: 0,
      notSubmitted: 0,
      approvedbyState: 0,
      approvedByMoHUA: 0
    },
    provisional: {
      notStarted: 0,
      inProgress: 0,
      submitted: 0,
      notSubmitted: 0,
      approvedbyState: 0,
      approvedByMoHUA: 0

    }
  }
  let state = user.state ?? state_id
  if (user.role == 'STATE') {
    let query_audited = [
      {
        $project: {
          "answer": "$audited.submit_annual_accounts",
          data: "$audited.provisional_data",
          actionTakenByRole: 1,
          isDraft: 1,
          status: 1,
          ulb: 1
        }
      },
      {
        $group: {
          _id: {
            role: "$actionTakenByRole",
            isDraft: "$isDraft",
            status: "$status",
            answer: "$answer"
          },
          count: { $sum: 1 },
          ulb: { $addToSet: "$ulb" }
        }
      },
    ]
    let query_unAudited = [
      {
        $project: {
          "answer": "$unAudited.submit_annual_accounts",
          data: "$unAudited.provisional_data",
          actionTakenByRole: 1,
          isDraft: 1,
          status: 1,
          ulb: 1
        }
      },
      {
        $group: {
          _id: {
            role: "$actionTakenByRole",
            isDraft: "$isDraft",
            status: "$status",
            answer: "$answer"
          },
          count: { $sum: 1 },
          ulb: { $addToSet: "$ulb" }
        }
      },
    ]

    let { audited, unAudited } = await new Promise(async (resolve, reject) => {
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


          if (audited && unAudited) {
            resolve({ audited, unAudited });
          } else {
            reject({ message: "No Data Found" });
          }
        },
        (e) => {
          reject(e);
        }
      );
    });
    for (let el of audited) {
      // clicked No
      if (!el._id.answer) {
        data.audited.notSubmitted = data.audited.notSubmitted + el.count
      } else {
        // clicked Yes
        if (el._id.role == 'ULB' && el._id.isDraft) {
          data.audited.inProgress = data.audited.inProgress + el.count
        } else if (el._id.role == 'ULB' && !el._id.isDraft) {
          data.audited.submitted = data.audited.submitted + el.count
        }
      }
    }
  } else if (user.role == 'MoHUA' || 'ADMIN' || 'PARTNER') {

  } else {
    return res.status(403).json({
      success: false,
      message: "Not Authenticated to Access this Data"
    })
  }
})

exports.action = async (req, res) => {
  try {
    let { ulb, design_year, isDraft } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();
    req.body.actionTakenByRole = req.decoded.role;
    const actionTakenByRole = req.body.actionTakenByRole;
    let currentAnnualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
    }).select({
      history: 0,
    }).lean();

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
    if (design_year != "606aaf854dff55e6c075d219")
      req.body = calculateTabwiseStatus(req.body)

    if (design_year == "606aaf854dff55e6c075d219")
      await UpdateMasterSubmitForm(req, "annualAccounts");

    delete req.body.rejectReason
    //   for(let key in req.body.audited.provisional_data){
    //     if(typeof req.body.audited.provisional_data[key] == 'object' && req.body.audited.provisional_data[key] != null){
    //         if(req.body.audited.provisional_data[key]){
    //             if(actionTakenByRole === "STATE"){
    //                 req.body.audited.provisional_data[key]['rejectReason_state'] = req.body.audited.provisional_data[key]['rejectReason']
    //                 req.body.audited.provisional_data[key]['responseFile_state'] = req.body.audited.provisional_data[key]['responseFile']
    //             }
    //             else if(actionTakenByRole === "MoHUA"){
    //                 req.body.audited.provisional_data[key]['rejectReason_mohua'] = req.body.audited.provisional_data[key]['rejectReason']
    //                 req.body.audited.provisional_data[key]['responseFile_mohua'] = req.body.audited.provisional_data[key]['responseFile']
    //             }
    //         }
    //     }


    // }
    // for(let key in req.body.unAudited.provisional_data){
    //     if(typeof req.body.unAudited.provisional_data[key] == 'object' && req.body.audited.provisional_data[key] != null){
    //         if(req.body.unAudited.provisional_data[key]){
    //             if(actionTakenByRole === "STATE"){
    //                 req.body.unAudited.provisional_data[key]['rejectReason_state'] = req.body.unAudited.provisional_data[key]['rejectReason'];
    //                 req.body.unAudited.provisional_data[key]['responseFile_state'] = req.body.unAudited.provisional_data[key]['responseFile']
    //             }else if(actionTakenByRole === "MoHUA"){
    //                 req.body.unAudited.provisional_data[key]['rejectReason_mohua'] = req.body.unAudited.provisional_data[key]['rejectReason']
    //                 req.body.unAudited.provisional_data[key]['responseFile_mohua'] = req.body.unAudited.provisional_data[key]['responseFile']
    //             }
    //         }
    //     }
    // }
    // if(req.body.audited){
    //   if(actionTakenByRole === "STATE"){
    //       req.body.audited['rejectReason_state'] = req.body.audited.rejectReason
    //       req.body.audited['responseFile_state'] = req.body.audited.responseFile
    //   }else if(actionTakenByRole === "MoHUA"){
    //      req.body.audited['rejectReason_mohua'] = req.body.audited.rejectReason
    //       req.body.audited['responseFile_mohua'] = req.body.audited.responseFile
    //   }
    // }
    // if(req.body.unAudited){
    //   if(actionTakenByRole === "STATE"){
    //       req.body.unAudited['rejectReason_state'] = req.body.unAudited.rejectReason
    //       req.body.unAudited['responseFile_state'] = req.body.unAudited.responseFile
    //   }else if(actionTakenByRole === "MoHUA"){
    //       req.body.unAudited['rejectReason_mohua'] = req.body.unAudited.rejectReason
    //       req.body.unAudited['responseFile_mohua'] = req.body.unAudited.responseFile
    //   }
    // }
    currentAnnualAccountData.audited = req.body.audited;
    currentAnnualAccountData.unAudited = req.body.unAudited
    currentAnnualAccountData.modifiedAt = new Date();
    currentAnnualAccountData.status= req.body.status;
    currentAnnualAccountData.actionTakenByRole = actionTakenByRole;
    currentAnnualAccountData.actionTakenBy = req.body.actionTakenBy;

    const newAnnualAccountData = await AnnualAccountData.findOneAndUpdate(
      { ulb: ObjectId(ulb), design_year: ObjectId(design_year) },
      { $set: req.body, $push: { history: currentAnnualAccountData } }
    );

    if (!newAnnualAccountData) {
      return res.status(400).json({
        msg: "no AnnualAccountData found",
      });
    }

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



module.exports.updateAnnualAccForms = async (req, res) => {

  let condition = {
    design_year: "606aafb14dff55e6c075d3ae",
  }

  let updatedForms = [];
  let annualAccForms = await AnnualAccountData.find(condition)
    .select({ history: 0 }).lean()

  for (let i = 0; i < annualAccForms.length; i++) {
    let form = annualAccForms[i];
    let formStatus = calculateStatus(form.status, form.actionTakenByRole, form.isDraft, "ULB");
    updateKeys(formStatus, form);
    delete form["history"];
    let newForm = await AnnualAccountData.findOneAndUpdate({
      design_year: form.design_year,
      ulb: form.ulb
    }, {
      $set: form
    }, {
      new: true
    })
    updatedForms.push(newForm);
  }

  return res.status(200).json({
    success: true,
    data: updatedForms
  })
}

function updateKeys(formStatus, form) {
  if (
    formStatus === STATUS_LIST.In_Progress ||
    formStatus === STATUS_LIST.Under_Review_By_State
  ) {

    addKeysToObj(form);

  } else if (
    formStatus === STATUS_LIST.Approved_By_State ||
    formStatus === STATUS_LIST.Rejected_By_State ||
    formStatus === STATUS_LIST.Under_Review_By_MoHUA
  ) {
    addKeysToObj(form);

  } else if (
    formStatus === STATUS_LIST.Approved_By_MoHUA ||
    formStatus === STATUS_LIST.Rejected_By_MoHUA
  ) {

  }
}

function addKeysToObj(formData) {

  for (let key in formData) {
    if (key === "audited" || key === "unAudited") {

      if (formData.actionTakenByRole === "STATE") {
        formData[key].rejectReason_state = formData[key].rejectReason ?? "";
        formData[key].responseFile_state = formData[key].responseFile ?? { url: "", name: "" };
        formData[key].rejectReason_mohua = "";
        formData[key].responseFile_mohua = {
          url: "",
          name: ""
        };
      } else if (formData.actionTakenByRole === "MoHUA") {
        formData[key].rejectReason_mohua = formData[key].rejectReason ?? "";
        formData[key].responseFile_mohua = formData[key].responseFile ?? { url: "", name: "" };
      } else if (formData.actionTakenByRole === "ULB") {
        formData[key].rejectReason_state = "";
        formData[key].responseFile_state = {
          url: "",
          name: "",
        };
        formData[key].rejectReason_mohua = "";
        formData[key].responseFile_mohua = {
          url: "",
          name: "",
        };
      }

      for (let innerKey in formData[key]) {
        if (innerKey === "provisional_data") {
          for (let innerKey2 in formData[key][innerKey]) {
            if (
              typeof formData[key] === "object" &&
              formData[key][innerKey][innerKey2] != null
            ) {
              if (formData.actionTakenByRole === "STATE") {
                formData[key][innerKey][innerKey2].rejectReason_state =
                  formData[key][innerKey][innerKey2].rejectReason ?? "";
                formData[key][innerKey][innerKey2].responseFile_state =
                  formData[key][innerKey][innerKey2].responseFile ?? { url: "", name: "" };
                formData[key].rejectReason_mohua = "";
                formData[key].responseFile_mohua = {
                  url: "",
                  name: ""
                };
              } else if (formData.actionTakenByRole === "MoHUA") {
                formData[key][innerKey][innerKey2].rejectReason_mohua =
                  formData[key][innerKey][innerKey2].rejectReason;
                formData[key][innerKey][innerKey2].responseFile_mohua =
                  formData[key][innerKey][innerKey2].responseFile;
              }
              else if (formData.actionTakenByRole === "ULB") {
                formData[key][innerKey][innerKey2].rejectReason_state = "";
                formData[key][innerKey][innerKey2].responseFile_state = {
                  url: "",
                  name: "",
                };
                formData[key][innerKey][innerKey2].rejectReason_mohua = "";
                formData[key][innerKey][innerKey2].responseFile_mohua = {
                  url: "",
                  name: "",
                };
              }
            }
          }
        }
      }
    }
  }
}