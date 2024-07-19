const UtilizationReport = require("../../models/UtilizationReport");
const FormsJson = require("../../models/FormsJson");
const Ulb = require("../../models/Ulb");
const User = require("../../models/User");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Category = require("../../models/Category");
const FORM_STATUS = require("../../util/newStatusList");
const Year = require('../../models/Year')
const catchAsync = require('../../util/catchAsync')
const {
  calculateStatus,
  checkForUndefinedVaribales,
  canTakenAction,
  mutateResponse,
  changePayloadFormat,
  decideDisabledFields,
  checkIfUlbHasAccess,
  isYearWithinRange,
  getFinancialYear
} = require("../CommonActionAPI/service");
const { getKeyByValue,checkForCalculationsForDurForm, getAccessYear } = require("../../util/masterFunctions")
const Service = require('../../service');
const { FormNames, ULB_ACCESSIBLE_YEARS, MASTER_STATUS_ID, PREV_MASTER_FORM_STATUS, FORM_STATUS_CODES, MASTER_STATUS } = require('../../util/FormNames');
const MasterForm = require('../../models/MasterForm')
const { YEAR_CONSTANTS, YEAR_CONSTANTS_IDS } = require("../../util/FormNames");
const { ModelNames } = require('../../util/15thFCstatus')
const { createAndUpdateFormMaster, getMasterForm } = require('../../routes/CommonFormSubmission/service')

let DurPageLinks = {
  "2021-22": "",
  "2022-23": "ulbform/ulbform-overview",
  "2023-24": "ulbform2223/utilisation-report",
  "2024-25": `ulb-form/${YEAR_CONSTANTS["23_24"]}/utilisation-report`
}
const YEAR2223 = 202223;
async function getCorrectDataSet() {

}

function update2223from2122() {

}

let validationMessages = {
  "projectExpMatch": "Sum of all project wise expenditure amount does not match total expenditure amount provided in the XVFC summary section. Kindly recheck the amounts.",
  "expWmSwm": " The total expenditure in the component wise grants must not exceed the amount of expenditure incurred during the year.",
  "negativeBal": "Closing balance is negative because Expenditure amount is greater than total tied grants amount available. Please recheck the amounts entered."
}

