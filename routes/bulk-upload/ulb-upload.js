var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const service = require("../../service");
const Ulb =require("../../models/Ulb");
const State = require("../../models/State");
const UlbType = require("../../models/UlbType");
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
                console.log(sheet)
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
                    let state = await State.findOne({ code : eachRow.state,isActive : true},{ _id:1 }).exec();

                    // check whether ulb type exists or not
                    let ulbType = await UlbType.findOne({ name : eachRow.type,isActive : true},{ _id:1 }).exec();


                    state ? eachRow.state = state._id : message+="State "+eachRow.state+" don't exists";
                    ulbType ? eachRow.ulbtype = ulbType._id : message+="Ulb "+eachRow.type+" don't exists";
                    console.log(message)
                    if(message!=""){
                        // if any state or ulb type not exists, then return message
                        errors.push(message);
                    }else{
                        // take area, wards, population => if empty then convert to 0 or if comma then remove comma
                        eachRow.area = eachRow.area ? Number(eachRow.area.replace(/\,/g,'')) : 0;
                        eachRow.wards = eachRow.wards ? Number(eachRow.wards.replace(/\,/g,'')) : 0;
                        eachRow.population = eachRow.population ? Number(eachRow.population.replace(/\,/g,'')) : 0;
                        eachRow.location = {
                            lat : eachRow.lat,
                            lng : eachRow.lng
                        }

                        eachRow["natureOfUlb"] = eachRow["natureofulb"] ? eachRow["natureofulb"] :""
                        eachRow["ulbType"] = eachRow["ulbtype"]


                        delete eachRow["ulbtype"]
                        delete eachRow["natureofulb"]
                        service.put({ code : eachRow.code },eachRow,Ulb,function(response,value){
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
