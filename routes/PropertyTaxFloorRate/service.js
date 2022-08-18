const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const ObjectId = require('mongoose').Types.ObjectId;

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

module.exports.getForm = async (req,res)=>{
    try {
        const data = req.query;
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;

        const form = await PropertyTaxFloorRate.findOne(condition);
        if (form) {
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

module.exports.createOrUpdateForm = async (req, res) =>{
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
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        if(data.state && data.design_year){
            const submittedForm = await PropertyTaxFloorRate.findOne(condition)
            if ( (submittedForm) && submittedForm.isDraft === false ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    const form = await PropertyTaxFloorRate.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await PropertyTaxFloorRate.findOneAndUpdate(
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
                        const form = await PropertyTaxFloorRate.create(formData);
                        response(form, res,"Form created.", "Form not created");
                    }
                }           
            }
            if ( submittedForm && submittedForm.isDraft === true) { //form exists and saved as draft
                if(formData.isDraft === true){ //  update form as draft
                    const updatedForm = await PropertyTaxFloorRate.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    response(updatedForm, res, "Form created." , "Form not updated");
                } else { // submit form i.e. isDraft=false
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    const updatedForm = await PropertyTaxFloorRate.findOneAndUpdate(
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
