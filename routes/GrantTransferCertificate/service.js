const request = require('request')
const GrantTransferCertificate = require('../../models/GrantTransferCertificate');
const StateGTCCertificate = require('../../models/StateGTCertificate');
const ObjectId = require("mongoose").Types.ObjectId;
const Ulb = require('../../models/Ulb')
const {checkForUndefinedVaribales,mutuateGetPayload,getFlatObj} = require("../../routes/CommonActionAPI/service")
const {getKeyByValue,saveFormHistory} = require("../../util/masterFunctions");
const { years } = require('../../service/years');
const GtcInstallmentForm = require("../../models/GtcInstallmentForm")
const TransferGrantDetailForm = require("../../models/TransferGrantDetailForm")
const {grantsWithUlbTypes,installment_types,singleInstallmentTypes} = require("./constants")
const FormsJson = require("../../models/FormsJson");

let gtcYears = ["2018-19","2019-20","2021-22","2022-23"]
let GtcFormTypes = [
    "nonmillion_untied",
    "million_tied",
    "nonmillion_tied"
]
let alerts = {
    "prevForm":"Your previous year's GTC form is not complete. <a href=https://democityfinance.dhwaniris.in/upload-annual-accounts target=\"_blank\">Click Here!</a> to access previous year form.",
    "installmentMsg":(year)=>{
        return `1st Installment (${year}) GTC has to be uploaded first before uploading 2nd Installment (${year}) GTC`
    }
}

