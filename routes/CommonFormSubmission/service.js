const { FormNames, YEAR_CONSTANTS , MASTER_STATUS, FORMIDs, FORM_LEVEL} = require("../../util/FormNames");
const CurrentStatus = require("../../models/CurrentStatus");
const {ModelNames} =  require('../../util/15thFCstatus')
const {saveCurrentStatus, saveFormHistory, saveStatusHistory} = require('../../util/masterFunctions');
const moongose = require("mongoose");

module.exports.createAndUpdateFormMaster = async(params)=>{

    let {modelName, formData, res} =  params;

    let masterFormId = "";
    switch(modelName){
        case ModelNames['twentyEightSlbs']:
            masterFormId =  FORMIDs['twentyEightSlb'];
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
        
                  if (formCurrentStatus &&
                    [
                      MASTER_STATUS["Not Started"],
                      MASTER_STATUS["In Progress"],
                      MASTER_STATUS["Rejected by State"],
                      MASTER_STATUS["Rejected by MoHUA"],
                    ].includes(formCurrentStatus.status)
                  ) {
                    let formSubmit;
                    formData["ulbSubmit"] =
                      formBodyStatus === MASTER_STATUS["Under Review by State"]
                      ? new Date()
                      : "";
                    if (formData2324) {
                      formSubmit = await moongose
                      .model(modelName)
                      .findOneAndUpdate(
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
                      formSubmit = await moongose
                        .model(modelName)
                        .create(formData,
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
                      await saveCurrentStatus({ body: currentStatusData, 
                        // session
                       });
        
                      // await session.commitTransaction();
                      return Response.OK(res, {}, "Form Submitted");
                    } else if (
                      formBodyStatus === MASTER_STATUS["Under Review by State"]
                    ) {
                      let bodyData = {
                        formId: masterFormId,
                        recordId: ObjectId(formSubmit._id),
                        data: formSubmit,
                      };
                      /* Saving the form history of the user. */
                      await saveFormHistory({ body: bodyData , 
                        // session
                      });
        
                      let currentStatusData = {
                        formId: masterFormId,
                        recordId: ObjectId(formSubmit._id),
                        status: MASTER_STATUS["Under Review by State"],
                        level: FORM_LEVEL["form"],
                        shortKey: "form_level",
                        rejectReason: "",
                        responseFile: "",
                        actionTakenByRole: actionTakenByRole,
                        actionTakenBy: ObjectId(actionTakenBy),
                      };
                      await saveCurrentStatus({ body: currentStatusData , 
                        // session
                      });
        
                      let statusHistory = {
                        formId: masterFormId,
                        recordId: ObjectId(formSubmit._id),
                        shortKey: "form_level",
                        data: currentStatusData,
                      };
                      await saveStatusHistory({ body: statusHistory ,
                        //  session 
                        });
                      
                      // await session.commitTransaction();
                      return Response.OK(res, {}, "Form Submitted");
                    }
                  } else if (
                    ![
                      MASTER_STATUS["Approved by MoHUA"],
                      MASTER_STATUS["Under Review by MoHUA"],
                      MASTER_STATUS["Under Review by State"],
                    ].includes(formData2324.status)
                  ) {
                    return res.status(200).json({
                      status: true,
                      message: "Form already submitted.",
                    });
                  }
                } catch (error) {
                  return res.status(400).json({
                    success: false,
                    message: error.message,
                  });
                }
      // }
          return;
        break;
    }

}