const State = require("../models/State");
const User = require("../models/User");
const DUR = require("../models/UtilizationReport");
const PFMS = require("../models/LinkPFMS");
const TwentyEightSlb = require("../models/TwentyEightSlbsForm");
const AnnualAccount = require("../models/AnnualAccounts");
const PropertyTaxOp = require("../models/PropertyTaxOp");
const ODF = require("../models/OdfFormCollection");
const GFC = require("../models/GfcFormCollection");
const Ulb = require("../models/Ulb");
const { calculateStatus } = require("../routes/CommonActionAPI/service");
const StatusList = require("../util/newStatusList");
const Service = require("../service");
const { CollectionNames } = require("../util/15thFCstatus");
const { YEAR_CONSTANTS } = require("../util/FormNames");
const { calculateTabStatus } = require("../routes/annual-accounts/utilFunc");
const ObjectId = require("mongoose").Types.ObjectId;

const EMAIL_STATE_IN_ONE_ITERATION = 5;
const calculateFormStatus = async (
  states,
  numOfStatesToSendEmail,
  startIndex
) => {
  // const statesQuery = State.find({}).lean();
  let lastIndex = startIndex + numOfStatesToSendEmail;
  // const usersQuery = User.find({ role: "STATE", isDeleted: false }).lean();
  // const [states, users] = await Promise.all([statesQuery, usersQuery]);
  const collections = [
    DUR,
    AnnualAccount,
    TwentyEightSlb,
    PFMS,
    ODF,
    GFC,
    PropertyTaxOp,
  ];
  let stateArray = [];
  let prmsArr = [];

  for (let i = startIndex; i < lastIndex; i++) {
    //states.length

    prmsArr.push(
      new Promise(async (resolve, reject) => {
        try {
          let emailAddress = [];
          let state = states[i];
          /* This is filtering the users array and then mapping it to get the email addresses. */
          let filteredUsers = await User.find({
            role: "STATE",
            isDeleted: false,
            state: ObjectId(state["_id"]),
          }).lean();

          filteredUsers.forEach((el) => {
            emailAddress.push(el.departmentEmail);
            emailAddress.push(el.email);
          });
          /* Removing duplicate email addresses. */
          emailAddress = Array.from(new Set(emailAddress));

          let stateObj = {
            [state.name]: {},
          };
          const ulbsCount = await Ulb.find({
            state: state._id,
            "access_2223" : true,
          }).countDocuments();
          for (let j = 0; j < collections.length; j++) {
            let collection = collections[j];
            let design_year = "design_year";
            //Case handled for dur design_year
            if (
              collections[j].collection.collectionName ===
              CollectionNames["dur"]
            ) {
              design_year = "designYear";
            }
            const pipeline = [
              {
                $match: {
                  [design_year]: ObjectId(YEAR_CONSTANTS["22_23"]),
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
                $match: {
                  "ulb.state": ObjectId(state._id),
                },
              },
            ];

            let formData = await collection.aggregate(pipeline);

            const obj = {
              [collection.collection.collectionName]: {
                [StatusList.Not_Started]: 0,
                [StatusList.In_Progress]: 0,
                [StatusList.Under_Review_By_State]: 0,
                [StatusList.Rejected_By_State]: 0,
                [StatusList.Under_Review_By_MoHUA]: 0,
                [StatusList.Rejected_By_MoHUA]: 0,
                [StatusList.Approved_By_MoHUA]: 0,
              },
            };

            /* Iterating over the formData and calculating the status of each form and then adding it to the
        object. */
            formData.forEach((element) => {
              obj[collection.collection.collectionName][
                calculateStatus(
                  element.status,
                  element.actionTakenByRole,
                  element.isDraft,
                  "ULB"
                )
              ] =
                obj[collection.collection.collectionName][
                  calculateStatus(
                    element.status,
                    element.actionTakenByRole,
                    element.isDraft,
                    "ULB"
                  )
                ] + 1;
            });
            /* This is calculating the number of forms that are not started. */
            obj[collection.collection.collectionName][StatusList.Not_Started] =
              ulbsCount - formData.length;

            if (
              collection.collection.collectionName === CollectionNames.annualAcc
            ) {
              Object.assign(
                stateObj[state.name],
                annualAccountStatus(formData, ulbsCount)
              );
            }
            Object.assign(stateObj[state.name], obj);
          }
          Object.assign(stateObj[state.name], { emailAddress });
          delete stateObj[state.name][CollectionNames.annualAcc];

          resolve(stateObj);
        } catch (error) {
          reject(error);
        }
      })
    );
  }
  return await Promise.all(prmsArr);
};

module.exports.emailTrigger = async () =>
  // req,res
  {
    const states = await State.find({  
        "accessToXVFC" : true
  }).lean();
    let NumberOfTimeLoopExecutes = Number(
      (states.length / EMAIL_STATE_IN_ONE_ITERATION).toFixed()
    );

    /* This is for testing purpose. */
    // if(req.query.test){
    //   NumberOfTimeLoopExecutes = req.query.iterate ? Number(req.query.iterate) : 2 ;
    // }

    for (let i = 0; i < NumberOfTimeLoopExecutes; i++) {
      let startIndex = i * EMAIL_STATE_IN_ONE_ITERATION;

      /* This is for testing purpose. */
      // if(req.query.test){
      //   startIndex =  req.query.startIndex ? Number(req.query.startIndex) : "";
      // }
      const statesResponse = await calculateFormStatus(
        states,
        EMAIL_STATE_IN_ONE_ITERATION,
        startIndex
      );

      statesResponse.forEach((state) => {
        let stateName = Object.keys(state)[0];
        let stateEmailTemplate = Service.emailTemplate.stateUlbFormTrigger(
          stateName,
          state
        );

        /* This is for testing purpose. */
        if(process.env.ENV !== "production"){
          state[stateName]['emailAddress'] =  ["dalbeerk2017@gmail.com"]
        }

        let mailOptions = {
          Destination: {
            /* required */
            ToAddresses: state[stateName]["emailAddress"],
            // ToAddresses: ["dalbeerk2017@gmail.com"],
            // ToAddresses: ["aditya.yadav@dhwaniris.com"],
          },
          Message: {
            /* required */
            Body: {
              /* required */
              Html: {
                Charset: "UTF-8",
                Data: stateEmailTemplate.body,
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: stateEmailTemplate.subject,
            },
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
        };

        Service.sendEmail(mailOptions);
      });
    }
  };
const annualAccountStatus = (formData, ulbCount) => {
  const obj = {
    AnnualAccount_Audited: {
      [StatusList.Not_Started]: 0,
      [StatusList.In_Progress]: 0,
      [StatusList.Under_Review_By_State]: 0,
      [StatusList.Rejected_By_State]: 0,
      [StatusList.Under_Review_By_MoHUA]: 0,
      [StatusList.Rejected_By_MoHUA]: 0,
      [StatusList.Approved_By_MoHUA]: 0,
    },
    AnnualAccount_UnAudited: {
      [StatusList.Not_Started]: 0,
      [StatusList.In_Progress]: 0,
      [StatusList.Under_Review_By_State]: 0,
      [StatusList.Rejected_By_State]: 0,
      [StatusList.Under_Review_By_MoHUA]: 0,
      [StatusList.Rejected_By_MoHUA]: 0,
      [StatusList.Approved_By_MoHUA]: 0,
    },
  };
  formData.forEach((form) => {
    let [auditedStatus, unAuditedStatus] = calculateTabStatus(form);

    const auditedForm = form.hasOwnProperty("audited") ? form["audited"] : "";
    const unAuditedForm = form.hasOwnProperty("unAudited")
      ? form["unAudited"]
      : "";

    if (auditedForm) {
      if(form.status === "REJECTED"){
        auditedStatus = "REJECTED"
      }
      obj["AnnualAccount_Audited"][
        calculateStatus(
          auditedStatus,
          form.actionTakenByRole,
          form.isDraft,
          "ULB"
        )
      ] =
        obj["AnnualAccount_Audited"][
          calculateStatus(
            auditedStatus,
            form.actionTakenByRole,
            form.isDraft,
            "ULB"
          )
        ] + 1;
    }
    if (unAuditedForm) {
      if(form.status === "REJECTED")
      {
        unAuditedStatus =  "REJECTED"
      }
      obj["AnnualAccount_UnAudited"][
        calculateStatus(
          unAuditedStatus,
          form.actionTakenByRole,
          form.isDraft,
          "ULB"
        )
      ] =
        obj["AnnualAccount_UnAudited"][
          calculateStatus(
            unAuditedStatus,
            form.actionTakenByRole,
            form.isDraft,
            "ULB"
          )
        ] + 1;
    }
  });

  /* This is calculating the number of forms that are not started. */
  obj["AnnualAccount_Audited"][StatusList.Not_Started] =
    ulbCount - formData.length;
  obj["AnnualAccount_UnAudited"][StatusList.Not_Started] =
    ulbCount - formData.length;

  return obj;
};


// emailTrigger();
