
const {payloadParser,nestedObjectParser,getFlatObj,mutateJson,mutateResponse,decideDisabledFields} = require("../CommonActionAPI/service");
const {years} = require("../../service/years")
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const {getKeyByValue} = require("../../util/masterFunctions")
const FormsJson = require("../../models/FormsJson");
const ObjectId = require("mongoose").Types.ObjectId;
const {MASTER_STATUS_ID,MASTER_STATUS} = require("../../util/FormNames")
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
            Object.assign(req.body,payload)
            delete req.body['data']
        }
        next()
    }
    catch(err){
        console.log("error in changePayload :::: ",err.message)
        let message = ["demo","staging"].includes(process.env.ENV) ? err.message : "Something went wrong"
        return res.status(400).json({
            "message":message,
            "success":false
        })
    }
}

module.exports.changeResponse = async(req,res,next) =>{
    let response = {
        "success":false,
        "data":[],
        "message":""
    }
    let formStatus = false
    try{
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req.query.formId,
              "language":[],
              "status":MASTER_STATUS_ID[parseInt(req.form.currentFormStatus)] || "Not Started",
              "canTakeAction":req?.form?.canTakeAction ? req?.form?.canTakeAction :false,
              "deadLineMsg":"As per 15th FC Operational Guidelines, for receiving grants ULBs should submit their AFS on or before 15th of May",
              "statusId": req?.form?.currentFormStatus ?  req?.form?.currentFormStatus  :  MASTER_STATUS['Not Started'],
              "isQuestionDisabled":formStatus

            }
          ]
        if(!req.form){
            Object.assign(response,req.obj)
            // return res.status(200).json(req.obj)
        }
        let yearId = req.query.design_year
        let year = getKeyByValue(years,yearId)
        if(req.form && req.form.isDraft && req.form.isDraft === ""){
            req.form.isDraft = true
        }
        let form = {...req.form}
        let {name,role} = req.decoded
        let latestYear = !outDatedYears.includes(year)
        if(latestYear){
            let jsonFormId = req?.query?.formId
            if(!jsonFormId){
                response.message = "json form id is required"
                return res.status(400).json(response)
            }
            let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
            let formJson = await FormsJson.findOne(condition).lean()
            let obj = formJson ? formJson.data : {}
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year","isDraft"]
            let mutatedJson = await mutateJson(obj,keysToBeDeleted,req.query,role)
            if(mutatedJson[0].isDraft === ""){
                mutatedJson[0].isDraft = true
            }
            if(form){
                formStatus = decideDisabledFields(form,req.decoded.role)
            }
            response.message = 'Form Questionare!'
            response.success = true
            mutatedJson[0].prevStatus = req.obj?.url || ""
            responseData[0]['language'] = mutatedJson
            if(Object.keys(form).length > 0){
                let flattedForm = getFlatObj(form)
                flattedForm['form_type'] = "annual"
                flattedForm['isDraft'] = form.isDraft
                flattedForm['role'] = req.decoded.role
                mutatedJson =  await mutateResponse(obj, flattedForm,keysToBeDeleted,role)
                responseData[0]['language'] = mutatedJson
                responseData[0]['isQuestionDisabled'] = formStatus
                if(mutatedJson[0].isDraft === ""){
                    mutatedJson[0].isDraft = true
                }
                mutatedJson[0].deadLineMsg  = "As per 15th FC Operational Guidelines, for receiving grants ULBs should submit their AFS on or before 15th of May"
                mutatedJson[0].prevStatus = req.form?.url || ""
                response.data = responseData
                response.url = req.form.url
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