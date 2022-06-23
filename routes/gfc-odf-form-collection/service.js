const GfcFormCollection = require('../../models/GfcFormCollection');
const OdfFormCollection = require('../../models/OdfFormCollection');
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.createorUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        let user = req.decoded;
        const isGfc = data.isGfc;  // flag to check which collection to use 
        let collection = isGfc ? GfcFormCollection : OdfFormCollection;
        const { role: actionTakenByRole, _id: actionTakenBy, } = user;
        let formData = {}; //Object to store form data
        formData['rating'] = ObjectId(data.rating);
        formData['cert'] = data.cert;
        formData['certDate'] = new Date(data.certDate);
        formData['ulb'] = ObjectId(data.ulb);
        formData['year'] = ObjectId(data.year);
        formData['isDraft'] = data.isDraft;
        formData['status'] = data.status;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        
        let condition = {}; // condition to find a document using ulb and year
        condition['ulb'] = ObjectId(data.ulb);
        condition['year'] = ObjectId(data.year);
        let savedBody = new collection(formData);
        if (data.ulb && data.year) {
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
                        let updateData = await collection.updateOne(condition, 
                            {
                                $push: { history: formData},
                                $set: formData,  
                            },
                            { returnDocument: "after" } );
                        return res.status(200).json({
                            success: true,
                            message: "Data saved.",
                            data: updateData,
                        });
                    } else {
                            return res.status(400).send({
                            success: false,
                            message: "Data not saved.",
                        });
                    }
            }
        }
        if (data.isDraft){//update fields when isDraft===true 
            const updateForm = await collection.updateOne(condition,
                formData,
                { returnDocument: "after" });
            if(updateForm.n){
                return res.status(201).json({
                    success: true,
                    data: updateForm
                })
            }
        }
        if (data.isDraft){ // save as draft
            savedBody.save((err, data) => {
                if (err) {
                    return res.status(400).send({
                        success: false,
                        message: "Data not saved.",
                    });
                } else {
                    return res.status(200).json({
                        success: true,
                        message: "Data saved.",
                        data,
                    });
                }
            })
        }
        delete formData["history"]
        if (!data.isDraft){ //when form is submitted, save history
            const formSubmit = await collection.findOne(condition);
            formData['createdAt'] = formSubmit.createdAt;
                formData['modifiedAt'] = new Date();
            let updateData = await collection.updateOne(condition, 
                { $push: { history: formData}, $set: formData },//todo
                { returnDocument: "after" });
            
            return res.status(201).json({
                success: true,
                data: updateData
            });
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}

module.exports.getForm = async (req, res) => {
    try {
        const { isGfc } = req.body;
        const ulb = ObjectId(req.body.ulb);
        const year = ObjectId(req.body.year);
        let collection = isGfc ? GfcFormCollection : OdfFormCollection;
        if (ulb && year) {
            const form = await collection.findOne({ulb, year});
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
    condition['year'] = ObjectId(data.year);
    
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