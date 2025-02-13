const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutateResponse,mutateJson,nestedObjectParser,decideDisabledFields } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const Ulb = require('../../models/Ulb')
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const { MASTER_STATUS_ID,MASTER_STATUS } = require("../../util/FormNames");

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
        let formJson = await FormsJson.findOne(condition).lean();
        let ulbData = await Ulb.findOne({_id: ObjectId(req.query?.ulb)},{access_2122:1}).lean()
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req?.query?.formId,
              "language":[],
              "canTakeAction":req?.form?.canTakeAction ,
              "isDraft":req?.form?.isDraft,
              "createdIn2122": ulbData?.access_2122,
              'prevYearStatus': req?.form?.prevYearStatus || null,
              'prevYearStatusId': req?.form?.prevYearStatusId || null,
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
            obj = await mutateResponse(obj, flattedForm,keysToBeDeleted,role)
            let keysToBeDisabled = ['officerName', 'designation','cert_declaration'];
            getQuestionsDisabled(obj, keysToBeDisabled, formStatus)
            responseData[0]['language'] = obj
            responseData[0]['language'][0]['isDraft'] =  req?.form?.isDraft
            responseData[0]['isQuestionDisabled'] = formStatus
            response.success = true
            responseData[0]["statusId"]= req?.form?.currentFormStatus  || MASTER_STATUS['Not Started']
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
                    slbDataNotFilled:req.slbDataNotFilled,
                    createdIn2122: ulbData?.access_2122
                  })
            }
            
        }
        
    }
    catch(err){
        console.log("error in changeApiGetForm ::: ",err.message)
    }
}
/**
 * The function `getQuestionsDisabled` iterates through a list of questions and disables specific keys
 * based on the provided status.
 * @param obj - The `obj` parameter is likely an array containing objects
 * @param keysToBeDisabled - The `keysToBeDisabled` parameter is an array containing the short keys of
 * the questions that need to be disabled in the form.
 * @param formStatus - The `formStatus` parameter in the `getQuestionsDisabled` function is used to
 * determine whether a question should be disabled or not. 
  */
function getQuestionsDisabled(obj, keysToBeDisabled, formStatus){
    try {
        let questions = obj[0].question
            if (questions) {
                for (let question of questions) {
                    if(keysToBeDisabled.includes(question.shortKey))
                     question.isQuestionDisabled = formStatus
                }
            }
    } catch (error) {
        throw new Error(`getQuestionsDisabled: ${error.message}`)
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
            if(Object.keys(payload).length>1){
                Object.assign(req.body, payload)
            }
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