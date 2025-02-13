const {
  FormNames,
  YEAR_CONSTANTS,
  MASTER_STATUS,
  FORMIDs,
  FORM_LEVEL,
  USER_ROLE,
  MASTER_STATUS_ID,
  MASTER_FORM_STATUS,
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
const { years } = require("../../service/years");
const { canTakenActionMaster, getUAShortKeys } = require('../CommonActionAPI/service')

module.exports.createAndUpdateFormMasterState = async (params) => {
  try {
    let { modelName, formData, res, actionTakenByRole, actionTakenBy } = params;

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
            if (!Array.isArray(shortKeys) || !shortKeys.length) {
              return Response.BadRequest(res, {}, `UA shortkeys not found`);
            }
           shortKeys =  await filterApprovedShortKeys(shortKeys, formSubmit._id);
            if (formBodyStatus === MASTER_STATUS["In Progress"]) {
              for (let shortKey of shortKeys) {
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
              for (let shortKey of shortKeys) {
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



/**
 * The function filters out short keys that have been approved by the Ministry of Housing and Urban
 * Affairs (MoHUA).
 * @param shortKeys - An array of short keys.
 */
async function filterApprovedShortKeys(shortKeys, formId) {
  try {
    let updateShortKeys = await CurrentStatus.find(
      {
        recordId: ObjectId(formId),
        actionTakenByRole: "MoHUA",
        status: MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA'],
      },
      { shortKey: 1, _id: 0 }
    ).lean();
    updateShortKeys = updateShortKeys.map(el=> el.shortKey);
    if (updateShortKeys.length) {
      shortKeys = shortKeys.filter((el) => {
        return !updateShortKeys.includes(el);
      });
    }
    return shortKeys;
  } catch (error) {
    throw {message:`filterApprovedShortKeys:: ${error.message}` }
  }
}
/**
 * The function `addActionKeys` takes in user agent data, short keys, status data, and a role, and adds
 * additional properties to each user agent object based on the provided data.
 * @param uaData - An object containing user agent data. It has a property "uaData" which is an array
 * of user agent objects.
 * @param shortKeys - The `shortKeys` parameter is an object that maps user actions to their
 * corresponding short keys. It is used to assign a `uaCode` to each user action in the `uaData` array.
 * @param statusData - statusData is an array of objects that contains information about the status of
 * user actions. Each object in the array has the following properties:
 * @param role - The `role` parameter represents the role of the logged-in user. It is used in the
 * `params` object to determine the `loggedInUser` value for each `ua` object in the `uaData` array.
 */
function addActionKeys(uaData, shortKeys, statusData, role) {
  try {
    for (let ua of uaData["uaData"]) {
      ua["uaCode"] = shortKeys[ua["ua"]];
      let status = statusData.find((el) => el.shortKey === ua["uaCode"]);
      if (status) {
        ua["rejectReason"] = status["rejectReason"];
        ua["responseFile"] = status["responseFile"];
        let params = {
          status: status["status"],
          formType: USER_ROLE["STATE"],
          loggedInUser: role,
        };
        ua["status"] = MASTER_STATUS_ID[status["status"]];
        ua['statusId'] = status['status']
        ua["canTakeAction"] = canTakenActionMaster(params);
      } else {
        ua["rejectReason"] = "";
        ua["responseFile"] = "";
        ua["status"] = MASTER_STATUS_ID[MASTER_STATUS['Not Started']];
        ua['statusId'] = MASTER_STATUS['Not Started']
        ua["canTakeAction"] = false

      }
    }
  } catch (error) {
    console.log("error", error)
    throw { message: `addActionKeys:: ${error.message}` };
  }
}

module.exports.addActionKeys = addActionKeys

function createObjectFromArray(arr) {
  var result = {};
  for (var i = 0; i < arr?.length; i++) {
    var obj = arr[i];
    result[obj._id] = obj.UACode;
  }
  return result;
}

module.exports.createObjectFromArray = createObjectFromArray