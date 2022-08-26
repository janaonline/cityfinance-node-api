const PropertyTaxOp = require('../../models/PropertyTaxOp')
const {response} = require('../../util/response');
const ObjectId = require('mongoose').Types.ObjectId

module.exports.getForm = async (req, res)=>{
    try{
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    
        const form = await PropertyTaxOp.findOne(condition);
        if (form){
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
        const {_id: actionTakenBy, role: actionTakenByRole} = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;

        if(formData.ulb){
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData['design_year'] = ObjectId(formData.design_year);
        }
    
        const condition ={};
        condition['design_year'] =  data.design_year;
        condition['ulb'] = data.ulb;
    
        if(data.ulb && data.design_year){
            const submittedForm = await PropertyTaxOp.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    const form = await PropertyTaxOp.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await PropertyTaxOp.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
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
    
            if ( submittedForm && submittedForm.isDraft === true) { 
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
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
                    );
                    return response( updatedForm, res, "Form updated.","Form not updated.")
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
    
}