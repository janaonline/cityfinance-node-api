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
const MasterForm = require("../../models/MasterForm");
const Redis = require("../../service/redis");
const moment = require("moment");
const { promisify } = require("util");
const GTC = require('../../models/GrantTransferCertificate')

const GRANT_TYPES = {
   "nonmillion_untied":"60f6cdb468e143a9b134c337",
   "nonmillion_tied":"60f6cdb468e143a9b134c339",
  "million_tied": "60f6cdb368e143a9b134c335"
}


exports.get = async (req, res) => {
  try {
    let { csv, state_id, design_year, year_id, installment } = req.query;
    grantTypes = GrantType.find().select({ name: 1, _id: 1 }).lean();
    years = Year.find().select({ year: 1, _id: 1 }).lean();
    let data,
      query = { design_year },
      ExcelData = [],
      latestTime,
      states;

    if (state_id) {
      query.state = state_id;
    }
    let gtTransfer = GrantTransferMohua.find(query)
      .select({ _id: 1, modifiedAt: 1, stateData: 1, state: 1 })
      .lean();
    if (year_id == "2020-21")
      states = ULB.find({ isMillionPlus: "Yes" }).select({ state: 1 }).lean();
    else
      states = ULB.find({ isMillionPlus: "Yes", isUA: "Yes" })
        .select({ state: 1 })
        .lean();
    let gtcForms =  GTC.find({design_year, year: design_year}).lean()
    delete query.design_year;
    let allUlb = ULB.find(query)
      .select({ _id: 1, state: 1, isMillionPlus: 1, status: 1 })
      .lean();
    let ulbSubmittedForm = await MasterForm.find({})
      .select({ status: 1, actionTakenByRole: 1, ulb: 1 })
      .lean();

    data = await Promise.all([
      grantTypes,
      gtTransfer,
      years,
      states,
      allUlb,
      ulbSubmittedForm,
      gtcForms
    ]);
    if (data[1]?.length > 0) {
      let grantTypesMap = {},
        yearsMap = {};
      ulbMap = {};
      gtcFormsMap = {};
      data[0]?.forEach((element) => {
        grantTypesMap[element._id] = element.name;
      });
      data[2]?.forEach((element) => {
        yearsMap[element._id] = element.year;
      });
      data[4]?.forEach((element) => {
        if (yearsMap[element.state]) yearsMap[element.state].push(element);
        else yearsMap[element.state] = [element];
      });
      data[6]?.forEach((element)=> {
        let key = `${element.state}_${GRANT_TYPES[element.type]}_${element.installment}`
        gtcFormsMap[key] =  element.stateSubmit ?? ""

      })

      data[1] = JSON.parse(JSON.stringify(data[1]));
      if (csv === "true") {
        data[1]?.forEach((element) => {
          if(element.stateData){
            element?.stateData?.forEach((innerElement) => {
              if (year_id && year_id != yearsMap[innerElement.year]) {
                return true;
              }
              if (installment && installment != innerElement.installment) {
                return true;
              }
              innerElement.year = yearsMap[innerElement.year];
              if(design_year === "606aafb14dff55e6c075d3ae"){
                let key = `${element.state}_${innerElement.GrantType}_${innerElement.installment}`
                  innerElement.submissionDate = gtcFormsMap[key];
              }
              innerElement.GrantType = grantTypesMap[innerElement.GrantType];
              if (innerElement.submissionDate)
                innerElement.submissionDate = moment(
                  innerElement.submissionDate
                ).format("L");
              if (innerElement.releaseDate)
                innerElement.releaseDate = moment(
                  innerElement.releaseDate
                ).format("L");
              if (innerElement.recommendationDate)
                innerElement.recommendationDate = moment(
                  innerElement.recommendationDate
                ).format("L");
              ExcelData.push(innerElement);
            });
          }
        });
      } else {
        let mill = {
          recommendationDate: 0,
          releaseDate: 0,
          submissionDate: 0,
          amount: 0,
          ulbSubmittedForm: 0,
          totalUlb: 0,
          amountReleased: 0,
        },
          NonMillTied = {
            recommendationDate: 0,
            releaseDate: 0,
            submissionDate: 0,
            amount: 0,
            ulbSubmittedForm: 0,
            totalUlb: 0,
            amountReleased: 0,
          },
          NonMillUntied = {
            recommendationDate: 0,
            releaseDate: 0,
            submissionDate: 0,
            amount: 0,
            ulbSubmittedForm: 0,
            totalUlb: 0,
            amountReleased: 0,
          },
          statesWithMillPlusUlbs = {},
          statesCount = 0,
          statesWithMillPlusUlbsCount = 0;

        data[3].forEach((element) => {
          statesWithMillPlusUlbs[element.state] = element;
        });
        for (let index = 0; index < data[1].length; index++) {
          const element = data[1][index];

          if (!latestTime) {
            latestTime = moment(element.modifiedAt);
          } else if (moment(element.modifiedAt) > latestTime) {
            latestTime = moment(element.modifiedAt);
          }
          if (statesWithMillPlusUlbs[element.state]) {
            statesWithMillPlusUlbsCount++;
          }
          statesCount++;
          for (let index = 0; index < element.stateData.length; index++) {
            const innerElement = element.stateData[index];

            if (year_id && year_id != yearsMap[innerElement.year]) {
              continue;
            }

            if (installment && installment != innerElement.installment) {
              continue;
            }
            switch (grantTypesMap[innerElement.GrantType]) {
              case "Million Plus for Water Supply and SWM":
                // if (innerElement.submissionDate) mill.submissionDate++;
                if (state_id) {
                  if (innerElement.recommendationDate)
                    mill.recommendationDate = innerElement.recommendationDate;
                  if (innerElement.releaseDate)
                    mill.amountReleased = innerElement.amountReleased;
                  mill.releaseDate = innerElement.releaseDate;
                } else {
                  if (innerElement.recommendationDate)
                    mill.recommendationDate++;
                  if (innerElement.releaseDate) mill.releaseDate++;
                }
                if (innerElement.amountAssigned)
                  mill.amount += innerElement.amountAssigned;
                ulbCountsObj = await ulbInState(
                  element.state.toString(),
                  "Yes",
                  data[4],
                  data[5]
                );
                mill.ulbSubmittedForm = ulbCountsObj.ulbCount;
                mill.totalUlb += innerElement.noOfUlb;
                break;
              case "Non-Million Untied":
                // if (innerElement.submissionDate) NonMillTied.submissionDate++;
                if (state_id) {
                  if (innerElement.recommendationDate)
                    NonMillTied.recommendationDate =
                      innerElement.recommendationDate;
                  if (innerElement.releaseDate)
                    NonMillTied.amountReleased = innerElement.amountReleased;
                  NonMillTied.releaseDate = innerElement.releaseDate;
                } else {
                  if (innerElement.recommendationDate)
                    NonMillTied.recommendationDate++;
                  if (innerElement.releaseDate) NonMillTied.releaseDate++;
                }
                if (innerElement.amountAssigned)
                  NonMillTied.amount += innerElement.amountAssigned;
                ulbCountsObj = await ulbInState(
                  element.state.toString(),
                  "No",
                  data[4],
                  data[5]
                );
                NonMillTied.ulbSubmittedForm = ulbCountsObj.ulbCount;
                NonMillTied.totalUlb += innerElement.noOfUlb;
                break;
              case "Non-Million Tied":
                // if (innerElement.submissionDate) NonMillUntied.submissionDate++;
                if (state_id) {
                  if (innerElement.recommendationDate)
                    NonMillUntied.recommendationDate =
                      innerElement.recommendationDate;
                  if (innerElement.releaseDate)
                    NonMillUntied.amountReleased = innerElement.amountReleased;
                  NonMillUntied.releaseDate = innerElement.releaseDate;
                } else {
                  if (innerElement.recommendationDate)
                    NonMillUntied.recommendationDate++;
                  if (innerElement.releaseDate) NonMillUntied.releaseDate++;
                }
                if (innerElement.amountAssigned)
                  NonMillUntied.amount += innerElement.amountAssigned;
                ulbCountsObj = await ulbInState(
                  element.state.toString(),
                  "No",
                  data[4],
                  data[5]
                );
                NonMillUntied.ulbSubmittedForm = ulbCountsObj.ulbCount;
                NonMillUntied.totalUlb += innerElement.noOfUlb;
                break;
            }
          }

          if (installment == 2) {
            installment = 1;
          } else if (installment == 1 && year_id == "2020-22") {
            year_id == "2020-21";
            installment = 2;
          }

          for (let index = 0; index < element.stateData.length; index++) {
            const innerElement = element.stateData[index];

            if (year_id && year_id != yearsMap[innerElement.year]) {
              continue;
            }
            if (installment && installment != innerElement.installment) {
              continue;
            }
            switch (grantTypesMap[innerElement.GrantType]) {
              case "Million Plus for Water Supply and SWM":
                if (state_id) {
                  if (innerElement.submissionDate)
                    mill.submissionDate = innerElement.submissionDate;
                } else {
                  if (innerElement.submissionDate) mill.submissionDate++;
                }
                break;
              case "Non-Million Untied":
                if (state_id) {
                  if (innerElement.submissionDate)
                    NonMillTied.submissionDate = innerElement.submissionDate;
                } else {
                  if (innerElement.submissionDate) NonMillTied.submissionDate++;
                }
                break;
              case "Non-Million Tied":
                if (state_id) {
                  if (innerElement.submissionDate)
                    NonMillUntied.submissionDate = innerElement.submissionDate;
                } else {
                  if (innerElement.submissionDate)
                    NonMillUntied.submissionDate++;
                }
                break;
            }
          }
        }
        if (state_id) {
          ExcelData.push({
            "Million Plus for Water Supply and SWM": {
              recommendationDate: mill.recommendationDate
                ? `Sent to MoF on ${moment(mill.recommendationDate).format(
                  "L"
                )}`
                : "Not Sent",
              releaseDate: mill.releaseDate
                ? `${mill.amountReleased}Cr Released on ${moment(
                  mill.releaseDate
                ).format("L")}`
                : "Not Released",
              submissionDate: mill.submissionDate
                ? `Submitted on ${moment(mill.submissionDate).format(
                  "L"
                )}`
                : "Not Submitted",
              amount: mill.amount,
              ulb: `${mill.ulbSubmittedForm}/${mill.totalUlb}`,
            },
            "Non-Million Tied": {
              recommendationDate: NonMillTied.recommendationDate
                ? `Sent to MoF on ${moment(
                  NonMillTied.recommendationDate
                ).format("L")}`
                : "Not Sent",
              releaseDate: NonMillTied.releaseDate
                ? `${NonMillTied.amountReleased}Cr Released on ${moment(
                  NonMillTied.releaseDate
                ).format("L")}`
                : "Not Released",
              submissionDate: NonMillTied.submissionDate
                ? `Submitted on ${moment(NonMillTied.submissionDate).format(
                  "L"
                )}`
                : "Not Submitted",
              amount: NonMillTied.amount,
              ulb: `${NonMillTied.ulbSubmittedForm}/${NonMillTied.totalUlb}`,
            },
            "Non-Million Untied": {
              recommendationDate: NonMillUntied.recommendationDate
                ? `Sent to MoF on ${moment(
                  NonMillUntied.recommendationDate
                ).format("L")}`
                : "Not Sent",
              releaseDate: NonMillUntied.releaseDate
                ? `${NonMillUntied.amountReleased}Cr Released on ${moment(
                  NonMillUntied.releaseDate
                ).format("L")}`
                : "Not Released",
              submissionDate: NonMillUntied.submissionDate
                ? `Submitted on ${moment(NonMillUntied.submissionDate).format(
                  "L"
                )}`
                : "Not Submitted",
              amount: NonMillUntied.amount,
              ulb: `${NonMillUntied.ulbSubmittedForm}/${NonMillUntied.totalUlb}`,
            },
          });
        } else {
          ExcelData.push({
            "Million Plus for Water Supply and SWM": {
              recommendationDate: `${mill.recommendationDate}/${statesWithMillPlusUlbsCount}`,
              releaseDate: `${mill.releaseDate}/${statesWithMillPlusUlbsCount}`,
              submissionDate: `${mill.submissionDate}/${statesWithMillPlusUlbsCount}`,
              amount: mill.amount,
              ulb: `${mill.ulbSubmittedForm}/${mill.totalUlb}`,
            },
            "Non-Million Tied": {
              recommendationDate: `${NonMillTied.recommendationDate}/${statesCount}`,
              releaseDate: `${NonMillTied.releaseDate}/${statesCount}`,
              submissionDate: `${NonMillTied.submissionDate}/${statesCount}`,
              amount: NonMillTied.amount,
              ulb: `${NonMillTied.ulbSubmittedForm}/${NonMillTied.totalUlb}`,
            },
            "Non-Million Untied": {
              recommendationDate: `${NonMillUntied.recommendationDate}/${statesCount}`,
              releaseDate: `${NonMillUntied.releaseDate}/${statesCount}`,
              submissionDate: `${NonMillUntied.submissionDate}/${statesCount}`,
              amount: NonMillUntied.amount,
              ulb: `${NonMillUntied.ulbSubmittedForm}/${NonMillUntied.totalUlb}`,
            },
          });
        }
      }
    } else {
      ExcelData = await makeData(design_year);
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
    console.error(err);
    return Response.DbError(res, err.message, "server error");
  }
};

const ulbInState = async (state, isMillionPlus, allUlb, ulbSubmittedForm) => {
  let ulbMap = {},
    ulbIds = [],
    ulbCount = 0;
  for (let index = 0; index < allUlb.length; index++) {
    const element = allUlb[index];
    if (ulbMap[element.state]) ulbMap[element.state].push(element);
    else ulbMap[element.state] = [element];
  }
  if (ulbMap[state]) {
    for (const iterator of ulbMap[state]) {
      if (iterator.isMillionPlus === isMillionPlus)
        ulbIds.push(iterator._id.toString());
    }
  }

  ulbSubmittedForm.forEach((element) => {
    if (
      ulbIds.includes(element.ulb.toString()) &&
      element.actionTakenByRole != "ULB" &&
      element.status != "REJECTED"
    )
      ulbCount++;
  });
  return { ulbCount };
};

const makeData = async (design_year) => {
  let allData = await getStates();
  excelData = [];
  allData.forEach((ele) => {
    year = [
      "2020-21",
      "2020-21",
      "2020-21",
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
    if(design_year === "606aafb14dff55e6c075d3ae"){
      year = [
        "2022-23",
        "2022-23",
        "2022-23",
        "2022-23",
        "2022-23",
      ]
    }
    grantTypes = [
      "Non-Million Untied",
      "Non-Million Tied",
      "Million Plus for Water Supply and SWM",
    ];
    grantIndex = 0;
    installmentIndex = 0;
    installmentCount = 1;
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
        if (installmentCount == 1) {
          installmentCount = 2;
        } else {
          installmentCount = 1;
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
    allStates = await State.find({ accessToXVFC: true })
      .select({ _id: 1, name: 1 })
      .lean();
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
    let gtcFormsMap = {};
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

      if (!matchHeaders(XslData[0])) {
        return res
          .status(400)
          .xls("error_sheet.xlsx", { error: "Invalid Format" });
      }
      if(design_year === "606aafb14dff55e6c075d3ae"){
        const gtcForms = await GTC.find({
          design_year,
          year: design_year,
        }).lean();

        gtcForms.forEach((element)=> {
          let key = `${element.state}_${GRANT_TYPES[element.type]}_${element.installment}`
          gtcFormsMap[key] =  (element.stateSubmit ? moment(element.stateSubmit).format("L"): element.stateSubmit ) ?? ""
        })
      }
      let xlsData = await Service.dataFormating(XslData, field);
      // validate data
      const result = await validate(xlsData,gtcFormsMap, design_year);
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
      allStates = await State.find({ accessToXVFC: true })
        .select({ _id: 1, name: 1 })
        .lean();
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

async function validate(data, gtcFormsMap, design_year) {
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
      if (grantTypeMap[element.GrantType]?._id) {
        element.GrantType = grantTypeMap[element.GrantType]._id;
      } else if (element.GrantType != "") {
        valid = false;
        element.error += "wrong grant type, ";
      }
      if (yearsMap[element.year]._id) {
        element.year = yearsMap[element.year]?._id;
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
      let date = moment(element.submissionDate, "L");
      if(design_year === "606aafb14dff55e6c075d3ae"){
        let key = `${stateNameMap[element.name]["state"]}_${element.GrantType}_${element.installment}`
        if(gtcFormsMap[key]){
          if( gtcFormsMap[key] !== element.submissionDate){
            valid = false;
            element.error+="submission date cannot be changed,"
          }
        } else if(element.submissionDate){
          valid = false;
          element.error+="submission date cannot be changed,"
        }
      }
      console.log(date._isValid);
      if (date._isValid) {
        element.submissionDate = date._d;
      } else if (element.submissionDate) {
        valid = false;
        element.error += "wrong submission date, ";
      }
      date = moment(element.recommendationDate, "L");
      if (date._isValid) {
        element.recommendationDate = date._d;
      } else if (element.recommendationDate) {
        valid = false;
        element.error += "wrong recommendation date, ";
      }
      date = moment(element.releaseDate, "L");
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
    return res.status(500).JSON(error.message);
  }
}

function matchHeaders(data) {
  let incomingHeaders = Object.keys(data);
  if (incomingHeaders.length != headers.length) return false;
  for (let index = 0; index < incomingHeaders.length; index++) {
    const element = incomingHeaders[index];
    if (!headers.includes(element)) {
      return false;
    }
  }
  return true;
}

const headers = [
  "grant amount assigned (in cr)",
  "state name",
  "year",
  "installment number",
  "grant type",
  "no of ulbs",
  "grant transfer certificate submission date",
  "grant recommendation date",
  "grant release date",
  "grant amount released (in cr)",
];
