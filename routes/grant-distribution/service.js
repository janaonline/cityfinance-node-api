const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const ObjectId = require("mongoose").Types.ObjectId;
const ULB = require("../../models/Ulb");
const Response = require("../../service").response;
const Service = require("../../service");
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const GrantDistribution = require("../../models/GrantDistribution");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
exports.getGrantDistribution = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  try {
    let grantDistribution = await GrantDistribution.find({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 });

    grantDistribution = JSON.parse(JSON.stringify(grantDistribution))
    grantDistribution.forEach((entity)=>{

            if(entity.design_year.toString() == "606aadac4dff55e6c075c507"){
                entity.key = `${entity.type}_2020-21_${entity.installment}`
            } 

            if(entity.design_year.toString() == ObjectId("606aaf854dff55e6c075d219")){
                entity.key = `${entity.type}_2021-22_${entity.installment}`
            } 
            
            if(entity.design_year.toString() == "606aafb14dff55e6c075d3ae"){
                entity.key = `${entity.type}_2022-23_${entity.installment}`
            }
        })
    if (!grantDistribution) {
      return Response.BadRequest(res, null, "No GrantDistribution found");
    }
    return Response.OK(res, grantDistribution, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getTemplate = async (req, res) => {
  let formData = req.query;
  let { state } = req?.decoded;
  try {
    const ulbs = await ULB.find({
      state: ObjectId(state),
      isActive: true,
    }).select({ censusCode: 1, name: 1, sbCode: 1 });

    if (ulbs.length === 0) {
      return Response.BadRequest(res, "No ULB found");
    }
    if(formData.year === "606aafb14dff55e6c075d3ae"){
      formData.year = '2022-23';
    }else if( formData.year === "606aaf854dff55e6c075d219"){
      formData.year = '2021-22';
    }
    let typeInstallmentYear = `${formData.type}_${formData.year}_${formData.installment}`;
    let field = {
      
      code: "ULB Census Code/ULB Code",
      name: "ULB Name",
      amount: `Grant Amount - ${typeInstallmentYear} `,
    };

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
    

    let xlsData = await Service.dataFormating(data, field);
    
    return res.xls("grant_template.xlsx", xlsData);
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.uploadTemplate = async (req, res) => {
  let { url, design_year } = req.query;
  let formData = req.query;
  let state = req.decoded?.state;
  try {
    downloadFileToDisk(url, async (err, file) => {
      if (err) {
        return Response.BadRequest(err, err.message);
      } else if (!file) {
        return Response.BadRequest(err, "No File Found");
      }

      //read file
      const XslData = await readXlsxFile(file);

      if (XslData.length == 0)
        return Response.BadRequest(res, "No File Found/Data");
      // validate data
      const notValid = await validate(XslData, formData);
      if (notValid) {
        let amount = "grant amount";
        if(formData.design_year === "606aafb14dff55e6c075d3ae"){
          formData.design_year = '2022-23';
        }else if( formData.design_year === "606aaf854dff55e6c075d219"){
          formData.design_year = '2021-22';
        }
        const type = `${formData.type}_${formData.design_year}_${formData.installment}`
        amount = `${amount} - ${type}`
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
    let { design_year } = req.body;
    let state = req.decoded?.state;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();

    let data = await GrantDistribution.findOneAndUpdate(
      {
        state: ObjectId(state),
        isActive: true,
        design_year,
      },
      req.body,
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      }
    );
    await UpdateStateMasterForm(req, "grantAllocation");
    return Response.OK(res, data, "file submitted");
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
    if (!compareData[data[index][code]]) {
      errorFlag = true;
      if (data[index].Errors) data[index].Errors += "Code Not Valid,";
      else data[index].Errors = "Code Not Valid,";
    }
    if (
      data[index][code] === "" ||
      compareData[data[index][code]] != data[index][name] ||
      data[index][name] === ""
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
