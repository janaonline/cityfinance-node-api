const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const ObjectId = require("mongoose").Types.ObjectId;
const Year = require('../../models/Year');
const { ULBMASTER } = require('../../_helper/constants');
const StatusList = require('../../util/newStatusList')
const Ulb = require('../../models/Ulb.js')
const State = require('../../models/State')
//Importing all ULB forms
const AnnualAccounts = require('../../models/AnnualAccounts')
const DUR = require('../../models/UtilizationReport')
const ODF = require('../../models/OdfFormCollection')
const GFC = require('../../models/GfcFormCollection')
const SLB = require('../../models/XVFcGrantForm')
const PFMS = require('../../models/LinkPFMS')
const PropTax = require('../../models/PropertyTaxOp')
const {calculateStatus} = require('../CommonActionAPI/service')
const SLB28 = require('../../models/TwentyEightSlbsForm')
const PropertyTaxOp = require('../../models/PropertyTaxOp')

//STate Forms
const SFC = require('../../models/StateFinanceCommissionFormation')
const PTFR = require('../../models/PropertyTaxFloorRate')
const GTC_STATE = require('../../models/GrantTransferCertificate')
const ActionPlan = require('../../models/ActionPlans')
const WaterRejuvenation = require('../../models/WaterRejenuvation&Recycling')
const USER_TYPES = require('../../util/userTypes')
const ticks = {
    "green": "../../../assets/form-icon/checked.svg",
    "red": "../../../assets/form-icon/cancel.svg"
}

let FormModelMapping = {
    "AnnualAccountData": ObjectId("62aa1b04729673217e5ca3aa"),
    "UtilizationReport": ObjectId("62aa1c96c9a98b2254632a8a"),
    "PFMSAccount": ObjectId("62aa1cc9c9a98b2254632a8e"),
    "TwentyEightSlbForm" : ObjectId("62f0dbbf596298da6d3f4076"),
    "PropertyTaxOp" : ObjectId("62aa1ceac9a98b2254632a92")
    
}
let FormModelMapping_State = {
    "GrantTransferCertificate": ObjectId("62c552c52954384b44b3c386"),
    "PropertyTaxFloorRate": ObjectId("62c5534e2954384b44b3c38a"),
    "StateFinanceCommissionFormation": ObjectId("62c553822954384b44b3c38e"),
    "ActionPlans" : ObjectId("62c554772954384b44b3c39a"),
    "GrantAllocation": ObjectId("62c554932954384b44b3c39e"),
    "GrantClaim": ObjectId("62c554cb2954384b44b3c3a2"),
    "WaterRejenuvationRecycling": ObjectId("62c554382954384b44b3c396")
    
}

let SUB_CATEGORY_CONSTANTS = {
  "Dashboard": 1,
  "Grant Transfer Certificate": 2,
  "Property tax floor rate Notification": 2,
  "State Finance Commission Notification":2,
  "Grant Allocation to ULBs": 3,
  "Submit Claims for 15th FC Grants": 3
}


