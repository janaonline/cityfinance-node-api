const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const PropertyTaxOp = require('../../models/PropertyTaxOp');

const StatusList = require('../../util/newStatusList')
const catchAsync = require('../../util/catchAsync')
const ObjectId = require("mongoose").Types.ObjectId;
const Sidemenu = require('../../models/Sidemenu');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const StateFinanceCommissionFormation = require('../../models/StateFinanceCommissionFormation');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const {FormNames} = require('../../util/FormNames');
const {calculateTabwiseStatus} = require('../annual-accounts/utilFunc')
module.exports.calculateStatus = (status, actionTakenByRole, isDraft, formType) => {
    switch(formType){
        case "ULB":
            switch (true) {
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && isDraft:
                    return StatusList.In_Progress
                    break;
                case (status == 'PENDING' || !status || 'N/A') && actionTakenByRole == 'ULB' && !isDraft:
                    return StatusList.Under_Review_By_State
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Rejected_By_State
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;
        
                default:
                    return StatusList.Not_Started
                    break;
            }
            break;
        case "STATE":
            switch (true) {
                case status == 'PENDING' && actionTakenByRole == 'STATE' && isDraft:
                    return StatusList.In_Progress
                    break;
                case status == 'PENDING' && actionTakenByRole == 'STATE' && !isDraft:
                    return StatusList.Under_Review_By_MoHUA
                    break;
                case status == 'APPROVED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Approved_By_MoHUA
                    break;
                case status == 'REJECTED' && actionTakenByRole == 'MoHUA' && !isDraft:
                    return StatusList.Rejected_By_MoHUA
                    break;
                
                default:
                    return StatusList.Not_Started
                    break;
            }
            break;      
    }
}

module.exports.canTakenAction = (status, actionTakenByRole, isDraft, formType, loggedInUser) => {
    switch (formType) {
        case "ULB":
           if(loggedInUser == "STATE"){
                if(actionTakenByRole == "ULB" && !isDraft){
                    return true;
                }else{
                    
                } }   else if(loggedInUser == "MoHUA"){
                    if(actionTakenByRole == "STATE" && status =="APPROVED" && !isDraft){
                        return true
                    }else{
                        return false;
                    }
                }else{
                    return false;
                }
            
            
            break;
    
            case "STATE":
                if(loggedInUser =="MoHUA"){
                    if(actionTakenByRole=="STATE" && !isDraft){
                        return true;
                    }else{
                        return false;
                    }
                }else{
                    return false;
                }
            
                break;
        
        default:
            break;
    }
   
}

module.exports.calculateKeys = (formStatus, formType) => {
    let keys = {
        [`formData.status`]:"",
        [`formData.actionTakenByRole`]:"",
        [`formData.isDraft`]: ""
    };
    switch(formType){
        case "ULB":
            switch(formStatus){
                case StatusList.In_Progress:
                    keys = {

                        [`formData.status`]: "PENDING",
                        [`formData.actionTakenByRole`]:"ULB",
                        [`formData.isDraft`]: true
                    }
                    break;
                case StatusList.Under_Review_By_State:
                    keys = {
                        [`formData.status`]:"PENDING",
                        [`formData.actionTakenByRole`]:"ULB",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Under_Review_By_MoHUA:
                    keys = {
                        [`formData.status`]:"APPROVED",
                        [`formData.actionTakenByRole`]:"STATE",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Rejected_By_State:
                    keys = {
                        [`formData.status`]:"REJECTED",
                        [`formData.actionTakenByRole`]:"STATE",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Approved_By_MoHUA:
                    keys = {
                        [`formData.status`]:"APPROVED",
                        [`formData.actionTakenByRole`]:"MoHUA",
                        [`formData.isDraft`]: false
                    }
                    break;
                case StatusList.Rejected_By_MoHUA:
                    keys = {
                        [`formData.status`]:"REJECTED",
                        [`formData.actionTakenByRole`]:"MoHUA",
                        [`formData.isDraft`]: false
                    }
                    break;
                default:  
                    break;
            }
            break;
        case "STATE":
            switch(formStatus){
                case StatusList.In_Progress:
                    keys = {
                        [`formData.isDraft`]:true,
                        [`formData.actionTakenByRole`]:"STATE",
                        [`formData.status`]: "PENDING"
                    }
                    break;
                case StatusList.Under_Review_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]:false,
                        [`formData.actionTakenByRole`]:"STATE",
                        [`formData.status`]: "PENDING"
                    }
                    break;
                case StatusList.Approved_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]:false,
                        [`formData.actionTakenByRole`]:"MoHUA",
                        [`formData.status`]: "APPROVED"
                    }
                    break;
                case StatusList.Rejected_By_MoHUA:
                    keys = {
                        [`formData.isDraft`]:false,
                        [`formData.actionTakenByRole`]:"MoHUA",
                        [`formData.status`]: "REJECTED"
                    }
                    break;
                default:  
                    break;
            }
            break;    
        }
        return keys;
}

