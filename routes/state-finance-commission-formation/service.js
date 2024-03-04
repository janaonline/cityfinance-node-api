const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const ObjectId = require('mongoose').Types.ObjectId;
const {canTakenAction} = require('../CommonActionAPI/service')
function response(form, res, successMsg, errMsg){
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

module.exports.getForm = async (req, res) => {
    try {
        const data = req.query;
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        let role = req.decoded.role;
        const form = await StateFinanceCommissionFormation.findOne(condition).lean();
        if (form) {
            Object.assign(form, {canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "STATE",role ) })
            return res.status(200).json({
                status: true,
                data: form
            })
        } else {
            return res.status(200).json({
                status: true,
                message: "Form not found"
            })
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
    
        if(formData.state){
            formData.state = ObjectId(formData.state);
        }
        if(formData.design_year){
            formData.design_year = ObjectId(formData.design_year);
        }
        const {_id:actionTakenBy, role: actionTakenByRole} = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['status'] = 'PENDING';
        formData['stateSubmit'] = ""
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        if(data.state && data.design_year){
            const submittedForm = await StateFinanceCommissionFormation.findOne(condition)
            if ( (submittedForm) && submittedForm.isDraft === false &&
            submittedForm.actionTakenByRole === "STATE" ){//Form already submitted                
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    formData['stateSubmit'] = new Date()
                    const form = await StateFinanceCommissionFormation.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await StateFinanceCommissionFormation.findOneAndUpdate(
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
                        const form = await StateFinanceCommissionFormation.create(formData);
                        return response(form, res,"Form created.", "Form not created");
                    }
                }           
            }
            if ( submittedForm && submittedForm.status !== "APPROVED") { //form exists and saved as draft
                if(formData.isDraft === true){ //  update form as draft
                    const updatedForm = await StateFinanceCommissionFormation.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    return response(updatedForm, res, "Form created." , "Form not updated");
                } else { // submit form i.e. isDraft=false
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData['stateSubmit'] = new Date();
                    const updatedForm = await StateFinanceCommissionFormation.findOneAndUpdate(
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
            if(submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole === "MoHUA" 
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