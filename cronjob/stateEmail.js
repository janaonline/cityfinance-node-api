const State = require("../models/State");
const User = require('../models/User');
const DUR = require("../models/UtilizationReport");
const PFMS = require("../models/LinkPFMS");
const TwentyEightSlb = require("../models/TwentyEightSlbsForm");
const AnnualAccount = require("../models/AnnualAccounts");
const PropertyTaxOp = require("../models/PropertyTaxOp");
const ODF = require("../models/OdfFormCollection");
const GFC = require("../models/GfcFormCollection");
const Ulb = require("../models/Ulb")
const { calculateStatus } = require("../routes/CommonActionAPI/service");
const StatusList = require("../util/newStatusList");
const Service = require('../service');
const {CollectionNames} = require('../util/15thFCstatus')
const { YEAR_CONSTANTS } = require("../util/FormNames");
const {calculateTabStatus} = require('../routes/annual-accounts/utilFunc');
const ObjectId = require("mongoose").Types.ObjectId;



const calculateFormStatus = async () => {
    const statesQuery =  State.find({}).lean();
    const usersQuery  =  User.find({role: "STATE",  isDeleted: false}).lean();
  
    const [states, users]  = await Promise.all([statesQuery, usersQuery]);
    const collections = [DUR, AnnualAccount, TwentyEightSlb, PFMS, ODF, GFC, PropertyTaxOp];
    let stateArray = [];
    for (let i = 0; i < states.length ; i++) {//states.length
      let emailAddress=[]
      /* This is filtering the users array and then mapping it to get the email addresses. */
      let filteredUsers = users.filter((element)=>{
        return element.state.toString() === states[i]["_id"].toString()
      })
      filteredUsers.forEach((el)=>{
        emailAddress.push(el.departmentEmail);
        emailAddress.push(el.email);
      })
      /* Removing duplicate email addresses. */
      emailAddress =  Array.from(new Set(emailAddress))
  
      let stateObj = {
        [states[i].name]: {},
      };
      const pipeline = [
        {
          $match: {
            design_year: ObjectId(YEAR_CONSTANTS["22_23"]),
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
            "ulb.state": ObjectId(states[i]._id),
          },
        },
        
      ];
  
      for (let j = 0; j < collections.length; j++) {
        let collection = collections[j];
        let formData = await collection.aggregate(pipeline);
        const ulbsCount = await Ulb.find({state:states[i]._id}).countDocuments();
        const obj = {
          [collection.$__collection.collectionName]: {
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
          obj[collection.$__collection.collectionName][
            calculateStatus(
              element.status,
              element.actionTakenByRole,
              element.isDraft,
              "ULB"
            )
          ] =
            obj[collection.$__collection.collectionName][
              calculateStatus(
                element.status,
                element.actionTakenByRole,
                element.isDraft,
                "ULB"
              )
            ] + 1;
        });
       /* This is calculating the number of forms that are not started. */
        obj[collection.$__collection.collectionName][StatusList.Not_Started] = ulbsCount - formData.length;
  
          if(collection.$__collection.collectionName === CollectionNames.annualAcc){
          Object.assign(stateObj[states[i].name],annualAccountStatus(formData, ulbsCount));
        }
        Object.assign(stateObj[states[i].name], obj);
      }
      Object.assign(stateObj[states[i].name], {emailAddress})
      delete stateObj[states[i].name][CollectionNames.annualAcc]
      stateArray.push(stateObj);
    }
    return stateArray;
  };
  
  module.exports.emailTrigger = async(req,res)=>{
  
    const statesResponse = await calculateFormStatus();
      // return res.json({
      //   status: true,
      //   statesResponse
      // })
    statesResponse.forEach((state)=>{
      let stateName = Object.keys(state)[0];
      let stateEmailTemplate = Service.emailTemplate.stateUlbFormTrigger(stateName,state );
      let mailOptions = {
        Destination: {
          /* required */
          // ToAddresses: state[stateName]["emailAddress"],
          ToAddresses: ["dalbeerk2017@gmail.com"],
        //   ToAddresses: ["aditya003.ay@gmail.com"],
  
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
    })
  }
  
  
  const annualAccountStatus = (formData, ulbCount)=>{
  
    const obj = {
      "AnnualAccount_Audited": {
        [StatusList.Not_Started]: 0,
        [StatusList.In_Progress]: 0,
        [StatusList.Under_Review_By_State]: 0,
        [StatusList.Rejected_By_State]: 0,
        [StatusList.Under_Review_By_MoHUA]: 0,
        [StatusList.Rejected_By_MoHUA]: 0,
        [StatusList.Approved_By_MoHUA]: 0,
      },
      "AnnualAccount_UnAudited": {
        [StatusList.Not_Started]: 0,
        [StatusList.In_Progress]: 0,
        [StatusList.Under_Review_By_State]: 0,
        [StatusList.Rejected_By_State]: 0,
        [StatusList.Under_Review_By_MoHUA]: 0,
        [StatusList.Rejected_By_MoHUA]: 0,
        [StatusList.Approved_By_MoHUA]: 0,
      },
    };
     formData.forEach((form)=> {
  
  
      const [auditedStatus, unAuditedStatus] = calculateTabStatus(form);
  
      const auditedForm =  form.hasOwnProperty("audited") ? form["audited"] : "";
      const unAuditedForm = form.hasOwnProperty("unAudited")  ? form["unAudited"] : "";
  
      if(auditedForm){
  
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
      if(unAuditedForm){
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
     })
  
     /* This is calculating the number of forms that are not started. */
     obj["AnnualAccount_Audited"][StatusList.Not_Started] = ulbCount - formData.length;
     obj["AnnualAccount_UnAudited"][StatusList.Not_Started] = ulbCount - formData.length;
  
     return obj;
  }