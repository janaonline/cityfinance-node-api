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
  const UA = require('../../models/UA');
  const {canTakenActionMaster} = require('../CommonActionAPI/service')

  const { years } = require("../../service/years");

module.exports.createAndUpdateFormMasterState = async (params) => {
  try {
    let { modelName, formData, res , actionTakenByRole, actionTakenBy} = params;

    let masterFormId = modelName === ModelNames['waterRej'] ? FORMIDs['waterRej'] : FORMIDs['actionPlan'];

    switch (true) {
      case [ModelNames['waterRej'], ModelNames['actionPlan']].includes(modelName):
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
            formCurrentStatus = {
              status: formData2324.currentFormStatus
            }
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
            };
            let shortKeys = await getUAShortKeys(formData.state);
            if(!Array.isArray(shortKeys)|| !shortKeys.length)
            {
              return Response.BadRequest(res, {}, `UA shortkeys not found`);
            }
            if (formBodyStatus === MASTER_STATUS["In Progress"]) {
              for(let shortKey of shortKeys){
                let currentStatusData = {
                  formId: masterFormId,
                  recordId: ObjectId(formSubmit._id),
                  status: MASTER_STATUS["In Progress"],
                  level: FORM_LEVEL["question"],
                  shortKey,
                  rejectReason: "",
                  responseFile: "",
                  actionTakenByRole: actionTakenByRole,
                  actionTakenBy: ObjectId(actionTakenBy),
                };
                await saveCurrentStatus({
                  body: currentStatusData,
                  // session
                });
              }
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
              for(let shortKey of shortKeys){
                let currentStatusData = {
                  formId: masterFormId,
                  recordId: ObjectId(formSubmit._id),
                  status: MASTER_STATUS["Under Review By MoHUA"],
                  level: FORM_LEVEL["question"],
                  shortKey,
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
                  shortKey,
                  data: currentStatusData,
                };
                await saveStatusHistory({
                  body: statusHistory,
                  //  session
                });
              }

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            }
          } else if (
            [
              MASTER_STATUS["Submission Acknowledged By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
            ].includes(formCurrentStatus.status)
          ) {
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
        } catch (error) {
          return Response.BadRequest(res, {}, `${error.message} in water rej form submission`);
        }
        // }
        return;
        break;
    }
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};
async function getUAShortKeys(state) {
  const uaShortkeyQuery = [
    {
      $match: {
        state: ObjectId(state),
      },
    },
    {
      $unwind: {
        path: "$ulb",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "ulbs",
        let: {
          firstUser: "$ulb",
          uaCode: "$UACode",
        },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$firstUser"] },
            },
          },
          {
            $project: {
              code: { $concat: ["$$uaCode", "_", "$code"] },
              _id: 0,
            },
          },
        ],
        as: "ulb",
      },
    },
    {
      $unwind: {
        path: "$ulb",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];
  let UasDataWithShortKey = await UA.aggregate(uaShortkeyQuery);
  let shortKeys = [];
  if(Array.isArray(UasDataWithShortKey) && UasDataWithShortKey.length){
    shortKeys =  UasDataWithShortKey.map(el=>{
      return el['ulb']['code'];
    })
  }
  return shortKeys;
}
