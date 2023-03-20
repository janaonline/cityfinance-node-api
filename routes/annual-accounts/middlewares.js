
const {payloadParser,nestedObjectParser,getFlatObj,mutateJson,mutuateGetPayload} = require("../CommonActionAPI/service");
const {years} = require("../../service/years")
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const {getKeyByValue} = require("../../util/masterFunctions")
const FormsJson = require("../../models/FormsJson");
const ObjectId = require("mongoose").Types.ObjectId;
module.exports.changePayload = async(req,res,next)=>{
    try{
        let { design_year,data, isDraft } = req.body
        // console.log("data ::::::",data)
        let year = getKeyByValue(years,design_year)
        let latestYear = !outDatedYears.includes(year)
        // if(!latestYear){
            let payload = await nestedObjectParser(data,req)
            Object.assign(req.body,payload)
        // }
        next()
    }
    catch(err){
        console.log("error in changePayload :::: ",err.message)
    }
}

module.exports.changeResponse = async(req,res,next) =>{
    let response = {
        "success":false,
        "data":[],
        "message":""
    }
    try{
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req.query.formId,
              "language":[],
              "canTakeAction":false
            }
          ]
        let yearId = req.query.design_year
        let year = getKeyByValue(years,yearId)
        let form = {...req.form}
        let {name,role} = req.decoded
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req.query.formId
        if(!jsonFormId){
            response.message = "json form id is required"
            return res.status(400).json(response)
        }
        let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let obj = formJson ? formJson.data : {}
        if(latestYear){
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year","isDraft"]
            let mutatedJson = await mutateJson(obj,keysToBeDeleted,req.query,role)
            response.message = 'Form Questionare!'
            response.success = true
            responseData[0]['language'] = mutatedJson
            if(Object.keys(form).length){
                let flattedForm = getFlatObj(form)
                mutatedJson =  await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
                responseData[0]['language'] = mutatedJson
                response.data = responseData
                return res.status(200).json(response)
            }
            response.data = responseData
            return res.status(200).json(response);
            
        }
        else{
            if(Object.keys(form).length){
                return res.status(200).json(req.form);
            }
            else{
                return res.status(400).json(req.obj);
            }
        }

    }
    catch(err){
        response.message = "Some server error occured"
        response.success = false
        return res.status(400).json(response)
    }
}