const calculateTick = (tooltip, loggedInUserRole, viewFor) => {
    //get 3 parameter formType and compare formType with loggedInUserRole
    if(viewFor === USER_TYPES.ulb){
        if (loggedInUserRole == USER_TYPES.ulb) {
          if (
            tooltip == StatusList.Not_Started ||
            tooltip == StatusList.In_Progress ||
            tooltip == StatusList.Rejected_By_State ||
            tooltip == StatusList.Rejected_By_MoHUA
          ) {
            return ticks["red"];
          } else {
            return ticks["green"];
          }
        } else if (loggedInUserRole == USER_TYPES.state) {
          if (
            tooltip == StatusList.Not_Started ||
            tooltip == StatusList.In_Progress ||
            tooltip == StatusList.Under_Review_By_State
          ) {
            return ticks["red"];
          } else if (
            tooltip == StatusList.Rejected_By_State ||
            tooltip == StatusList.Rejected_By_MoHUA ||
            tooltip == StatusList.Under_Review_By_MoHUA ||
            tooltip == StatusList.Approved_By_MoHUA
          ) {
            return ticks["green"];
          }
        } else if (
          loggedInUserRole == USER_TYPES.mohua ||
          loggedInUserRole == USER_TYPES.admin
        ) {
          if (
            tooltip == StatusList.Not_Started ||
            tooltip == StatusList.In_Progress ||
            tooltip == StatusList.Under_Review_By_State ||
            tooltip == StatusList.Rejected_By_State ||
            tooltip == StatusList.Under_Review_By_MoHUA
          ) {
            return ticks["red"];
          } else if (
            tooltip == StatusList.Rejected_By_MoHUA ||
            tooltip == StatusList.Approved_By_MoHUA
          ) {
            return ticks["green"];
          }
        }
    }else if( viewFor === USER_TYPES.state){
        if (loggedInUserRole == USER_TYPES.state) {
          if (
            tooltip == StatusList.Not_Started ||
            tooltip == StatusList.In_Progress ||
            tooltip == StatusList.Under_Review_By_State ||
            tooltip == StatusList.Rejected_By_MoHUA
          ) {
            return ticks["red"];
          } else if (
            tooltip == StatusList.Under_Review_By_MoHUA ||
            tooltip == StatusList.Approved_By_MoHUA
          ) {
            return ticks["green"];
          }
        } else if (
          loggedInUserRole == USER_TYPES.mohua ||
          loggedInUserRole == USER_TYPES.admin
        ) {
          if (
            tooltip == StatusList.Not_Started ||
            tooltip == StatusList.In_Progress ||
            tooltip == StatusList.Under_Review_By_MoHUA
          ) {
            return ticks["red"];
          } else if (
            tooltip == StatusList.Rejected_By_MoHUA ||
            tooltip == StatusList.Approved_By_MoHUA
          ) {
            return ticks["green"];
          }
        }
    }else if( viewFor === USER_TYPES.mohua){
      if (
        loggedInUserRole == USER_TYPES.mohua ||
        loggedInUserRole == USER_TYPES.admin
      ) {
        if (
          tooltip == StatusList.Not_Started ||
          tooltip == StatusList.In_Progress ||
          tooltip == StatusList.Under_Review_By_MoHUA
        ) {
          return ticks["red"];
        } else if (tooltip == StatusList.Under_Review_By_MoHUA) {
          return ticks["green"];
        }
      }
    }
   

}



const findStatusAndTooltip = (formData, formId, modelName, loggedInUserRole, viewFor) => {
    
    let status = modelName == 'XVFcGrantULBForm' ? formData?.waterManagement?.status  : formData.status;
    let actionTakenByRole = formData.actionTakenByRole;
    let isDraft = modelName == 'XVFcGrantULBForm' ? !formData.isCompleted : formData.isDraft;
    let tooltip = calculateStatus(status, actionTakenByRole, isDraft, viewFor  );
    let tick = calculateTick(tooltip,loggedInUserRole, viewFor)

    return {
        [formId]: {
            tooltip: tooltip,
            tick: tick
        }
    }

}

