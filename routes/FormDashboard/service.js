const AnnualAccounts = require('../../models/AnnualAccounts');
const LinkPFMS = require('../../models/LinkPFMS');
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const {calculateStatus} = require('../CommonActionAPI/service');
const StatusList = require('../../util/newStatusList');
const StateFinanceCommission = require('../../models/StateFinanceCommissionFormation');
const PropertyTaxFloorRate = require('../../models/PropertyTaxFloorRate');
const DUR = require('../../models/UtilizationReport');
const PropTax = require('../../models/PropertyTaxOp');
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const OdfFormCollection = require('../../models/OdfFormCollection');
const GfcFormCollection = require('../../models/GfcFormCollection');
const SLB = require('../../models/XVFcGrantForm');
const ObjectId = require('mongoose').Types.ObjectId;

const CollectionNames = {
    annualAcc: "AnnualAccounts",
    linkPFMS: "LinkPFMS",
    gtc: "GrantTransferCertificate",
    sfc: "StateFinanceCommissionFormation",
    pTAX: "PropertyTaxFloorRate",
    dur: "DUR",
    propTax:"PropTax",
    twentyEightSlbs: "TwentyEightSlbsForm",
    odf: "OdfFormCollection",
    gfc: "GfcFormCollection",
    slb: "SLB"
}
const CUTOFF =  {
    STATE:{
        nmpc_untied: {
            
        },
        nmpc_tied : {
            
        },
        mpc_tied: {
            scoring: 100
        }
    },
    ULB:{
        nmpc_untied: {
            annualAccount: 25,
            linkPFMS: 100,
            
        },
        nmpc_tied : {
            annualAccount: 25,
            linkPFMS: 100,
            dur: 100,
            pTax: 100
        },
        mpc_tied: {
            annualAccount: 25,
            linkPFMS: 100,
            dur: 100,
            pTax: 100,
            twentyEightSlbs: 100,
            slb:100,
            odf:100,
            gfc:100,

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
                PropertyTaxFloorRate,StateFinanceCommission, DUR, PropTax];
            break;
        case "mpc_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR, PropTax, 
                TwentyEightSlbsForm, OdfFormCollection, GfcFormCollection, SLB
            ]
            break;
                    
    }
    return collections;
}

function approvedForms(forms,formCategory){
    let numOfApprovedForms = 0;
    forms.forEach((element) => {
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
    })
    
    return numOfApprovedForms;
}

function getQuery(collection, designYear){
    let query = {}
    let submitCondition = {
        isDraft:false,
        actionTakenByRole:{$ne:"ULB"},
        status: {$ne:"REJECTED"}
    };

    switch(collection){
        case "AnnualAccountData":
            query["$match"] = {
                design_year: ObjectId(designYear),
                $or:[submitCondition]
            }  
            break;
        case "LinkPFMS":
            query["$match"] = {
                design_year: ObjectId(designYear),
                $or: [submitCondition]

            }
            break;
        case "GrantTransferCertificate":

            break;
        case "GfcFormCollection":
            break;
        case "OdfFormCollection":
            break;
        case "StateFinanceCommissionFormation":
            break;
        case "UtilizationReport":
            break;
        case "TwentyEightSlbForm":
            break;
        case "XVFcGrantULBForm":
            break;
        case "PropertyTaxFloorRate":
            break;
        
    }
    return query;
}
module.exports.dashboard = async (req, res) => {
    try {
        
        let data = req.query;
        let user = req.decoded;
        const {_id:actionTakenBy, role: actionTakenByRole} = user;
        
        let outputResponse = [
            {
              formHeader:'ULB Forms',
              approvedColor:'#E67E15',
              submittedColor:'#E67E1566',
              formData :[{
                 formName: 'Annual Account Upload',
                 approvedColor:'#E67E1566',
                 submittedColor:'#E67E15',
                 submittedValue:0,
                 approvedValue: 0,
                 cutOff: `${CUTOFF[actionTakenByRole][data.formType]}`,
                 icon: '',
                 link: '',
                 border:'#E67E15',
                 status:'Not Started'
              },
              {
                formName: 'PFMS Linkage',
                approvedColor:'#E67E1566',
                submittedColor:'#E67E15',
                submittedValue:40,
                approvedValue: 30,
                cutOff:`${CUTOFF[actionTakenByRole][data.formType]}` ,
                icon:'',
                link:'',
                border:'#E67E15',
                status:'Not Started'
              }]
            },
            {
              formHeader:'State Forms',
              approvedColor:'#059B05',
              submittedColor:'#E67E1566',
              formData :[{
                formName: 'SFC Notification',
                approvedColor:'#059B05',
                submittedColor:'#059B05',
                submittedValue:100,
                approvedValue: 0,
                cutOff: `${CUTOFF[actionTakenByRole][data.formType]}`,
                icon:'',
                link:'',
                border:'#059B05',
                status:'Approved'
             },
             {
               formName: 'Property Tax',
               approvedColor:'#059B05',
               submittedColor:'#059B05',
               submittedValue:100,
               approvedValue: 0,
               cutOff: `${CUTOFF[actionTakenByRole][data.formType]}`,
               icon:'',
               link:'',
               border:'#059B05',
               status:'Approved'
             }]
            }
          ] 
    
        let collectionArr = getCollections(data.formType, data.installment);
    
        let numOfApprovedForms = {} ,
            numOfSubmittedForms = {};
        collectionArr.forEach(async (collection) => {
            let formCategory = "";
            let collectionName = collection.collection.modelName;
            let pipeline = getQuery(collectionName, data.design_year);
            pipeline2 = {
                $match:{
                design_year: ObjectId("606aafb14dff55e6c075d3ae"),
                $or:[
                {
                    isDraft:false,
                    actionTakenByRole:{$ne:"ULB"},
                    status: {$ne:"REJECTED"}
                }]
            }
            }
            let submittedForms = await collection.aggregate([pipeline2]);
            numOfSubmittedForms[collectionName] = submittedForms.length;

            if(collectionName !== CollectionNames.gtc && collectionName !== CollectionNames.sfc && 
                collectionName !== CollectionNames.pTax){
                formCategory = "ULB";
            } else {
                formCategory = "STATE"
            }
            numOfApprovedForms[collectionName] = approvedForms(submittedForms, formCategory);
        });

        return res. status(200).json({
            status: true,
            
            numOfApprovedForms,
            numOfSubmittedForms
        })

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }

}