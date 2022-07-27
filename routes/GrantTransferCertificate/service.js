const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const StateGTCCertificate = require('../../models/StateGTCertificate');
const ObjectId = require("mongoose").Types.ObjectId;


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

module.exports.getForm = async (req, res) =>{
    try {
        const data = req.query;
        const condition = {};
        condition.design_year = data.design_year;
        condition.state = data.state;

        const prevFormData = await StateGTCCertificate.findOne({
            state:data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment:2
        }).lean();
        let obj = {
                type: "",
                file:{
                    name:"",
                    url:""
                },
                year:"",
                state:"",
                design_year:"",
                rejectReason:"",
                status:"",
                installment:""
            };
        let result = [];
        if(prevFormData){
            
            if(prevFormData?.million_tied){
                obj["type"] = "million_tied";
                obj["file"]["name"] = prevFormData["million_tied"]["pdfName"];
                obj["file"]["url"] = prevFormData["million_tied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["million_tied"]["rejectReason"];
                obj["status"] = prevFormData["million_tied"]["status"];
                obj["installment"] = 2;
                obj["key"] = `million_tied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)));    
            } 
            if(prevFormData?.nonmillion_tied) {
                obj["type"] = "nonmillion_tied";
                obj["file"]["name"] = prevFormData["nonmillion_tied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_tied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_tied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_tied"]["status"];
                obj["installment"] = 2;
                obj["key"] = `nonmillion_tied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            } 
            if(prevFormData?.nonmillion_untied) {
                obj["type"] = "nonmillion_untied";
                obj["file"]["name"] = prevFormData["nonmillion_untied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_untied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_untied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_untied"]["status"];
                obj["installment"] = 2;
                obj["key"] = `nonmillion_untied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            }
        
        }
        let form = await GrantTransferCertificate.find(condition,{history:0}).lean();
        form = JSON.parse(JSON.stringify(form))
        form.forEach((entity)=>{

            if(entity.year.toString() == "606aadac4dff55e6c075c507"){
                entity.key = `${entity.type}_2020-21_${entity.installment}`
            } 

            if(entity.year.toString() == ObjectId("606aaf854dff55e6c075d219")){
                entity.key = `${entity.type}_2021-22_${entity.installment}`
            } 
            
            if(entity.year.toString() == "606aafb14dff55e6c075d3ae"){
                entity.key = `${entity.type}_2022-23_${entity.installment}`
            }
            
        })
        if (form) {
            let data = [...form,...result]
            return res.status(200).json({
                status: true,
                data,
            });
        } else {
            return res.status(200).json({
                status: true,
                message: "Form not found"
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
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
        
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        if(data.state && data.design_year){
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if ( (submittedForm) && submittedForm.isDraft === false ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    const form = await GrantTransferCertificate.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if(form){
                        const addedHistory = await GrantTransferCertificate.findOneAndUpdate(
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
                        const form = await GrantTransferCertificate.create(formData);
                        response(form, res,"Form created.", "Form not created");
                    }
                }           
            }
            if ( submittedForm && submittedForm.isDraft === true) { //form exists and saved as draft
                if(formData.isDraft === true){ //  update form as draft
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    response(updatedForm, res, "Form created." , "Form not updated");
                } else { // submit form i.e. isDraft=false
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
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


module.exports.createForm = async (req, res) =>{
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
        if(formData.year){
            formData.year = ObjectId(formData.year);
        }
        
        const {_id:actionTakenBy, role: actionTakenByRole} = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        
        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        condition.installment = data.installment;
        condition.year = data.year;
        condition.type = data.type;
        if(data.state && data.design_year){
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if (submittedForm){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            }

            const form = await GrantTransferCertificate.create(formData);
            if (form) {//add history
                formData['createdAt'] = form.createdAt;
                formData['modifiedAt'] = form.modifiedAt;
                let addedHistory = await GrantTransferCertificate.findOneAndUpdate(
                    condition,
                    {$push: { history: formData}  },
                    {new: true}
                );
                if(!addedHistory){
                    return res.status(400).json({
                        status: false,
                        message: "History not saved."
                    })
                }
                return res.status(200).json({
                    status: true,
                    message: "File saved.",
                    data: addedHistory
                });
            } else {
                return res.status(400).json({
                    status: false,
                    message: "Form not saved."
                })
            }
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
        
}