module.exports.get = catchAsync(async (req, res) => {
    let user = req.decoded;
    let role = req.query.role;
    let year = req.query.year;
    let _id = req.query._id;
    let cardArr = [], tempData;
    let cardObj =     {
        label: "",
        key: "",
        link: "",
        title: "",
        message: '',
        tooltip: "",
        image: "",
        background_image:"",
        color:{
            color_1:"",
            color_2:""
        }
      }
    if ((role == 'ULB' || role == 'STATE') && ( !role || !year || !_id))
        return res.status(400).json({
            success: false,
            message: "Data missing"
        })
    let isUA;
    let output = []
    if (role == 'ULB') {
        let ulbInfo = await Ulb.findOne({ _id: ObjectId(_id) }).lean();
        isUA = ulbInfo.isUA
        FormModelMapping["GfcFormCollection"] = isUA == 'Yes' ? ObjectId("62aa1d82c9a98b2254632a9e") : ObjectId("62aa1dd6c9a98b2254632aae")
        FormModelMapping["OdfFormCollection"] = isUA == 'Yes' ? ObjectId("62aa1d6ec9a98b2254632a9a") : ObjectId("62aa1dc0c9a98b2254632aaa")
        FormModelMapping["XVFcGrantULBForm"] = isUA == 'Yes' ? ObjectId("62aa1cc9c9a98b2254632a8e") : ObjectId("62aa1dadc9a98b2254632aa6")
        

        let condition = {
            ulb: ObjectId(_id),
        }
        let formArr = [AnnualAccounts, DUR, ODF, GFC, PFMS, SLB28, PropertyTaxOp]
       for(el of formArr) {
            if (el == DUR) {
                delete condition['design_year'];
                condition['designYear'] = ObjectId(year)
            } else {
                delete condition['designYear'];
                condition['design_year'] = ObjectId(year)
            }
            let formData = await el.findOne(condition).lean()
            if (formData) {

                output.push(findStatusAndTooltip(formData, FormModelMapping[el['modelName']] , el['modelName'], user.role, role))
            }
        }
    }else if (role == 'STATE') {
        let stateInfo = await State.findOne({ _id: ObjectId(_id) }).lean();
        let condition = {
            state: ObjectId(_id),
            design_year: ObjectId(year)
        }
        let formArr = [SFC, PTFR, GTC_STATE, ActionPlan, WaterRejuvenation]
       for(el of formArr) {
            if(el !== GTC_STATE){
            let formData = await el.findOne(condition).lean()
            if (formData) {

                output.push(findStatusAndTooltip(formData, FormModelMapping_State[el['modelName']] , el['modelName'], user.role, role))
                }
            }else{
                let formDataArray = await el.find(condition).lean();
                if(formDataArray.length>0){
                    let formData = getGTCFinalForm(formDataArray);
                    output.push(findStatusAndTooltip(formData, FormModelMapping_State[el['modelName']] , el['modelName'], user.role, role))
                }
            }
        }
    }

    let data = await Sidemenu.find({ year: ObjectId(year), role: role, isActive: true }).lean()
    if (data.length ) {
  if(role == "ULB"){
    if(isUA == 'Yes'){
        data = data.filter(el => el.category != 'Performance Conditions')
     }else{
         data = data.filter(el => el.category != 'Million Plus City Challenge Fund')
     }

    data.forEach((el,)=> {
        if( el.category && el.collectionName != "GTC" && el.collectionName != "SLB"){
            let  flag = 0;
            output.forEach(el2 => {
                if((el._id).toString() == (Object.keys(el2)[0])){
                    Object.assign(el, el2[Object.keys(el2)[0]])
                    flag = 1;
                }
            })
        if(!flag && el.collectionName != "GTC"){
                Object.assign(el, {tooltip: "Not Started", tick: ticks['red']})
        }
        }else{
            // where tick /cross logic is not applicable
            Object.assign(el, {tooltip: "", tick: ""})
        }
      
        
    }) 
  }else if(role == "STATE"){
    data.forEach((el,)=> {
      if( el.category.toLowerCase() != "ulb management" && el.url !== "water-supply"
      &&  !(["GrantClaim"].includes(`${el.collectionName}`)) && !(el.name === "Dashboard")
        ){
            let  flag = 0;
            output.forEach(el2 => {
                if((el._id).toString() == (Object.keys(el2)[0])){
                    Object.assign(el, el2[Object.keys(el2)[0]])
                    flag = 1;
                }
            })
        if(!flag && el.category.toLowerCase() != "ulb management"){
                Object.assign(el, {tooltip: "Not Started", tick: ticks['red']})
        }
        }else{
            // where tick /cross logic is not applicable
            Object.assign(el, {tooltip: "", tick: ""})
        }
      
        
    }) 
  }
        // add the formStatus and tooltip
       
// adding previous and next url
// data.sort() sequence
    tempData = data.sort((a, b)=>{
        return a.sequence - b.sequence;
    })
    let result2=[];
    for(let i =0 ; i< tempData.length; i++){
        let entity = tempData[i];
        if(entity?.sequence){

            if(entity.sequence === 1){//first entry
                entity.prevUrl = null;
                entity.nextUrl = `../${tempData[i+1].url}`;
            } else if(i === (tempData.length-1)){//last entry
                entity.prevUrl =  `../${tempData[i-1].url}`;
                entity.nextUrl = null;
            } else {
                entity.prevUrl = `../${tempData[i-1].url}`;
                entity.nextUrl = `../${tempData[i+1].url}`;
            }
            result2.push(entity);
            
        }
    }
    //group the data 
     tempData = groupByKey(data, "category")
    }
    
    
    if (role === "STATE") {
      let subCatTempData = tempData[""];
      let newSubCat = {};
      for (let obj of subCatTempData) {
        if(obj && obj.name){
          if(!newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]]){
            newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]] =  [obj] ;
            continue;
          }
          newSubCat[SUB_CATEGORY_CONSTANTS[obj?.name]].push(obj);
         
        }
      }
      tempData[""] =  newSubCat;
    }
//sorting the data as per sequence no;
tempData = sortByPosition(tempData, role);
//creating card Data
if(role=="ULB"){
    data.forEach(el => {
        if(el.name.toLowerCase() != 'overview'  &&  el.name.toLowerCase() != 'resources' ){
            cardObj.image = el?.icon;
            cardObj.key = el?.collectionName;
            cardObj.label = el?.name;
            cardObj.title = el?.cardLabel;
            cardObj.message = el?.cardMessage;
            cardObj.tooltip = el?.tooltip;
            cardObj.link = el?.url;
            cardObj.background_image = el?.background_image;
            cardObj.color = el?.color;
            cardArr.push(cardObj)
            cardObj =     {
                label: "",
                key: "",
                link: "",
                title: "",
                message: '',
                tooltip: "",
                image: "",
                background_image:"",
                color:{},
              }
        }
        
    
    })
}   

    res.status(200).json({
        success: true,
        data: tempData,
        card: role == "ULB" ? cardArr : []
    })
})

