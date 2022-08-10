const catchAsync = require('../../util/catchAsync')
const Sidemenu = require('../../models/Sidemenu')
const ObjectId = require("mongoose").Types.ObjectId;
const Year = require('../../models/Year');
const { ULBMASTER } = require('../../_helper/constants');
const StatusList = require('../../util/newStatusList')
const Ulb = require('../../models/Ulb.js')
//Importing all ULB forms
const AnnualAccounts = require('../../models/AnnualAccounts')
const DUR = require('../../models/UtilizationReport')
const ODF = require('../../models/OdfFormCollection')
const GFC = require('../../models/GfcFormCollection')
const SLB = require('../../models/XVFcGrantForm')
const PFMS = require('../../models/LinkPFMS')
const PropTax = require('../../models/PropertyTaxOp')
const {calculateStatus} = require('../CommonActionAPI/service')
const USER_TYPES = require('../../util/userTypes')
const ticks = {
    "green": "../../../assets/form-icon/checked.svg",
    "red": "../../../assets/form-icon/cancel.svg"
}

let FormModelMapping = {
    "AnnualAccountData": ObjectId("62aa1b04729673217e5ca3aa"),
    "UtilizationReport": ObjectId("62aa1c96c9a98b2254632a8a"),
    "PFMSAccount": ObjectId("62aa1cc9c9a98b2254632a8e"),
    
}

const calculateTick = (tooltip, loggedInUserRole) => {
    if(loggedInUserRole == USER_TYPES.ulb){
        if (tooltip == StatusList.Not_Started || tooltip == StatusList.In_Progress || tooltip == StatusList.Rejected_By_State || tooltip == StatusList.Rejected_By_MoHUA) {
            return ticks['red']
        } else {
            return ticks['green']
        }
    }else if(loggedInUserRole == USER_TYPES.state){
        if (tooltip == StatusList.Not_Started || tooltip == StatusList.In_Progress || tooltip == StatusList.Under_Review_By_State ) {
            return ticks['red']
        } else if(tooltip == StatusList.Rejected_By_State || tooltip == StatusList.Rejected_By_MoHUA || tooltip == StatusList.Under_Review_By_MoHUA || tooltip == StatusList.Approved_By_MoHUA ) {
            return ticks['green']
        }
    }else if(loggedInUserRole == USER_TYPES.mohua || loggedInUserRole == USER_TYPES.admin  ){
        if (tooltip == StatusList.Not_Started || tooltip == StatusList.In_Progress || tooltip == StatusList.Under_Review_By_State || tooltip == StatusList.Rejected_By_State || tooltip == StatusList.Under_Review_By_MoHUA  ) {
            return ticks['red']
        } else if( tooltip == StatusList.Rejected_By_MoHUA  || tooltip == StatusList.Approved_By_MoHUA ) {
            return ticks['green']
        }
    }
   

}



const findStatusAndTooltip = (formData, formId, modelName, loggedInUserRole) => {
    
    let status = modelName == 'XVFcGrantULBForm' ? formData?.waterManagement?.status  : formData.status;
    let actionTakenByRole = formData.actionTakenByRole;
    let isDraft = modelName == 'XVFcGrantULBForm' ? !formData.isCompleted : formData.isDraft;
    let tooltip = calculateStatus(status, actionTakenByRole, isDraft,loggedInUserRole );
    let tick = calculateTick(tooltip,loggedInUserRole)

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
    if (!role || !year || !_id)
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
        let formArr = [AnnualAccounts, DUR, ODF, GFC, SLB, PFMS]
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

                output.push(findStatusAndTooltip(formData, FormModelMapping[el['modelName']] , el['modelName'], user.role))
            }
        }
    }

    let data = await Sidemenu.find({ year: ObjectId(year), role: role, isActive: true }).lean()
    if (data.length) {
        // delete the non applicable entries
        if(isUA == 'Yes'){
           data = data.filter(el => el.category != 'Performance Conditions')
        }else{
            data = data.filter(el => el.category != 'Million Plus City Challenge Fund')
        }

        // add the formStatus and tooltip
data.forEach((el,)=> {
    if(el.category && el.collectionName != 'GTC'){
        let  flag = 0;
        output.forEach(el2 => {
            if((el._id).toString() == (Object.keys(el2)[0])){
                Object.assign(el, el2[Object.keys(el2)[0]])
                flag = 1;
            }
        })
    if(!flag){
            Object.assign(el, {tooltip: "Not Started", tick: ticks['red']})
    }
    }else{
        // where tick /cross logic is not applicable
        Object.assign(el, {tooltip: "", tick: ""})
    }
  
    
})        
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
//sorting the data as per sequence no;
tempData = sortByPosition(tempData);
//creating card Data
    data.forEach(el => {
        if(el.name.toLowerCase() != 'overview' && el.name.toLowerCase() != 'resources' ){
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
    res.status(200).json({
        success: true,
        data: tempData,
        card: cardArr
    })
})

module.exports.list = catchAsync(async (req,res) => {
    let role = req.query.role;
    let design_year = req.query.design_year;

    let condition = {
        role: role,
        year: ObjectId(design_year),
        isForm: true,
        isActive: true

    }
    let data = await Sidemenu.find(condition).select({name:1, _id:1, collectionName:1, path:1, url:1});
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

const sortByPosition = (data) => {
 for(let key in data){
    data[key].sort((a, b) => {
        return a.position - b.position;
    });
 }
    return data 
}
const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})


