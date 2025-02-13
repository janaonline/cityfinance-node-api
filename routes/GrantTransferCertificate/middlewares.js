const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutateResponse,mutateJson,nestedObjectParser,clearVariables,decideDisabledFields } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
const {MASTER_STATUS_ID} = require("../../util/FormNames")

module.exports.changePayloadStructure = async(req,res,next)=>{
    let response = {
        success : true,
        message : ""
    }
    try{
        let {data} = req.body
        let payload = await nestedObjectParser(data,req)
        req.body.data = payload
        // Object.assign(req.body,payload)
        next()
    }
    catch(err){
        if(["demo","staging"].includes(process.env.ENV)){
            response.message = err.message
        }
        return res.status(400).json(response)
    }
}