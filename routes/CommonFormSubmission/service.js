const {
  FormNames,
  YEAR_CONSTANTS,
  MASTER_STATUS,
  FORMIDs,
  FORM_LEVEL,
  FORM_LEVEL_SHORTKEY,
  MASTER_FORM_STATUS,
} = require("../../util/FormNames");
const CurrentStatus = require("../../models/CurrentStatus");
const { ModelNames } = require("../../util/15thFCstatus");
const {
  saveCurrentStatus,
  saveFormHistory,
  saveStatusHistory,
  checkForCalculationsForDurForm
} = require("../../util/masterFunctions");
const moongose = require("mongoose");
const ObjectId = require('mongoose').Types.ObjectId;
const Response = require("../../service").response;
const {canTakenActionMaster} = require('../CommonActionAPI/service')
// const UtilizationReport =  require('../../models/UtilizationReport');
const { years } = require("../../service/years");
const Service = require('../../service');

module.exports.createAndUpdateFormMaster = async (params) => {
  try {
    let { modelName, formData, res , actionTakenByRole, actionTakenBy, mailOptions = ""} = params;

    let masterFormId = "";
    switch (modelName) {
      case [ModelNames["twentyEightSlbs"],ModelNames["linkPFMS"]].find(item => item === modelName):
        masterFormId = modelName === ModelNames["twentyEightSlbs"] ? FORMIDs["twentyEightSlb"] :FORMIDs['PFMS']
        // if (formData.design_year === YEAR_CONSTANTS["23_24"] && formData.ulb) {
        try {
          const formBodyStatus = formData.status;
          formData.status = "";
          formData.currentFormStatus = formBodyStatus;
          let formData2324 = await moongose
            .model(modelName)
            .findOne({ ulb: formData.ulb, design_year: formData.design_year })
            .lean();
          let formCurrentStatus;
          if (!formData2324) {
            formCurrentStatus = {
              status: MASTER_STATUS["Not Started"],
            };
          } else {
            formCurrentStatus = await CurrentStatus.findOne({
              recordId: formData2324._id,
            }).lean();
          }

          if (
            formCurrentStatus &&
            [
              MASTER_STATUS["Not Started"],
              MASTER_STATUS["In Progress"],
              MASTER_STATUS["Returned By State"],
              MASTER_STATUS["Returned By MoHUA"],
            ].includes(formCurrentStatus?.status)
          ) {
            let formSubmit;
            formData["ulbSubmit"] =
              formBodyStatus === MASTER_STATUS["Under Review By State"]
                ? new Date()
                : "";
            if (formData2324) {
              formSubmit = await moongose.model(modelName).findOneAndUpdate(
                {
                  _id: formData2324._id,
                },
                {
                  $set: formData,
                },
                {
                  new: true,
                  // session: session
                }
              );
            } else {
              formSubmit = await moongose.model(modelName).create(
                formData
                // { session }
              );
            }

            if (formBodyStatus === MASTER_STATUS["In Progress"]) {
              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["In Progress"],
                level: FORM_LEVEL["form"],
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({
                body: currentStatusData,
                // session
              });

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            } else if (
              formBodyStatus === MASTER_STATUS["Under Review By State"]
            ) {
              let bodyData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                data: formSubmit,
              };
              /* Saving the form history of the user. */
              await saveFormHistory({
                body: bodyData,
                // session
              });

              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["Under Review By State"],
                level: FORM_LEVEL["form"],
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({
                body: currentStatusData,
                // session
              });

              let statusHistory = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                data: currentStatusData,
              };
              await saveStatusHistory({
                body: statusHistory,
                //  session
              });
              //email trigger after form submission
              Service.sendEmail(mailOptions);

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            }
          } else if (
            [
              MASTER_STATUS["Submission Acknowledged By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
              MASTER_STATUS["Under Review By State"],
            ].includes(formCurrentStatus?.status)
          ) {
            console.log(">>>>>>>>>>>>>>>>>>>>>")
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
        } catch (error) {
          console.log(error)
          return Response.BadRequest(res, {}, `${error.message} in 28 slb form submission`);
        }
        // }
        return;
        break;
      case ModelNames['dur']:
        masterFormId = FORMIDs['dur'];
        try {
          const formBodyStatus = formData.status || formData.currentFormStatus ;
          formData.status = "";
          formData.currentFormStatus = formBodyStatus;
          let formData2324 = await moongose
            .model(modelName)
            .findOne({ ulb: formData.ulb, designYear: formData.designYear })
            .lean();
          let formCurrentStatus;
          if (!formData2324) {
            formCurrentStatus = {
              status: MASTER_STATUS["Not Started"],
            };
          } else {
            formCurrentStatus = await CurrentStatus.findOne({
              recordId: formData2324._id,
            }).lean();
          }
          if (
            formCurrentStatus &&
            [
              MASTER_STATUS["Not Started"],
              MASTER_STATUS["In Progress"],
              MASTER_STATUS["Returned By State"],
              MASTER_STATUS["Returned By MoHUA"],
            ].includes(formCurrentStatus?.status)
          ) {
            if(formCurrentStatus?.status === MASTER_STATUS['Not Started']){
              // const form = await new UtilizationReport(formData);
              // if (form) {
              //   formData.createdAt = form.createdAt;
              //   formData.modifiedAt = form.modifiedAt;
              //   let sum = 0;
              //   if (formData.projects.length > 0) {
              //     for (let i = 0; i < formData.projects.length; i++) {
              //       let project = formData.projects[i];
              //       project.modifiedAt = form.projects[i].modifiedAt;
              //       project.createdAt = form.projects[i].createdAt;
              //       sum += parseInt(project.cost);
              //       if (project.category) {
              //         project.category = ObjectId(project.category);
              //       }
              //       if (project._id) {
              //         project._id = ObjectId(project._id);
              //       }
              //     }
              //   }
              // }
              // formData = form;
            }
            if(formCurrentStatus?.status === MASTER_STATUS['In Progress']){
              if(!formData.isProjectLoaded && years['2023-24']){
                delete formData['projects']
              }
            }
            if(formCurrentStatus.status === MASTER_STATUS['Returned By State'] && formBodyStatus === MASTER_STATUS['In Progress'] ){
              if(!formData.isProjectLoaded && years['2023-24']){
                delete formData['projects']
              }
            }
            let formSubmit;
            formData["ulbSubmit"] =
              formBodyStatus === MASTER_STATUS["Under Review By State"]
                ? new Date()
                : "";
                if(formBodyStatus === MASTER_STATUS["Under Review By State"]){
                  if(!formData.isProjectLoaded && formData2324){
                    formData.projects = formData2324.projects
                  }

                  let validation =  checkForCalculationsForDurForm(formData)
                  if(!validation.valid){
                    return Response.BadRequest(res, {}, validation.messages);
                  }
                }
                if(formCurrentStatus?.status === MASTER_STATUS['Returned By State'] && formBodyStatus === MASTER_STATUS['In Progress'] ){
                  if(!formData.isProjectLoaded && years['2023-24']){
                    delete formData['projects']
                  }
                }
            if (formData2324) {
              formSubmit = await moongose.model(modelName).findOneAndUpdate(
                {
                  _id: formData2324._id,
                },
                {
                  $set: formData,
                },
                {
                  new: true,
                  // session: session
                }
              );
            } else {
              formSubmit = await moongose.model(modelName).create(
                formData
                // { session }
              );
            }
            
            if (formBodyStatus === MASTER_STATUS["In Progress"]) {
              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["In Progress"],
                level: FORM_LEVEL["form"],
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({
                body: currentStatusData,
                // session
              });

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            } else if (
              formBodyStatus === MASTER_STATUS["Under Review By State"]
            ) {
              let bodyData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                data: formSubmit,
              };
              /* Saving the form history of the user. */
              await saveFormHistory({
                body: bodyData,
                // session
              });

              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["Under Review By State"],
                level: FORM_LEVEL["form"],
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({
                body: currentStatusData,
                // session
              });

              let statusHistory = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                shortKey: FORM_LEVEL_SHORTKEY["form"],
                data: currentStatusData,
              };
              await saveStatusHistory({
                body: statusHistory,
                //  session
              });

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            }
          } else if (
            [
              MASTER_STATUS["Submission Acknowledged By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
              MASTER_STATUS["Under Review By State"],
            ].includes(formCurrentStatus?.status)
          ) {
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
          return Response.BadRequest(res, {}, `form status not found in DUR form submission`);
        } catch (error) {
          console.log(error)
          return Response.BadRequest(res, {}, `${error.message} in DUR form submission`);
        }
    }
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};


/* Checking if the user can take action on the form or not. */
module.exports.getMasterForm = async (params) => {
  try {
    let { modelName, currentFormStatus ,formType, actionTakenByRole} = params;
    
    switch(true){
      case [ModelNames['twentyEightSlbs'], ModelNames['dur']].includes(modelName):
          let params = {
            status: currentFormStatus,
            formType,
            loggedInUser: actionTakenByRole,
          };
          return { canTakeAction: canTakenActionMaster(params)};
        break;
    }
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
}

let validationMessages = {
  "projectExpMatch":"Sum of all project wise expenditure amount does not match total expenditure amount provided in the XVFC summary section. Kindly recheck the amounts.",
  "expWmSwm":" The total expenditure in the component wise grants must not exceed the amount of expenditure incurred during the year.",
  "negativeBal":"Closing balance is negative because Expenditure amount is greater than total tied grants amount available. Please recheck the amounts entered."
}


async function saveStatusAndHistory(params){
  let validation = {
    "message":"",
    "valid":true
  }
  let {formBodyStatus,actionTakenBy,actionTakenByRole,formSubmit,formType,shortKey} = params
  let masterFormId = FORMIDs[formType]
  let reviewAllowedStatuses = [MASTER_FORM_STATUS['RETURNED_BY_MoHUA'],MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA'],MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_PMU'],MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'],MASTER_FORM_STATUS['UNDER_REVIEW_BY_STATE']]
  try{
    if (formBodyStatus === MASTER_STATUS["In Progress"]) {
      let currentStatusData = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit[0]._id),
        status: MASTER_STATUS["In Progress"],
        level: FORM_LEVEL["form"],
        shortKey: shortKey || 'form_level',
        rejectReason:  "",
        responseFile: "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
      };
      await saveCurrentStatus({
        body: currentStatusData,
        // session
      });
      // return Response.OK(res, {}, "Form Submitted");
    } else if (
      reviewAllowedStatuses.includes(formBodyStatus) 
    ) {
      let bodyData = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit[0]._id),
        data: formSubmit,
      };
      await saveFormHistory({
        body: bodyData,
      });

      let currentStatusData = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit[0]._id),
        status: formBodyStatus,
        level: FORM_LEVEL["form"],
        shortKey: shortKey || FORM_LEVEL_SHORTKEY["form"],
        rejectReason: formSubmit[0].rejectReason || "",
        responseFile:  formSubmit[0].responseFile || "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
      };
      await saveCurrentStatus({
        body: currentStatusData,
        // session
      });

      let statusHistory = {
        formId: masterFormId,
        recordId: ObjectId(formSubmit[0]._id),
        shortKey: shortKey || FORM_LEVEL_SHORTKEY["form"],
        data: currentStatusData,
      };
      
        await saveStatusHistory({
          body: statusHistory,
        });
    }
  }
  catch(err){
    validation.message = err.message
    validation.valid = false
    console.log("error in saveStatusAndHistory :::: ",err.message)
  }
  return validation
}

module.exports.saveStatusAndHistory = saveStatusAndHistory