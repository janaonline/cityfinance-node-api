const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson,nestedObjectParser,decideDisabledFields } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const { MASTER_STATUS_ID } = require("../../util/FormNames");

module.exports.changeApiGetForm = async(req,res)=>{
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
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req.query.formId || 0
        let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req?.query?.formId,
              "language":[],
              "canTakeAction":req?.form?.canTakeAction ,
              "isDraft":req?.form?.isDraft,
              "population":req?.form?.population || null,
            }
        ]
        if(latestYear){
            if(req.json){
                Object.assign(response,req.json)
                return res.status(200).json(response)
            }
            let formStatus = false
            if(form){
                formStatus = decideDisabledFields(form,req.decoded.role)
            }
            let flattedForm = getFlatObj(req.form)
            flattedForm.disableFields = formStatus
            let obj = formJson.data
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year"]
            obj = await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
            responseData[0]['language'] = obj
            responseData[0]['language'][0]['isDraft'] =  req?.form?.isDraft
            responseData[0]['isQuestionDisabled'] = formStatus
            response.success = true
            responseData[0]["statusId"]= req?.form?.currentFormStatus 
            responseData[0]["status"]=MASTER_STATUS_ID[req?.form?.currentFormStatus] || "Not Started",
            response.data = responseData
            response.message = 'Form Questionare!'
            return res.status(200).json(response)
        }
        else{
            if(req.json){
                return res.json(req.json)
            }
            else{
                return res.json({
                    success: true,
                    show: false,
                    data: req.form,
                    slbDataNotFilled:req.slbDataNotFilled
                  })
            }
            
        }
        
    }
    catch(err){
        console.log("error in changeApiGetForm ::: ",err.message)
    }
}

module.exports.changePayloadForm = async(req,res,next)=>{
    try{
        let yearId = req.body.design_year
        let year = getKeyByValue(years,yearId)
        let {data} = req.body
        let {name,role} = req.decoded
        let latestYear = !outDatedYears.includes(year)
        if(latestYear){
            let payload = await nestedObjectParser(data,req)
            // console.log("payload.data :: ",payload.data)
            // let obj = payload.data.find((item)=>item.question === "Extent of metering of water connections")
            req.body['data'] = payload.data
            next()
        }
        else{
            next()
        }
    }
    catch(err){
        console.log("error in changePayloadForm ::: ",err.message)
    }
}