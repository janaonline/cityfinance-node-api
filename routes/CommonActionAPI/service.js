const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const UtilizationReport = require('../../models/UtilizationReport');
const XVFcGrantForm = require('../../models/XVFcGrantForm');
const FormsMaster = require('../../models/FormsMaster');
const StatusList = require('../../util/newStatusList')
// debugger

module.exports.calculateStatus = (status, actionTakenByRole, isDraft) => {
    switch (true) {
        case status == 'PENDING' && actionTakenByRole == 'ULB' && isDraft:
            return StatusList.In_Progress
            break;
        case status == 'PENDING' && actionTakenByRole == 'ULB' && !isDraft:
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
        const masterForm = await FormsMaster.findOne({_id: data.formId});
        const collection = getCollectionName(masterForm.name);
        const forms = await collection.find({ulb :{$in : data.ulb}, design_year: data.design_year})
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
            message: 'Failed'
        })
    }
}

module.exports.updateForm = async (req, res) =>{
    try {
        const data = req.body;
        const user = req.decoded;
        let ulb="";
        const masterForm = await FormsMaster.findOne({_id: data.formId});
        const collection = getCollectionName(masterForm.name);
        const formData = {};
        const { role: actionTakenByRole, _id: actionTakenBy } = user;
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['actionTakenBy'] = actionTakenBy;
        formData['status'] = data.status;
        
        const forms = await collection.find({ulb :{$in : data.ulb}, design_year: data.design_year})
        let form={}, numberOfFormsUpdated=0;
        for(let i=0; i < data.ulb.length; i++){
            ulb = data.ulb[i];
            form = forms[i];
            if(form === undefined) break;
            form['actionTakenByRole'] = formData.actionTakenByRole;
            form['actionTakenBy'] = formData.actionTakenBy;
            form['status'] = formData.status;
            form['modifiedAt'] = new Date();
         
            form['history'] = undefined;
            let updatedForm = await collection.findOneAndUpdate(
                {ulb , design_year: data.design_year},
                {$set: formData, $push: {history: form }}
            );
            numberOfFormsUpdated++;
        }
        return res.status(200).json({
            status: true,
            data: `${numberOfFormsUpdated} forms ${data.status}`
        });
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            status: false,
            message: "failed."
        })
    }
}
