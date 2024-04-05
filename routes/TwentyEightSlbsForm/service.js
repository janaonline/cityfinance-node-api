const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const ObjectId = require('mongoose').Types.ObjectId;
const IndicatorLineItem = require('../../models/indicatorLineItems')
const { findPreviousYear } = require('../../util/findPreviousYear')
const Year = require('../../models/Year')
const { groupByKey } = require('../../util/group_list_by_key')
const SLB = require('../../models/XVFcGrantForm')
const { canTakenAction, calculateStatus, isYearWithinRange } = require('../CommonActionAPI/service')
const Service = require('../../service');
const { FormNames, YEAR_CONSTANTS, MASTER_STATUS_ID, PREV_MASTER_FORM_STATUS, FORM_STATUS_CODES } = require('../../util/FormNames');
const User = require('../../models/User');
const MasterForm = require('../../models/MasterForm')
const StatusList = require('../../util/newStatusList')
const { BackendHeaderHost, FrontendHeaderHost } = require('../../util/envUrl');
const Ulb = require('../../models/Ulb');
const Response = require("../../service").response;
const { createAndUpdateFormMaster, getMasterForm } = require('../../routes/CommonFormSubmission/service')
const { ModelNames } = require('../../util/15thFCstatus');
const { years } = require('../../service/years');
const { getKeyByValue } = require('../../util/masterFunctions');
const { getPreviousYear } = require('../sidemenu/service');

let messages = {
  "2021-22": "",
  "2022-23": "Previous",
  "2023-24": "20-21",
  "2024-25": "20-21"
};
const LINE_ITEMS_CONSTANT = [];

function response(form, res, successMsg, errMsg) {
  if (form) {
    return res.status(200).json({
      status: true,
      message: successMsg,
      data: form,
    });
  } else {
    return res.status(400).json({
      status: false,
      message: errMsg
    });
  }
}
function rejectResponse(res, errMsg) {
  return res.status(400).json({
    status: false,
    message: errMsg
  })
}


const PrevLineItem_CONSTANTS = {
  "Coverage of water supply connections": "6284d6f65da0fa64b423b53a",
  "Per capita supply of water(lpcd)": "6284d6f65da0fa64b423b53c",
  "Extent of non-revenue water (NRW)": "6284d6f65da0fa64b423b540",
  "Coverage of waste water network services": "6284d6f65da0fa64b423b52a"
}

