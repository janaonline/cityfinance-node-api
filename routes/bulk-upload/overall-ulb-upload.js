var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const service = require("../../service");
const OverallUlb =require("../../models/OverallUlb");
const State = require("../../models/State");

module.exports = async function(req,res,next){
    if(req.file){
        var reqFile = req.file;
        let errors = [];
        
        var exceltojson;
        res["fileName"] = reqFile.originalname;
        if (reqFile.originalname.split('.')[reqFile.originalname.split('.').length - 1] === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        try {
            await exceltojson({
                input: reqFile.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders: true,
                sheet: "Input sheet",
            }, async function (err, sheet) {
                // Error encountered in reading XLSX File
                if(err){
                    res["errors"] = err;
                    return returnResponse(res)
                }
                
                for(let eachRow of sheet){ 
                    // remove all the empty rows or null rows from eachRow object
                    Object.keys(eachRow).forEach((key) => (eachRow[key] == null || eachRow[key] == '') && delete eachRow[key]);
                    let message = "";
                    // check whether particular state exists or not
                    let state = await State.findOne({ name : eachRow.state,isActive : true},{ _id:1 }).exec();

                    // check whether ulb type exists or not

                    state ? eachRow.state = state._id : message+="State "+eachRow.state+" don't exists";
                    if(message!=""){
                        console.log(eachRow)
                        // if any state or ulb type not exists, then return message
                        errors.push(message);
                    }else{
                        // take area, wards, population => if empty then convert to 0 or if comma then remove comma
                        eachRow.populationCategory = eachRow.populationcategory;
                        console.log(eachRow.code)
                        service.put({ code : eachRow.code },eachRow,OverallUlb,function(response,value){
                            console.log(value.data)
                            if(!response){
                                errors.push("Not able to create ulb => ",eachRow.code+""+response);
                            }
                        });
                    }
                }
                res["errors"] = errors
                return returnResponse(res)
            });
        } catch (e) {
            console.log("Exception Caught while extracting file => ",e);
            errors.push("Exception Caught while extracting file");
        }
    }else{
        returnResponse(res,400)
    }
}
function returnResponse(res, status = 200){
    if(status == 200){
        return res.status(status).json({
            data : [
                { 
                    msg : res.errors && res.errors.length > 0 ? res.errors : "Successfully uploaded file : "+res["fileName"],
                    success :  res.errors && res.errors.length > 0 ? false : true
                }
            ],
            success:true
        })
    }else{
        return res.status(status).json({
            data : [],
            message : "Problem with the file",
            success:false
        })
    }

}
