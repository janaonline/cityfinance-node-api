const UtilizationReport = require("../../models/UtilizationReport");
const Ulb = require("../../models/Ulb");
const User = require("../../models/User");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Category = require("../../models/Category");
const FORM_STATUS = require("../../util/newStatusList");
const Year = require('../../models/Year')
const catchAsync = require('../../util/catchAsync')
const { calculateStatus } = require('../CommonActionAPI/service')
const { canTakenAction } = require('../CommonActionAPI/service')
const Service = require('../../service');
const { FormNames } = require('../../util/FormNames');
const MasterForm = require('../../models/MasterForm')
const { YEAR_CONSTANTS } = require("../../util/FormNames");

function update2223from2122() {

}

const BackendHeaderHost = {
  Demo: "democityfinanceapi.dhwaniris.in",
  Staging: "staging.cityfinance.in",
  Prod: "cityfinance.in",
}
const FrontendHeaderHost = {
  Demo: "democityfinance.dhwaniris.in",
  Staging: "staging.cityfinance.in",
  Prod: "cityfinance.in",
}
const {
  emailTemplate: { utilizationRequestAction },
  sendEmail,
} = require("../../service");
const { ElasticBeanstalk } = require("aws-sdk");
const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};
module.exports.createOrUpdate = async (req, res) => {
  try {
    const { financialYear, isDraft, designYear } = req.body;
    const ulb = req.decoded?.ulb;
    req.body.ulb = ulb;
    req.body.actionTakenBy = req.decoded?._id;
    req.body.actionTakenByRole = req.decoded?.role;
    req.body.modifiedAt = new Date();

    const formName = FormNames["dur"];
    const { name: ulbName } = req.decoded;
    let userData = await User.find({
      $or: [
        { isDeleted: false, ulb: ObjectId(ulb), role: 'ULB' },
        { isDeleted: false, state: ObjectId(req?.decoded.state), role: 'STATE', isNodalOfficer: true },
      ]
    }
    ).lean();

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
    emailAddress = Array.from(new Set(emailAddress))
    if (process.env.ENV === "demo") {
      emailAddress = []
    }
    let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(
      ulbName,
      formName
    );
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
    if (req.decoded.role == 'ULB') {
      formData['status'] = 'PENDING'
    }
    let condition = {};
    condition.designYear = designYear;
    condition.financialYear = financialYear;
    condition.ulb = ulb;

    if (req.body.ulb) {
      formData["ulb"] = ObjectId(ulb);
    }
    if (financialYear) {
      formData["financialYear"] = ObjectId(financialYear);
    }
    if (designYear) {
      formData["designYear"] = ObjectId(designYear);
    }


    const submittedForm = await UtilizationReport.findOne(condition);
    if (designYear == "606aaf854dff55e6c075d219") {
      let utiData = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(ulb), financialYear, designYear },
        { $set: req.body },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      if (utiData) {
        await UtilizationReport.findOneAndUpdate(
          {
            ulb: ObjectId(ulb),
            designYear: ObjectId("606aafb14dff55e6c075d3ae"),
            financialYear: ObjectId("606aaf854dff55e6c075d219")
          },
          { $set: { "grantPosition.unUtilizedPrevYr": utiData?.grantPosition?.closingBal } },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        )
        await UpdateMasterSubmitForm(req, "utilReport");
        return res.status(200).json({
          success: true,
          isCompleted: formData['isDraft'] ? false : true,
          message: "Form Submitted"
        })
      }
    } else {
      if (submittedForm && !submittedForm.isDraft && submittedForm.actionTakenByRole == "ULB") {// form already submitted
        return res.status(200).json({
          status: true,
          message: "Form already submitted."
        })
      }
      if (!submittedForm && !isDraft) {// final submit in first attempt
        formData['ulbSubmit'] = new Date();
        const form = await UtilizationReport.create(formData);
        if (form) {
          formData.createdAt = form.createdAt;
          formData.modifiedAt = form.modifiedAt;

          if (formData.projects.length > 0) {
            for (let i = 0; i < formData.projects.length; i++) {
              let project = formData.projects[i];

              project.modifiedAt = form.projects[i].modifiedAt;
              project.createdAt = form.projects[i].createdAt;

              if (project.category) {
                project.category = ObjectId(project.category)
              }
              if (project._id) {
                project._id = ObjectId(project._id);
              }

            }
          }

          const addedHistory = await UtilizationReport.findOneAndUpdate(
            condition,
            { $push: { "history": formData } },
            { new: true, runValidators: true }
          );
          if (!addedHistory) {
            return res.status(400).json({
              status: false,
              message: "Form history not added"
            })
          } else {
            if (addedHistory) {
              //email trigger after form submission
              Service.sendEmail(mailOptions);
            }
            return res.status(200).json({
              status: true,
              data: addedHistory
            })
          }
        } else {
          return res.status(400).json({
            status: false,
            message: "Form not submitted"
          })
        }
      }



      let currentSavedUtilRep;
      if (req.body?.isDraft === false) {
        req.body.status = "PENDING";
        req.body.rejectReason = null;
        currentSavedUtilRep = await UtilizationReport.findOne(
          { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
          { history: 0 }
        );
      }



      let savedData;
      if (currentSavedUtilRep) {
        req.body['ulbSubmit'] = new Date();
        savedData = await UtilizationReport.findOneAndUpdate(
          { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
          { $set: req.body, $push: { history: req.body } },
          { new: true, runValidators: true }
        );
        if (savedData) {
          //email trigger after form submission
          Service.sendEmail(mailOptions);
        }
      } else {
        savedData = await UtilizationReport.findOneAndUpdate(
          { ulb: ObjectId(ulb), financialYear, designYear },
          { $set: req.body },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
      }

      if (savedData) {


        return res.status(200).json({
          msg: "Utilization Report Submitted Successfully!",
          isCompleted: !savedData.isDraft,
        });
      } else {
        return res.status(400).json({
          msg: "Failed to Submit Data",
        });
      }
    }

  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.read = async (req, res) => {
  try {
    const reports = await UtilizationReport.find(
      { isActive: true },
      { history: 0 }
    );

    return res.status(200).json(reports);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.readById = async (req, res) => {
  const { financialYear, designYear, ulb_id } = req.params;
  let ulb = req.decoded?.ulb;
  if (req.decoded?.role != "ULB" && ulb_id) {
    ulb = ulb_id;
  }
  let query = [
    {
      $match: {
        ulb: ObjectId(ulb),
        designYear: ObjectId(designYear),
        financialYear: ObjectId(financialYear),
      },
    },
    {
      $unwind: "$projects",
    },
    {
      $group: {
        _id: "$projects.category",
        count: { $sum: 1 },
        amount: { $sum: { $toDouble: "$projects.expenditure" } },
        totalProjectCost: { $sum: { $toDouble: "$projects.cost" } },
      },
    },
  ];
  let arr = await UtilizationReport.aggregate(query);

  let catData = await Category.find().lean().exec();
  let flag = 0;
  let filteredCat = [];

  for (let el of catData) {
    for (let el2 of arr) {
      if (el2["_id"] != null && String(el["_id"]) === String(el2["_id"])) {
        // console.log(ObjectId(el._id), ObjectId(el2._id))
        flag = 1;
        break;
      }
    }
    if (!flag) {
      filteredCat.push(el);
    } else {
      flag = 0;
    }
  }

  console.log(filteredCat);
  filteredCat.forEach((el) => {
    arr.push({
      _id: el._id,
      count: 0,
      amount: 0,
      totalProjectCost: 0,
    });
  });

  let arrNew = arr.filter((el) => el["_id"] != null);

  try {
    let report = await UtilizationReport.findOne({
      ulb,
      financialYear,
      designYear,
      isActive: true,
    })
      .select({ history: 0 })
      .lean();

    if (report == null) {
      report = {
        categoryWiseData_wm: [],
        categoryWiseData_swm: [],
      };
      const swm_category = ["Sanitation", "Solid Waste Management"];
      const wm_category = [
        "Rejuvenation of Water Bodies",
        "Drinking Water",
        "Rainwater Harvesting",
        "Water Recycling",
      ];
      let i = 0;
      for (let el of wm_category) {
        report["categoryWiseData_wm"].push({
          category_name: el,
          grantUtilised: null,
          numberOfProjects: null,
          totalProjectCost: null,
        });
        i++;
      }
      i = 0;
      for (let el of swm_category) {
        report["categoryWiseData_swm"].push({
          category_name: el,
          grantUtilised: null,
          numberOfProjects: null,
          totalProjectCost: null,
        });
        i++;
      }
    }

    report["analytics"] = arrNew;
    if (
      req.decoded.role === "MoHUA" &&
      report?.actionTakenByRole === "STATE" &&
      report?.status == "APPROVED"
    ) {
      report.status = "PENDING";
      report.rejectReason = null;
    }

    return res.json(report);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.update = async (req, res) => {
  const { financialYear } = req.params;
  const ulb = req.decoded?._id;

  try {
    const report = await UtilizationReport.findOneAndUpdate(
      { ulb, financialYear, isActive: true },
      req.body,
      {
        returnOriginal: false,
      }
    );

    if (!report)
      return res.json({ msg: `No UtilizationReport with that id of ${id}` });

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error(err.message);
    return res.status(400).json({ msg: err.message });
  }
};

exports.remove = async (req, res) => {
  const { financialYear } = req.params;
  const ulb = req.decoded?._id;
  try {
    const report = await UtilizationReport.findOneAndUpdate(
      { ulb, financialYear, isActive: true },
      {
        isActive: false,
      }
    );
    if (!report) {
      return res.status(400).json({ msg: "No UtilizationReport found" });
    }
    res.status(200).json({ msg: "UtilizationReport Deleted" });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    const data = req.body,
      user = req.decoded;
    const { financialYear, designYear } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    let currentState = await UtilizationReport.findOne(
      { ulb: ObjectId(data.ulb), designYear, isActive: true },
      { history: 0 }
    );
    let updateData = {
      status: data?.status,
      actionTakenBy: user?._id,
      rejectReason: data?.rejectReason,
      modifiedAt: new Date(),
      actionTakenByRole: user.role,
    };
    if (!currentState) {
      return res.status(400).json({ msg: "Requested record not found." });
    } else {
      let updatedRecord = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(data.ulb), isActive: true, financialYear, designYear },
        { $set: updateData, $push: { history: currentState } }
      );
      if (!updatedRecord) {
        return res.status(400).json({ msg: "No Record Found" });
      }
      if (designYear == "606aaf854dff55e6c075d219")
        await UpdateMasterSubmitForm(req, "utilReport");
      let newUtil = {
        status: data?.status,
      };
      return res.status(200).json({ msg: "Action successful", newUtil });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.report = async (req, res) => {
  let filename = "Detailed-Utilization-Report.csv";

  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  res.write(
    "Year, ULB name, ULB Code,STATE , Form Status, Unutilised Tied Grants from previous installment (INR in lakhs), 15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs), Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs), Closing balance at the end of year (INR in lakhs), Rejuvenation of Water Bodies/Total Tied Grant Utilised on WM, Rejuvenation of Water Bodies/Total Project Cost Involved, Drinking Water/Total Tied Grant Utilised on WM, Drinking Water/Total Project Cost Involved, Rainwater Harvesting/Total Tied Grant Utilised on WM, Rainwater Harvesting/Total Project Cost Involved, Water Recycling/Total Tied Grant Utilised on WM, Water Recycling/Total Project Cost Involved, Sanitation/Total Tied Grant Utilised on WM, Sanitation/Total Project Cost Involved,  Solid Waste Management/Total Tied Grant Utilised on WM, Solid Waste Management/Total Project Cost Involved, Creation Date, Modified Date \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let query = [
    {
      $match: {
        designYear: ObjectId(YEAR_CONSTANTS["21_22"]),
      },
    },
    {
      $lookup: {
        from: "years",
        localField: "designYear",
        foreignField: "_id",
        as: "year",
      },
    },
    {
      $unwind: "$year",
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
    {
      $project: {
        ulbName: "$ulb.name",
        ulbCode: "$ulb.code",
        stateName: "$state.name",
        year: "$year.year",
        unutilisedTiedGrants: "$grantPosition.unUtilizedPrevYr",
        grantReceived: "$grantPosition.receivedDuringYr",
        expenditureIncurred: "$grantPosition.expDuringYr",
        closingBalance: "$grantPosition.closingBal",
        isDraft: "$isDraft",
        status: "$status",
        role: "$actionTakenByRole",
        waterManagement: "$categoryWiseData_wm",
        solidWasteMgt: "$categoryWiseData_swm",
        createdAt: {
          $dateToString: { format: "%d/%m/%Y", date: "$createdAt" },
        },
        modifiedAt: {
          $dateToString: { format: "%d/%m/%Y", date: "$modifiedAt" },
        },
      },
    },
  ];

  let data = await UtilizationReport.aggregate(query);

  if (data) {
    for (el of data) {
      if (
        el.hasOwnProperty("waterManagement") &&
        el.hasOwnProperty("solidWasteMgt")
      ) {
        for (el2 of el.waterManagement) {
          if (el2.category_name == "Rejuvenation of Water Bodies") {
            el["rej_grantUtil"] = el2.grantUtilised;
            el["rej_totalCost"] = el2.totalProjectCost;
          } else if (el2.category_name == "Drinking Water") {
            el["drinking_grantUtil"] = el2.grantUtilised;
            el["drinking_totalCost"] = el2.totalProjectCost;
          } else if (el2.category_name == "Rainwater Harvesting") {
            el["rainwater_grantUtil"] = el2.grantUtilised;
            el["rainwater_totalCost"] = el2.totalProjectCost;
          } else if (el2.category_name == "Water Recycling") {
            el["waterRec_grantUtil"] = el2.grantUtilised;
            el["waterRec_totalCost"] = el2.totalProjectCost;
          }
        }
        for (el2 of el.solidWasteMgt) {
          if (el2.category_name == "Sanitation") {
            el["sanitation_grantUtil"] = el2.grantUtilised;
            el["sanitation_totalCost"] = el2.totalProjectCost;
          } else if (el2.category_name == "Solid Waste Management") {
            el["swm_grantUtil"] = el2.grantUtilised;
            el["swm_totalCost"] = el2.totalProjectCost;
          }
        }
      }

      el["formStatus"] = calculateStatus(el.status, el.role, el.isDraft, "ULB")
      // if (el.role == "ULB" && el.isDraft) {
      //   el["formStatus"] = FORM_STATUS.In_Progress;
      // } else if (el.role == "ULB" && !el.isDraft) {
      //   el["formStatus"] = FORM_STATUS.Submitted;
      // } else if (el.role == "STATE" && el.isDraft) {
      //   el["formStatus"] = FORM_STATUS.Under_Review_By_State;
      // } else if (el.role == "STATE" && !el.isDraft) {
      //   if (el.status == "APPROVED") {
      //     el["formStatus"] = FORM_STATUS.Approved_By_State;
      //   } else if (el.status == "REJECTED") {
      //     el["formStatus"] = FORM_STATUS.Rejected_By_State;
      //   }
      // } else if (el.role == "MoHUA" && el.isDraft) {
      //   el["formStatus"] = FORM_STATUS.Under_Review_By_MoHUA;
      // } else if (el.role == "MoHUA" && !el.isDraft) {
      //   if (el.status == "APPROVED") {
      //     el["formStatus"] = FORM_STATUS.Approved_By_MoHUA;
      //   } else if (el.status == "REJECTED") {
      //     el["formStatus"] = FORM_STATUS.Rejected_By_MoHUA;
      //   }
      // }
    }
    for (el of data) {
      res.write(
        el.year +
        "," +
        el.ulbName +
        "," +
        el.ulbCode +
        "," +
        el.stateName +
        "," +
        el.formStatus +
        "," +
        el.unutilisedTiedGrants +
        "," +
        el.grantReceived +
        "," +
        el.expenditureIncurred +
        "," +
        el.closingBalance +
        "," +
        el.rej_grantUtil +
        "," +
        el.rej_totalCost +
        "," +
        el.drinking_grantUtil +
        "," +
        el.drinking_totalCost +
        "," +
        el.rainwater_grantUtil +
        "," +
        el.rainwater_totalCost +
        "," +
        el.waterRec_grantUtil +
        "," +
        el.waterRec_totalCost +
        "," +
        el.sanitation_grantUtil +
        "," +
        el.sanitation_totalCost +
        "," +
        el.swm_grantUtil +
        "," +
        el.swm_totalCost +
        "," +
        el.createdAt +
        "," +
        el.modifiedAt +
        "," +
        "\r\n"
      );
    }
    res.end();
  }
};
function utilReportObject() {
  let obj = {
    _id: null,
    designYear: null,
    ulb: null,
    actionTakenByRole: null,
    categoryWiseData_swm: [
      {
        category_name: "Sanitation",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
      {
        category_name: "Solid Waste Management",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
    ],
    categoryWiseData_wm: [
      {
        category_name: "Rejuvenation of Water Bodies",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
      {
        category_name: "Drinking Water",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
      {
        category_name: "Rainwater Harvesting",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
      {
        category_name: "Water Recycling",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
        _id: null,
      },
    ],
    declaration: false,
    grantPosition: {
      closingBal: null,
      expDuringYr: null,
      receivedDuringYr: null,
      unUtilizedPrevYr: 0,
    },
    history: [],
    isActive: true,
    isDraft: true,
    projects: [],
    rejectReason: null,
    rejectReason_mohua: null,
    rejectReason_state: null,
    status: null,
    // canTakeAction: false,
  }

  return obj;
}
module.exports.read2223 = catchAsync(async (req, res) => {
  let ulb = req.query.ulb;
  let design_year = req.query.design_year;
  let role = req.decoded.role;

  if (!ulb || !design_year) {
    return res.status(400).json({
      success: false,
      message: "Data Missing"
    })
  }
  let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
  /* Checking if the user has access to the form. */
  // if(!ulbData.access_2122){
  //   return res.status(200).json({
  //     success: false,
  //     message: `Last year form access not allowed.`,
  //     data: utilReportObject()
  //   })
  // }
  let userData = await User.findOne({ isNodalOfficer: true, state: ulbData.state })
  let currentYear = await Year.findOne({ _id: ObjectId(design_year) }).lean()
  // current year
  let currentYearVal = currentYear['year']
  // find Previous year
  let prevYearVal = currentYearVal.split("-");
  prevYearVal = Number(prevYearVal[0]) - 1 + "-" + (Number(prevYearVal[1]) - 1);

  prevYear = await Year.findOne({ year: prevYearVal }).lean()

  let prevDataQuery = MasterForm.findOne({
    ulb: ObjectId(ulb),
    design_year: prevYear._id
  }).select({ history: 1 }).lean()
  let prevUtilReportQuery = UtilizationReport.findOne({
    ulb: ulb,
    designYear: prevYear._id
  }).select({ history: 0 }).lean()
  let [prevData, prevUtilReport] = await Promise.all([prevDataQuery, prevUtilReportQuery])
  //check if prevyear util report is atleast approved by state
  // let prevUtilStatus = calculateStatus(prevUtilReport.status, prevUtilReport.actionTakenByRole, prevUtilReport.isDraft, "ULB")

  // if (
  //   !(
  //     prevUtilStatus === FORM_STATUS.Approved_By_MoHUA ||
  //     prevUtilStatus === FORM_STATUS.Approved_By_State ||
  //     prevUtilStatus === FORM_STATUS.Under_Review_By_MoHUA
  //   )
  // ) {
  //   return res.status(200).json({
  //     success: false,
  //     message: `last year form not approved.`,
  //     data: utilReportObject(),
  //   });
  // }
  let status = ''
  if (!prevData) {
    status = 'Not Started'
  } else {
    prevData = prevData.history[prevData.history.length - 1]
    status = calculateStatus(prevData.status, prevData.actionTakenByRole, !prevData.isSubmit, "ULB")
  }
  let host = "";
  if (req.headers.host === BackendHeaderHost.Demo) {
    host = FrontendHeaderHost.Demo;
  }
  req.headers.host = host !== "" ? host : req.headers.host;
  let obj = {}
  if (!ulbData.access_2122) {
    obj['action'] = 'not_show';
    obj['url'] = ``;
  }
  else {
    if ([FORM_STATUS.Under_Review_By_MoHUA, FORM_STATUS.Approved_By_MoHUA, FORM_STATUS.Approved_By_State].includes(status)) {
      obj['action'] = 'not_show';
      obj['url'] = ``;
    } else if (status == FORM_STATUS.Under_Review_By_State) {
      let msg = role == "ULB" ? `Dear User, Your previous Year's form status is - ${status}. Kindly contact your State Nodal Officer at Mobile - ${userData.mobile ?? 'Not Available'} or Email - ${userData.email ?? 'contact@cityfinance.in'}` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to mark your response once the ULB Submits this form. `
      obj['action'] = 'note';
      obj['url'] = msg;
    } else {

      let msg = role == "ULB" ? `Dear User, Your previous Year's form status is - ${status ? status : 'Not Submitted'} .Kindly submit Detailed Utilization Report Form for the previous year at - <a href=https://${req.headers.host}/ulbform/utilisation-report target="_blank">Click Here!</a> in order to submit this year's form . ` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to mark your response once the ULB Submits this form. `
      obj['action'] = 'note'
      obj['url'] = msg;
    }
  }

  let condition = {
    ulb: ObjectId(ulb),
    designYear: ObjectId(currentYear._id)
  }
  let fetchedData = await UtilizationReport.findOne(condition).lean()

  if (fetchedData) {
    Object.assign(fetchedData, { canTakeAction: canTakenAction(fetchedData['status'], fetchedData['actionTakenByRole'], fetchedData['isDraft'], "ULB", role) })


    /* Checking if the ulbData.access_2122 is not true, then it is setting the
       unUtilizedPrevYr to 0. */
    !ulbData.access_2122 ? fetchedData.grantPosition.unUtilizedPrevYr = 0 : "";

    /* The code is checking if the action property of the obj object is equal to "note". If it
    is, then it is assigning the fetchedData object to the obj object. */
    obj["action"] === "note" ? Object.assign(fetchedData, obj) : "";
    /* The above code is checking if the fetchedData has grantPosition property and if it has then it is
    checking if the value of the property is a number or not. If it is a number then it is converting
    it to a fixed number with 2 decimal places. */
    if (fetchedData?.grantPosition) {
      !isNaN(fetchedData?.grantPosition.unUtilizedPrevYr) ? fetchedData.grantPosition.unUtilizedPrevYr = Number(fetchedData?.grantPosition.unUtilizedPrevYr).toFixed(2) : ""
      !isNaN(fetchedData?.grantPosition.receivedDuringYr) ? fetchedData.grantPosition.receivedDuringYr = Number(fetchedData?.grantPosition.receivedDuringYr).toFixed(2) : ""
      !isNaN(fetchedData?.grantPosition.closingBal) ? fetchedData.grantPosition.closingBal = Number(fetchedData?.grantPosition.closingBal).toFixed(2) : ""
      !isNaN(fetchedData?.grantPosition.expDuringYr) ? fetchedData.grantPosition.expDuringYr = Number(fetchedData?.grantPosition.expDuringYr).toFixed(2) : ""

    }
    return res.status(200).json({
      success: true,
      data: fetchedData
    })
  } else {
    condition['designYear'] = ObjectId(prevYear._id)
    fetchedData = await UtilizationReport.findOne(condition).lean()
    let sampleData = new UtilizationReport();
    sampleData.grantPosition.unUtilizedPrevYr = ulbData.access_2122 ? (fetchedData?.grantPosition?.closingBal ?? 0) : 0;
    console.log(sampleData)
    sampleData = sampleData.toObject()
    // sampleData = sampleData.lean()
    sampleData['url'] = obj['url']
    sampleData['action'] = obj['action']
    sampleData['canTakeAction'] = false;
    // Object.assign(sampleData,obj )
    return res.status(200).json({
      success: true,
      data: sampleData
    })
  }

})

module.exports.dataRepair = async function (req, res, next) {
  try {
    let condition = {
      "designYear": ObjectId("606aaf854dff55e6c075d219"), /// 2021-22
      "financialYear": ObjectId("606aadac4dff55e6c075c507"), /// 2020-21
      "ulb": { $ne: null }
    }
    let cond = {
      "designYear": ObjectId("606aafb14dff55e6c075d3ae"), /// 2022-23
      "financialYear": ObjectId("606aaf854dff55e6c075d219"), /// 2021-22
      "actionTakenByRole": { $ne: "STATE" },
      "status": { $ne: "APPROVED" },
      "ulb": { $ne: null }
    }
    const utiReportData = await UtilizationReport.find(condition, {
      "_id": 1,
      "designYear": 1,
      "financialYear": 1,
      "ulb": 1,
      "grantPosition": 1
    }).lean();
    if (utiReportData.length) {
      let dd = await utilisationUpdate({ utiReportData, cond })
    }
    return res.status(200).json({
      msg: "Successfully save update data!"
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
}

const utilisationUpdate = (objData) => {
  const { utiReportData, cond } = objData;
  return new Promise(async (resolve, reject) => {
    let prmsArr = [];
    const utiSecond = await UtilizationReport.find(cond).lean();
    for (const pf of utiReportData) {
      let pmr = new Promise(async (rjlv, rjct) => {
        try {
          if (pf.ulb) {
            let dk = await utiSecond.find(e => e.ulb.toString() === pf.ulb.toString());
            if (dk) {
              if (parseFloat(pf.grantPosition.closingBal) !== parseFloat(dk.grantPosition.unUtilizedPrevYr)) {
                let obj = {
                  "unUtilizedPrevYr": pf.grantPosition.closingBal,
                  "receivedDuringYr": dk.grantPosition.receivedDuringYr,
                  "expDuringYr": dk.grantPosition.expDuringYr,
                  "closingBal": (((parseFloat(pf.grantPosition.closingBal)) + (parseFloat(dk.grantPosition.receivedDuringYr))) - parseFloat(dk.grantPosition.expDuringYr)).toFixed(2)
                }
                await UtilizationReport.update({
                  "_id": dk._id
                }, { "$set": { "grantPosition": obj } })
              }
            }
          }
          rjlv(1)
        } catch (error) {
          rjct(error);
        }
      })
      prmsArr.push(pmr);
    }
    Promise.all(prmsArr).then((values) => {
      resolve(values);
    }, (rejectErr) => {
      console.log("rejectErr", rejectErr);
      reject(rejectErr)
    }).catch((caughtErr) => {
      console.log("caughtErr", caughtErr)
      reject(caughtErr)
    })
  })
}

module.exports.GrantPositionDesiMalvalueUpdate = async function (req, res, next) {
  try {
    const arr = [
      ObjectId("5dd247914f14901fa9b4a8ab"),
      ObjectId("5dd24d43e7af460396bf2ead"),
      ObjectId("5dd24e98cc3ddc04b552b7cb"),
      ObjectId("5eb5844f76a3b61f40ba06ae"),
      ObjectId("5eb5844f76a3b61f40ba06c0"),
      ObjectId("5eb5844f76a3b61f40ba0706"),
      ObjectId("5eb5844f76a3b61f40ba0707"),
      ObjectId("5eb5845076a3b61f40ba0768"),
      ObjectId("5eb5845076a3b61f40ba077e"),
      ObjectId("5eb5845076a3b61f40ba079e"),
      ObjectId("5eb5845076a3b61f40ba085e"),
      ObjectId("5fa2465f072dab780a6f12d9"),
      ObjectId("5fa2465f072dab780a6f1319"),
      ObjectId("5fa24660072dab780a6f13d4"),
      ObjectId("5fa24661072dab780a6f1513")
    ];
    let condition = { "ulb": { $in: arr } }
    const utiReportData = await UtilizationReport.find(condition, {
      "_id": 1,
      "grantPosition": 1
    }).lean();
    if (utiReportData.length) {
      let dd = await roundGrantPosition({ utiReportData })
    }
    return res.status(200).json({
      msg: "Successfully save update data!"
    });
  } catch (error) {
    console.log("error", error)
    return Response.BadRequest(res, {}, error.message);
  }
}
const roundGrantPosition = (objData) => {
  const { utiReportData } = objData;
  return new Promise(async (resolve, reject) => {
    let prmsArr = [];
    for (const pf of utiReportData) {
      let pmr = new Promise(async (rjlv, rjct) => {
        try {
          if (pf.grantPosition.closingBal) {
            let obj = { ...pf.grantPosition, "closingBal": parseFloat(pf.grantPosition.closingBal).toFixed(2) }
            await UtilizationReport.update({
              "_id": pf._id
            }, { "$set": { "grantPosition": obj } })
          }
          rjlv(1)
        } catch (error) {
          rjct(error);
        }
      })
      prmsArr.push(pmr);
    }
    Promise.all(prmsArr).then((values) => {
      resolve(values);
    }, (rejectErr) => {
      console.log("rejectErr", rejectErr);
      reject(rejectErr)
    }).catch((caughtErr) => {
      console.log("caughtErr", caughtErr)
      reject(caughtErr)
    })
  })
}
