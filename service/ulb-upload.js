const request = require("request");
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");
const CONSTANTS = require('../_helper/constants');

function doRequest(reqOptions) {
	return new Promise(function (resolve, reject) {
		request(reqOptions, function (error, res, body) {
            console.log(res.statusCode,error);	
			if (!error &&( res.statusCode == 200 || res.statusCode == 400)) {
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}
function getReqOption(obj,type,uri,body){
	obj["method"] = type;
	obj["body"] = body ? body : {};
	obj["uri"] = uri;
	return obj;
}
module.exports.create = async function(req,res,next){
    var financialYear = req.body.year;
    if(req.files.length ==1){
        var reqFile = req.files[0]
        let errors = []
        
        var balanceSheet = {
            liability: 0,
            assets : 0,
            liabilityAdd: ['310', '311', '312', '320', '330', '331', '340', '341', '350', '360', '300'],
            assetsAdd: ['410', '411', '412', '420', '421', '430', '431', '432', '440', '450', '460', '461', '470', '480', '400']
        }
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
                sheet: CONSTANTS.ULBMASTER.INPUT_SHEET_NAME,
            }, async function (err, sheet) {
                console.log(err,sheet);
                // if(err){
                //     errors.push( "Corupted overview excel file for ULB : "+reqFile.originalname );
                //     res["errors"] = errors
                //     returnResponse(res)
                // }

            });
        } catch (e) {
            console.log("Exception Caught while extracting file => ",e);
            errors.push("Exception Caught while extracting file");
        }
    }
}