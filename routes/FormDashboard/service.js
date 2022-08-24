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
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require('mongoose').Types.ObjectId;
const {ModelNames} = require('../../util/15thFCstatus')

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

const FormObjectIds = {
    [ModelNames.annualAcc]: ObjectId("62aa1b04729673217e5ca3aa"),
    [ModelNames.gtc]: ObjectId("62aa1bbec9a98b2254632a86"),
    [ModelNames.dur]: ObjectId("62aa1c96c9a98b2254632a8a"),
    [ModelNames.linkPFMS]: ObjectId("62aa1cc9c9a98b2254632a8e"),
    [ModelNames.slb]: ObjectId("62aa1d4fc9a98b2254632a96"),
    [ModelNames.odf]: ObjectId("62aa1d6ec9a98b2254632a9a"),
    [ModelNames.gfc]: ObjectId("62aa1d82c9a98b2254632a9e"),
    [ModelNames.sfc]: ObjectId("62c553822954384b44b3c38e"),
    [ModelNames.pTAX]: ObjectId("62c5534e2954384b44b3c38a"),
    [ModelNames.twentyEightSlbs]: ObjectId("62f0dbbf596298da6d3f4076")
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
        case "mpc_tied_1":
            collections = [AnnualAccounts, LinkPFMS, GrantTransferCertificate, 
                PropertyTaxFloorRate,StateFinanceCommission, DUR, 
                TwentyEightSlbsForm, OdfFormCollection, GfcFormCollection, SLB
            ]
            break;            
    }
    return collections;
}            

function getFormData(formCategory, modelName, sidemenuForms, reviewForm){
    let formData = {};
    if(formCategory === 'ULB'){
        formData["approvedColor"] = '#E67E15';
        formData['submittedColor'] = '#E67E1566';
        formData['border'] ='#E67E15';
    } else if( formCategory === 'STATE'){
        formData["approvedColor"] = '#E67E1599';
        formData['submittedColor'] = '#059B05';
        formData['border'] ='#059B05'
    }

    for( let i = 0; i < sidemenuForms.length; i++){
        let element = sidemenuForms[i];
        let flag = false;
        
        //First 4 cases where ModelName is not equal to path in sidemenu form
        if( modelName === ModelNames.annualAcc && element._id === "AnnualAccounts"){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.annualAcc]}`;
            
        }else if(modelName === ModelNames.linkPFMS && element._id === "LinkPFMS"){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.linkPFMS]}`;

        }else if( modelName === ModelNames.slb && element._id === "XVFcGrantForm"){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.slb]}`;
        }else if(modelName === ModelNames.twentyEightSlbs && element._id === "TwentyEightSlbsForm"){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.twentyEightSlbs]}`;

        } else if (modelName === ModelNames.dur && element._id === ModelNames.dur){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.dur]}`;
            
        }else if (modelName === ModelNames.gtc && element._id === ModelNames.gtc){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.gtc]}`;
                    
        }else if (modelName === ModelNames.twentyEightSlbs && element._id === ModelNames.twentyEightSlbs){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.twentyEightSlbs]}`;
                    
        }else if (modelName ===  ModelNames.odf && element._id === ModelNames.odf){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.odf]}`;
                    
        }else if (modelName === ModelNames.gfc && element._id === ModelNames.gfc){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.gfc]}`;
                
        }else if (modelName === ModelNames.sfc && element._id === ModelNames.sfc){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.sfc]}`;
                    
        }else if (modelName === ModelNames.pTAX && element._id === ModelNames.pTAX ){
            flag = true;
            formData["formName"] = element.name;
            formData['icon'] = element.icon;
            formData['link'] = `/${reviewForm.url}/${FormObjectIds[ModelNames.pTAX]}`;        
        }
        if (flag) break;
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

