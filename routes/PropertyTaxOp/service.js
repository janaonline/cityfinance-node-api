const PropertyTaxOp = require('../../models/PropertyTaxOp')
const PropertyTaxOpMapper = require('../../models/PropertyTaxOpMapper')
const { response } = require('../../util/response');
const ObjectId = require('mongoose').Types.ObjectId
const { canTakenAction } = require('../CommonActionAPI/service')
const Service = require('../../service');
const { FormNames } = require('../../util/FormNames');
const User = require('../../models/User');
const { checkUndefinedValidations } = require('../../routes/FiscalRanking/service');
const { propertyTaxOpFormJson, financialYearTableHeader, specialHeaders,skipLogicDependencies } = require('./fydynemic')
const { isEmptyObj, isReadOnly } = require('../../util/helper');
const PropertyMapperChildData = require("../../models/PropertyTaxMapperChild");
const { years } = require('../../service/years');
const {saveFormHistory} = require("../../util/masterFunctions")
const {validationJson} = require("./validation")

const getKeyByValue = (object, value)=>{
    return Object.keys(object).find(key => object[key] === value);
  }

module.exports.getForm = async (req, res) => {
    try {
        const data = req.query;
        const condition = {};
        condition['ulb'] = data.ulb;
        condition['design_year'] = data.design_year;
        let role = req.decoded.role
        const form = await PropertyTaxOp.findOne(condition).lean();
        if (form) {
            Object.assign(form, { canTakeAction: canTakenAction(form['status'], form['actionTakenByRole'], form['isDraft'], "ULB", role) })
            return res.status(200).json({
                status: true,
                message: "Form found.",
                data: form
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

module.exports.createOrUpdateForm = async (req, res) => {
    try {
        const data = req.body;
        const user = req.decoded;
        let formData = {};
        formData = { ...data };
        const formName = FormNames["propTaxOp"];

        const { _id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;

        formData['actionTakenBy'] = ObjectId(actionTakenBy);
        formData['actionTakenByRole'] = actionTakenByRole;
        formData['ulbSubmit'] = "";

        if (formData.ulb) {
            formData['ulb'] = ObjectId(formData.ulb);
        }
        if (formData.design_year) {
            formData['design_year'] = ObjectId(formData.design_year);
        }
        if (actionTakenByRole === "ULB") {
            formData['status'] = "PENDING";
        }
        let validationResult = validate(data);
        if (validationResult.length !== 0) {
            for (let element of validationResult) {
                if (!element) {
                    return res.status(400).json({
                        status: false,
                        message: "Range should be in between 0 and 999999999999999"
                    })
                }
            }
        }

        let userData = await User.find({
            $or: [
                { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
                { isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
            ]
        }
        ).lean();

        let emailAddress = [];
        let ulbUserData = {},
            stateUserData = {};
        for (let i = 0; i < userData.length; i++) {
            if (userData[i]) {
                if (userData[i].role === "ULB") {
                    ulbUserData = userData[i];
                } else if (userData[i].role === "STATE") {
                    stateUserData = userData[i];
                }
            }
            if (ulbUserData && ulbUserData.commissionerEmail) {
                emailAddress.push(ulbUserData.commissionerEmail);
            }
            if (stateUserData && stateUserData.email) {
                emailAddress.push(stateUserData.email);
            }
            ulbUserData = {};
            stateUserData = {};
        }
        //unique email address
        emailAddress = Array.from(new Set(emailAddress))

        let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(
            ulbName,
            formName
        );
        let mailOptions = {
            Destination: {
                /* required */
                ToAddresses: emailAddress,
            },
            Message: {
                /* required */
                Body: {
                    /* required */
                    Html: {
                        Charset: "UTF-8",
                        Data: ulbTemplate.body,
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: ulbTemplate.subject,
                },
            },
            Source: process.env.EMAIL,
            /* required */
            ReplyToAddresses: [process.env.EMAIL],
        };


        const condition = {};
        condition['design_year'] = data.design_year;
        condition['ulb'] = data.ulb;

        if (data.ulb && data.design_year) {
            const submittedForm = await PropertyTaxOp.findOne(condition);
            if ((submittedForm) && submittedForm.isDraft === false &&
                submittedForm.actionTakenByRole === "ULB") {//Form already submitted    
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted."
                })
            } else {
                if ((!submittedForm) && formData.isDraft === false) { // final submit in first attempt   
                    formData["ulbSubmit"] = new Date();
                    const form = await PropertyTaxOp.create(formData);
                    formData.createdAt = form.createdAt;
                    formData.modifiedAt = form.modifiedAt;
                    if (form) {
                        const addedHistory = await PropertyTaxOp.findOneAndUpdate(
                            condition,
                            { $push: { "history": formData } },
                            { new: true, runValidators: true }
                        )
                        if (addedHistory) {
                            //email trigger after form submission
                            Service.sendEmail(mailOptions);
                        }
                        return response(addedHistory, res, "Form created.", "Form not created")
                    } else {
                        return res.status(400).json({
                            status: false,
                            message: "Form not created."
                        })
                    }
                } else {
                    if ((!submittedForm) && formData.isDraft === true) { // create as draft
                        const form = await PropertyTaxOp.create(formData);
                        return response(form, res, "Form created", "Form not created");
                    }
                }
            }

            if (submittedForm && submittedForm.status !== "APPROVED") {
                if (formData.isDraft === true) {           //save form as draft to already created form
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        { $set: formData },
                        { new: true, runValidators: true }
                    );
                    return response(updatedForm, res, "Form created.", "Form not updated");
                } else { //save form as final submission to already created form
                    formData.createdAt = submittedForm.createdAt;
                    formData.modifiedAt = new Date();
                    formData.modifiedAt.toISOString();
                    formData["ulbSubmit"] = new Date();
                    const updatedForm = await PropertyTaxOp.findOneAndUpdate(
                        condition,
                        {
                            $push: { "history": formData },
                            $set: formData
                        },
                        { new: true, runValidators: true }
                    );
                    if (updatedForm) {
                        //email trigger after form submission
                        Service.sendEmail(mailOptions);
                    }
                    return response(updatedForm, res, "Form updated.", "Form not updated.")
                }
            }
            if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB"
                && submittedForm.isDraft === false) {
                return res.status(200).json({
                    status: true,
                    message: "Form already submitted"
                })
            }
        }
        return res.status(400).json({
            status: true,
            message: "ulb and design year are mandatory"
        });
    } catch (error) {
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }

}

function
    validate(data) {
    let result = [];
    if (data.collection2019_20) {
        result.push(data.collection2019_20 >= 0 && data.collection2019_20 < 999999999999999);
    } else if (data.collection2020_21) {
        result.push(data.collection2020_21 >= 0 && data.collection2020_21 < 999999999999999);
    } else if (data.collection2021_22) {
        result.push(data.collection2021_22 >= 0 && data.collection2021_22 < 999999999999999);
    } else if (data.target2022_23) {
        result.push(data.target2022_23 >= 0 && data.target2022_23 < 999999999999999);
    }
    return result;
}
//// New year
async function removeIsDraft(params){
    try{
        let { ulbId, design_year } = params
        let condition = { ulb: ObjectId(ulbId), design_year: ObjectId(design_year) };
        await PropertyTaxOp.findOneAndUpdate(condition,{
            "isDraft":true
        }).lean();
    }
    catch(err){
        console.log("error in removeIsDraft :::: ",err.message)
    }
}

async function createHistory(params){
    try{
        let { ulbId, actions, design_year, isDraft,formId,currentFormStatus } = params
        if(isDraft == false || currentFormStatus ===7){
            let payload = {
                "recordId":formId,
                "data":[]
            }
            let ptoForm = await PropertyTaxOp.find({"_id":formId}).lean()
            let mapperForm = await PropertyTaxOpMapper.find({ ptoId: ObjectId(formId) }).populate("child").lean();
            ptoForm[0]['ptoMapperData'] = mapperForm
            payload['data'] = ptoForm
            await saveFormHistory({
                body:payload
            })
        }

    }
    catch(err){
        console.log("error in createHistory ::: ",err.message)
    }
}

module.exports.createOrUpdate = async (req, res) => {
        let { ulbId, actions, design_year, isDraft } = req.body
    try {
        let { role, _id: userId } = req.decoded
        let response = {}
        let formIdValidations = await checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId);
        let formId = formIdValidations.formId;
        await checkUndefinedValidations({ "ulb": ulbId, "formId": formId, "actions": actions, "design_year": design_year });
        await calculateAndUpdateStatusForMappers(actions, ulbId, formId, design_year, true, isDraft)
        response.success = true
        response.formId = formId
        response.message = "Form submitted successfully"
        let params = {...req.body}
        params['formId'] = formId
        params['currentFormStatus'] = 1
        await createHistory(params)
        return res.status(200).json(response)
    } catch (error) {
        await removeIsDraft(req.body)
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}


async function checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId) {
    return new Promise(async (resolve, reject) => {
        try {
            let validation = { message: "", valid: true, formId: null }
            let condition = { ulb: ObjectId(ulbId), design_year: ObjectId(design_year) };
            let formData = await PropertyTaxOp.findOne(condition, { "_id": 1 }).lean();
            if (!formData) {
                let form = await PropertyTaxOp.create(
                    {
                        ulb: ObjectId(ulbId),
                        design_year: ObjectId(design_year),
                        actionTakenByRole: role,
                        actionTakenBy: userId,
                        status: "PENDING",
                        isDraft
                    }
                )
                form.save()
                validation.message = "form created"
                validation.valid = true
                validation.formId = form._id
            } else {
                let form = await PropertyTaxOp.findOneAndUpdate(condition, { "isDraft": isDraft })
                if (form) {
                    validation.message = "form exists"
                    validation.valid = true
                    validation.formId = form._id
                }
                else {
                    validation.message = "No form exists for the form Id"
                    validation.valid = false
                }
            }
            resolve(validation)
        } catch (err) {
            validation.message = "Some error occured"
            if (err.code && err.code === 11000) {
                validation.message = "form for this ulb and design year already exists"
            }
            validation.valid = false
            console.log("error in checkIfFormIdExistsornot ::: ", err.message)
            reject(validation)
        }
    })
}

async function updateMapperModelWithChildValues(params){
    try{
        let {dynamicObj,formId,ulbId,updateForm,updatedIds,replicaCount} = params
        console.log("replicaCount :: ",replicaCount)
        let filter = {
            "ulb": ObjectId(ulbId),
            "ptoId": ObjectId(formId),
            "type": dynamicObj.key
        }
        let payload = { ...filter }
        if (updateForm) {
            upsert = true
            payload['status'] = dynamicObj.status
            payload['displayPriority'] = dynamicObj.position
            payload['child'] = updatedIds
            payload['replicaCount'] = replicaCount
        } 
        // else {
            // payload["status"] = dynamicObj.status
        // }
        await PropertyTaxOpMapper.findOneAndUpdate(filter, payload, { "upsert": upsert })

    }
    catch(err){
        console.log("error in updateMapperModelWithChildValues ::: ",err.message)
    }
}

async function updateChildrenMapper(params){
    let {ulbId,formId,yearData,updateForm,dynamicObj,textValue} = params
    let ids = []
    try{
        for (var years of yearData) {
            let upsert = false
            if (years.year) {
                let filter = {
                    "year": ObjectId(years.year),
                    "ulb": ObjectId(ulbId),
                    "ptoId": ObjectId(formId),
                    "type": years.type,
                    "replicaNumber":years.replicaNumber
                }
                let payload = { ...filter }
                if (updateForm) {
                    upsert = true
                    payload['value'] = years.value
                    payload['date'] = years.date
                    payload['file'] = years.file
                    payload['status'] = years.status
                    payload["replicaNumber"] = years.replicaNumber
                    payload['textValue'] = textValue
                    payload['label'] = years.label
                    payload['displayPriority'] = years.position
                } else {
                    payload["status"] = years.status
                }
                let updatedItem = await PropertyMapperChildData.findOneAndUpdate(filter, payload, { "upsert": upsert,new:true })
                if(updatedItem){
                    ids.push(updatedItem._id)
                }
                // console.log("updatedItem :: ",updatedItem._id)
            }
        }
        return ids
    }
    catch(err){
        console.log("error in updateChildrenMapper ::: ",err.message)
    }

}

async function handleChildrenData(params){
    let ids = []
    try{
        let {inputElement,ulbId,formId,updateForm,dynamicObj} = params
        if(inputElement?.child){
            let updIds = []
            for(let obj of inputElement.child){
                let yearData = obj.yearData
                let textValue = obj.value
                let updatedIds = await updateChildrenMapper({yearData,ulbId,formId,updateForm,dynamicObj,textValue})
                updIds = updIds.concat(updatedIds,ids)
            }
            params["updatedIds"] = updIds
            params['replicaCount'] = inputElement.replicaCount
            await updateMapperModelWithChildValues(params)
            return updIds
        }
    }
    catch(err){
        console.log("error in handleChildrenData ::: ",err.message)
    }
    return ids
}


function yearWiseValues(yearData){
    try{
        let sumObj = {}
        for(let yearObj of yearData){
            if(yearObj.year){
                let yearName = getKeyByValue(years,yearObj.year)
                try{
                    sumObj[yearName].push(yearObj.value ? parseFloat(yearObj.value) : 0 )
                }
                catch(err){
                    sumObj[yearName] = [parseFloat(yearObj.value ? parseFloat(yearObj.value) : 0)]
                }
            }
        }
        sumObj = Object.entries(sumObj).reduce((result, [key, value]) => ({
                ...result, 
                [key]: value.reduce((total, item) => total + item, 0)}) 
                , 
            {})
        return sumObj
    }
    catch(err){
        console.log("error in getYearWiseKeys :::: ",err.message)
    }
}

function getSumByYear(params){
    let {yearData,sumObj} = params
    try{
        for(let yearObj of yearData){
            if(yearObj.year){
                let yearName = getKeyByValue(years,yearObj.year)
                try{
                    sumObj[yearName].push(yearObj.value ? parseFloat(yearObj.value) : 0 )
                }
                catch(err){
                    sumObj[yearName] = [parseFloat(yearObj.value ? parseFloat(yearObj.value) : 0)]
                }
            }
        }
    }
    catch(err){
        console.log("error in getSumByYear ::: ",err.message)
    }
    // return sumObj
}



function getYearDataSumForValidations(keysToFind,data){
    let sumObj = {}
    try{
        for(let keyName of keysToFind){
            if(data[keyName]){
                if(!data[keyName].child ||  data[keyName].child.length === 0){
                    getSumByYear({
                        yearData:data[keyName].yearData,
                        sumObj
                    })
                }
                else{
                    // console.log("child case::::",keyName)
                    for(let childs of data[keyName].child){
                        getSumByYear({
                            yearData:childs.yearData,
                            sumObj:sumObj
                        })
                    }
                }
            }
        }  
        sumObj = Object.entries(sumObj).reduce((result, [key, value]) => ({
                ...result, 
                [key]: value.reduce((total, item) => total + item, 0)}) 
                , 
            {})
        return sumObj
    }
    catch(err){
        console.log("error in getYearDataForValidations ::: ",err.message)
    }
}

function compareValues(params){
    let validator = {
        "valid":true,
        "message":"",
        "errors":[]
    }
    try{
        let {sumOfrefVal,sumOfCurrentKey,logic,message} = params
        for(let key in sumOfrefVal){
            if(logic === "ltequal"){
                if(sumOfCurrentKey[key] > sumOfrefVal[key] ){
                   validator.valid = false
                   validator.errors.push(message) 
                   validator.message = message
                }
            }
            else if(logic === "sum"){
                if(sumOfCurrentKey[key] != sumOfrefVal[key] ){
                    validator.valid = false
                    validator.message = message
                    validator.errors.push(message) 
                 }
            }
        }
        
    }
    catch(err){
        console.log("error in compareValues :::")
    }
    return validator
}

async function handleMultipleValidations(params){
    let {data,validatorArray,dynamicObj} = params
    let valid = {
        "valid":true,
        "errors":"",
        "message":""
    }
    try{
        for(let validationObj of validatorArray){
            let keysToFind = validationObj.fields
            let sumOfrefVal = await getYearDataSumForValidations(keysToFind,data)
            let sumOfCurrentKey = await yearWiseValues(dynamicObj.yearData)
            let valueParams = {
                sumOfrefVal,
                sumOfCurrentKey,
                logic:validationObj.logic,
                message:validationObj.message
            }
            let compareValidator = compareValues(valueParams)
            if(!compareValidator.valid){
                return compareValidator
            }
        }
    }
    catch(err){
        console.log("error in handleMultipleValidations ::: ",err.message)
    }
    return valid
}

async function handleNonSubmissionValidation(params){
    let errors = {
        valid:true,
        message:"",
        errors:[]
    }
    try{
        let  {dynamicObj,yearArr,data} = params
        let validatorKeys = Object.keys(validationJson)
        if(validatorKeys.includes(dynamicObj.key)){
            let keysToFind = validationJson[dynamicObj.key].fields
            let logicType = validationJson[dynamicObj.key].logic
           if(logicType === "multiple"){
                let validatorArray = validationJson[dynamicObj.key].multipleValidations
                let childValidationParams = {
                    data,
                    validatorArray:validatorArray,
                    dynamicObj
                }
                let childValid = await  handleMultipleValidations(childValidationParams)
                if(!childValid.valid){
                    return childValid
                }   
           }
            else{
                let sumOfrefVal = await getYearDataSumForValidations(keysToFind,data)
                let sumOfCurrentKey = await yearWiseValues(dynamicObj.yearData)
                let valueParams = {
                    sumOfrefVal,
                    sumOfCurrentKey,
                    logic:validationJson[dynamicObj.key].logic,
                    message:validationJson[dynamicObj.key].message
                }
                let compareValidator = compareValues(valueParams)
                if(!compareValidator.valid){
                    return compareValidator
                }
            }
            
        }
    }
    catch(err){
        console.log("error in handleNonSubmissionValidation :: :",err.message)
    }
    return errors
}

async function calculateAndUpdateStatusForMappers(tabs, ulbId, formId, year, updateForm, isDraft) {
    try {
        let conditionalObj = {}
        for (var tab of tabs) {
            conditionalObj[tab._id.toString()] = {}
            let obj = tab.data
            let temp = {
                "comment": tab.feedback.comment,
                "status": []
            }
            for (var k in tab.data) {
                let dynamicObj = obj[k]
                let yearArr = obj[k].yearData
                let params = {
                    dynamicObj,
                    yearArr,
                    data:tab.data
                }
                if(!isDraft){
                    let validation = await handleNonSubmissionValidation(params)
                    if(!validation.valid){
                        throw {message:validation.message} 
                    }
                }
                let updatedIds = await handleChildrenData({inputElement:{...tab.data[k]},formId,ulbId,updateForm,dynamicObj})
                if (obj[k].yearData) {
                    
                    let status = yearArr.every((item) => {
                        if (Object.keys(item).length) {
                            return item.status === "APPROVED"
                        } else {
                            return true
                        }
                    })
                    temp["status"].push(status)
                    await updateQueryForPropertyTaxOp(yearArr, ulbId, formId, updateForm, dynamicObj,updatedIds)
                }
                conditionalObj[tab._id.toString()] = (temp)
            }
        }
        for (var tabName in conditionalObj) {
            if (conditionalObj[tabName].status.length > 0) {
                conditionalObj[tabName].status = conditionalObj[tabName].status.every(item => item == true)
            }
            else {
                conditionalObj[tabName].status = "NA"
            }
        }
        return conditionalObj
    } catch (err) {
        console.log(err)
        console.log("error in calculatAndUpdateStatusForMappers :: ", err.message)
        throw err
    }
}

// async function updatePropertyTaxOpForm(obj, ulbId, formId, year, updateForm, isDraft) {
//     try {
//         let filter = { "_id": ObjectId(formId) }
//         let payload = {}
//         for (let key in obj) {
//             if (updateForm) {
//                 payload[`${key}.value`] = obj[key].value
//                 payload[`${key}.status`] = obj[key].status
//             } else {
//                 let status = null
//                 if (obj[key].status) {
//                     status = obj[key].status
//                 }
//                 payload[`${key}.status`] = status
//             }
//         }
//         await PropertyTaxOp.findOneAndUpdate(filter, payload)
//     }
//     catch (err) {
//         console.log("Error in updatePropertyTaxOp ::: ", err)
//         throw err
//     }
// }

async function updateQueryForPropertyTaxOp(yearData, ulbId, formId, updateForm, dynamicObj,updatedIds) {
    try {
        for (var years of yearData) {
            let upsert = false
            if (years.year) {
                let filter = {
                    "year": ObjectId(years.year),
                    "ulb": ObjectId(ulbId),
                    "ptoId": ObjectId(formId),
                    "type": years.type
                }
                let payload = { ...filter }
                if (updateForm) {
                    upsert = true
                    payload['value'] = years.value
                    payload['date'] = years.date
                    payload['file'] = years.file
                    payload['status'] = years.status
                    payload['displayPriority'] = dynamicObj.position
                    payload['child'] = updatedIds
                } else {
                    payload["status"] = years.status
                }
                await PropertyTaxOpMapper.findOneAndUpdate(filter, payload, { "upsert": upsert })
            }
        }
    } catch (err) {
        if (err.type === 'ValidationError') {
            throw err
        }
    }
}

function createChildObjectsYearData(params){
    let {childs,isDraft,status} = params
    let yearData = []
    let yearJson =  {
        "key": "FY",
        "value": "11",
        "originalValue": "",
        "year": "",
        "type": "",
        "_id": null,
        "code": [],
        "date": null,
        "formFieldType": "number",
        "status": null,
        "bottomText": "",
        "label": "FY",
        "position": "0",
        "readonly": false
      }
    try{
        for(let child of childs){
            let yearName = getKeyByValue(years,child?.year.toString())
            let json = {...yearJson}
            json['key'] = json['key']+yearName
            json['label'] = child.label ? child.label :json['label'] + " " + yearName
            json['value'] = child.value
            json['year'] = child.year
            json['type'] = child.type
            json['file'] = child.file
            json['textValue'] = child.textValue
            json['readonly'] = isReadOnly({isDraft,status})
            json['replicaNumber'] = child.replicaNumber ? child.replicaNumber : child.replicaCount
            yearData.push(json)
        }
    }
    catch(err){
        console.log("error in createChildObjectsYearData ::: ",err.message)
    }
    return yearData
}

async function createFullChildObj(params){
    let {element,yearData,replicaCount} = params
    let childs = []
    let copiedFromKeys = Array.from(new Set(yearData.map((item => item.type))))
    try{
        let sampleJson = {
            "key": element.key,
            "value": "",
            "_id": null,
            "formFieldType": element.formFieldType,
            "readonly": true,
        }
        for(let i = 1; i<=replicaCount ; i++){
            let replicatedYear = yearData.filter(item => item.replicaNumber === i )
            for(let key of copiedFromKeys){
                let childObject = {...sampleJson}
                childObject.replicaNumber = i
                let yearData =  replicatedYear.filter(item =>item.type === key )
                childObject.value = yearData[0].textValue
                childObject.label = yearData[0]?.label
                childObject.position = yearData[0]?.displayPriority
                childObject.key = key
                childObject.yearData = yearData
                childObject.readonly = true
                childs.push(childObject)
            }
        }
    }
    catch(err){
        console.log("error in createFullChildObj ::: ",err.message)
    }
    return childs
}

async function appendChildValues(params){
    let {element,ptoMaper,isDraft,status} = params
    try{  
        if(element.child && ptoMaper){
            let childElement = ptoMaper.find(item => item.type === element.key)
            if(childElement && childElement.child){
                let yearData = []
                // console.log("childElement.key :: ",childElement.type)
                for(let key of childElement.child){
                    yearData   = await createChildObjectsYearData({
                        childs:childElement.child,
                        isDraft:isDraft,
                        status:status
                    })  
                }
                let params = {
                    yearData : yearData,
                    element:element,
                    replicaCount:childElement.replicaCount
                }
                let child = await createFullChildObj(params)
                element.replicaCount = childElement.replicaCount
                element.child = child
            }
        }
    }
    catch(err){
        console.log(err)
        console.log("error in appendChildValues ::: ",err.message)
    }
    return element
}

exports.getView = async function (req, res, next) {
    try {
        let condition = {};
        if (!req.query.ulb && !req.query.design_year) {
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
        condition = { ulb: ObjectId(req.query.ulb), design_year: ObjectId(req.query.design_year) };
        let ptoData = await PropertyTaxOp.findOne(condition, { history: 0 }).lean();
        let ptoMaper = null;
        if (ptoData) {
            ptoMaper = await PropertyTaxOpMapper.find({ ulb: ObjectId(req.query.ulb), ptoId: ObjectId(ptoData._id) }).populate("child").lean();
        }
        let fyDynemic = await propertyTaxOpFormJson();
        if (ptoData) {
            const { isDraft, status } = ptoData;
            for (let sortKey in fyDynemic) {
                if (sortKey !== "tabs" && ptoData) {
                    fyDynemic[sortKey] = ptoData[sortKey];
                } else {
                    for (const k of ['tabs']) {
                        let { data } = fyDynemic[k][0];
                        for (let el in data) {
                            let { yearData, mData } = data[el];
                            let childParams = {
                                element:data[el],
                                ptoMaper:ptoMaper,
                                isDraft:isDraft,
                                status:status
                            }
                            data[el] = await appendChildValues(childParams)
                            if (Array.isArray(yearData) && ptoMaper) {
                                for (const pf of yearData) {
                                    if (!isEmptyObj(pf)) {
                                        let d = ptoMaper.find(({ type, year }) => type === pf.type && year.toString() === pf.year);
                                        if (d) {
                                            pf.file ? (pf.file = d ? d.file : "") : d.date ? (pf.date = d ? d.date : "") : (pf.value = d ? d.value : "");
                                        }
                                        pf.readonly = isReadOnly({ isDraft, status })
                                    }
                                }
                            } else if (Array.isArray(mData) && ptoData.length) {
                                for (const dk of mData) {
                                    const { value, status } = ptoData[dk];
                                    dk['status'] = status;
                                    dk['value'] = value;
                                }
                            }
                        }
                    }
                }
            }
        }
        return res.status(200).json({ status: true, message: "Success fetched data!", data: { ...fyDynemic, financialYearTableHeader, specialHeaders ,skipLogicDependencies } });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something error wrong!" });
    }
}