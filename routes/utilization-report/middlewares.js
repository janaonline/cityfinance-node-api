const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson,nestedObjectParser,clearVariables } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
module.exports.changeGetApiForm = async (req,res,next)=>{
    let response = {
        "success":false,
        "data":[],
        "message":""
    }
    try{
        let yearId = req.query.design_year
        let year = getKeyByValue(years,yearId)
        let form = {...req.form}
        let {name,role} = req.decoded
        form['ulbName'] = name
        delete form['projects']
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req.query.formId
        let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let obj = formJson ? formJson.data : {}
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req.query.formId,
              "language":[],
              "canTakeAction":false
            }
          ]
        if(latestYear){
            if(!jsonFormId){
                response.message = "formId is required"
                repsonse.success = false
                return res.json(response)
            }
            let flattedForm = await getFlatObj(form)
            flattedForm['name_'] = flattedForm['name']
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year","isDraft"]
            obj = await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
            responseData[0]['language'] = obj
            response.success = true
            response.data = responseData
            response.message = 'Form Questionare!'
            return res.status(200).json(response)
        }
        else{
            response.success = true
            response.data = req.form
            return res.status(200).json(response)
        }
    }
    catch(err){
        response.success = false
        response.data = req.form
        response.message = "Some server error occured"
        console.log("error in changeGetApiForm ::: ",err.message)
    }
}

module.exports.changePayloadFormat = async(req,res,next)=>{
    try{
        let {designYear,financialYear,ulb,data} = req.body
        let year = getKeyByValue(years,designYear)
        let latestYear = !outDatedYears.includes(year)
        if(latestYear){
            let payload = await nestedObjectParser(data,req)
            payload['name'] = payload['name_']
            delete req.body['data']
            await clearVariables('category')
            Object.assign(req.body,payload)
        }
        next()
        // console.log("change Payload form::")
    }
    catch(err){
        console.log("error in changePayloadFormat ::: ",err.message)
    }
}