module.exports.createOrUpdateForm = async (req, res) => {
  try {
    const data = req.body;
    const user = req.decoded;
    let formData = {};
    formData = { ...data };
    const formName = FormNames["slb28"];
    const { _id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;

    formData['actionTakenBy'] = ObjectId(user._id);
    formData['actionTakenByRole'] = "ULB";
    let currentMasterFormStatus = req.body['status']
    formData['status'] = "PENDING"
    formData['ulbSubmit'] = "";

    if (!(data.ulb && data.design_year)) {
      return res.status(400).json({
        status: false,
        message: "Ulb and design year is mandatory",
      });
    }

    if (!data?.data || data?.data.length <= 0) {
      return Response.BadRequest(res, {}, "Data fields are required");
    }

    formData.ulb = ObjectId(formData.ulb);
    formData.design_year = ObjectId(formData.design_year);

    const condition = {};
    condition.ulb = data.ulb;
    condition.design_year = data.design_year;

    let userData = await User.find({
      $or: [
        { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
        { isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
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


    if (isYearWithinRange(formData.design_year.toString()) && formData.ulb) {
      formData.status = currentMasterFormStatus
      let params = {
        modelName: ModelNames["twentyEightSlbs"],
        formData,
        res,
        actionTakenByRole,
        actionTakenBy, 
        mailOptions
      };
      return await createAndUpdateFormMaster(params);
    }
    
    const submittedForm = await TwentyEightSlbsForm.findOne(condition).lean();
    if ((submittedForm) && submittedForm.isDraft === false &&
      submittedForm.actionTakenByRole === "ULB") {//Form already submitted
      return res.status(200).json({
        status: true,
        message: "Form already submitted."
      })
    }
    else {
      if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
        formData['ulbSubmit'] = new Date();
        const form = await TwentyEightSlbsForm.create(formData);

        formData.createdAt = form.createdAt;
        formData.modifiedAt = form.modifiedAt;
        formData.population = Number(formData.population);
        if (formData.data.length == 28) {
          if (form) {
            const addedHistory = await TwentyEightSlbsForm.findOneAndUpdate(
              condition,
              { $push: { "history": formData } },
              { new: true, runValidators: true }
            )
            if (addedHistory) {
              //email trigger after form submission
              Service.sendEmail(mailOptions);
            }
            return response(addedHistory, res, "Form created.", "Form not created")
          } else {
            return res.status(400).json({
              status: false,
              message: "Form not created."
            })
          }
        } else {
          return res.status(400).json({
            success: false,
            message: "Cannot Final Submit with incomplete Data"
          })
        }

      } else {
        if ((!submittedForm) && formData.isDraft === true) { // create as draft

          let newData = new TwentyEightSlbsForm(formData);
          await newData.save()
          return res.status(200).json({
            success: true,
            message: "Data Saved"
          })
        }
      }
    }
    if (submittedForm && submittedForm.status !== "APPROVED") {
      if (formData.isDraft === true) {
        const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
          condition,
          { $set: formData },
          { new: true, runValidators: true }
        );
        if (!updatedForm) rejectResponse(res, "form not updated")
        return res.status(200).json({
          success: true,
          data: updatedForm,
          message: "Form Updated"
        })
      } else {
        //final submit already existing form
        formData.createdAt = submittedForm.createdAt;
        formData.modifiedAt = new Date();
        formData.modifiedAt.toISOString();
        formData['ulbSubmit'] = new Date();
        if (formData.data.length == 28) {
          let currentData = {}
          Object.assign(currentData, formData)

          formData['history'] = submittedForm['history']
          formData['history'].push(currentData)
          // formData['history'].push(formData) 

          delete formData['_id']
          const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
            condition,
            formData,

          );
          if (!updatedForm) rejectResponse(res, "form not created")
          if (updatedForm) {
            //email trigger after form submission
            Service.sendEmail(mailOptions);
          }
          return res.status(200).json({
            success: true,
            data: updatedForm,
            message: "Form Saved"
          })
        } else {
          return res.status(400).json({
            success: false,
            message: "Cannot Final Submit with incomplete Data"
          })
        }

      }

    }
    if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB"
      && submittedForm.isDraft === false) {
      return res.status(200).json({
        status: true,
        message: "Form already submitted"
      })
    }

    //             if ( submittedForm && submittedForm.isDraft) {//update already existing form
    //                 if(formData.isDraft){//save as draft 
    //                     const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
    //                         condition,
    //                         {$set: formData},
    //                         {new: true, runValidators: true}
    //                     );
    //                     if(!updatedForm) rejectResponse(res, "form not updated")
    //                    return res.status(200).json({
    //                     success: true,
    //                     data: updatedForm,
    //                     message:"Form Updated"
    //                    })
    //                 } else {//final submit already existing form
    //                     formData.createdAt = submittedForm.createdAt;
    //                     formData.modifiedAt = new Date();
    //                     formData.modifiedAt.toISOString();
    //                  if(formData.data.length == 28){
    //                     let currentData = {}
    //                     Object.assign(currentData,formData ) 

    //                     formData['history'] = submittedForm['history']
    //                     formData['history'].push(currentData)
    //                     // formData['history'].push(formData) 

    // delete formData['_id']
    //                     const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
    //                         condition,
    //                         formData,

    //                     );
    //                     if(!updatedForm) rejectResponse(res, "form not created")
    //                     return res.status(200).json({
    //                         success: true,
    //                         data: updatedForm,
    //                         message:"Form Saved"
    //                        })
    //                  }else{
    //                     return res.status(400).json({
    //                         success: false,
    //                         message:"Cannot Final Submit with incomplete Data"
    //                     })
    //                  }

    //                 }
    //             }else {
    //                 if(!submittedForm){
    // let newData = new TwentyEightSlbsForm(formData);
    // await newData.save()
    // return res.status(200).json({
    // success: true,
    // message:"Data Saved"
    // })
    //                 }else if(submittedForm && !submittedForm.isDraft){
    //                     if(formData['actionTakenByRole'] == submittedForm['actionTakenByRole']){
    //                         return res.status(403).json({
    //                             success: false,
    //                             message:"Form Cannot be Resubmitted after Final Submit"

    //                         })
    //                     }else{
    //                         // provide code for action
    //                     }
    //                 }
    //             }

  } catch (error) {
    return res.status(400).json({
      status: false,
      message: error.message
    });
  }
}


module.exports.getForm = async (req, res, next) => {
  try {
    let userRole = req.decoded.role
    const data = req.query;
    const condition = {};
    if (!(data.ulb && data.design_year)) {
      return res.status(400).json({
        status: false,
        show: false,
        message: "Design year and Ulb are mandatory"
      })
    }
    const ulbData = await Ulb.findOne({
      _id: ObjectId(data.ulb)
    }).lean();
    condition['ulb'] = ObjectId(data.ulb);
    condition['design_year'] = ObjectId(data.design_year);
    let yearData = await Year.findOne({
      _id: ObjectId(data.design_year)
    }).lean()
    let targetYearArr = yearData.year.split("-")
    let targetYearValue = `${targetYearArr[0].slice(-2)}${targetYearArr[1]}`
    let prevYearVal = findPreviousYear(yearData.year);
    let prevYearData = await Year.findOne({
      _id: years['2021-22']
    }).lean()
    let masterFormData = await MasterForm.findOne({
      ulb: data.ulb,
      design_year: prevYearData._id,
    }).lean();
    /* Checking the host header and setting the host variable to the appropriate value. */
    let host = "";
    if (req.headers.host === BackendHeaderHost.Demo) {
      host = FrontendHeaderHost.Demo;
    }
    /* Checking if the host is empty, if it is, it will set the host to the req.headers.host. */
    host = host !== "" ? host : req.headers.host;
    let keyName = getKeyByValue(years, data.design_year)
    if (ulbData.access_2122) {
      if (masterFormData) {
        isDraft = !masterFormData.isSubmit
        if (masterFormData?.history?.length > 0) {
          masterFormData =
            masterFormData.history[masterFormData?.history.length - 1];
        }
        let status = calculateStatus(
          masterFormData.status,
          masterFormData.actionTakenByRole,
          !masterFormData.isSubmit,
          "ULB"
        );
        /* Checking the status of the form. If the status is not in the list of statuses, it will
          return a message. */
        if (
          ![
            StatusList.Under_Review_By_MoHUA,
            StatusList.Approved_By_MoHUA,
            StatusList.Approved_By_State,
          ].includes(status) 
          // && ulbData.UA
        ) {
          let msg = userRole === "ULB" ? `Your ${messages[keyName]} Year's SLBs for Water Supply and Sanitation form status is - ${status ? status : "Not Submitted"
            }. Kindly submit form at - <a href =https://${host}/ulbform/ulbform-overview target="_blank">Click here</a> in order to submit form` : `Dear User, The ${ulbData.name} has not yet filled ${messages[keyName]} Year's SLBs for Water Supply and Sanitation form. You will be able to mark your response once STATE approves ${messages[keyName]} year's form.`
          req.json = {
            status: true,
            show: true,
            message: msg,
          }
          // return res.status(200).json({
          //   status: true,
          //   show: true,
          //   message: msg,
          // });
          next()
          return
        }
      } else {
        // if(ulbData.UA){
          req.json = {
          status: true,
          show: true,
          message: userRole === "ULB" ?
            `Your ${messages[keyName]} Year's SLBs for Water Supply and Sanitation form status is - "Not Submitted". Kindly submit form at - <a href =https://${host}/ulbform/ulbform-overview target="_blank">Click here</a> in order to submit form` :
            `Dear User, The ${ulbData.name} has not yet filled ${messages[keyName]} Year's SLBs for Water Supply and Sanitation form. You will be able to mark your response once STATE approves previous year's form.`,
          }
          next();
          return;
        // }
        // return res.status(200).json({
        //   status: true,
        //   show: true,
        //   message:  userRole === "ULB" ? `Your Previous Year's SLBs for Water Supply and Sanitation form status is - "Not Submitted". Kindly submit form at - <a href =https://${host}/ulbform/ulbform-overview target="_blank">Click here</a> in order to submit form` : `Dear User, The ${ulbData.name} has not yet filled Previous Year's SLBs for Water Supply and Sanitation form. You will be able to mark your response once STATE approves previous year's form.` ,
        // });
      }
    }

    let formData = await TwentyEightSlbsForm.findOne(condition, { history: 0 }).lean()
    let slbDataNotFilled;
    if (formData) {
      let slb28FormStatus = calculateStatus(
        formData.status,
        formData.actionTakenByRole,
        formData.isDraft,
        "ULB"
      );
      if (!formData.status) {
        slb28FormStatus = MASTER_STATUS_ID[formData.currentFormStatus]
      }
      if (ulbData.access_2122) {
        let slbData = await SLB.findOne({
          ulb: ObjectId(data.ulb),
          // design_year: YEAR_CONSTANTS["21_22"],
          accessibleForYears: { "$in": [ObjectId(data.design_year)] }
        }).lean();
        if (slbData) {
          slbDataNotFilled = slbData.blank;
          formData["data"].forEach((element) => {

            if ([StatusList.Not_Started].includes(slb28FormStatus)) {
              /* Checking if the element is equal to the previous line item. */
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS[
                "Coverage of water supply connections"
                ]
              ) {
                element.target_1.value =
                  slbData.waterManagement.houseHoldCoveredPipedSupply.hasOwnProperty(
                    "target"
                  )
                    ? Number(
                      slbData.waterManagement.houseHoldCoveredPipedSupply
                        ?.target[targetYearValue]
                    )
                    : "";
                slbDataNotFilled ? (element.targetDisable = false) : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS["Per capita supply of water(lpcd)"]
              ) {
                element.target_1.value =
                  slbData.waterManagement.waterSuppliedPerDay.hasOwnProperty(
                    "target"
                  )
                    ? Number(
                      slbData.waterManagement.waterSuppliedPerDay
                        ?.target[targetYearValue]
                    )
                    : "";
                slbDataNotFilled ? (element.targetDisable = false) : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS["Extent of non-revenue water (NRW)"]
              ) {
                element.target_1.value =
                  slbData.waterManagement.reduction.hasOwnProperty(
                    "target"
                  )
                    ? Number(
                      slbData.waterManagement.reduction?.target[targetYearValue]
                    )
                    : "";
                slbDataNotFilled ? (element.targetDisable = false) : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS[
                "Coverage of waste water network services"
                ]
              ) {
                element.target_1.value =
                  slbData.waterManagement.houseHoldCoveredWithSewerage.hasOwnProperty(
                    "target"
                  )
                    ? Number(
                      slbData.waterManagement
                        .houseHoldCoveredWithSewerage?.target[targetYearValue]
                    )
                    : "";
                slbDataNotFilled ? (element.targetDisable = false) : "";
              }
            }
          });

        }
      }
      if (isYearWithinRange(formData.design_year.toString())) {
        let params = { modelName: ModelNames['twentyEightSlbs'], currentFormStatus: formData.currentFormStatus, formType: "ULB", actionTakenByRole: userRole };
        let canTakeActionOnMasterForm = await getMasterForm(params);
        Object.assign(formData, canTakeActionOnMasterForm);
        let prevYearId = getPreviousYear(formData.design_year.toString(),1)
        let prevYearCond = {
          ulb: ObjectId(data.ulb),
          design_year: ObjectId(prevYearId)
        }
        let prev28SlbFormData = await TwentyEightSlbsForm.findOne(prevYearCond, { history: 0 }).lean();
        let prevYearStatus = calculateStatus(
          prev28SlbFormData?.status,
          prev28SlbFormData?.actionTakenByRole,
          prev28SlbFormData?.isDraft,
          "ULB"
        );
        if (prev28SlbFormData?.currentFormStatus) prevYearStatus = MASTER_STATUS_ID[prev28SlbFormData?.currentFormStatus];
        const previousStatusInCaps =  prevYearStatus.toUpperCase().split(' ').join('_');
        let prevYearStatusId = prev28SlbFormData?.currentFormStatus
        ? FORM_STATUS_CODES[previousStatusInCaps]
        : PREV_MASTER_FORM_STATUS[previousStatusInCaps];
      
        Object.assign(formData,{
          prevYearStatus,
          prevYearStatusId
        })
        // if (prev28SlbFormData && userRole === "MoHUA") {
        //   if (
        //     !(
        //       prev28SlbFormData.actionTakenByRole === "MoHUA" &&
        //       !prev28SlbFormData.isDraft &&
        //       prev28SlbFormData.status === "APPROVED"
        //     )
        //   ) {
        //     formData["canTakeAction"] = false;
        //   }
        // }
      } else {
        const prevYearStatus = calculateStatus(
          masterFormData.status,
          masterFormData.actionTakenByRole,
          !masterFormData.isSubmit,
          "ULB"
        )
        const previousStatusInCaps =  prevYearStatus.toUpperCase().split(' ').join('_')

        Object.assign(formData, {
          canTakeAction: canTakenAction(
            formData["status"],
            formData["actionTakenByRole"],
            formData["isDraft"],
            "ULB",
            userRole
          ),
          prevYearStatus,
          prevYearStatusId : PREV_MASTER_FORM_STATUS[previousStatusInCaps]
        });
        // if (masterFormData && userRole === "MoHUA") {
        //   if (
        //     !(
        //       masterFormData.actionTakenByRole === "MoHUA" &&
        //       !masterFormData.isDraft &&
        //       masterFormData.status === "APPROVED"
        //     )
        //   ) {
        //     formData["canTakeAction"] = false;
        //   }
        // }
      }


      formData["data"].forEach((el) => {
        if (
          ![
            StatusList.Not_Started,
            StatusList.In_Progress,
            StatusList.Rejected_By_State,
            StatusList.STATE_REJECTED,
            StatusList.Rejected_By_MoHUA,
          ].includes(slb28FormStatus)
        ) {
          el["targetDisable"] = true;
          el["actualDisable"] = true;
          formData["popDisable"] = true;
        }
        if (userRole != "ULB") {
          el["targetDisable"] = true;
          el["actualDisable"] = true;
          formData["popDisable"] = true;
        }
      });
      let groupedData = groupByKey(formData["data"], "type");
      formData["data"] = groupedData;

      req.form = formData
      req.slbDataNotFilled = slbDataNotFilled
      next()
      return
      // return res.status(200).json({
      //   success: true,
      //   show: false,
      //   data: formData,
      //   slbDataNotFilled
      // });
    } else {
      let pipedSupply,
        waterSuppliedPerDay,
        reduction,
        houseHoldCoveredWithSewerage;
      if (ulbData.access_2122) {
        let slbData = await SLB.findOne({
          ulb: ObjectId(data.ulb),
          design_year: ObjectId("606aaf854dff55e6c075d219"),
        }).lean();
        if (slbData) {
          slbDataNotFilled = slbData.blank
          pipedSupply =
            slbData.waterManagement.houseHoldCoveredPipedSupply.hasOwnProperty(
              "target"
            )
              ? slbData.waterManagement.houseHoldCoveredPipedSupply?.target[
              targetYearValue
              ]
              : "";
          waterSuppliedPerDay =
            slbData.waterManagement.waterSuppliedPerDay.hasOwnProperty(
              "target"
            )
              ? slbData.waterManagement.waterSuppliedPerDay?.target[targetYearValue]
              : "";
          reduction = slbData.waterManagement.reduction.hasOwnProperty(
            "target"
          )
            ? slbData.waterManagement.reduction?.target[targetYearValue]
            : "";
          houseHoldCoveredWithSewerage =
            slbData.waterManagement.houseHoldCoveredWithSewerage.hasOwnProperty(
              "target"
            )
              ? slbData.waterManagement.houseHoldCoveredWithSewerage?.target[
              targetYearValue
              ]
              : "";
        }
      }
      let lineItems = await IndicatorLineItem.find({year: ObjectId(data.design_year)}).lean();
      lineItems.forEach(item =>{
        if(Object.keys(PrevLineItem_CONSTANTS).includes(item.name))
          LINE_ITEMS_CONSTANT.push({[item?.name]: item._id.toString()})
        })
      let obj = {
        targetDisable: false,
        actualDisable: false,
        question: "",
        type: "",
        actual: {
          year: prevYearData._id,
          value: "",
        },
        target_1: {
          year: ObjectId(data.design_year),
          value: "",
        },
      };
      let dataArr = [];
      lineItems.forEach((el) => {
        let targ = null;
        if (ulbData.access_2122) {
          switch (el["name"].toString()) {
            case "Coverage of waste water network services":
              targ = houseHoldCoveredWithSewerage ?? null;
              break;
            case "Coverage of water supply connections":
              targ = pipedSupply ?? null;
              break;
            case "Per capita supply of water(lpcd)":
              targ = waterSuppliedPerDay;
              break;
            case "Extent of non-revenue water (NRW)":
              targ = reduction;
              break;

            default:
              break;
          }
        }
        obj["unit"] = el["unit"];
        obj["range"] = el["range"];
        obj["indicatorLineItem"] = el["_id"];
        obj["question"] = el["name"];
        obj["type"] = el["type"];
        obj["actual"]["value"] = "";
        obj["target_1"]["value"] = targ ?? "";
        obj["targetDisable"] = targ || userRole != "ULB" ? true : false;
        obj["actualDisable"] = userRole != "ULB" ? true : false;
        dataArr.push(obj);
        obj = {
          targetDisable: false,
          actualDisable: false,
          question: "",
          unit: "",
          range: "",
          type: "",
          actual: {
            year: prevYearData._id,
            value: "",
          },
          target_1: {
            year: ObjectId(data.design_year),
            value: "",
          },
        };
      });
      let groupedData = groupByKey(dataArr, "type");

      let output = {};

      Object.assign(output, {
        "water supply": groupedData["water supply"],
        sanitation: groupedData["sanitation"],
        "solid waste": groupedData["solid waste"],
        "storm water": groupedData["storm water"],
      });
      req.form = {
        canTakeAction: false,
        data: output,
        population: null,
      }
      req.slbDataNotFilled = slbDataNotFilled
      next()
      return
      // return res.status(200).json({
      //   success: true,
      //   show: false,
      //   slbDataNotFilled,
      //   data: {
      //     canTakeAction: false,
      //     data: output,
      //     population: null,
      //   },
      // });
    }
  } catch (error) {
    console.log("error ::", error)
    return res.status(400).json({
      status: false,
      show: false,
      message: error.message
    })
  }
}

module.exports.twentyEightSlbFormFormTargetValuesUpdation = async (req, res) => {
  try {
    if(!req.body?.year ||  !req.body?.ulbs){
      throw new Error("Required year and ulbs")
    }
    const {year:targetYear, ulbs, design_year} = req.body;
    const slb4Forms = await SLB.find({
      design_year: YEAR_CONSTANTS["21_22"],
      ulb: {$in:ulbs}

    },{history:0}).lean();
    let outputArray = []
    if (slb4Forms && slb4Forms.length > 0) {
      for (let i = 0; i < slb4Forms.length; i++) {
        let form = slb4Forms[i];

        // let formStatus = calculateStatus(form.status, form.actionTakenByRole, !form.isCompleted,
        //   "ULB")

        /* Checking if the form status is rejected by state or rejected by MoHUA. If it is, then it
        will not be displayed. */
        // if([StatusList.Rejected_By_State, StatusList.Rejected_By_MoHUA].includes(formStatus)){
        //   continue;
        // }
        if (form.status === "NA" || form.status === "N/A") {
          continue;
        }
        if (!form?.waterManagement?.reduction?.target?.[targetYear]) {
          continue
        }

        // /* Checking if the form status is in the list of statuses. */
        // if (
        //   [
        //     // StatusList.In_Progress,
        //     StatusList.Approved_By_State,
        //     StatusList.Under_Review_By_State,
        //     StatusList.Approved_By_MoHUA,
        //     StatusList.Under_Review_By_MoHUA,
        //   ].includes(formStatus)
        // ) {

        let slb28Form = await TwentyEightSlbsForm.findOne({
            ulb: form.ulb,
            design_year
          }).lean();
    

        if (slb28Form) {
          let slb28FormStatus = calculateStatus(
            slb28Form.status,
            slb28Form.actionTakenByRole,
            slb28Form.isDraft,
            "ULB"
          );
          if (
            // [
            //   StatusList.In_Progress,
            //   StatusList.Rejected_By_MoHUA,
            //   StatusList.Rejected_By_State,
            // ].includes(slb28FormStatus)
            true
          ) {
            slb28Form["data"].forEach((element) => {
              /* Checking if the element is equal to the previous line item. */
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS[
                "Coverage of water supply connections"
                ]
              ) {
                element.target_1.value = form?.waterManagement
                  ?.houseHoldCoveredPipedSupply?.target[targetYear]
                  ? Number(
                    form?.waterManagement?.houseHoldCoveredPipedSupply
                      ?.target[targetYear]
                  )
                  : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS["Per capita supply of water(lpcd)"]
              ) {
                element.target_1.value = form?.waterManagement
                  ?.waterSuppliedPerDay.target[targetYear]
                  ? Number(
                    form?.waterManagement?.waterSuppliedPerDay?.target[
                    targetYear
                    ]
                  )
                  : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS["Extent of non-revenue water (NRW)"]
              ) {
                element.target_1.value = form?.waterManagement?.reduction
                  ?.target[targetYear]
                  ? Number(
                    form?.waterManagement?.reduction?.target[targetYear]
                  )
                  : "";
              }
              if (
                element["indicatorLineItem"].toString() ===
                PrevLineItem_CONSTANTS[
                "Coverage of waste water network services"
                ]
              ) {
                element.target_1.value = form?.waterManagement
                  ?.houseHoldCoveredWithSewerage?.target[targetYear]
                  ? Number(
                    form?.waterManagement?.houseHoldCoveredWithSewerage
                      ?.target[targetYear]
                  )
                  : "";
              }
            });
            let slb28UpdatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
              { 
                ulb: form.ulb ,
                design_year
              },
              {
                $set: {
                  data: slb28Form["data"],
                },
              }
            ).lean();
            outputArray.push(slb28Form)
          }
        }
      }
    }
    return res.status(200).json({
      success: true,
      total: outputArray.length,
      data: outputArray
    })

  } catch (error) {

    return res.status(400).json({
      status: false,
      show: false,
      message: error.message
    })
  }
}