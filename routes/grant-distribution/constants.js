
const {getKeyByValue} = require("../../util/masterFunctions")
const {years} = require("../../service/years");
function getChildQuestion(params){
    let {year,installment,type,key,quesType,file,url} = params 
    console.log("year :: ",year)
    try{
      let childQuestion = {
        "installment": installment,
        "year": year,
        "type": type,
        "instlText": `${installmentLabels[installment]} FY (${getKeyByValue(years,year)})`,
        "isDisableQues": true,
        "quesText": `${quesType}`,
        "question": getQuestions(getKeyByValue(years,year))[key] || "",
        "key": key,
        "qusType": "",
        "fileName": "",
        "url": url,
        "file": {
          "name": file.name || "",
          "url": file.url || "",
          "progress": null,
          "error": null,
        }
      }
      return childQuestion
    }
    catch(err){
      console.log("error in getChildQuestion :::: ",err.message)
    }
  }
  
  
  let installmentLabels = {
    "1": "1st Installment",
    "2": "2nd Installment",
    "3": "3rd Installment"
  }
  
  const getQuestions = (year)=>{
    return {
      "nonmillion_tied_2023-24_1":{
        "question":`(A) Upload Grant Allocation to ULBs - 1st Installment (${year})`,
        "quesTxt":"",
        "disableMsg":""
      },
      "nonmillion_tied_2023-24_2":{
        "question":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesTxt":"",
        "disableMsg":""
      },
      "nonmillion_untied_2023-24_1":{
        "question":`(A) Upload Grant Allocation to ULBs - 1st Installment (${year})`,
        "quesTxt":"",
        "disableMsg":""
      },
      "nonmillion_untied_2023-24_2":{
        "questions":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesTxt":"",
        "disableMsg":""
      },
      "million_tied_2023-24_1" : {
        "question":`(A) Upload Grant Allocation for  Water Supply and SWM - FY (${year})`,
        "quesText":"Upload Grant Allocation for Water Supply and SWM",
        "disableMsg":""
      }
    }
  }

  module.exports.getChildQuestion = getChildQuestion