const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson } = require("../CommonActionAPI/service")
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
        let {projects} =req.query
        let yearId = req.query.design_year
        let year = getKeyByValue(years,yearId)
        let form = {...req.form}
        let {name,role} = req.decoded
        form['ulbName'] = name
        delete form['history']
        let latestYear = !outDatedYears.includes(year)
        let jsonFormId = req.query.formId
        
        let formJson = await FormsJson.findOne({ formId: jsonFormId ,design_year:ObjectId(yearId) }).lean()
        let obj = formJson ? formJson.data : {}
        if(latestYear){
            if(!jsonFormId){
                response.message = "formId is required"
                repsonse.success = false
                return res.json(response)
            }
            let flattedForm = await getFlatObj(form)
            let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year","isDraft"]
            obj = await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
            response.data = obj
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