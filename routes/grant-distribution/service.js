const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const ObjectId = require("mongoose").Types.ObjectId;
const ULB = require("../../models/Ulb");
const Response = require("../../service").response;
const Service = require("../../service");
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const GrantDistribution = require("../../models/GrantDistribution");
const { UpdateStateMasterForm } = require('../../service/updateStateMasterForm')
exports.getGrantDistribution = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  try {
    const grantDistribution = await GrantDistribution.findOne({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 });
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
  let { state } = req?.decoded;
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
      amount: "Grant Amount",
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
      const notValid = await validate(XslData);
      if (notValid) {
        return res.status(400).xls("error_sheet.xlsx", notValid);
      }
      return Response.OK(res, null, "file submitted");
    });
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.saveData = async (req, res) => {
  let { design_year } = req.body;
  let state = req.decoded?.state;
  req.body.actionTakenBy = req.decoded._id;
  try {
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
    await UpdateStateMasterForm(req, 'grantAllocation')
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

async function validate(data) {
  let ulbCodes = [],
    ulbNames = [];
  const code = "ulb census code/ulb code";
  const name = "ulb name";
  const amount = "grant amount";

  const keys = Object.keys(data[0]);
  if (
    !(keys.includes(code) && keys.includes(name) && keys.includes(amount)) ||
    keys.length !== 3
  ) {
    data.forEach((element) => {
      element.errorFormat = "Incorrect Format";
    });
    return data;
  }
  for (let index = 0; index < data.length; index++) {
    const keys = Object.keys(data[index]).length;
    if (keys !== 3) {
      data[index].errorFormat = "Incorrect Format";
    } else {
      data[index].errorFormat = null;
    }
    if (data[index][code]) ulbCodes.push(data[index][code]);
    if (data[index][name]) ulbNames.push(data[index][name]);
    data[index].errorAmount = null;
    data[index].errorCode = null;
    data[index].errorName = null;
  }
  // get ulb data
  const compareData = await getUlbData(ulbCodes, ulbNames);
  let errorFlag = false;
  for (let index = 0; index < data.length; index++) {
    if (!compareData[data[index][code]]) {
      errorFlag = true;
      data[index].errorCode = "Code Not Valid";
    }
    if (
      data[index][code] === "" ||
      compareData[data[index][code]] != data[index][name] ||
      data[index][name] === ""
    ) {
      errorFlag = true;
      data[index].errorName = "Name Not Valid";
    }
    if (!Number(data[index][amount]) || data[index][amount] === "") {
      errorFlag = true;
      data[index].errorAmount = "Amount Not valid";
    }
  }
  if (errorFlag) {
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

exports.action = async (req, res) => {
  let { design_year, state } = req.body;
  try {
    let grantDistribution = await GrantDistribution.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });
    const newGrantDistribution = await GrantDistribution.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: grantDistribution } }
    );
    if (!newGrantDistribution) {
      return Response.BadRequest(res, null, "No GrantDistribution found");
    }
    return Response.OK(res, newWaterRejenuvation, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
