const {
    FormNames,
    YEAR_CONSTANTS,
    MASTER_STATUS,
    FORMIDs,
    FORM_LEVEL,
  } = require("../../util/FormNames");
  const CurrentStatus = require("../../models/CurrentStatus");
  const { ModelNames } = require("../../util/15thFCstatus");
  const {
    saveCurrentStatus,
    saveFormHistory,
    saveStatusHistory,
  } = require("../../util/masterFunctions");
  const moongose = require("mongoose");
  const ObjectId = require('mongoose').Types.ObjectId;
  const Response = require("../../service").response;
  const {canTakenActionMaster} = require('../CommonActionAPI/service')

  const { years } = require("../../service/years");

module.exports.createAndUpdateFormMasterState = async (params) => {
  try {
    let { modelName, formData, res , actionTakenByRole, actionTakenBy} = params;

    let masterFormId = "";
    switch (modelName) {
      case ModelNames['waterRej']:
        masterFormId = FORMIDs['waterRej'];
        try {
          const formBodyStatus = formData.status;
          formData.status = "";
          formData.currentFormStatus = formBodyStatus;
          let formData2324 = await moongose
            .model(modelName)
            .findOne({ state: formData.state, design_year: formData.design_year })
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
              MASTER_STATUS["Returned By MoHUA"],
            ].includes(formCurrentStatus.status)
          ) {
            let formSubmit;
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
                shortKey: "form_level",
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
              formBodyStatus === MASTER_STATUS["Under Review By MoHUA"]
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
                status: MASTER_STATUS["Under Review By MoHUA"],
                level: FORM_LEVEL["form"],
                shortKey: "form_level",
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
                shortKey: "form_level",
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
              MASTER_STATUS["Approved By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
            ].includes(formCurrentStatus.status)
          ) {
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
        } catch (error) {
          return Response.BadRequest(res, {}, `${error.message} in 28 slb form submission`);
        }
        // }
        return;
        break;
      case ModelNames['dur']:
        masterFormId = FORMIDs['dur'];
        try {
          const formBodyStatus = formData.status;
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
            ].includes(formCurrentStatus.status)
          ) {
            if(formCurrentStatus.status === MASTER_STATUS['Not Started']){
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
            if(formCurrentStatus.status === MASTER_STATUS['In Progress']){
              if(!formData.isProjectLoaded && years['2023-24']){
                delete formData['projects']
              }
            }
            let formSubmit;
                if(formBodyStatus === MASTER_STATUS["Under Review By State"]){
                //   console.log("formData :: ",formData)
                  let validation =  checkForCalculations(formData)
                  if(!validation.valid){
                    return Response.BadRequest(res, {}, validation.messages);
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
                shortKey: "form_level",
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
                shortKey: "form_level",
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
                shortKey: "form_level",
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
              MASTER_STATUS["Approved By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
              MASTER_STATUS["Under Review By State"],
            ].includes(formCurrentStatus.status)
          ) {
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
        } catch (error) {
          return Response.BadRequest(res, {}, `${error.message} in DUR form submission`);
        }
    }
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};
