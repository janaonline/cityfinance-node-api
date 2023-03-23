
const {payloadParser,nestedObjectParser,getFlatObj,mutateJson,mutuateGetPayload} = require("../CommonActionAPI/service");
const {years} = require("../../service/years")
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const {getKeyByValue} = require("../../util/masterFunctions")
const FormsJson = require("../../models/FormsJson");
const ObjectId = require("mongoose").Types.ObjectId;

const getPreviousYearsID = (year,from)=>{
    try{
        let yearToDegrade = from ==2 ? 1 : 0
        let currentYear = parseInt(year)
        let previousYearString = `${currentYear -from}-${(currentYear-yearToDegrade).toString().substr(2,4)}`
        let yearId = years[previousYearString]
        return yearId
    }
    catch(err){
        console.log("error in getPreviousYearsID ::: ",err.message)
    }
}

module.exports.changePayload = async(req,res,next)=>{
    try{
        let { design_year,data, isDraft } = req.body
        let year = getKeyByValue(years,design_year)
        let latestYear = !outDatedYears.includes(year)
        if(latestYear){
            let payload = await nestedObjectParser(data,req)
            let auditedYear = getPreviousYearsID(year,2)
            let unAuditedYear = getPreviousYearsID(year,1)
            payload.audited.year = auditedYear
            payload.unAudited.year = unAuditedYear
            console.log("payload ::; ",payload.audited)
            Object.assign(req.body,payload)
            delete req.body['data']
        }
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
        if(req.form && req.form.isDraft && req.form.isDraft === ""){
            req.form.isDraft = true
        }
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
            if(mutatedJson[0].isDraft === ""){
                mutatedJson[0].isDraft = true
            }
            response.message = 'Form Questionare!'
            response.success = true
            console.log("1")
            mutatedJson[0].prevStatus = req.obj?.url || ""
            responseData[0]['language'] = mutatedJson
            if(Object.keys(form).length > 0){
                let flattedForm = getFlatObj(form)
                mutatedJson =  await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
                responseData[0]['language'] = mutatedJson
                response.data = responseData
                console.log("2")
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
        console.log("err :: ",err.message)
        response.message = "Some server error occured"
        response.success = false
        return res.status(400).json(response)
    }
}