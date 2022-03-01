const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ExcelJS = require("exceljs");
const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
const fs = require("fs");
const Indicator = require("../../models/indicators");
const ULB = require("../../models/Ulb");

const waterSupply = [
  "coverage of water supply connections",
  "per capita available of water at consumer end",
  "extent of metering of water connections",
  "extent of Non Revenue Water",
  "continuity of water supply",
  "efficiency in redressal of customer complaints",
  "quality of water supplied",
  "cost recovery in water supply services",
  "efficieny in collection of water supply related charges",
];
const sanitation = [
  "coverage of Toilets",
  "coverage of wastewater network services",
  "collection efficiency of wastewater networks",
  "adequacy of wastewater treatment capacity",
  "extent of reuse and recycling of treated watsewater",
  "quality of wastewater treatment",
  "efficieny in redressal of customer complaints",
  "exetent of cost recovery in wastewater management",
  "efficiency in collection of sewerage charges",
];
const solidWaste = [
  "household level coverage of solid waste management services",
  "Efficiency of collection of municipal solid waste",
  "extent of segregation of municipal solid waste",
  "extent of municipal solid waste recovered",
  "extent of scientific disposal of municipal solid waste",
  "extent of cost recovery in solid waste management services",
  "efficiency in collection of solid waste management charges",
  "efficiency in redressal of customer complaints",
];
const stormWater = [
  "coverage of storm water drainage network",
  "incidence of water logging/flooding",
];

const unitBenchmark = {
  "coverage of water supply connections": { benchMark: 100, unit: "Percent" },
  "per capita available of water at consumer end": {
    benchMark: 135,
    unit: "litres per capita per day (lpcd)",
  },
  "extent of metering of water connections": {
    benchMark: 100,
    unit: "Percent",
  },
  "extent of non-revenue water": { benchMark: 20, unit: "Percent" },
  "continuity of water supply": { benchMark: 24, unit: "Hours per day" },
  "efficiency in redressal of customer complaints": {
    benchMark: 80,
    unit: "Percent",
  },
  "quality of water supplied": { benchMark: 100, unit: "Percent" },
  "cost recovery in water supply services": { benchMark: 100, unit: "Percent" },
  "efficieny in collection of water supply related charges": {
    benchMark: 90,
    unit: "Percent",
  },

  "coverage of toilets": { benchMark: 100, unit: "Percent" },
  "coverage of wastewater network services": {
    benchMark: 100,
    unit: "Percent",
  },
  "collection efficiency of wastewater networks": {
    benchMark: 100,
    unit: "Percent",
  },
  "adequacy of wastewater treatment capacity": {
    benchMark: 100,
    unit: "Percent",
  },
  "quality of wastewater treatment": { benchMark: 100, unit: "Percent" },
  "extent of reuse and recycling of treated watsewater": {
    benchMark: 20,
    unit: "Percent",
  },
  "efficiency in redressal of customer complaints": {
    benchMark: 80,
    unit: "Percent",
  },
  "exetent of cost recovery in wastewater management": {
    benchMark: 100,
    unit: "Percent",
  },
  "efficiency in collection of sewerage charges": {
    benchMark: 90,
    unit: "Percent",
  },

  "household level coverage of solid waste management services": {
    benchMark: 100,
    unit: "Percent",
  },
  "efficiency of collection of municipal solid waste": {
    benchMark: 100,
    unit: "Percent",
  },
  "extent of segregation of municipal solid waste": {
    benchMark: 100,
    unit: "Percent",
  },
  "extent of municipal solid waste recovered": {
    benchMark: 80,
    unit: "Percent",
  },
  "extent of scientific disposal of municipal solid waste": {
    benchMark: 100,
    unit: "Percent",
  },
  "extent of cost recovery in solid waste management services": {
    benchMark: 100,
    unit: "Percent",
  },
  "efficieny in redressal of customer complaints": {
    benchMark: 80,
    unit: "Percent",
  },
  "efficiency in collection of solid waste management charges": {
    benchMark: 90,
    unit: "Percent",
  },

  "coverage of storm water drainage network": {
    benchMark: 100,
    unit: "Percent",
  },
  "incidence of water logging/flooding": {
    benchMark: 0,
    unit: "Nos. per year",
  },
};

