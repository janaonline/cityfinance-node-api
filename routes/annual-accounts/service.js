const AnnualAccountData = require("../../models/AnnualAccounts");
const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const catchAsync = require('../../util/catchAsync')
const moment = require("moment");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
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

    await UpdateMasterSubmitForm(req, "annualAccounts");

    return res.status(200).json({
      msg: "AnnualAccountData Submitted!",
      isCompleted: !annualAccountData.isDraft,
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.nmpcEligibility = catchAsync(async(req,res)=>{
  let user = req.decoded
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
  let query_filled = [
    {
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
  },
    {
        $match:{$and:[{"audited.submit_annual_accounts":true},{"unAudited.submit_annual_accounts":true}, {isDraft: false}]}
        },
        {
        $group:{
           _id:{
               role:"$actionTakenByRole",
               status:"$status"
               },
               count:{$sum:1}
            }
        }
        ]
     let totalULBCount =   await Ulb.aggregate(totalULBs)
  let filledData = await AnnualAccountData.aggregate(query_filled)
  let approvedForms = 0
  filledData.forEach(el =>{
// let role = el._id.role;
let status = el._id.status;

if(status == 'APPROVED'){
  approvedForms = approvedForms + el.count
}

  })
  let total = totalULBCount[0].totalULBCount
let percentage = parseInt(approvedForms/total * 100)
return res.json({
  success: true,
  totalULBs : total,
  approvedForms:approvedForms,
  percentage : percentage
})

})
exports.getAccounts = async (req, res) => {
  try {
    let { design_year, ulb } = req.query;
    if (req.decoded.role == "ULB") ulb = req?.decoded.ulb;
    let annualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year,
      isActive: true,
    }).select({ history: 0 });

    if (!annualAccountData) {
      return res.status(400).json({ msg: "No AnnualAccountData found" });
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
    "ULB name, Census Code, SB Code, ULB Code, State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Auditor Report, Standardized Excel  \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

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
        standardized_excel: "$audited.standardized_data.excel.url"
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
    "ULB name, Census Code, SB Code, ULB Code,  State, Submission Date, Balance Sheet, Balance Sheet Schedules, Income Expenditure, Income Expenditure Schedules, Cash Flow, Standardized Excel \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

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
        standardized_excel: "$unAudited.standardized_data.excel.url"
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
            "\r\n"
          );
        }
        res.end();

      }
    })

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

