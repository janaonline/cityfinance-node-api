const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const Service = require("../../service");
const downloadFileToDisk = require("../file-upload/service").downloadFileToDisk;
const GrantTransferMohua = require("../../models/grantTransferMohua");
const GrantType = require("../../models/GrantType");
const ULB = require("../../models/Ulb");
const Year = require("../../models/Year");
const State = require("../../models/State");
const Redis = require("../../service/redis");
const moment = require("moment");
const { promisify } = require("util");

exports.get = async (req, res) => {
  try {
    const { csv, state_id, design_year, year_id, installment } = req.query;
    grantTypes = GrantType.find().select({ name: 1, _id: 1 }).lean();
    years = Year.find().select({ year: 1, _id: 1 }).lean();
    let data,
      query = { design_year },
      ExcelData = [],
      latestTime;

    if (state_id) {
      query.state = state_id;
    }
    gtTransfer = GrantTransferMohua.find(query)
      .select({ _id: 1, modifiedAt: 1, stateData: 1, state: 1 })
      .lean();
    if (year_id == "2020-21")
      states = ULB.find({ isMillionPlus: "Yes" }).select({ state: 1 }).lean();
    else
      states = ULB.find({ isMillionPlus: "Yes", isUA: "Yes" })
        .select({ state: 1 })
        .lean();

    data = await Promise.all([grantTypes, gtTransfer, years, states]);
    if (data[1].length > 0) {
      let grantTypesMap = {},
        yearsMap = {};
      data[0].forEach((element) => {
        grantTypesMap[element._id] = element.name;
      });
      data[2].forEach((element) => {
        yearsMap[element._id] = element.year;
      });

      data[1] = JSON.parse(JSON.stringify(data[1]));
      if (csv === "true") {
        data[1].forEach((element) => {
          element.stateData.forEach((innerElement) => {
            if (year_id && year_id != yearsMap[innerElement.year]) {
              return true;
            }
            if (installment && installment != innerElement.installment) {
              return true;
            }
            innerElement.year = yearsMap[innerElement.year];
            innerElement.GrantType = grantTypesMap[innerElement.GrantType];
            innerElement.submissionDate = moment(
              innerElement.submissionDate
            ).format("DD/MM/YYYY");
            innerElement.releaseDate = moment(innerElement.releaseDate).format(
              "DD/MM/YYYY"
            );
            innerElement.recommendationDate = moment(
              innerElement.recommendationDate
            ).format("DD/MM/YYYY");
            ExcelData.push(innerElement);
          });
        });
      } else {
        let mill = {
            start: 0,
            mid: 0,
            complete: 0,
          },
          NonMillTied = {
            start: 0,
            mid: 0,
            complete: 0,
          },
          NonMillUntied = {
            start: 0,
            mid: 0,
            complete: 0,
          },
          statesWithMillPlusUlbs = {},
          statesCount = 0,
          statesWithMillPlusUlbsCount = 0;
        data[3].forEach((element) => {
          statesWithMillPlusUlbs[element.state] = element;
        });
        data[1].forEach((element) => {
          if (!latestTime) {
            latestTime = moment(element.modifiedAt);
          } else if (moment(element.modifiedAt) > latestTime) {
            latestTime = moment(element.modifiedAt);
          }
          if (statesWithMillPlusUlbs[element.state]) {
            statesWithMillPlusUlbsCount++;
          }
          statesCount++;
          element.stateData.forEach((innerElement) => {
            if (year_id && year_id != yearsMap[innerElement.year]) {
              return true;
            }
            console.log(installment, innerElement.installment);
            if (installment && installment != innerElement.installment) {
              return true;
            }
            switch (grantTypesMap[innerElement.GrantType]) {
              case "Million Plus for Water Supply and SWM":
                if (innerElement.recommendationDate) mill.start++;
                if (innerElement.releaseDate) mill.mid++;
                if (innerElement.submissionDate) mill.complete++;
                break;
              case "Non-Million Untied":
                if (innerElement.recommendationDate) NonMillTied.start++;
                if (innerElement.releaseDate) NonMillTied.mid++;
                if (innerElement.submissionDate) NonMillTied.complete++;
                break;
              case "Non-Million Tied":
                if (innerElement.recommendationDate) NonMillUntied.start++;
                if (innerElement.releaseDate) NonMillUntied.mid++;
                if (innerElement.submissionDate) NonMillUntied.complete++;
                break;
            }
          });
        });
        ExcelData.push({
          mill,
          NonMillTied,
          NonMillUntied,
          statesCount,
          statesWithMillPlusUlbsCount,
        });
      }
    } else {
      ExcelData = await makeData();
    }
    if (csv === "true") {
      let field = {
        name: "State Name",
        year: "Year",
        installment: "Installment Number",
        GrantType: "Grant Type",
        noOfUlb: "No of ULBs",
        submissionDate: "Grant Transfer Certificate Submission Date",
        recommendationDate: "Grant Recommendation Date",
        releaseDate: "Grant Release Date",
        amountReleased: "Grant Amount Released (in Cr)",
        amountAssigned: "Grant Amount Assigned (in Cr)",
      };
      let xlsData = await Service.dataFormating(ExcelData, field);
      return res.xls("grant_template.xlsx", xlsData);
    } else {
      return Response.OK(res, { ExcelData, latestTime }, "Success");
    }
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

const makeData = async () => {
  let allData = await getStates();
  excelData = [];
  allData.forEach((ele) => {
    year = [
      "2020-21",
      "2020-21",
      "2020-21",
      "2021-22",
      "2021-22",
      "2021-22",
      "2021-22",
      "2021-22",
      "2021-22",
    ];
    grantTypes = [
      "Million Plus for Water Supply and SWM",
      "Non-Million Untied",
      "Non-Million Tied",
    ];
    grantIndex = 0;
    installmentIndex = 0;
    installmentCount = 2;
    year.forEach((element) => {
      let newObj = {
        name: "",
        year: "",
        installment: "",
        GrantType: "",
        noOfUlb: null,
        submissionDate: null,
        recommendationDate: null,
        releaseDate: null,
        amountReleased: null,
        amountAssigned: null,
      };
      newObj.year = element;
      if (installmentIndex == 3) {
        if (installmentCount == 2) {
          installmentCount = 1;
        } else {
          installmentCount = 2;
        }
        installmentIndex = 0;
      }
      newObj.installment = installmentCount;
      installmentIndex++;
      newObj.name = ele.name;
      newObj.GrantType = grantTypes[grantIndex++];
      if (grantIndex == 3) {
        grantIndex = 0;
      }
      switch (newObj.GrantType) {
        case "Million Plus for Water Supply and SWM":
          newObj.noOfUlb = ele.noOfMillionPlusUlbs;
          break;
        case "Non-Million Untied":
        case "Non-Million Tied":
          newObj.noOfUlb = ele.noOfNonMillionPlusUlbs;
          break;
      }
      excelData.push(newObj);
    });
  });
  return excelData;
};

const getStates = async () => {
  try {
    const getAsync = promisify(Redis.Client.get).bind(Redis.Client);
    allStates = await getAsync("states");

    if (!allStates) {
      allStates = await State.find().select({ _id: 1, name: 1 }).lean();
      Redis.set("states", JSON.stringify(allStates));
    } else {
      allStates = JSON.parse(allStates);
    }
    let Ulbs = [];
    for (let index = 0; index < allStates.length; index++) {
      const element = allStates[index];
      Ulbs.push(getUlbs(element._id, element.name));
    }
    let ulbData = await Promise.all(Ulbs);
    return ulbData;
  } catch (error) {
    console.log(error);
  }
};

const getUlbs = async (state, name) => {
  try {
    let ulbs = await ULB.find({ state })
      .select({
        state: 1,
        isMillionPlus: 1,
        _id: 1,
        isUA: 1,
      })
      .lean();
    let noOfMillionPlusUlbs = 0,
      noOfNonMillionPlusUlbs = 0;
    ulbs.forEach((element) => {
      if (element.isMillionPlus == "Yes") {
        if (element.isUA == "Yes") {
          noOfMillionPlusUlbs++;
        }
      } else {
        noOfNonMillionPlusUlbs++;
      }
    });

    return { state, name, noOfMillionPlusUlbs, noOfNonMillionPlusUlbs };
  } catch (error) {
    console.log(error);
  }
};

exports.uploadTemplate = async (req, res) => {
  try {
    const { url, design_year } = req.body;
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

      let field = {
        ["state name"]: "name",
        ["year"]: "year",
        ["installment number"]: "installment",
        ["grant type"]: "GrantType",
        ["no of ulbs"]: "noOfUlb",
        ["grant transfer certificate submission date"]: "submissionDate",
        ["grant recommendation date"]: "recommendationDate",
        ["grant release date"]: "releaseDate",
        ["grant amount released (in cr)"]: "amountReleased",
        ["grant amount assigned (in cr)"]: "amountAssigned",
      };

      let xlsData = await Service.dataFormating(XslData, field);
      // validate data
      const result = await validate(xlsData);
      if (!result.valid) {
        let field = {
          name: "State Name",
          year: "Year",
          installment: "Installment Number",
          GrantType: "Grant Type",
          noOfUlb: "No of ULBs",
          submissionDate: "Grant Transfer Certificate Submission Date",
          recommendationDate: "Grant Recommendation Date",
          releaseDate: "Grant Release Date",
          amountReleased: "Grant Amount Released (in Cr)",
          amountAssigned: "Grant Amount Assigned (in Cr)",
          error: "Error",
        };
        let xlsData = await Service.dataFormating(result.data, field);
        // return res.send(result.data);
        return res.status(400).xls("error_sheet.xlsx", xlsData);
      }

      let dataToSave = result.data;
      const getAsync = promisify(Redis.Client.get).bind(Redis.Client);
      allStates = JSON.parse(await getAsync("states"));
      let allPromises = [];
      allStates.forEach((element) => {
        state_id = element._id;
        let stateEntry = dataToSave[element.name],
          statePromise = GrantTransferMohua.findOneAndUpdate(
            { state: ObjectId(state_id), design_year: ObjectId(design_year) },
            {
              state: state_id,
              stateData: stateEntry,
              modifiedAt: new Date(),
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          );
        allPromises.push(statePromise);
      });
      await Promise.all(allPromises);
      return Response.OK(res, null, "Data Saved");
    });
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
  try {
    let valid = true,
      copyData = JSON.parse(JSON.stringify(data));
    let statesData = getStates(),
      grantType = GrantType.find().select({ name: 1, _id: 1 }).lean(),
      years = Year.find().select({ year: 1, _id: 1 }).lean();
    let stateGrantYear = await Promise.all([statesData, grantType, years]);
    statesData = stateGrantYear[0];
    grantType = stateGrantYear[1];
    years = stateGrantYear[2];

    let errors = [],
      stateNameMap = {},
      grantTypeMap = {},
      yearsMap = {};

    statesData.forEach((element) => {
      stateNameMap[element.name] = element;
    });
    grantType.forEach((element) => {
      grantTypeMap[element.name] = element;
    });
    years.forEach((element) => {
      yearsMap[element.year] = element;
    });

    data.forEach((element) => {
      element.error = "";
      let stateData = stateNameMap[element.name];
      if (!stateData) {
        valid = false;
        element.error += "wrong state name, ";
      }
      if (!isNaN(parseInt(element.installment))) {
        element.installment = parseInt(element.installment);
        if (element.installment != 1 && element.installment != 2) {
          valid = false;
          element.error += "wrong Installment number, ";
        }
      } else if (element.installment != "") {
        valid = false;
        element.error += "Installment should be a number, ";
      }
      if (grantTypeMap[element.GrantType]._id) {
        element.GrantType = grantTypeMap[element.GrantType]._id;
      } else if (element.GrantType != "") {
        valid = false;
        element.error += "wrong grant type, ";
      }
      if (yearsMap[element.year]._id) {
        element.year = yearsMap[element.year]._id;
      } else if (element.year != "") {
        valid = false;
        element.error += "wrong year value, ";
      }
      if (!isNaN(parseInt(element.noOfUlb))) {
        element.noOfUlb = parseInt(element.noOfUlb);
        switch (element.GrantType) {
          case "Million Plus for Water Supply and SWM":
            if (element.noOfUlb != stateData.noOfMillionPlusUlbs) {
              valid = false;
              element.error += "wrong no of ulbs, ";
            }
            break;
          case "Non-Million Untied":
          case "Non-Million Tied":
            if (element.noOfUlb != stateData.noOfNonMillionPlusUlbs) {
              valid = false;
              element.error += "wrong no of ulbs, ";
            }
            break;
        }
      } else if (element.noOfUlb) {
        valid = false;
        element.error += "Installment should be a number,";
      }
      if (!isNaN(parseInt(element.amountAssigned))) {
        element.amountAssigned = parseInt(element.amountAssigned);
      } else if (element.amountAssigned) {
        valid = false;
        element.error += "Installment should be a number,";
      }
      if (!isNaN(parseInt(element.amountReleased))) {
        element.amountReleased = parseInt(element.amountReleased);
      } else if (element.amountReleased) {
        valid = false;
        element.error += "Installment should be a number,";
      }
      let date = moment(element.submissionDate, "DD/MM/YYYY");
      console.log(date._isValid);
      if (date._isValid) {
        element.submissionDate = date._d;
      } else if (element.submissionDate) {
        valid = false;
        element.error += "wrong submission date, ";
      }
      date = moment(element.recommendationDate, "DD/MM/YYYY");
      if (date._isValid) {
        element.recommendationDate = date._d;
      } else if (element.recommendationDate) {
        valid = false;
        element.error += "wrong recommendation date, ";
      }
      date = moment(element.releaseDate, "DD/MM/YYYY");
      if (date._isValid) {
        element.releaseDate = date._d;
      } else if (element.releaseDate) {
        valid = false;
        element.error += "wrong release date, ";
      }
      for (const key in element) {
        if (element[key] === "") {
          element[key] = null;
        }
      }
    });

    if (valid) {
      let allDataByName = {};
      data.forEach((element) => {
        if (element.error) {
          delete element.error;
        }
        if (allDataByName[element.name]) {
          if (!Array.isArray(allDataByName[element.name])) {
            let array = [allDataByName[element.name]];
            array.push(element);
            allDataByName[element.name] = array;
          } else allDataByName[element.name].push(element);
        } else allDataByName[element.name] = element;
      });
      data = allDataByName;
    } else {
      let index = 0;
      copyData.forEach((element) => {
        element.error = data[index++].error;
      });
      data = copyData;
    }
    return { data, valid };
  } catch (error) {
    console.log(error);
  }
}
