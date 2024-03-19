const { years } = require("../../service/years")
const { getFlatObj, payloadParser, mutateResponse, mutateJson, nestedObjectParser, clearVariables, decideDisabledFields,checkIfUlbHasAccess, checkUlbAccess } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const { getKeyByValue } = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
const { findPreviousYear } = require('../../util/findPreviousYear')
let outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
const ULB = require("../../models/Ulb")
const { MASTER_STATUS_ID, MASTER_STATUS } = require("../../util/FormNames");
const { getPreviousYear, isYearWithinCurrentFY } = require("../sidemenu/service");


async function checkForUlbCreation(req){
    try{
        let ulbData = await ULB.findOne({
            "_id":ObjectId(req.decoded.ulb)
        }).lean()
        let prevYear = getKeyByValue(years,req.query.design_year)
        let ifUlbIsFromLastYear = await checkIfUlbHasAccess(ulbData,{year:prevYear})
        return {ifUlbIsFromLastYear, ulbData}
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
        "url":"",
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
        let  {ifUlbIsFromLastYear, ulbData } = await checkForUlbCreation(req)
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
        response.hideForm = ifUlbIsFromLastYear ? true : false;
        decideRedirections(response, yearId, ulbData); 
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

/**
 * The function `decideRedirections` determines the URL and message for redirecting to PFMS Account
 * Linkage based on the response, year ID, and ULB data.
 * @param response - The code snippet you provided is a function called `decideRedirections` that takes
 * three parameters: `response`, `yearId`, and `ulbData`.
 * @param yearId - The `yearId` parameter in the `decideRedirections` function is used to represent the
 * current financial year for which the redirection decisions are being made.
 * @param ulbData - The `ulbData` parameter data related to ULBs (Urban Local Bodies). It is used in the `decideRedirections` function to determine the redirection
 * logic based on the availability of data for specific years related to ULBs. The function checks for
 * access
 */
function decideRedirections(response, yearId, ulbData) {
    try {
        response.url = '/ulbform2223/pfms_acc';
        let prevFormYearId = getPreviousYear(yearId, 1);
        let prevFormYear = getKeyByValue(years, prevFormYearId);
        const prevAccessYear = checkUlbAccess(prevFormYear, 2);
        if (isYearWithinCurrentFY(yearId) && response.hideForm) {
            let baseYearId = getPreviousYear(yearId, 2);
            let baseYear = getKeyByValue(years, baseYearId);
            const baseAccessYear = checkUlbAccess(baseYear, 2);
            if (ulbData[baseAccessYear]) {
                prevFormYear = getKeyByValue(years, baseYearId);
            } else if (ulbData[prevAccessYear]) {
                response.url = `/ulb-form/${prevFormYearId}/pfms_acc`;
            }
        }
        response.message = `Click to view PFMS Account Linkage of Financial Year ${prevFormYear}`;
    } catch (error) {
        throw new Error(`decideRedirections:: ${error.message}`)
    }
}
