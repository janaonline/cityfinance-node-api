const catchAsync = require('../../util/catchAsync')
const ObjectId = require('mongoose').Types.ObjectId
const Service = require('../../service');
const User = require('../../models/User');
const PropertyTaxOpen = require('../../models/prop-tax-open')
const {response} = require('../../util/response');
module.exports.getForm = catchAsync(async (req, res)=>{
    try{
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    
        const form = await PropertyTaxOpen.findOne(condition).lean();
        if (form){
            for(let key in form){
                if(key == "noOfPropBilled"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
} else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
}
                    })
                 }else if(key == "noOfPropTaxPaid"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
} else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
}
                    })
                } else if(key == "noOfPropTaxReg"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
}  else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
}
                    })
                } else if(key == "noOfProp"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
}  else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
}
                    })
                } else if(key == "taxCollected"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
}  else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
}
                    })
                }  else if(key == "taxDemand"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
}  else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
} 
                    })
                }  else if(key == "noOfPropExempt"){
                    form[key].forEach(el=>{
if(el.year == "2018-19"){
    
    Object.assign(form, {[key+"_1819"]: el.value })
} else if(el.year == "2019-20"){
    
    Object.assign(form, {[key+"_1920"]: el.value })
} else if(el.year == "2020-21"){
    
    Object.assign(form, {[key+"_2021"]: el.value })
}  else if(el.year == "2021-22"){
    
    Object.assign(form, {[key+"_2122"]: el.value })
} 
                    })
                }

            }
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
})

module.exports.createOrUpdateForm = catchAsync( async (req, res)=>{
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
        
       
        const {_id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;

        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;

        if(formData.ulb){
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData['design_year'] = ObjectId(formData.design_year);
        }
        if(actionTakenByRole === "ULB"){
            formData['status'] = "PENDING";
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
          "Propert Tax Form"
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
            const submittedForm = await PropertyTaxOpen.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB" ){//Form already submitted    
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    Object.assign(formData, {noOfPropBilled: []}, {noOfPropTaxPaid: []},{noOfPropTaxReg: []},{noOfProp: []},{ noOfPropExempt: []},{taxCollected: []},{taxDemand: []}  )
                    for(let key in formData){
if(key.includes("noOfPropBilled") && key.includes("1819")){
formData.noOfPropBilled.push({
    year: "2018-19",
    value:formData[key]
})
    
}else if(key.includes("noOfPropBilled") && key.includes("1920")){
    formData.noOfPropBilled.push({
        year: "2019-20",
        value:formData[key]
    })
        
} else if(key.includes("noOfPropBilled") && key.includes("2021")){
    formData.noOfPropBilled.push({
        year: "2020-21",
        value:formData[key]
    })
        
 } else if(key.includes("noOfPropBilled") && key.includes("2122")){
    formData.noOfPropBilled.push({
        year: "2021-22",
        value:formData[key]
    })
        
}
else if(key.includes("noOfPropTaxPaid") && key.includes("1819")){
    formData.noOfPropTaxPaid.push({
        year: "2018-19",
        value:formData[key]
    })
        
}else if(key.includes("noOfPropTaxPaid") && key.includes("1920")){
    formData.noOfPropTaxPaid.push({
        year: "2019-20",
        value:formData[key]
    })
        
}else if(key.includes("noOfPropTaxPaid") && key.includes("2021")){
    formData.noOfPropTaxPaid.push({
        year: "2020-21",
        value:formData[key]
    })
        
} else if(key.includes("noOfPropTaxPaid") && key.includes("2122")){
    formData.noOfPropTaxPaid.push({
        year: "2021-22",
        value:formData[key]
    })
        
}
else if(key.includes("noOfPropTaxReg") && key.includes("1819")){
    formData.noOfPropTaxReg.push({
        year: "2018-19",
        value:formData[key]
    })
        
}else if(key.includes("noOfPropTaxReg") && key.includes("1920")){
    formData.noOfPropTaxReg.push({
        year: "2019-20",
        value:formData[key]
    })
        
}else if(key.includes("noOfPropTaxReg") && key.includes("2021")){
    formData.noOfPropTaxReg.push({
        year: "2020-21",
        value:formData[key]
    })
        
}  else if(key.includes("noOfPropTaxReg") && key.includes("2122")){
    formData.noOfPropTaxReg.push({
        year: "2021-22",
        value:formData[key]
    })
        
} else if(key.includes("noOfPropExempt") && key.includes("1819")){
    formData.noOfPropExempt.push({
        year: "2018-19",
        value:formData[key]
    })
} else if(key.includes("noOfPropExempt") && key.includes("1920")){
    formData.noOfPropExempt.push({
        year: "2019-20",
        value:formData[key]
    })
} else if(key.includes("noOfPropExempt") && key.includes("2021")){
    formData.noOfPropExempt.push({
        year: "2020-21",
        value:formData[key]
    })
} else if(key.includes("noOfPropExempt") && key.includes("2122")){
    formData.noOfPropExempt.push({
        year: "2021-22",
        value:formData[key]
    })
}
else if(key.includes("noOfProp") && key.includes("1819")){
    formData.noOfProp.push({
        year: "2018-19",
        value:formData[key]
    })
        
}else if(key.includes("noOfProp") && key.includes("1920")){
    formData.noOfProp.push({
        year: "2019-20",
        value:formData[key]
    })
        
}else if(key.includes("noOfProp") && key.includes("2021")){
    formData.noOfProp.push({
        year: "2020-21",
        value:formData[key]
    })
        
}else if(key.includes("noOfProp") && key.includes("2122")){
    formData.noOfProp.push({
        year: "2021-22",
        value:formData[key]
    })
        
}
else if(key.includes("taxCollected") && key.includes("1819")){
    formData.taxCollected.push({
        year: "2018-19",
        value:formData[key]
    })
        
}else if(key.includes("taxCollected") && key.includes("1920")){
    formData.taxCollected.push({
        year: "2019-20",
        value:formData[key]
    })
}else if(key.includes("taxCollected") && key.includes("2021")){
    formData.taxCollected.push({
        year: "2020-21",
        value:formData[key]
    })
} else if(key.includes("taxCollected") && key.includes("2122")){
    formData.taxCollected.push({
        year: "2021-22",
        value:formData[key]
    })
}
else if(key.includes("taxDemand") && key.includes("1819")){
    formData.taxDemand.push({
        year: "2018-19",
        value:formData[key]
    })
}else if(key.includes("taxDemand") && key.includes("1920")){
    formData.taxDemand.push({
        year: "2019-20",
        value:formData[key]
    })
}else if(key.includes("taxDemand") && key.includes("2021")){
    formData.taxDemand.push({
        year: "2020-21",
        value:formData[key]
    })
} else if(key.includes("taxDemand") && key.includes("2122")){
    formData.taxDemand.push({
        year: "2021-22",
        value:formData[key]
    })
}
  
                    }

                    const form = await PropertyTaxOpen.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await PropertyTaxOpen.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
                        if (addedHistory) {
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
                }
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
    
})

