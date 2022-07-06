const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        let user = req.decoded;
        const isGfc = data.isGfc;  // flag to check which collection to use 
        let collection = isGfc ? GfcFormCollection : OdfFormCollection;
        const { role: actionTakenByRole, _id: actionTakenBy, } = user;
        let formData = {}; //Object to store form data
        formData = {...data}
        
        if(formData.rating){
            formData.rating = ObjectId(formData.rating);
        }
        if(formData.certDate){
            formData.certDate = new Date(formData.certDate);
            formData.certDate.toISOString();
        }
        if(formData.ulb){
            formData.ulb = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData.design_year = ObjectId(formData.design_year);
        }
        
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        
        let condition = {}; // condition to find a document using ulb and design_year
        condition['ulb'] = ObjectId(data.ulb);
        condition['design_year'] = ObjectId(data.design_year);
        let savedBody = new collection(formData);
        if (data.ulb && data.design_year) {
            const form = await collection.findOne(condition);
            if (form && (form.isDraft === false)) {//check if already exist and submitted
                return res.status(200).json({
                    success: false,
                    message: "Form already submitted."
                });
            }else if ((form === null) && (formData.isDraft === false)){//final submit in 1st attempt
                const formSubmit = await collection.create(savedBody);
                formData['createdAt'] = formSubmit.createdAt;
                formData['modifiedAt'] = formSubmit.modifiedAt;
                    if (formSubmit) {//add history
                        let updateData = await collection.findOneAndUpdate(condition, 
                            {
                                $push: { history: formData},
                                $set: formData,  
                            },
                            { new: true } );
                        return res.status(200).json({
                            success: true,
                            message: "Data saved.",
                            data: updateData
                        });
                    } else {
                            return res.status(400).send({
                            success: false,
                            message: "Data not saved.",
                        });
                    }
            }
        }
        if (data.isDraft){//update fields when isDraft===true and form already created

            const updateForm = await collection.findOneAndUpdate(condition,
                formData,
                { new: true });
            if(updateForm){
                return res.status(201).json({
                    success: true,
                    message: "Form updated",
                    data: updateForm
                })
            }
        }
        if (data.isDraft){ // save as draft when form is not created yet
            const savedForm = await collection.create(savedBody);
                if (!savedForm) {
                    return res.status(400).send({
                        success: false,
                        message: "Data not saved.",
                    });
                } else {
                    return res.status(200).json({
                        success: true,
                        message: "Data saved.",
                        data: savedForm,
                    });
                }
            }
        delete formData["history"]
        if (!data.isDraft){ //when form is submitted, save history
            const formSubmit = await collection.findOne(condition);
            formData['createdAt'] = formSubmit.createdAt;
                formData['modifiedAt'] = new Date();
            let updateData = await collection.findOneAndUpdate(condition, 
                { $push: { history: formData}, $set: formData },//todo
                { returnDocument: "after" });
            
            return res.status(201).json({
                success: true,
                message: "Form saved",
                data: updateData
            });
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "failed.",
        });
    }
}

module.exports.getForm = async (req, res) => {
    try {
        const { isGfc } = req.query;
        const ulb = ObjectId(req.query.ulb);
        const design_year = ObjectId(req.query.design_year);
        let collection = (isGfc=== 'true') ? GfcFormCollection : OdfFormCollection;
        if (ulb && design_year) {
            const form = await collection.findOne({ulb, design_year});
            return res.status(200).json({
                success: true,
                data: form
            });
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error
        });
    }
}

module.exports.action = async ( req, res)=>{
    const user = req.decoded,
        data = req.body;
    data['actionTakenBy'] = user._id;
    data['actionTakenByRole'] = user.role;
    const isGfc = data.isGfc;  // flag to check which collection to use 
    let collection = isGfc ? GfcFormCollection : OdfFormCollection;
   
    let condition = {};
    condition['ulb'] = ObjectId(data.ulb);
    condition['design_year'] = ObjectId(data.design_year);
    
    const submittedForm = await collection.findOne(condition)
    if (!submittedForm){//if submitted form is not found
        res.status(404).json({
            success: false,
            message: "Form not found."
        });
    }
    if (submittedForm.isDraft === false){
        if (submittedForm.status !== 'PENDING'){
            //TODO
        } else {

        }
    } else {
        res.status(200).json({
            status: true,
            message: "Form not submitted."
        })
    }
}