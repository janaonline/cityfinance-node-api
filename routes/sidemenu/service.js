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
const ticks = {
    "green": "../../../assets/form-icon/checked.svg",
    "red": "../../../assets/form-icon/cancel.svg"
}

let FormModelMapping = {
    "AnnualAccountData": ObjectId("62aa1b04729673217e5ca3aa"),
    "UtilizationReport": ObjectId("62aa1c96c9a98b2254632a8a"),
    "PFMSAccount": ObjectId("62aa1cc9c9a98b2254632a8e"),
    
}

const calculateTick = (tooltip) => {
    if (tooltip == StatusList.Not_Started || tooltip == StatusList.In_Progress || tooltip == StatusList.Rejected_By_State || tooltip == StatusList.Rejected_By_MoHUA) {
        return ticks['red']
    } else {
        return ticks['green']
    }

}

const calculateStatus = (status, actionTakenByRole, isDraft) => {
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

const findStatusAndTooltip = (formData, formId, modelName) => {
    
    let status = modelName == 'XVFcGrantULBForm' ? formData?.waterManagement?.status  : formData.status;
    let actionTakenByRole = formData.actionTakenByRole;
    let isDraft = modelName == 'XVFcGrantULBForm' ? !formData.isCompleted : formData.isDraft;
    let tooltip = calculateStatus(status, actionTakenByRole, isDraft);
    let tick = calculateTick(tooltip)

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

                output.push(findStatusAndTooltip(formData, FormModelMapping[el['modelName']] , el['modelName']))
            }
        }
    }

    let data = await Sidemenu.find({ year: ObjectId(year), role: role }).lean()
    if (data.length) {
        // delete the non applicable entries
        if(isUA == 'Yes'){
           data = data.filter(el => el.category != 'Performance Conditions')
        }else{
            data = data.filter(el => el.category != 'Million Plus City Challenge Fund')
        }

        // add the formStatus and tooltip
data.forEach((el,)=> {
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
    
})        
    //group the data 
        data = groupByKey(data, "category")
    }
    res.status(200).json({
        success: true,
        data: data
    })
})

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

const groupByKey = (list, key) => list.reduce((hash, obj) => ({ ...hash, [obj[key]]: (hash[obj[key]] || []).concat(obj) }), {})


