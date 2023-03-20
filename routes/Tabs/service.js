const Tab = require('../../models/TabList');
const ObjectId = require('mongoose').Types.ObjectId;
const catchAsync = require("../../util/catchAsync");
const responses = require("../../service/response");

const checkUndefinedValidations = (obj)=>{
    let validation = {
        "valid":true,
        "message":""
    }
    try{
        let key = {}
        for(let key in obj){
            if(obj[key] === undefined){
                validation.valid = false
                validation.message = `${key.replace("$"," ")} is required`
                return validation
            }
        }
    }
    catch(err){
        console.log("error in checkValidations :: ",err.message)
    }
    return validation
}

const createTabs = catchAsync(async(req,res)=>{
    let message = ""
    try{
        let {design_year,mohuaUrl,stateUrl,ulbUrl} = req.body
        let keysToCheck = {
            "design$year":design_year,
            "mohua$url":mohuaUrl,
            "state$url":stateUrl,
            "ulb$url":ulbUrl
        }
        let validation = await checkUndefinedValidations(keysToCheck)
        if(!validation.valid){
            return responses.BadRequest(res,data={},validation.message)
        }
        req.body.design_year = ObjectId(design_year)
        let form = new Tab(req.body)
        await form.save()
        message = "tab added successfully"
        return responses.OK(res,{},message)
    }
    catch(err){
        console.log("error in createTabs ::: ",err.message)
    }
    return responses.BadRequest(res)
})

module.exports = {
    createTabs,
    
}