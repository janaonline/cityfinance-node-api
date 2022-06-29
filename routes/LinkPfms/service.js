const LinkPFMS = require('../../models/LinkPFMS');
const ObjectId = require("mongoose").Types.ObjectId;

function response(form, res){
    if(form){
        return res.status(201).json({
            status: true,
            data: form,
        });
    }else{
        return res.status(400).json({
            status: false,
            message: 'Form not saved.'
        });
   }
}
module.exports.createForm = async(req, res) =>{
   try{
        const data = req.body;
        const user = req.decoded;
        // formData['ulb'] = ObjectId(data.ulb);
        // formData['design_year'] = ObjectId(data.design_year);
        // formData['linkPFMS'] = data.linkPFMS;
        // formData['isUlbLinkedWithPFMS'] = data.isUlbLinkedWithPFMS;
        // formData['PFMSAccountNumber'] = data.PFMSAccountNumber;
        // formData['cert'] = data.cert;
        // formData['otherDocs'] = data.otherDocs;
        // formData['isDraft'] = data.isDraft;
        // formData['status'] = data.status;
        let formData = {};
        formData = {...req.body};

        if(formData.ulb){
            formData.ulb = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData.design_year = ObjectId(formData.design_year);
        }

        const { role: actionTakenByRole, _id: actionTakenBy } = user;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        let condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;

        const submittedForm = await LinkPFMS.findOne(condition);
    
        if(submittedForm !== null){
            if(!submittedForm.isDraft){ //Check if form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                return res.status(200).json({
                    status: true,
                    message: "Form already created."
                })
            }
        }

        if(data.isDraft){ // create form with isDraft = true
            const form  = LinkPFMS(formData);
            const savedForm = await LinkPFMS.create(form);
            response(savedForm, res);
        }else{ //final Submit
            const form = LinkPFMS(formData);
            const savedForm = await LinkPFMS.create(form);
            if(savedForm){
                formData['createdAt'] = new Date();
                formData.createdAt.toISOString();
                formData['modifiedAt'] = new Date();
                formData.modifiedAt.toISOString();
                const updatedForm = await LinkPFMS.findOneAndUpdate(condition,
                    {$set: formData, $push: {"history":formData}},
                    {new: true});
                if(updatedForm){
                    return res.status(200).json({
                        status: true,
                        data: updatedForm
                    })
                }
            }else{
                return res.status(400).json({
                    status: false,
                    message:'Not saved.'
                })
            }
        }   
    }catch(error){
        return res.status(400).json({
            status: false,
            message: "failed."
       })
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
                success: true,
                data:form
            });
        } else {
            return res.status(400).json({
                success: true,
                message: "Form not found"
            });
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed."
        })
    } 
}

module.exports.updateForm = async (req, res)=>{
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
        formData['isUlbLinkedWithPFMS'] = data.isUlbLinkedWithPFMS || "";
        formData['PFMSAccountNumber'] = data.PFMSAccountNumber || "";
        formData['cert'] = data.cert || "";
        formData['otherDocs'] = data.otherDocs || "";
        if(formData.ulb){
            formData.ulb = ObjectId(formData.ulb);
        }
        if(formData.design_year){
            formData.design_year = ObjectId(formData.design_year);
        }

        const { role: actionTakenByRole, _id: actionTakenBy } = user;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        let condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
    
        const submittedForm  = await LinkPFMS.findOne(condition);
        if(submittedForm !== null){
            if(!submittedForm.isDraft){
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            }
        } else {
            return res.status(400).json({
                status: false,
                message: "Form not found."
            })
        }
        if(formData.isDraft){
            const form = await LinkPFMS.findOneAndUpdate(condition,
                 formData,
                 {new: true} );
            if (!form){
                return res.status(400).json({
                    success: false,
                    message: "Failed to update."
                })
            } else {
                return res.status(200).json({
                    success: true,
                    data: form
                });
            }
        } else {
            formData['createdAt'] = submittedForm.createdAt;
            formData['modifiedAt'] = new Date();
            formData.modifiedAt.toISOString();

            const form = await LinkPFMS.findOneAndUpdate(condition,
                { 
                    $set: formData,
                    $push: {history: formData}
                },
                {new: true});
            if (!form){
                return res.status(400).json({
                    success: false,
                    message: "Failed to update."
                })
            } else {
                return res.status(200).json({
                    success: true,
                    message: "Form updated",
                    data: form
                });
        } 
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Failed"
            })
    } 
}