module.exports.list = catchAsync(async (req,res) => {
    let role = req.query.role;
    let design_year = req.query.design_year;

    let condition = {
        role: role,
        year: ObjectId(design_year),
        isForm: true,
        isActive: true,
    }
    let data = await Sidemenu.find(condition).select({name:1, _id:1, collectionName:1, path:1, url:1, optional: 1, folderName:1});
    
    data = data.filter((value, index, self) =>
  index === self.findIndex((t) => (
    t.collectionName === value.collectionName
  ))
)
    res.status(200).json({
        success: true,
        data: data
    })
} )

module.exports.post = catchAsync(async (req, res) => {
    let data = req.body;
    if (!data.name || !data.url || !data.role || !data.position || !data.year) {
        return res.status(400).json({
            success: false,
            message: "Data missing"
        })

    }
    let year = await Year.findOne({ _id: ObjectId(data.year) }).lean()
    let code = data.role + year.year


    let obj = {
        name: data.name,
        category: data.category ?? "",
        url: data.url,
        role: data.role,
        position: data.position,
        year: ObjectId(data.year),
        code: code,
        icon: data.icon ?? ""

    }
    let menuData = new Sidemenu(obj);

    await menuData.save();

    let fetchedData = await Sidemenu.find({ code: code })

    return res.status(200).json({
        success: true,
        message: "Data Saved",
        data: fetchedData

    })

})


module.exports.put = catchAsync(async (req, res) => {

})


module.exports.delete = catchAsync(async (req, res) => {

})

const sortByPosition = (data, role) => {
  if(role !== "STATE"){
    for(let key in data){
        data[key].sort((a, b) => {
            return a.position - b.position;
        });
      
     }
  }else{

    for(let key in data){
     if(key !== ""){
       data[key].sort((a, b) => {
           return a.position - b.position;
       });
     }else if(key === ""){
       sortByPosition(data[""], role);
     }
    }
  }
    return data;
}
const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})


