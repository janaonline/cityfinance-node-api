const { years } = require("../../service/years")
const { getFlatObj, payloadParser, mutateResponse, mutateJson, nestedObjectParser, clearVariables, decideDisabledFields } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const { getKeyByValue } = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
const { MASTER_STATUS_ID, MASTER_STATUS } = require("../../util/FormNames")
module.exports.changeGetApiForm = async (req, res, next) => {
    let dummyProjectSample = {
        "location" : {
            "lat" : "",
            "long" : ""
        },
        "cost" : "",
        "expenditure" : "",
        "category" : ObjectId("60783e454dff55e6c0cb80c8"),
        "name" : "",
        "startDate":"",
        "completionDate":""
    }
    let response = {
        "success": false,
        "data": [],
        "message": ""
    }
    try {
        let yearId = req.query.design_year
        let year = getKeyByValue(years, yearId)
        let form = { ...req.form }
        let { name, role } = req.decoded
        let latest = form?.createdAt > new Date('2023-07-12T11:45:58.550Z')
        form['disabledShortKeys'] = ['category']
        if(!latest){     
            if(form.projects.length < 1){
                form['projects'] = [dummyProjectSample]
                }
                form['disabledShortKeys'] = []
        }
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req.query.formId || 0
        let condition = { formId: parseInt(jsonFormId), design_year: ObjectId(yearId) }
        let formJson = await FormsJson.findOne(condition).lean()
        let obj = formJson ? formJson.data : {}
        let responseData = [
            {
                "_id": req?.form?._id,
                "formId": req.query.formId,
                "language": [],
                    "canTakeAction": form?.canTakeAction || false,
                "isDraft": form.isDraft !== undefined ? form.isDraft : true,
                "status": MASTER_STATUS_ID[parseInt(form?.currentFormStatus)] || "Not Started",
                "statusId": form.currentFormStatus ? form?.currentFormStatus : MASTER_STATUS['Not Started'],
                'prevYearStatus': req?.form?.prevYearStatus || null ,
                'prevYearStatusId': req?.form?.prevYearStatusId || null

            }
        ]
        if (latestYear) {
            if (req.form.url) {
                response.success = true
                response.url = req.form.url
                response.message = req.form.url
                response.msg = req.form.url
                return res.status(400).json(response)
            }
            if (!jsonFormId) {
                response.message = "formId is required"
                response.success = false
                return res.json(response)
            }
            let formStatus = false
            if (form) {
                formStatus = decideDisabledFields(form, req.decoded.role)
            }
            let flattedForm = await getFlatObj(form)
            flattedForm.disableFields = formStatus
            flattedForm['validations'] = {
                "startDate" : {
                    "max":new Date().toISOString().slice(0, 10),
                    "min":""
                },
            }
            flattedForm['name_'] = flattedForm['name']
            delete flattedForm['name']
            let keysToBeDeleted = ["_id", "createdAt", "modifiedAt", "actionTakenByRole", "actionTakenBy", "ulb", "design_year"]
            let closingBalance = round((+form.grantPosition.unUtilizedPrevYr) + (+form.grantPosition.receivedDuringYr), 2) - (+form.grantPosition.expDuringYr);
            flattedForm['grantPosition.closingBal'] = closingBalance ? round(closingBalance, 2) : closingBalance
            obj = await mutateResponse(obj, flattedForm, keysToBeDeleted, role)
            obj[0].isDraft = form.isDraft
            responseData[0]['language'] = obj
            response.success = true
            responseData[0]['isQuestionDisabled'] = formStatus
            response.data = responseData
            response.latest = latest
            response.message = 'Form Questionare!'
            return res.status(200).json(response)
        }
        else {
            response.success = true
            response.data = req.form
            return res.status(200).json(response)
        }
    } catch (err) {
        response.success = false
        response.data = req.form
        response.message = "Some server error occured"
        console.log("error in changeGetApiForm ::: ", err.message)
    }
}
function round(num, decimalPlaces = 0) {
    if (num < 0)
        return -round(-num, decimalPlaces);
    var p = Math.pow(10, decimalPlaces);
    var n = num * p;
    var f = n - Math.floor(n);
    var e = Number.EPSILON * n;
    // Determine whether this fraction is a midpoint value.
    return (f >= .5 - e) ? Math.ceil(n) / p : Math.floor(n) / p;
}
module.exports.changePayloadFormat = async (req, res, next) => {
    try {
        let { designYear, financialYear, ulb, data } = req.body
        let year = getKeyByValue(years, designYear)
        let latestYear = !outDatedYears.includes(year)
        if (latestYear) {
            let payload = await nestedObjectParser(data, req)
            payload['name'] = payload['name_']
            delete req.body['data']
            await clearVariables('category')
            Object.assign(req.body, payload)
        }
        next()
        // console.log("change Payload form::")
    }
    catch (err) {
        console.log("error in changePayloadFormat ::: ", err.message)
        let message = ["demo", "staging"].includes(process.env.ENV) ? err.message : "Something went wrong"
        return res.status(400).json({
            "message": message,
            "success": false
        })
    }
}