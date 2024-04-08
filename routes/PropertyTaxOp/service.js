const PropertyTaxOp = require('../../models/PropertyTaxOp')
const PropertyTaxOpMapper = require('../../models/PropertyTaxOpMapper')
const { response } = require('../../util/response');
const ObjectId = require('mongoose').Types.ObjectId
const { canTakenAction, canTakenActionMaster } = require('../CommonActionAPI/service')
const Service = require('../../service');
const { FormNames, MASTER_STATUS_ID, MASTER_STATUS, MASTER_FORM_STATUS } = require('../../util/FormNames');
const User = require('../../models/User');
const { checkUndefinedValidations } = require('../../routes/FiscalRanking/service');
const { propertyTaxOpFormJson, skippableKeys, financialYearTableHeader,indicatorsWithNoyears ,  specialHeaders, skipLogicDependencies,childKeys,reverseKeys ,questionIndicators,sortPosition} = require('./fydynemic')
const { isEmptyObj, isReadOnly } = require('../../util/helper');
const PropertyMapperChildData = require("../../models/PropertyTaxMapperChild");
const { years } = require('../../service/years');
const { saveFormHistory } = require("../../util/masterFunctions")
const { validationJson, keysWithChild } = require("./validation");
const MasterStatus = require('../../models/MasterStatus');
const { saveStatusAndHistory } = require("../CommonFormSubmission/service");
const { concatenateUrls } = require('../../service/common');
const getKeyByValue = (object, value) => {
    return Object.keys(object).find(key => object[key] === value);
}
module.exports.getKeyByValue = getKeyByValue;

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
async function removeIsDraft(params) {
    try {
        let { ulbId, design_year } = params
        let condition = { ulb: ObjectId(ulbId), design_year: ObjectId(design_year) };
        await PropertyTaxOp.findOneAndUpdate(condition, {
            "isDraft": true,
            "currentFormStatus": MASTER_FORM_STATUS['IN_PROGRESS']
        }).lean();
    }
    catch (err) {
        console.log("error in removeIsDraft :::: ", err.message)
    }
}

async function createHistory(params,ptoForm,mapperForm) {
    try {
        let { ulbId, actions, design_year, isDraft, formId, currentFormStatus } = params
        let { role, _id } = params.decoded
        let payload = {
            "recordId": formId,
            "data": []
        }
        ptoForm[0]['ptoMapperData'] = mapperForm
        payload['data'] = ptoForm
        let historyParams = {
            masterFormId: formId,
            formBodyStatus: currentFormStatus,
            formSubmit: ptoForm,
            actionTakenByRole: role,
            actionTakenBy: _id,
            bodyData: ptoForm,
            formType: "PTO"

        }
        await saveStatusAndHistory(historyParams)

    }
    catch (err) {
        console.log("error in createHistory ::: ", err.message)
    }
}

module.exports.createOrUpdate = async (req, res) => {
    let { ulbId, actions, design_year, isDraft, currentFormStatus } = req.body
    try {
        let { role, _id: userId } = req.decoded
        let response = {}
        let formIdValidations = await checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId, currentFormStatus);
        let formId = formIdValidations.formId;
        let params = { ...req.body }
        params['formId'] = formId
        params['decoded'] = req.decoded
        let ptoForm = await PropertyTaxOp.find({ "_id": formId }).lean()
        let mapperForm = await PropertyTaxOpMapper.find({ ptoId: ObjectId(formId) }).populate("child").lean();
        await checkUndefinedValidations({ "ulb": ulbId, "formId": formId, "actions": actions, "design_year": design_year });
        await calculateAndUpdateStatusForMappers(actions, ulbId, formId, design_year, true, isDraft)
        await createHistory(params,ptoForm,mapperForm)
        response.success = true
        response.formId = formId
        response.message = "Form submitted successfully"
        // await createHistory(params)
        return res.status(200).json(response)
    } catch (error) {
        console.log(error)
        await removeIsDraft(req.body)
        return res.status(400).json({
            status: false,
            message: error.message
        })
    }
}


async function checkIfFormIdExistsOrNot(ulbId, design_year, isDraft, role, userId, currentFormStatus) {
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
                        currentFormStatus: currentFormStatus,
                        isDraft
                    }
                )
                form.save()
                validation.message = "form created"
                validation.valid = true
                validation.formId = form._id
            } else {
                let form = await PropertyTaxOp.findOneAndUpdate(condition, { "isDraft": isDraft, currentFormStatus: currentFormStatus })
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

async function updateMapperModelWithChildValues(params) {
    try {
        let { dynamicObj, formId, ulbId, updateForm, updatedIds, replicaCount } = params
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
            payload['type'] = dynamicObj.key
        }
        // else {
        // payload["status"] = dynamicObj.status
        // }
        await PropertyTaxOpMapper.findOneAndUpdate(filter, payload, { "upsert": upsert })

    }
    catch (err) {
        console.log("error in updateMapperModelWithChildValues ::: ", err.message)
    }
}

