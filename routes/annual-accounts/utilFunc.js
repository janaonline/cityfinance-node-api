module.exports.calculateTabwiseStatus = (formData) => {
    let audited = formData['audited'];
    let unAudited = formData['unAudited'];
    let auditedAns = formData['audited']['submit_annual_accounts']
    let unAuditedAns = formData['unAudited']['submit_annual_accounts']
    let actionTakenByRole = formData['actionTakenByRole']
    if(actionTakenByRole == 'ULB'){
      /* This is a condition to check if the status of audited and unaudited is rejected and approved
      respectively. If it is true, then the status of audited is set to pending. */
      if (
        formData.audited["status"] === "REJECTED" &&
        formData.unAudited["status"] === "APPROVED"
      ) {
        formData.audited["status"] = "PENDING";
      } else if (
        formData.audited["status"] === "APPROVED" &&
        formData.unAudited["status"] === "REJECTED"
      ) {
        formData.unAudited["status"] = "PENDING";
      } else if (
        formData.audited["status"] === "REJECTED" &&
        formData.unAudited["status"] === "REJECTED"
      ) {
        formData.unAudited["status"] = "PENDING";
        formData.audited["status"] = "PENDING";
      } else if ( 
        !formData.unAudited["status"]  &&
        !formData.audited["status"] 
    ){
      formData.unAudited["status"] = "PENDING";
      formData.audited["status"] = "PENDING";
    }
    }else if(actionTakenByRole != 'ULB'){
      if(auditedAns){
        let flag = 0;
        let approvedCounter = 0;
        let fileCounter = 0;
      for(let key in audited['provisional_data']){
        if(typeof audited['provisional_data'][key] == 'object' && audited['provisional_data'][key] != null ){
          fileCounter++;
          if(audited['provisional_data'][key]['status'] == 'REJECTED'){
            formData.audited['status'] = "REJECTED"
            flag = 1;
            break;
          }else if(audited['provisional_data'][key]['status'] == 'APPROVED'){
            approvedCounter++;
          }
        }
      }  
      if(!flag){
        formData.audited['status'] = approvedCounter == fileCounter ? 'APPROVED' : 'PENDING'
      }
    
      }else {
        formData.audited['status'] = formData['common'] ? formData['status'] : formData.audited['status']
      }
      if(unAuditedAns){
let flag = 0;
let approvedCounter = 0;
        let fileCounter = 0;
        for(let key in unAudited['provisional_data']){
          if(typeof unAudited['provisional_data'][key] == 'object' && unAudited['provisional_data'][key] != null ){
            fileCounter++;
            if(unAudited['provisional_data'][key]['status'] == 'REJECTED'){
              formData.unAudited['status'] = "REJECTED"
              flag = 1;
              break;
            }else if(unAudited['provisional_data'][key]['status'] == 'APPROVED'){
              approvedCounter++;
            }
          }
        }  
        if(!flag){
          formData.unAudited['status'] = approvedCounter == fileCounter ? 'APPROVED' : 'PENDING'
        }
        
      }else{
        formData.unAudited['status'] = formData['common'] ?  formData['status'] :formData.unAudited['status']
      }
    }
    if(formData.audited['status'] == "APPROVED" && formData.unAudited['status'] == "APPROVED" ){
      formData['status'] = "APPROVED"
    }else if(formData.audited['status'] == "PENDING" && formData.unAudited['status'] == "PENDING" ){
      formData['status'] = "PENDING"
    }else{
      formData['status'] = "REJECTED"
    }
    return formData;
    
    }


  module.exports.calculateTabStatus = (formData) => {
    let audited = formData["audited"];
    let unAudited = formData["unAudited"];
    let auditedAns = formData["audited"]["submit_annual_accounts"];
    let unAuditedAns = formData["unAudited"]["submit_annual_accounts"];
    let actionTakenByRole = formData["actionTakenByRole"];
    // if (actionTakenByRole == "ULB") {
    //   /* This is a condition to check if the status of audited and unaudited is rejected and approved
    //     respectively. If it is true, then the status of audited is set to pending. */
    //   if (
    //     formData.audited["status"] === "REJECTED" &&
    //     formData.unAudited["status"] === "APPROVED"
    //   ) {
    //     formData.audited["status"] = "PENDING";
    //   } else if (
    //     formData.audited["status"] === "APPROVED" &&
    //     formData.unAudited["status"] === "REJECTED"
    //   ) {
    //     formData.unAudited["status"] = "PENDING";
    //   } else if (
    //     formData.audited["status"] === "REJECTED" &&
    //     formData.unAudited["status"] === "REJECTED"
    //   ) {
    //     formData.unAudited["status"] = "PENDING";
    //     formData.audited["status"] = "PENDING";
    //   }
    // } else if (actionTakenByRole != "ULB") {
      if (auditedAns) {
        let flag = 0;
        let approvedCounter = 0;
        let fileCounter = 0;
        for (let key in audited["provisional_data"]) {
          if (
            typeof audited["provisional_data"][key] == "object" &&
            audited["provisional_data"][key] != null
          ) {
            fileCounter++;
            if (audited["provisional_data"][key]["status"] == "REJECTED") {
              formData.audited["status"] = "REJECTED";
              flag = 1;
              break;
            } else if (
              audited["provisional_data"][key]["status"] == "APPROVED"
            ) {
              approvedCounter++;
            }
          }
        }
        if (!flag) {
          formData.audited["status"] =
            approvedCounter == fileCounter ? "APPROVED" : "PENDING";
        }
      } else {
        formData.audited["status"] = formData["common"]
          ? formData["status"]
          : formData.audited["status"];
      }
      if (unAuditedAns) {
        let flag = 0;
        let approvedCounter = 0;
        let fileCounter = 0;
        for (let key in unAudited["provisional_data"]) {
          if (
            typeof unAudited["provisional_data"][key] == "object" &&
            unAudited["provisional_data"][key] != null
          ) {
            fileCounter++;
            if (unAudited["provisional_data"][key]["status"] == "REJECTED") {
              formData.unAudited["status"] = "REJECTED";
              flag = 1;
              break;
            } else if (
              unAudited["provisional_data"][key]["status"] == "APPROVED"
            ) {
              approvedCounter++;
            }
          }
        }
        if (!flag) {
          formData.unAudited["status"] =
            approvedCounter == fileCounter ? "APPROVED" : "PENDING";
        }
      } else {
        formData.unAudited["status"] = formData["common"]
          ? formData["status"]
          : formData.unAudited["status"];
      }
    // }

    return [formData["audited"]["status"], formData["unAudited"]["status"]];
  };