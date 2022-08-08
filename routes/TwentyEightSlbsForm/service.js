const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const ObjectId = require('mongoose').Types.ObjectId;
const IndicatorLineItem = require('../../models/indicatorLineItems')
const {findPreviousYear} = require('../../util/findPreviousYear')
const Year = require('../../models/Year')
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
        delete formData['formResponse'];
        
        const {_id:actionTakenBy, role: actionTakenByRole} = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;

        if(!(data.ulb && data.design_year )){
            return res.status(400).json({
                status: false,
                message: "Ulb and design year is mandatory"
            });    
        }
        if(formData.ulb && formData.design_year){
            formData.ulb = ObjectId(formData.ulb);
            formData.design_year = ObjectId(formData.design_year);
        }
        
        const condition = {};
        condition.ulb = data.ulb;
        condition.design_year = data.design_year;
        
        let formResponse = []; // input array of all responses
        formResponse = data?.formResponse;

        let outputResponse = []; // output array of responses

        for(let i =0; i < formResponse.length; i++){
            formData["actual"] = { year: "", value: ""};
            formData['target_1'] = { year: "", value: ""}
            condition.indicatorLineItem = formResponse[i].indicatorLineItem;

            if(formResponse[i].indicatorLineItem){
                formData.indicatorLineItem = ObjectId(formResponse[i].indicatorLineItem);
            }
            if(formResponse[i].actual.year){
                formData.actual.year = ObjectId(formResponse[i].actual.year);
            }
            if(formResponse[i].actual.value){
                formData.actual.value = formResponse[i].actual.value;
            }
            if(formResponse[i].target_1.year){
                formData.target_1.year = ObjectId(formResponse[i].target_1.year);
            }
            if(formResponse[i].target_1.value){
                formData.target_1.value = formResponse[i].target_1.value;
            }            
            const submittedForm = await TwentyEightSlbsForm.findOne(condition);
            if ( (submittedForm) && submittedForm.isDraft === false ){//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            }else {
                if( (!submittedForm) && formData.isDraft === false){ // final submit in first attempt   
                    const form = await TwentyEightSlbsForm.create(formData);
                    if(form){
                        formData.createdAt = form.createdAt;
                        formData.modifiedAt = form.modifiedAt;
                        const addedHistory = await TwentyEightSlbsForm.findOneAndUpdate(
                            condition,
                            {$push: {"history": formData}},
                            {new: true, runValidators: true}
                        )
                        if(!addedHistory) rejectResponse(res, "history not added")
                        outputResponse.push(addedHistory);
                        continue;
                    } else {
                        rejectResponse(res, "Form not created.")
                    }
                } else if( !(submittedForm) && formData.isDraft === true){ // create as draft
                        const form = await TwentyEightSlbsForm.create(formData);
                        if(!form) rejectResponse(res, "form not created")
                        outputResponse.push(form)
                        continue;
                    }                          
            }

            if ( submittedForm && submittedForm.isDraft === true) {//update already existing form
                if(formData.isDraft === true){
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        {$set: formData},
                        {new: true, runValidators: true}
                    );
                    if(!updatedForm) rejectResponse(res, "form not created")
                    outputResponse.push(updatedForm);
                    continue;
                } else {//final submit already existing form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    const updatedForm = await TwentyEightSlbsForm.findOneAndUpdate(
                        condition,
                        {
                            $push:{"history":formData},
                            $set: formData
                        },
                        {new: true, runValidators: true}
                    );
                    if(!updatedForm) rejectResponse(res, "form not created")
                    outputResponse.push(updatedForm);
                    continue;
                }
            }
            
        }
        if(outputResponse.length){//send response when all forms created
            response(outputResponse, res, "Form created", "Form not created");
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
            res.status(200).json({
                success: true,
                data: formData
               })
        }else{
let lineItems = await IndicatorLineItem.find().lean();
let obj = {
    _id: "",
    question:"",
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
obj[_id] = el['_id'];
obj['question'] = el['name'];
obj['type'] = el['type'];
obj['actual']['value'] = "";
obj['target_1']['value'] = "";
dataArr.push(el)
obj = {
    _id: "",
    question:"",
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
           let output =  new TwentyEightSlbsForm();
           output['data'] = dataArr;
           res.status(200).json({
            success: true,
            data: output
           })
        }
        let pipeline = [
            { 
                $match:{
                    ulb: ObjectId(data.ulb),
                    design_year: ObjectId(data.design_year)
                }
            },
            {
                $lookup:{
                    from: "indicatorlineitems",
                    localField:"indicatorLineItem",
                    foreignField:"_id",
                    as:"indicatorLineItem"
                }
            },
            {
                 $unwind: "$indicatorLineItem"
            },
            {
                $project: {
                    history: 0,
                    __v:0,
                }
            }
        ]
        
        let form = await TwentyEightSlbsForm.aggregate(pipeline);
        form = JSON.parse(JSON.stringify(form))
        let typeArray = [];
        form.forEach((el)=>{
            let type = el["indicatorLineItem"]["type"];
            if(!typeArray.includes(type)){
                typeArray.push(type);
            }
        })
        let output = {};

        form.forEach((el)=>{
            let type = el["indicatorLineItem"]["type"];
            if(!output[type]){
                output[type] =  []
                output[type].push(el);
            } else {
                output[type].push(el);
            }
        });
        if (form){
            return res.status(200).json({
                status: true,
                message: "Form found.",
                data: output
            });
        } else {
            return res.status(400).json({
                status: true,
                message: "Form not found"
            });
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}