const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const ObjectId = require('mongoose').Types.ObjectId;
const IndicatorLineItem = require('../../models/indicatorLineItems')
const {findPreviousYear} = require('../../util/findPreviousYear')
const Year = require('../../models/Year')
const {groupByKey} = require('../../util/group_list_by_key')
const SLB = require('../../models/XVFcGrantForm')
function response(form, res, successMsg ,errMsg){
    if(form){
        return res.status(200).json({
            status: true,
            message: successMsg,
            data: form,
        });
    }else{
        return res.status(400).json({
            status: false,
            message: errMsg
        });
   }
}
function rejectResponse(res, errMsg){
    return res.status(400).json({
        status: false,
        message: errMsg
    })
}

module.exports.createOrUpdateForm = async (req, res) =>{
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = {...data};
       
        formData['actionTakenBy'] = ObjectId(user._id);
        formData['actionTakenByRole'] = "ULB";
        formData['status'] = "PENDING"

        if(!(data.ulb && data.design_year )){
            return res.status(400).json({
                status: false,
                message: "Ulb and design year is mandatory"
            });    
        }
        
            formData.ulb = ObjectId(formData.ulb);
            formData.design_year = ObjectId(formData.design_year);
        
        
        const condition = {};
        condition.ulb = data.ulb;
        condition.design_year = data.design_year;
        
      
            const submittedForm = await TwentyEightSlbsForm.findOne(condition).lean();
           

            if ( submittedForm && submittedForm.isDraft) {//update already existing form
                if(formData.isDraft){
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    if(!updatedForm) rejectResponse(res, "form not updated")
                   return res.status(200).json({
                    success: true,
                    data: updatedForm,
                    message:"Form Updated"
                   })
                } else {//final submit already existing form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                 if(formData.data.length == 28){
                    let currentData = {}
                    Object.assign(currentData,formData ) 

                    formData['history'] = submittedForm['history']
                    formData['history'].push(currentData)
                    // formData['history'].push(formData) 
                    
delete formData['_id']
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        formData,
                        
                    );
                    if(!updatedForm) rejectResponse(res, "form not created")
                    return res.status(200).json({
                        success: true,
                        data: updatedForm,
                        message:"Form Saved"
                       })
                 }else{
                    return res.status(400).json({
                        success: false,
                        message:"Cannot Final Submit with incomplete Data"
                    })
                 }
                  
                }
            }else {
                if(!submittedForm){
let newData = new TwentyEightSlbsForm(formData);
await newData.save()
return res.status(200).json({
success: true,
message:"Data Saved"
})
                }else if(submittedForm && !submittedForm.isDraft){
                    if(formData['actionTakenByRole'] == submittedForm['actionTakenByRole']){
                        return res.status(403).json({
                            success: false,
                            message:"Form Cannot be Resubmitted after Final Submit"
                        
                        })
                    }else{
                        // provide code for action
                    }
                }
            }
            
        } catch (error) {
        return res.status(400).json({
            status: false,
            message:error.message
        });
    }
}


module.exports.getForm = async (req, res) => {
    try {
        let userRole = req.decoded.role
        const data = req.query;
        const condition = {};
        if(!(data.ulb && data.design_year)){
            return res.status(400).json({
                status: false,
                message: "Design year and Ulb are mandatory"
            })
        }
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
      let yearData =   await Year.findOne({
            _id : ObjectId(data.design_year)
        }).lean()
        let prevYearVal = findPreviousYear(yearData.year);
        let prevYearData =   await Year.findOne({
            year : prevYearVal
        }).lean()
        let formData = await TwentyEightSlbsForm.findOne(condition, { history: 0} ).lean()
        
        if(formData){
            formData['data'].forEach(el=>{
                if(!formData['isDraft']){
                    el['targetDisable'] = true;
                    el['actualDisable'] = true;
                    formData['popDisable'] = true;
                }
                if(userRole != 'ULB'){
                    el['targetDisable'] = true;
                    el['actualDisable'] = true;
                    formData['popDisable'] = true;
                }
            })
            let groupedData = groupByKey(formData['data'], "type")
        formData['data'] = groupedData;
          return  res.status(200).json({
                success: true,
                data: formData
               })
        }else{
      let slbData =       await SLB.findOne({ulb: ObjectId(data.ulb), design_year: ObjectId("606aaf854dff55e6c075d219") }).lean()
      let pipedSupply, waterSuppliedPerDay, reduction, houseHoldCoveredWithSewerage
      if(slbData){
        pipedSupply =slbData.waterManagement.houseHoldCoveredPipedSupply.target['2223']
        waterSuppliedPerDay =slbData.waterManagement.waterSuppliedPerDay.target['2223']
        reduction =slbData.waterManagement.reduction.target['2223']
        houseHoldCoveredWithSewerage =slbData.waterManagement.houseHoldCoveredWithSewerage.target['2223']
      }
let lineItems = await IndicatorLineItem.find().lean();
let obj = {
   targetDisable: false, 
   actualDisable: false, 
    question:"",
    type:"",
    actual: {
        year:prevYearData._id,
        value:""
    },
    target_1: {
        year:ObjectId(data.design_year),
        value:""
    },

}
let dataArr = []
lineItems.forEach(el => {
    let targ = null ;
    switch (el['_id'].toString()) {
        case "6284d6f65da0fa64b423b52a":
            targ = houseHoldCoveredWithSewerage ?? null
            break;
            case "6284d6f65da0fa64b423b53a":
                targ = pipedSupply ?? null
                break;
                case "6284d6f65da0fa64b423b53c":
                    targ = waterSuppliedPerDay
                    break;
                    case "6284d6f65da0fa64b423b540":
                        targ = reduction
                        break;
    
        default:
            break;
    }
obj['unit'] = el['unit'];
obj['range'] = el['range'];
obj['indicatorLineItem'] = el['_id'];
obj['question'] = el['name'];
obj['type'] = el['type'];
obj['actual']['value'] = "";
obj['target_1']['value'] = targ ?? "" ;
obj['targetDisable'] = targ || userRole != 'ULB' ? true : false
obj['actualDisable'] = userRole != 'ULB' ? true : false
dataArr.push(obj)
obj = {
targetDisable : false,
actualDisable : false,
    question:"",
    unit:"",
    range:"",
    type : "",
    actual: {
        year:prevYearData._id,
        value:""
    },
    target_1: {
        year:ObjectId(data.design_year),
        value:""
    },

}
})
let groupedData = groupByKey(dataArr, "type")

          let output = {}

         
          Object.assign(output,{"water supply" : groupedData['water supply'],"sanitation": groupedData['sanitation'], "solid waste": groupedData['solid waste'], "storm water" : groupedData['storm water']}   )
          
           
       return     res.status(200).json({
            success: true,
            data: {
                data :  output,
                population: 0
            } 
           })
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}