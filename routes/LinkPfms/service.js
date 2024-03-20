const LinkPFMS = require('../../models/LinkPFMS');
const ObjectId = require("mongoose").Types.ObjectId;
const {canTakenAction} = require('../CommonActionAPI/service')
const Service = require('../../service');
const {createAndUpdateFormMaster,getMasterForm} = require("../CommonFormSubmission/service")
const {FormNames} = require('../../util/FormNames');
const User = require('../../models/User');
const { years } = require("../../service/years")
const { getKeyByValue } = require("../../util/masterFunctions")
var outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
const { ModelNames } = require("../../util/15thFCstatus");
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

module.exports.getForm = async (req, res,next) =>{
    try {
        
        let yearId = req.query.design_year
        let year = getKeyByValue(years, yearId)
        let latestYear = !outDatedYears.includes(year)
        const data = req.query;
        let role = req.decoded.role
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    
        const form = await LinkPFMS.findOne(condition).lean();
        if (form){
            Object.assign(form, {canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "ULB",role ) })
            if(latestYear){
                let params = {
                    modelName: ModelNames["twentyEightSlbs"],
                    currentFormStatus: form.currentFormStatus,
                    formType: "ULB",
                    actionTakenByRole: role,
                  };
                  const canTakeActionOnMasterForm = await getMasterForm(params);
                  Object.assign(form, canTakeActionOnMasterForm);
            }
            console.log("req.form ::: ",req.form)
            req.form = form
            return next()
            // return res.status(200).json({
            //     status: true,
            //     message: "Form found.",
            //     data:form,
            // });
        } else {
            if(latestYear){
                return next()
            }
            return res.status(400).json({
                status: true,
                message: "Form not found"
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    } 
}

module.exports.createOrUpdateForm = async (req, res) =>{
    try {
        
        const data = req.body;
        data['currentFormStatus'] = data.statusId
        const user = req.decoded;
        let formData = {};
        formData = {...data};
        const formName = FormNames["pfms"];
       
        const {_id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;
        
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['ulbSubmit'] = "";
    
        if(formData["isUlbLinkedWithPFMS"] === null){
            formData["isUlbLinkedWithPFMS"] = "";
        }

        if(formData.ulb){
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData['design_year'] = ObjectId(formData.design_year);
        }
    
        const condition ={};
        condition['design_year'] =  data.design_year;
        condition['ulb'] = data.ulb;
    
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
        if (!outDatedYears.includes(getKeyByValue(years,formData.design_year.toString()))  && formData.ulb) {
            let userFormData = {...formData}
            userFormData.status = formData.currentFormStatus
            let params = {
              modelName: ModelNames["linkPFMS"],
              formData:userFormData,
              res,
              actionTakenByRole,
              actionTakenBy, 
              mailOptions
            };
            return await createAndUpdateFormMaster(params);
        }


        if(data.ulb && data.design_year){
            const submittedForm = await LinkPFMS.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB" ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                }) 
            //if actionTakenByRole !== ULB && isDraft=== false && status !== "APPROVED"

            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt 
                    formData["ulbSubmit"] =  new Date();  
                    const form = await LinkPFMS.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await LinkPFMS.findOneAndUpdate(
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
                } else {
                    if( (!submittedForm) && formData.isDraft === true){ // create as draft
                        const form = await LinkPFMS.create(formData);
                        return response(form, res,"Form created", "Form not created");
                    }
                }           
            }
            if ( submittedForm && submittedForm.status !== "APPROVED") {
                if(formData.isDraft === true){
                    const updatedForm = await LinkPFMS.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    return response(updatedForm, res, "Form updated." , "Form not updated");
                } else {
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData['ulbSubmit'] = new Date();
                    const updatedForm = await LinkPFMS.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
                    );
                    if(updatedForm){
                      //email trigger after form submission
                      Service.sendEmail(mailOptions);
                    }
                    return response( updatedForm, res, "Form updated.","Form not updated.")
                }
            }
            if(submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB" 
                && submittedForm.isDraft === false){
                    return res.status(200).json({
                        status: true,
                        message: "Form already submitted"
                    })
            }
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}