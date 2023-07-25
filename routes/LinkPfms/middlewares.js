const { years } = require("../../service/years")
const { getFlatObj, payloadParser, mutateResponse, mutateJson, nestedObjectParser, clearVariables, decideDisabledFields,checkIfUlbHasAccess } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const { getKeyByValue } = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
const { findPreviousYear } = require('../../util/findPreviousYear')
let outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
const ULB = require("../../models/Ulb")
const { MASTER_STATUS_ID, MASTER_STATUS } = require("../../util/FormNames");


async function checkForUlbCreation(req){
    try{
        let ulbData = await ULB.findOne({
            "_id":ObjectId(req.decoded.ulb)
        }).lean()
        let prevYear = getKeyByValue(years,req.query.design_year)
        let ifUlbIsFromLastYear = await checkIfUlbHasAccess(ulbData,{year:prevYear})
        return ifUlbIsFromLastYear

    }
    catch(err){
        console.log("error in checkForUlbCreation ::: ",err.message)
    }
}

const transformResponse = async(req,res,next)=>{
    let response = {
        "success":true,
        "data":"",
        "message":"",
        "hideForm":false, // to do when form goes live change this variable to false
    }
    try{
        let responseData = [
            {
              "_id": req?.form?._id ,
              "formId": req.query.formId,
              "language":[],
              "status":MASTER_STATUS_ID[parseInt(req?.form?.currentFormStatus)] || "Not Started",
              "canTakeAction":req?.form?.canTakeAction ? req?.form?.canTakeAction :false,
              "statusId": req?.form?.currentFormStatus ?  req?.form?.currentFormStatus  :  MASTER_STATUS['Not Started'],
              "isQuestionDisabled":false,
               "groupOrder": 37,
               "createDynamicOption": [],
               "getDynamicOption": [],
            }
          ]
        let  ifUlbIsFromLastYear = await checkForUlbCreation(req)
        // console.log("ifUlbIsFromLastYear :: ",ifUlbIsFromLastYear)
        let yearId = req.query.design_year
        let year = getKeyByValue(years, yearId)
        let form = { ...req.form }
        let { name, role } = req.decoded
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req?.query?.formId
        if(!latestYear){
            response.data = req.form
            return res.json(response)
        }
        if(!jsonFormId){
            response.message = "form Id is required"
            response.success = false
            return res.json(response)
        }
        let condition = { formId: parseInt(jsonFormId) ,design_year:ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let obj = formJson ? formJson.data : {}
        let keysToBeDeleted = []
        let formResponse = {}
        // to do when pfms goes live uncomment this code
        response.hideForm = ifUlbIsFromLastYear ? true : false  
        if(form && Object.keys(form).length > 1){
            let flattedForm = getFlatObj(form)
            flattedForm['isDraft'] = form?.isDraft
            flattedForm['role'] = req.decoded.role
            formResponse = await mutateResponse(obj, flattedForm,keysToBeDeleted,role)
            
        }
        else{
            formResponse = await mutateJson(obj,keysToBeDeleted,req.query,role)
        }
        responseData[0].language = formResponse
        response.data = responseData
        return res.status(200).json(response)
    }
    catch(err){
        console.log("error in response ::: ",err.message)
    }
}

const transformPayload = async(req,res,next)=>{
    try{
        let { design_year,data } = req.body
        let year = getKeyByValue(years,design_year)
        let latestYear = !outDatedYears.includes(year)
        if(latestYear){
            let payload = await nestedObjectParser(data,req)
            Object.assign(req.body,payload)
            delete req.body['data']
        }
        next()
    }
    catch(err){
        console.log("error in transform payload ::: ",err.message)
    }
}

module.exports.transformResponse = transformResponse
module.exports.transformPayload = transformPayload