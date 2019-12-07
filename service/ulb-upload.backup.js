const request = require("request");
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const CONSTANTS = require('../_helper/constants');
const service = require("./index");
const Ulb =require("../models/Schema/Ulb");
const State = require("../models/Schema/State");
const UlbType = require("../models/Schema/UlbType");

module.exports.create = async function(req,res,next){
    var financialYear = req.body.year;
    if(req.files.length ==1){
        var reqFile = req.files[0]
        let errors = []
        
        var exceltojson;
        res["fileName"] = reqFile.originalname;
        if (reqFile.originalname.split('.')[reqFile.originalname.split('.').length - 1] === 'xlsx') {
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }
        let success = []
        try {
            await exceltojson({
                input: reqFile.path,
                output: null, //since we don't need output.json
                lowerCaseHeaders: true,
                sheet: CONSTANTS.ULBMASTER.INPUT_SHEET_NAME,
            }, async function (err, sheet) {

                for(let eachRow of sheet){                    
                    Object.keys(eachRow).forEach((key) => (eachRow[key] == null || eachRow[key] == '') && delete eachRow[key]);
                    let message = "";
                    let state = await State.findOne({ name : eachRow.state,isActive : true},{ _id:1 }).exec();
                    let ulbType = await UlbType.findOne({ name : eachRow.type,isActive : true},{ _id:1 }).exec();
                    state ? eachRow.state = state._id : message+="State "+eachRow.state+" don't exists";
                    ulbType ? eachRow.ulbtype = ulbType._id : message+="Ulb "+eachRow.type+" don't exists";
                    if(message!=""){
                        console.log(eachRow,message)
                        errors.push(message);
                    }else{
                        eachRow.area = eachRow.area ? Number(eachRow.area.replace(/\,/g,'')) : 0;
                        eachRow.wards = eachRow.wards ? Number(eachRow.wards.replace(/\,/g,'')) : 0;
                        eachRow.population = eachRow.population ? Number(eachRow.population.replace(/\,/g,'')) : 0;
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
    }
}
function returnResponse(res){
    return res.status(200).json({
        data : [
            { 
                msg : res.errors && res.errors.length > 0 ? res.errors : "Successfully uploaded file : "+res["fileName"],
                success :  res.errors && res.errors.length > 0 ? false : true
            }
        ],
        success:true
        
    })
}