const BackendHeaderHost = {
  Demo: `${process.env.DEMO_HOST_BACKEND}`,
  Staging: `${process.env.STAGING_HOST}`,
  Prod: `${process.env.PROD_HOST}`,
}
const FrontendHeaderHost = {
  Demo: `${process.env.DEMO_HOST_FRONTEND}`,
  Staging: `${process.env.STAGING_HOST}`,
  Prod: `${process.env.PROD_HOST}`,
}
const {
  emailTemplate: { utilizationRequestAction },
  sendEmail,
} = require("../../service");
const { ElasticBeanstalk } = require("aws-sdk");
const { forever } = require("request");
const { years } = require("../../service/years");
const { getPreviousYear, isYearWithinCurrentFY } = require("../sidemenu/service");
const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};
module.exports.createOrUpdate = async (req, res) => {
  try {
    const { financialYear, isDraft, designYear, isProjectLoaded } = req.body;
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
    let currentMasterFormStatus = req.body['status']
    if (req.decoded.role == 'ULB') {
      formData['status'] = 'PENDING'
    }
    let condition = {};
    condition.designYear = designYear;
    condition.financialYear = financialYear;
    condition.ulb = ulb;

    if (
      formData?.categoryWiseData_wm?.length <= 0 ||
      formData?.categoryWiseData_swm?.length <= 0 ||
      !formData?.categoryWiseData_swm ||
      !formData?.categoryWiseData_wm
    ) {
      return Response.BadRequest(res, {}, "Category wise data fields are required");
    }

    if (req.body.ulb) {
      formData["ulb"] = ObjectId(ulb);
    }
    if (financialYear) {
      formData["financialYear"] = ObjectId(financialYear);
    }
    let yearInNumber;
    if (designYear) {
      formData["designYear"] = ObjectId(designYear);
      yearInNumber =  Number(getKeyByValue(years,designYear).split('-').join(''))
    }
    if ( isYearWithinRange(formData.designYear.toString()) && formData.ulb) {
      formData.status = currentMasterFormStatus;
      formData.projects =  addKeysInProject(formData?.projects);
      let params = {
        modelName: ModelNames["dur"],
        formData,
        res,
        actionTakenByRole: req.body.actionTakenByRole,
        actionTakenBy: req.body.actionTakenBy
      };
      let response = await createAndUpdateFormMaster(params);
      if (!formData.isDraft) {
        await updateForNextForms(designYear, ulb, formData);
        //email trigger after form submission
        Service.sendEmail(mailOptions);

      }
      return response
    }

    const submittedForm = await UtilizationReport.findOne(condition);
    if (designYear == "606aaf854dff55e6c075d219") {
      if (req.body.actionTakenByRole === "ULB") {
        req.body.status = "PENDING"
      }
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
        // await UtilizationReport.findOneAndUpdate(
        //   {
        //     ulb: ObjectId(ulb),
        //     designYear: ObjectId("606aafb14dff55e6c075d3ae"),
        //     financialYear: ObjectId("606aaf854dff55e6c075d219")
        //   },
        //   { $set: { "grantPosition.unUtilizedPrevYr": utiData?.grantPosition?.closingBal } },
        //   {
        //     upsert: true,
        //     new: true,
        //     setDefaultsOnInsert: true,
        //   }
        // )
        await UpdateMasterSubmitForm(req, "utilReport");

        /* Checking if the utiData.isDraft is false. */
        if (!utiData.isDraft) {
          let dur22_23Form = await UtilizationReport.findOne({
            ulb: ObjectId(ulb),
            designYear: ObjectId(YEAR_CONSTANTS["22_23"]),
          }).lean();
          if (dur22_23Form) {
            let dur22_23FormStatus = calculateStatus(
              dur22_23Form?.status,
              dur22_23Form?.actionTakenByRole,
              dur22_23Form?.isDraft,
              "ULB"
            );
            /* Checking if the dur 22-23 form status is in progress, rejected by MoHUA or rejected by state.
            Then update it with latest values */
            if (
              [
                FORM_STATUS.In_Progress,
                FORM_STATUS.Rejected_By_MoHUA,
                FORM_STATUS.Rejected_By_State,
              ].includes(dur22_23FormStatus)
            ) {
              /* calculate closing balance and opening balance for 22-23 form */
              dur22_23Form.grantPosition.unUtilizedPrevYr = utiData
                ?.grantPosition?.closingBal
                ? Number(utiData?.grantPosition?.closingBal)
                : "";
              dur22_23Form.grantPosition.closingBal =
                Number(dur22_23Form?.grantPosition?.unUtilizedPrevYr) +
                Number(dur22_23Form?.grantPosition.receivedDuringYr) -
                Number(dur22_23Form?.grantPosition?.expDuringYr);

              condition.designYear = ObjectId(YEAR_CONSTANTS["22_23"]);
              condition.financialYear = ObjectId(YEAR_CONSTANTS["21_22"])
              let updatedFetchedData = await UtilizationReport.findOneAndUpdate(
                condition,
                {
                  $set: {
                    grantPosition: dur22_23Form?.grantPosition,
                  },
                }
              );
            }
          }
        }
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
        let validation = await checkForCalculationsForDurForm(req.body)
        if (!validation.valid) {
          return Response.BadRequest(res, {}, validation.messages);
        }
        const form = await new UtilizationReport(formData);

        if (form) {
          formData.createdAt = form.createdAt;
          formData.modifiedAt = form.modifiedAt;
          let sum = 0
          if (formData.projects.length > 0) {
            for (let i = 0; i < formData.projects.length; i++) {
              let project = formData.projects[i];
              project.modifiedAt = form.projects[i].modifiedAt;
              project.createdAt = form.projects[i].createdAt;
              sum += parseFloat(project.cost)
              if (project.category) {
                project.category = ObjectId(project.category)
              }
              if (project._id) {
                project._id = ObjectId(project._id);
              }
            }
          }
          await updateForNextForms(designYear, ulb, formData)
          await form.save()


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
              console.log("function commented because of error")
              //email trigger after form submission
              // Service.sendEmail(mailOptions);
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
      if (currentSavedUtilRep) {//final submit already draft form
        req.body['ulbSubmit'] = new Date();
        let body = req.body
        if (req.body.projects.length === 0) {
          body.projects = currentSavedUtilRep.projects
        }
        let validation = await checkForCalculationsForDurForm(body)
        if (!validation.valid) {
          return Response.BadRequest(res, {}, validation.messages);
        }

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
        
        if (!isProjectLoaded && yearInNumber > YEAR2223) {
          delete req.body['projects']
        }
        // console.log(req.body)
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
        await updateForNextForms(designYear, ulb, req.body)
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
    console.log(err)
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
/**
 * The function `addKeysInProject` adds a `dpr_status` key with a value of `null` to each project in
 * the input array if the key does not already exist.
 * @param projects - An array of project objects. Each project object may or may not have a property
 * named "dpr_status".
 * @returns The `addKeysInProject` function is returning the `projects` array with the `dpr_status` key
 * added to each project if it doesn't already exist.
 */
function addKeysInProject(projects){
  try {
     projects.forEach(project=>{
      if(project.hasOwnProperty('dpr_status') && !project['dpr_status']){
        project['dpr_status'] = null
      }
     })
    return projects
  } catch (error) {
    throw new Error(`addKeysInProject:  ${error.message}`)
  }
}
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

      el["formStatus"] = calculateStatus(el?.status, el?.role, el?.isDraft, "ULB")
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
module.exports.read2223 = catchAsync(async (req, res, next) => {
  try {
    let ulb = req.query.ulb;
    let design_year = req.query.design_year;
    let role = req.decoded.role;

    if (!ulb || !design_year) {
      return res.status(400).json({
        success: false,
        message: "Data Missing",
      });
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
    let userData = await User.findOne({
      isNodalOfficer: true,
      state: ulbData.state,
    });
    let currentYear = await Year.findOne({ _id: ObjectId(design_year) }).lean();
    let ulbAccess = checkIfUlbHasAccess(ulbData, currentYear);
    // let ulbAccessBeforeCreationId = getPreviousYear(currentYear._id.toString(),2);
    // let ulbAccessBeforeCreation = checkIfUlbHasAccess(
    //   ulbData, 
    //   ulbAccessBeforeCreationId
    // )
    // current year
    let currentYearVal = currentYear["year"];
    // find Previous year
    let prevYearVal = currentYearVal.split("-");
    prevYearVal =
      Number(prevYearVal[0]) - 1 + "-" + (Number(prevYearVal[1]) - 1);
    let currentDesignYear = getKeyByValue(years, design_year);
    prevYear = await Year.findOne({ year: prevYearVal }).lean();
    let prevData = await getDataSet(ulb, prevYear, design_year);
    let isDraft =
      prevData && Object.keys(prevData).includes("isSubmit")
        ? !prevData.isSubmit
        : prevData?.isDraft;
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
    let status = "";
    if (!prevData) {
      status = "Not Started";
    } else {
      prevData =
        prevData?.history?.length > 0
          ? prevData?.history[prevData?.history?.length - 1]
          : prevData;
      isDraft =
        prevData && Object.keys(prevData).includes("isSubmit")
          ? !prevData?.isSubmit
          : prevData?.isDraft;
      status = calculateStatus(
        prevData?.status,
        prevData?.actionTakenByRole,
        isDraft,
        "ULB"
      );
      if (prevData?.currentFormStatus) status = MASTER_STATUS_ID[prevData?.currentFormStatus];
    }
    let host = "";
    if (req.headers.host === BackendHeaderHost.Demo) {
      host = FrontendHeaderHost.Demo;
    }
    req.headers.host = host !== "" ? host : req.headers.host;
    let obj = {};
    let currenYearAccess = getAccessYear(currentYear._id.toString(), null);
    if (!ulbData[currenYearAccess]) {
      let msg =
        role == "ULB"
          ? `Dear User, You are not eligible to access this form. Kindly contact your State Nodal Officer at Mobile - ${
              userData.mobile ?? "Not Available"
            } or Email - ${
              userData.email ?? `contact@${process.env.PROD_HOST}`
            }`
          : `Dear User, The ${ulbData.name} is not eligible to access Detailed Utilization Report Form.`;
      obj["action"] = "note";
      obj["url"] = msg;
    } else if(!ulbData?.dur_2425) {
      if (
        [
          FORM_STATUS.Under_Review_By_MoHUA,
          FORM_STATUS.Approved_By_MoHUA,
          FORM_STATUS.Approved_By_State,
          MASTER_STATUS_ID[MASTER_STATUS['Submission Acknowledged By MoHUA']]
        ].includes(status)
      ) {
        obj["action"] = "not_show";
        obj["url"] = ``;
      } else if (status == FORM_STATUS.Under_Review_By_State) {
        let msg =
          role == "ULB"
            ? `Dear User, Your previous Year's form status is - ${status}. Kindly contact your State Nodal Officer at Mobile - ${
                userData.mobile ?? "Not Available"
              } or Email - ${
                userData.email ?? `contact@${process.env.PROD_HOST}`
              }`
            : `Dear User, The ${ulbData.name} has not yet filled Detailed Utilization Report Form for the previous year. You will be able to mark your response once STATE approves previous year's form.`;
        obj["action"] = "note";
        obj["url"] = msg;
      } else if(ulbAccess){
        let msg =
          role == "ULB"
            ? `Dear User, Your previous Year's form status is - ${
                status ? status : "Not Submitted"
              } .Kindly submit Detailed Utilization Report Form for the previous year at - <a href=https://${
                req.headers.host
              }/${
                DurPageLinks[currentDesignYear]
              } target="_blank">Click Here!</a> in order to submit this year's form . `
            : `Dear User, The ${ulbData.name} has not yet filled Detailed Utilization Report Form for the previous year. You will be able to mark your response once STATE approves previous year's form.`;
        obj["action"] = "note";
        obj["url"] = msg;
      }
    }

    let newlyCreated = checkIfNewlyCreatedUlb(design_year, ulbData?.createdAt);
    if( isYearWithinCurrentFY(design_year) && !ulbAccess && !ulbData?.dur_2425){
      let msg = `Dear ${ulbData.name}, You will be eligible to fill the DUR form from next year.`
      obj["action"] = "note";
      obj["url"] = msg;
    }
    let condition = {
      ulb: ObjectId(ulb),
      designYear: ObjectId(currentYear._id),
    };
    let fetchedData = await UtilizationReport.findOne(condition, {
      history: 0,
    }).lean();

    if (fetchedData) {
      if (isYearWithinRange(fetchedData.designYear.toString())) {
        let params = {
          modelName: ModelNames["dur"],
          currentFormStatus: fetchedData.currentFormStatus,
          formType: "ULB",
          actionTakenByRole: role,
        };
        const canTakeActionOnMasterForm = await getMasterForm(params);
        let prevYearStatus = calculateStatus(
          prevData?.status,
          prevData?.actionTakenByRole,
          prevData?.isDraft,
          "ULB"
        );
        if (prevData?.currentFormStatus) prevYearStatus = MASTER_STATUS_ID[prevData?.currentFormStatus];
        let previousStatusInCaps = prevYearStatus
          .toUpperCase()
          .split(" ")
          .join("_");
        let prevYearStatusId = prevData?.currentFormStatus
          ? FORM_STATUS_CODES[previousStatusInCaps]
          : PREV_MASTER_FORM_STATUS[previousStatusInCaps];
        Object.assign(fetchedData, canTakeActionOnMasterForm, {
          prevYearStatus,
          prevYearStatusId,
        });

        // if (prevData && role === "MoHUA") {
        //   if (!(prevData.actionTakenByRole === "MoHUA" && !prevData.isDraft && prevData.status === "APPROVED")) {
        //     fetchedData['canTakeAction'] = false;
        //   }
        // }
      } else {
        const prevYearStatus = calculateStatus(
          prevData?.status,
          prevData?.actionTakenByRole,
          !prevData?.isSubmit,
          "ULB"
        );
        const previousStatusInCaps = prevYearStatus
          .toUpperCase()
          .split(" ")
          .join("_");
        Object.assign(fetchedData, {
          canTakeAction: canTakenAction(
            fetchedData["status"],
            fetchedData["actionTakenByRole"],
            fetchedData["isDraft"],
            "ULB",
            role
          ),
          prevYearStatus,
          prevYearStatusId: PREV_MASTER_FORM_STATUS[previousStatusInCaps],
        });
        // if (prevData && role === "MoHUA") {
        //   if (!(prevData.actionTakenByRole === "MoHUA" && !prevData.isDraft && prevData.status === "APPROVED")) {
        //     fetchedData['canTakeAction'] = false;
        //   }
        // }
      }

      /* Checking if the ulbData.access_2122 is not true, then it is setting the
       unUtilizedPrevYr to 0. */
      !ulbAccess ? (fetchedData.grantPosition.unUtilizedPrevYr = 0) : "";

      /* The code is checking if the action property of the obj object is equal to "note". If it
    is, then it is assigning the fetchedData object to the obj object. */
      obj["action"] === "note" ? Object.assign(fetchedData, obj) : "";
      /* The above code is checking if the fetchedData has grantPosition property and if it has then it is
    checking if the value of the property is a number or not. If it is a number then it is converting
    it to a fixed number with 2 decimal places. */
      if (fetchedData?.grantPosition) {
        typeof fetchedData?.grantPosition.unUtilizedPrevYr === "number"
          ? (fetchedData.grantPosition.unUtilizedPrevYr = Number(
              Number(fetchedData?.grantPosition.unUtilizedPrevYr).toFixed(2)
            ))
          : "";
        typeof fetchedData?.grantPosition.receivedDuringYr === "number"
          ? (fetchedData.grantPosition.receivedDuringYr = Number(
              Number(fetchedData?.grantPosition.receivedDuringYr).toFixed(2)
            ))
          : "";
        typeof fetchedData?.grantPosition.expDuringYr === "number"
          ? (fetchedData.grantPosition.expDuringYr = Number(
              Number(fetchedData?.grantPosition.expDuringYr).toFixed(2)
            ))
          : "";
        // fetchedData?.grantPosition.closingBal !== "" && fetchedData?.grantPosition.closingBal !== null ? fetchedData.grantPosition.closingBal = Number(Number(fetchedData?.grantPosition.closingBal).toFixed(2)) : ""

        //new  implementation
        typeof fetchedData?.grantPosition.closingBal === "number"
          ? (fetchedData.grantPosition.closingBal = Number(
              Number(fetchedData?.grantPosition.closingBal).toFixed(2)
            ))
          : "";
      }
      fetchedData["ulbName"] = ulbData.name;
      req.form = fetchedData;
      Object.assign(req.form, obj);
      next();
      // return res.status(200).json({
      //   success: true,
      //   data: fetchedData
      // })
    } else {
      condition["designYear"] = ObjectId(prevYear._id);
      fetchedData = await UtilizationReport.findOne(condition).lean();
      let sampleData = new UtilizationReport();
      sampleData.grantPosition.unUtilizedPrevYr = ulbAccess 
        ? fetchedData?.grantPosition?.closingBal ?? 0
        : 0;
      sampleData = sampleData.toObject();
      // sampleData = sampleData.lean()
      sampleData["url"] = obj["url"];
      sampleData["action"] = obj["action"];
      sampleData["canTakeAction"] = false;
      sampleData["ulbName"] = ulbData.name;
      // Object.assign(sampleData,obj )
      req.form = sampleData;
      next();
      // return res.status(200).json({
      //   success: true,
      //   data: sampleData
      // })
    }
  } catch (error) {
    return Response.BadRequest(res);
  }
})

/**
 * The function `checkIfNewlyCreatedUlb` checks if a ULB (Urban Local Body) was newly created in the
 * current financial year based on the design year provided.
 * @param design_year - The `design_year` parameter in the `checkIfNewlyCreatedUlb` function represents
 * the year in which a ULB (Urban Local Body) is accessing form.
 * @returns The function `checkIfNewlyCreatedUlb` returns a boolean value - `true` if the design year
 * is not the same as the current financial year, and `false` if they are the same.
 */
function checkIfNewlyCreatedUlb(design_year, creationDate){
  try {
    let creationFinancialYear = getFinancialYear(creationDate);
    if(YEAR_CONSTANTS_IDS[design_year] === creationFinancialYear){
      return true;
    };
    return false;
  } catch (error) {
    throw new Error(`checkIfNewlyCreatedUlb:: ${error.message}`)
  }
}

module.exports.checkIfNewlyCreatedUlb = checkIfNewlyCreatedUlb

module.exports.dataRepair = async function (req, res, next) {
  try {
    // let ulbIds = [
    //   ObjectId("5fa2465d072dab780a6f1047"),
    //   ObjectId("5fa2465d072dab780a6f1052"),
    //   ObjectId("5dd2472a437ba31f7eb43099"),
    //   ObjectId("5fa2465e072dab780a6f10a9"),
    //   ObjectId("5dd247904f14901fa9b4a7cd"),
    //   ObjectId("5dd247904f14901fa9b4a7ec"),
    //   ObjectId("5dd247904f14901fa9b4a7af"),
    //   ObjectId("5dd247914f14901fa9b4a8a0"),
    //   ObjectId("5dd247914f14901fa9b4a8ab"),
    //   ObjectId("5dd2474a83f0771f8da4da8b"),
    //   ObjectId("5dd2474983f0771f8da4da6a"),
    //   ObjectId("5dd247924f14901fa9b4a902"),
    //   ObjectId("5dd247924f14901fa9b4a8ec"),
    //   ObjectId("5fa2465e072dab780a6f1170"),
    //   ObjectId("5fa2465e072dab780a6f1183"),
    //   ObjectId("5fa2465e072dab780a6f1187"),
    //   ObjectId("5fa2465e072dab780a6f11ad"),
    //   ObjectId("5dd247924f14901fa9b4a8eb"),
    //   ObjectId("5e0b2190f0d3fc6ffa3d94aa"),
    //   ObjectId("5dd24d43e7af460396bf2e9d"),
    //   ObjectId("5dea38cb20bb8054b71b37b7"),
    //   ObjectId("5dd24d43e7af460396bf2eb2"),
    //   ObjectId("5dd24d43e7af460396bf2e86"),
    //   ObjectId("5dd24d43e7af460396bf2eb5"),
    //   ObjectId("5dea38ce20bb8054b71b37ce"),
    //   ObjectId("5fa24660072dab780a6f13db"),
    //   ObjectId("5dd24d43e7af460396bf2ef7"),
    //   ObjectId("5dea38ce20bb8054b71b37d2"),
    //   ObjectId("5fa24660072dab780a6f1393"),
    //   ObjectId("5fa24660072dab780a6f13bf"),
    //   ObjectId("5fa24660072dab780a6f13d4"),
    //   ObjectId("5fa24660072dab780a6f13da"),
    //   ObjectId("5fa24660072dab780a6f13dc"),
    //   ObjectId("5fa24660072dab780a6f1417"),
    //   ObjectId("5fa2465f072dab780a6f121e"),
    //   ObjectId("5fa2465f072dab780a6f1319"),
    //   ObjectId("5fa281a3c7ffa964f0cfaa24"),
    //   ObjectId("5fa24661072dab780a6f14c3"),
    //   ObjectId("5fa24661072dab780a6f14df"),
    //   ObjectId("5fa24661072dab780a6f14f9"),
    //   ObjectId("5fa24661072dab780a6f1501"),
    //   ObjectId("5fa24661072dab780a6f1521"),
    //   ObjectId("5eb5844f76a3b61f40ba06ae"),
    //   ObjectId("5eb5844f76a3b61f40ba06bf"),
    //   ObjectId("5eb5844f76a3b61f40ba06c0"),
    //   ObjectId("5eb5844f76a3b61f40ba06fd"),
    //   ObjectId("5eb5844f76a3b61f40ba0706"),
    //   ObjectId("5eb5844f76a3b61f40ba0707"),
    //   ObjectId("5eb5845076a3b61f40ba0764"),
    //   ObjectId("5eb5845076a3b61f40ba0768"),
    //   ObjectId("5eb5845076a3b61f40ba077e"),
    //   ObjectId("5eb5845076a3b61f40ba0787"),
    //   ObjectId("5eb5845076a3b61f40ba078a"),
    //   ObjectId("5eb5845076a3b61f40ba079e"),
    //   ObjectId("5eb5845076a3b61f40ba085e"),
    //   ObjectId("5eb5845076a3b61f40ba0893"),
    //   ObjectId("5eb5845176a3b61f40ba08c0"),
    //   ObjectId("5eb5845176a3b61f40ba08e0"),
    //   ObjectId("5fa24662072dab780a6f157b"),
    //   ObjectId("620a0ac67f6b136427b7152a"),
    //   ObjectId("5fa24665072dab780a6f1815")
    // ]

    let ulbIds = req.body?.ulbs;
    let condition,cond;
    if(Boolean(req.body?.flag2324)){
      cond = {
        "designYear": ObjectId("606aafc14dff55e6c075d3ec"), /// 2023-24
        "financialYear": ObjectId("606aafc14dff55e6c075d3ec"), /// 2022-23
        "ulb": { $in: ulbIds },
      }
       condition = {
        "designYear": ObjectId("606aafb14dff55e6c075d3ae"), /// 2022-23
        "financialYear": ObjectId("606aaf854dff55e6c075d219"), /// 2021-22
         "ulb": { $in: ulbIds },
        
      }
    }else{
      condition = {
       "designYear": ObjectId("606aaf854dff55e6c075d219"), /// 2021-22
       "financialYear": ObjectId("606aadac4dff55e6c075c507"), /// 2020-21
       "ulb": { $in: ulbIds },
     }
      cond = {
       "designYear": ObjectId("606aafb14dff55e6c075d3ae"), /// 2022-23
       "financialYear": ObjectId("606aaf854dff55e6c075d219"), /// 2021-22
       "ulb": { $in: ulbIds }
     }
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
    for (const prevUtil of utiReportData) {
      let pmr = new Promise(async (rjlv, rjct) => {
        try {
          if (prevUtil.ulb) {
            let currentUtilReport = await utiSecond.find(e => e.ulb.toString() === prevUtil.ulb.toString());
            if (currentUtilReport) {
              if (parseFloat(prevUtil.grantPosition.closingBal) !== parseFloat(currentUtilReport.grantPosition.unUtilizedPrevYr)) {
                let obj = {
                  unUtilizedPrevYr: prevUtil.grantPosition.closingBal,
                  receivedDuringYr: currentUtilReport.grantPosition.receivedDuringYr,
                  expDuringYr: currentUtilReport.grantPosition.expDuringYr,
                 /* The above code is calculating the closing balance by adding the unutilized amount
                 from the previous year, the received amount during the year, and subtracting the
                 expenses during the year. */
                  closingBal: (
                    parseFloat(prevUtil.grantPosition.closingBal) +
                    parseFloat(
                      currentUtilReport.grantPosition.receivedDuringYr == null
                        ? 0
                        : currentUtilReport.grantPosition.receivedDuringYr
                    ) -
                    parseFloat(
                      currentUtilReport.grantPosition.expDuringYr == null
                        ? 0
                        : currentUtilReport.grantPosition.expDuringYr
                    )
                  ).toFixed(2),
                };
                await UtilizationReport.update({
                  "_id": currentUtilReport._id
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
    // let ddddd = await UtilizationReport.aggregate([
    //   {
    //     $lookup: {
    //       from: "ulbs",
    //       localField: "ulb",
    //       foreignField: "_id",
    //       as: "ulb",
    //     }
    //   },
    //   { $unwind: "$ulb" },
    //   {
    //     $lookup: {
    //       from: "years",
    //       localField: "financialYear",
    //       foreignField: "_id",
    //       as: "financialYear",
    //     }
    //   },
    //   { $unwind: "$financialYear" },
    //   {
    //     $lookup: {
    //       from: "years",
    //       localField: "designYear",
    //       foreignField: "_id",
    //       as: "designYear",
    //     }
    //   },
    //   { $unwind: "$designYear" },
    //   {
    //     $lookup: {
    //       from: "states",
    //       localField: "ulb.state",
    //       foreignField: "_id",
    //       as: "state",
    //     },
    //   },
    //   { $unwind: "$state" },
    //   {
    //     $project: {
    //       ulbName: "$ulb.name",
    //       ulbCode: "$ulb.code",
    //       censusCode: "$ulb.censusCode",
    //       sbCode: "$ulb.sbCode",
    //       UA: "$ulb.UA",
    //       isUA: "$ulb.isUA",
    //       stateName: "$state.name",
    //       financialYear: "$financialYear.year",
    //       designYear: "$designYear.year",
    //       unutilisedTiedGrants: "$grantPosition.unUtilizedPrevYr",
    //       grantReceived: "$grantPosition.receivedDuringYr",
    //       expenditureIncurred: "$grantPosition.expDuringYr",
    //       closingBalance: "$grantPosition.closingBal",
    //       isDraft: "$isDraft",
    //       status: "$status",
    //       role: "$actionTakenByRole",
    //       createdAt: { $dateToString: { format: "%d/%m/%Y", date: "$createdAt" } },
    //       modifiedAt: { $dateToString: { format: "%d/%m/%Y", date: "$modifiedAt" } },
    //     }
    //   }
    // ]);
    // return res.status(200).json({
    //   "data": ddddd,
    //   msg: "Successfully save update data!"
    // });

    let condition = { "ulb": { $ne: null } }
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
    for (const prevUtil of utiReportData) {
      let pmr = new Promise(async (rjlv, rjct) => {
        try {
          const { unUtilizedPrevYr, receivedDuringYr, expDuringYr, closingBal } = prevUtil.grantPosition;
          let obj = {
            "unUtilizedPrevYr": unUtilizedPrevYr !== null ? parseFloat(parseFloat(unUtilizedPrevYr).toFixed(2)) : unUtilizedPrevYr,
            "receivedDuringYr": receivedDuringYr !== null ? parseFloat(parseFloat(receivedDuringYr).toFixed(2)) : receivedDuringYr,
            "expDuringYr": expDuringYr !== null ? parseFloat(parseFloat(expDuringYr).toFixed(2)) : expDuringYr,
          }

          let unUtilPri = unUtilizedPrevYr == null ? 0 : unUtilizedPrevYr;
          let recdDurYr = receivedDuringYr == null ? 0 : receivedDuringYr;
          let expDuYr = expDuringYr == null ? 0 : expDuringYr;

          if (unUtilPri == 0 && recdDurYr == 0 && expDuYr == 0) {
            obj['closingBal'] = 0;
          } else {
            obj['closingBal'] = (((parseFloat(unUtilPri)) + (parseFloat(recdDurYr))) - parseFloat(expDuYr)).toFixed(2);
          }

          // if (unUtilizedPrevYr == 0 && receivedDuringYr == 0 && expDuringYr == 0) {
          //   obj["closingBal"] = 0
          // } else if (unUtilizedPrevYr == 0 && receivedDuringYr == null && expDuringYr == null) {
          //   obj["closingBal"] = closingBal
          // } else if (unUtilizedPrevYr == 0 && receivedDuringYr !== null && expDuringYr !== null) {
          //   obj['closingBal'] = ((parseFloat(receivedDuringYr)) - parseFloat(expDuringYr)).toFixed(2);
          // } else if (unUtilizedPrevYr == null && receivedDuringYr !== null && expDuringYr !== null) {
          //   obj['closingBal'] = ((parseFloat(receivedDuringYr)) - parseFloat(expDuringYr)).toFixed(2);
          // } else if (unUtilizedPrevYr == null && receivedDuringYr == null && expDuringYr == null) {
          //   obj['closingBal'] = closingBal !== null ? parseFloat(closingBal).toFixed(2) : closingBal;
          // } else if (receivedDuringYr == null && expDuringYr == null) {
          //   obj['closingBal'] = parseFloat(unUtilizedPrevYr).toFixed(2);
          // } else if (unUtilizedPrevYr !== null && receivedDuringYr !== null && expDuringYr !== null) {
          //   obj['closingBal'] = (((parseFloat(unUtilizedPrevYr)) + (parseFloat(receivedDuringYr))) - parseFloat(expDuringYr)).toFixed(2);
          // } else {
          //   obj['closingBal'] = closingBal;
          // }

          await UtilizationReport.update({
            "_id": prevUtil._id
          }, { "$set": { "grantPosition": obj } })
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

module.exports.getProjects = catchAsync(async (req, res, next) => {
  let response = {
    "success": true,
    "message": ""
  }
  try {
    let index = 0
    let { ulb, design_year, formId } = req.query
    let { role } = req.decoded
    let validation = await checkForUndefinedVaribales({
      "ulb id": ulb,
      "design year": design_year,
      "form id": formId
    })
    if (!validation.valid) {
      response.success = false
      response.message = validation.message
      return res.status(400).json(response)
    }
    let projectObj = await UtilizationReport.findOne({
      "ulb": ObjectId(ulb),
      "designYear": ObjectId(design_year)
    }, { projects: 1, isDraft: 1, status: 1, actionTakenByRole: 1, currentFormStatus: 1 }).lean()

    if (!projectObj) {
      response.message = "No utilization report found with this ulb and design year"
      response.success = true
      response.data = []
      return res.json(response)
    }
    if (projectObj) {
      formStatus = decideDisabledFields(projectObj, req.decoded.role)
      projectObj.disableFields = formStatus
    }
    let formJson = await FormsJson.findOne({ "formId": formId }).lean()
    let projectJson = { ...formJson }
    let questions = projectJson.data[index].question.filter(item => item.shortKey === "projectDetails_tableView_addButton")
    projectJson.data[0].question = questions
    let keysToBeDeleted = ["_id", "createdAt", "modifiedAt", "actionTakenByRole", "actionTakenBy", "ulb", "design_year", "isDraft"]
    projectJson = await mutateResponse(projectJson.data, projectObj, keysToBeDeleted, role)
    response.data = projectJson[0].question[0].childQuestionData
    response.success = true
    return res.json(response)

  }
  catch (err) {
    console.log("error in getProjects :: ", err.message)
    response.message = "Something went wrong"
  }
  return res.json(response)
})
/**
 * this function checks if we have to check the previous status from master form or prev year data
 * according to the design year object given
 * @param {Object} ulb 
 * @param {Object} prevYear 
 * @param {Object} designYear 
 * @returns 
 */
async function getDataSet(ulb, prevYear, designYear) {
  try {
    let masterFormAccessibleYears = ['2022-23']
    let prevDataQuery = MasterForm.findOne({
      ulb: ObjectId(ulb),
      design_year: prevYear._id
    }).lean();
    let prevUtilReportQuery = UtilizationReport.findOne({
      ulb: ulb,
      designYear: prevYear._id
    }).select({ history: 0 }).lean();
    let [prevData, prevUtilReport] = await Promise.all([prevDataQuery, prevUtilReportQuery])
    let year = getKeyByValue(years, designYear.toString())
    if (masterFormAccessibleYears.includes(year)) {
      return prevData
    }
    else {
      return prevUtilReport
    }
  }
  catch (err) {
    console.log("error in getDataSet :::: ", err.message)
  }
}


async function updateForNextForms(design_year, ulb, utiData) {
  try {
    let currentYear = getKeyByValue(years, design_year)
    let nextYearVal = currentYear.split("-");
    nextYearVal = Number(nextYearVal[0]) + 1 + "-" + (Number(nextYearVal[1]) + 1);
    let utilForm = await UtilizationReport.findOne({
      "designYear": ObjectId(years[nextYearVal]),
      "ulb": ObjectId(ulb)
    })
    if (utilForm) {
      let condition = {};
      condition._id = utilForm._id
      condition.ulb = ObjectId(ulb)
      condition.designYear = ObjectId(years[nextYearVal])
      condition.ulb = ulb;
      let utilFormStatus = calculateStatus(
        utilForm?.status,
        utilForm?.actionTakenByRole,
        utilForm?.isDraft,
        "ULB"
      );
      if (!utilForm.status) {
        utilFormStatus = MASTER_STATUS_ID[utilForm.currentFormStatus] || "Not Started"
      }
      /* Checking if the dur 22-23 form status is in progress, rejected by MoHUA or rejected by state.
      Then update it with latest values */
      if (
        [
          FORM_STATUS.In_Progress,
          FORM_STATUS.Rejected_By_MoHUA,
          FORM_STATUS.Rejected_By_State,
          FORM_STATUS.STATE_REJECTED,
        ].includes(utilFormStatus)
      ) {
        /* calculate closing balance and opening balance for 22-23 form */
        utilForm.grantPosition.unUtilizedPrevYr = utiData
          ?.grantPosition?.closingBal
          ? Number(utiData?.grantPosition?.closingBal)
          : "";
        utilForm.grantPosition.closingBal =
          Number(utilForm?.grantPosition?.unUtilizedPrevYr) +
          Number(utilForm?.grantPosition.receivedDuringYr) -
          Number(utilForm?.grantPosition?.expDuringYr);

        let updatedFetchedData = await UtilizationReport.findOneAndUpdate(
          condition,
          {
            $set: {
              grantPosition: utilForm?.grantPosition,
            },
          }
        );
      }
    }
    else {
      console.log("no form found:::")
    }
  }
  catch (err) {
    console.log(err)
    console.log("error in checkForNextForms :::: ", err.message)
  }
}