
function getChildQuestion(params){
    let {year,installment,type,key,quesType,file,url} = params 
    try{
      let childQuestion = {
        "installment": installment,
        "year": "",
        "type": type,
        "instlText": `${installmentLabels[installment]} FY (${year})`,
        "isDisableQues": true,
        "quesText": `${quesType}`,
        "question": getChildQuestion(year)[key] || "",
        "key": key,
        "qusType": "",
        "fileName": "",
        "url": "",
        "file": {
          "name": file.name || "",
          "url": file.url || "",
          "progress": null,
          "error": null,
        }
      }
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
        "quesTxt":""
      },
      "nonmillion_tied_2023-24_2":{
        "question":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesTxt":""
      },
      "nonmillion_untied_2023-24_1":{
        "question":`(A) Upload Grant Allocation to ULBs - 1st Installment (${year})`,
        "quesTxt":""
      },
      "nonmillion_untied_2023-24_2":{
        "questions":`(B) Upload Grant Allocation to ULBs - 2nd Installment (${year})`,
        "quesTxt":""
      },
      "million_tied_2023-24_1" : {
        "question":`(A) Upload Grant Allocation for  Water Supply and SWM - FY (${year})`,
        "quesText":"Upload Grant Allocation for Water Supply and SWM"
      }
    }
  }