let warnings = {
    "electedMpcToMpc" :"Total Elected MPCs should be less than equal to Total MPCs",
    "electedNmpcToNmpc" :"Total Elected NMPCs should be less than equal to Total NMPCs",
    "transferAmtMtch":"Amount transferred should be equal to amount received.",
    "intTransferAmtMtch":"Amount transferred should be equal to amount received."
}
function response(form, res, successMsg, errMsg) {
    if (form) {
        return res.status(200).json({
            status: true,
            message: successMsg,
            data: form,
        });
    } else {
        return res.status(400).json({
            status: false,
            message: errMsg
        });
    }
}
module.exports.getForm = async (req, res) => {
    try {

        const data = req.query;
        const condition = {};
        const ulb = req.decoded.ulb;
        let actionTakenByRole = req.decoded.role;

        condition.design_year = data.design_year;
        condition.state = data.state;
        let mpc = false;
        let isUA = false
        if (ulb) {
            let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) }).lean();
            mpc = ulbData?.population > 1000000 ? true : false;
            isUA = ulbData?.isUA == 'Yes' ? true : false
        }
        let conditionPrevOne =
        {
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "2"
        }
        let conditionPrevTwo =
        {
            state: data.state,
            design_year: ObjectId("606aaf854dff55e6c075d219"),
            installment: "1",
        }

        if (data.design_year !== ObjectId("606aaf854dff55e6c075d219")) {
            conditionPrevTwo['status'] = "APPROVED"
            conditionPrevOne['status'] = "APPROVED"
        }

        const prevFormData = await StateGTCCertificate.findOne(conditionPrevOne).lean();
        const prevFormDataMillionTied = await StateGTCCertificate.findOne(conditionPrevTwo).lean();
        let obj = {
            type: "",
            file: {
                name: "",
                url: ""
            },
            year: "",
            state: "",
            design_year: "",
            rejectReason: "",
            status: "",
            installment: "",
            createdAt: "",
        };
        let result = [];
        if (prevFormDataMillionTied) {
            if (prevFormDataMillionTied?.million_tied) {
                obj["type"] = "million_tied";
                obj["file"]["name"] = prevFormDataMillionTied["million_tied"]["pdfName"];
                obj["file"]["url"] = prevFormDataMillionTied["million_tied"]["pdfUrl"];
                obj["year"] = prevFormDataMillionTied["design_year"];
                obj["state"] = prevFormDataMillionTied["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormDataMillionTied["million_tied"]["rejectReason"];
                obj["status"] = prevFormDataMillionTied["million_tied"]["status"];
                obj["installment"] = 1;
                obj['createdAt'] = prevFormDataMillionTied['createdAt'];
                obj["key"] = `million_tied_2021-22_1`
                result.push(JSON.parse(JSON.stringify(obj)));
            }
        }
        if (prevFormData) {
            if (prevFormData?.nonmillion_tied) {
                obj["type"] = "nonmillion_tied";
                obj["file"]["name"] = prevFormData["nonmillion_tied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_tied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_tied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_tied"]["status"];
                obj["installment"] = 2;
                obj['createdAt'] = prevFormData['createdAt'];
                obj["key"] = `nonmillion_tied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            }
            if (prevFormData?.nonmillion_untied) {
                obj["type"] = "nonmillion_untied";
                obj["file"]["name"] = prevFormData["nonmillion_untied"]["pdfName"];
                obj["file"]["url"] = prevFormData["nonmillion_untied"]["pdfUrl"];
                obj["year"] = prevFormData["design_year"];
                obj["state"] = prevFormData["state"];
                obj["design_year"] = "606aafb14dff55e6c075d3ae";
                obj["rejectReason"] = prevFormData["nonmillion_untied"]["rejectReason"];
                obj["status"] = prevFormData["nonmillion_untied"]["status"];
                obj["installment"] = 2;
                obj['createdAt'] = prevFormData['createdAt'];
                obj["key"] = `nonmillion_untied_2021-22_2`
                result.push(JSON.parse(JSON.stringify(obj)))
            }
        }

        let form = await GrantTransferCertificate.find(condition, { history: 0 }).lean();

        form = JSON.parse(JSON.stringify(form))
        form.forEach((entity) => {
            if (entity.year.toString() == "606aadac4dff55e6c075c507") {
                entity.key = `${entity.type}_2020-21_${entity.installment}`
            }

            if (entity.year.toString() == ObjectId("606aaf854dff55e6c075d219")) {
                entity.key = `${entity.type}_2021-22_${entity.installment}`
            }

            if (entity.year.toString() == "606aafb14dff55e6c075d3ae") {
                entity.key = `${entity.type}_2022-23_${entity.installment}`
            }
        })

        //remove old form data if present in new form using key
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < form.length; j++) {
                if (result[i]?.key === form[j]?.key) {
                    result.splice(i, 1);
                }
            }
        }
        
        let forms = [...form, ...result]
        let output = [];
        if (ulb) {
            if (forms.length) {
                forms.forEach((el) => {
                    if (mpc) {
                        if (el["type"] == "million_tied") output.push(el);
                    } else if (!mpc && isUA) {
                        if (
                            el["type"] == "million_tied" ||
                            el["type"] == "nonmillion_tied" ||
                            el["type"] == "nonmillion_untied"
                        )
                            output.push(el);
                    } else if (!mpc && !isUA) {
                        if (
                            el["type"] == "nonmillion_tied" ||
                            el["type"] == "nonmillion_untied"
                        )
                            output.push(el);
                    }
                });
            }
            if (output) {
                return res.status(200).json({
                    status: true,
                    data: output,
                });
            } else {
                return res.status(200).json({
                    status: true,
                    message: "Form not found"

                })
            }

        }

        if (forms) {
            //removing status and file when mohua is logged in to approve/reject
            for (let i = 0; i < forms.length; i++) {
                let form = forms[i];
                if (form.status === "PENDING" && actionTakenByRole === "MoHUA") {
                    delete form['rejectReason_mohua'];
                    delete form['responseFile_mohua'];
                }
            }
            return res.status(200).json({
                status: true,
                data: forms,
            });

        } else {
            return res.status(200).json({
                status: true,
                message: "Form not found"

            })
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };

        if (formData.state) {
            formData.state = ObjectId(formData.state);
        }
        if (formData.design_year) {
            formData.design_year = ObjectId(formData.design_year);
        }

        const { _id: actionTakenBy, role: actionTakenByRole } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['stateSubmit'] = ""

        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        if (data.state && data.design_year) {
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false) {//Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData['stateSubmit'] = new Date();
                    const form = await GrantTransferCertificate.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await GrantTransferCertificate.findOneAndUpdate(
                            condition,
                            { $push: { "history": formData } },
                            { new: true, runValidators: true }
                        )
                        return response(addedHistory, res, "Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                } else {
                    if ((!submittedForm) && formData.isDraft === true) { // create as draft
                        const form = await GrantTransferCertificate.create(formData);
                        return response(form, res, "Form created.", "Form not created");
                    }
                }
            }
            if (submittedForm && submittedForm.isDraft === true) { //form exists and saved as draft
                if (formData.isDraft === true) { //  update form as draft
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        { $set: formData },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form created.", "Form not updated");
                } else { // submit form i.e. isDraft=false
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData['stateSubmit'] = new Date();
                    const updatedForm = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        {
                            $push: { "history": formData },
                            $set: formData
                        },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form updated.", "Form not updated.")
                }
            }
        }
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}

module.exports.createForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };

        if (formData.state) {
            formData.state = ObjectId(formData.state);
        }
        if (formData.design_year) {
            formData.design_year = ObjectId(formData.design_year);
        }
        if (formData.year) {
            formData.year = ObjectId(formData.year);
        }

        const { _id: actionTakenBy, role: actionTakenByRole } = user;
        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = "STATE";
        formData['stateSubmit'] = ""

        const condition = {};
        condition.state = data.state;
        condition.design_year = data.design_year;
        condition.installment = data.installment;
        condition.year = data.year;
        condition.type = data.type;
        if (data.state && data.design_year) {
            const submittedForm = await GrantTransferCertificate.findOne(condition)
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "STATE") {      //Form already submitted
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else if (!submittedForm) {
                formData['stateSubmit'] = new Date();
                const form = await GrantTransferCertificate.create(formData);
                if (form) {//add history
                    formData['createdAt'] = form.createdAt;
                    formData['modifiedAt'] = form.modifiedAt;
                    let addedHistory = await GrantTransferCertificate.findOneAndUpdate(
                        condition,
                        { $push: { history: formData } },
                        { new: true }
                    );
                    if (!addedHistory) {
                        return res.status(400).json({
                            status: false,
                            message: "History not saved."
                        })
                    }
                    return res.status(200).json({
                        status: true,
                        message: "File saved.",
                        data: addedHistory
                    });
                } else {
                    return res.status(400).json({
                        status: false,
                        message: "Form not saved."
                    })
                }
            } else if (submittedForm && submittedForm.status === "REJECTED") {
                formData['createdAt'] = submittedForm.createdAt;
                formData['modifiedAt'] = new Date();
                formData.modifiedAt.toISOString();
                formData['stateSubmit'] = new Date();
                const form = await GrantTransferCertificate.findOneAndUpdate(
                    condition,
                    {
                        $set: formData,
                        $push: { "history": formData }
                    },
                    { new: true, runValidators: true }
                );
                return response(form, res, "Form updated", "Form not updated")
            } else if (submittedForm && submittedForm.status === "APPROVED") {
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted"
                })
            }
        }

    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        });
    }
}
module.exports.fileDeFuncFiles = async (req, res) => {
    let query = [
        {
            $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state"
            }
        },
        { $unwind: "$state" },
        {
            $project: {
                _id: "$state._id",
                year: "$design_year",
                stateName: "$state.name",
                stateCode: "$state.code",
                responseFile_state: "$responseFile_state.url",
                responseFile_mohua: "$responseFile_mohua.url",
                responseFile: "$responseFile.url",
                file: "$file.url"
            }
        }
    ]
    let data = await GrantTransferCertificate.aggregate(query);
    let documnetcounter = 1;
    working = 0;
    notWorking = 0;
    let arr = []
    let target = data.length;
    let skip = 0;
    let batch = 150;
    while (skip <= target) {
        const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
        await Promise.all(
            slice.map(async el => {
                for (let key in el) {

                    if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                        documnetcounter++;
                        let url = el[key];
                        console.log(url)
                        try {
                            let response = await doRequest(url);
                            let obj = {
                                stateName: "",
                                stateCode: "",
                                key: "",
                                url: "",
                                year: ""
                            }
                            obj.stateName = el.stateName;
                            obj.stateCode = el.stateCode;
                            obj.key = key;
                            obj.url = response
                            obj.year = el.year
                            console.log("ppp", obj)
                            arr.push(obj);
                        } catch (error) {
                            //console.log('working', error)
                            // `error` will be whatever you passed to `reject()` at the top
                        }
                    }
                }
                console.log("arr", arr)
            })
        )
        skip += batch;
    }
    return res.send({
        data: arr,
        number: arr.length,
        total: documnetcounter
    });
}

module.exports.OldFileDeFuncFiles = async (req, res) => {
    let query = [
        {
            $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state"
            }
        },
        { $unwind: "$state" },
        {
            $project: {
                _id: "$state._id",
                year: "$design_year",
                stateName: "$state.name",
                stateCode: "$state.code",
                million_tied: "$million_tied.pdfUrl",
                nonmillion_tied: "$nonmillion_tied.pdfUrl",
                nonmillion_untied: "$nonmillion_untied.pdfUrl"
            }
        }
    ]
    let data = await StateGTCCertificate.aggregate(query);
    // console.log("data",data)
    let documnetcounter = 1;
    working = 0;
    notWorking = 0;
    let arr = []
    let target = data.length;
    let skip = 0;
    let batch = 150;
    while (skip <= target) {
        const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
        await Promise.all(
            slice.map(async el => {
                for (let key in el) {

                    if (key != '_id' && key != 'stateName' && key != 'stateCode' && el[key]) {
                        documnetcounter++;
                        let url = el[key];
                        try {
                            let response = await doRequest(url);
                            console.log("suresh", response)
                            let obj = {
                                stateName: "",
                                stateCode: "",
                                key: "",
                                url: "",
                                year: ""
                            }
                            obj.stateName = el.stateName;
                            obj.stateCode = el.stateCode;
                            obj.key = key;
                            obj.url = response
                            obj.year = el.year
                            // console.log("ppp", obj)
                            arr.push(obj);
                        } catch (error) {
                            console.log('working', error)
                            // `error` will be whatever you passed to `reject()` at the top
                        }
                    }
                }
                // console.log("arr", arr)
            })
        )
        skip += batch;
    }
    return res.send({
        data: arr,
        number: arr.length,
        total: documnetcounter
    });
}

const checkForPreviousForms = async(design_year,state)=>{
    let validator = {
        valid:true,
        "message":""
    }
    try{
         let year = parseInt(getKeyByValue(years,design_year))
         let prevYearName = (year-1).toString() + "-" +`${year.toString().slice(-2)}`
         let yearId = ObjectId(years[prevYearName])
         let gtcFormsLength = await GrantTransferCertificate.find({
            "design_year":yearId,
            "state":ObjectId(state),            
         }).countDocuments()
        console.log("gtcFormsLength :: ",gtcFormsLength)
        if(gtcFormsLength < 8){
            validator.valid = false
            validator.message = alerts['prevForm']
        }
    }
    catch(err){
        console.log("error in checkForPreviousForms ::",err.message)
    }
    return validator;
}

const getManipulatedJson = async(installment,type,design_year,formJson,fieldsTohide,state)=>{
    let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year"]
    let mformObject = {
        "language":[],
      }
    try{
        let file = {
            "name":"",
            "url":""
        }
        let gtcForm = await GrantTransferCertificate.findOne({
            year:ObjectId(design_year),
            installment,
            type,
            state
        },{history:0}).lean() || {}
        gtcForm.currentFormStatus = gtcForm ? gtcForm.currentFormStatus : 1
        let yearName =  getKeyByValue(years,design_year)
        file = gtcForm && gtcForm.file  ? gtcForm.file : file
        let installmentForm = await GtcInstallmentForm.findOne({
            gtcForm:gtcForm?._id,
            formType:type,
            installment,
            year:yearName,
            state:ObjectId(state)
        }).populate("transferGrantdetail").lean()
        
        mformObject._id = installmentForm?._id
        if(installmentForm === null){
            installmentForm = await GtcInstallmentForm().toObject({virtuals:true})
            installmentForm.ulbType = grantsWithUlbTypes[type].ulbType
            installmentForm.grantType =   grantsWithUlbTypes[type].grantType
            installmentForm.year = getKeyByValue(years,design_year)
        }
        installmentForm.installment_type = installment_types[installment]
        let flattedForm = await getFlatObj(installmentForm)
        flattedForm['fieldsTohide'] = fieldsTohide
        flattedForm['disableFields'] = [4].includes(gtcForm?.currentFormStatus) ? true : false // to do logic to be implemented
        let questionJson = await mutuateGetPayload(formJson.data,flattedForm,keysToBeDeleted,"ULB")
        mformObject['language'] = questionJson
        // let questionD = questionJson[0]['question'].find(item => item.shortKey === "basic")['childQuestionData'][0]
        // let questionR = questionD.map(item => item.answer.answer)
        // console.log("questionD :: ",questionR)
        let data = {
            "data":[mformObject]
        }
        return {questionResponse:data,file}
    }
    catch(err){
        console.log("error in getManipulatedJson ::: ",err.message)
    }
}

const getJson = async(state,design_year)=>{
    try{
        let fieldsTohide = []
        let ulb = await Ulb.findOne({
            "state":ObjectId(state),
            "isMillionPlus":"Yes"
        },{isMillionPlus : 1})
        let stateIsMillion = ulb?.isMillionPlus === "Yes" ? true : false
        let forms = await FormsJson.find({
            "formId":{"$in":[11.1,7]}
        }).lean()
        let basicEmptyStructure = forms.find(item => item.formId === 11.1).data
        let formJson = forms.find(item => item.formId === 7)
        if(!stateIsMillion){
            stateIsMillion =  basicEmptyStructure.filter( item => item.type != "million_tied")
            fieldsTohide = ["totalMpc","totalElectedMpc"]
        }
        let returnableJson = []
        for(let carousel of basicEmptyStructure){
            for(let question of carousel.questions){
                question.questionresponse = ""
                let {questionResponse,file} = await getManipulatedJson(question.installment,question.type,design_year,{...formJson},fieldsTohide,ObjectId(state))                
                question.questionresponse = JSON.parse(JSON.stringify(questionResponse))
                question.file = file
            }
            returnableJson.push({...carousel})
            
        }
        return {json:[...returnableJson],stateIsMillion:stateIsMillion}
    }
    catch(err){
        console.log("error in getJson ::: ",err.message)
        return []
    }
}
module.exports.getInstallmentForm = async(req,res,next)=>{
    let response = {
        success:false,
        message:"",
        data:[],
        errors:[]
    }
    try{
        let responseData = []
        let {design_year,state,formType} = req.query
        let validator = await checkForUndefinedVaribales({
            "design year":design_year,
            "state":state
        })
        if(!validator.valid) { 
            response.message = validator.message
            return res.json(response)
        }
        let formValidator = await checkForPreviousForms(design_year,state)
        if(!formValidator.valid){
            response.message = formValidator.message
            return res.json(response)
        }
        response.success = true
        response.message = ""
        let {json,stateIsMillion} = await getJson(state,design_year)
        response.data = json
        response.stateIsMillion = stateIsMillion
    }
    catch(err){
        console.log("error in getInstallmentForm ::: ",err.message)
        if(["demo","staging"].includes(process.env.ENV)){
            response.message = err.message
        }
    }
    return res.json(response)
}

async function checkPreviousInstallment(params){
    let validator = {
        valid : true,
        message:""
    }
    try{
        let {installment,year,type,isDraft,status,financialYear,design_year,state} = params
        let prevInstallment = parseInt(installment) - 1
        if(prevInstallment <= 0 || singleInstallmentTypes.includes(type)){
            return validator
        }
        let yearName = getKeyByValue(years,year)
        let prevGtcForm = await GrantTransferCertificate.findOne({
            installment : prevInstallment,
            year: ObjectId(year),
            financialYear:ObjectId(financialYear),
            state:ObjectId(state)
        })
        if(prevGtcForm == null){
            validator.valid = false
            validator.message = alerts.installmentMsg(yearName)
            return validator
        }

    }
    catch(err){
        console.log("error in checkPreviousInstallment ::: ",err.message)
    }
}

async function checkValidationsInstallmentForm(payload,transferDetail){
    let validator = {
        valid : true,
        "message":"",
        "errors":[]
    }
    try{
        if(payload['totalElectedNmpc'] != undefined && payload['totalNmpc']  != undefined ){
            if(parseFloat(payload['totalElectedNmpc']) > parseFloat(payload['totalNmpc'])){
                validator.valid = false
                validator.errors.push(warnings['electedNmpcToNmpc'])
            }
        }
        if(payload['totalElectedMpc']  != undefined && payload['totalMpc']  != undefined){
            if(parseFloat(payload['totalElectedMpc']) > parseFloat(payload['totalMpc']) ){
                validator.valid = false
                validator.errors.push(warnings['electedMpcToMpc'])
            }
        }
        if(payload['recAmount']  != undefined){
            let totalTransAmountSum = transferDetail.reduce((result,value) => parseFloat(result) + parseFloat(value.transAmount) ,0)
            if(totalTransAmountSum != payload['recAmount']){
                validator.valid = false
                validator.errors.push(warnings['transferAmtMtch'])
            }
        }
    }
    catch(err){
        validator.message = err.message
        console.log("error in checkValidationsInstallmentForm ::: ",err.message)
    }
    return validator
}

const appendFormId = async(transferGrantData,gtcInstallment)=>{
    try{
        let data = transferGrantData.map((item) => {
            item.installmentForm = gtcInstallment._id
            let insertedValues = {
                "insertOne":{
                    document:item
                }
            }
            return insertedValues
        })
        return data
    }
    catch(err){
        console.log("error in appendFormId ::: ",err.message)
    }
    return transferGrantData
}
async function handleInstallmentForm(params){
    let validator = {
        valid:true,
        message:"",
        errors:""
    }
    try{
        let {installment,year,type,status,financialYear,design_year,state,data,gtcFormId} = params
        year = getKeyByValue(years,year)
        let transferGrantData = data['transferGrantdetail']
        delete data['transferGrantdetail']
        data.grantType= grantsWithUlbTypes[type].grantType
        data.ulbType= grantsWithUlbTypes[type].ulbType
        let payload = {
            installment,
            year,
            formType:type,  
            gtcForm:ObjectId(gtcFormId) 
        }
        Object.assign(payload,data)
        console.log("data ::: ",data)
        let installmentValidatior = await checkValidationsInstallmentForm(payload,transferGrantData)
        if(!installmentValidatior.valid){
            validator.message = "Not valid"
            validator.valid = false
            validator.errors = installmentValidatior.errors
            return validator
        }
        let gtcInstallment = await GtcInstallmentForm.findOneAndUpdate({
            installment,
            year,
            formType:type,
            state:ObjectId(state)
        },payload,{upsert:true,new:true,runValidators: true})
        let totalTransAmount = transferGrantData.reduce((result,value) => parseFloat(result) + parseFloat(value.transAmount) ,0)
        let totalIntTransfer = transferGrantData.reduce((result,value) => parseFloat(result) + parseFloat(value.intTransfer) ,0)
        transferGrantData = await appendFormId(transferGrantData,gtcInstallment)
        //delete Previous data
        await TransferGrantDetailForm.deleteMany({
            installmentForm : gtcInstallment._id
        })
        // insert new Data
        let insertedData = await TransferGrantDetailForm.bulkWrite(transferGrantData)
        let grantDetailIds = Object.values(insertedData.insertedIds)
        // updateIds and total
        await GtcInstallmentForm.findOneAndUpdate({
            "_id":gtcInstallment._id,
            
        },{
            "transferGrantdetail":grantDetailIds,
            "totalIntTransfer":totalIntTransfer,
            "totalTransAmount":totalTransAmount
        })
        validator.valid = true
        validator.message = ""
    }
    catch(err){
        console.log("error in handleInstallmentForm ::: ",err.message)
        validator.message = "Not valid"
        validator.valid = false
        validator.errors = Object.keys(err.errors).map(item => err.errors[item]['properties']['message'])
    }
    return validator
}

async function getOrCreateFormId(params){
    try{
        let {installment,year,type,isDraft,status:currentFormStatus,financialYear,design_year,state,file} = params
        let gtcForm = await GrantTransferCertificate.findOneAndUpdate({
            installment,
            year:ObjectId(year),
            type,
            design_year:ObjectId(design_year),
            state:ObjectId(state)
        },{installment,
            year:ObjectId(year),
            type,
            design_year:ObjectId(design_year),
            state:ObjectId(state),
            currentFormStatus:currentFormStatus,
            file:file
        },{upsert:true,new: true})
        return gtcForm._id
    }
    catch(err){
        console.log("error in getOrCreateFormId ::: ",err.message)
        return null
    }
}

module.exports.createOrUpdateInstallmentForm = async(req,res)=>{
    let response = {
        "success":true,
        "message" :"",
        "errors":[]
    }
    try{
        let {installment,type,isDraft,status,financialYear,year,state,statusId:currentFormStatus} = req.body
        let params = {
            "installment id":installment,
            "year id ":year,
            "type":type,
            "isDraft":isDraft,
            "status":status,
            "financialYear":financialYear,
            "year":year,
            "state":state
        }
        let validator = await checkForUndefinedVaribales(params)
        if(!validator.valid){
            response.success = false
            response.message = validator.message
            return res.status(405).json(response)
        }
        let installmentValidator = await checkPreviousInstallment(req.body)
        if(!installmentValidator.valid){
            response.message = installmentValidator.message
            response.success = false
            return res.status(405).json(response)
        }
        let gtcFormId = await getOrCreateFormId(req.body)
        console.log("gtcFormId ::: ",gtcFormId)
        if(!gtcFormId){
            throw {message:"something went wrong"}
        }
        req.body.gtcFormId = gtcFormId
        let installmentFormValidator = await handleInstallmentForm(req.body)
        // if(!installmentFormValidator.valid){
        //     response.success = false
        //     response.message = installmentFormValidator.message
        //     response.errors = installmentFormValidator.errors
        //     return res.status(405).json(response)
        // }
        await createHistory({isDraft,currentFormStatus,gtcFormId})
        response.success = true
        response.message = "Success"
        return res.status(200).json(response)

    }
    catch(err){
        console.log("error in createInstallmentForm :::: ",err)
        response.success = false
        response.message = "Something went wrong"
        if(["demo","staging"].includes(process.env.ENV)){
            response.message = err.message
        }
    }
    return res.status(400).json(response)
}

async function createHistory(params){
    try{
        let {isDraft,currentFormStatus,gtcFormId} = params
        if(!isDraft || currentFormStatus === 7){
            let payload = {
                "recordId":gtcFormId,
                "data":[]
            }
            let gtcForm = await GrantTransferCertificate.findOne({
                "_id":gtcFormId,
            }).lean()
            gtcForm['installmentForm'] = {}
            let installmentForm = await GtcInstallmentForm.findOne({
                "gtcForm" : gtcForm._id
            }).populate("transferGrantdetail").lean()
            gtcForm['installmentForm']  = installmentForm
            payload['data'] = [gtcForm]
            await saveFormHistory({body:payload})
        }
    }
    catch(err){
        console.log("error in createHistory ::: ",err.message)
    }
}

function doRequest(url) {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            method: 'HEAD'
        }
        request(options, (error, resp, body) => {
            if (!error && resp?.statusCode == 200) {
                reject(url)
            } else if (resp?.statusCode == undefined) {
                reject(url)
            } else {
                resolve(url);
            }
        });
    });
}

