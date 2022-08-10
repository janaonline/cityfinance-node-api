const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const ObjectId = require('mongoose').Types.ObjectId;
const IndicatorLineItem = require('../../models/indicatorLineItems')
const {findPreviousYear} = require('../../util/findPreviousYear')
const Year = require('../../models/Year')
const {groupByKey} = require('../../util/group_list_by_key')
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
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
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
        let formData = await TwentyEightSlbsForm.findOne(condition).lean()
        
        if(formData){
            let groupedData = groupByKey(formData['data'], "type")
        formData['data'] = groupedData;
          return  res.status(200).json({
                success: true,
                data: formData
               })
        }else{
let lineItems = await IndicatorLineItem.find().lean();
let obj = {
    
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
obj['unit'] = el['unit'];
obj['range'] = el['range'];
obj['indicatorLineItem'] = el['_id'];
obj['question'] = el['name'];
obj['type'] = el['type'];
obj['actual']['value'] = "";
obj['target_1']['value'] = "";
dataArr.push(obj)
obj = {
    _id: "",
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
           output = groupedData;
       return     res.status(200).json({
            success: true,
            data: output
           })
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}