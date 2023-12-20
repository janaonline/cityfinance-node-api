
const {getKeyByValue} = require("../../util/masterFunctions")
const {years} = require("../../service/years");
function getChildQuestion(params){
    let {year,installment,type,key,quesType,file,isDisableQues,template,url,canTakeAction,status,statusId,rejectReason,responseFile} = params 
    try{
      let childQuestion = {
        "installment": installment,
        "year": year,
        "type": type,
        "instlText": `${installmentLabels[installment]} FY (${getKeyByValue(years,year)})`,
        "isDisableQues": isDisableQues,
        "quesText": `${quesType}`,
        "question": getQuestions(getKeyByValue(years,year))[key]['question'] || "",
        "key": key,
        "qusType": "",
        "disableMsg":getQuestions(getKeyByValue(years,year))[key]['disableMsg'] || "",
        "fileName": "",
        "quesText":getQuestions(getKeyByValue(years,year))[key]['quesText'] || "",
        "url": "",
        "template":template,
        "file": {
          "name": file.name || "",
          "url": file.url || "",
          "progress": null,
          "error": null,
        },
        status,
        canTakeAction,
        statusId,
        responseFile,
        rejectReason
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
        "quesText":"Upload Grant Allocation to ULBs",
        "disableMsg":""
      },
      "nonmillion_tied_2023-24_2":{
        "question":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesText":"Upload Grant Allocation to ULBs",
        "disableMsg":`1st Installment (${year}) Grant allocation has to be uploaded first before uploading 2nd Installment (${year}) Grant allocation to ULBs`
      },
      "nonmillion_untied_2023-24_1":{
        "question":`(A) Upload Grant Allocation to ULBs - 1st Installment (${year})`,
        "quesText":"Upload Grant Allocation to ULBs",
        "disableMsg":""
      },
      "nonmillion_untied_2023-24_2":{
        "question":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesText":"Upload Grant Allocation to ULBs",
        "disableMsg":`1st Installment (${year}) Grant allocation has to be uploaded first before uploading 2nd Installment (${year}) Grant allocation to ULBs`
      },
      "million_tied_2023-24_1" : {
        "question":`(A) Upload Grant Allocation for  Water Supply and SWM - FY (${year})`,
        "quesText":"Upload Grant Allocation for Water Supply and SWM",
        "disableMsg":""
      }
    }
  }

  module.exports.getChildQuestion = getChildQuestion