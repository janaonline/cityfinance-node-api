const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const {calculateStatus} = require('../CommonActionAPI/service');
const StatusList = require('../../util/newStatusList');
const StateFinanceCommission = require('../../models/StateFinanceCommissionFormation');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const DUR = require('../../models/UtilizationReport');
const PropertyTaxOp = require('../../models/PropertyTaxOp');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const SLB = require('../../models/XVFcGrantForm');
const State = require('../../models/State');
const ObjectId = require('mongoose').Types.ObjectId;
        
const ModelNames = {
    annualAcc: "AnnualAccountData",
    linkPFMS: "PFMSAccount",
    gtc: "GrantTransferCertificate",
    sfc: "StateFinanceCommissionFormation",
    pTAX: "PropertyTaxFloorRate",
    dur: "UtilizationReport",
    propTax:"PropTax",
    twentyEightSlbs: "TwentyEightSlbForm",
    odf: "OdfFormCollection",
    gfc: "GfcFormCollection",
    slb: "XVFcGrantULBForm",
    
}
const CUTOFF =  {
    STATE:{
        nmpc_untied: {
            
        },
        nmpc_tied : {
            
        },
        mpc_tied: {
        }
    },
    ULB:{
        nmpc_untied: {
            [ModelNames.annualAcc]: 25,
            linkPFMS: 100,
            
        },
        nmpc_tied : {
            [ModelNames.annualAcc]: 25,
            [ModelNames.linkPFMS]: 100,
            [ModelNames.dur]: 100,
        },
        mpc_tied: {
            [ModelNames.annualAcc]: 25,
            [ModelNames.linkPFMS]: 100,
            [ModelNames.dur]: 100,
            [ModelNames.twentyEightSlbs]: 100,
            [ModelNames.slb]:100,
            [ModelNames.odf]:100,
            [ModelNames.gfc]:100,
        }
    }
}

function getCollections(type, installment){
    let collections = [];
    let condition = `${type}_${installment}`;
    
    switch(condition){
        case "nmpc_untied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission];
            break;
        case "nmpc_untied_2":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission];
            break;
        case "nmpc_tied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR]
            break;
        case "nmpc_tied_2":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR];
            break;
        case "mpc_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR, 
                TwentyEightSlbsForm, OdfFormCollection, GfcFormCollection, SLB
            ]
            break;            
    }
    return collections;
}            

function getFormData(formCategory, modelName){
    let formData = {};
    if(formCategory === 'ULB'){
        formData["approvedColor"] = '#E67E1566';
        formData['submittedColor'] = '#E67E15';
        formData['border'] ='#E67E15';
    } else if( formCategory === 'STATE'){
        formData["approvedColor"] = '#059B05';
        formData['submittedColor'] = '#059B05';
        formData['border'] ='#059B05'
    }

    if(formCategory === 'ULB'){
        switch(modelName){
            case ModelNames.annualAcc:
                formData["formName"] = "Annual Accounts";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.linkPFMS:
                formData["formName"] = "Linking of PFMS Account";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.dur:
                formData["formName"] = "Detailed Utilisation Report";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.gtc:
                formData["formName"] = "Grant Transfer Certificate";
                formData['icon'] = '';
                formData['link'] = '';
                break;  
            case ModelNames.twentyEightSlbs:
                formData["formName"] = "28 SLBs";
                formData['icon'] = '';
                formData['link'] = '';
                break;      
            case ModelNames.slb:
                formData["formName"] = "SLBs for Water Supply and Sanitation";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.odf:
                formData["formName"] = "Open Defecation Free (ODF)";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.gfc:
                formData["formName"] = "Garbage Free City (GFC)";
                formData['icon'] = '';
                formData['link'] = '';
                break;
        }
    } else if(formCategory === "STATE"){
        switch(modelName){
            case ModelNames.sfc:
                formData["formName"] = "SFC Notification";
                formData['icon'] = '';
                formData['link'] = '';
                break;
            case ModelNames.pTAX:
                formData["formName"] = "Property Tax Floor Rate";
                formData['icon'] = '';
                formData['link'] = '';
                break;
        }
    }
    return formData;
}
function approvedForms(forms,formCategory){
    let numOfApprovedForms = 0;
    for(let i =0 ; i < forms.length; i++){
        let element = forms[i];
        if(!element){ 
            break;
        }
        let {status, actionTakenByRole: role, isDraft} = element
        switch(formCategory){
            case "ULB":
                if( (calculateStatus(status, role, isDraft, formCategory) === StatusList.Approved_By_MoHUA) ||
                    (calculateStatus(status, role, isDraft, formCategory) === StatusList.Under_Review_By_MoHUA)){
                    numOfApprovedForms++;
                }
                break;
            case "STATE":
                if((calculateStatus(status, role, isDraft, formCategory) === StatusList.Approved_By_MoHUA) ||
                    (calculateStatus(status, role, isDraft, formCategory) === StatusList.Under_Review_By_MoHUA)){
                    numOfApprovedForms++;
                }
                break;
        } 
    }
    return numOfApprovedForms;
}

