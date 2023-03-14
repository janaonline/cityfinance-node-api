const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload,mutateJson,modifiedShortKeys } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
// const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;


function modifyData(data){
  try{
    let keys = Object.keys(modifiedShortKeys)
    let removable = ''
    
    let objects = data.filter((item) => keys.includes(item.shortKey) || keys.includes(modifiedShortKeys[item.shortKey])) 
    console.log("objects :::: ",objects)
    for(let obj of objects){
      let answerArr = obj.answer
      for(let answerObj of answerArr){
        if (!answerObj.value){
          removable = obj.shortKey
        }
      }
    }
    let returnableData = data.filter(item => item.shortKey != removable)
    return returnableData
  }
  catch(err){
    console.log("error in modifyData ::: ",err.message)
  }
}

module.exports.changeRequestBody = async (req,res,next)=>{
  try{
    let bodyData = {...req.body}
    delete bodyData['data']
    let {design_year} = req.body
    let {data} = req.body 
    data = modifyData(data)
    console.log("data :>>>:: ",data)
    if (design_year == years['2023-24']) {
      req.body =await  payloadParser(data,req)
    }
    Object.assign(req.body,bodyData)
    next()
  }
  catch(err){
    console.log("error in changeRequestBody ::::: ",err.message)
  }
}

// function mutuateGetPayload(jsonFormat, flattedForm) {
//   let answerObj = {
//     "label": "",
//     "textValue": "",
//     "value": "",
//   }
//   let inputType = {
//     "1": "label",
//     "2": "textValue",
//     "3": "value"
//   }
//   try {
//     let obj = { ...jsonFormat }
//     for (let key in obj) {
//       let questions = obj[key].question
//       for (let question of questions) {
//         let answer = []
//         let obj = { ...answerObj }
//         let answerKey = inputType[question.input_type]
//         let shortKey = question.shortKey.replace(" ", "")
//         obj[answerKey] = flattedForm[shortKey]
//         answer.push(obj)
//         question['selectedValue'] = answer
//       }
//     }
//     return obj
//   }
//   catch (err) {
//     console.log("addValueIfFormExists ::: ", err.message)
//   }
// }


module.exports.changeFormGetStructure = async (req, res, next) => {
  let response = {
    success : false,
    data:{},
    message:""
  }
  responseStatus = 500
  try {

    // let sideMenuId = req.query.formId ? parseInt(req.query.formId) : null
    // let sideMenuObj = await SideMenu.findOne({
    //   "_id" :sideMenuId
    // })
    // let jsonFormType = sideMenuObj.collectionName
    // let formJson = await FormsJson.findOne({ type: jsonFormType }).lean()
    let jsonFormId = req.query.formId ? parseInt(req.query.formId) : null
    let design_year = req.query.design_year
    let formJson = await FormsJson.findOne({ formId: jsonFormId ,design_year:ObjectId(design_year) }).lean()
    let obj = formJson ? formJson.data : {}
    let flattedForm =  []
    let form = req.form
    let {role} = req.decoded 
    let responseData = [
      {
        "_id": req?.form?._id ,
        "formId": req.query.formId,
        "language":[],
        "canTakeAction":true
      }
    ]
    let keysToBeDeleted = ["_id","createdAt","modifiedAt","actionTakenByRole","actionTakenBy","ulb","design_year","isDraft"]
    if (design_year == years['2023-24']) {
      if (form) {
        form =  JSON.parse(JSON.stringify(req.form))
        flattedForm = getFlatObj(form)
        responseData[0].canTakeAction = req.form.canTakeAction
        obj  = await mutuateGetPayload(obj, flattedForm,keysToBeDeleted,role)
      }
      else{
        obj = await mutateJson(obj,keysToBeDeleted,req.query,role)
      }
      responseData[0]['language'] = obj
      responseStatus = 200
      response.success = true
      response.data = responseData
      response.message = 'Form Questionare!'
      res.status(responseStatus).json(response)
    }
    else {
      responseStatus = req.form ? 200 : 400
      response.success = req.form ? true : false
      response.data = req.form ? req.form : {}
      response.message = req.form ? "" : "Form not found"
      return res.status(responseStatus).json(response)

    }

  }
  catch (err) {
    console.log("error in changeFormGetStructure :::: ", err.message)
    res.status(200).json({
      success: false,
      data: {},
      "message": "some server error occured"
    })
  }
}