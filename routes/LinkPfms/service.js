const LinkPFMS = require('../../models/LinkPFMS');
const ObjectId = require("mongoose").Types.ObjectId;

function response(form, res, successMsg ,ErrMsg){
    if(form){
        return res.status(200).json({
            status: true,
            message: successMsg,
            data: form,
        });
    }else{
        return res.status(400).json({
            status: false,
            message: ErrMsg
        });
   }
}

module.exports.getForm = async (req, res) =>{
    try {
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    
        const form = await LinkPFMS.findOne(condition);
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

module.exports.createOrUpdateForm = async (req, res) =>{
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
            const submittedForm = await LinkPFMS.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    const form = await LinkPFMS.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await LinkPFMS.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
                        response(addedHistory, res,"Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                } else {
                    if( (!submittedForm) && formData.isDraft === true){ // create as draft
                        const form = await LinkPFMS.create(formData);
                        response(form, res,"Form created", "Form not created");
                    }
                }           
            }
    
            if ( submittedForm && submittedForm.isDraft === true) {
                if(formData.isDraft === true){
                    const updatedForm = await LinkPFMS.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    response(updatedForm, res, "Form created." , "Form not updated");
                } else {
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    const updatedForm = await LinkPFMS.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
                    );
                    response( updatedForm, res, "Form updated.","Form not updated.")
                }
            } 
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}