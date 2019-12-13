const CONSTANTS = require('../_helper/constants');

const State = require("../models/Schema/State")
const Ulb = require("../models/Schema/Ulb");
const LineItem = require("../models/Schema/LineItem");
const UlbLedger = require("../models/Schema/UlbLedger")
var xlstojson = require("xls-to-json-lc");
var xlsxtojson = require("xlsx-to-json-lc");

const overViewSheet = {
    'State Code': 'state_code',
    'Name of the state': 'state',
    'ULB Code': 'ulb_code',
    'Name of the ULB': 'ulb',
    'Financial Year': 'year',
    'Audit Status': 'audit_status',
    'Audit Firm Name': 'audit_firm',
    'Name of the Partner': 'partner_name',
    'ICAI Membership Number': 'icai_membership_number',
    'Date of Entry': 'created_at',
    'Entered by': 'created_by',
    'Date of verification': 'verified_at',
    'Verified by': 'verified_by',
    'Date of Re-verification': 'reverified_at',
    'Re-verified by': 'reverified_by'
};



module.exports.bulkEntry = async function (req, res) {


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
                sheet: CONSTANTS.LEDGER.BULK_ENTRY.OVERVIEW_SHEET_NAME,
            }, async function (err, sheet) {
                if(err){
                    errors.push( "Corupted overview excel file for ULB : "+reqFile.originalname );
                    res["errors"] = errors
                    returnResponse(res)
                }
                if(sheet.length < 2){
                    // means less than two entries are there in the sheet;
                    errors.push( "Overview sheet has less than two rows, Please check" );
                    res["errors"] = errors
                    returnResponse(res)
                }


                let objOfSheet = {};
                for(let eachRow of sheet){
                    // converting data in rows here in obj;
                    eachRow["basic details"] ? objOfSheet[eachRow["basic details"] ] = eachRow.value : "Means row is empty remove it"

                }
                for(let key of Object.keys(objOfSheet)){
                    objOfSheet[ overViewSheet[key]] = objOfSheet[key] ;
                    delete objOfSheet[key];
                }
                if(objOfSheet.year != financialYear){
                    errors.push("Selected financial year: "+financialYear+" while sheet has year:"+objOfSheet.year);
                    res["errors"] = errors
                    returnResponse(res)
                }
                // Find whether state code exists or not
                const state = await State.findOne({ code : objOfSheet.state_code,isActive:true }).exec();

                if(!state){
                    errors.push( "State code "+ objOfSheet.state_code+" or "+" State name "+objOfSheet.state+" do not exists in states master");
                    res["errors"] = errors
                    returnResponse(res)
                }

                // Find whether ulb code exists or not
                const ulb = await Ulb.findOne({ code : objOfSheet.ulb_code, state : state._id ,isActive:true }).exec();

                if(!ulb){
                    errors.push( "Ulb code "+ objOfSheet.ulb_code+" do not exists in ulb's master for "+objOfSheet.state_code+" state");
                    res["errors"] = errors
                    returnResponse(res)
                }

                Object.assign(objOfSheet,JSON.parse(JSON.stringify(ulb)));

                objOfSheet['ulb_code_year'] = objOfSheet.ulb_code + '_' + objOfSheet.year;

                await exceltojson({
                    input: reqFile.path,
                    output: null, //since we don't need output.json
                    lowerCaseHeaders: true,
                    sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
                }, async function (err, sheet) {

                    if(err){
                        errors.push( "Corupted input sheet excel file for ULB : "+reqFile.originalname );
                        res["errors"] = errors
                        return returnResponse(res)
                    }

                    let inputSheetObj = { }
                    for(let eachRow of sheet){
                        eachRow["amount in inr"] = eachRow["amount in inr"] =="-" ? eachRow["amount in inr"] = "0" : eachRow["amount in inr"] ;
                        eachRow["amount in inr"] = eachRow["amount in inr"].trim()!='' ?  eachRow["amount in inr"].replace(/\,/g,'') : '' ;

                        if((eachRow["amount in inr"].indexOf('(')>-1 && eachRow["amount in inr"].indexOf(')')>-1))
                        eachRow["amount in inr"] = "-" + eachRow["amount in inr"].replace("(", "").replace(")","")

                        if(eachRow["code"]){
                            inputSheetObj[eachRow["code"].trim()] = Number(eachRow["amount in inr"]);
                            if(isNaN(inputSheetObj[eachRow["code"].trim()])){
                                errors.push("Line item code "+eachRow["code"]+" value is not applicable");
                            }
                                 // converting in format {'100': '0',
                        //                      '110': '793,655,000',
                        //                      '120': '0' }
                       
                        }
                   
                    }
                    var message = validateBalanceSheet(balanceSheet,inputSheetObj);
                    if(message){
                        errors.push(message);
                        res["errors"] = errors
                        return returnResponse(res)
                    }
                    let lineItemCodes = Object.keys(inputSheetObj);
                    
                    for(let el of lineItemCodes){
                        const validateLI = await LineItem.findOne({ code:el ,isActive : true }).exec();
                        
                        if(!validateLI){
                            errors.push("Invalid Item code "+el+" found in the sheet"); 
                        }else{
                            console.log("here coming")
                            inputSheetObj[validateLI._id] = inputSheetObj[el]
                            delete inputSheetObj[el]
                        }
                    }
                    if(errors.length){
                        res["errors"] = errors
                        return returnResponse(res)
                    }
                    Object.assign(objOfSheet,{ ledger : JSON.parse(JSON.stringify(inputSheetObj)) });
                    for(let el of Object.keys(objOfSheet.ledger)){
                        let query = {
                            ulb : objOfSheet._id,
                            lineItem : el,
                            financialYear : financialYear
                        },update = {
                            amount : objOfSheet.ledger[el]
                        },options = {
                            upsert : true,
                            setDefaultsOnInsert : true,
                            new: true
                        }
                        let result = await UlbLedger.findOneAndUpdate(query,update,options);
                        if(!result){
                            errors.push("Item code " +el+ " doesn't got inserted/updated");
                        }
                    }
                    if(errors.length){
                        res["errors"] = errors
                        return returnResponse(res)
                    }
                    return returnResponse(res)
                })
            });
        } catch (e) {
            console.log("Exception Caught while extracting file => ",e);
            errors.push("Exception Caught while extracting file");
        }
    }
};

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

function validateBalanceSheet(balanceSheet,inputSheetObj){
    let message = "";
    for(let key of Object.keys(inputSheetObj)){
        if(balanceSheet.liabilityAdd.includes(key)){
            balanceSheet.liability+=inputSheetObj[key]
        }else if(balanceSheet.assetsAdd.includes(key)){
            balanceSheet.assets+=inputSheetObj[key]
        }
    }
    if(balanceSheet.liability!=balanceSheet.assets){
        message = "Balance sheet has liablity: "+balanceSheet.liability+" while assets :"+balanceSheet.assets;
    }
    return message;
}