function getGTCFinalForm(formArray){
    let formData = "";
    let approvedForm = 0;
    let pendingForm = 0;
    let pendingFormData =  "";
    for (let i = 0; i < formArray.length; i++) {
      formData = formArray[i];
      if (formData.status === "REJECTED") {//return rejected form if any rejected
        return formData;
      } else if (formData.status === "APPROVED") {
        approvedForm++;
      } else if (formData.status === "PENDING") {
        pendingForm++;
        pendingFormData = formData;
      }
    }
    if(approvedForm === 8){//if all forms approved
        return formData;
    }
    if (pendingForm === 8) {
      //if all forms are submit, to get Under review by mohua status
      return pendingFormData;
    }
    if(approvedForm < 8 && pendingForm > 0){
        //if any form is pending, In progress
        pendingFormData.isDraft = true;
        return pendingFormData;
    }else if(approvedForm < 8 && pendingForm === 0){
        //if all forms submitted are approved but all 8 are not submitted.
        //In progress
        formData.status = 'PENDING';
        formData.actionTakenByRole = 'STATE';
        formData.isDraft = true;
        return formData;
     }
    
}
var x=[
{
  "_id" : ObjectId("62aa1b04729673217e5ca3aa"),
  "isActive" : true,
  "name" : "Annual Accounts",
  "category" : "Entry Level Conditions",
  "url" : "annual_acc",
  "role" : "ULB",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/1efaac93-fd0d-4cdf-8382-e691c987f4b3annual-account",
  "__v" : 0.0,
  "collection" : "",
  "optional" : true,
  "collectionName" : "AnnualAccounts",
  "path" : "AnnualAccounts",
  "cardLabel" : "Upload Annual Accounts",
  "cardMessage" : "ULBs to upload Provisional Annual Accounts for previous year and Audited Annual Accounts for year before previous year with respect to the award year.",
  "background_image" : "linear-gradient(rgb(115, 197, 87), rgb(58, 99, 44))",
  "color" : {
      "color_1" : "#73C557",
      "color_2" : "#3A632C"
  },
  "isForm" : true,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 5.0,
  "dbCollectionName" : "annualaccountdatas"
},
{
  "_id" : ObjectId("62aa1bbec9a98b2254632a86"),
  "isActive" : true,
  "name" : "Grant Transfer Certificate",
  "category" : "Entry Level Conditions",
  "url" : "grant-tra-certi",
  "role" : "ULB",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "../../../../assets/dashboard-state/link_black_24dp.svg",
  "__v" : 0.0,
  "collection" : "",
  "optional" : null,
  "collectionName" : "GTC",
  "path" : "GrantTransferCertificate",
  "cardLabel" : "View Grant Transfer Certificate",
  "cardMessage" : "State Governments to furnish Grant Transfer Certificate for the previous installment of grants in the prescribed format.",
  "isForm" : false,
  "sequence" : 3.0
},
{
  "_id" : ObjectId("62aa1c96c9a98b2254632a8a"),
  "isActive" : true,
  "name" : "Detailed Utilisation Report",
  "category" : "Entry Level Conditions",
  "url" : "utilisation-report",
  "role" : "ULB",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/e0c8fe37-68dc-474e-9281-3b039c1a13f5dur",
  "__v" : 0.0,
  "collection" : "",
  "optional" : false,
  "collectionName" : "DUR",
  "path" : "UtilizationReport",
  "cardLabel" : "Upload Detailed Utilisation Report",
  "cardMessage" : "ULBs are mandated to furnish Detailed Utilisation Report as per prescribed format for the previous installments of 15th FC grants.",
  "background_image" : "linear-gradient(rgb(66, 201, 246), rgb(33, 101, 123))",
  "color" : {
      "color_1" : "#42C9F6",
      "color_2" : "#21657B"
  },
  "isForm" : true,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 4.0,
  "dbCollectionName" : "utilizationreports"
},
{
  "_id" : ObjectId("62aa1cc9c9a98b2254632a8e"),
  "isActive" : true,
  "name" : "Linking of PFMS Account",
  "category" : "Entry Level Conditions",
  "url" : "pfms_acc",
  "role" : "ULB",
  "position" : 4.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/3ac169f5-68b2-402e-a4af-516431786c01pfms",
  "__v" : 0.0,
  "collection" : "",
  "optional" : true,
  "collectionName" : "PFMS",
  "path" : "LinkPFMS",
  "cardLabel" : "Provide details on PFMS Account Linkage",
  "cardMessage" : "Linking of ULB account for XVFC Grant with PFMS will be a pre-condition for release of grant",
  "isForm" : true,
  "sequence" : 6.0,
  "dbCollectionName" : "pfmsaccounts"
},
{
  "_id" : ObjectId("62aa1ceac9a98b2254632a92"),
  "isActive" : true,
  "name" : "Property Tax Operationalisation",
  "category" : "Entry Level Conditions",
  "url" : "ptax",
  "role" : "ULB",
  "position" : 5.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/c1fbb487-8948-4247-8a2d-e91dab0e7b97pto",
  "__v" : 0.0,
  "collection" : "",
  "optional" : true,
  "collectionName" : "PTAX",
  "path" : "PropertyTaxOp",
  "cardLabel" : "Furnish details on property tax collection procedures",
  "cardMessage" : "Process of collecting notified floor rates of property tax must be operationalized",
  "isForm" : true,
  "sequence" : 7.0,
  "dbCollectionName" : "propertytaxops"
},
{
  "_id" : ObjectId("62aa1d4fc9a98b2254632a96"),
  "isActive" : true,
  "name" : "SLBs for Water Supply and Sanitation",
  "category" : "Million Plus City Challenge Fund",
  "url" : "slbs",
  "role" : "ULB",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/a1099df9-a6c6-4aa6-8e94-49cf1907b839water-supply",
  "__v" : 0.0,
  "collection" : "XVFcGrantForm",
  "optional" : true,
  "collectionName" : "SLB",
  "path" : "XVFcGrantForm",
  "cardLabel" : "Fill details for Performance Condition",
  "cardMessage" : "Performance condition grants will be recommended by MoHUA based on the publication of Baseline data, annual targets, and achievement thereof. If the targets are achieved, NMPCs will be eligible for receiving the undistributed portion of grants meant for MPCs.",
  "isForm" : false,
  "sequence" : 10.0,
  "dbCollectionName" : "xvfcgrantulbforms"
},
{
  "_id" : ObjectId("62aa1d6ec9a98b2254632a9a"),
  "isActive" : true,
  "name" : "Open Defecation Free (ODF)",
  "category" : "Million Plus City Challenge Fund",
  "url" : "odf",
  "role" : "ULB",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/30af62b8-d7f0-4ade-afb6-73e0f15f53f0odf",
  "__v" : 0.0,
  "collection" : "",
  "optional" : false,
  "collectionName" : "ODF",
  "path" : "OdfFormCollection",
  "cardLabel" : "Provide ODF rating certificate and other details",
  "cardMessage" : "MoHUA will assess performance of MPC in SWM against ODF rating of ULBs based on details provided",
  "isForm" : true,
  "sequence" : 11.0,
  "dbCollectionName" : "odfformcollections"
},
{
  "_id" : ObjectId("62aa1d82c9a98b2254632a9e"),
  "isActive" : true,
  "name" : "Garbage Free City (GFC)",
  "category" : "Million Plus City Challenge Fund",
  "url" : "gfc",
  "role" : "ULB",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/e0c8fe37-68dc-474e-9281-3b039c1a13f5dur",
  "__v" : 0.0,
  "collection" : "",
  "optional" : false,
  "collectionName" : "GFC",
  "path" : "GfcFormCollection",
  "cardLabel" : "Provide GFC rating certificate and other details",
  "cardMessage" : "MoHUA will assess performance of MPC in SWM against GFC rating of ULBs based on details provided",
  "isForm" : true,
  "sequence" : 12.0,
  "dbCollectionName" : "gfcformcollections"
},
{
  "_id" : ObjectId("62aa1d95c9a98b2254632aa2"),
  "isActive" : false,
  "name" : "Scoring",
  "category" : "Million Plus City Challenge Fund",
  "url" : "scoring",
  "role" : "ULB",
  "position" : 4.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "",
  "__v" : 0.0,
  "collection" : "",
  "optional" : null,
  "collectionName" : "",
  "path" : "",
  "cardLabel" : "",
  "cardMessage" : "",
  "isForm" : false
},
{
  "_id" : ObjectId("62aa1dadc9a98b2254632aa6"),
  "isActive" : true,
  "name" : "SLBs for Water Supply and Sanitation",
  "category" : "Performance Conditions",
  "url" : "slbs",
  "role" : "ULB",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/a1099df9-a6c6-4aa6-8e94-49cf1907b839water-supply",
  "__v" : 0.0,
  "collection" : "XVFcGrantForm",
  "optional" : true,
  "collectionName" : "SLB",
  "path" : "XVFcGrantForm",
  "cardLabel" : "Fill details for Performance Condition",
  "cardMessage" : "Performance condition grants will be recommended by MoHUA based on the publication of Baseline data, annual targets, and achievement thereof. If the targets are achieved, NMPCs will be eligible for receiving the undistributed portion of grants meant for MPCs.",
  "background_image" : "linear-gradient(rgb(241, 104, 49), rgb(121, 52, 25))",
  "color" : {
      "color_1" : "#F16831",
      "color_2" : "#793419"
  },
  "isForm" : false,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 13.0,
  "dbCollectionName" : "xvfcgrantulbforms"
},
{
  "_id" : ObjectId("62aa1dc0c9a98b2254632aaa"),
  "isActive" : true,
  "name" : "Open Defecation Free (ODF)",
  "category" : "Performance Conditions",
  "url" : "odf",
  "role" : "ULB",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/30af62b8-d7f0-4ade-afb6-73e0f15f53f0odf",
  "__v" : 0.0,
  "collection" : "",
  "optional" : false,
  "collectionName" : "ODF",
  "path" : "OdfFormCollection",
  "cardLabel" : "Provide ODF rating certificate and other details",
  "cardMessage" : "MoHUA will assess performance of MPC in SWM against ODF rating of ULBs based on details provided",
  "background_image" : "linear-gradient(rgb(84, 157, 94), rgb(42, 79, 47))",
  "color" : {
      "color_1" : "#549D5E",
      "color_2" : "#2A4F2F"
  },
  "isForm" : true,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 14.0,
  "dbCollectionName" : "odfformcollections"
},
{
  "_id" : ObjectId("62aa1dd6c9a98b2254632aae"),
  "isActive" : true,
  "name" : "Garbage Free City (GFC)",
  "category" : "Performance Conditions",
  "url" : "gfc",
  "role" : "ULB",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/e0c8fe37-68dc-474e-9281-3b039c1a13f5dur",
  "__v" : 0.0,
  "collection" : "",
  "optional" : false,
  "collectionName" : "GFC",
  "path" : "GfcFormCollection",
  "cardLabel" : "Provide GFC rating certificate and other details",
  "cardMessage" : "MoHUA will assess performance of MPC in SWM against GFC rating of ULBs based on details provided",
  "background_image" : "linear-gradient(rgb(157, 25, 139), rgb(79, 13, 70))",
  "color" : {
      "color_1" : "#FDCB2E",
      "color_2" : "#7F6617"
  },
  "isForm" : true,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 15.0,
  "dbCollectionName" : "gfcformcollections"
},
{
  "_id" : ObjectId("62aa29ac82b30b29a283a841"),
  "isActive" : true,
  "name" : "Overview",
  "category" : "",
  "url" : "overview",
  "role" : "ULB",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "",
  "__v" : 0.0,
  "collection" : "",
  "optional" : null,
  "collectionName" : "",
  "path" : "",
  "cardLabel" : "",
  "cardMessage" : "",
  "isForm" : false,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 1.0
},
{
  "_id" : ObjectId("62c679c0cfc92402eb3e9d64"),
  "isActive" : true,
  "name" : "Resources",
  "category" : "",
  "url" : "resources",
  "role" : "ULB",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "",
  "__v" : 0.0,
  "cardLabel" : "",
  "cardMessage" : "",
  "isForm" : false,
  "nextUrl" : "",
  "prevUrl" : "",
  "sequence" : 2.0
},
{
  "_id" : ObjectId("62c552c52954384b44b3c386"),
  "isActive" : true,
  "name" : "Grant Transfer Certificate",
  "category" : "",
  "url" : "gtCertificate",
  "role" : "STATE",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "../../../../assets/dashboard-state/link_black_24dp.svg",
  "path" : "GrantTransferCertificate",
  "__v" : 0.0,
  "isForm" : true,
  "optional" : false,
  "collectionName" : "GTC",
  "dbCollectionName" : "granttransfercertificates",
  "sequence" : 4.0
},
{
  "_id" : ObjectId("62c5534e2954384b44b3c38a"),
  "isActive" : true,
  "name" : "Property tax floor rate Notification",
  "category" : "",
  "url" : "property-tax",
  "role" : "STATE",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/c1fbb487-8948-4247-8a2d-e91dab0e7b97pto",
  "__v" : 0.0,
  "collectionName" : "PTAXState",
  "path" : "PropertyTaxFloorRate",
  "isForm" : true,
  "optional" : false,
  "dbCollectionName" : "propertytaxfloorrates",
  "sequence" : 5.0
},
{
  "_id" : ObjectId("62c553822954384b44b3c38e"),
  "isActive" : true,
  "name" : "State Finance Commission Notification",
  "category" : "",
  "url" : "fc-formation",
  "role" : "STATE",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/480ddc56-9ecc-4bf8-a141-d1b9234f8bedsfc-notification",
  "__v" : 0.0,
  "collectionName" : "SFC",
  "path" : "StateFinanceCommissionFormation",
  "isForm" : true,
  "optional" : false,
  "dbCollectionName" : "statefinancecommissionformations",
  "sequence" : 6.0
},
{
  "_id" : ObjectId("62c5540d2954384b44b3c392"),
  "isActive" : true,
  "name" : "Indicators for Water Supply and Sanitation",
  "category" : "Million Plus Cities Challenge for UAs",
  "url" : "water-supply",
  "role" : "STATE",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : false,
  "collectionName" : "",
  "path" : "",
  "optional" : false,
  "sequence" : 7.0
},
{
  "_id" : ObjectId("62c554382954384b44b3c396"),
  "isActive" : true,
  "name" : "Projects for Water Supply and Sanitation",
  "category" : "Million Plus Cities Challenge for UAs",
  "url" : "water-rejenuvation",
  "role" : "STATE",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : true,
  "collectionName" : "",
  "path" : "",
  "optional" : false,
  "dbCollectionName" : "",
  "sequence" : 8.0
},
{
  "_id" : ObjectId("62c554772954384b44b3c39a"),
  "isActive" : true,
  "name" : "Action Plan for UA Service Level Indicators",
  "category" : "Million Plus Cities Challenge for UAs",
  "url" : "action-plan",
  "role" : "STATE",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : true,
  "optional" : false,
  "collectionName" : "ActionPlan",
  "path" : "ActionPlans",
  "dbCollectionName" : "actionplans",
  "sequence" : 9.0
},
{
  "_id" : ObjectId("62c554932954384b44b3c39e"),
  "isActive" : true,
  "name" : "Grant Allocation to ULBs",
  "category" : "",
  "url" : "grant-allocation",
  "role" : "STATE",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : true,
  "optional" : true,
  "collectionName" : "GrantAllocation",
  "path" : "GrantDistribution",
  "dbCollectionName" : "grantdistributions",
  "sequence" : 10.0
},
{
  "_id" : ObjectId("62c554cb2954384b44b3c3a2"),
  "isActive" : true,
  "name" : "Submit Claims for 15th FC Grants",
  "category" : "",
  "url" : "grant-claim",
  "role" : "STATE",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : true,
  "optional" : false,
  "collectionName" : "GrantClaim",
  "path" : "GrantClaim",
  "dbCollectionName" : "",
  "sequence" : 11.0
},
{
  "_id" : ObjectId("62c55f4a3671152ee4198dc1"),
  "isActive" : true,
  "name" : "Edit ULB profile",
  "category" : "ULB Management",
  "url" : "edit-ulb-profile",
  "role" : "STATE",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : false,
  "optional" : false,
  "sequence" : 2.0
},
{
  "_id" : ObjectId("62c55f9c3671152ee4198dc5"),
  "isActive" : true,
  "name" : "Review Grant Application",
  "category" : "ULB Management",
  "url" : "review-ulb-form",
  "role" : "STATE",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : 0.0,
  "isForm" : false,
  "optional" : false,
  "sequence" : 3.0
},
{
  "_id" : ObjectId("62f0dbbf596298da6d3f4076"),
  "isActive" : true,
  "name" : "28 SLBs",
  "category" : "Entry Level Conditions",
  "url" : "28SLBsForm",
  "role" : "ULB",
  "position" : 6.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "ULB2022-23",
  "icon" : "https://democityfinanceapi.dhwaniris.in/objects/b8ca32a7-77e8-4d8e-8420-8f54d29cdf0e28-slb",
  "sequence" : 8.0,
  "cardLabel" : "Provide details on Service Level Benchmarks",
  "cardMessage" : "All Millions Plus Cities/UAs are mandated to provide details on 28 service level benchmarks and targets for the award year",
  "__v" : 0.0,
  "path" : "TwentyEightSlbsForm",
  "isForm" : true,
  "collectionName" : "TwentyEightSlbsForm",
  "dbCollectionName" : "twentyeightslbforms"
},
{
  "_id" : ObjectId("62fb5a10951934013e53567a"),
  "isActive" : true,
  "modifiedAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "createdAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "name" : "Review Grant Application",
  "category" : "",
  "url" : "review-grant-app",
  "role" : "MoHUA",
  "position" : 3.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "MoHUA2022-23",
  "icon" : "",
  "__v" : 0.0,
  "sequence" : 3.0
},
{
  "_id" : ObjectId("62fb5a2b951934013e53567e"),
  "isActive" : true,
  "modifiedAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "createdAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "name" : "Review State Forms",
  "category" : "",
  "url" : "review-state-form",
  "role" : "MoHUA",
  "position" : 2.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "MoHUA2022-23",
  "icon" : "",
  "__v" : 0.0,
  "sequence" : 2.0
},
{
  "_id" : ObjectId("62fb5a82951934013e535682"),
  "isActive" : true,
  "modifiedAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "createdAt" : ISODate("2022-08-09T08:51:10.317+0000"),
  "name" : "Dashboard",
  "category" : "",
  "url" : "mohua-dashboard",
  "role" : "MoHUA",
  "position" : 1.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "MoHUA2022-23",
  "icon" : "",
  "__v" : 0.0,
  "sequence" : 1.0
},
{
  "_id" : ObjectId("6358e3ef67978c1d387f5312"),
  "isActive" : true,
  "modifiedAt" : ISODate("2022-10-26T07:37:41.915+0000"),
  "createdAt" : ISODate("2022-10-26T07:37:41.915+0000"),
  "name" : "Grant Transfer",
  "category" : "",
  "url" : "gtc",
  "role" : "MoHUA",
  "position" : 4.0,
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "MoHUA2022-23",
  "icon" : "",
  "__v" : NumberInt(0),
  "sequence" : 4.0
},
{
  "_id" : ObjectId("635b74966ee32d519b350f4a"),
  "isActive" : true,
  "modifiedAt" : ISODate("2022-10-28T05:07:15.655+0000"),
  "createdAt" : ISODate("2022-10-28T05:07:15.655+0000"),
  "name" : "Dashboard",
  "category" : "",
  "url" : "dashboard",
  "role" : "STATE",
  "position" : NumberInt(1),
  "year" : ObjectId("606aafb14dff55e6c075d3ae"),
  "code" : "STATE2022-23",
  "icon" : "",
  "__v" : NumberInt(0),
  "isForm" : false,
  "optional" : false,
  "sequence" : 1.0
}
]