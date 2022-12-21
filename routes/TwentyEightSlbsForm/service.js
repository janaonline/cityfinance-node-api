const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const ObjectId = require('mongoose').Types.ObjectId;
const IndicatorLineItem = require('../../models/indicatorLineItems')
const {findPreviousYear} = require('../../util/findPreviousYear')
const Year = require('../../models/Year')
const {groupByKey} = require('../../util/group_list_by_key')
const SLB = require('../../models/XVFcGrantForm')
const {canTakenAction, calculateStatus} = require('../CommonActionAPI/service')
const Service = require('../../service');
const {FormNames, YEAR_CONSTANTS} = require('../../util/FormNames');
const User = require('../../models/User');
const MasterForm = require('../../models/MasterForm')
const StatusList = require('../../util/newStatusList')
const {BackendHeaderHost, FrontendHeaderHost} = require('../../util/envUrl')

function response(form, res, successMsg ,errMsg){
    if(form){
        return res.status(200).json({
            status: true,
            message: successMsg,
            data: form,
        });
    }else{
        return res.status(400).json({
            status: false,
            message: errMsg
        });
   }
}
function rejectResponse(res, errMsg){
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

module.exports.createOrUpdateForm = async (req, res) =>{
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
        const formName = FormNames["slb28"];
        const {_id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;
        
        formData['actionTakenBy'] = ObjectId(user._id);
        formData['actionTakenByRole'] = "ULB";
        formData['status'] = "PENDING"
        formData['ulbSubmit'] = "";

        if (!(data.ulb && data.design_year)) {
          return res.status(400).json({
            status: false,
            message: "Ulb and design year is mandatory",
          });
        }

        formData.ulb = ObjectId(formData.ulb);
        formData.design_year = ObjectId(formData.design_year);

        const condition = {};
        condition.ulb = data.ulb;
        condition.design_year = data.design_year;
        
        let userData =  await User.find({
            $or:[
            { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
            {isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
            ]
        }
        ).lean();

        let emailAddress = [];
        let ulbUserData = {},
          stateUserData = {};
        for(let i =0 ; i< userData.length; i++){
            if(userData[i]){
                if(userData[i].role === "ULB"){
                    ulbUserData = userData[i];
                }else if(userData[i].role === "STATE"){
                    stateUserData = userData[i];
                }
            }
            if(ulbUserData && ulbUserData.commissionerEmail){
                emailAddress.push(ulbUserData.commissionerEmail);
            }
            if(stateUserData && stateUserData.email ){
                emailAddress.push(stateUserData.email);
            }
            ulbUserData ={};
            stateUserData = {};   
        }
        //unique email address
        emailAddress =  Array.from(new Set(emailAddress))
       
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
        

      
            const submittedForm = await TwentyEightSlbsForm.findOne(condition).lean();
            if ( (submittedForm) && submittedForm.isDraft === false &&
            submittedForm.actionTakenByRole === "ULB" ){//Form already submitted
            return res.status(200).json({
                status: true,
                message: "Form already submitted."
            })
        }
            else{
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    formData['ulbSubmit'] = new Date();
                    const form = await TwentyEightSlbsForm.create(formData);
                    
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    formData.population = Number(formData.population);
                 if(formData.data.length == 28){
                    if(form){
                        const addedHistory = await TwentyEightSlbsForm.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
                        if(addedHistory){
                            //email trigger after form submission
                           Service.sendEmail(mailOptions);
                           }
                        return response(addedHistory, res,"Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                 }else{
                    return res.status(400).json({
                        success: false,
                        message:"Cannot Final Submit with incomplete Data"
                    })
                 }
                  
                }else{
                    if( (!submittedForm) && formData.isDraft === true){ // create as draft

                        let newData = new TwentyEightSlbsForm(formData);
                        await newData.save()
                        return res.status(200).json({
                        success: true,
                        message:"Data Saved"
                        })
                    }
                }
            }
            if ( submittedForm && submittedForm.status !== "APPROVED") {
                if(formData.isDraft === true){
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    if(!updatedForm) rejectResponse(res, "form not updated")
                   return res.status(200).json({
                    success: true,
                    data: updatedForm,
                    message:"Form Updated"
                   })
                } else{
                    //final submit already existing form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData['ulbSubmit'] = new Date();
                 if(formData.data.length == 28){
                    let currentData = {}
                    Object.assign(currentData,formData ) 

                    formData['history'] = submittedForm['history']
                    formData['history'].push(currentData)
                    // formData['history'].push(formData) 
                    
                    delete formData['_id']
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        formData,
                        
                    );
                    if(!updatedForm) rejectResponse(res, "form not created")
                    if(updatedForm){
                        //email trigger after form submission
                       Service.sendEmail(mailOptions);
                       }
                    return res.status(200).json({
                        success: true,
                        data: updatedForm,
                        message:"Form Saved"
                       })
                 }else{
                    return res.status(400).json({
                        success: false,
                        message:"Cannot Final Submit with incomplete Data"
                    })
                 }
                  
                }

            }
            if(submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB" 
                && submittedForm.isDraft === false){
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
            message:error.message
        });
    }
}


module.exports.getForm = async (req, res) => {
    try {
        let userRole = req.decoded.role
        const data = req.query;
        const condition = {};
        if(!(data.ulb && data.design_year)){
            return res.status(400).json({
                status: false,
                show: false,
                message: "Design year and Ulb are mandatory"
            })
        }
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
      let yearData =   await Year.findOne({
            _id : ObjectId(data.design_year)
        }).lean()
        let prevYearVal = findPreviousYear(yearData.year);
        let prevYearData =   await Year.findOne({
            year : prevYearVal
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

        if (masterFormData) {
          if (masterFormData.history.length > 0) {
            masterFormData =
              masterFormData.history[masterFormData.history.length - 1];
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
          ) {
            return res.status(200).json({
              status: true,
              show: true,
              message: `Your Previous Year's SLBs for Water Supply and Sanitation form status is - ${
                status ? status : "Not Submitted"
              }. Kindly submit form at - <a href =https://${host}/ulbform/slbs target="_blank">Click here</a> in order to submit form`,
            });
          }
        } else {
          return res.status(200).json({
            status: true,
            show: true,
            message: `Your Previous Year's SLBs for Water Supply and Sanitation form status is - "Not Submitted". Kindly submit form at - <a href =https://${host}/ulbform/slbs target="_blank">Click here</a> in order to submit form`,
          });
        }

        let formData = await TwentyEightSlbsForm.findOne(condition, { history: 0} ).lean()
        
        if (formData) {
          let slbData = await SLB.findOne({
            ulb: ObjectId(data.ulb),
            design_year: YEAR_CONSTANTS["21_22"],
          }).lean();
          let slbDataNotFilled;
        if(slbData){
          slbDataNotFilled = slbData.blank;
                formData["data"].forEach((element) => {
                  /* Checking if the element is equal to the previous line item. */
                  if (
                    element["indicatorLineItem"].toString() ===
                    PrevLineItem_CONSTANTS[
                      "Coverage of water supply connections"
                    ]
                  ){
                    element.target_1.value =
                      slbData.waterManagement.houseHoldCoveredPipedSupply.hasOwnProperty(
                        "target"
                      )
                        ? Number(slbData.waterManagement.houseHoldCoveredPipedSupply
                            ?.target["2223"])
                        : "";
                        slbDataNotFilled ? element.targetDisable =  false: ""
                      }
                    if (
                        element["indicatorLineItem"].toString() ===
                        PrevLineItem_CONSTANTS[
                            "Per capita supply of water(lpcd)"
                        ]
                        ){
                        element.target_1.value =
                        slbData.waterManagement.waterSuppliedPerDay.hasOwnProperty(
                            "target"
                            )
                            ? Number(slbData.waterManagement.waterSuppliedPerDay?.target["2223"])
                            : "";
                            slbDataNotFilled ? element.targetDisable =  false: ""
                        }
                    if (
                        element["indicatorLineItem"].toString() ===
                        PrevLineItem_CONSTANTS[
                            "Extent of non-revenue water (NRW)"
                        ]
                        ){
                        element.target_1.value = slbData.waterManagement.reduction.hasOwnProperty(
                            "target"
                          )
                            ? Number(slbData.waterManagement.reduction?.target["2223"])
                            : "";
                            slbDataNotFilled ? element.targetDisable =  false: ""
                        }
                    if (
                        element["indicatorLineItem"].toString() ===
                        PrevLineItem_CONSTANTS[
                            "Coverage of waste water network services"
                        ]
                        ){
                        element.target_1.value =
                        slbData.waterManagement.houseHoldCoveredWithSewerage.hasOwnProperty(
                          "target"
                        )
                          ? Number(slbData.waterManagement.houseHoldCoveredWithSewerage?.target[
                              "2223"
                            ])
                          : "";  
                          slbDataNotFilled ? element.targetDisable =  false: ""
                        }                         
                });                          
              
        }
          Object.assign(formData, {
            canTakeAction: canTakenAction(
              formData["status"],
              formData["actionTakenByRole"],
              formData["isDraft"],
              "ULB",
              userRole
            ),
          });
          formData["data"].forEach((el) => {
            if (!formData["isDraft"]  && formData['actionTakenByRole'] === "ULB" && formData["status"] === "PENDING") {
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

          return res.status(200).json({
            success: true,
            show: false,
            data: formData,
          });
        } else {
          let slbData = await SLB.findOne({
            ulb: ObjectId(data.ulb),
            design_year: ObjectId("606aaf854dff55e6c075d219"),
          }).lean();
          let pipedSupply,
            waterSuppliedPerDay,
            reduction,
            houseHoldCoveredWithSewerage;
          if (slbData) {
            pipedSupply =
              slbData.waterManagement.houseHoldCoveredPipedSupply.hasOwnProperty(
                "target"
              )
                ? slbData.waterManagement.houseHoldCoveredPipedSupply?.target[
                    "2223"
                  ]
                : "";
            waterSuppliedPerDay =
              slbData.waterManagement.waterSuppliedPerDay.hasOwnProperty(
                "target"
              )
                ? slbData.waterManagement.waterSuppliedPerDay?.target["2223"]
                : "";
            reduction = slbData.waterManagement.reduction.hasOwnProperty(
              "target"
            )
              ? slbData.waterManagement.reduction?.target["2223"]
              : "";
            houseHoldCoveredWithSewerage =
              slbData.waterManagement.houseHoldCoveredWithSewerage.hasOwnProperty(
                "target"
              )
                ? slbData.waterManagement.houseHoldCoveredWithSewerage?.target[
                    "2223"
                  ]
                : "";
          }
          let lineItems = await IndicatorLineItem.find().lean();
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
            switch (el["_id"].toString()) {
              case "6284d6f65da0fa64b423b52a":
                targ = houseHoldCoveredWithSewerage ?? null;
                break;
              case "6284d6f65da0fa64b423b53a":
                targ = pipedSupply ?? null;
                break;
              case "6284d6f65da0fa64b423b53c":
                targ = waterSuppliedPerDay;
                break;
              case "6284d6f65da0fa64b423b540":
                targ = reduction;
                break;

              default:
                break;
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

          return res.status(200).json({
            success: true,
            show: false,
            data: {
              canTakeAction: false,
              data: output,
              population: null,
            },
          });
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            show: false,
            message: error.message
        })
    }
}