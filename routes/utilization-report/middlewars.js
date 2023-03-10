const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const {getKeyByValue} = require("../../util/masterFunctions")
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
let outDatedYears = ["2018-19","2019-20","2021-22","2022-23"]
module.exports.changeGetApiForm = (req,res,next)=>{
    try{
        let yearId = req.query.design_year
        let year = getKeyByValue(yearId)
        let form = {...req.form}
        // console.log("form :::: ",form)
        let flattedForm = getFlatObj(form)
        console.log("flattedForm :::: ",flattedForm)
        let latestYear = outDatedYears.includes(yearId)
        if(latestYear){
            return 
        }
    }
    catch(err){
        console.log("error in changeGetApiForm ::: ",err.message)
    }
}