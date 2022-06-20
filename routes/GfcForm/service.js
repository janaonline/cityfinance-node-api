const Gfc = require('../../models/GfcForm');
const catchAsync = require('../../util/catchAsync');

function setValue(name){
    let value = 0;
    switch(name){
        case 'No Star':
            value = 0;
            break;
        case '1 Star':
            value = 1;
            break;
        case '3 Star':
            value = 3;
            break;
        case '5 Star':
            value = 5;
            break;
        case '7 Star':
            value = 7;
            break;
        default:
            value = 0;
    }
    return value;
}

module.exports.createForm = async (req, res)=>{
    try {
        const {name,} = req.body;
        if(name){
        let value = setValue(name);
        const form = await Gfc.create({
            name,
            value,
        })
        res.status(201).json({
            success: true,
            message: "success",
            data: form
        })
        }
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "failed",
        })
    }
}
module.exports.getForms = async (req, res)=>{
 try {
     const forms = await Gfc.find();
    //forms received
     if(forms){
        return res.status(200).json({
            success: true,
            msg: 'success',
            data: forms,
        })
     }
     //no response found
     return res.status(200).json({
        success: true,
        msg: "success",
        data: "No forms found."
     })

 } catch (error) {
    res.status(400)
        .json({
            success: false,
            msg: "failed",
        })
 }
}

module.exports.updateForm = async (req, res)=>{
    try {
        const {formId} = req.params;
        const {name} = req.body;
        //if formId not given
        if(!formId){
            return res.status(400)
                .json({
                    success: false,
                    message: "formId not given."
                })
        }
        if(name){
        let value = setValue(name);
        const form = await Gfc.findOneAndUpdate(
            {_id:formId},
            {name, value},
            {
              returnDocument: "after",
        });
        return res.status(200).json({
            success: true,
            message: "success",
            data: form
        });
        }
        //incorrect form data
        return res.status(400).json({
            success: false,
            message: "Please give correct info."
        });
    } catch (error) {
        return res.status(400)
        .json({
            success: false,
            msg: "failed",
        });
    }
}

module.exports.deleteForm = async (req, res)=>{
    try {
        const {formId} = req.params;
        if(!formId){
            res.status(400).json({
                success: false,
                message: 'Provide formId'
            })
        };

        const form = await Gfc.findOneAndUpdate({
            _id: formId,
        },{
            isActive: false,
        },{
            returnDocument: "after",
        });
        if(!form){
            return res.status(400).json({
                success: false,
                message: 'Form not found.'
            });
        }
        return res.status(200).json({
            success: true,
            message: "success",
            data: form
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "failed",
        });
    }
}