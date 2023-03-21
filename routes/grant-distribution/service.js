const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const ObjectId = require("mongoose").Types.ObjectId;
const ULB = require("../../models/Ulb");
const STATE = require("../../models/State");
const Response = require("../../service").response;
const Service = require("../../service");
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const GrantDistribution = require("../../models/GrantDistribution");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const {YEAR_CONSTANTS} = require('../../util/FormNames')
const { BadRequest } = require("../../service/response");
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
    if(design_year === YEAR_CONSTANTS["22_23"]){
    grantDistribution.forEach((entity)=>{
          if(entity.hasOwnProperty("year")){
            if(entity.year.toString() == "606aadac4dff55e6c075c507"){
                entity.key = `${entity.type}_2020-21_${entity.installment}`
            } 

            if(entity.year.toString() == ObjectId("606aaf854dff55e6c075d219")){
                entity.key = `${entity.type}_2021-22_${entity.installment}`
            } 
            
            if(entity.year.toString() == "606aafb14dff55e6c075d3ae"){
                entity.key = `${entity.type}_2022-23_${entity.installment}`
            }
          }
        })
      }
    if (!grantDistribution) {
      return Response.BadRequest(res, null, "No GrantDistribution found");
    }
    if(design_year !== YEAR_CONSTANTS['22_23']){
        grantDistribution =  grantDistribution[grantDistribution.length-1];
    }
    return Response.OK(res, grantDistribution, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getTemplate = async (req, res) => {
  let { state } = req?.decoded;
  let formData = req.query;
  let amount = "grant amount";

  if (formData.year === "606aafb14dff55e6c075d3ae") {
    formData.design_year = "2022-23";
  } else if (formData.year === "606aaf854dff55e6c075d219") {
    formData.design_year = "2021-22";
  }
  const type = `${formData?.type}_${formData?.design_year}_${formData?.installment}`;

  /* Checking if the formData.year is equal to the string "606aafb14dff55e6c075d3ae" and if it is, it is
 value of the variable "type" to the variable amount. */
  formData.year === "606aafb14dff55e6c075d3ae"
    ? (amount = `${amount} - ${type}`)
    : "";

  try {
    const ulbs = await ULB.find({
      state: ObjectId(state),
      isActive: true,
    }).select({ censusCode: 1, name: 1, sbCode: 1 });

    if (ulbs.length === 0) {
      return Response.BadRequest(res, "No ULB found");
    }

    let data = [];
    ulbs.forEach((element) => {
      let obj = {
        name: element?.name,
        code: element?.censusCode ? element?.censusCode : element?.sbCode,
      };
      if (obj.code) {
        data.push(obj);
      }
    });
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
      XslData.forEach((el)=>{
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
              $match:{
                state: ObjectId(state),
                isActive: true
              }
        },
        {
            $group:{
                _id: "$state",
                totalUlbs: {$sum:1}
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
        { $unwind: "$state"}
      ]
      let xslDataState = ULB.aggregate([
        {
          $match: {
            $or: [
              { censusCode: xslDataCensusCode },
              { sbCode: xslDataCensusCode },
            ],
          },
        },
        {
          $lookup:{
            from: "states",
            localField: "state",
            foreignField: "_id",
            as: "state"
         }
        },
        { $unwind: "$state"}

      ]);
      if(formData.design_year === "606aafb14dff55e6c075d3ae"){
      let  [xslDataStateInfo,stateInfo] =  await Promise.all([xslDataState ,ULB.aggregate(queryState)]);
      let ulbCount = stateInfo[0].totalUlbs;
      let xslDataStateName = xslDataStateInfo[0].state.name;
      let stateName = stateInfo[0].state.name;

        if(stateName !== xslDataStateName){
          return res.status(400).xls("error_sheet.xlsx", [{"message": "Wrong state file"}]);
        }
        if(ulbCount != (XslData.length- emptyCensus) ){
          return res.status(400).xls("error_sheet.xlsx", [{"message": `${ulbCount- (XslData.length-emptyCensus)} ulb data missing`}]);
          // return BadRequest(res, null, `${ulbCount- (XslData.length-emptyCensus)} ulb data missing`);
        }
      }
      const notValid = await validate(XslData, formData);
      if (notValid) {
        let amount = "grant amount";
        if(formData.design_year === "606aafb14dff55e6c075d3ae"){
          formData.design_year = '2022-23';
        }else if( formData.design_year === "606aaf854dff55e6c075d219"){
          formData.design_year = '2021-22';
        }
        let type = `${formData.type}_${formData.design_year}_${formData.installment}`
        amount = `${amount} - ${type}`

        /* Checking if the formData.design_year is equal to 2021-22 or undefined, if it is, then it sets the amount variable
        to "grant amount". */
        formData.design_year === undefined || formData.design_year === "2021-22"
          ? amount = "grant amount"
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
    let { design_year, type, installment ,year} = req.body;
    let state = req.decoded?.state;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();

    let condition = {}
    condition["state"] = state;
    condition["design_year"] =  design_year;
    condition["type"] = type;
    condition['installment'] = installment;
    condition['year'] = year;

    let form = await GrantDistribution.findOne(condition).lean();
    
    if(!form){
      let formData = req.body;
      formData["state"] = state;
      let data = await GrantDistribution.create(formData);
      if(!data){
        return res.status(400).json({
          status: false,
          message: "Form not saved."
        })
      }
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
    if(design_year === "606aaf854dff55e6c075d219"){
      await UpdateStateMasterForm(req, "grantAllocation");
    }
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
  if(formData.design_year === "606aafb14dff55e6c075d3ae"){
    formData.design_year = '2022-23';
  }else if( formData.design_year === "606aaf854dff55e6c075d219"){
    formData.design_year = '2021-22';
  }
  const type = `${formData.type}_${formData.design_year}_${formData.installment}`
  amount = `${amount} - ${type}`
  /* Checking if the formData.design_year is equal to 2021-22, if it is, then it sets the amount variable
  to "grant amount". */
  formData.design_year === "2021-22" ? amount = "grant amount": ""
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
  });
  return ulbDataMap;
}
