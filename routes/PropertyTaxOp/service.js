const PropertyTaxOp = require('../../models/PropertyTaxOp')
const {response} = require('../../util/response');
const ObjectId = require('mongoose').Types.ObjectId
const {canTakenAction} = require('../CommonActionAPI/service')
const Service = require('../../service');
const {FormNames} = require('../../util/FormNames');
const User = require('../../models/User');

module.exports.getForm = async (req, res)=>{
    try{
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    let role = req.decoded.role
        const form = await PropertyTaxOp.findOne(condition).lean();
        if (form){
            Object.assign(form, {canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "ULB",role ) })
            return res.status(200).json({
                status: true,
                message: "Form found.",
                data:form
            });
        } else {
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

module.exports.createOrUpdateForm = async (req, res)=>{
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
        const formName =  FormNames["propTaxOp"];
       
        const {_id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;

        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['ulbSubmit'] = "";

        if(formData.ulb){
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData['design_year'] = ObjectId(formData.design_year);
        }
        if(actionTakenByRole === "ULB"){
            formData['status'] = "PENDING";
        }
        let validationResult = validate(data);
        if(validationResult.length !== 0){
            for(let element of validationResult){
                if(!element){
                    return res.status(400).json({
                        status: false,
                        message: "Range should be in between 0 and 9999999999"
                    })
                }
            }
        }
        
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


        const condition ={};
        condition['design_year'] =  data.design_year;
        condition['ulb'] = data.ulb;
    
        if(data.ulb && data.design_year){
            const submittedForm = await PropertyTaxOp.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB" ){//Form already submitted    
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    formData["ulbSubmit"] =  new Date();
                    const form = await PropertyTaxOp.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await PropertyTaxOp.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
                        if (addedHistory) {
                          //email trigger after form submission
                        //   Service.sendEmail(mailOptions);
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
                        const form = await PropertyTaxOp.create(formData);
                        return response(form, res,"Form created", "Form not created");
                    }
                }           
            }
    
            if ( submittedForm && submittedForm.status !== "APPROVED") { 
                if(formData.isDraft === true){           //save form as draft to already created form
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    return response(updatedForm, res, "Form created." , "Form not updated");
                } else { //save form as final submission to already created form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData["ulbSubmit"] =  new Date();
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
                    );
                    if(updatedForm){
                        //email trigger after form submission
                    //    Service.sendEmail(mailOptions);
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
        return res.status(400).json({
            status: true,
            message: "ulb and design year are mandatory"
        });
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
    
}

function 
validate(data){
    let result = [];
    if(data.collection2019_20){
        result.push(data.collection2019_20 >= 0 && data.collection2019_20 < 9999999999);
    } else if(data.collection2020_21){
        result.push(data.collection2020_21 >= 0 && data.collection2020_21 < 9999999999);
    } else if( data.collection2021_22){
        result.push(data.collection2021_22 >= 0 && data.collection2021_22 < 9999999999); 
    }else if(data.target2022_23 ){
        result.push(data.target2022_23 >= 0 && data.target2022_23 < 9999999999);
    }
    return result;
}