async function updateChildrenMapper(params) {
    let { ulbId, formId, yearData, updateForm, dynamicObj, textValue } = params
    let ids = []
    try {
        for (var years of yearData) {
            let upsert = false
            if (years.year) {
                let filter = {
                    "year": ObjectId(years.year),
                    "ulb": ObjectId(ulbId),
                    "ptoId": ObjectId(formId),
                    "type": years.type,
                    "replicaNumber": years.replicaNumber
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
                let updatedItem = await PropertyMapperChildData.findOneAndUpdate(filter, payload, { "upsert": upsert, new: true })
                if (updatedItem) {
                    ids.push(updatedItem._id)
                }
                // console.log("updatedItem :: ",updatedItem._id)
            }
        }
        return ids
    }
    catch (err) {
        console.log("error in updateChildrenMapper ::: ", err.message)
    }

}

async function handleChildrenData(params) {
    let ids = []
    try {
        let { inputElement, ulbId, formId, updateForm, dynamicObj } = params
        if (inputElement?.child) {
            let updIds = []
            for (let obj of inputElement.child) {
                let yearData = obj.yearData
                let textValue = obj.value
                let updatedIds = await updateChildrenMapper({ yearData, ulbId, formId, updateForm, dynamicObj, textValue })
                updIds = updIds.concat(updatedIds, ids)
            }
            params["updatedIds"] = updIds
            params['replicaCount'] = inputElement.replicaCount
            await updateMapperModelWithChildValues(params)
            return updIds
        }
    }
    catch (err) {
        console.log("error in handleChildrenData ::: ", err.message)
    }
    return ids
}


function yearWiseValues(yearData) {
    try {
        let sumObj = {}
        for (let yearObj of yearData) {
            if (yearObj.year) {
                let yearName = getKeyByValue(years, yearObj.year)
                try {
                    sumObj[yearName].push(yearObj.value ? parseFloat(yearObj.value) : 0)
                }
                catch (err) {
                    sumObj[yearName] = [parseFloat(yearObj.value ? parseFloat(yearObj.value) : 0)]
                }
            }
        }
        sumObj = Object.entries(sumObj).reduce((result, [key, value]) => ({
            ...result,
            [key]: value.reduce((total, item) => total + item, 0)
        })
            ,
            {})
        return sumObj
    }
    catch (err) {
        console.log("error in getYearWiseKeys :::: ", err.message)
    }
}

function getSumByYear(params) {
    let { yearData, sumObj } = params
    // console.log("yearData ::: ",yearData)
    try {
        for (let yearObj of yearData) {
            if (yearObj.year) {
                let yearName = getKeyByValue(years, yearObj.year)
                try {
                    sumObj[yearName].push(yearObj.value ? parseFloat(yearObj.value) : 0)
                }
                catch (err) {
                    sumObj[yearName] = [parseFloat(yearObj.value ? parseFloat(yearObj.value) : 0)]
                }
            }
        }
    }
    catch (err) {
        console.log("error in getSumByYear ::: ", err.message)
    }
    // return sumObj
}


function mergeChildObjectsYearData(childObjects) {
    try {
        let yearData = []
        let sumObj = {}
        for (let childs of childObjects) {
            yearData = childs.yearData
            getSumByYear({
                yearData: childs.yearData,
                sumObj
            })
        }
        sumObj = Object.entries(sumObj).reduce((result, [key, value]) => ({
            ...result,
            [key]: value.reduce((total, item) => total + item, 0)
        })
            ,
            {})
        // console.log("sumObj :: ",sumObj)
        yearData.forEach((item) => {
            item.value = sumObj[getKeyByValue(years, item.year.toString())] || ""
        })
        return yearData
    }
    catch (err) {
        console.log("error in mergeChildObjectsYearData ::: ", err.message)
    }
}

function assignChildToMainKeys(data) {
    let seperatedObject = { ...data }
    try {
        for (let key of Object.keys(keysWithChild)) {
            let element = { ...seperatedObject[key] }
            if (element.child) {
                for (let childElement of keysWithChild[key]) {
                    console.log("childElement :: ",childElement)
                    let filteredChildren = element.child.filter(item => item.key === childElement)
                    let yearData = [...mergeChildObjectsYearData(filteredChildren)]
                    seperatedObject[childElement] = {
                        "key": childElement,
                        "label": "",
                        "required": true,
                        yearData: yearData
                    }
                }
            }
        }
    }
    catch (err) {
        console.log("error in assignChildToMainKeys ::: ", err.message)
    }
    return seperatedObject
}


function getYearDataSumForValidations(keysToFind, payload) {
    let sumObj = {}
    let data = { ...payload }
    // console.log("payload ::: ",["othersValueWaterChrgDm"])
    // console.log("data ::: ",payload["othersValueWaterChrgDm"])
    try {
        for (let keyName of keysToFind) {
            if (data[keyName]) {
                if (!data[keyName].child || data[keyName].child.length === 0) {
                    getSumByYear({
                        yearData: data[keyName].yearData,
                        sumObj
                    })
                }
                else {
                    for (let childs of data[keyName].child) {
                        getSumByYear({
                            yearData: childs.yearData,
                            sumObj: sumObj
                        })
                    }
                }
            }
        }
        sumObj = Object.entries(sumObj).reduce((result, [key, value]) => ({
            ...result,
            [key]: value.reduce((total, item) => total + item, 0)
        })
            ,
            {})
        return sumObj
    }
    catch (err) {
        console.log("error in getYearDataForValidations ::: ", err.message)
    }
}

function compareValues(params) {
    let validator = {
        "valid": true,
        "message": "",
        "errors": []
    }
    try {
        let { sumOfrefVal, sumOfCurrentKey, logic, message } = params
        // console.log("sumOfrefVal :: ",sumOfrefVal)
        // console.log("sumOfCurrentKey ::: ",sumOfCurrentKey)
        // console.log(">>>>>>>>>>>>>>>>>>1")
        for (let key in sumOfrefVal) {
            // console.log(">>>>>>>>>>>>>>>>>>2")
            let refVal = parseFloat(sumOfrefVal[key].toFixed(2))
            let currenVal = parseFloat(sumOfCurrentKey[key].toFixed(2))
            if (logic === "ltequal") {
                // console.log("currenVal ::: ",currenVal)
                // console.log("refVal :::: ",refVal)
                if (currenVal > refVal) {
                    validator.valid = false
                    validator.errors.push(message)
                    validator.message = message
                }
            }
            else if (logic === "sum") {
                if (currenVal != refVal) {
                    validator.valid = false
                    validator.message = message
                    validator.errors.push(message)
                }
            }
        }

    }
    catch (err) {
        console.log("error in compareValues :::")
    }
    return validator
}

async function handleMultipleValidations(params) {
    let { data, validatorArray, dynamicObj } = params
    let valid = {
        "valid": true,
        "errors": "",
        "message": ""
    }
    try {
        for (let validationObj of validatorArray) {
            let keysToFind = validationObj.fields
            let validationParams = {
                keysToFind: keysToFind,
                dynamicObj: dynamicObj,
                data: data
            }
            let toCheckValidation = await checkIfFieldsAreNotEmpty(validationParams)
            // console.log("toCheckValidation :: ",toCheckValidation)
            if (toCheckValidation.checkForValidations) {
                console.log("toCheckValidation 44:: ",keysToFind)
                let sumOfrefVal = await getYearDataSumForValidations(keysToFind, data)
                let sumOfCurrentKey = await yearWiseValues(dynamicObj.yearData)
                let errorMessage = await createErrorMessage(validationObj, dynamicObj)
                let valueParams = {
                    sumOfrefVal,
                    sumOfCurrentKey,
                    logic: validationObj.logic,
                    // message:`${validationObj.displayNumber} - ${validationObj.message} `
                    // message:validationObj.message
                    message: errorMessage
                }
                let compareValidator = compareValues(valueParams)
                console.log("sumOfrefVal :: ",sumOfrefVal)
                console.log("sumOfCurrentKey :: ",sumOfCurrentKey)
                console.log("compareValidator :::: ",compareValidator)
                if (!compareValidator.valid) {
                    return compareValidator
                }
            }

        }
    }
    catch (err) {
        console.log("error in handleMultipleValidations ::: ", err.message)
    }
    return valid
}


async function handleInternalValidations(params) {
    let errors = {
        valid: true,
        message: "",
        errors: []
    }
    try {
        let { dynamicObj } = params
        let childElements = dynamicObj.child || []
        let preparedJsonData = childElements.reduce((result, currentValue) => ({ ...result, [currentValue.key]: currentValue }), {})
        for (let child of childElements) {
            if (Object.keys(validationJson).includes(child.key)) {
                let keysToFind = validationJson[child.key].fields
                let sumOfrefVal = await getYearDataSumForValidations(keysToFind, preparedJsonData)
                let sumOfCurrentKey = await yearWiseValues(child.yearData)
                // let validationParams = {
                //     keysToFind:keysToFind,
                //     dynamicObj:preparedJsonData[child.key],
                //     data:preparedJsonData
                // }
                // let toCheckValidation = await checkIfFieldsAreNotEmpty(validationParams)
                let errorMessage = await createErrorMessage(validationJson[child.key], preparedJsonData[child.key])
                let valueParams = {
                    sumOfrefVal,
                    sumOfCurrentKey,
                    logic: validationJson[child.key].logic,
                    // message:`${validatidynamicObjonJson[dynamicObj.key].displayNumber} - ${validationJson[dynamicObj.key].message} `
                    message: errorMessage
                }
                let compareValidator = compareValues(valueParams)
                // if(keysToFind.includes("othersValueWaterChrgDm")){
                // console.log("othersValueWaterChrgDm :::: ",preparedJsonData)
                // console.log("sumOfrefVal ::: ",sumOfrefVal ,"keysToFind :: ",keysToFind)   
                // console.log("sumOfCurrentKey ::: ",sumOfCurrentKey,"keysToFind :: ",keysToFind)     
                // console.log("compareValidator  11::: ",compareValidator)

                // }
                if (!compareValidator.valid) {
                    return compareValidator
                }
            }
        }
    }
    catch (err) {
        console.log("error in handleInternalValidations :::: ", err.message)
    }
    return errors
}

function createErrorMessage(validationObj, dynamicObj) {
    let message = validationObj.message
    try {
        if (validationObj.logic === "sum") {
            message += `\n Sum of ${validationObj.sequence.join(",")} is not equal to ${dynamicObj.position}`
        }
        else if (validationObj.logic === "ltequal") {
            message += `\n ${dynamicObj.position} should be lesser than or equal to ${validationObj.sequence[0]}`
        }
    }
    catch (err) {
        console.log("error in createErrorMessage :::: ", err.message)
    }
    return message
}

function checkIfFieldsAreNotEmpty(params) {
    let validator = {
        "emptyFields": [],
        "checkForValidations": true
    }
    try {
        let { keysToFind, dynamicObj, data } = params
        keysToFind = keysToFind || []
        if (dynamicObj.required) {
            for (let key of keysToFind) {
                if (data[key]) {
                    let yearData = data[key].yearData
                    valid = !yearData.every(item => item.value === "")
                    validator.emptyFields.push(valid)
                }
            }
            validator.checkForValidations = validator.emptyFields.some(item => item === true)
        }
    }
    catch (err) {
        console.log("error in checkIfFieldsAreNotEmpty ::: ", err.message)
    }
    return validator
}


async function handleNonSubmissionValidation(params) {
    let errors = {
        valid: true,
        message: "",
        errors: []
    }
    try {
        let { dynamicObj, yearArr, data } = params
        let validatorKeys = Object.keys(validationJson)
        let childrenValid = await handleInternalValidations({ dynamicObj })
        if (!childrenValid.valid) {
            return childrenValid
        }
        if (validatorKeys.includes(dynamicObj.key)) {
            let keysToFind = validationJson[dynamicObj.key].fields
            let logicType = validationJson[dynamicObj.key].logic
            // console.log("")
            if (logicType === "multiple") {
                let validatorArray = validationJson[dynamicObj.key].multipleValidations
                let childValidationParams = {
                    data,
                    validatorArray: validatorArray,
                    dynamicObj
                }
                let childValid = await handleMultipleValidations(childValidationParams)
                if (!childValid.valid) {
                    return childValid
                }
            }
            else {
                let validationParams = {
                    keysToFind: keysToFind,
                    dynamicObj: dynamicObj,
                    data: data
                }
                let toCheckValidation = await checkIfFieldsAreNotEmpty(validationParams)

                // console.log("----------------------------------------------")
                // console.log("sumOfrefVal ::: ",sumOfrefVal,"keystoFind ::: ",keysToFind)
                // console.log("sumOfCurrentKey :::: ",sumOfCurrentKey,"keysToFind:::",keysToFind)
                if (toCheckValidation.checkForValidations) {
                    console.log("toCheckValidation  33:: ",keysToFind)
                    let sumOfrefVal = await getYearDataSumForValidations(keysToFind, data)
                    let sumOfCurrentKey = await yearWiseValues(dynamicObj.yearData)
                    let errorMessage = await createErrorMessage(validationJson[dynamicObj.key], dynamicObj)
                    let valueParams = {
                        sumOfrefVal,
                        sumOfCurrentKey,
                        logic: validationJson[dynamicObj.key].logic,
                        // message:`${validationJson[dynamicObj.key].displayNumber} - ${validationJson[dynamicObj.key].message} `
                        message: errorMessage
                    }
                    let compareValidator = compareValues(valueParams)
                    // console.log("compareValidator ::q ",compareValidator)
                    // console.log("-----------------------------------------------")
                    if (!compareValidator.valid) {
                        return compareValidator
                    }
                }

            }
        }
    }
    catch (err) {
        console.log("error in handleNonSubmissionValidation :: :", err.message)
    }
    return errors
}

async function calculateAndUpdateStatusForMappers(tabs, ulbId, formId, year, updateForm, isDraft) {
    try {
        let conditionalObj = {}
        for (var tab of tabs) {
            conditionalObj[tab._id.toString()] = {}
            let obj = JSON.parse(JSON.stringify(tab.data))
            let temp = {
                "comment": tab.feedback.comment,
                "status": []
            }
            let seperatedValues = assignChildToMainKeys(obj)
            for (var k in tab.data) {
                let dynamicObj = obj[k]
                let yearArr = obj[k].yearData
                let params = {
                    dynamicObj,
                    yearArr,
                    data: seperatedValues
                }
                if (!isDraft) {
                    let validation = await handleNonSubmissionValidation(params)
                    if (!validation.valid) {
                        throw { message: validation.message }
                    }
                }
                let updatedIds = await handleChildrenData({ inputElement: { ...tab.data[k] }, formId, ulbId, updateForm, dynamicObj })
                if (obj[k].yearData) {
                    let status = yearArr.every((item) => {
                        if (Object.keys(item).length) {
                            return item.status === "APPROVED"
                        } else {
                            return true
                        }
                    })
                    temp["status"].push(status)
                    await updateQueryForPropertyTaxOp(yearArr, ulbId, formId, updateForm, dynamicObj, updatedIds)
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

async function updateQueryForPropertyTaxOp(yearData, ulbId, formId, updateForm, dynamicObj, updatedIds) {
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

function createChildObjectsYearData(params) {
    let { childs, isDraft, currentFormStatus, childCopyFrom, role } = params
    let yearData = []
    try {
        for (let child of childs) {
            let yearName = getKeyByValue(years, child?.year.toString())
            let copiedFrom = childCopyFrom.find(item => item.key === child.type)
            let yearJson = copiedFrom?.yearData.find(yearItem => yearItem.year === child.year.toString())
            let json = { ...yearJson }
            json['key'] = json['key'] + yearName
            json['label'] = child.label ? child.label : json['label'] + " " + yearName
            json['value'] = child.value
            json['year'] = child.year
            json['type'] = child.type
            json['file'] = child.file
            json['displayPriority'] = child.displayPriority
            json['textValue'] = child.textValue
            json['readonly'] = isReadOnly({ isDraft, currentFormStatus, role })
            json['replicaNumber'] = child.replicaNumber ? child.replicaNumber : child.replicaCount
            yearData.push(json)
        }
    }
    catch (err) {
        console.log("error in createChildObjectsYearData ::: ", err.message)
    }
    return yearData
}

async function createFullChildObj(params) {
    let { element, yearData, replicaCount, childCopyFrom } = params
    let childs = []
    let copiedFromKeys = Array.from(new Set(yearData.map((item => item.type))))
    try {
        for (let i = 1; i <= replicaCount; i++) {
            let replicatedYear = yearData.filter(item => item.replicaNumber === i)
            for (let key of copiedFromKeys) {
                let copiedFrom = childCopyFrom.find(item => item.key === key)
                let childObject = { ...copiedFrom }
                childObject.replicaNumber = i
                let yearData = replicatedYear.filter(item => item.type === key)
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
    catch (err) {
        console.log("error in createFullChildObj ::: ", err.message)
    }
    return childs
}

async function appendChildValues(params) {
    let { element, ptoMaper, isDraft, currentFormStatus, role } = params
    try {
        if (element.child && ptoMaper) {
            let childElement = ptoMaper.find(item => item.type === element.key)
            if (childElement && childElement.child) {
                let yearData = []
                // console.log("childElement.key :: ",childElement.type)
                for (let key of childElement.child) {
                    yearData = await createChildObjectsYearData({
                        childs: childElement.child,
                        isDraft: isDraft,
                        currentFormStatus: currentFormStatus,
                        childCopyFrom: element.copyChildFrom,
                        role: role
                    })
                }
                let params = {
                    yearData: yearData,
                    element: element,
                    replicaCount: childElement.replicaCount,
                    childCopyFrom: element.copyChildFrom
                }
                let child = await createFullChildObj(params)
                element.replicaCount = childElement.replicaCount
                element.child = child
            }
        }
    }
    catch (err) {
        console.log(err)
        console.log("error in appendChildValues ::: ", err.message)
    }
    return element
}

exports.getView = async function (req, res, next) {
    try {
        let condition = {};
        let { role } = req.decoded
        if (!req.query.ulb && !req.query.design_year) {
            return res.status(400).json({ status: false, message: "Something went wrong!" });
        }
        condition = { ulb: ObjectId(req.query.ulb), design_year: ObjectId(req.query.design_year) };
        let ptoData = await PropertyTaxOp.findOne(condition, { history: 0 }).lean();
        let ptoMaper = null;
        if (ptoData) {
            ptoMaper = await PropertyTaxOpMapper.find({ ulb: ObjectId(req.query.ulb), ptoId: ObjectId(ptoData._id) }).populate("child").lean();
        }
        let fyDynemic = { ...await propertyTaxOpFormJson(role) };
        if (ptoData) {
            const { isDraft, status, currentFormStatus } = ptoData;
            for (let sortKey in fyDynemic) {
                if (sortKey !== "tabs" && ptoData) {
                    fyDynemic[sortKey] = ptoData[sortKey];
                } else {
                    for (const k of ['tabs']) {
                        let { data } = fyDynemic[k][0];
                        for (let el in data) {
                            let { yearData, mData } = data[el];
                            let childParams = {
                                element: data[el],
                                ptoMaper: ptoMaper,
                                isDraft: isDraft,
                                currentFormStatus: currentFormStatus,
                                role
                            }
                            data[el] = await appendChildValues(childParams)
                            if (Array.isArray(yearData) && ptoMaper) {
                                for (const pf of yearData) {
                                    if (!isEmptyObj(pf)) {
                                        let d = ptoMaper.find(({ type, year }) => type === pf.type && year.toString() === pf.year);
                                        if (d) {
                                            pf.file ? (pf.file = d ? d.file : "") : d.date ? (pf.date = d ? d.date : "") : (pf.value = d ? d.value : "");
                                        }
                                        pf.readonly = isReadOnly({ isDraft, currentFormStatus, role, ptoData })
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
        fyDynemic['isDraft'] = ptoData?.isDraft || true
        fyDynemic['ulb'] = ptoData?.ulb || req.query.ulb
        fyDynemic['design_year'] = ptoData?.design_year || req.query.design_year
        fyDynemic['statusId'] = ptoData?.currentFormStatus || MASTER_STATUS['Not Started']
        fyDynemic['status'] = MASTER_STATUS_ID[ptoData?.currentFormStatus] || MASTER_STATUS_ID[1]
        let params = {
            status: ptoData?.currentFormStatus,
            formType: "ULB",
            loggedInUser: req?.decoded?.role,
        };
        Object.assign(fyDynemic, {
            canTakeAction: canTakenActionMaster(params),
        }
        );

        return res.status(200).json({ status: true, message: "Success fetched data!", data: { ...fyDynemic, financialYearTableHeader, specialHeaders, skipLogicDependencies } });
    } catch (error) {
        console.log("err", error);
        return res.status(400).json({ status: false, message: "Something error wrong!" });
    }
}





function getLabelName(type) {
    try {
        let indicators = questionIndicators
          
        let labelName = indicators[type] ? indicators[type].split(",").join("") : ""
        return labelName
    }
    catch (err) {
        console.log("Err :::", err)
        return "NA"
    }
}

function getTextValues(result,displayPriority){
    try{
        
        let subHeaders = {
            "2.05-2.08": "Residential Properties",
            "2.09-2.12": "Commercial Properties",
            "2.13-2.16": "Industrial Properties",
            "2.17-2.20": "Government Properties",
            "2.21-2.24": "Institutional Properties",
            "2.25-2.29": "Other Properties",
            "5.13-5.16" :"Residential connections",
            "5.17-5.20":"Commercial connections",
            "5.21-5.24" :"Industrial connections",
            "6.13-6.16" :"Residential connections",
            "6.17-6.20":"Commercial connections",
            "6.21-6.24" :"Industrial connections",
        }
        for (let range in subHeaders) {
            let [integerA, integerB] = range.split("-")
            let [rangeA, rangeB] = [integerA, integerB].map(range => parseFloat(+range))
            let dpIntegerArr = displayPriority.split(".")
            let priorNumber = dpIntegerArr[1].length === 2 ? displayPriority : dpIntegerArr[0] + "." + "0" + dpIntegerArr[1]
            let priority = parseFloat(+priorNumber)
            // if(displayPriority === "2.5"){
            //     console.log("displayPriority :: ",priority)
            // }
            if (priority >= rangeA && priority <= rangeB) {
                // console.log("subHeaders[range] ::: ",subHeaders[range])
                if (subHeaders[range]) {
                    return subHeaders[range].split(",").join("") || ""
                }
                else {
                    return ","
                }
            }
        }
    }
    catch(err){
        console.log(err)
        console.log("ulb ::: ",result.ulb)
        console.log("result.type ::: ",result.type ,"dp ::: ",result.displayPriority)
        console.log("error in getIpValues :::: ",err.message)
        return "NA"
    }
    return ""
}
module.exports.getTextValues = getTextValues

function getSubHeaders(displayPriority) {
    try {
        let subHeaders = {
            "1.09-1.15": "Property Tax Demand Details (Amount in INR Lakhs)",
            "1.17-1.23": "Property Tax Collection Details (Amount in INR Lakhs)",
            "2.05-3.00": "Property Tax Demand and Collection Details by Property Type (including cess, other tax charges, excluding user charges if any)",
            "5.05-5.10": "Water Charges Demand and Collection Details (Amount in INR lakhs)",
            "5.11-5.12": "Water Connection Details",
            "5.13-5.20": "Water Charges Demand and Collection Details by connection type",
            "5.21-5.24": "Industrial connections",
            "5.25-5.29": "Other connections(any other connection type)",
            "5.30-5.30": "Water Charges Tariff Details",
            "5.31-5.31": "Water Charges: Cost of Service Delivery Details",
            "5.32-5.32": "Working of the O&M Cost- Water Service",
            "6.05-6.10": "Sewerage Charges Demand and Collection Details (Amount in INR lakhs)",
            "6.11-6.12": "Sewerage Connection Details",
            "6.13-6.16": "Sewerage Charges Details by connection type",
            "6.17-6.20": "Commercial connections",
            "6.21-6.24": "Industrial connections",
            "6.25-6.29": "Other connections(any other connection type)",
            "6.30-6.30": "Sewerage Charges Tariff Details",
            "6.31-6.31": "Sewerage Charges: Cost of Service Delivery Details",
            "6.32-6.32": "Working of the O&M Cost- Sewerage Service"
        }
        for (let range in subHeaders) {
            let [integerA, integerB] = range.split("-")
            let [rangeA, rangeB] = [integerA, integerB].map(range => parseFloat(+range))
            let dpIntegerArr = displayPriority.split(".")
            let priorNumber = dpIntegerArr[1].length === 2 ? displayPriority : dpIntegerArr[0] + "." + "0" + dpIntegerArr[1]
            let priority = parseFloat(+priorNumber)
            if (priority >= rangeA && priority <= rangeB) {
                if (subHeaders[range]) {
                    return subHeaders[range].split(",").join("") || ""
                }
                else {
                    return ","
                }
            }
        }
    }
    catch (err) {
        console.log("error in getSubheades :: ", err.message)
    }
    return ","
}

function getIndicator(displayPriority) {
    try {
        let headers = {
            "1.01-1.19": "Property Tax Details",
            "2.01-2.29": "Property Register Details",
            "3.01-3.02": "Property Tax Collection Details by Mode of payment (including cess, other tax charges, excluding user charges if any)",
            "4.01-4.01": "Property Tax Valuation Details",
            "5.01-5.32": "Water Charges Details",
            "6.01-6.32": "Sewerage Charges Details",
        }
        for (let range in headers) {
            let [integerA, integerB] = range.split("-")
            let [rangeA, rangeB] = [integerA, integerB].map(range => parseFloat(+range))
            let dpIntegerArr = displayPriority.split(".")
            let priorNumber = dpIntegerArr[1].length === 2 ? displayPriority : dpIntegerArr[0] + "." + "0" + dpIntegerArr[1]
            let priority = parseFloat(+priorNumber)
            if (priority >= rangeA && priority <= rangeB) {
                if (headers[range]) {
                    return headers[range].split(",").join("")
                }
            }
        }
    } catch (err) {
        console.log(err)
        console.log("error in getIndicators :: ", err.message)
    }
    return ""
}

const getStringValue = (result, parentDp, ipValue = false) => {
    let writableStr = ""
    try {
        let dataYear = result?.year
        if(indicatorsWithNoyears.includes(result.type)){
            dataYear = ""
        }
        let indicatorDpNumber = parentDp ? parentDp : result.displayPriority
        // console.log(">>>",getSubHeaders(result.displayPriority).replace(",", ""))
        let indicatorHead = getIndicator(indicatorDpNumber).replace(",", "")
        let indicatorSubHead = getSubHeaders(indicatorDpNumber).replace(",", "")
        let indicatorNumber = JSON.stringify(result.displayPriority)
        let value = result.value
        let file = result?.file?.url
        let date = result?.date ? result.date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }).split(",")[0] : null
        writableStr += dataYear ? getKeyByValue(years, result?.year.toString()) + "," : " " + ","
        writableStr += indicatorHead + ","
        writableStr += indicatorSubHead + ","
        writableStr +=  "'"+indicatorNumber + ","
        writableStr += ipValue ? result.textValue + "," : "NA" + ","
        writableStr += getLabelName(result.type) + ","
        // console.log("parentDp ::: ",parentDp)
        let assignedValue = value || file || date || " "
        writableStr += assignedValue ? `${assignedValue}` : "" + ","
        writableStr += "\r\n"
    } catch (err) {
        console.log("error in getStringValue ::: ", err);
    }
    return writableStr
}
module.exports.getStringValue = getStringValue

const decideDisplayPriority = (index, type, dp, replicaNumber, parentType) => {
    try {
        // console.log("type ::: ",type)
        if (childKeys[type]) {
            return childKeys[type] + "." + replicaNumber
        }
    }
    catch (err) {
        console.log("error in decideDisplayPriority")
    }
    return dp + "." + replicaNumber
}
module.exports.decideDisplayPriority = decideDisplayPriority


const canShow = (key, results, updatedDatas,ulb) => {
    try {
        
        if (Object.keys(skippableKeys).includes(key)) {
            let elementToFind = skippableKeys[key]
            let element = {}
            let keyName = elementToFind + "_" + ulb
            // console.log("elementsToFind :::",elementToFind)
            if (!updatedDatas[keyName]) {
                element = results.find(item => item.type === elementToFind)
                updatedDatas[keyName] = element
            }
            else{
                element = updatedDatas[keyName]
            }
            let show = element?.value === "Yes" 
            if(reverseKeys.includes(key)){
                show = element?.value === "No"
            }
            if(["entityNameWaterCharges","entityNaSewerageCharges"].includes(key)){
                show = element?.value !== "ULB"
            }
            return show
        }
    }
    catch (err) {
        console.log("ulb ::: ",ulb)
        // notificationFile
        console.log("error in canSHow ::: ", err.message)
    }
    return true
}
module.exports.canShow = canShow

// module.exports.getCsvForPropertyTaxMapper = async (req, res) => {
//     let response = {
//         "success": true,
//         "message": "",
//         "query": []
//     }
//     let status = 200
//     try {
//         let { getQuery } = req.query
//         let csvCols = ["State Name",
//             "ULB Name",
//             "ULB Nature",
//             "City Finance Code",
//             "Census Code",
//             "Overall Form Status",
//             "Design Year",
//             "Data Year",
//             "Indicator Head ",
//             "Indicator sub head",
//             "Indicator number",
//             "Input Value",
//             "Indicator",
//             "Value| Amount"]
//         getQuery = getQuery === "true"
//         let design_year = ObjectId(years['2023-24'])
//         if (getQuery) {
//             response.query = getQuery
//             return response
//         }
//         let ptoFormResults = await PropertyTaxOp.find({
//             design_year: design_year
//         }, { _id: 1, ulb: 1 }).lean()
//         let ulbNames = ptoFormResults.map(item => item.ulb)
//         let mapperData = await PropertyTaxOpMapper.find({
//             "ptoId": { $in: ptoFormResults.map(item => item._id) }
//         }).populate("child").populate({
//             "path": "ptoId",
//             "populate": {
//                 "path": "ulb",
//                 "populate": {
//                     "path": "state",
//                     "model": "State"
//                 }
//             }
//         }).lean()
//         let filename = "propertyTax.csv"
//         res.setHeader("Content-disposition", "attachment; filename=" + filename);
//         res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
//         res.write("\ufeff" + `${csvCols.join(",").toString()}` + "\r\n");
//         let str = ""
//         res.write("\ufeff" + str + "\r\n");
//         // cursor.on()
//         // console.log("mapperData ::: ",ptoFormResults)
//         await createDataStructureForCsv(ulbNames, mapperData, res)
//         // res.end()
//         // console.log("mapperData :: ",mapperData)
//         response.success = true
//         // response.data = dbResults
//         response.message = "Code working"
//     }
//     catch (err) {
//         response.success = true
//         status = 400
//         console.log("error in getCsvForPropertyTaxMapper ::::: ", err.message)
//     }
//     // return res.status(status).json(response)
// }

module.exports.getCsvForPropertyTaxMapper = async (req, res) => {
    let response = {
        "success": true,
        "message": "",
        "query": []
    }
    let status = 200
    try {
        let { getQuery } = req.query
        let csvCols = ["State Name",
            "ULB Name",
            "ULB Nature",
            "City Finance Code",
            "Census Code",
            "Overall Form Status",
            "Design Year",
            "Data Year",
            "Indicator Head ",
            "Indicator sub head",
            "Indicator number",
            "Input Value",
            "Indicator",
            "Value| Amount"]
        getQuery = getQuery === "true"
        let design_year = ObjectId(years['2023-24'])
        if (getQuery) {
            response.query = getQuery
            return response
        }
        let filename = "propertyTax.csv"
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
        res.write("\ufeff" + `${csvCols.join(",").toString()}` + "\r\n");

        let cursor = await PropertyTaxOp.aggregate([
            { $match: { "design_year": design_year} },
            // { $match: { "design_year": design_year,"ulb": ObjectId("5fa24661072dab780a6f150b")} },
            {
                $lookup: {
                    from: "propertytaxopmappers",
                    localField: "_id",
                    foreignField: "ptoId",
                    as: "propertytaxopmapper"
                }
            },
            {
                $lookup: {
                    from: "propertymapperchilddatas",
                    localField: "_id",
                    foreignField: "ptoId",
                    as: "propertymapperchilddata"
                }
            },
            {
                $lookup: {
                    from: "ulbs",
                    localField: "ulb",
                    foreignField: "_id",
                    as: "ulb"
                }
            },
            { $unwind: "$ulb" },
            {
                $lookup: {
                    from: "states",
                    localField: "ulb.state",
                    foreignField: "_id",
                    as: "state"
                }
            },
            { $unwind: "$state" },
        ]).allowDiskUse(true)
            .cursor({ batchSize: 100 })
            .addCursorFlag("noCursorTimeout", true)
            .exec();

        cursor.on("data", (el) => {
            el = JSON.parse(JSON.stringify(el));
            el = concatenateUrls(el);
            let updatedDatas = {}
            let filteredResults = el.propertytaxopmapper;
            let sortedResults = filteredResults.sort(sortPosition)
            for (let result of sortedResults) {
                let censusCode = el.ulb.censusCode != null ? el.ulb.censusCode : el.ulb.sbCode
                let writableStr = el.state.name + "," + el.ulb.name + "," + el.ulb.natureOfUlb + "," + el.ulb.code + "," + censusCode + "," + MASTER_STATUS_ID[el.currentFormStatus] + "," + getKeyByValue(years, el.design_year.toString()) + ","
                let modifiedTextValue = getTextValues(result,result.displayPriority).replace(",")
                result.textValue = modifiedTextValue ? modifiedTextValue : " "
                if (!canShow(result.type, sortedResults, updatedDatas, el.ulb._id)) continue;
                writableStr += getStringValue(result, false, true)
                if (result.child && result.child.length) {
                    let status = MASTER_STATUS_ID[el.currentFormStatus] || ""
                    res.write(writableStr)
                    for (let childId of result.child) {
                        let child = el?.propertymapperchilddata?.length > 0 ? el?.propertymapperchilddata.find(e => e._id.toString() == childId.toString()) : null
                        let number = decideDisplayPriority(0, child.type, result.displayPriority, child.replicaNumber, result.type)
                        child.displayPriority = number
                        if (child) {
                            writableStr = el.state.name + "," + el.ulb.name + "," + el.ulb.natureOfUlb + "," + el.ulb.code + "," + el.ulb.censusCode + "," + status + "," + getKeyByValue(years, el.design_year.toString()) + ","
                         censusCode || ""
                            child.textValue = child.textValue ? child.textValue : modifiedTextValue
                            writableStr += getStringValue(child,result.displayPriority, true)
                            res.write(writableStr)
                            writableStr = ""
                        }
                    }
                }
                res.write(writableStr)
            }
        });
        cursor.on("end", function (el) {
            res.end();
        });
        response.success = true
        response.message = "Fetched successfully";
    } catch (err) {
        console.log("err", err)
        response.success = true
        status = 400
        console.log("error in getCsvForPropertyTaxMapper ::::: ", err.message)
    }
}

const createDataStructureForCsv = (ulbs, results, res) => {
    try {
        let updatedDatas = {}
        for (let ulb of ulbs) {
            let filteredResults = results.filter(item => item.ptoId.ulb._id.toString() === ulb.toString())
            let sortedResults = filteredResults.sort(sortPosition)
            for (let result of sortedResults) {
                let status = MASTER_STATUS_ID[result.ptoId.currentFormStatus] || ""
                let censusCode = result.ptoId.ulb.censusCode != null ? result.ptoId.ulb.censusCode : result.ptoId.ulb.sbCode 
                let writableStr = result.ptoId.ulb.state.name + "," + result.ptoId.ulb.name + "," + result.ptoId.ulb.natureOfUlb + "," + result.ptoId.ulb.code + "," + censusCode + "," + status + "," + getKeyByValue(years, result.ptoId.design_year.toString()) + ","
                let modifiedTextValue = getTextValues(result,result.displayPriority).replace(",")
                result.textValue = modifiedTextValue ? modifiedTextValue : " "
                if (!canShow(result.type, sortedResults, updatedDatas,result.ptoId.ulb._id)) continue;
                writableStr += getStringValue(result,false,true)
                if (result.child && result.child.length) {
                    res.write(writableStr)
                    for (let child of result.child) {
                        let number = decideDisplayPriority(0,child.type,result.displayPriority,child.replicaNumber,result.type)
                        child.displayPriority = number
                        let censusCode = result.ptoId.ulb.censusCode != null ? result.ptoId.ulb.censusCode : result.ptoId.ulb.sbCode 
                        writableStr = result.ptoId.ulb.state.name + "," + result.ptoId.ulb.name + "," + result.ptoId.ulb.natureOfUlb + "," + result.ptoId.ulb.code + "," + result.ptoId.ulb.censusCode + "," + status + "," + getKeyByValue(years, result.ptoId.design_year.toString()) + ","
                        censusCode || ""
                        child.textValue = child.textValue ? child.textValue : modifiedTextValue
                        writableStr += getStringValue(child,result.displayPriority,true)
                        res.write(writableStr)
                        writableStr = ""
                    }
                }
                res.write(writableStr)
            }
        }

        res.end()
    }
    catch (err) {
        console.log("error in createDataStructureForCsv ::: ", err)
        res.json({
            "success": false,
            "message": "something went wrong"
        })
    }
}
