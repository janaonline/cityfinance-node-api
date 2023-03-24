const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson,nestedObjectParser,clearVariables } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]


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
        let jsonFormId = req.query.formId
        let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req.query.formId,
              "language":[],
              "canTakeAction":req.form?.canTakeAction ,
              "isDraft":req.form?.isDraft,
              "status":req.form?.status || null
            }
        ]
        if(latestYear){
            let ignorableKeys = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year"]
            let flattedForm = getFlatObj(req.form)
            let obj = formJson.data
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year"]
            obj = await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
            responseData[0]['language'] = obj
            response.success = true
            response.data = responseData
            response.message = 'Form Questionare!'
            return res.status(200).json(response)
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