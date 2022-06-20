const GfcFormCollection = require('../../models/GfcFormCollection');
const ObjectId = require("mongoose").Types.ObjectId;



module.exports.createForm = async (req, res) => {
    try {

        const data = req.body;
        let user = req.decoded;
        const { role: actionTakenByRole, _id: actionTakenBy, } = user;
        let formData = {}; //Object to store form data
        formData['rating'] = data.rating;
        formData['cert'] = data.cert;
        formData['certDate'] = data.certDate;
        formData['ulb'] = data.ulb;
        formData['year'] = data.year;
        formData['isDraft'] = data.isDraft;
        formData['status'] = data.status;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = actionTakenBy;
        
        let condition = {}; // condition to find a document using ulb and year
        condition['ulb'] = ObjectId(data.ulb);
        condition['year'] = ObjectId(data.year);

        let savedBody = new GfcFormCollection(formData);
        if (data.ulb && data.year) {
            const form = await GfcFormCollection.findOne(condition);
            if (form && (form.isDraft === false)) {//check if already exist and submitted
                return res.status(200).json({
                    success: false,
                    message: "Form already exist"
                });
            }else if ((form === null) && (formData.isDraft === false)){//final submit in 1st attempt
                const formSubmit = await GfcFormCollection.create(savedBody);
                    if (formSubmit) {
                        let updateData = await GfcFormCollection.updateOne(condition, 
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
            const updateForm = await GfcFormCollection.updateOne(condition,
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
            let updateData = await GfcFormCollection.updateOne(condition, 
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
        const { ulbId, year } = req.body;
        if (ulbId && year) {
            const form = await GfcFormCollection.findOne({ ulb: ulbId, year });
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