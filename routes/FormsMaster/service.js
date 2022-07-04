const FormsMaster = require('../../models/FormsMaster');

module.exports.getForm = async (req, res)=>{
    try {
        const forms = await FormsMaster.find({});
        if(!forms){
            return res.status(400).json({
                success: false,
                message: "Forms not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: forms
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            message: "failed"
        });
    }
}

module.exports.createForm = async (req, res)=>{
    try {
        const { name, category, userLevel } = req.body;
    
        const form = await FormsMaster.create({name, category, userLevel});
        if(!form){
            return res.status(400).json({
                success: false,
                message: "Form not created"
            });
        }
        return res.status(200).json({
            success: true,
            data: form
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            message: "failed"
        });
    }
}

module.exports.updateForm = async (req, res)=>{
    try {
        const formData = req.body;
        const {formId} = req.params;
    
        const form = await FormsMaster.findOneAndUpdate({_id: formId},formData,
            {returnDocument: "after"});
        if(!form){
            return res.status(400).json({
                success: false,
                message: "Form not created"
            });
        }
        return res.status(200).json({
            success: true,
            data: form
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            message: "failed"
        });
    }
}

module.exports.deleteForm = async (req, res)=>{
    try{
        const {formId} = req.params;
    
        const form = await FormsMaster.findOneAndDelete({_id: formId});
        if(!form){
            return res.status(400).json({
                success: false,
                message: "Form not deleted"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Form deleted."
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            message: "failed"
        });
    }
}