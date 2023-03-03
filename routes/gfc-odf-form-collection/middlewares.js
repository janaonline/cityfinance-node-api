const { years } = require("../../service/years")
const { getFlatObj,payloadParser,mutuateGetPayload } = require("../CommonActionAPI/service")
const FormsJson = require("../../models/FormsJson");
const ObjectId = require("mongoose").Types.ObjectId;


module.exports.changeRequestBody = (req,res,next)=>{
  try{
    let {design_year} = req.body
    let {data} = req.body 
    if (design_year == years['2023-24']) {
      req.body = payloadParser(data)
    }
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
    let jsonFormId = req.query.formId ? parseInt(req.query.formId) : "0"
    let design_year = req.query.design_year
    let formJson = await FormsJson.findOne({ formId: jsonFormId }).lean()
    let obj = formJson ? formJson.data : {}
    let flattedForm =  []
    let form = req.form
    if (design_year == years['2023-24']) {
      if (form) {
        form =  JSON.parse(JSON.stringify(req.form))
        console.log("form :::: ",form)
        flattedForm = getFlatObj(form)
        await mutuateGetPayload(obj, flattedForm)
      }
      responseStatus = 200
      response.success = true
      response.data = obj
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