exports.fileUpload = async (req, res) => {
  try {
    let data = await readXlsxFile(req.file);
    let bulkUploadData = [];
    for (let index = 0; index < data.dataSheet.length; index++) {
      const value = data.dataSheet[index];
      for (const key in value) {
        let indicator = {
          name: "",
          type: "",
          value: 0,
          ulbName: "",
          censusCode: "",
          ulb: "",
          year: value?.year,
          unitType: "",
          benchMarkValue: "",
        };
        const element = value[key];
        if (waterSupply.includes(key)) {
          indicator.type = "water supply";
          if (element != "NA" || element != "ND") indicator.value = element;
          indicator.name = key;
          indicator.ulbName = value["city name"];
          indicator.censusCode = value["census code"];
          let ulbId = await ULB.findOne({
            censusCode: value["census code"],
          })
            .select({ _id: 1 })
            .lean();
          indicator.ulb = ulbId?._id;
          indicator.year += "-" + (Number(indicator.year) + 1);
          indicator.unitType = unitBenchmark[key].unit;
          indicator.benchMarkValue = unitBenchmark[key].benchMark;
          bulkUploadData.push(indicator);
        }
        if (sanitation.includes(key)) {
          indicator.type = "sanitation";
          if (element != "NA" || element != "ND") indicator.value = element;
          indicator.name = key;
          indicator.ulbName = value["city name"];
          indicator.censusCode = value["census code"];
          let ulbId = await ULB.findOne({
            censusCode: value["census code"],
          })
            .select({ _id: 1 })
            .lean();
          indicator.ulb = ulbId?._id;
          indicator.year += "-" + (Number(indicator.year) + 1);
          if (!unitBenchmark[key]) console.log(key);
          indicator.unitType = unitBenchmark[key].unit;
          indicator.benchMarkValue = unitBenchmark[key].benchMark;
          bulkUploadData.push(indicator);
        }
        if (solidWaste.includes(key)) {
          indicator.type = "solid waste";
          if (element != "NA" || element != "ND") indicator.value = element;
          indicator.name = key;
          indicator.ulbName = value["city name"];
          indicator.censusCode = value["census code"];
          let ulbId = await ULB.findOne({
            censusCode: value["census code"],
          })
            .select({ _id: 1 })
            .lean();
          indicator.ulb = ulbId?._id;
          indicator.year += "-" + (Number(indicator.year) + 1);
          if (!unitBenchmark[key]) console.log(key);
          indicator.unitType = unitBenchmark[key].unit;
          indicator.benchMarkValue = unitBenchmark[key].benchMark;
          bulkUploadData.push(indicator);
        }
        if (stormWater.includes(key)) {
          indicator.type = "storm water";
          if (element != "NA" || element != "ND") indicator.value = element;
          indicator.name = key;
          indicator.ulbName = value["city name"];
          indicator.censusCode = value["census code"];
          let ulbId = await ULB.findOne({
            censusCode: value["census code"],
          })
            .select({ _id: 1 })
            .lean();
          indicator.ulb = ulbId?._id;
          indicator.year += "-" + (Number(indicator.year) + 1);
          if (!unitBenchmark[key]) console.log(key);
          indicator.unitType = unitBenchmark[key].unit;
          indicator.benchMarkValue = unitBenchmark[key].benchMark;
          bulkUploadData.push(indicator);
        }
      }
    }

    let newData = await Indicator.insertMany(bulkUploadData);

    return Response.OK(res, newData, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.getIndicatorData = async (req, res) => {
  try {
    let {
      benchMarkValue = 50,
      compUlb,
      ulb,
      type,
      indicatorName,
      year,
    } = req.query;
    type = type?.toLowerCase();
    let query = {};
    if (ulb) {
      Object.assign(query, { ulb });
    }
    if (type) {
      Object.assign(query, { type: { $regex: type } });
    }
    if (indicatorName) {
      indicatorName = indicatorName.toLowerCase();
      Object.assign(query, { name: indicatorName });
    }
    if (year) {
      Object.assign(query, { year });
    }

    let data = await Indicator.find(query).lean();
    let compData;
    if (compUlb) compData = await Indicator.find(query).lean();
    data = data.map((value, index) => {
      value.percentage = (value.value / value.benchMarkValue) * 100;
      if (compUlb)
        value.compPercentage = (compData[index] / value.benchMarkValue) * 100;
      return value;
    });
    return Response.OK(res, data, "Success");
  } catch (error) {
    return Response.DbError(res, error.message);
  }
};

exports.deleteALlData = async (req, res) => {
  try {
    let data = await Indicator.remove();
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

async function readXlsxFile(file) {
  return new Promise(async (resolve, reject) => {
    let exceltojson;
    try {
      let fileInfo = file.path.split(".");
      exceltojson =
        fileInfo &&
        fileInfo.length > 0 &&
        fileInfo[fileInfo.length - 1] == "xlsx"
          ? xlsxtojson
          : xlstojson;

      let prms2 = new Promise((rslv, rjct) => {
        exceltojson(
          {
            input: file.path,
            output: null, //since we don't need output.json
            lowerCaseHeaders: true,
            sheet: "",
          },
          function (err, sheet) {
            if (err) {
              rjct({ message: "Error: INPUT_SHEET_NAME" });
            } else {
              rslv(sheet);
            }
          }
        );
      });
      Promise.all([prms2])
        .then(
          (sheet) => {
            let dataSheet = sheet[0];
            let overviewSheet = null;
            if (dataSheet) {
              resolve({ overviewSheet, dataSheet });
            } else {
              console.log("readXlsxFile: sheet count");
              reject({ message: "Two sheet is required in the file." });
            }
          },
          (e) => {
            reject(e);
          }
        )
        .catch((e) => {
          reject(e);
        });
    } catch (e) {
      console.log("readXlsxFile: Exception", e);
      reject({
        message: "Caught Exception while reading file.",
        errMessage: e.message,
      });
    }
  });
}
