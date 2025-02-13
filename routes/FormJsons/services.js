let FormJson = require("../../models/FormsJson")



const getFormById = async(req,res,next)=>{
    let response = {
        "success":false,
        "message":"",
        "data":[]
    }
    try{
        const {id} = req.params
        if(!id){
            response.success = false
            response.message = "Id not found"
            return res.status(400).json(response)
        }
        let formObject = await FormJson.findOne({formId:id})
        if(!formObject || formObject === null){
            response.success = false
            response.message = "form not found"
            return res.status(400).json(response)
        }
        response.data = formObject.data
        return res.status(200).json(response)
    }
    catch(err){
        response.message = "some server error occured"
        return res.status(400).json(response)
    }
}

const updateFormById = async(req,res,next)=>{
    let response = {
        "success":false,
        "message":""
    }
    try{
        let {formId,data,type} = req.body
        if(!formId && formId){
            response.success = false
            response.message = "form Id not found"
            return res.status(400).json(response)
        }
        if(data.length <= 0){
            response.success = false
            response.message = "data is required"
            return res.status(400).json(response)
        }
        let formObject = await FormJson.findOneAndUpdate({
            "formId":formId,
            type
        },{
            data:data
        })
    }
    catch(err){
        console.log("error in updateFormById ::: ",err.message)
    }
}
module.exports.getFormById = getFormById