function getCollectionName(formName){
    let collection="";
    switch(formName){
        case "Grant Transfer Certificate":
            collection = GrantTransferCertificate;
            break;
        case "Detailed Utilisation Report":
            collection = UtilizationReport;
            break;
        case "Annual Accounts":
            collection = AnnualAccounts;
            break;
        case "Linking of PFMS Account":
            collection = LinkPFMS;
            break;
        case "Property Tax Operationalisation":
            collection = PropertyTaxOp;
            break;
        case "SLBs for Water Supply and Sanitation":
            collection = XVFcGrantForm;
            break;
        case "Open Defecation Free (ODF)":
            collection = OdfFormCollection;
            break;
        case "Garbage Free City (GFC)":
            collection = GfcFormCollection;
            break;
        case "28 SLBs":
            collection = TwentyEightSlbsForm;
            break;
        case "Property tax floor rate Notification":
            collection = PropertyTaxFloorRate;
            break;
        case "State Finance Commission Notification":
            collection =  StateFinanceCommissionFormation;
            break;
    }
    return collection;
}

module.exports.getForms = async (req, res)=>{
    try {
        const data = req.body;
        const masterForm = await Sidemenu.findOne({_id: data.formId});
        const collection = getCollectionName(masterForm.name);
        let condition = {};
        if (collection === UtilizationReport ){
            condition.design_year = "designYear"
        } else {
            condition.design_year = "design_year"
        }
        let forms;
        if(masterForm.role === "ULB"){
            forms = await collection.find(
                {ulb :{$in : data.ulb}, [condition.design_year]: data.design_year},
                {history:0}
                )

        } else if( masterForm.role === "STATE"){
            forms = await collection.find(
                {state :{$in : data.state}, [condition.design_year]: data.design_year},
                {history:0}
                )

        }
        if(!forms || forms.length === 0){
            return res.status(400).json({
                status: false,
                message: 'Form not found.'
            })
        }
        return res.status(200).json({
            status: true,
            message: 'Success',
            data: forms
        }) 
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.updateForm = async (req, res) =>{
    try {
        const data = req.body;
        const user = req.decoded;
        
        let ulb="", state = "", stateData ="";
        let singleForm; //to return updated response for single ulb
        const masterForm = await Sidemenu.findOne({_id: ObjectId(data.formId)}).lean();
        if(user.role != 'ULB' && user.role != 'STATE' && user.role != 'MoHUA'){
          return  res.status(403).json({
                success: false,
                message:"Not AUthorized to perform this action"
            })
        }
        if(!masterForm){
            return res.status(400).json({
                status: false,
                message: "Form not found"
            })
        }
        const formType = masterForm.role;
        
        const collection = getCollectionName(masterForm.name);
        const formData = {};
        const { role: actionTakenByRole, _id: actionTakenBy } = user;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = actionTakenBy;
        formData['status'] = data.status;
        
        //Check if role is other than STATE or MoHUA
        if(actionTakenByRole !== "STATE" && actionTakenByRole !== "MoHUA"){
            return res.status(401).json({
                status: false,
                message: "Not authorized"
            })
        }
        //add reject reason and response file based on role
    //    if(masterForm.name != FormNames.annualAcc ){
        if(actionTakenByRole === "STATE"){
            formData['rejectReason_state'] = data.rejectReason;
            formData['responseFile_state'] = data.responseFile;
            // formData['responseFile']['url'] = data.responseFile.url;
        }else if (actionTakenByRole === "MoHUA"){
            formData['rejectReason_mohua'] = data.rejectReason;
            formData['responseFile_mohua'] = data.responseFile;     
        }
    //    }
        
        let condition = {};
        if (collection === UtilizationReport ){
            condition.design_year = "designYear"
        } else {
            condition.design_year = "design_year"
        }
        let forms = "";
        if (formType === "STATE") {
          forms = await collection
            .find({
              state: { $in: data.state },
              [condition.design_year]: data.design_year,
            })
            .lean();
        } else if (formType === "ULB") {
          forms = await collection
            .find({
              ulb: { $in: data.ulb },
              [condition.design_year]: data.design_year,
            })
            .lean();
        }
        let form={}, numberOfFormsUpdated=0;
        if(formType === "ULB"){
            for(let i=0; i < data.ulb.length; i++){//update status and add history
                ulb = data.ulb[i];
                form = forms[i];
                if(form === undefined) continue;
                form['actionTakenByRole'] = formData.actionTakenByRole;
                form['actionTakenBy'] = formData.actionTakenBy;
                form['status'] = formData.status;
                form['modifiedAt'] = new Date();
                form['rejectReason'] = data.rejectReason
                form['responseFile'] =   data.responseFile
                if(masterForm.name == "Annual Accounts"){
     
                    form['common'] = true
                    for(let key in form.audited.provisional_data){
                        if(typeof form.audited.provisional_data[key] == 'object' && form.audited.provisional_data[key] != null){
                            if(form.audited.provisional_data[key]){
                                if(actionTakenByRole === "STATE"){
                                    form.audited.provisional_data[key]['status'] = formData.status
                                    form.audited.provisional_data[key]['rejectReason_state'] = formData.rejectReason_state
                                    form.audited.provisional_data[key]['responseFile_state'] = formData.responseFile_state
                                }
                                else if(actionTakenByRole === "MoHUA"){
                                    form.audited.provisional_data[key]['status'] = formData.status
                                    form.audited.provisional_data[key]['rejectReason_mohua'] = formData.rejectReason_mohua
                                    form.audited.provisional_data[key]['responseFile_mohua'] = formData.responseFile_mohua
                                }
                            }
                        }
                        
    
                    }
                    for(let key in form.unAudited.provisional_data){
                        if(typeof form.unAudited.provisional_data[key] == 'object' && form.audited.provisional_data[key] != null){
                            if(form.unAudited.provisional_data[key]){
                                if(actionTakenByRole === "STATE"){
                                    form.unAudited.provisional_data[key]['status'] = formData.status
                                    form.unAudited.provisional_data[key]['rejectReason_state'] = formData.rejectReason_state
                                    form.unAudited.provisional_data[key]['responseFile_state'] = formData.responseFile_state
                                }else if(actionTakenByRole === "MoHUA"){
                                    form.unAudited.provisional_data[key]['status'] = formData.status
                                    form.unAudited.provisional_data[key]['rejectReason_mohua'] = formData.rejectReason_mohua
                                    form.unAudited.provisional_data[key]['responseFile_mohua'] = formData.responseFile_mohua
                                }
                            }
                        }
                    }
                    if(form.audited){
                        if(actionTakenByRole === "STATE"){
                            form.audited['status'] = formData.status
                            form.audited['rejectReason_state'] = formData.rejectReason_state
                            form.audited['responseFile_state'] = formData.responseFile_state
                        }else if(actionTakenByRole === "MoHUA"){
                            form.audited['status'] = formData.status
                            form.audited['rejectReason_mohua'] = formData.rejectReason_mohua
                            form.audited['responseFile_mohua'] = formData.responseFile_mohua
                        }
                    }
                    if(form.unAudited){
                        if(actionTakenByRole === "STATE"){
                            form.unAudited['status'] = formData.status
                            form.unAudited['rejectReason_state'] = formData.rejectReason_state
                            form.unAudited['responseFile_state'] = formData.responseFile_state
                        }else if(actionTakenByRole === "MoHUA"){
                            form.unAudited['status'] = formData.status
                            form.unAudited['rejectReason_mohua'] = formData.rejectReason_mohua
                            form.unAudited['responseFile_mohua'] = formData.responseFile_mohua
                        }
                    }
                    form = calculateTabwiseStatus(form)
                    
                }
                //add reject reason/responseFile for single ulb entry
                if(masterForm.name != "Annual Accounts" ){
                if(actionTakenByRole === 'STATE'){
                    form['rejectReason_state'] = data.rejectReason;
                    form['responseFile_state'] = data.responseFile;
                }else if (actionTakenByRole === 'MoHUA'){
                    form['rejectReason_mohua'] = data.rejectReason;
                    form['responseFile_mohua'] = data.responseFile;
                }
            }
                delete form['history'] ;
                let formHistory = JSON.parse(JSON.stringify(form))
                delete form["_id"];
                delete form['ulb'];
                delete form['design_year'];
                let updatedForm = await collection.findOneAndUpdate(
                    {ulb , [condition.design_year]: data.design_year},
                    {$set: form, $push: {history: formHistory }},
                    {new: true, runValidators: true}
                    );
                numberOfFormsUpdated++;
                singleForm = updatedForm;
            }
        }else if( formType === "STATE"){
            if(masterForm.name === FormNames.gtc){
                if (data.statesData.length > 0) {
                  form = findTarget(data.statesData[0], forms);
                  stateData = data.statesData[0];

                  form["actionTakenByRole"] = formData.actionTakenByRole;
                  form["actionTakenBy"] = formData.actionTakenBy;
                  form["modifiedAt"] = new Date();
                  form["status"] = formData["status"];

                  //add reject reason/responseFile for single state entry
                  if (actionTakenByRole === "MoHUA") {
                    form["rejectReason_mohua"] = data["rejectReason"];
                    form["responseFile_mohua"] = data["responseFile"];
                    formData['rejectReason_mohua'] = data["rejectReason"]
                  }
                  delete form["history"];
                  let updatedForm = await collection
                    .findOneAndUpdate(
                      stateData,
                      { $set: formData, $push: { history: form } },
                      { new: true, runValidators: true }
                    )
                    .lean();
                  numberOfFormsUpdated++;
                  singleForm = updatedForm;
                } else if (data.statesData.length === 0) {
                  for (let i = 0; i < data.state.length; i++) {
                          
                          state = data.state[i];
                          let stateForms = findForm(forms,state);
                          for(let j =0 ; j< stateForms.length; j++){
                                form = stateForms[j];
                              if (form === undefined || form.actionTakenByRole === "MoHUA"){
                                continue;
                              }
                              
                              form["actionTakenByRole"] = formData.actionTakenByRole;
                              form["actionTakenBy"] = formData.actionTakenBy;
                              form["status"] = formData.status;
                              form["modifiedAt"] = new Date();
          
                              //add reject reason/responseFile for single ulb entry
                              if (actionTakenByRole === "MoHUA") {
                                form["rejectReason_mohua"] = data["rejectReason"];
                                form["responseFile_mohua"] = data.responseFile;
                                formData['rejectReason_mohua'] = data["rejectReason"]
                              }
                              delete form["history"];
                              let updatedForm = await collection.findOneAndUpdate(
                                { state, [condition.design_year]: data.design_year,
                                    type: form.type,
                                    installment: form.installment,
                                    year: form.year
                                 },
                                { $set: formData, $push: { history: form } },
                                { new: true, runValidators: true }
                              );
                              numberOfFormsUpdated++;
                              singleForm = updatedForm;
                        
                          }
                  }
                }
            } else {
                for(let i=0; i < data.state.length; i++){//update status and add history
                    state = data.state[i];
                    form = forms[i];
                    if(form === undefined) continue;
                    form['actionTakenByRole'] = formData.actionTakenByRole;
                    form['actionTakenBy'] = formData.actionTakenBy;
                    form['status'] = formData.status;
                    form['modifiedAt'] = new Date();
                    
                    //add reject reason/responseFile for single ulb entry
                    if (actionTakenByRole === 'MoHUA'){
                        form['rejectReason_mohua'] = data.rejectReason;
                        form['responseFile_mohua'] = data.responseFile;
                    }
                    delete form['history'];
                    let updatedForm = await collection.findOneAndUpdate(
                        {state , [condition.design_year]: data.design_year},
                        {$set: form, $push: {history: form }},
                        {new: true, runValidators: true}
                        );
                    numberOfFormsUpdated++;
                    singleForm = updatedForm;
                }
            }
        }
        if(numberOfFormsUpdated === 1 ){
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} form ${data.status ?? "updated."}`,
                data: singleForm

            });
        } else if(numberOfFormsUpdated>1){
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} forms ${data.status ?? "updated."}`,
            })
        } else {
            return res.status(200).json({
                status: false,
                message: "No forms updated"
            })
        }
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.annualaccount = catchAsync(async (req,res)=>{
    const data = req.body;
    const user = req.decoded;
    let ulb="";
    let singleUlb; //to return updated response for single ulb
    const masterForm = await Sidemenu.findOne({_id: ObjectId(data.formId)}).lean();
    if(user.role != 'ULB' && user.role != 'STATE' && user.role != 'MoHUA'){
      return  res.status(403).json({
            success: false,
            message:"Not AUthorized to perform this action"
        })
    }

    if(!masterForm){
        return res.status(400).json({
            status: false,
            message: "Form not found"
        })
    }
    
    const collection = getCollectionName(masterForm.name);
    const formData = {};
    const { role: actionTakenByRole, _id: actionTakenBy } = user;
    formData['actionTakenByRole'] = actionTakenByRole;
    formData['actionTakenBy'] = actionTakenBy;
    formData['status'] = data.status;
    
    //Check if role is other than STATE or MoHUA
    if(actionTakenByRole !== "STATE" && actionTakenByRole !== "MoHUA"){
        return res.status(401).json({
            status: false,
            message: "Not authorized"
        })
    }
    //add reject reason and response file based on role
    // if(actionTakenByRole === "STATE"){
    //     formData['rejectReason_state'] = data.rejectReason;
    //     formData['responseFile_state'] = data.responseFile;
    //     // formData['responseFile']['url'] = data.responseFile.url;
    // }else if (actionTakenByRole === "MoHUA"){
    //     formData['rejectReason_mohua'] = data.rejectReason;
    //     formData['responseFile_mohua'] = data.responseFile;     
    // }
    let condition = {};
    const forms = await collection.find({ulb :{$in : data.ulb}, [condition.design_year]: data.design_year}).lean();
    let form={}, numberOfFormsUpdated=0;
    for(let i=0; i < data.ulb.length; i++){
        ulb = data.ulb[i];
        form = forms[i];
        if(form === undefined) continue;
        form['actionTakenByRole'] = formData.actionTakenByRole;
        form['actionTakenBy'] = formData.actionTakenBy;
        form['status'] = formData.status;
        form['modifiedAt'] = new Date();
        form['history'] = undefined;
        let updatedForm = await collection.findOneAndUpdate(
            {ulb , [condition.design_year]: data.design_year},
            {$set: formData, $push: {history: form }},
            {new: true, runValidators: true}
            );
        numberOfFormsUpdated++;
        singleUlb = updatedForm;
    }//update status and add history

})


function findTarget(target, arr){
    let obj ="";
    let targetArr = arr.filter((element) => {
        let form = {
            state: element.state,
            design_year: element.design_year,
            type: element.type,
            installment: element.installment,
            year: element.year
        }
        let targetObj = {
            state: target.state,
            design_year: target.design_year,
            type: target.type,
            installment: target.installment,
            year: target.year
        }
        if(JSON.stringify(form) === JSON.stringify(targetObj)){
            return element;
        }
    })
    if(targetArr.length === 1){
        obj = targetArr[0];
    }
    return obj;
}


function findForm(formArray, stateId){
   let forms = formArray.filter((element)=>{
        return element.state.toString() === stateId.toString()
    })
    return forms;
}

// db.getCollection('ulbs').aggregate([
//     {
//         $lookup: {
//             from: "states",
//             localField: "state",
//             foreignField: "_id",
//             as: "state"
//         }
//   },
//   {$unwind : "$state"},
//   {
//       $lookup: {
//             from: "annualaccountdatas",
//             localField: "_id",
//             foreignField: "ulb",
//             as: "annualaccountdata",
            
//         }  
//   },
// ])