function getQuery(modelName, designYear){
    let query = [];
    let condition = {};

    let submitConditionUlb = [{
        isDraft: false,
        actionTakenByRole: "ULB",
        status: "PENDING"
    },{
        isDraft: false,
        actionTakenByRole: "STATE",
        status: "APPROVED"
    },{
        isDraft: false,
        actionTakenByRole: "MoHUA",
        status:"APPROVED"
    }]

    let submitConditionState = [
        {
            isDraft: false,
            actionTakenByRole: "STATE",
            status: "PENDING", 
        },
        {
            isDraft: false,
            actionTakenByRole: "MoHUA",
            status: "APPROVED"
        }
    ]

    switch(modelName){
        case "AnnualAccountData":
            condition = {
                audited :{
                    submit_annual_accounts: true
                },
                unAudited: {
                    submit_annual_accounts: true
                },
                isDraft: false
            };
            query.push({
                $match: {
                    design_year: ObjectId(designYear),
                    $or:[...submitConditionUlb,condition]
                }
            });
            break;
        case "GrantTransferCertificate":

        case "PFMSAccount":
            condition = {
                linkPFMS:'Yes',
                isUlbLinkedWithPFMS: 'Yes',
                isDraft: false
            }
        case "TwentyEightSlbForm":
        case "GfcFormCollection":
        case "OdfFormCollection": 
        case "XVFcGrantULBForm":
            query.push({
                $match:{
                    design_year: ObjectId(designYear),
                    $or:[...submitConditionUlb]
            }
            });
            break;
        case "UtilizationReport":
            query.push({
                $match:{
                    designYear: ObjectId(designYear),
                    $or:[...submitConditionUlb]
            }
            });
            break;
        case "StateFinanceCommissionFormation":
        case "PropertyTaxFloorRate":
            query.push({
                $match:{
                    design_year: ObjectId(designYear),
                    $or:[...submitConditionState]
            }
            })  
            break;
    }
    return query;
}
module.exports.dashboard = async (req, res) => {
    try {
        let data = req.query;
        let user = req.decoded;
        const {_id:actionTakenBy, role: actionTakenByRole, state } = user;
        let stateResponseArray = [], ulbResponseArray = [];
        let collectionArr = getCollections(data.formType, data.installment);
    
        let approvedFormPercent = {} ,
            submittedFormPercent = {};
        let totalUlbPipeline = [
            {
                $match:{
                    _id: ObjectId(state)
                }
            },
            {
                $lookup:{
                    from: "ulbs",
                    localField: "_id",
                    foreignField: "state",
                    as: "ulb",
                }
            },
            {$unwind: "$ulb" },
            {
                $group:{
                    _id: null,
                    totalUlb: {$sum:1}
                }
            }
           
            ]
        const totalUlbs = await State.aggregate(totalUlbPipeline);
        let totalForms = totalUlbs[0]["totalUlb"];
        for(let i =0; i < collectionArr.length; i++){
            let stateResponse = {
                formName: '',
                approvedColor:'',
                submittedColor:'',
                submittedValue:0,
                approvedValue: 0,
                cutOff: ``,
                icon:'',
                link:'',
                border:'',
                status:''
            };
            let ulbResponse = {
                formName: '',
                approvedColor:'',
                submittedColor:'',
                submittedValue:0,
                approvedValue: 0,
                cutOff: ``,
                icon: '',
                link: '',
                border:'',
                status:''
            };
            let collection = collectionArr[i];
            let formCategory = "";
            let submitPercent = 0;
            let cutOff = 0;
            let totalApprovedForm = 0;
            let modelName = collection.collection.modelName;
            //Get pipeline query, using modelName
            let pipeline = getQuery(modelName, data.design_year);
            //Get submitted forms 
            let submittedForms = await collection.aggregate(pipeline);
            submitPercent = Math.round((submittedForms.length/totalForms)*100);
            submittedFormPercent[modelName] = submitPercent;

            if(modelName !== ModelNames.pTAX && modelName !== ModelNames.sfc){
                formCategory = "ULB";
            } else {
                formCategory = "STATE";
            }
            //Get Approved forms percent
            totalApprovedForm = approvedForms(submittedForms, formCategory);
            approvedFormPercent[modelName] = Math.round((totalApprovedForm/totalForms)*100)

            let formData = getFormData(formCategory, modelName);
            //Adding status to formData
            if(submittedFormPercent[modelName] <= 0){
                formData.status = "Not started"
            } else if (approvedFormPercent === 100){
                formData.status = "Completed"
            } else {
                formData.status = "In Progress"
            }
            if(!(CUTOFF[formCategory][data.formType][modelName])){
                cutOff = "NA"
            } else {
                cutOff = CUTOFF[formCategory][data.formType][modelName]
            }
            if(formCategory === "ULB"){
                ulbResponse = {
                    formName: formData.formName,
                    approvedColor:formData.approvedColor,
                    submittedColor: formData.submittedColor,
                    submittedValue: submittedFormPercent[modelName],
                    approvedValue: approvedFormPercent[modelName],
                    cutOff,
                    icon: '',
                    link: '',
                    border:formData.border,
                    status:formData.status
                };
                ulbResponseArray.push(ulbResponse);
            } else if( formCategory === "STATE") {
                stateResponse = {
                    formName: formData.formName,
                    approvedColor: formData.approvedColor,
                    submittedColor: formData.submittedColor,
                    submittedValue: submittedFormPercent[modelName],
                    approvedValue: approvedFormPercent[modelName],
                    cutOff,
                    icon:'',
                    link:'',
                    border: formData.border,
                    status: formData.status
                };
                stateResponseArray.push(stateResponse);
            }
        };
        return res. status(200).json({
            status: true,
            data: [{
                formHeader:'ULB Forms',
                approvedColor:'#E67E15',
                submittedColor:'#E67E1566',
                formData: ulbResponseArray
            },
            {
                formHeader:'State Forms',
                approvedColor:'#059B05',
                submittedColor:'#E67E1566',
                formData : stateResponseArray
            }],
            approvedFormPercent,
            submittedFormPercent
        })

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }

}