const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const ObjectId = require("mongoose").Types.ObjectId;
const ULB = require("../../models/Ulb");
const STATE = require("../../models/State");
const Response = require("../../service").response;
const FormsJson = require("../../models/FormsJson");
const { getOriginalQueryParams } = require('../../util/helper');
const Service = require("../../service");
const {years} = require("../../service/years");
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const GrantDistribution = require("../../models/GrantDistribution");
const {getChildQuestion} = require("./constants")
const { checkForUndefinedVaribales, mutateResponse, getFlatObj } = require("../../routes/CommonActionAPI/service")
const { getKeyByValue, saveFormHistory, grantDistributeOptions, emailTriggerWithMohuaAction } = require("../../util/masterFunctions");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const {saveStatusAndHistory} = require("../CommonFormSubmission/service")
let baseUrls = {
  "staging":`https://${process.env.STAGING_HOST}`,
  "demo":`https://${process.env.DEMO_HOST_FRONTEND}`,
  "production":`https://${process.env.PROD_HOST}`
}

const { YEAR_CONSTANTS, MASTER_STATUS,MASTER_FORM_STATUS,MASTER_STATUS_ID,FORMIDs } = require('../../util/FormNames')
const { BadRequest } = require("../../service/response");
const userTypes = require("../../util/userTypes");
const CurrentStatus = require("../../models/CurrentStatus");
var outDatedYearIds = Object.entries(years).map(([key,value])=> {
  return ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22' ].includes(key) ? value : ""
}).filter(item => item != "")
exports.getGrantDistribution = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  try {
    let grantDistribution = await GrantDistribution.find({
      state: ObjectId(state),
      design_year,
    }).select({ history: 0 }).lean();

    grantDistribution = JSON.parse(JSON.stringify(grantDistribution))
    if (design_year === YEAR_CONSTANTS["22_23"]) {
      grantDistribution.forEach((entity) => {
        if (entity.hasOwnProperty("year")) {
          if (entity.year.toString() == "606aadac4dff55e6c075c507") {
            entity.key = `${entity.type}_2020-21_${entity.installment}`
          }

          if (entity.year.toString() == ObjectId("606aaf854dff55e6c075d219")) {
            entity.key = `${entity.type}_2021-22_${entity.installment}`
          }

          if (entity.year.toString() == "606aafb14dff55e6c075d3ae") {
            entity.key = `${entity.type}_2022-23_${entity.installment}`
          }
        }
      })
    }
    if (!grantDistribution) {
      return Response.BadRequest(res, null, "No GrantDistribution found");
    }
    if (design_year !== YEAR_CONSTANTS['22_23']) {
      grantDistribution = grantDistribution[grantDistribution.length - 1];
    }
    return Response.OK(res, grantDistribution, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getTemplate = async (req, res) => {
  console.log("suresh")
  let { state } = req?.decoded;
  let formData = req.query;
  let amount = "grant amount";
  
  formData.design_year = getKeyByValue(years,formData.year)
  if (formData.year === "606aafb14dff55e6c075d3ae") {
    formData.design_year = "2022-23";
  } else if (formData.year === "606aaf854dff55e6c075d219") {
    formData.design_year = "2021-22";
  }
  const type = `${formData?.type}_${formData?.design_year}_${formData?.installment}`;
  /* Checking if the formData.year is equal to the string "606aafb14dff55e6c075d3ae" and if it is, it is
 value of the variable "type" to the variable amount. */
 !outDatedYearIds.includes(formData.year)
    ? (amount = `${amount} - ${type} (Lakhs)`)
    : (amount = `${amount} (Lakhs)`);

  try {
    const ulbs = await ULB.find({
      state: ObjectId(state),
      isActive: true,
    }).select({ censusCode: 1, name: 1, sbCode: 1 });
    if (ulbs.length === 0) {
      return Response.BadRequest(res, "No ULB found");
    }

    let data = [];
    let defectedUlb = 0
    ulbs.forEach((element) => {
      let obj = {
        name: element?.name,
        code: element?.censusCode ? element?.censusCode : element?.sbCode,
      };
      if (obj.code) {
        data.push(obj);
      }
      else{
        defectedUlb += 1
        // console.log("element :: ",element)
      }
    });
    console.log("defectedUlb :: ",defectedUlb)
    let field = {
      code: "ULB Census Code/ULB Code",
      name: "ULB Name",
      amount,
    };
    let xlsData = await Service.dataFormating(data, field);
    return res.xls("grant_template.xlsx", xlsData);
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.uploadTemplate = async (req, res) => {
  let { url, design_year } = req.query;
  let state = req.decoded?.state;

  //Get original url from Query params.
  url = getOriginalQueryParams(req)?.url;
  let formData = req.query;
 
  try {
    downloadFileToDisk(url, async (err, file) => {
      if (err) {
        return Response.BadRequest(err, err.message);
      } else if (!file) {
        return Response.BadRequest(err, "No File Found");
      }

      //read file
      const XslData = await readXlsxFile(file);
      //count empty entries in exel file
      let emptyCensus = 0;
      XslData.forEach((el) => {
        if (
          el["ulb census code/ulb code"] === "" &&
          el["ulb name"] === ""
        ) emptyCensus++;
      })
      if (XslData.length == 0)
        return Response.BadRequest(res, "No File Found/Data");
      let xslDataCensusCode = XslData[0]["ulb census code/ulb code"];
      // validate data
      let queryState = [
        {
          $match: {
            state: ObjectId(state),
            isActive: true
          }
        },
        {
          $group: {
            _id: "$state",
            totalUlbs: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "states",
            localField: "_id",
            foreignField: "_id",
            as: "state"
          }
        },
        { $unwind: "$state" }
      ]
      let xslDataState = ULB.aggregate([
        {
          $match: {
            $or: [
              { censusCode: xslDataCensusCode },
              { sbCode: xslDataCensusCode },

            ],
            isActive: true
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "state",
            foreignField: "_id",
            as: "state"
          }
        },
        { $unwind: "$state" }

      ]);
      if (!outDatedYearIds.includes(formData.design_year)) {
        let [xslDataStateInfo, stateInfo] = await Promise.all([xslDataState, ULB.aggregate(queryState)]);
        let ulbCount = stateInfo[0].totalUlbs;
        
        let xslDataStateName = xslDataStateInfo[0].state.name;
        let stateName = stateInfo[0].state.name;

        if (stateName !== xslDataStateName) {
          return res.status(400).xls("error_sheet.xlsx", [{ "message": "Wrong state file" }]);
        }
        if (ulbCount != (XslData.length - emptyCensus)) {
          console.log("2")
          return res.status(400).xls("error_sheet.xlsx", [{ "message": `${ulbCount - (XslData.length - emptyCensus)} ulb data missing` }]);
          // return BadRequest(res, null, `${ulbCount- (XslData.length-emptyCensus)} ulb data missing`);
        }
      }
      const notValid = await validate(XslData, formData);
      if (notValid) {
        let amount = "grant amount";
        formData.design_year = getKeyByValue(years,formData.design_year)
        if (formData.design_year === "606aafb14dff55e6c075d3ae") {
          formData.design_year = '2022-23';
        } else if (formData.design_year === "606aaf854dff55e6c075d219") {
          formData.design_year = '2021-22';
        }
        let type = `${formData.type}_${formData.design_year}_${formData.installment}`
        amount = `${amount} - ${type} (Lakhs)`
        /* Checking if the formData.design_year is equal to 2021-22 or undefined, if it is, then it sets the amount variable
        to "grant amount". */
        formData.design_year === undefined || formData.design_year === "2021-22"
          ? amount = "grant amount (Lakhs)"
          : "";
        let field = {
          ["ulb census code/ulb code"]: "ULB Census Code/ULB Code",
          ["ulb name"]: "ULB Name",
          ["grant amount"]: amount,
          Errors: "Errors",
        };
        let xlsDatas = await Service.dataFormating(notValid, field);
        return res.status(400).xls("error_sheet.xlsx", xlsDatas);
      }
      return Response.OK(res, null, "file submitted");
    });
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.saveData = async (req, res) => {
  try {
    let { design_year, type, installment, year , } = req.body;
    let state = req.decoded?.state;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();
    let condition = {}
    condition["state"] = state;
    condition["design_year"] = design_year;
    condition["type"] = type;
    condition['installment'] = installment;
    condition['year'] = year;

    let form = await GrantDistribution.findOne(condition).lean();

    if (!form) {
      let formData = req.body;
      formData["state"] = state;
      let data = await GrantDistribution.create(formData);
      if (!data) {
        return res.status(400).json({
          status: false,
          message: "Form not saved."
        })
      }
      let formSubmit = [{...req.body,_id:data._id,currentFormStatus:req.body.currentFormStatus}]
    await createHistory({ formBodyStatus : Number(req.body.currentFormStatus),formSubmit, actionTakenByRole:req.decoded.role , actionTakenBy: req.body.actionTakenBy  })
      return Response.OK(res, data, "file submitted");
    }

    let data = await GrantDistribution.findOneAndUpdate(
      condition,
      req.body,
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      }
    );
    if (design_year === "606aaf854dff55e6c075d219") {
      await UpdateStateMasterForm(req, "grantAllocation");
    }
    let formSubmit = [{...req.body,_id:data._id,currentFormStatus:req.body.currentFormStatus}]
    await createHistory({ formBodyStatus : Number(req.body.currentFormStatus),formSubmit, actionTakenByRole:req.decoded.role , actionTakenBy: req.body.actionTakenBy  })

    return Response.OK(res, data, "file updated");
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

function readXlsxFile(file) {
  return new Promise((resolve, reject) => {
    let exceltojson;
    try {
      let fileInfo = file.path.split(".");
      exceltojson =
        fileInfo &&
          fileInfo.length > 0 &&
          fileInfo[fileInfo.length - 1] == "xlsx"
          ? xlsxtojson
          : xlstojson;
      exceltojson(
        {
          input: file.path,
          output: null, //since we don't need output.json
          lowerCaseHeaders: true,
          // sheet: ERRORS,
        },
        function (err, sheet) {
          if (err) {
            reject({ message: "Error: sheet1" });
          } else {
            resolve(sheet);
          }
        }
      );
    } catch (e) {
      console.log("readXlsxFile: Exception", e);
      reject({
        message: "Caught Exception while reading file.",
        errMessage: e.message,
      });
    }
  });
}

async function validate(data, formData) {
  let ulbCodes = [],
    ulbNames = [];
  const code = "ulb census code/ulb code";
  const name = "ulb name";
  let amount = "grant amount";
  formData.design_year = getKeyByValue(years,formData.design_year)
  if (formData.design_year === "606aafb14dff55e6c075d3ae") {
    formData.design_year = '2022-23';
  } else if (formData.design_year === "606aaf854dff55e6c075d219") {
    formData.design_year = '2021-22';
  }
  const type = `${formData.type}_${formData.design_year}_${formData.installment}`
  amount = `${amount} - ${type} (lakhs)`
  /* Checking if the formData.design_year is equal to 2021-22, if it is, then it sets the amount variable
  to "grant amount". */
  formData.design_year === "2021-22" ? amount = "grant amount (lakhs)" : ""
  const keys = Object.keys(data[0]);
  if (
    !(keys.includes(code) && keys.includes(name) && keys.includes(amount)
      || keys.length !== 3
    )) {
    data.forEach((element) => {
      element.Errors = "Incorrect Format,";
    });
    return data;
  }
  for (let index = 0; index < data.length; index++) {
    const keys = Object.keys(data[index]).length;
    if (keys !== 3) {
      data[index].Errors = "Incorrect Format,";
    }
    if (data[index][code]) ulbCodes.push(data[index][code]);
    if (data[index][name]) ulbNames.push(data[index][name]);
  }
  // get ulb data
  const compareData = await getUlbData(ulbCodes, ulbNames);
  // console.log("data ::: ",JSON.stringify(data,2,3))
  // console.log("compareData :: ",JSON.stringify(compareData,2,3))
  let errorFlag = false;
  for (let index = 0; index < data.length; index++) {
    if (
      data[index][code] === "" ||
      data[index][name] === ""
    ) {
      errorFlag = true;
      if (data[index].Errors) data[index].Errors += "Code or Ulb name is blank,";
      else data[index].Errors = "Code or Ulb name is blank,";
    }
    if (!compareData[data[index][code]]) {
      errorFlag = true;
      if (data[index].Errors) data[index].Errors += "Code Not Valid,";
      else data[index].Errors = "Code Not Valid,";
    }
    if (
      compareData[data[index][code]] != data[index][name]
    ) {
      errorFlag = true;
      if (data[index].Errors) data[index].Errors += "Name Not Valid,";
      else data[index].Errors = "Name Not Valid,";
    }
    if (!Number(data[index][amount]) || data[index][amount] === "") {
      errorFlag = true;
      if (data[index].Errors) data[index].Errors += "Amount Not valid,";
      else data[index].Errors = "Amount Not valid,";
    }
  }
  if (errorFlag) {
    data.forEach((object) => {
      let findKey = "Errors";
      for (const key in object) {
        const element = object[key];
        if (key == findKey) {
          findKey = true;
          break;
        }
      }
      if (findKey === "Errors") {
        object.Errors = "";
      }
    });
    return data;
  }
}

async function getUlbData(ulbCodes, ulbNames) {
  const q = {
    $and: [
      {
        name: { $in: ulbNames },
      },
      {
        $or: [{ censusCode: { $in: ulbCodes } }, { sbCode: { $in: ulbCodes } }],
      },
    ],
  };

  const ulb = await ULB.find(q).select({
    censusCode: 1,
    sbCode: 1,
    name: 1,
  });

  let ulbDataMap = new Map();
  ulb.forEach((element) => {
    ulbDataMap[element?.sbCode ? element?.sbCode : element?.censusCode] =
      element.name;
    ulbDataMap[element?.censusCode ? element?.censusCode : element?.sbCode] = element.name
  });
  return ulbDataMap;
}

const getRejectedFields = (currentFormStatus,formStatuses,installment,role)=>{
  try{
      // console.log("formStatuses :: ",formStatuses)
      let prevInstallment = installment - 1
      let inputAllowed = [MASTER_FORM_STATUS['IN_PROGRESS'],MASTER_FORM_STATUS['NOT_STARTED'],MASTER_FORM_STATUS['RETURNED_BY_MoHUA']]
      let allowedStatuses = [MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'],MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA'],MASTER_FORM_STATUS['RETURNED_BY_MoHUA']]
      if(prevInstallment  && !allowedStatuses.includes(formStatuses?.[prevInstallment]) && role === userTypes.state){
          return true
      }
      else{
          return inputAllowed.includes(currentFormStatus) && role === userTypes.state ? false : true 
      }
  }
  catch(err){
      console.log("error in  getRejectedFields::::  ",err.message)
  }
}


const getSectionWiseJson = async(state, design_year,role) => {
let host = baseUrls[process.env.ENV]
  let formStatuses = {}
  try {
    let ulb = await ULB.findOne({
      "state": ObjectId(state),
      "isMillionPlus": "Yes"
    }, { isMillionPlus: 1 })
    let stateIsMillion = ulb?.isMillionPlus === "Yes" ? true : false
    let tabularStructure = await FormsJson.findOne({
      "formId":{"$in":[FORMIDs['GrantAllocation']]},
      "design_year":design_year
  }).lean()
  tabularStructure = tabularStructure?.data || []
  let allocationForms = await GrantDistribution.find({
    state:ObjectId(state),
    design_year:design_year,
  }).lean()
  let currentStatuses = await CurrentStatus.find({recordId:{
    "$in": (allocationForms.length ? allocationForms.map(item=>item._id):[]),
    
  },
  }).sort({
    "modifiedAt":-1
  })
  for(let section of tabularStructure){
    let installments = section.installments
    for(let i=1; i <= installments; i++){
      let file = {
        "name":"",
        "url":""
      }
      let shortKey = `${section.type}_${section.yearCode}_${i}`
      let allocationForm =  allocationForms.find(item => item.installment === i && item?.year?.toString() === years[section.yearCode] && item?.type === section?.type ) || {}
      let currentStatus = currentStatuses.find(item => item.recordId.toString() === allocationForm?._id?.toString() && item.shortKey === shortKey)
      allocationForm.currentFormStatus = allocationForm?.currentFormStatus ? allocationForm?.currentFormStatus : MASTER_FORM_STATUS['NOT_STARTED']
      let url = ""
      url = allocationForm?.url || ""
      const canTakeAction = (allocationForm.currentFormStatus == MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'] && role == userTypes.mohua);
      file.name  = allocationForm?.fileName || ""
      file.url = allocationForm?.url || ""
      let shouldDisableQues = await getRejectedFields(allocationForm?.currentFormStatus,formStatuses,i,role)
      formStatuses[i] = allocationForm?.currentFormStatus || MASTER_FORM_STATUS['NOT_STARTED']
      let params = {
        installment : i,
        year:years[section.yearCode],
        type:section.type,
        quesType:"",
        template:`${host}/api/v1/grantDistribution/template?type=${section.type}&year=${years[section.yearCode]}&installment=${i}`,
        key:shortKey,
        url:url,
        isDisableQues:shouldDisableQues,
        file:file,
        type:section.type,
        canTakeAction,
        status:MASTER_STATUS_ID[allocationForm.currentFormStatus],
        statusId:allocationForm.currentFormStatus,
        responseFile:currentStatus?.responseFile || "",
        rejectReason:currentStatus?.rejectReason || ""
       }
       let question = await getChildQuestion(params)
       section.quesArray.push(question)
    }
  }
  return {json:tabularStructure,isStateMillion:stateIsMillion}
  }
  catch (err) {
    console.log("error in getSectionWiseJson ::: ",err)
    return{json:[],isStateMillion:true}
  }
}


module.exports.getGrantDistributionForm = async (req, res, next) => {
  let response = {
    success: false,
    message: "",
    data: [],
    errors: []
  }
  try {
    let { state, design_year } = req.query
    let { role } = req.decoded
    if (![userTypes.mohua, userTypes.state].includes(role)) {
      response.message = "Not allowed"
      return res.status(405).json(response)
    }
    let validator = await checkForUndefinedVaribales({
      "design year": design_year,
      "state": state
    })
    if (!validator.valid) {
      response.message = validator.message
      return res.status(405).json(response)
    }
    let { json, isStateMillion } = await getSectionWiseJson(state, design_year,role)
    response.message = "form fetched"
    response.success = true
    response.isStateMillion = isStateMillion
    response.formName = "Grant Allocation to ULBs"
    response.gtcFormData = json
    return res.status(200).json(response)
  }
  catch (err) {
    console.log("error in getGrantDistributionForm :::: ", err.message)
  }
}


module.exports.installmentAction = async (req, res) => {

  try {
      let {role,mohua} = req.decoded
      if(role !== userTypes.mohua){
          return res.json({
              "success":true,
              "message":"Not permitted"
          })
      }
      const {
          key,
          rejectReason,
          responseFile,
          statusId,
          installment,
          design_year,
          state,
      } = req.body;

      const found = await GrantDistribution.findOneAndUpdate({
          installment,
          // year: ObjectId(year),
          // type,
          type:key,
          design_year: ObjectId(design_year),
          state: ObjectId(state)
      }, {
          $set: {
              actionTakenBy: mohua || state,
              actionTakenByRole:role,
              currentFormStatus: statusId,
              rejectReason_mohua:rejectReason,
              responseFile_mohua:responseFile
          }
      });
      req.body._id = found?._id
      req.body.financialYear = design_year
      let formSubmit = [{...req.body,type:key,currentFormStatus:statusId}]
      await createHistory({ formBodyStatus : Number(statusId),formSubmit, actionTakenByRole:role , actionTakenBy: mohua || state  })
      if(!found) return res.status(404).json({ message: 'Installment not found'});
      res.status(200).json({
          success: true,
          message: 'Action recorded'
      });

    // Send mail to state when mahua take action in this form.
    await emailTriggerWithMohuaAction(state, statusId, rejectReason, FORMIDs['GrantAllocation']);
    return;

  }
  catch (err) {
      let message = ["demo","staging"].includes(process.env.ENV) ? err.message : "something went wrong"
       return res.status(404).json({
          success : true,
          message,
      })
  }
}


async function createHistory(params) {
  try {
      let {formBodyStatus,actionTakenBy,actionTakenByRole,formSubmit,formType} = params
      let formData = formSubmit[0]
      let shortKey = `${formData.type}_${getKeyByValue(years,formData.design_year)}_${formData.installment}`
          let historyParams = {
              formBodyStatus,
              actionTakenBy:actionTakenBy,
              actionTakenByRole:actionTakenByRole,
              formSubmit:formSubmit,
              formType:"GrantAllocation",
              shortKey:shortKey,
          }
          
          await saveStatusAndHistory(historyParams)
  }
  catch (err) {
      console.log("error in createHistory ::: ", err.message)
  }
}