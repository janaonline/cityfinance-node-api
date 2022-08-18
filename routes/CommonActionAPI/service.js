const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const FormsMaster = require('../../models/FormsMaster');
const StatusList = require('../../util/newStatusList')

const ObjectId = require("mongoose").Types.ObjectId;
const Sidemenu = require('../../models/Sidemenu');

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

function getCollectionName(formName){
    let collection="";
    switch(formName){
        case "Grant Transfer Certificate":
            collection ="GTC";
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
        // case "Property Tax Operationalisation":
        //     collection = "PTO";
        //     break;
        case "SLBs for Water Supply and Sanitation":
            collection = XVFcGrantForm;
            break;
        case "Open Defecation Free (ODF)":
            collection = OdfFormCollection;
            break;
        case "Garbage Free City (GFC)":
            collection = GfcFormCollection;
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
        const forms = await collection.find(
            {ulb :{$in : data.ulb}, [condition.design_year]: data.design_year},
            {history:0}
            )
        if(!forms){
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
        let ulb="";
        let singleUlb; //to return updated response for single ulb
        const masterForm = await Sidemenu.findOne({_id: ObjectId(data.formId)});
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
        if(data.ulb.length === 1 ){//add reject reason and response file based on role
            if(actionTakenByRole === "STATE"){
                formData['rejectReason_state'] = data.rejectReason;
                formData['responseFile_state'] = data.responseFile;
                // formData['responseFile']['url'] = data.responseFile.url;
            }else if (actionTakenByRole === "MoHUA"){
                formData['rejectReason_mohua'] = data.rejectReason;
                formData['responseFile_mohua'] = data.responseFile;     
            }
        }
        let condition = {};
        if (collection === UtilizationReport ){
            condition.design_year = "designYear"
        } else {
            condition.design_year = "design_year"
        }
        const forms = await collection.find({ulb :{$in : data.ulb}, [condition.design_year]: data.design_year}).lean();
        let form={}, numberOfFormsUpdated=0;
        for(let i=0; i < data.ulb.length; i++){//update status and add history
            ulb = data.ulb[i];
            form = forms[i];
            if(form === undefined) break;
            form['actionTakenByRole'] = formData.actionTakenByRole;
            form['actionTakenBy'] = formData.actionTakenBy;
            form['status'] = formData.status;
            form['modifiedAt'] = new Date();
            if(data.ulb.length === 1){//add reject reason/responseFile for single ulb entry
                if(actionTakenByRole === 'STATE'){
                    form['rejectReason_state'] = data.rejectReason;
                    form['responseFile_state'] = data.responseFile;
                }else if (actionTakenByRole === 'MoHUA'){
                    form['rejectReason_mohua'] = data.rejectReason;
                    form['responseFile_mohua'] = data.responseFile;
                }
            }
            form['history'] = undefined;
            let updatedForm = await collection.findOneAndUpdate(
                {ulb , [condition.design_year]: data.design_year},
                {$set: formData, $push: {history: form }},
                {new: true, runValidators: true}
                );
            numberOfFormsUpdated++;
            singleUlb = updatedForm;
        }
        if(numberOfFormsUpdated === 1){
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} form ${data.status}`,
                data: singleUlb

            });
        } else if(numberOfFormsUpdated>1){
            return res.status(200).json({
                status: true,
                message: `${numberOfFormsUpdated} forms ${data.status}`,
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