function getQuery(modelName, designYear, formCategory, stateId){
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
    switch(formCategory){
        case "ULB":
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
                    case "PFMSAccount":
                        condition = {
                            linkPFMS:'Yes',
                            isUlbLinkedWithPFMS: 'Yes',
                            isDraft: false
                        };
                        query.push({
                            $match: {
                                design_year: ObjectId(designYear),
                                $or:[...submitConditionUlb,condition]
                            }
                        });
                        break;
                case "TwentyEightSlbForm":
                case "GfcFormCollection":
                case "OdfFormCollection": 
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionUlb]
                    }
                    });
                    break;
                case "XVFcGrantULBForm":
                    condition = {
                        blank: false,
                        isDraft: false
                    }
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            $or:[...submitConditionUlb, condition]
                    }
                    });
                    break;
                case "UtilizationReport":
                    query.push({
                        $match: {
                            designYear: ObjectId(designYear),
                            $or: [...submitConditionUlb]
                    }
                    })  
                    break;
            }
            break;
        case "STATE":
            switch(modelName){
                case "StateFinanceCommissionFormation":
                case "PropertyTaxFloorRate":
                case "GrantTransferCertificate":
                    query.push({
                        $match:{
                            design_year: ObjectId(designYear),
                            state: ObjectId(stateId),
                            $or:[...submitConditionState]
                    }
                    })  
                    break;
            }
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
        let sidemenuPipeline = [
                {
                    $match:{
                        role: {$in: ["ULB","STATE"]}  
                    }
                },
                {
                    $group:{
                        _id: "$path",
                        icon:{$first:"$icon"},
                        url: {$first: "$url"},
                        name:{$first:"$name"},
                    }
                },
        ]
        const totalUlbs = await State.aggregate(totalUlbPipeline);
        let [sidemenuForms, reviewSidemenuForm] = await Promise.all([
            Sidemenu.aggregate(sidemenuPipeline),
            Sidemenu.findOne({_id:ObjectId("62c55f9c3671152ee4198dc5")}).lean()
        ]);
        
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
            if(modelName !== ModelNames.pTAX && modelName !== ModelNames.sfc &&
                modelName !== ModelNames.gtc){
                formCategory = "ULB";
            } else {
                formCategory = "STATE";
            }
            //Get pipeline query, using modelName
            let pipeline = getQuery(modelName, data.design_year, formCategory, state);
            //Get submitted forms            
            //Get Approved forms percent
            let submittedForms = await collection.aggregate(pipeline);
            if(formCategory === "ULB"){
                submitPercent = Math.round((submittedForms.length/totalForms)*100);
                submittedFormPercent[modelName] = submitPercent;
                totalApprovedForm = approvedForms(submittedForms, formCategory);
                approvedFormPercent[modelName] = Math.round((totalApprovedForm/totalForms)*100)
            } else if(formCategory === "STATE"){
                if(submittedForms.length === 0){
                    submitPercent = 0;
                    submittedFormPercent[modelName] = submitPercent;
                    totalApprovedForm = approvedForms(submittedForms, formCategory);
                    approvedFormPercent[modelName] = 0
                } else if(submittedForms.length ===1){
                    submitPercent = 100;
                    submittedFormPercent[modelName] = submitPercent;
                    totalApprovedForm = approvedForms(submittedForms, formCategory);
                    approvedFormPercent[modelName] = 100 
                }
            }

            let formData = getFormData(formCategory, modelName, sidemenuForms, reviewSidemenuForm);
            //Adding status to formData
            if(submittedFormPercent[modelName] <= 0){
                formData.status = "Not started"
            } else if (approvedFormPercent === 100){
                formData.status = "Submitted"
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
                    formName: formData["formName"],
                    approvedColor: formData["approvedColor"],
                    submittedColor: formData["submittedColor"],
                    submittedValue: submittedFormPercent[modelName],
                    approvedValue: approvedFormPercent[modelName],
                    cutOff,
                    icon: formData["icon"],
                    link: formData["link"],
                    border:formData.border,
                    status:formData.status
                };
                ulbResponseArray.push(ulbResponse);
            } else if( formCategory === "STATE") {
                stateResponse = {
                    formName: formData["formName"],
                    approvedColor: formData["approvedColor"],
                    submittedColor: formData["submittedColor"],
                    submittedValue: submittedFormPercent[modelName],
                    approvedValue: approvedFormPercent[modelName],
                    cutOff,
                    icon: formData["icon"],
                    link: formData["link"],
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
            }]
        })

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }

}