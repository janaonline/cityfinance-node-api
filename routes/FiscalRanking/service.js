const ObjectId = require("mongoose").Types.ObjectId;
const moongose = require("mongoose");
const ExcelJS = require('exceljs');
const Response = require("../../service").response;
const { years } = require("../../service/years");
const FiscalRanking = require("../../models/FiscalRanking");
const FiscalRankingMapper = require("../../models/FiscalRankingMapper");
const { FRTypeShortKey } = require('./formjson')
const UlbLedger = require("../../models/UlbLedger");
const { FORMIDs, MASTER_STATUS, MASTER_STATUS_ID, FORM_LEVEL, POPULATION_TYPE, YEAR_CONSTANTS, YEAR_CONSTANTS_IDS, USER_ROLE, MASTER_FORM_STATUS, TEST_EMAIL, ENV, APPROVAL_TYPES } = require("../../util/FormNames");
const { saveCurrentStatus, saveFormHistory, saveStatusHistory } = require("../../util/masterFunctions");
const FeedBackFiscalRanking = require("../../models/FeedbackFiscalRanking");
const TwentyEightSlbsForm = require("../../models/TwentyEightSlbsForm");
const StatusHistory = require("../../models/StatusHistory");

const Ulb = require("../../models/Ulb");
const Service = require("../../service");
const Users = require("../../models/User");
const { stateWiseHeatMapQuery, getCategoryMatchObject } = require("../../util/aggregation")
const FiscalRankingArray = require("./formjson").arr;
const {
  csvColsFr,
  getCsvProjectionQueries,
  updateCsvCols,
  hideFormVisibleUlb
} = require("../../util/fiscalRankingsConst");
const userTypes = require("../../util/userTypes");
const { dateFormatter } = require("../../util/dateformatter");
const { fyCsvDownloadQuery } = require('./query');

const {
  calculateKeys,
  canTakeActionOrViewOnly,
  calculateStatusForFiscalRankingForms,
  getKeyByValue,
  AggregationServices,
  canTakeActionOrViewOnlyMasterForm
} = require("../CommonActionAPI/service");
const { FRFormStatus } = require('../../util/15thFCstatus')
const Sidemenu = require("../../models/Sidemenu");
const {
  fiscalRankingFormJson,
  financialYearTableHeader,
  inputKeys,
  getInputKeysByType,
  jsonObject,
  fiscalRankingTabs,
  notRequiredValidations,
  statusList,
  statusTracker,
  questionLevelStatus,
  calculatedFields,
  fiscalRankingQestionSortkeys,
  requiredFields
} = require("./fydynemic");
const catchAsync = require("../../util/catchAsync");
const State = require("../../models/State");
const fs = require("fs");
const { fiscalRankingColsNameCsv } = require("../../util/Constants");
const TabsFiscalRankings = require("../../models/TabsFiscalRankings");
const { ulb } = require("../../util/userTypes");
const FormHistory = require("../../models/FormHistory");
let priorTabsForFiscalRanking = {
  basicUlbDetails: "s1",
  conInfo: "s2",
  financialInformation: "s3",
  uploadFyDoc: "s4",
  selDec: "s5",
};

function getMessages(params) {
  let { ulbName, formFreeze } = params

  if (formFreeze) {
    return {
      "freeze": `Dear ${ulbName}, PMU returned your form with a 10-day response request. Despite our efforts to contact you via email and phone, we have not received any responses. Consequently, we are now in the process of finalizing our ranking values.`
    }
  } else {
    return {
      "freeze": `Dear ${ulbName}, your data input form for City Finance Rankings has been put on hold. Cityfinance Rankings Module is no longer accepting submissions. Please email rankings@${process.env.PROD_HOST} for any queries.`
    }
  }
}
async function manageLedgerData(params) {
  let messages = []
  try {
    let { ledgerData, ledgerKeys, responseData, formId, currentFormStatus, role } = params
    let formHistory = await FormHistory.find({
      recordId: formId,
      "data.0.actionTakenByRole": userTypes.ulb
    }, {
      data: 1
    }).sort({
      "_id": -1
    }).limit(1).lean()
    let formHistoryData = formHistory[0] && formHistory[0].data.length ? formHistory[0]?.data[0]['fiscalMapperData'].filter(item => ledgerKeys.includes(item.type) && item.modelName === "ULBLedger") : []
    let errYears = new Set()
    let dps = new Set()
    let errorWithDps = {}
    for (let ledgerKey of ledgerKeys) {
      let question = responseData.financialInformation[ledgerKey]
      if (question.yearData.length) {
        for (let yearObj of question.yearData) {
          if (yearObj.ledgerUpdated) {
            let yearName = getKeyByValue(years, yearObj.year)
            try {
              errorWithDps[question.displayPriority].push(yearName)
            }
            catch (err) {
              errorWithDps[question.displayPriority] = [yearName]
            }
            let calculationFields = Object.entries(responseData.financialInformation).reduce((result, [key, value]) => ({ ...result, ...(question?.calculatedFrom.includes(value.displayPriority)) && { [key]: value } }), {})
            Object.values(calculationFields).forEach((item) => {
              item.yearData.forEach(async (childItem) => {
                let reason = `Data for ${question.displayPriority} has been changed. kindly revisit the calculations`
                let statusBefore = childItem.status
                if (childItem.year.toString() === yearObj.year) {
                  childItem.readonly = [statusTracker.RBP, statusTracker.IP].includes(currentFormStatus) && [questionLevelStatus['1']].includes(childItem.status) && role === userTypes.ulb ? false : childItem.readonly
                  childItem.rejectReason = [statusTracker.RBP, statusTracker.IP].includes(currentFormStatus) && [questionLevelStatus['1']].includes(childItem.status) ? reason : childItem.rejectReason
                  childItem.status = [statusTracker.RBP, statusTracker.IP].includes(currentFormStatus) && [questionLevelStatus['1']].includes(childItem.status) ? "REJECTED" : childItem.status
                }
                if (statusBefore !== childItem.status) {
                  // updating values on get api because of requirement to change the data only when ulb view the form.
                  await FiscalRankingMapper.findOneAndUpdate({
                    year: ObjectId(childItem.year),
                    type: childItem.type,
                    fiscal_ranking: formId
                  }, {
                    "$set": {
                      rejectReason: childItem.rejectReason,
                      status: childItem.status
                    }
                  })
                }
              })
            })
            responseData.financialInformation = { ...responseData.financialInformation, ...calculationFields }
          }
        }
      }
    }
    if (Object.keys(errorWithDps).length) {
      let str = 'Data for fields '
      for (let k in Object.keys(errorWithDps)) {
        let keyName = Object.keys(errorWithDps)[k]
        let dp = errorWithDps[keyName]
        str += `${k > 0 ? " ," : ""} ${keyName} year ${dp.join(",")}`
      }
      str += " has been updated please revisit calculations"
      let msg = `Data for fields ${Array.from(dps).join(",")} and years ${Array.from(errYears).join(",")} has been updated. kindly revisit those calculations`
      messages.push(str)

    }
    return {
      responseData,
      messages
    }
  }
  catch (err) {
    console.log("error in manageLedgerData  ::::", err.message)
  }
}

exports.CreateorUpdate = async (req, res, next) => {
  // console.log("req.body",req.body)
  try {
    let { ulb, design_year } = req.body;
    if (!ulb && !design_year) {
      return res.status(400).json({
        status: false,
        message: "ULB and Design year required fields!",
      });
    }
    let condition = { ulb: ObjectId(ulb), design_year: ObjectId(design_year) };
    let fsData = await FiscalRanking.findOne(condition).lean();

    let id = "";
    if (fsData) {
      id = fsData._id;
      let fsMapper = await FiscalRankingMapper.find({
        fiscal_ranking: ObjectId(fsData._id),
      });
      let obj = { ...fsData, fsMapper };
      delete obj.history;
      let history = fsData.history;
      history.push(obj);
      req.body["history"] = history;
      if (req.decoded.role == "MoHUA") {
        let status = "APPROVED";
        console.log(await checkPendingStatus(req.body));
        if (!(await checkPendingStatus(req.body))) {
          status = "REJECTED";
        }
        req.body["status"] = status;
        req.body["actionTakenBy"] = req.decoded._id;
        req.body["actionTakenByRole"] = "MoHUA";
      }
      await FiscalRankingMapper.deleteMany({
        fiscal_ranking: ObjectId(fsData._id),
      });
      await FiscalRanking.update(condition, req.body);
    } else {
      let d = await FiscalRanking.create(req.body);
      id = d._id;
    }
    if (req.body && req?.body?.fyData?.length) {
      req.body.fyData.map((e) => {
        e["fiscal_ranking"] = ObjectId(id);
      });
      await fRMapperCreate({ fyData: req.body.fyData });
    }
    return res.status(200).json({
      status: true,
      message: "Successfully saved data!",
    });
  } catch (error) {
    console.log(error);
    let msg = "Something went wrong";
    if (error?.code === "11000") {
      msg = "Form already submitted.";
    }
    return res.status(400).json({
      status: false,
      message: msg,
    });
  }
};

module.exports.createTabsFiscalRanking = async (req, res) => {
  let response = {
    success: true,
    message: "",
  };
  try {
    let dataToUpdate = { ...req.body };
    let tabObject = new TabsFiscalRankings(dataToUpdate);
    await tabObject.save();
    response.message = "Successfully created";
    response.success = true;
    return res.status(201).json(response);
  } catch (err) {
    response.success = false;
    let message = err.message;
    response.message = message;
    console.log("error in createTabsFiscalRanking:::", err.message);
  }
  res.status(400).json(response);
};

const checkPendingStatus = (data) => {
  return new Promise((resolve, reject) => {
    try {
      let arr = [];
      for (const key in data) {
        if (Array.isArray(data[key])) {
          let d = data[key].length
            ? data[key].some((e) => e.status == "REJECTED")
            : false;
          d ? arr.push(1) : "";
        } else {
          if (data[key]?.status == "REJECTED") {
            arr.push(1);
          }
        }
      }
      console.log("arr", arr);
      resolve(arr.length ? false : true);
    } catch (error) {
      reject(error);
    }
  });
};

function getLogicalValues(dp, year, dynamicData) {
  try {
    let values = [];
    // console.log("dynamicData :: ",dynamicData)
    for (let key in dynamicData) {
      let obj = dynamicData[key];
      if (dp.includes(obj.displayPriority)) {
        for (let yearObj of obj.yearData) {
          if (yearObj.year === year) {
            values.push(parseInt(yearObj.value));
          }
        }
      }
    }
    let sum = values.length ? values.reduce((a, b) => a + b) : "";
    return sum;
  } catch (err) {
    console.log("error in getObjectsByPriorites ::: ", err.message);
  }
}

/**
 * get Filter query for Fiscal Ranking mapper
 */
function filterQuery(type, year) {
  try {
    return {
      $filter: {
        input: "$fiscalrankingmappers",
        as: "mapper",
        cond: {
          $and: [
            { $eq: ["$$mapper.type", type] },
            { $eq: ["$$mapper.design_year", year] },
          ],
        },
      },
    };
  } catch (err) {
    console.log("error in filter query");
  }
}

function fetchAmountFromQuery(arrVariable) {
  try {
    return {
      $let: {
        vars: {
          obj: { $arrayElemAt: [`$${arrVariable}`, 0] },
        },
        in: "$$obj.amount",
      },
    };
  } catch (err) {
    console.log("error in fetchAmountFromQuery ::: ", err.message);
  }
}

/**
 * It takes in an object with a property called fyData, which is an object with properties that match
 * the columns in the FiscalRankingMapper table. It then creates a new row in the FiscalRankingMapper
 * table with the data in fyData
 * @param objData - {
 */
const fRMapperCreate = (objData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let { fyData } = objData;
      let d = await FiscalRankingMapper.create(fyData);
      resolve(d);
    } catch (error) {
      reject(error);
    }
  });
};

function getBasicObject(value, status = "") {
  return {
    status: status,
    value: value,
  };
}

// set this class in a service
class tabsUpdationServiceFR {
  constructor(viewOne, fyDynemic) {
    this.detail = { ...viewOne };
    this.dynamicData = { ...fyDynemic };
  }

  /**
   * It returns an object with the same properties as the `detail` object, but with the values of the
   * properties replaced with the values of the properties of the same name in the `detail` object
   * @returns An object with the following properties:
   *   - population11
   *   - populationFr
   *   - webLink
   *   - waterSupply
   *   - sanitationService
   *   - propertySanitationTax
   *   - nameCmsnr
   *   - propertyWaterTax
   */
  getDataForBasicUlbTab() {
    return {
      population11: { ...this.detail.population11 },
      populationFr: { ...this.detail.populationFr },
      auditorName: { ...this.detail.auditorName },
      caMembershipNo: { ...this.detail.caMembershipNo },
      webLink: { ...this.detail.webLink },
      waterSupply: { ...this.detail.waterSupply },
      sanitationService: { ...this.detail.sanitationService },
      propertySanitationTax: { ...this.detail.propertySanitationTax },
      nameCmsnr: { ...this.detail.nameCmsnr },
      propertyWaterTax: { ...this.detail.propertyWaterTax },
    };
  }
  getDataForConInfo() {
    return {
      nameOfNodalOfficer: { ...this.detail.nameOfNodalOfficer },
      designationOftNodalOfficer: { ...this.detail.designationOftNodalOfficer },
      mobile: { ...this.detail.mobile },
      email: { ...this.detail.email },
    };
  }
  getDynamicObjects(key) {
    return this.dynamicData[key];
  }
  getDataForSignedDoc() {
    return {
      otherUpload: { ...this.detail.otherUpload, required: false }, // IMPORTANT :: if changed inform frotend
      signedCopyOfFile: { ...this.detail.signedCopyOfFile, required: true },
      ulbSupportingDoc: { ...this.detail.ulbSupportingDoc, required: false }
    };
  }
  async getFeedbackForTabs(condition, tabId) {
    let mainCondition = Object.assign(condition, { tab: ObjectId(tabId) });
    let feedBackObj = await FeedBackFiscalRanking.findOne(mainCondition)
      .select(["status", "comment"])
      .lean();
    if (feedBackObj != null) {
      return feedBackObj;
    } else {
      return {
        status: null,
        comment: "",
      };
    }
  }
}

/**
 * It takes in the tabs and viewOne object and returns the modified tabs
 * @param tabs - The tabs that are to be modified.
 * @param viewOne - This is the object that contains all the data for the view.
 * @param fyDynemic - object in which all calculations are already done
 * @param conditionForFeedbacks - conditions which consist tab level feedback
 */
async function getModifiedTabsFiscalRanking(
  tabs,
  viewOne,
  fyDynemic,
  conditionForFeedbacks
) {
  try {
    let modifiedTabs = [...tabs];
    let service = new tabsUpdationServiceFR(viewOne, fyDynemic);
    for (var tab of modifiedTabs) {
      if (tab.id === priorTabsForFiscalRanking["basicUlbDetails"]) {
        tab.data = await service.getDataForBasicUlbTab();
      } else if (tab.id === priorTabsForFiscalRanking["conInfo"]) {
        tab.data = await service.getDataForConInfo();
      } else if (tab.id === priorTabsForFiscalRanking["selDec"]) {
        tab.data = await service.getDataForSignedDoc();
      } else {
        tab.data = service.getDynamicObjects(tab.key);
      }
      tab.feedback = await service.getFeedbackForTabs(
        conditionForFeedbacks,
        tab._id
      );
    }
    return modifiedTabs;
  } catch (err) {
    console.log("error in getModifiedTabsFiscalRanking ::: ", err.message);
  }
}
function statusObj(
  label,
  fieldType,
  type,
  dataSource,
  position,
  required = true,
  mn = false,
  info = ""
) {
  return {
    ...getInputKeysByType(
      fieldType,
      type,
      label,
      dataSource,
      position,
      required,
      mn,
      info
    ),
    value: null,
    status: "PENDING",
  };
}

function assignCalculatedValues(fyDynemic, viewONe) {
  // let totalOwnRevenueAreaObj = fyDynemic["financialInformation"]["ownRevDetails"]["yearData"].find(item => item.key === "totalOwnRevenueArea")
  // let propertyTaxObj = fyDynemic["financialInformation"]["propertyDetails"]["yearData"].find(item => item.key === "property_tax_register")
  // let payingPropObj = fyDynemic["financialInformation"]["propertyDetails"]["yearData"].find(item => item.key === "paying_property_tax")
  // let paid_property_tax = fyDynemic["financialInformation"]["propertyDetails"]["yearData"].find(item => item.key === "paid_property_tax")
  // let fy21CashObj = fyDynemic["financialInformation"]["ownRevenAmt"]["yearData"].find(item => item.key === "fy_21_22_cash")
  // let fy21OnlineObj = fyDynemic["financialInformation"]["ownRevenAmt"]["yearData"].find(item => item.key === "fy_21_22_online")
  // Object.assign(totalOwnRevenueAreaObj, viewONe['totalOwnRevenueArea'])
  // Object.assign(propertyTaxObj, viewONe['property_tax_register'])
  // Object.assign(payingPropObj, viewONe['paying_property_tax'])
  // Object.assign(paid_property_tax, viewONe['paid_property_tax'])
  // Object.assign(paid_property_tax, viewONe['paid_property_tax'])
  // Object.assign(fy21CashObj, viewONe['fy_21_22_cash'])
  // Object.assign(fy21OnlineObj, viewONe['fy_21_22_online'])
}

/* A function which is used to get the data from the database. */
const getReadOnly = (status, isDraft, role, questionStatus) => {
  let allowedMainLevelStatus = [statusTracker.IP, statusTracker.NS, statusTracker.RBP]
  let allowedQuestionLevelStatus = [questionLevelStatus['3']]
  let specialCases = [statusTracker.RBP, questionLevelStatus['1'], statusTracker.IP]
  if (role !== "ULB" || status === statusTracker.VIP) {
    return true
  }
  if (status === undefined || questionStatus === undefined) {
    return false
  }
  if (!allowedMainLevelStatus.includes(status) && !allowedQuestionLevelStatus.includes(questionStatus)) {
    return true
  }
  if (specialCases.includes(status) && specialCases.includes(questionStatus)) {
    return true
  }
  return false
};

const getColumnWiseData = (key, obj, isDraft, dataSource = "", role, formStatus) => {
  switch (key) {
    case "populationFr":
      return {
        ...getInputKeysByType(
          "number",
          "",
          "Population as on 1st April 2022",
          dataSource,
          "4"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "population11":
      return {
        ...getInputKeysByType(
          "number",
          "",
          "Population as per 2011 Census",
          dataSource,
          "3"
        ),
        ...obj,
        readonly: true,
        // rejectReason:"",
      };
    case "webLink":
      return {
        ...getInputKeysByType(
          "url",
          "",
          "ULB website URL link",
          dataSource,
          "5"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "nameCmsnr":
      return {
        ...getInputKeysByType(
          "text",
          "",
          "Name of Commissioner / Executive Officer",
          dataSource,
          "6"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "auditorName":
      console.log({
        ...getInputKeysByType("text", "", "Auditor Name", dataSource, "7"),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      })
      return {
        ...getInputKeysByType("text", "", "Auditor Name", dataSource, "7"),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "caMembershipNo":
      return {
        ...getInputKeysByType(
          "number",
          "",
          "CA Membership number",
          dataSource,
          "8",
          false
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "nameOfNodalOfficer":
      return {
        ...getInputKeysByType(
          "text",
          "",
          "Name of the Nodal Officer",
          dataSource,
          "1"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "designationOftNodalOfficer":
      return {
        ...getInputKeysByType(
          "text",
          "",
          "Designation of the Nodal Officer",
          dataSource,
          "2"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "email":
      return {
        ...getInputKeysByType(
          "email",
          "",
          "Email ID of the Nodal Officer",
          dataSource,
          "3"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "mobile":
      return {
        ...getInputKeysByType(
          "number",
          "",
          "Mobile number of the Nodal Officer",
          dataSource,
          "4",
          true,
          true
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "waterSupply":
      return {
        ...statusObj(
          "Does the ULB handle water supply services?",
          "radio-toggle",
          "",
          dataSource,
          "9"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "sanitationService":
      return {
        ...statusObj(
          "Does the ULB handle sanitation service delivery?",
          "radio-toggle",
          "",
          dataSource,
          "10"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "propertyWaterTax":
      return {
        ...statusObj(
          "Does your Property Tax include Water Tax?",
          "radio-toggle",
          "",
          dataSource,
          "11",
          true,
          false,
          "Tax revenue levied for provision of water supply services."
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "propertySanitationTax":
      return {
        ...statusObj(
          "Does your Property Tax include Sanitation/Sewerage Tax?",
          "radio-toggle",
          "",
          dataSource,
          "12",
          true,
          false,
          "Tax revenue levied for provision of sanitation & sewerage service delivery."
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "signedCopyOfFile":
      return {
        ...statusObj(
          "",
          "file",
          "",
          dataSource,
          "0"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    case "ulbSupportingDoc":
      return {
        ...statusObj(
          "",
          "file",
          "",
          dataSource,
          "0"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        status: "",
      };
    case "otherUpload":
      return {
        ...statusObj(
          "",
          "file",
          "",
          dataSource,
          "0"
        ),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft, role, obj.status),
        // rejectReason:"",
      };
    default:
    // code block
  }
};

function decideValues(params) {
  let { calculationField, calculatedFrom, pf, fyDynemic, valueObj } = params;
  try {
    if (calculationField) {
      // console.log(":::::::::",fyDynemic)
      pf["value"] = getLogicalValues(calculatedFrom, pf?.year, fyDynemic);
    } else {
      pf["value"] = valueObj ? valueObj.value : "";
    }
  } catch (err) {
    console.log("error in decideValue :::: ", err.message);
    return "";
  }
}

async function getPreviousYearValues(pf, ulbData) {
  try {
    let yearName = getKeyByValue(years, pf.year);
    let year = parseInt(yearName);
    let previousYear = year - 1;
    let previousYearString = `${previousYear}-${year.toString().slice(-2)}`;
    let previousYearId = years[previousYearString].toString();
    let calculatableYears = [years[previousYearString], pf.year];
    let temp = {};
    for (let year of calculatableYears) {
      temp[year] = [];
      for (let code of pf?.previousYearCodes) {
        let yearName = getKeyByValue(years, year);
        let ulbFyAmount = await getUlbLedgerDataFilter({
          code: [code],
          year: year,
          data: ulbData,
        });
        if (ulbFyAmount) {
          temp[year].push(ulbFyAmount);
        }
      }
    }
    console.log("temp ::: ", temp)
    if (
      temp[previousYearId].length == 2 &&
      temp[pf.year.toString()].length == 2
    ) {
      let sumOfPreviousYear = temp[previousYearId].reduce((a, b) => a + b);
      let sumOfCurrentYear = temp[pf.year].reduce((a, b) => a + b);
      return sumOfCurrentYear - sumOfPreviousYear;
    } else {
      return 0;
    }
  } catch (err) {
    console.log("error in getPreviousYearValues ::: ", err.message);
  }
}

const keyBasedCond = (value, key) => {
  try {
    if (value[key] == null || value[key] === "") {
      value.status = ""
    }
    return value
  }
  catch (err) {
    console.log("error in keyBasedCond :: ", err.message)
  }
  return value
}

function manageNullValuesInMainTable(data) {
  const statusNotMandatory = ["caMembershipNo", "otherUpload"]
  const fileCase = ["otherUpload"]
  try {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof (value) === "object" && value?.status === null) {
        value.status = "PENDING"
      }
      if (statusNotMandatory.includes(key)) {
        if (fileCase.includes(key)) {
          value = keyBasedCond(value, "url")
        }
        else {
          value = keyBasedCond(value, "value")
        }
      }
      acc[key] = value;
      return acc;
    }, {});
  }
  catch (err) {
    console.log("error in manageNullValueInMainTable")
  }
  return data
}

exports.getView = async function (req, res, next) {
  try {
    let condition = {};
    let { role } = req.decoded
    let hideForm = false
    if (req.query.ulb && req.query.design_year) {
      condition = {
        ulb: ObjectId(req.query.ulb),
        design_year: ObjectId(req.query.design_year),
      };
    }
    let notice = ""
    let data = await FiscalRanking.findOne(condition, { history: 0 }).lean();
    data = manageNullValuesInMainTable(data)

    let twEightSlbs = await TwentyEightSlbsForm.findOne(condition, {
      population: 1,
    }).lean();
    let ulbPData = await Ulb.findOne(
      { _id: ObjectId(req.query.ulb) },
      { population: 1, name: 1, state: 1 }
    ).populate("state").lean();
    let viewOne = {};
    let fyData = [];
    notice = await getMessages({
      ulbName: ulbPData.name
    })['freeze']
    if (data) {

      fyData = await FiscalRankingMapper.find({
        fiscal_ranking: data._id,
      }).lean();

      data["populationFr"] = {
        ...data.populationFr,
        value: data?.populationFr?.value
          ? data?.populationFr?.value
          : twEightSlbs
            ? twEightSlbs?.population
            : "",
        readonly: false,
        modelName: twEightSlbs?.population > 0 ? "TwentyEightSlbForm" : "",
      };
      data["population11"] = {
        value: ulbPData
          ? ulbPData?.population
          : "",
        readonly: true,
        status: "",
        modelName: ulbPData?.population > 0 ? "" : "",
        rejectReason: "",
      };
      data["fyData"] = fyData;
      viewOne = data;
    } else {
      viewOne = {
        ulb: null,
        design_year: null,
        population11: {
          value: ulbPData?.population,
          readonly: true,
          status: ulbPData?.population > 0 ? "NA" : "PENDING",
          modelName: ulbPData?.population > 0 ? "TwentyEightSlbForm" : "",
          rejectReason: "",
        },
        populationFr: {
          value: twEightSlbs ? twEightSlbs?.population : "",
          readonly: false,
          status: "PENDING",
          modelName: twEightSlbs?.population > 0 ? "Ulb" : "",
          rejectReason: "",
        },
        fy_21_22_cash: {
          year: null,
          type: null,
          value: null,
          status: "PENDING",
          rejectReason: "",
        },
        signedCopyOfFile: {
          name: null,
          url: null,
          required: true,
          status: "PENDING",
          rejectReason: "",
        },
        otherUpload: {
          name: null,
          url: null,
          required: false, // IMPORTANT :: if changed inform frotend
          status: "PENDING",
          rejectReason: "",
        },
        fy_21_22_online: {
          type: null,
          value: null,
          year: null,
          status: "PENDING",
          rejectReason: "",
        },
        auditorName: {
          type: null,
          value: null,
          year: null,
          status: "PENDING",
          rejectReason: "",
        },
        fyData: [],
        isDraft: null,
        currentFormStatus: 1
      };
    }

    let keys = [
      "population11",
      "populationFr",
      "webLink",
      "nameCmsnr",
      "nameOfNodalOfficer",
      "designationOftNodalOfficer",
      "email",
      "mobile",
      "waterSupply",
      "sanitationService",
      "propertyWaterTax",
      "propertySanitationTax",
      "property_tax_register",
      "paying_property_tax",
      "paid_property_tax",
      "auditorName",
      "caMembershipNo",
      "signedCopyOfFile",
      "otherUpload",
      "ulbSupportingDoc"
    ];
    for (let index = 0; index < keys.length; index++) {
      if (viewOne.hasOwnProperty(keys[index])) {
        let obj = viewOne[keys[index]];
        viewOne[keys[index]] = getColumnWiseData(
          keys[index],
          obj,
          viewOne.isDraft,
          "",
          role,
          data?.currentFormStatus
        );
        // getReadOnly(formStatus, isDraft,role,obj.status),
        viewOne['readonly'] = getReadOnly(data?.currentFormStatus, viewOne.isDraft, role)

      } else {
        viewOne[keys[index]] = getColumnWiseData(
          keys[index],
          {
            value: "",
            status: "PENDING",
          },
          null,
          "",
          role,
          data?.currentFormStatus
        );
      }
    }
    hideForm = viewOne?.currentFormStatus === 1 && role === "ULB" ? true : false
    let fyDynemic = await fiscalRankingFormJson();
    // await assignCalculatedValues(fyDynemic, viewOne)

    let ulbData = await ulbLedgersData({ ulb: ObjectId(req.query.ulb) });
    let ulbDataUniqueFy = await ulbLedgerFy({
      financialYear: {
        $in: [
          "2017-18",
          "2018-19",
          "2019-20",
          // "2020-21",
          // "2021-22",
          "2022-23",
          "2023-24",
        ],
      },
      ulb: ObjectId(req.query.ulb),
    });
    let userMessages = []
    let ledgerKeys = ["fixedAsset", "CaptlExp"]
    for (let sortKey in fyDynemic) {
      let subData = fyDynemic[sortKey];
      // console.log("subData  >>>> 1::: ",subData)
      for (let key in subData) {
        let calculationField = subData[key].calculatedFrom ? true : false;
        let calculatedFrom = subData[key].calculatedFrom;
        for (let pf of subData[key]?.yearData) {
          let parameters = {
            calculationField,
            calculatedFrom,
            pf,
            fyDynemic: subData,
          };
          if (subData[key].calculatedFrom === undefined) {
            pf['readonly'] = getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, "PENDING");
          }
          else {
            pf['readonly'] = true
          }

          if (pf?.code?.length > 0) {
            if (!ledgerKeys.includes(key)) {
              ledgerKeys.push(key)
            }
            pf["status"] = '';
            pf["modelName"] = "";
            if (fyData.length) {
              let singleFydata = fyData.find(
                (e) =>
                  e?.year?.toString() == pf?.year?.toString() &&
                  e.type == pf.type
              );

              if (singleFydata) {
                if (singleFydata?.date !== null) {
                  pf["date"] = singleFydata ? singleFydata.date : null;
                } else {
                  pf["value"] = singleFydata ? singleFydata.value : "";
                }
                pf["rejectReason"] = singleFydata.rejectReason;
                pf["rejectReason2"] = singleFydata?.rejectReason;
                pf["modelName"] = singleFydata ? singleFydata.modelName : "";
                pf['suggestedValue'] = singleFydata?.suggestedValue;
                pf['pmuSuggestedValue2'] = singleFydata?.pmuSuggestedValue2;
                pf['approvalType'] = singleFydata?.approvalType;
                pf['ulbComment'] = singleFydata?.ulbComment;
                pf['ulbValue'] = singleFydata?.ulbValue;
                pf["status"] = singleFydata.status != null ? singleFydata.status : 'PENDING';
                pf['ledgerUpdated'] = singleFydata.ledgerUpdated || false
                if (subData[key].calculatedFrom === undefined) {
                  pf["readonly"] = getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, singleFydata.status);
                } else {
                  pf["readonly"] = true;
                  pf["status"] = "";

                }

              } else {
                let ulbFyAmount = await getUlbLedgerDataFilter({
                  code: pf.code,
                  year: pf.year,
                  data: ulbData,
                });
                // parameters['valueObj'] = {value:ulbFyAmount}
                pf["value"] = ulbFyAmount;
                // pf['value'] = ulbFyAmount;
                pf["status"] = ulbFyAmount ? "" : "PENDING";
                // subData[key]["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "FiscalRanking"
                pf["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "";
                if (subData[key].calculatedFrom === undefined) {
                  pf["readonly"] = ulbFyAmount > 0 ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, singleFydata.status);
                } else {
                  pf["readonly"] = true;
                  pf["status"] = ""
                }
              }
            } else {
              if ([1, 2, null].includes(viewOne.currentFormStatus)) {
                let ulbFyAmount = await getUlbLedgerDataFilter({
                  code: pf.code,
                  year: pf.year,
                  data: ulbData,
                });
                pf["value"] = ulbFyAmount;
                // pf['value'] = ulbFyAmount;
                pf["status"] = ulbFyAmount ? "" : "PENDING";
                // subData[key]["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "FiscalRanking"
                pf["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "";
                if (subData[key].calculatedFrom === undefined) {
                  pf["status"] = "PENDING"
                  pf["readonly"] = ulbFyAmount > 0 ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, singleFydata.status);
                } else {
                  pf["status"] = ""
                  pf["readonly"] = true;
                }
              }
            }
          } else {
            if (
              ["appAnnualBudget", "auditedAnnualFySt"].includes(
                subData[key]?.key
              )
            ) {
              if (fyData.length) {
                let singleFydata = fyData.find(
                  (e) =>
                    e?.year?.toString() == pf?.year?.toString() &&
                    e.type == pf.type
                );
                if (singleFydata) {
                  pf["file"] = singleFydata.file;
                  pf["status"] = singleFydata.status && singleFydata.status != null ? singleFydata.status : "PENDING"
                  pf['status'] = singleFydata.modelName === "ULBLedger" ? "" : pf["status"]
                  pf["modelName"] = singleFydata.modelName;
                  pf['rejectReason'] = singleFydata.rejectReason
                  if (subData[key].calculatedFrom === undefined) {
                    pf["required"] =
                      singleFydata.modelName === "ULBLedger"
                        ? false
                        : true;
                    pf["readonly"] = singleFydata.modelName === "ULBLedger" ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, singleFydata?.status);
                  } else {
                    pf["readonly"] = true;
                    pf["status"] = ""
                  }

                } else {
                  if (
                    subData[key]?.key !== "appAnnualBudget" &&
                    [1, 2, null].includes(viewOne.currentFormStatus)
                  ) {

                    let chekFile = ulbDataUniqueFy
                      ? ulbDataUniqueFy.some(
                        (el) => el?.year_id.toString() === pf?.year.toString()
                      )
                      : false;
                    pf["status"] = chekFile ? "" : "PENDING";
                    pf["modelName"] = chekFile ? "ULBLedger" : "";
                    if (chekFile) {
                      pf[
                        "info"
                      ] = `Available on Cityfinance - <a href ="https://${process.env.PROD_HOST}/resources-dashboard/data-sets/income_statement ">View here</a>`;
                    }
                    if (subData[key].calculatedFrom === undefined) {
                      pf["readonly"] = chekFile ? true : false;
                      pf["required"] = chekFile ? false : true;
                    } else {
                      pf["readonly"] = true;
                    }

                  }
                }
              } else {
                if (
                  subData[key]?.key !== "appAnnualBudget" && [1, 2, null].includes(viewOne.currentFormStatus)
                ) {
                  let chekFile = ulbDataUniqueFy
                    ? ulbDataUniqueFy.some(
                      (el) => el?.year_id.toString() === pf?.year.toString()
                    )
                    : false;
                  pf["status"] = chekFile ? "" : "PENDING";
                  pf["modelName"] = chekFile ? "ULBLedger" : "";
                  if (chekFile) {

                    pf[
                      "info"
                    ] = `Available on Cityfinance - <a href ="https://${process.env.PROD_HOST}/resources-dashboard/data-sets/income_statement ">View here</a>`;
                  }
                  if (subData[key].calculatedFrom === undefined) {
                    pf["readonly"] = chekFile ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, "PENDING");
                    pf["required"] = chekFile ? false : true;
                  } else {
                    pf["readonly"] = true;
                  }
                }
              }
            } else {
              if (fyData.length) {
                if (pf.year && pf.type) {
                  let singleFydata = fyData.find(
                    (e) =>
                      e.year.toString() == pf.year.toString() &&
                      e.type == pf.type
                  );

                  if (singleFydata) {
                    if (singleFydata?.date !== null) {
                      pf["date"] = singleFydata ? singleFydata.date : null;
                    }
                    pf["file"] = singleFydata
                      ? singleFydata.file
                      : {
                        name: "",
                        url: "",
                      };
                    pf["value"] = singleFydata ? singleFydata.value : "";
                    pf['suggestedValue'] = singleFydata?.suggestedValue;
                    pf['pmuSuggestedValue2'] = singleFydata?.pmuSuggestedValue2;
                    pf['rejectReason2'] = singleFydata?.rejectReason2;
                    pf['approvalType'] = singleFydata?.approvalType;
                    pf['ulbComment'] = singleFydata?.ulbComment;
                    pf['ulbValue'] = singleFydata?.ulbValue;
                    pf["status"] = singleFydata && singleFydata.status != null
                    ? singleFydata.status
                    : "PENDING"; 
                    pf["modelName"] = singleFydata
                      ? singleFydata.modelName
                      : "";
                    pf["rejectReason"] = singleFydata ? singleFydata.rejectReason : ""
                    pf['ledgerUpdated'] = singleFydata.ledgerUpdated
                    if (subData[key].calculatedFrom === undefined) {
                      pf["readonly"] = getReadOnly(data?.currentFormStatus, viewOne.isDraft, role, singleFydata.status);
                    } else {
                      pf["readonly"] = true;
                      pf['status'] = ""
                    }
                  }
                }
              } else if (pf?.previousYearCodes?.length) {
                if (!ledgerKeys.includes(key)) {
                  ledgerKeys.push(key)
                }
                let yearName = getKeyByValue(years, pf.year);
                let year = parseInt(yearName);
                let previousYear = year - 1;
                let previousYearString = `${previousYear}-${year
                  .toString()
                  .slice(-2)}`;
                let previousYearId = years[previousYearString].toString();
                let calculatableYears = [years[previousYearString], pf.year];
                let temp = {};
                for (let year of calculatableYears) {
                  temp[year] = [];
                  for (let code of pf?.previousYearCodes) {
                    let yearName = getKeyByValue(years, year);
                    // console.log("yearName :::: ",yearName,"yearID:::",year,"code :::: ",code)
                    let ulbFyAmount = await getUlbLedgerDataFilter({
                      code: [code],
                      year: year,
                      data: ulbData,
                    });
                    // console.log("ulbFyAmount :::: ",ulbFyAmount)
                    if (ulbFyAmount) {
                      temp[year].push(ulbFyAmount);
                    }
                  }
                }
                // console.log("temp :::: ",temp)
                if (
                  temp[previousYearId].length == 2 &&
                  temp[pf.year.toString()].length == 2
                ) {
                  let sumOfPreviousYear = temp[previousYearId].reduce(
                    (a, b) => a + b
                  );
                  let sumOfCurrentYear = temp[pf.year].reduce((a, b) => a + b);
                  // console.log("sumOfPreviousYear :: ",sumOfPreviousYear)
                  // console.log("sumOfCurrentYear :: ",sumOfCurrentYear)
                  pf["value"] = sumOfCurrentYear - sumOfPreviousYear;
                  pf['readonly'] = true
                  pf["modelName"] = "ULBLedger";

                }
              }
            }
          }
          //In case of suggested value given by the Pmu the fields only in the read only mode.
          if (pf?.suggestedValue) pf["readonly"] = true;
        }
      }

    }

    let tabs = await TabsFiscalRankings.find({})
      .sort({ displayPriority: 1 })
      .lean();
    let conditionForFeedbacks = {
      fiscal_ranking: data?._id || null,
    };

    let userRole = req.decoded.role
    let params = {
      ledgerData: ulbData,
      ledgerKeys: ledgerKeys,
      responseData: { ...fyDynemic },
      formId: viewOne._id,
      role: userRole,
      currentFormStatus: viewOne.currentFormStatus
    }

    /**
     * This function always get latest data for ledgers
     */
    let modifiedLedgerData = fyDynemic
    if (![statusTracker.SAP].includes(viewOne.currentFormStatus)) {
      let { responseData, messages } = await manageLedgerData(params)
      modifiedLedgerData = responseData
      userMessages = messages
    }
    Object.assign(conditionForFeedbacks, condition);
    let modifiedTabs = await getModifiedTabsFiscalRanking(
      tabs,
      viewOne,
      modifiedLedgerData,
      conditionForFeedbacks
    );
    if (viewOne.currentFormStatus === statusTracker.IP && role === userTypes.ulb) {
      let actionTaken = await checkIfActionTaken(modifiedTabs)
      hideForm = !actionTaken
    }

    if (role == 'ULB' && [MASTER_FORM_STATUS['RETURNED_BY_PMU'], MASTER_FORM_STATUS['IN_PROGRESS']].includes(viewOne?.currentFormStatus) && !viewOne?.pmuSubmissionDate) {
      hideForm = true;
      if (+viewOne?.progress?.rejectedProgress > 0) {
        notice = await getMessages({
          ulbName: ulbPData.name,
          formFreeze: true
        })['freeze']
      }
    }
    if (role == 'ULB' && req.query?.ulb == hideFormVisibleUlb['Vallabh Vidyanagar Municipality']) {
      hideForm = false;
    }

    let viewData = {
      _id: viewOne._id ? viewOne._id : null,
      ulb: viewOne.ulb ? viewOne.ulb : req.query.ulb,
      ulbName: ulbPData.name,
      stateCode: ulbPData?.state?.code,
      design_year: viewOne.design_year
        ? viewOne.design_year
        : req.query.design_year,
      isDraft: viewOne.isDraft,
      pmuSubmissionDate: viewOne?.pmuSubmissionDate,
      isAutoApproved: viewOne?.isAutoApproved,
      tabs: modifiedTabs,
      currentFormStatus: viewOne.currentFormStatus,
      financialYearTableHeader,
      messages: userMessages,
      hideForm: (process.env.ENV == ENV['prod']) ? hideForm : false,
      // hideForm,
      notice
    };
    if (userMessages.length > 0) {
      let { approvedPerc, rejectedPerc } = calculatePercentage(modifiedLedgerData, requiredFields, viewOne)
      let { ulb, design_year } = req.query
      await updatePercentage(approvedPerc, rejectedPerc, ulb, design_year)
    }
    return res
      .status(200)
      .json({ status: true, message: "Success fetched data!", data: viewData });
  } catch (error) {
    console.log("err", error);
    return res
      .status(400)
      .json({ status: false, message: "Something went wrong!" });
  }
};

async function updatePercentage(approvedPerc, rejectedPerc, ulb, design_year) {
  try {
    let filter = {
      "ulb": ObjectId(ulb),
      "design_year": ObjectId(design_year)
    }
    let payload = {
      "progress.approvedProgress": approvedPerc < 100 && approvedPerc !== 0 ? approvedPerc.toFixed(2).toString() : parseInt(approvedPerc).toString(),
      "progress.rejectedProgress": rejectedPerc < 100 && rejectedPerc !== 0 ? rejectedPerc.toFixed(2).toString() : parseInt(rejectedPerc).toString()
    }
    let up = await FiscalRanking.findOneAndUpdate(filter, {
      "$set": payload
    })

  }
  catch (err) {
    console.log("error in updatePercentage ::: ", err.message)
  }
}


/**
 * It takes an object with three properties (code, year, data) and returns the sum of the totalAmount
 * property of the objects in the data array that have a code property that matches one of the values
 * in the code array and a year_id property that matches the year property
 * @param objData - The object that contains the data to be filtered.
 */
const getUlbLedgerDataFilter = (objData) => {
  let { code, year, data } = objData;
  code = code.map((item) => item.toString());
  if (code.length) {
    let ulbFyData = data.length
      ? data.filter((el) => {
        return (
          code.includes(el.code) && el.year_id.toString() === year.toString()
        );
      })
      : [];
    var sum =
      ulbFyData.length > 0
        ? ulbFyData.reduce((pv, cv) => pv + cv.totalAmount, 0)
        : "";
    return sum;
  } else {
    return 0;
  }
};
/**
 * It returns an array of years from the ulb_ledger collection, based on the condition passed to it
 * @param condition - This is the condition that you want to apply to the query.
 */
const ulbLedgerFy = (condition) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await UlbLedger.aggregate([
        { $match: condition },
        {
          $group: {
            _id: "$financialYear",
          },
        },
        {
          $lookup: {
            from: "years",
            localField: "_id",
            foreignField: "year",
            as: "years",
          },
        },
        {
          $unwind: "$years",
        },
        {
          $project: {
            _id: 0,
            year_id: "$years._id",
            year: "$years.year",
          },
        },
      ]);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};
/**
 * It takes an object with a single property, ulb, which is the id of the ULB, and returns a promise
 * that resolves to an array of objects, each of which has the following properties: year_id, year,
 * code, and totalAmount
 * @param objData - {
 */
const ulbLedgersData = (objData) => {
  return new Promise(async (resolve, reject) => {
    const { ulb } = objData;
    try {
      let data = await UlbLedger.aggregate([
        { $match: { ulb: ObjectId(ulb) } },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems",
          },
        },
        { $unwind: "$lineitems" },
        {
          $project: {
            _id: 1,
            year: "$financialYear",
            amount: 1,
            ulb: 1,
            code: "$lineitems.code",
          },
        },
        {
          $match: {
            code: {
              $in: [
                "11003",
                "110",
                "130",
                "140",
                "150",
                "180",
                "11001",
                "11002",
                "11010",
                "11011",
                "11012",
                "140",
                "130",
                "120",
                "160",
                "100",
                "150",
                "170",
                "171",
                "180",
                "210",
                "220",
                "410",
                "230",
                "240",
                "270",
                "271",
                "272",
                "200",
                "250",
                "260",
                "280",
                "290",
                "412",
              ],
            },
            year: {
              $in: ["2017-18", "2018-19", "2019-20"],
            },
          },
        },
        {
          $group: {
            _id: { year: "$year", code: "$code" },
            totalAmount: { $sum: "$amount" },
          },
        },
        {
          $project: {
            year: "$_id.year",
            code: "$_id.code",
            totalAmount: 1,
          },
        },
        {
          $lookup: {
            from: "years",
            localField: "year",
            foreignField: "year",
            as: "years",
          },
        },
        {
          $unwind: "$years",
        },
        {
          $project: {
            _id: "$years._id",
            year_id: "$years._id",
            year: "$years.year",
            code: "$_id.code",
            totalAmount: 1,
          },
        },
      ]);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};
exports.getAll = async function (req, res, next) {
  try {
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let condition = {};
    if (req.decoded.ulb) {
      condition["ulb"] = ObjectId(req.decoded.ulb);
    }
    let prmsArr = [];
    if (!skip || true) {
      let totalPrms = new Promise((resolve, reject) => {
        FiscalRanking.count(condition).exec((err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
      prmsArr.push(totalPrms);
    }

    let dataPrms = new Promise((resolve, reject) => {
      FiscalRanking.aggregate([
        { $match: condition },
        {
          $lookup: {
            from: "ulbs",
            as: "ulb",
            localField: "ulb",
            foreignField: "_id",
          },
        },
        { $unwind: "$ulb" },
        {
          $lookup: {
            from: "years",
            as: "design_year",
            localField: "design_year",
            foreignField: "_id",
          },
        },
        { $unwind: "$design_year" },
        {
          $lookup: {
            from: "fiscalrankingmappers",
            let: {
              fyId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$fiscal_ranking", "$$fyId"],
                  },
                },
              },
              {
                $lookup: {
                  from: "years",
                  let: { yeardId: "$year" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ["$_id", "$$yeardId"],
                        },
                      },
                    },
                  ],
                  as: "years",
                },
              },
              { $unwind: "$years" },
            ],
            as: "fyData",
          },
        },
        {
          $project: {
            fy_19_20_cash: 1,
            fy_19_20_online: 1,
            population11: 1,
            populationFr: 1,
            webLink: 1,
            nameCmsnr: 1,
            nameOfNodalOfficer: 1,
            designationOftNodalOfficer: 1,
            mobile: 1,
            webUrlAnnual: 1,
            totalOwnRevenueArea: 1,
            property_tax_register: 1,
            paying_property_tax: 1,
            paid_property_tax: 1,
            createdAt: 1,
            modifiedAt: 1,
            isDraft: 1,
            ulb: { name: "$ulb.name", _id: "$ulb._id", code: "$ulb.code" },
            design_year: 1,
            email: 1,
            digitalRegtr: 1,
            registerGis: 1,
            accountStwre: 1,
            fyData: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ]).exec((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    prmsArr.push(dataPrms);
    Promise.all(prmsArr)
      .then(
        (values) => {
          if (values.length == 2) {
            return res.status(200).json({
              status: true,
              message: "Successfully saved data!",
              total: values[0],
              data: values[1],
            });
          } else {
            return res.status(200).json({
              status: true,
              message: "Successfully saved data!",
              total: values[0],
            });
          }
        },
        (rejectError) => {
          console.log("final rejectError", rejectError);
          return res
            .status(400)
            .json({ status: false, message: "Something error wrong!" });
        }
      )
      .catch((caughtError) => {
        return res
          .status(400)
          .json({ status: false, message: "Something error wrong!" });
      });
  } catch (error) {
    console.log("err", error);
    return res
      .status(400)
      .json({ status: false, message: "Something error wrong!" });
  }
};

const getUlbActivities = ({ req, sort, selectedState, selectedCategory, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear }) => {
  let query = [
    ...(req.decoded.role == userTypes.state ? [{
      $match: {
        "isActive": true,
        "state": ObjectId(req.decoded.state)
      }
    }] : []),
    {
      "$match": {
        isActive: true,
        ...(req.decoded.role == userTypes.state && req.decoded.state && { "state": ObjectId(req.decoded.state) }),
        ...getCategoryMatchObject(selectedCategory)
      },
    },
    {
      "$lookup": {
        "from": "fiscalrankings",
        "localField": "_id",
        "foreignField": "ulb",
        "as": "formData"
      }
    },
    {
      "$unwind": {
        "path": "$formData",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$addFields": {
        "emptyForms": {
          "$ifNull": ["$formData", 1]
        }
      }
    },
    {
      "$group": {
        "_id": "$state",
        "totalUlbs": { $sum: 1 },
        "underReviewByPMU": {
          "$sum": {
            "$cond": [
              { "$in": ["$formData.currentFormStatus", [8, 9, 11]] },
              1,
              0
            ]
          }
        },
        "returnedByPMU": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 10] },
              1,
              0
            ]
          }
        },
        "inProgress": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 2] },
              1,
              0
            ]
          }
        },
        "notStarted": {
          "$sum": {
            "$cond": [
              { "$eq": ["$emptyForms", 1] },
              1,
              0
            ]
          }
        },
      }
    },
    {
      "$lookup": {
        "from": "states",
        "localField": "_id",
        "foreignField": "_id",
        "as": "states"
      }
    },
    {
      "$unwind": {
        "path": "$states",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$project": {
        "stateName": "$states.name",
        "selected": {
          "$cond": {
            "if": {
              "$eq": ["$states._id", ObjectId(selectedState)]
            },
            "then": true,
            "else": false
          }
        },
        "stateNameLink": {
          "$concat": [
            "/rankings/populationWise/",
            { "$toString": "$states._id" },
            "?stateName=",
            { "$toString": "$states.name" },
            ...(selectedCategory ? [`&selectedCategory=${selectedCategory}`] : [])
          ]
        },
        "totalUlbs": 1,
        "underReviewByPMU": 1,
        "returnedByPMU": 1,
        "inProgress": 1,
        "notStarted": 1,
      }
    },
  ];

  if (sort) {
    query.push({ $sort: sort });
  }
  if (filterObj.provided) {
    query.push({ $match: filters });
  }
  console.log(JSON.stringify(query, 3, 3));
  return Ulb.aggregate(query);
}
const getPMUActivities = ({ req, sort, selectedState, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear }) => {

  const query = [
    {
      "$match": {
        "isActive": true,
        ...(req.decoded.role == userTypes.state && req.decoded.state && { "state": ObjectId(req.decoded.state) }),
      }
    },
    {
      "$lookup": {
        "from": "fiscalrankings",
        "localField": "_id",
        "foreignField": "ulb",
        "as": "formData"
      }
    },
    {
      "$unwind": {
        "path": "$formData",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$group": {
        "_id": "$state",
        "underReviewByPMU": {
          "$sum": {
            "$cond": [
              { "$in": ["$formData.currentFormStatus", [8, 9, 10, 11]] },
              1,
              0
            ]
          }
        },
        "verificationNotStarted": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 8] },
              1,
              0
            ]
          }
        },
        "verificationInProgress": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 9] },
              1,
              0
            ]
          }
        },
        "returnedByPMU": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 10] },
              1,
              0
            ]
          }
        },
        "submissionAckByPMU": {
          "$sum": {
            "$cond": [
              { "$eq": ["$formData.currentFormStatus", 11] },
              1,
              0
            ]
          }
        },
      }
    },
    {
      "$lookup": {
        "from": "states",
        "localField": "_id",
        "foreignField": "_id",
        "as": "states"
      }
    },
    {
      "$unwind": {
        "path": "$states",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$project": {
        "stateName": "$states.name",
        "selected": {
          "$cond": {
            "if": {
              "$eq": ["$states._id", ObjectId(selectedState)]
            },
            "then": true,
            "else": false
          }
        },
        "underReviewByPMU": 1,
        "verificationNotStarted": 1,
        "verificationInProgress": 1,
        "returnedByPMU": 1,
        "submissionAckByPMU": 1
      }
    }
  ];

  if (sort) {
    query.push({ $sort: sort });
  };
  if (filterObj.provided) {
    query.push({ $match: filters });
  }
  return Ulb.aggregate(query);
}
const getPopulationWiseData = ({ stateId, selectedCategory, columns, sort, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear }) => {


  const parameters = [
    {
      label: '4MN+',
      query: [
        { $gt: ["$population", 4000000] }
      ],
    },
    {
      label: '1MN to 4MN',
      query: [
        { $lte: ["$population", 4000000] },
        { $gte: ["$population", 1000000] },
      ]
    },
    {
      label: '100K to 1MN',
      query: [
        { $lt: ["$population", 1000000] },
        { $gte: ["$population", 100000] }
      ],
    },
    {
      label: '<100K',
      query: [
        { $lt: ["$population", 100000] }
      ],
    },
  ];

  const query = [
    {
      "$match": {
        "isActive": true,
        ...(stateId && { state: ObjectId(stateId) }),
      },
    },
    {
      "$lookup": {
        "from": "fiscalrankings",
        "localField": "_id",
        "foreignField": "ulb",
        "as": "formData"
      }
    },
    {
      "$unwind": {
        "path": "$formData",
        "preserveNullAndEmptyArrays": true
      }
    },
    {
      "$addFields": {
        "emptyForms": {
          "$ifNull": ["$formData", 1]
        }
      }
    },
    {
      $group: {
        _id: "$state",
        "population": { $sum: "$population" },
        ...columns.reduce((result, column) => ({
          ...result,
          ...parameters.reduce((obj, parameter) => ({
            ...obj,
            [`${column.key}${parameter.label}`]: column.key == 'populationCategories' ? {
              $first: parameter.label
            } :
              {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        ...parameter.query,
                        ...(column.key == 'totalUlbs' ? [] : (
                          column.currentFormStatus == 1 ? [{
                            "$eq": ["$emptyForms", 1]
                          }] : [{
                            [Array.isArray(column.currentFormStatus) ? '$in' : '$eq']: ["$formData.currentFormStatus", column.currentFormStatus]
                          }]
                        ))
                      ],
                    },
                    then: 1,
                    else: 0,
                  },
                }
              }
          }), {})
        }), {}),
      }
    },
    {
      $project: {
        "data": parameters.map((parameter, index) => (
          columns.reduce((obj, column) => ({
            ...obj,
            [column.key]: `$${column.key}${parameter.label}`,
            ...(selectedCategory && { 'selected': (selectedCategory - 1) == index })
          }), {})
        ))
      }
    }
  ];
  console.log(JSON.stringify(query, 3, 3))
  return Ulb.aggregate(query);
}

function deleteExtraKeys(arr, obj) {
  for (var key of arr) {
    delete obj[key]
  }
}


function getSortByKeys(sortBy, order) {
  let sortKey = {
    "provided": false
  }
  try {
    if ((sortBy != undefined) && (order != undefined)) {
      let temp = {}
      sortKey["provided"] = true
      if (Array.isArray(sortBy)) {
        for (let key in sortBy) {
          let name = sortBy[key]
          if (!isNaN(parseInt(order[key]))) {
            temp[sortFilterKeys[name]] = parseInt(order[key])
          }
        }
      }
      else {
        if (!isNaN(parseInt(order))) {
          temp[sortFilterKeys[sortBy]] = parseInt(order)
        }
      }
      if (Object.keys(temp).length > 0) {
        sortKey['provided'] = true
        sortKey["filters"] = temp
      }
    }
  }
  catch (err) {
    console.log("error in getSortByKeys ::: ", err.message)
  }
  console.log(sortKey)
  return sortKey
}

exports.overview = async function (req, res, next) {

  const { type } = req.params;
  console.log({ decoded: req.decoded });

  let name = {
    "UlbActivities": "Overview of ULB activities",
    "PMUActivities": "Overview of PMU activities",
    "populationWise": "Overview of population-wise data"
  }[type] || '';



  const columns = {
    "UlbActivities": [
      {
        "label": "State Name",
        "key": "stateName",
        ...(req.decoded.role != userTypes.state && {
          "query": "",
        }),
        "sort": 1,
        "sortable": true
      },
      {
        "label": "Total ULBs",
        "key": "totalUlbs",
        "sortable": true
      },
      {
        "label": "Under Review by PMU",
        "key": "underReviewByPMU",
        "sortable": true
      },
      {
        "label": "Returned by PMU",
        "key": "returnedByPMU",
        "sortable": true
      },
      {
        "label": "In Progress",
        "key": "inProgress",
        "sortable": true
      },
      {
        "label": "Not Started",
        "key": "notStarted",
        "sortable": true
      },
    ],
    "PMUActivities": [
      {
        "label": "State Name",
        "key": "stateName",
        ...(req.decoded.role != userTypes.state && {
          "query": "",
        }),
        "sort": 1,
        "sortable": true
      },
      {
        "label": "Under Review by PMU",
        "key": "underReviewByPMU",
        "sortable": true
      },
      {
        "label": "Verification Not Started",
        "key": "verificationNotStarted",
        "sortable": true
      },
      {
        "label": "Verification In Progress",
        "key": "verificationInProgress",
        "sortable": true
      },
      {
        "label": "Returned by PMU",
        "key": "returnedByPMU",
        "sortable": true
      },
      {
        "label": "Submission Acknowledged by PMU",
        "key": "submissionAckByPMU",
        "sortable": true
      },
    ],
    "populationWise": [
      {
        "label": "Population Categories",
        "key": "populationCategories",
      },
      {
        "label": "Total ULBs",
        "key": "totalUlbs"
      },
      {
        "label": "Under Review by PMU",
        "key": "underReviewByPMU",
        "currentFormStatus": [8, 9, 11],
      },
      {
        "label": "Returned by PMU",
        "key": "returnedByPMU",
        "currentFormStatus": 10,
      },
      {
        "label": "In Progress",
        "key": "inProgress",
        "currentFormStatus": 2,
      },
      {
        "label": "Not Started",
        "key": "notStarted",
        "currentFormStatus": 1,
      },
    ]
  }[type] || [];


  const lastRow = {
    "UlbActivities": ["Total", "$sum", "$sum", "$sum", "$sum", "$sum"],
    "PMUActivities": ["Total", "$sum", "$sum", "$sum", "$sum", "$sum"],
    "populationWise": ["Total", "$sum", "$sum", "$sum", "$sum", "$sum"]
  }[type];

  try {

    let skip = parseInt(req.query.skip) || 0;
    let limit = parseInt(req.query.limit) || 10;
    let { sortBy, order, stateId, stateName, selectedState, selectedCategory } = req.query
    let filters = Object.entries({ ...req.query })
      .reduce((obj, [key, value]) => ({ ...obj, [key]: /^\d+$/.test(value) ? +value : value }), {});

    await deleteExtraKeys(["sortBy", "order", "skip", "limit", "selectedState", "selectedCategory"], filters)

    console.log(filters);
    filters = await Service.mapFilter(filters);
    let filterObj = {
      "provided": Object.keys(filters).length > 0 ? true : false,
      "filters": Object.keys(filters).length > 0 ? { ...filters } : "",
    }
    let sortKey = getSortByKeys(sortBy, order)
    let designYear = years['2022-23']

    let sort;
    if (sortBy) {
      if (Array.isArray(sortBy)) {
        sort = sortBy?.reduce((obj, key, index) => ({ ...obj, [key]: +order[index] }), {});
      } else {
        sort = { [sortBy]: +order };
      }
    }
    if (!sort) {
      sort = { 'stateName': 1 };
    }

    console.log({ sort, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear });

    let data;
    if (type == 'UlbActivities') {
      data = await getUlbActivities({ req, selectedState, selectedCategory, sort, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear });
    }
    else if (type == 'PMUActivities') {
      data = await getPMUActivities({ req, selectedState, sort, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear });
    }
    else if (type == 'populationWise') {
      data = await getPopulationWiseData({ stateId, selectedCategory, columns, sort, skip, limit, sortBy, order, filters, filterObj, sortKey, designYear });
      const result = [];
      data?.forEach(item => {
        item.data.forEach((innerData, index) => {
          if (result[index]) {
            Object.entries(innerData).forEach(([key, value]) => {
              if (key != 'populationCategories') {
                result[index][key] += +value || 0;
              }
            });
          } else {
            result.push(innerData)
          }
        })
      });
      data = result || [];
      name += ' - ' + stateName;
    }


    const response = {
      status: true,
      message: "Successfully saved data!",
      columns,
      name,
      data,
      lastRow,
    }
    if (type == 'UlbActivities') {
      response['headerLink'] = {
        label: 'See National level data',
        link: '/rankings/populationWise?stateName=India' + (selectedCategory ? '&selectedCategory=' + selectedCategory : '')
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    console.log("err", error);
    return res
      .status(400)
      .json({ status: false, message: "Something error wrong!" });
  }
};

exports.approvedByMohua = async function (req, res, next) {
  try {
    let { ulb, design_year, year, type, actionTakenByRole, status } = req.body;
    if (!ulb && !design_year && !type && !actionTakenByRole && !status) {
      return res.status(400).json({
        status: false,
        message: "Required fields!",
        keys: ["ulb", "design_year", "type", "actionTakenByRole", "status"],
      });
    }
    let condition = { ulb: ObjectId(ulb), design_year: ObjectId(design_year) };
    let fsData = await FiscalRanking.findOne(condition).lean();
    if (fsData) {
      let frMCount = await FiscalRankingMapper.count({
        fiscal_ranking: fsData._id,
        status: "PENDING",
      }).lean();
      let cond = {
        fiscal_ranking: fsData._id,
        year: year,
        type: type,
      };
      let upObj = {
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: req.decoded._id,
        status: status,
        modifiedAt: new Date(),
      };
      if (year) {
        let d = await FiscalRankingMapper.findOneAndUpdate(cond, upObj, {
          upsert: true,
          new: false,
        });
      } else {
        let upObj1 = fsData[type];
        upObj1["status"] = status;
        upObj1["actionTakenByRole"] = actionTakenByRole;
        upObj1["actionTakenBy"] = req.decoded._id;
        let d = await FiscalRanking.findOneAndUpdate(
          condition,
          { $set: { [type]: upObj1 } },
          { upsert: true, new: false }
        );
      }
      if (frMCount == 0 && !(await checkPendingStatus(fsData))) {
        let d = await FiscalRanking.findOneAndUpdate(
          condition,
          { $set: upObj },
          { upsert: true, new: false }
        );
      }
      return res.status(200).json({
        status: true,
        message: "Successfully change request!",
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Data not found!",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: false,
      message: "Something went wrong!",
    });
  }
};
/**
 * if lookup query is simple then use this
 * @param {*} from
 * @param {*} localField
 * @param {*} foreignField
 * @param {*} as
 * @returns an object which with the lookup queries
 */
function getCommonLookupObj(from, localField, foreignField, as) {
  let obj = {};
  try {
    obj = {
      $lookup: {
        from: from,
        localField: localField,
        foreignField: foreignField,
        as: as,
      },
    };
    return obj;
  } catch (err) {
    console.log("error in get CommonLookup obj");
    return obj;
  }
}
/**
 * function that returns condition for UA_ID
 */
function getUA_id() {
  try {
    let obj = {
      $cond: {
        if: { $eq: ["$isUA", "Yes"] },
        then: "$UA._id",
        else: "NA",
      },
    };
    return obj;
  } catch (err) {
    console.log("error while getting UA_id ::: ", err.message);
  }
}
/**
 * function that returns condition of UA
 */
function getUAcondition() {
  try {
    let obj = {
      $cond: {
        if: { $eq: ["$isUA", "Yes"] },
        then: "$UA.name",
        else: "NA",
      },
    };
    return obj;
  } catch (err) {
    console.log("error in getUAcondtion ::: ", err.message);
  }
}
/**
 * function that returns condition for census code
 */
function getCensusCodeCondition() {
  try {
    let obj = {
      $cond: {
        if: {
          $or: [{ $eq: ["$censusCode", ""] }, { $eq: ["$censusCode", null] }],
        },
        then: "$sbCode",
        else: "$censusCode",
      },
    };
    return obj;
  } catch (err) {
    console.log("error in getCensusCodeCondition");
  }
}

/**
 * function that returns condition for population type
 *
 */
function getPopulationCondition() {
  try {
    let obj = {
      $cond: {
        if: {
          $gt: ["$population", 4000000],
        },
        then: "4M+",
        else: {
          $cond: {
            if: {
              $lt: ["$population", 100000],
            },
            then: "<100K",
            else: {
              $cond: {
                if: {
                  $and: [
                    { $gte: ["$population", 100000] },
                    {
                      $lt: ["$population", 1000000],
                    },
                  ],
                },
                then: "100K to 1M",
                else: "1M to 4M",
              },
            },
          },
        },
      },
    };
    return obj;
  } catch (err) {
    console.log("getPopulationCondition ::: ", err.message);
  }
}

/**
 * it is a projection query that returs total for the facet pagination
 * @returns json object
 */
function getTotalProjectionQueryForPagination() {
  try {
    let total = {
      $let: {
        vars: {
          totalObj: {
            $arrayElemAt: ["$metaData", 0],
          },
        },
        in: "$$totalObj.total",
      },
    };
    return total;
  } catch (err) {
    console.log("error");
  }
}

/**
 * function that returns projection query for ulbs only
 * @param {Array} queryArr
 */
function getProjectionQueries(
  queryArr,
  collectionName,
  skip,
  limit,
  newFilter,
  csv,
  sort
) {
  try {
    //projection query for conditions
    let projectionQueryWithConditions = {
      $project: {
        ulbName: "$name",
        ulbId: "$_id",
        ulbCode: "$code",
        censusCode: getCensusCodeCondition(),
        UA: getUAcondition(),
        UA_ID: getUA_id(),
        ulbType: "$ulbType.name",
        ulbType_id: "$ulbType._id",
        population: "$population",
        state_id: "$stateName._id",
        stateName: "$stateName.name",
        populationType: getPopulationCondition(),
        populationCategory: "$population",
        formData: { $ifNull: [`$${collectionName}`, ""] },
      },
    };
    if (!csv) {
      projectionQueryWithConditions = {
        $project: {
          ulbName: "$name",
          ulbId: "$_id",
          ulbCode: "$code",
          censusCode: getCensusCodeCondition(),
          UA: getUAcondition(),
          UA_ID: getUA_id(),
          ulbType: "$ulbType.name",
          ulbType_id: "$ulbType._id",
          population: "$population",
          state_id: "$state",
          stateName: "$stateName.name",
          populationType: getPopulationCondition(),
          populationCategory: "$population",
          ulbDataSubmitted: {
            "$convert":
            {
              input: "$fiscalrankings.progress.ulbCompletion",
              to: "double"
            }
          },
          pmuVerificationProgress: {
            "$convert":
            {
              input: "$fiscalrankings.progress.approvedProgress",
              to: "double"
            }
          },
          // "rejectedProgress": {
          //   "$convert":
          //   {
          //     input: "$formData.progress.rejectedProgress",
          //     to: "double"
          //   }
          // },
          formData: { $ifNull: [`$${collectionName}`, ""] },
        },
      };
    }
    if (csv) {
      projectionQueryWithConditions["$project"]["fsMappers"] =
        "$fiscalrankingmappers";
    }

    queryArr.push(projectionQueryWithConditions);
    let main = projectionQueryWithConditions["$project"];
    let projectedKeys = Object.keys(main);
    mainProjectionQuery(projectionQueryWithConditions, queryArr);
    if (newFilter && Object.keys(newFilter).length > 0) {
      if (newFilter.sbCode) {
        newFilter["censusCode"] = newFilter.sbCode;
        delete newFilter.sbCode;
      }
      // Object.assign(removeEmptyForms["$match"],newFilter)
      queryArr.push({ $match: newFilter });
    }

    let sortObj = {
      "formData.modifiedAt": -1,
    }
    // let sortObj = { "formData.modifiedAt": -1 }

    if (sort && sort !== "null") {
      let splitSort = sort.split('_');
      let objS = {};
      objS[splitSort[0]] = Number(splitSort[1])
      sortObj = { ...objS };
    }
    if (!csv) {
      queryArr.push({ $sort: sortObj });
    }
    getFacetQueryForPagination(queryArr, skip, limit);
    //projection query that decides which cols to show
    if (csv) {
      let projectionQueryThatDecidesCols = {
        $project: {
          formData: 1,
          records: 1,
          total: getTotalProjectionQueryForPagination(),
        },
      };

      queryArr.push(projectionQueryThatDecidesCols);
    }
    appendStages(queryArr);

  } catch (err) {
    console.log("error in getProjectionQueries ::: ", err);
  }
}

function appendStages(query) {
  let arr = [
    {
      $unwind: {
        path: "$records",
      },
    },
    // {
    //   $lookup: {
    //     from: "states",
    //     localField: "records.state_id",
    //     foreignField: "_id",
    //     as: "stateName",
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$stateName",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
    {
      $project: {
        ulbName: "$records.ulbName",
        ulbCode: "$records.ulbCode",
        ulbId: "$records.ulbId",
        censusCode: "$records.censusCode",
        population: "$records.population",
        stateName: "$records.stateName",
        populationType: "$records.populationType",
        filled: "$records.filled",
        populationCategory: "$records.populationCategory",
        formData: "$records.formData",
        ulbDataSubmitted: {
          $ifNull: [{
            "$concat": [`$records.formData.progress.ulbCompletion`, "%"]
          }, {
            "$concat": ["0", "%"]
          }]
        },
        pmuVerificationProgress: {
          $ifNull: [{
            "$concat": [`$records.formData.progress.approvedProgress`, `%`, `,`, `$records.formData.progress.rejectedProgress`, `%`]
          }, { "$concat": ["0", "%"] }]
        },
        "total": {
          $let: {
            vars: {
              totalObj: {
                $arrayElemAt: ["$metaData", 0],
              },
            },
            in: "$$totalObj.total",
          },
        }
      },
    },
  ];
  return query.push(...arr);
}


/**
 * Get projection query for the columns which exists or not
 */
function mainProjectionQuery(projectionQueryWithConditions, queryArr, csv) {
  try {
    let showFields = {
      filled: {
        $cond: {
          if: {
            $or: [
              { $eq: ["$formData", ""] },
              { $eq: ["$formData.isDraft", true] },
            ],
          },
          then: "No",
          else: "Yes",
        },
      },
    };
    let main = projectionQueryWithConditions["$project"];
    let projectedKeys = Object.keys(main);
    for (var projectedKey of projectedKeys) {
      showFields[projectedKey] = 1;
    }
    if (csv) {
      showFields = updateCsvCols(showFields, fetchAmountFromQuery);
      //
    }
    queryArr.push({ $project: showFields });
  } catch (err) {
    console.log("error in mainProjectionQuery :: ", err.message);
  }
}

/**
 * function for unwind
 * @param {string} key
 */
function getUnwindObj(key, preserveNullAndEmptyArrays = false) {
  try {
    var obj = {
      $unwind: key,
    };
    if (preserveNullAndEmptyArrays) {
      obj = { $unwind: {} };
      obj["$unwind"]["path"] = key;
      obj["$unwind"]["preserveNullAndEmptyArrays"] = true;
    }
    return obj;
  } catch (err) {
    console.log("error in getUnwindObj ::: ", err);
  }
}

/**
 * @param {Array} queryArr
 * @param {String} Array
 */
function rankingFormQuery(queryArr, collectionName) {
  try {
    let tableQuery = [
      {
        $match: {
          $expr: { $eq: ["$fiscal_ranking", "$$fr_id"] },
        },
      },
    ];
    let obj = {
      $lookup: {
        from: collectionName,
        let: {
          fr_id: "$fiscalrankings._id",
        },
        pipeline: tableQuery,
      },
    };
    obj["$lookup"]["pipeline"].push(
      getCommonLookupObj("years", "year", "_id", "design_year")
    );
    obj["$lookup"]["pipeline"].push(getUnwindObj("$design_year", true));
    obj["$lookup"]["pipeline"].push({
      $project: {
        type: "$type",
        amount: 1,
        design_year: "$design_year.year",
      },
    });
    obj["$lookup"]["as"] = collectionName;
    queryArr.push(obj);
  } catch (err) {
    console.log("error in rankingFormQuery :: ", err.message);
  }
}

/**
 * Get lookup query for accounts
 * @param {Array} queryArr
 * @param {String} Array
 */
function getFormQuery(queryArr, collectionName, design_year, csv) {
  try {
    let tableQuery = [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$design_year", "$$year"] },
              { $eq: ["$ulb", "$$ulb_id"] },
            ],
          },
        },
      },
    ];
    let obj = {
      $lookup: {
        from: collectionName,
        let: {
          year: ObjectId(design_year),
          ulb_id: "$_id",
        },
        pipeline: tableQuery,
      },
    };
    if (csv) {
      obj["$lookup"]["pipeline"].push(
        getCommonLookupObj("years", "design_year", "_id", "design_year")
      );
      obj["$lookup"]["pipeline"].push(getUnwindObj("$design_year"));
    }
    obj["$lookup"]["as"] = collectionName;
    if (!csv) {
      obj["$lookup"]["pipeline"].push({
        $project: {
          _id: 1,
          status: 1,
          progress: 1,
          actionTakenByRole: 1,
          isDraft: 1,
          currentFormStatus: 1,
          modifiedAt: 1
        },
      });
    }

    queryArr.push(obj);
  } catch (err) {
    console.log("error in getFormQuery ::: ", err.message);
    return;
  }
}

/**
 * pipe line array stage 1 for the state
 * @param {Array} queryArr
 * @param {string} stateId
 */
function get_state_query(queryArr, stateId = false) {
  try {
    //stage1 lookup to get all states with id
    let lookUpStage = getCommonLookupObj("states", "state", "_id", "state");
    queryArr.push(lookUpStage);
    queryArr.push(getUnwindObj("$state", true));
    let matchObj = {
      $match: {
        "state.accessToXVFC": true,
      },
    };

    // stage 2 match
    queryArr.push(matchObj);
  } catch (err) {
    console.log("error while getting state query :: ", err);
    return;
  }
}

/**
 * function facet query that to get the totalCount
 * @param {Number} skip
 * @param {Number} limit
 * @param {Arr} queryArr
 */
function getFacetQueryForPagination(queryArr, skip, limit) {
  let facetObj = {};
  try {
    facetObj = {
      $facet: {
        metaData: [{ $count: "total" }],
        records: [{ $skip: parseInt(skip) }, { $limit: parseInt(limit) }],
      },
    };
    queryArr.push(facetObj);
  } catch (err) {
    console.log("error while getFacetQueryForPagination::", err.message);
  }
}

/**
 * function that get aggregate queries according to stages
 * @param {*} collectionName:String
 * @param {*} path :String
 */
const getAggregateQuery = async (
  collectionName,
  path,
  year,
  skip,
  limit,
  newFilter,
  csv,
  stateId = null,
  sort
) => {
  let query = [];
  try {
    //stage one get Matching ulbs
    let match_ulb_with_access = {
      $match: { isActive: true },
    };

    // if state id is provided then it will search ulb with state
    if (stateId !== null && stateId !== undefined) {
      match_ulb_with_access["$match"]["state"] = ObjectId(stateId);
    }
    query.push(match_ulb_with_access);
    query.push({
      "$lookup": {
        "from": "states",
        "localField": "state",
        "foreignField": "_id",
        "as": "stateName"
      }
    })
    query.push({
      "$unwind": {
        "path": "$stateName",
        "preserveNullAndEmptyArrays": true
      }
    })
    // console.log("match_ulb_with_access", match_ulb_with_access)
    // stage 2 get all states realted to ulb
    if (csv) {
      get_state_query(query, stateId);
    }

    // stage 3 get form data which is filled in this case fiscalranking form
    getFormQuery(query, collectionName, year, csv);
    // if(csv){
    query.push(getUnwindObj(`$${collectionName}`, true));
    if (csv) {
      rankingFormQuery(query, "fiscalrankingmappers");
    }
    // query.push(getUnwindObj(`$fiscalrankingmappers`,true))
    // }
    // stage 4 get all UA realted to tthis ulb and unwind all ua,s
    if (csv) {
      query.push(getCommonLookupObj("uas", "UA", "_id", "UA"));
      query.push(getUnwindObj("$UA", true));
      // stage 5 get all ULBS realted the ulb and unwind it
      query.push(getCommonLookupObj("ulbtypes", "ulbType", "_id", "ulbType"));
      query.push(getUnwindObj("$ulbType", true));
    }

    // stage 6 modify the cols ,handle pagination and search queries
    if (csv) {
      let functionalObj = {
        mainProjectionQuery,
        getCensusCodeCondition,
        getUAcondition,
        getUA_id,
        getPopulationCondition,
        filterQuery,
      };
      getCsvProjectionQueries(
        functionalObj,
        query,
        collectionName,
        skip,
        limit,
        newFilter
      );
    } else {
      getProjectionQueries(query, collectionName, skip, limit, newFilter, csv, sort);
    }
    // stage 7 sort by formData
    // let sortObj ={
    //   "formData.modifiedAt": -1,
    // }

    // comment by suresh
    // let sortObj = {};
    // if (sort && sort !== "null") {
    //   let splitSort = sort.split('_');
    //   sortObj[splitSort[0]] = Number(splitSort[1])
    //   query.push({ $sort: sortObj });
    // }
  } catch (err) {
    console.log("error in getAggregateQuery :::: ", err);
  }
  return query;
}

/**
 * return filters with search params if any
 * @param {*} req :Object
 * @returns javascript object
 */
function searchQueries(req) {
  let filter = {};
  try {
    filter["ulbName"] = req.query.ulbName != "null" ? req.query.ulbName : "";
    filter["censusCode"] =
      req.query.censusCode != "null" ? req.query.censusCode : "";
    filter['state_id'] =
      req.query.stateName != "null" ? req.query.stateName : "";

    filter["populationType"] =
      req.query.populationType != "null" ? POPULATION_TYPE[req.query.populationType] : "";
    filter["ulbType"] = req.query.ulbType != "null" ? req.query.ulbType : "";
    filter["UA"] = req.query.UA != "null" ? req.query.UA : "";
    // filter["status"] = req.query.status != "null" ? req.query.status : "";
    filter['formData.currentFormStatus'] = req.query.status != 'null' ? Number(req.query.status) : ""
    filter["filled_audited"] =
      req.query.filled1 != "null" ? req.query.filled1 : "";
    filter["filled_provisional"] =
      req.query.filled2 != "null" ? req.query.filled2 : "";
  } catch (err) {
    console.log("error in Search Queries function");
  }
  return filter;
}

/**
 * Function that returns dynamic column name for tables in the frontend
 * @returns a javascript object with column names
 */
function getColumns() {
  return {
    sNo: "S No.",
    ulbName: "ULB Name",
    stateName: "State Name",
    censusCode: "Census Code",
    formStatus: "Status",
    cantakeAction: "Action",
    apopulationCategory: "Population Category",
    ulbDataSubmitted: "ULB Data Submitted (%)",
    pmuVerificationProgress: "PMU Verification Progress (Approved,Rejected)"
  };
}

/**
 * check by the role if requested parameter is valid or not
 * * @param {*} formId:String
 * @param {*} mohuaId:String
 * @param {*} stateId:String
 * @param {*} role:String
 * @returns a json object with message and validation
 */
function checkValidRequest(stateId, role) {
  let validation = {
    valid: false,
    message: "",
  };
  try {
    if (role === userTypes.mohua || role === userTypes.pmu || role === userTypes.admin) {
      validation.valid = true;
    }
    // if (formId === undefined || formId === "") {
    //   validation.valid = false;
    //   validation.message = "Form id is required";
    // }
    if (role === userTypes.state) {
      if (stateId === "" || stateId === undefined) {
        validation.valid = false;
        validation.message = "stateId is required";
      } else {
        validation.valid = true;
      }
    }

    if (role === userTypes.ulb) {
      validation.message = "Not allowed";
    }
  } catch (err) {
    validation.valid = false;
    validation.message = err.message;
    console.log("error in checkValidRequest ::: ", err.message);
  }
  return validation;
}

/**
 * updates take action and form status field
 */
function updateActions(data, role, formType) {
  let modifiedData = [...data];
  try {
    modifiedData = data.map((el) => {
      if (!el.formData) {
        el["formStatus"] = "Not Started";
        el["cantakeAction"] = false;
      } else {
        let params = { status: el.formData.currentFormStatus, userRole: role }
        el['cantakeAction'] = role === "ADMIN" || role === userTypes.state || role === userTypes.mohua ? false : canTakeActionOrViewOnlyMasterForm(params);
        el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]

        // el["formStatus"] = calculateStatusForFiscalRankingForms(
        //   el.formData.status,
        //   el.formData.actionTakenByRole,
        //   el.formData.isDraft,
        //   formType
        // );
        // el["cantakeAction"] =
        //   role === "ADMIN" || role === userTypes.state
        //     ? false
        //     : canTakeActionOrViewOnly(el, role, true);
      }
      return el;
      // el['formStatus'] = calculateStatus(el.formData.status, el.formData.actionTakenByRole, el.formData.isDraft, formType);
    });
  } catch (err) {
    console.log("error in updateActions ::: ", err.message);
    return data;
  }
  return modifiedData;
}

/**
 * if role is state get state id
 * @param {role} String
 * @returns
 */
function checkForRoleAndgetStateId(req, role) {
  try {
    if (role === userTypes.state) {
      return req.decoded.state;
    }
  } catch (err) {
    console.log("error in checkForRoleAndgetStateId :: ", err.message);
  }
  return null;
}

/**
 * An Api that get FR forms ulb according to state or mohua
 * @param {*} req:Object
 * @param {*} res:Object
 * @returns json response
 */
module.exports.getFRforms = catchAsync(async (req, res) => {
  let response = {
    success: false,
    message: "Some server error occured",
  };
  try {
    let cols = getColumns();
    let total = 0;
    let aggregateQuery = {};
    let skip = req.query.skip || 0;
    let limit = req.query.limit || 10;
    let sort = req?.query?.sort
    let { role } = req.decoded;
    let {
      design_year: year,
      state: stateId,
      formId,
      getQuery,
      csv,
    } = req.query;
    csv = csv === undefined || csv === "false" ? false : true;
    if (stateId === undefined || stateId === "null") {
      stateId = checkForRoleAndgetStateId(req, role);
    }
    let searchFilters = {};
    if (role === undefined || role === "") {
      response.message = "User role not found";
      return res.status(500).json(response);
    }
    if (year === undefined) {
      response.message = "Year parameter is required";
      return res.status(500).json(response);
    }
    let validation = checkValidRequest(stateId, role);
    if (!validation.valid) {
      response.message = validation.message;
      return res.status(500).json(response);
    }
    searchFilters = searchQueries(req);
    let keys = calculateKeys(searchFilters["status"], role);
    Object.assign(searchFilters, keys);
    let newFilter = await Service.mapFilterNew(searchFilters);
    if (Number(req.query.status) === MASTER_STATUS['Not Started']) {// to apply not started filter
      Object.assign(newFilter, { formData: "" });
      delete newFilter['formData.currentFormStatus']
    }
    // Code that will get the dynamic names when sidemenu is implemented
    //let formTab = await Sidemenu.findOne({ _id: ObjectId(formId) }).lean();
    // get dynamic path and collection name
    //let {path,collectionName} = formTab
    let path = "FiscalRanking";
    let collectionName = "fiscalrankings";
    let formType = "ULB";
    aggregateQuery = await getAggregateQuery(
      collectionName,
      path,
      year,
      skip,
      limit,
      newFilter,
      csv,
      stateId,
      sort
    );
    if (getQuery == "true")
      return res.status(200).json({
        query: aggregateQuery,
      });
    if (!csv) {
      let queryResult = await Ulb.aggregate(aggregateQuery).allowDiskUse(true);
      let data = csv ? [] : queryResult;
      // total = !csv ? data[0]["total"] : 0;
      total = data.length ? data[0]["total"] : 0;
      let records = csv ? [] : data;
      data = updateActions(records, role, formType);
      response.success = true;
      response.columnNames = cols;
      response.data = data;
      response.total = total;
      response.title = "Review Fiscal Ranking  Application";
      response.message = "Fetched successfully";
      return res.status(200).json(response);
    } else {
      response.message = "Currently not implemented";
      await sendCsv(res, aggregateQuery);
    }
  } catch (err) {
    response.success = false;
    response.message = err.message;
    console.log("error in getFrForms", err);
    return res.status(500).json(response);
  }
});

async function sendCsv(res, aggregateQuery) {
  try {
    let filename = "Fiscal-Ranking-Review.csv";
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write(csvColsFr.join(","));
    res.write("\r\n");
    res.flushHeaders();
    let cursor = await Ulb.aggregate(aggregateQuery)
      .allowDiskUse(true)
      .cursor({ batchSize: 500 })
      .addCursorFlag("noCursorTimeout", true)
      .exec();
    cursor.on("data", function (el) {
      el = JSON.parse(JSON.stringify(el));
      el = concatenateUrls(el);
      let str = "";
      for (let key of csvColsFr) {
        if (key == "Form Status") {
          key = "filled";
        }
        if (el[key] !== undefined && el[key] !== null) {
          if (key == "filled") {
            el[key] = el[key] === "Yes" ? "filled" : "Not filled";
          }
          str += typeof el[key] === 'string' ? el[key].split(",").join("-") + "," : el[key] + ",";
        } else {
          str += " " + ",";
        }
      }
      if (str !== " " && str !== undefined) {
        res.write(str + "\r\n");
      }
    });
    cursor.on("end", function (el) {
      res.end();
    });
  } catch (err) {
    console.log("error in sendCsv :: ", err.message);
  }
}

async function getTotalForCalculatedValues(
  dynamicObj,
  displayPriorities,
  yearObj,
  financialInfo
) {
  try {
    let sum = 0;
    let objs = [];
    for (let indexName in financialInfo) {
      let obj = financialInfo[indexName];
      if (displayPriorities.includes(obj.position.toString())) {
        objs.push(obj);
        //   let sumYear = obj.yearData.find(item => item.year.toString() === yearObj.year.toString())
        //   sum += parseInt(sumYear.value)
      }
    }
    for (let obj of objs) {
      let sumYear = obj.yearData.find(
        (item) => item.year.toString() === yearObj.year.toString()
      );
      sum += parseInt(sumYear.value);
    }
    return sum;
  } catch (err) {
    console.log("error in getTotalForCalculatedValues :: ", err.message);
  }
}

async function validateAccordingtoLedgers(
  ulbId,
  dynamicObj,
  years,
  isDraft,
  financialInfo
) {
  let validator = {
    value: years.value,
    valid: true,
    message: "",
  };
  try {
    let ulbData = await ulbLedgersData({ ulb: ulbId });
    let value = years.value;
    // console.log("years :::",years.modelName)
    if (years.modelName === "ULBLedger") {
      // console.log("inside if")
      let ulbValue = await getUlbLedgerDataFilter({
        code: years.code,
        year: years.year,
        data: ulbData,
      });
      if (years.previousYearCodes) {
        ulbValue = await getPreviousYearValues(years, ulbData);
      } else {
        ulbValue = parseInt(ulbValue);
      }
      //
      if (isDraft === true) {
        value = ulbValue || 0;
        validator.valid = true;
        validator.value = value;
        return validator;
      } else if (isDraft === false && dynamicObj.calculatedFrom) {
        let displayPriorities = dynamicObj.calculatedFrom;
        let sum = await getTotalForCalculatedValues(
          dynamicObj,
          displayPriorities,
          years,
          financialInfo
        );
        if (ulbValue === sum) {
          validator.valid = true
          validator.value = years.value
        } else {
          validator.valid = false
          validator.message = `Data in our ledger records in not matching the sub of break up. Please check these fields in financial information. ${dynamicObj.calculatedFrom.join(
            ","
          )}`;
        }
        return validator;
      }
    }
    // else if((!years.modelName === "ULBLedger" || dynamicObj.modelName === undefined) && dynamicObj.calculatedFrom){
    //   let displayPriorities = dynamicObj.calculatedFrom
    //   let sum = getTotalForCalculatedValues(dynamicObj,displayPriorities,years)
    //   if(parseInt(years.value) === sum){
    //     validator.valid = true,
    //     validator.value =  years.sum
    //   }
    //   else{
    //     validator.valid = false
    //     validator.message = `sum is not matching for ${years.type}`
    //   }
    // }
  } catch (err) {
    console.log("error in validateAccordingtoLedgers :: ", err.message);
  }
  return validator;
}

async function updateQueryForFiscalRanking(
  yearData,
  ulbId,
  formId,
  mainFormContent,
  updateForm,
  isDraft,
  session,
  dynamicObj,
  financialInfo,
  currentFormStatus
) {
  try {
    for (var years of yearData) {
      let upsert = false;
      if (years.year) {
        // if(years.type === "registerGisProof"){
        //   console.log("years.type ::: ",years.status)
        // }
        let payload = {};
        let filter = {
          year: ObjectId(years.year),
          ulb: ObjectId(ulbId),
          fiscal_ranking: ObjectId(formId),
          type: years.type,
        };
        if (updateForm) {

          upsert = true;
          if (dynamicObj.calculatedFrom) {
            let validator = await validateAccordingtoLedgers(
              ulbId,
              dynamicObj,
              years,
              isDraft,
              financialInfo
            );
            // console.log("validator :::",validator)
            if (validator.valid) {
              years.value = validator.value;
              // years.modelName =
            } else {
              throw { message: validator.message, type: "ValidationError" };
            }
          }

          payload["value"] = years.value;
          payload["date"] = years.date;
          payload["file"] = years.file;
          payload["status"] = years.status;
          payload["modelName"] = years.modelName;
          payload["rejectReason"] = years?.rejectReason || ""
          payload["rejectReason2"] = years?.rejectReason2 || ""
          payload["displayPriority"] = dynamicObj.position;
          payload['ledgerUpdated'] = false
          payload["ulbComment"] = years.ulbComment;
          payload["ulbValue"] = years.ulbValue;
        } else {
          payload["status"] = years.status;
          payload["value"] = years.value;
          payload["date"] = years.date;
          payload["suggestedValue"] = years.suggestedValue;
          payload["pmuSuggestedValue2"] = years?.pmuSuggestedValue2;
          payload["rejectReason"] = years?.rejectReason;
          payload["rejectReason2"] = years?.rejectReason2;
        }
        payload["approvalType"] = years.approvalType;

        let up = await FiscalRankingMapper.findOneAndUpdate(filter, payload, {
          upsert: upsert,
        });
      } else if (mainFormContent.includes(years.key)) {
        let payload = {};
        let filter = {
          _id: ObjectId(formId),
        };
        if (updateForm) {
          payload[`${years.key}.value`] = years.value;
          // payload['value'] = years.value
        } else {
          payload[`${years.key}.status`] = years.status;
        }

        await FiscalRanking.findOneAndUpdate(filter, payload);
      }
    }
  } catch (err) {
    if (err.type === "ValidationError") {
      throw err;
    }
  }
}

/**
 *
 */
async function updateFiscalRankingForm(
  obj,
  ulbId,
  formId,
  year,
  updateForm,
  isDraft,
  session,
) {
  try {
    const statusNotMandatory = ["caMembershipNo", "otherUpload"]
    let filter = {
      _id: ObjectId(formId),
    };
    let payload = {};
    for (let key in obj) {
      if (updateForm) {
        if (statusNotMandatory.includes(key)) {
          // console.log("obj[key].value ::: ",)
          if (obj[key].value || obj[key]?.name) {
            obj[key].status = obj[key].status || "PENDING"
          }
          else {
            obj[key].status = ""
          }
        }
        if (key === "signedCopyOfFile" || key === "otherUpload" || key === "ulbSupportingDoc") {
          payload[key] = obj[key];
        } else {
          // if (!obj[key].value && !notRequiredValidations.includes(key) && !isDraft) {
          //   throw { "message": `value for field ${key} is required`, "type": "ValidationError" }
          // }
          // console.log("condtion :::: ",statusNotMandatory.includes(key))

          payload[`${key}.value`] = obj[key].value;
          payload[`${key}.status`] = obj[key].status;
          payload[`${key}.modelName`] = obj[key].modelName;
        }
      } else {
        let status = "";
        if (obj[key].status) {
          status = obj[key].status;
        }
        payload[`${key}.status`] = status;
        payload[`${key}.rejectReason`] = obj[key]?.rejectReason;
      }
    }
    // console.log("payload",payload);process.exit()
    await FiscalRanking.findOneAndUpdate(filter, payload);
  } catch (err) {
    console.log("error in updateFiscalRankingForm ::: ", err);
    throw err;
  }
}

function getStatusesFromObject(obj, element, ignoredVariables) {
  let status = [];
  try {
    for (let key in obj) {
      if (!ignoredVariables.includes(key)) {
        if (obj[key][element]) {
          status.push(obj[key][element]);
        }
      }
    }
  } catch (err) {
    console.log("error in getStatusesFromObject :: ", err.message);
  }
  return status;
}


async function manageFormPercentage(params) {
  try {
    let { totalIndicator, completedIndicator, approvedIndicator, rejectedIndicator, formId, updateForm } = params
    let completedPercentage = (completedIndicator / totalIndicator) * 100
    let verificationProgress = ((approvedIndicator + rejectedIndicator) / totalIndicator) * 100
    let approvedPerc = (approvedIndicator / totalIndicator) * 100
    let rejectedPerc = (rejectedIndicator / totalIndicator) * 100
    let payload = {}
    console.log(">>", completedPercentage)
    console.log({ totalIndicator, completedIndicator, approvedIndicator, rejectedIndicator, formId })
    if (updateForm) {
      payload["progress.ulbCompletion"] = completedPercentage < 100 && completedPercentage != 0 ? completedPercentage.toFixed(2) : (parseInt(completedPercentage)).toString()
    }
    else {
      payload["progress.verificationProgress"] = verificationProgress < 100 && verificationProgress != 0 ? verificationProgress.toFixed(2) : (parseInt(verificationProgress)).toString()
      payload['progress.approvedProgress'] = approvedPerc < 100 && approvedPerc != 0 ? approvedPerc.toFixed(2) : (parseInt(approvedPerc)).toString()
      payload['progress.rejectedProgress'] = rejectedPerc < 100 && rejectedPerc != 0 ? rejectedPerc.toFixed(2) : (parseInt(rejectedPerc)).toString()
    }
    console.log(payload)
    await FiscalRanking.findOneAndUpdate({
      "_id": formId
    }, payload)
  }
  catch (err) {
    console.log("error in manageFormPercentage :::: ", err.message)
  }
}


/**
 *
 * @param {array} tabs
 * this function takes an array of tabs and calculate status by yearlyData inside objects
 * @returns a javascript object with key value pair as follows
 * key : tabId
 * value : Object {status:true/false/NA, comment:String}
 */
async function calculateAndUpdateStatusForMappers(
  session,
  tabs,
  ulbId,
  formId,
  year,
  updateForm,
  isDraft,
  currentFormStatus,
  role
) {
  try {
    let totalIndicator = 0;
    let total = 0
    let completedIndicator = 0;
    let approvedIndicator = 0;
    let rejectedIndicator = 0;
    let quesItems = {}
    let conditionalObj = {};
    let ignorablevariables = ["guidanceNotes"];
    const fiscalRankingKeys = [
      "ownRevDetails",
      "webLink",
      "totalOwnRevenueArea",
      "signedCopyOfFile",
      "otherUpload",
    ];
    let idc = []
    let types = new Set()
    for (var tab of tabs) {
      conditionalObj[tab._id.toString()] = {};
      let key = tab.id;
      let obj = tab.data;
      let temp = {
        comment: tab?.feedback?.comment,
        status: [],
      };
      for (var k in tab.data) {
        if (ignorablevariables.includes(k) || obj[k].status === "") {
          continue;
        }
        if (obj[k].yearData) {
          total += 1

          let yearArr = obj[k].yearData;
          let dynamicObj = obj[k];
          let financialInfo = obj;

          for (const uniqueItem of yearArr) {
            if (isAutoApprovedIndicator(uniqueItem, currentFormStatus, role)) {
              uniqueItem.status = 'APPROVED';
            }
            let item = { ...uniqueItem };

            let skipFiles = {
              "registerGisProof": "registerGis",
              "accountStwreProof": "accountStwre"
            }
            if (Object.keys(skipFiles).includes(item.type)) {
              let element = tab.data[skipFiles[item.type]]['yearData'][0]
              if (element.value == "No" || element.value === "") {
                item.required = false
              }
              item.status = element.status

            }
            if (item?.required && item.year) {
              totalIndicator += 1
              let count = calculateReviewCount(item)
              completedIndicator += count[0]
              approvedIndicator += count[1]
              rejectedIndicator += count[2]
            }
          }
          let status = yearArr.every((item) => {
            if (calculatedFields.includes(item?.type)) return true;
            if (item?.type && item.status) {
              return item.status === "APPROVED" || item.status === "";
            } else {
              return true;
            }
          });
          temp["status"].push(status);
          await updateQueryForFiscalRanking(
            yearArr,
            ulbId,
            formId,
            fiscalRankingKeys,
            updateForm,
            isDraft,
            session,
            dynamicObj,
            financialInfo,
            currentFormStatus
          );
        } else {
          if (
            key === priorTabsForFiscalRanking["basicUlbDetails"] ||
            key === priorTabsForFiscalRanking["conInfo"] ||
            fiscalRankingKeys.includes(k)

          ) {
            if (k === "signedCopyOfFile") {
              console.log("inside if  condition")
              totalIndicator += 1
              let demoItem = {
                "status": obj[k].status,
                "file": {
                  name: obj[k].name,
                  url: obj[k].url || ""
                }
              }
              let count = calculateReviewCount(demoItem)
              completedIndicator += count[0]
              approvedIndicator += count[1]
              rejectedIndicator += count[2]
            }
            let statueses = getStatusesFromObject(tab.data, "status", [
              "population11",
            ]);
            let finalStatus = statueses.every((item) => {
              return item === "APPROVED"
            });
            temp["status"].push(finalStatus);
            await updateFiscalRankingForm(
              tab.data,
              ulbId,
              formId,
              year,
              updateForm,
              isDraft,
              session,

            );
          }
        }
        conditionalObj[tab._id.toString()] = temp;
      }
    }
    console.log("totalIndicator", totalIndicator)
    for (var tabName in conditionalObj) {
      if (conditionalObj[tabName].status.length > 0) {
        conditionalObj[tabName].status = conditionalObj[tabName].status.every(
          (item) => item == true
        );
      } else {
        conditionalObj[tabName].status = "NA";
      }
    }
    let params = { totalIndicator, completedIndicator, approvedIndicator, rejectedIndicator, formId, updateForm }
    await session.commitTransaction();
    await session.endSession();
    await manageFormPercentage(params)
    return conditionalObj;
  } catch (err) {
    // await session.abortTransaction()
    // await session.endSession()
    throw err;
    console.log("error in calculatAndUpdateStatusForMappers :: ", err.message);
  }
}

function isAutoApprovedIndicator(years, currentFormStatus, role) {
  const ulbConditions = role === 'ULB' &&
    [
      MASTER_FORM_STATUS['VERIFICATION_NOT_STARTED'],
      MASTER_FORM_STATUS['VERIFICATION_IN_PROGRESS'],
    ].includes(currentFormStatus);

  const pmuConditions = role === 'PMU' &&
    [
      MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_PMU'],
    ].includes(currentFormStatus);

  if ((ulbConditions || pmuConditions) && years.status === 'REJECTED') {
    const approvedTypesToCheck = [
      APPROVAL_TYPES['enteredPmuAcceptUlb'],
      APPROVAL_TYPES['enteredPmuSecondAcceptPmu'],
      APPROVAL_TYPES['enteredPmuAcceptPmu'],
      APPROVAL_TYPES['enteredUlbAcceptPmu'],
    ];

    if (approvedTypesToCheck.includes(years?.approvalType)) {
      return true;
    }
  }

  return false;
}


/**
 * It takes an object as an argument and checks if the values of the object are undefined, null or
 * empty. If any of the values are undefined, null or empty, it returns an object with a message and a
 * boolean value
 * @param keys - This is the object that you want to check for undefined values.
 */
function checkUndefinedValidations(keys) {
  let validation = {
    valid: false,
    message: "",
  };
  try {
    for (var key in keys) {
      if (keys[key] == undefined || keys[key] === null || keys[key] === "") {
        validation.message = `${key} is required`;
        return validation;
      } else {
        validation.valid = true;
      }
    }
  } catch (err) {
    console.log("error in checkUndefiendValidations :: ", err.message);
  }
  return validation;
}
/**
 * save feedback in database for fiscalRanking
 * @param {Object} calculatedStatus
 * @param {String}  ulbId
 * @param {String} formId
 * @param {String} design_year
 */
async function saveFeedbacksAndForm(
  calculatedStatus,
  ulbId,
  formId,
  design_year,
  userId,
  role,
  formStatus
) {
  let validator = {
    success: true,
    message: "",
  };
  let mainStatus_arr = [];
  let status = "PENDING";
  let payloadForForm = {
    actionTakenBy: ObjectId(userId),
    actionTakenByRole: role,
    currentFormStatus: formStatus,
  };

  //Add the submission date in case of Pmu submit the form.
  if (+formStatus == 11 || +formStatus == 10) {
    payloadForForm['pmuSubmissionDate'] = new Date();
  }

  let filterForForm = {
    // _id: ObjectId(formId),
    ulb: ObjectId(ulbId),
    design_year: ObjectId(design_year)

  };
  try {
    let updateForm = await FiscalRanking.findOneAndUpdate(
      filterForForm,
      payloadForForm
    );
    validator.message = "fetched successfully";
  } catch (err) {
    validator.success = false;
    validator.message = err.message;
    console.log(err.message);
  }
  return validator;
}

const decideOverAllStatus = (statusObject) => {
  try {
    let isFormApproved = Object.values(statusObject).every(item => item.status === true)
    return isFormApproved ? 11 : 10
  }
  catch (err) {
    console.log("error in decideOverAllStatus :: ", err.message)
  }
  return 9
}

const sendEmailToUlb = async (ulbId, status) => {
  try {
    let userInf = await Users.findOne({
      "ulb": ObjectId(ulbId),
      "role": "ULB"
    }).populate("ulb")
    let emailAddress = [userInf.email];
    if (process.env.ENV !== ENV['prod']) {
      emailAddress = [TEST_EMAIL['test1'], TEST_EMAIL['test2'], TEST_EMAIL['test3'], TEST_EMAIL['test4']]
    }
    let ulbName = userInf.name;
    let ulbTemplate;
    if (
      status == MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_PMU']
    ) {
      ulbTemplate = Service.emailTemplate.CfrFormApproved(
        ulbName
      );
    } else if (
      status == MASTER_FORM_STATUS['RETURNED_BY_PMU']
    ) {
      ulbTemplate = Service.emailTemplate.CfrFormRejected(
        ulbName
      );
    }
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
    await Service.sendEmail(mailOptions);
  }
  catch (err) {
    console.log("error in sendEmailToUlb ::: ", err.message)
  }

}

module.exports.actionTakenByMoHua = catchAsync(async (req, res) => {
  const response = {
    success: false,
    message: "",
  };
  try {
    let { ulbId, formId, actions, design_year, isDraft, currentFormStatus } = req.body;
    let { role, _id: userId } = req.decoded;
    let validation = await checkUndefinedValidations({
      ulb: ulbId,
      actions: actions,
      design_year: design_year,
    });
    if (!validation.valid) {
      response.message = validation.message;
      return res.status(500).json(response);
    }
    if (role !== userTypes.pmu) {
      response.message = "Not permitted";
      return res.status(500).json(response);
    }

    //Validation for submitted Forms.
    let frForm = await FiscalRanking.findOne({ ulb: ulbId });
    if ([
      MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_PMU'],
      MASTER_FORM_STATUS['RETURNED_BY_PMU'],
    ].includes(frForm.currentFormStatus)) {
      response.message = "The form has already been submitted.";
      return res.status(400).json(response);
    }

    const session = await mongoose.startSession();
    await session.startTransaction();
    let masterFormId = FORMIDs['fiscalRanking'];

    let calculationsTabWise = await calculateAndUpdateStatusForMappers(
      session,
      actions,
      ulbId,
      formId,
      design_year,
      false,
      isDraft,
      currentFormStatus,
      role
    );
    let formStatus = currentFormStatus
    if (currentFormStatus != statusTracker["VIP"]) {
      formStatus = await decideOverAllStatus(calculationsTabWise)
      if ([statusTracker['RBP'], statusTracker['SAP']].includes(formStatus)) {
        await sendEmailToUlb(ulbId, formStatus)
      }
      if ([statusTracker['RBP']].includes(formStatus)) {
        await updateRejectCount(ulbId, design_year);
      }

    }
    let params = { isDraft, role, userId, formId, masterFormId, formBodyStatus: formStatus, actionTakenBy: userId, actionTakenByRole: role }
    await createHistory(params)
    let feedBackResp = await saveFeedbacksAndForm(
      calculationsTabWise,
      ulbId,
      formId,
      design_year,
      userId,
      role,
      formStatus
    );
    if (feedBackResp.success) {
      response.success = true;
      response.message = "Details submitted successfully";
      return res.status(200).json(response);
    } else {
      response.success = false;
      response.message = "Some server error occured";
    }

  } catch (err) {
    // await session.abortTransaction()
    // await session.endSession()
    response.message = "some server error occured";
    console.log("error in actionTakenByMoHua ::: ", err.message);
  }
  return res.status(500).json(response);
});

const updateRejectCount = async (ulb, design_year) => {
  try {
    await FiscalRanking.findOneAndUpdate({ ulb, design_year }, { $inc: { rejectedCount: 1 } })
  } catch (error) {
    console.log("error:::", error)
  }
}

async function checkIfFormIdExistsOrNot(
  formId,
  ulbId,
  design_year,
  isDraft,
  role,
  userId,
  currentFormStatus
) {
  let validation = {
    message: "",
    valid: true,
    formId: null,
  };
  try {
    console.log("currentFormStatus ::: ", currentFormStatus)
    let condition = {
      ulb: ObjectId(ulbId),
      design_year: ObjectId(design_year),
    };
    let formData = await FiscalRanking.findOne(condition, { _id: 1 }).lean();
    if (!formData) {
      let form = await FiscalRanking.create({
        ulb: ObjectId(ulbId),
        design_year: ObjectId(design_year),
        actionTakenByRole: role,
        actionTakenBy: userId,
        status: "PENDING",
        isDraft,
        currentFormStatus: currentFormStatus
      });
      form.save();
      validation.message = "form created";
      validation.valid = true;
      validation.formId = form._id;
    } else {
      let form = await FiscalRanking.findOneAndUpdate(condition, {
        isDraft: isDraft,
        actionTakenByRole: role,
        actionTakenBy: userId,
        currentFormStatus: currentFormStatus
      });
      if (form) {
        validation.message = "form exists";
        validation.valid = true;
        validation.formId = form._id;
      } else {
        validation.message = "No form exists for the form Id";
        validation.valid = false;
        // validation.formId = form._id
      }
    }
    return validation;
  } catch (err) {
    validation.message = "Some error occured";
    if (err.code && err.code === 11000) {
      validation.message = "form for this ulb and design year already exists";
    }
    validation.valid = false;
    console.log(err)
    console.log("error in checkIfFormIdExistsornot ::: ", err.message);
  }
  return validation;
}


const checkIfActionTaken = (actions) => {
  try {
    let tab = actions.find(item => item.id === "s5")['data']
    let actionTaken = Object.entries(tab).some(([key, value]) => ["APPROVED", "REJECTED"].includes(value.status))
    return actionTaken
  }
  catch (err) {
    console.log("error in checkIfActionTaken ::: ", err.message)
  }
  return true
}

module.exports.createForm = catchAsync(async (req, res) => {
  const response = {
    success: false,
    message: "",
  };
  const session = await mongoose.startSession();
  await session.startTransaction();
  try {
    let { ulbId, formId, actions, design_year, isDraft, currentFormStatus, freezeDate, isAutoApproved } = req.body;
    const form = await FiscalRanking.findOne({ design_year, ulb: ulbId});
    if(form && ![
      MASTER_STATUS['Not Started'],
      MASTER_STATUS['In Progress'],
      MASTER_STATUS['Returned by PMU']
    ].includes(form?.currentFormStatus)) return res.status(400).json({ message: 'Unauthorized entry'});
    let { role, _id: userId } = req.decoded;
    if (statusTracker.VIP === currentFormStatus) {
      const actionTaken = await checkIfActionTaken(actions)
      currentFormStatus = actionTaken ? statusTracker.VIP : statusTracker.VNS
    }
    let formIdValidations = await checkIfFormIdExistsOrNot(
      formId,
      ulbId,
      design_year,
      isDraft,
      role,
      userId,
      currentFormStatus
    );

    if (!formIdValidations.valid) {
      response.message = formIdValidations.message;
      return res.status(500).json(response);
    }
    let validation = await checkUndefinedValidations({
      ulb: ulbId,
      actions: actions,
      design_year: design_year,
    });
    formId = formIdValidations.formId;
    if (!validation.valid) {
      response.message = validation.message;
      return res.status(500).json(response);
    }
    let masterFormId = FORMIDs['fiscalRanking'];
    let params = { isDraft, role, userId, formId, masterFormId, formBodyStatus: currentFormStatus, actionBy: ulbId }
    await createHistory(params)
    let calculationsTabWise = await calculateAndUpdateStatusForMappers(
      session,
      actions,
      ulbId,
      formId,
      design_year,
      true,
      isDraft,
      currentFormStatus,
      role
    );
    if (!(statusTracker.IP === currentFormStatus)) {
      let a = await FiscalRanking.findOneAndUpdate({
        ulb: ObjectId(req.body.ulbId),
        design_year: ObjectId(req.body.design_year),
      }, {
        "$set": {
          submittedDate: new Date()
        }
      })
    }
    if (freezeDate) {
      await FiscalRanking.findOneAndUpdate({
        ulb: ObjectId(req.body.ulbId),
        design_year: ObjectId(req.body.design_year),
      }, {
        "$set": {
          freezeDate
        }
      })
    }
    if (isAutoApproved) {
      await FiscalRanking.findOneAndUpdate({
        ulb: ObjectId(req.body.ulbId),
        design_year: ObjectId(req.body.design_year),
      }, {
        "$set": {
          isAutoApproved: true
        }
      })
    }

    response.success = true;
    response.formId = formId;
    response.message = "Form submitted successfully";
    return res.status(200).json(response);
  } catch (err) {
    await session.abortTransaction();
    await session.endSession();
    console.log(err.message);
    await FiscalRanking.findOneAndUpdate(
      {
        ulb: ObjectId(req.body.ulbId),
        design_year: ObjectId(req.body.design_year),
      },
      {
        $set: {
          isDraft: true,
          currentFormStatus: 2
        },
      }
    );
    response.message = "some server error occured";
    if (err.type && err.type === "ValidationError") {
      response.message = err.message;
    }
  }
  return res.status(500).json(response);
});


/* OLD */
// module.exports.FRUlbFinancialData = async (req, res) => {
//   try {
//     let filters = { ...req.query };

//     let { getQuery, sortBy, csv } = filters;
//     csv = csv === "true" ? true : false;

//     let params = { FRUlbFinancialData: true };
//     let { FRUlbFinancialData: query } = await computeQuery(params);
//     if (getQuery === "true") {
//       return res.status(200).json(query);
//     }

//     filters["csv"] ? delete filters["csv"] : "";

//     let newFilter = await Service.mapFilterNew(filters);
//     let { financialInformation } = await fiscalRankingFormJson();

//     const FinancialRankingFilename = "ULB_Ranking_Financial_Data.csv";
//     let { csvCols, dbCols, FRShortKeyObj } = await columnsForCSV(params);
//     let csv2 = createCsv({
//       query,
//       res,
//       filename: FinancialRankingFilename,
//       modelName: "FiscalRankingMapper",
//       dbCols,
//       csvCols,
//       removeEscapesFromArr: [],
//       labelObj: FRShortKeyObj,
//       // percentCompletionArr: [],
//       FRKeyWithDate: [],
//       FRKeyWithFile: []

//     });
//   } catch (error) {
//     return Response.BadRequest(res, {}, error.message);
//   }
// };



module.exports.FROverAllUlbData = async (req, res) => {
  try {
    let filters = { ...req.query };
    let skip = parseInt(filters.skip) || 0;
    let limit = parseInt(filters.limit) || 10;
    let { getQuery, sortBy, csv } = filters;
    csv = csv === "true" ? true : false;

    let condition = fiscalRankingFilter(req);

    let params = { FROverAllUlbData: true };
    let { FROverAllUlbData: query } = await computeQuery(params, condition);
    if (getQuery === "true") {
      return res.status(200).json(query);
    }

    filters["csv"] ? delete filters["csv"] : "";

    let newFilter = await Service.mapFilterNew(filters);
    // let { financialInformation } = await fiscalRankingFormJson();

    const OverallRankingFilename = "ULB_Ranking_Overall_Data.csv";
    // let dbCols = Object.values(FRShortKeyObj);
    let { csvCols, dbCols } = await columnsForCSV(params);
    let removeEscapesFromArr = [
      "nameCmsnr",
      "auditorName",
      "nameOfNodalOfficer",
      "designationOftNodalOfficer",
      "otherUpload",
    ];
    let csv2 = createCsv({
      query,
      res,
      filename: OverallRankingFilename,
      modelName: "Ulb",
      dbCols,
      csvCols,
      removeEscapesFromArr,
      labelObj: {},
      FRKeyWithDate: ["FR_auditAnnualReport_2021-22", "FR_auditAnnualReport_2020-21", "FR_auditAnnualReport_2019-20"],
      FRKeyWithFile: ["FR_accountStwreProof_2021-22", "FR_appAnnualBudget_2020-21", "FR_appAnnualBudget_2021-22", "FR_appAnnualBudget_2022-23",
        "FR_appAnnualBudget_2023-24", "FR_auditedAnnualFySt_2018-19", "FR_auditedAnnualFySt_2019-20", "FR_auditedAnnualFySt_2020-21", "FR_auditedAnnualFySt_2021-22",
        "FR_registerGisProof_2021-22",
      ]
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};

async function columnsForCSV(params) {
  let { FROverAllUlbData, FRUlbFinancialData } = params;
  let output = {};
  if (FROverAllUlbData) {
    output["csvCols"] = [
      "State Name",
      "ULB Name",
      "City Finance Code",
      "Census Code",
      "ULB Type",
      "Design Year",
      "Created Date",
      "Last Submitted Date",
      "Overall Form Status",
      "ULB Data Submitted (%)",
      "PMU Verification progress (Approved %)",
      "PMU Verification progress (Rejected %)",
      "% Completion",
      "I. BASIC ULB DETAILS_Comments",
      "II CONTACT INFORMATION_Comments",
      "III FINANCIAL INFORMATION_Comments",
      "IV UPLOAD FINANCIAL DOCUMENTS_Comments",
      "V SELF DECLARATION_Comments",
      "PMU Review File URL",
      "Population as per 2011 Census",
      "Population as on 1st April 2022",
      "ULB website URL link",
      "Name of Commissioner / Executive Officer ",
      "Auditor Name",
      "CA Membership Number",
      "Name of the Nodal Officer",
      "Designation of the Nodal Officer",
      "Email ID of the Nodal Officer",
      "Mobile number of the Nodal Officer",
      "Does the ULB handle water supply services?",
      "Does the ULB handle sanitation service delivery?",
      "Does your Property Tax include Water Tax?",
      "Does your Property Tax include Sanitation/Sewerage Tax?",
      "Date of Audit Report for audited annual accounts FY 2021-22",
      "Date of Audit Report for audited annual accounts FY 2020-21",
      "Date of Audit Report for audited annual accounts FY 2019-20",
      "ULB website URL link where Audited Accounts are available",
      "Is the property tax register GIS-based?",
      "Please upload proof",
      "Do you use accounting software? ( Eg.Tally State-prescribed ERP etc)",
      "Please upload proof",
      "Copy of Approved Annual Budget preferably in English FY 2023-24",
      "Copy of Approved Annual Budget preferably in English FY 2022-23",
      "Copy of Approved Annual Budget preferably in English FY 2021-22",
      "Copy of Approved Annual Budget preferably in English FY 2020-21",
      "Copy of Audited Annual Financial Statements preferably in English FY 2021-22",
      "Copy of Audited Annual Financial Statements preferably in English FY 2020-21",
      "Copy of Audited Annual Financial Statements preferably in English FY 2019-20",
      "Copy of Audited Annual Financial Statements preferably in English FY 2018-19",
      "Any other information that you would like to provide us?",
      "Upload Signed Copy",
      "Form Rejection Count"
    ];
    output["dbCols"] = [
      "stateName",
      "ulbName",
      "cityFinanceCode",
      "censusCode",
      "ulbType",
      "designYear",
      "createdAt",
      "modifiedAt",
      "currentFormStatus",
      "ulbDataSubmitted",
      "pmuVerificationapprovedProgress",
      "pmuVerificationrejectedProgress",
      "completionPercent",
      "comment_1",
      "II CONTACT INFORMATION_Comments",
      "III FINANCIAL INFORMATION_Comments",
      "IV UPLOAD FINANCIAL DOCUMENTS_Comments",
      "V SELF DECLARATION_Comments",
      "PMU Review File URL",
      "population11",
      "populationFr",
      "webLink",
      "nameCmsnr",
      "auditorName",
      "caMembershipNo",
      "nameOfNodalOfficer",
      "designationOftNodalOfficer",
      "email",
      "mobile",
      "waterSupply",
      "sanitationService",
      "propertyWaterTax",
      "propertySanitationTax",
      "FR_auditAnnualReport_2021-22",
      "FR_auditAnnualReport_2020-21",
      "FR_auditAnnualReport_2019-20",
      "FR_webUrlAnnual_2021-22",
      "FR_registerGis_2021-22",
      "FR_registerGisProof_2021-22",
      "FR_accountStwre_2021-22",
      "FR_accountStwreProof_2021-22",
      "FR_appAnnualBudget_2023-24",
      "FR_appAnnualBudget_2022-23",
      "FR_appAnnualBudget_2021-22",
      "FR_appAnnualBudget_2020-21",
      "FR_auditedAnnualFySt_2021-22",
      "FR_auditedAnnualFySt_2020-21",
      "FR_auditedAnnualFySt_2019-20",
      "FR_auditedAnnualFySt_2018-19",
      "otherUpload",
      "signedCopyOfFile",
      "formRejectedTimes"
    ];
    output["FRShortKeyObj"] = {};
  } else if (FRUlbFinancialData) {
    output["dbCols"] = [
      "stateName",
      "ulbName",
      "cityFinanceCode",
      "censusCode",
      "formStatus2",
      "designYear",
      "dataYear",
      "indicator",
      "amount",
      "suggestedValue",
      "pmuSuggestedValue2",
      "ulbValue",
      "approvalType",
      "status"
    ];
    output["csvCols"] = [
      "State Name",
      "ULB Name",
      "City Finance Code",
      "Census Code",
      "Overall Form Status",
      "Design Year",
      "Data Year",
      "Indicator",
      "Amount",
      "PMU Suggested Value",
      "PMU Different Value",
      "ULB Value",
      "Counter",
      "Approval Status"
    ];

    let FRShortKeyObj = {};
    if (FiscalRankingArray.length > 0) {
      for (let FRObj of FiscalRankingArray) {
        FRShortKeyObj[FRObj["key"]] = FRObj["label"];
      }
    }
    output["FRShortKeyObj"] = FRShortKeyObj;
  }
  return output;
}


function completionPercent(document, FRCompletionNumber) {
  let completionPercent = 0;
  const totalMandatoryFields = 29;
  const [objOfMandatoryFields] = document;

  for (let field in objOfMandatoryFields) {
    if (objOfMandatoryFields[field]) {
      completionPercent++;
    }
  }

  if (FRCompletionNumber) {
    completionPercent = completionPercent + FRCompletionNumber
  }

  return ((completionPercent / totalMandatoryFields) * 100).toFixed();
}


async function createHistory(params) {
  try {
    let { isDraft, role: actionTakenByRole, userId: actionTakenBy, formId, masterFormId, formBodyStatus } = params
    // if(!isDraft || role === userTypes.mohua){
    // let data = await FiscalRanking.find({"_id":ObjectId(formId)}).lean()
    // let mapperData  = await FiscalRankingMapper.find({"fiscal_ranking":ObjectId(formId)})
    // data[0]['fiscalMapperData'] = mapperData
    // let body = {
    //   "formId":FORMIDs['fiscalRanking'],
    //   "recordId":formId,
    //   "data":data
    // }
    // let historyParams = {
    //   body
    // }
    // await saveFormHistory(historyParams)
    // }\
    if (formBodyStatus === MASTER_STATUS["In Progress"]) {

      let currentStatusData = {
        formId: masterFormId,
        recordId: formId,
        status: MASTER_STATUS["In Progress"],
        level: FORM_LEVEL["form"],
        shortKey: "form_level",
        rejectReason: "",
        responseFile: "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
      };
      await saveCurrentStatus({
        body: currentStatusData,
        // session
      });

      // await session.commitTransaction();
      // return Response.OK(res, {}, "Form Submitted");
    } else if (
      [MASTER_STATUS["Submission Acknowledged by PMU"], MASTER_STATUS["Verification Not Started"], MASTER_STATUS["Verification In Progress"], MASTER_STATUS["Returned by PMU"]].includes(formBodyStatus)
    ) {
      let data = await FiscalRanking.find({ "_id": formId }).lean()
      let mapperData = await FiscalRankingMapper.find({ "fiscal_ranking": formId })
      data[0]['fiscalMapperData'] = mapperData
      let bodyData = {
        formId: masterFormId,
        recordId: formId,
        data: data,
      };
      /* Saving the form history of the user. */
      await saveFormHistory({
        body: bodyData,
        // session
      });

      let currentStatusData = {
        formId: masterFormId,
        recordId: formId,
        status: formBodyStatus,
        level: FORM_LEVEL["form"],
        shortKey: "form_level",
        rejectReason: "",
        responseFile: "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
      };
      await saveCurrentStatus({
        body: currentStatusData,
        // session
      });

      let statusHistory = {
        formId: masterFormId,
        recordId: formId,
        shortKey: "form_level",
        data: currentStatusData,
      };
      await saveStatusHistory({
        body: statusHistory,
        //  session 
      });

      // await session.commitTransaction();
      // return Response.OK(res, {}, "Form Submitted");
    }
  }
  catch (err) {
    console.log(err)
    console.log("error in createHistory ::: ", err.message)
  }
}


/**
 * If the key is "indicator", then if the document[key] is "totalOwnRevenueArea", then set FRFlag to
 * true, set str2 to str, and set str2 to the value of totalownOwnRevenueAreaLabel, the value of
 * document['fy_21_22_cash'] if it exists, and an empty string if it doesn't
 * @param key - the key of the document
 * @param document - the document object
 * @param FRFlag - This is a flag that is used to determine if the current row is a total row.
 * @param str2 - the string that will be returned
 * @param str - The string that will be written to the CSV file.
 * @param totalownOwnRevenueAreaLabel - This is the label for the totalownOwnRevenueArea indicator.
 * @param labelObj - This is the object that contains the labels for the indicators.
 * @returns An object with two properties, FRFlag and str2.
 */
function FRFinancialCsvCase(
  key,
  document,
  labelObj
) {
  if (key === "indicator") {
    document[key] = removeEscapeChars(labelObj[document[key]]);
  }
}

/**
 * It takes in a parameter called params, which is an object containing the names of the collections
 * that need to be queried. It then creates an object called output, which will contain the query for
 * each collection
 * @param params - This is the object that is passed to the function.
 * @returns The query returns the data for the fiscal ranking dashboard.
 */
function computeQuery(params, cond = null) {
  const { FRUlbFinancialData, FROverAllUlbData } = params;
  let output = {};
  if (FRUlbFinancialData) {
    const removeKeysFromTypeArray = [
      'auditedAnnualFySt',
      'auditAnnualReport',
      'totalRecBudgetEst',
      'totalOwnRevenues',
      'totalCaptlExp',
      // 'totalOmExp',
      'grossBeforePrior',
      'totalOMCaptlExpWaterSupply',
      // 'totalOMCaptlExpSanitation',
      'grossAfterPrior',
      'priorItems',
      'reservFunds',
      'netBal',
      'OwnRvnue',
      'RvnueExp',
      'auditAnnualReport',
      'webUrlAnnual',
      'registerGis',
      'registerGisProof',
      'accountStwre',
      // 'totalCaptlExpWaterSupply',
      'appAnnualBudget',
      'accountStwreProof'
    ]

    let indicatorArr = FRTypeShortKey.filter(el => {
      return !removeKeysFromTypeArray.includes(el)
    })
    output["FRUlbFinancialData"] = [
      {
        $match: {
          type: {
            $in: indicatorArr,
          },
        },
      },
      {
        $addFields: {
          displayPriority: {
            $convert: {
              input: "$displayPriority",
              to: "decimal",
              onError: "$displayPriority",
            },
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          let: {
            firstUser: "$ulb",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$firstUser"],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "states",
                localField: "state",
                foreignField: "_id",
                as: "state",
              },
            },
            {
              $unwind: {
                path: "$state",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "ulb",
        },
      },
      {
        $unwind: {
          path: "$ulb",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "years",
          localField: "year",
          foreignField: "_id",
          as: "dataYear",
        },
      },
      {
        $unwind: {
          path: "$dataYear",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "fiscalrankings",
          let: {
            firstUser: "$fiscal_ranking",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$_id", "$$firstUser"],
                    },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "years",
                localField: "design_year",
                foreignField: "_id",
                as: "design_year",
              },
            },
            {
              $unwind: {
                path: "$design_year",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "fiscalrankings",
        },
      },

      {
        $unwind: {
          path: "$fiscalrankings",
          preserveNullAndEmptyArrays: true,
        },
      },



      {
        $project: {
          stateName: "$ulb.state.name",
          ulbName: "$ulb.name",
          cityFinanceCode: "$ulb.code",
          censusCode: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$censusCode", ""] },
                  { $eq: ["$censusCode", null] },
                ],
              },
              then: "$ulb.sbCode",
              else: "$ulb.censusCode",
            },
          },
          formStatus2: {
            $cond: {
              if: {
                $or: [
                  {
                    $eq: ["$fiscalrankings.isDraft", true],
                  },
                ],
              },
              then: "In Progress",
              else: "Under Review By MoHUA",
            },
          },
          dataYear: "$dataYear.year",
          indicator: "$type",
          amount: "$value",
          designYear: "$fiscalrankings.design_year.year",
          displayPriority: 1,
        },
      },
      {
        $sort: {
          cityFinanceCode: 1,
          displayPriority: 1,
          dataYear: -1,
        },
      },
    ];
  }
  if (FROverAllUlbData) {
    const { condition, condition_one } = cond
    console.log("condition", condition_one)
    output["FROverAllUlbData"] = [
      { $match: condition },
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $unwind: "$ulbType",
      },
      {
        $lookup: {
          from: "fiscalrankings",
          let: {
            firstUser: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$$firstUser", "$ulb"] }],
                },
              },
            },
            {
              $lookup: {
                from: "years",
                localField: "design_year",
                foreignField: "_id",
                as: "designYear",
              },
            },
            {
              $unwind: {
                path: "$designYear",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                createdAt: 1,
                modifiedAt: 1,
                submittedDate: 1,
                designYear: 1,
                isDraft: 1,
                population11: "$population",
                populationFr: 1,
                webLink: 1,
                nameCmsnr: 1,
                auditorName: 1,
                caMembershipNo: 1,
                nameOfNodalOfficer: 1,
                designationOftNodalOfficer: 1,
                email: 1,
                mobile: 1,
                waterSupply: 1,
                sanitationService: 1,
                propertyWaterTax: 1,
                propertySanitationTax: 1,
                fy_21_22_cash: 1,
                otherUpload: 1,
                rejectedCount: 1,
                signedCopyOfFile: 1,
                currentFormStatus: 1,
                ulbDataSubmitted: "$progress.ulbCompletion",
                pmuVerificationapprovedProgress: "$progress.approvedProgress",
                pmuVerificationrejectedProgress: "$progress.rejectedProgress",
                arrayOfMandatoryField: [
                  {
                    population11: "$population",
                    populationFr: "$populationFr.value",
                    webLink: "$webLink.value",
                    nameCmsnr: "$nameCmsnr.value",
                    auditorName: "$auditorName.value",
                    nameOfNodalOfficer: "$nameOfNodalOfficer.value",
                    designationOftNodalOfficer:
                      "$designationOftNodalOfficer.value",
                    email: "$email.value",
                    mobile: "$mobile.value",
                    waterSupply: "$waterSupply.value",
                    sanitationService: "$sanitationService.value",
                    propertyWaterTax: "$propertyWaterTax.value",
                    propertySanitationTax: "$propertySanitationTax.value",
                    fy_21_22_cash: "$fy_21_22_cash.value",
                    signedCopyOfFile: "$signedCopyOfFile.url"
                  },
                ],
              },
            },
          ],
          as: "fiscalrankings",
        },
      },
      {
        $unwind: {
          path: "$fiscalrankings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          currentFormStatus: {
            $cond: {
              if: {
                $and: [
                  { $eq: [{ $type: "$fiscalrankings" }, "object"] },
                ]
              },
              then: "$fiscalrankings.currentFormStatus",
              else: 1
            }
          },
          populationType: getPopulationCondition()
        }
      },

      { $match: condition_one },
      {
        $lookup: {
          from: "fiscalrankingmappers",
          let: {
            firstUser: ObjectId("606aafb14dff55e6c075d3ae"),
            ulbId: "$_id",
            thirdUser: "$fiscalrankings._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$fiscal_ranking", "$$thirdUser"],
                    },
                    {
                      $eq: ["$ulb", "$$ulbId"],
                    },
                  ],
                },
                type: {
                  $in: [
                    "auditAnnualReport",
                    "webUrlAnnual",
                    "registerGis",
                    "registerGisProof",
                    "accountStwre",
                    "accountStwreProof",
                    "appAnnualBudget",
                    "auditedAnnualFySt",
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "years",
                localField: "year",
                foreignField: "_id",
                as: "year",
              },
            },
            {
              $unwind: {
                path: "$year",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                fiscal_ranking: 1,
                type: 1,
                year: "$year.year",
                date: {
                  $cond: {
                    if: {
                      $and: [{ $ne: ["$date", null] }, { $ne: ["$date", ""] }],
                    },
                    then: AggregationServices.getCommonDateTransformer("$date"),
                    else: null,
                  },
                },
                file: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$file.url", null] },
                        { $ne: ["$file.url", ""] },
                        { $ne: ["$file", null] },
                      ],
                    },
                    then: "$file.url",
                    else: {
                      "$cond": {
                        "if": {
                          "$and": [
                            {
                              "$eq": [
                                "$type",
                                "auditedAnnualFySt"
                              ]
                            },
                            {
                              "$eq": ["$modelName", "ULBLedger"]
                            }
                          ]
                        },
                        "then": "Already Uploaded on Cityfinance",
                        "else": null
                      }
                    },
                  },
                },
                modelName: 1,
                status: 1,
                value: {
                  $cond: {
                    if: {
                      $and: [{ $eq: ["$value", ""] }],
                    },
                    then: null,
                    else: "$value",
                  },
                },
                key: { $concat: ["FR_", "$type", "_", "$year.year"] },
              },
            },
            {
              $sort: {
                key: 1,
              },
            },
          ],
          as: "fiscalrankingmappers",
        },
      },
      {
        $project: {
          stateName: "$state.name",
          ulbName: "$name",
          cityFinanceCode: "$code",
          censusCode: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$censusCode", ""] },
                  { $eq: ["$censusCode", null] },
                ],
              },
              then: "$sbCode",
              else: "$censusCode",
            },
          },
          ulbType: "$ulbType.name",
          designYear: { $ifNull: ["$fiscalrankings.designYear.year", ""] },
          createdAt: {
            $ifNull: [
              AggregationServices.getCommonDateTransformer(
                "$fiscalrankings.createdAt"
              ),
              "",
            ],
          },
          modifiedAt: {
            $ifNull: [
              AggregationServices.getCommonDateTransformer(
                "$fiscalrankings.submittedDate"
              ),
              "",
            ],
          },
          currentFormStatus: "$currentFormStatus",
          // formStatus: {
          //   $cond: {
          //     if: {
          //       $or: [
          //         {
          //           $eq: [{ $ifNull: ["$fiscalrankings", ""] }, ""],
          //         },
          //       ],
          //     },
          //     then: FRFormStatus["Not_Started"],
          //     else: {
          //       $cond: {
          //         if: {
          //           $or: [
          //             {
          //               $eq: ["$fiscalrankings.isDraft", true],
          //             },
          //           ],
          //         },
          //         then: FRFormStatus["In_Progress"],
          //         else: FRFormStatus["Under_Review_By_MoHUA"],
          //       },
          //     },
          //   },
          // },
          ulbDataSubmitted: {
            $ifNull: [{
              "$concat": [`$fiscalrankings.ulbDataSubmitted`, "%"]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          pmuVerificationapprovedProgress: {
            $ifNull: [{
              "$concat": [
                { "$toString": "$fiscalrankings.pmuVerificationapprovedProgress" },
                "%"
              ]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          pmuVerificationrejectedProgress: {
            $ifNull: [{
              "$concat": [
                { "$toString": "$fiscalrankings.pmuVerificationrejectedProgress" },
                "%"
              ]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          ulbDataSubmitted: {
            $ifNull: [{
              "$concat": [`$fiscalrankings.ulbDataSubmitted`, "%"]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          pmuVerificationapprovedProgress: {
            $ifNull: [{
              "$concat": [
                { "$toString": "$fiscalrankings.pmuVerificationapprovedProgress" },
                "%"
              ]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          pmuVerificationrejectedProgress: {
            $ifNull: [{
              "$concat": [
                { "$toString": "$fiscalrankings.pmuVerificationrejectedProgress" },
                "%"
              ]
            }, {
              "$concat": ["0", "%"]
            }]
          },
          comment_1: "",
          "II CONTACT INFORMATION_Comments": "",
          "III FINANCIAL INFORMATION_Comments": "",
          "IV UPLOAD FINANCIAL DOCUMENTS_Comments": "",
          "V SELF DECLARATION_Comments": "",
          population11: { $ifNull: ["$population", ""] },
          populationFr: { $ifNull: ["$fiscalrankings.populationFr.value", ""] },
          webLink: { $ifNull: ["$fiscalrankings.webLink.value", ""] },
          nameCmsnr: { $ifNull: ["$fiscalrankings.nameCmsnr.value", ""] },
          auditorName: { $ifNull: ["$fiscalrankings.auditorName.value", ""] },
          caMembershipNo: {
            $cond: {
              if: {
                $or: [
                  { $eq: ["$fiscalrankings.caMembershipNo.value", ""] },
                  {
                    $eq: ["$fiscalrankings.caMembershipNo.value", null],
                  },
                ],
              },
              then: "N/A",
              else: "$fiscalrankings.caMembershipNo.value",
            },
          },
          nameOfNodalOfficer: {
            $ifNull: ["$fiscalrankings.nameOfNodalOfficer.value", ""],
          },
          designationOftNodalOfficer: {
            $ifNull: ["$fiscalrankings.designationOftNodalOfficer.value", ""],
          },
          email: { $ifNull: ["$fiscalrankings.email.value", ""] },
          mobile: { $ifNull: ["$fiscalrankings.mobile.value", ""] },
          waterSupply: { $ifNull: ["$fiscalrankings.waterSupply.value", ""] },
          sanitationService: {
            $ifNull: ["$fiscalrankings.sanitationService.value", ""],
          },
          propertyWaterTax: {
            $ifNull: ["$fiscalrankings.propertyWaterTax.value", ""],
          },
          propertySanitationTax: {
            $ifNull: ["$fiscalrankings.propertySanitationTax.value", ""],
          },
          fy_21_22_cash: {
            $ifNull: ["$fiscalrankings.fy_21_22_cash.value", ""],
          },
          otherUpload: { $ifNull: ["$fiscalrankings.otherUpload.url", ""] },
          signedCopyOfFile: {
            $ifNull: ["$fiscalrankings.signedCopyOfFile.url", ""],
          },
          formRejectedTimes: "$fiscalrankings.rejectedCount",
          fiscalrankingmappers: 1,
          arrayOfMandatoryField: "$fiscalrankings.arrayOfMandatoryField",
          completionPercentFR: {
            $size: {
              $filter: {
                input: "$fiscalrankingmappers",
                as: "item",
                cond: {
                  $and: [
                    {
                      $or: [
                        { $ne: ["$$item.value", null] },
                        { $ne: ["$$item.file", null] },
                        { $ne: ["$$item.date", null] },
                      ],
                    },
                    {
                      $ne: ["$$item.type", "registerGisProof"],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];
  }
  return output;
}

exports.heatMapReport = async (req, res, next) => {
  let response = {
    "success": false,
    "message": "",
    "data": {}
  }
  try {
    let { state, category, getQuery } = req.query
    getQuery = getQuery === "true"
    console.log(state, category, getQuery);
    let query = stateWiseHeatMapQuery({ state, category })
    if (getQuery) return res.json(query)
    let queryResult = await Ulb.aggregate(query)
    response.success = true
    response.message = queryResult.length ? "Fetched Successfully" : "No data found"
    response.data = queryResult.length ? queryResult[0] : {
      formWiseData: {
        totalForms: 0,
        verificationInProgress: 0,
        verificationNotStarted: 0,
        approved: 0,
        rejected: 0
      },
      ulbWiseData: {
        totalUlbs: 0,
        inProgress: 0,
        submitted: 0,
        notStarted: 0
      }
    }
    return res.json(response)

  }
  catch (err) {
    response.message = "Something went wrong"
    if (["stg", "demo"].includes(process.env.ENV)) {
      response.message = err.message
    }
    return res.json(response)
  }
}

/**
 * @param {object} fyData 
 * @param {Array} requiredKeys 
 */
function calculatePercentage(fyData, requiredKeys, viewOne) {
  try {
    let total = 0
    let approved = 0
    let rejected = 0
    if (viewOne['signedCopyOfFile']) {
      total += 1
      if (viewOne["signedCopyOfFile"]?.status === "APPROVED") {
        approved += 1
      }
      else if (viewOne["signedCopyOfFile"]?.status === "REJECTED") {
        rejected += 1
      }
    }
    for (let requiredKey of requiredKeys) {
      let financialObj = fyData.financialInformation[requiredKey] || fyData.uploadFyDoc[requiredKey]
      let financialYears = financialObj?.yearData || []
      for (let item of financialYears) {
        if (item.status) {
          total += 1
        }
        if (item.status === "APPROVED") {
          approved += 1
        }
        else if (item.status === "REJECTED") {
          rejected += 1
        }
      }
    }
    let approvedPerc = (approved / total) * 100
    let rejectedPerc = (rejected / total) * 100
    return { approvedPerc, rejectedPerc }
  }
  catch (err) {
    console.log("error in calculatePercentage ::: ", err.message)
  }
}


/**
 * It removes newline and comma characters from a string
 * @param entity - The entity to be cleaned up.
 * @returns A function that takes an entity as an argument and returns the entity with all newline and
 * comma characters replaced with a space.
 */
function removeEscapeChars(entity) {
  return !entity ? entity : entity.replace(/(\n|,)/gm, " ");
}

module.exports.FRUlbFinancialData = async (req, res) => {
  try {
    let filters = { ...req.query };
    // let condition = fiscalRankingFilter(req);
    let { getQuery, csv } = filters;
    csv = csv === "true" ? true : false;
    let params = { FRUlbFinancialData: true };
    let query = fyCsvDownloadQuery();
    if (getQuery === "true") {
      return res.status(200).json(query);
    }
    filters["csv"] ? delete filters["csv"] : "";
    let { csvCols } = await columnsForCSV(params);
    fyUlbFyCsv({
      res,
      filename: "ULB_Ranking_Financial_Data.csv",
      modelName: "FiscalRankingMapper",
      csvCols,
      query
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
}

const fiscalRankingFilter = (req) => {
  let condition = { "isActive": true };
  let condition_one = {}
  try {
    if (req.query.stateName && req.query.stateName != "null") condition['state'] = ObjectId(req.query.stateName)
    if (req.query.status && req.query.status != "null") condition_one['currentFormStatus'] = parseInt(req.query.status)
    if (req.query.ulbName && req.query.ulbName != "null") condition["ulbName"] = req.query.ulbName
    if (req.query.censusCode && req.query.censusCode != "null") condition["censusCode"] = req.query.censusCode
    if (req.query.populationType && req.query.populationType != "null") condition_one["populationType"] = POPULATION_TYPE[req.query.populationType]
    if (req.query.ulbType && req.query.ulbType != "null") condition["ulbType"] = req.query.ulbType
    if (req.query.UA && req.query.UA != "null") condition["UA"] = req.query.UA
    return { condition, condition_one }
  } catch (err) {
    console.log("err", err)
    return { condition, condition_one }
  }
}

/**
 * This is a function that generates a CSV file based on given parameters and data from a MongoDB
 * database.
 * @param params - The `params` object contains the following properties:
 * @returns The function `fyUlbFyCsv` does not have a return statement. It writes a CSV file to the
 * response object and ends the response.
 */

async function fyUlbFyCsv(params) {
  try {
    let {
      res,
      filename,
      csvCols,
      query
    } = params;
    let FRShortKeyObj = {};
    if (FiscalRankingArray.length > 0) {
      for (let FRObj of FiscalRankingArray) {
        FRShortKeyObj[FRObj["key"]] = removeEscapeChars(FRObj["label"]);
      }
    }
    let stateList = await State.find({}, { "_id": 1, "name": 1 }).lean();
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write("\ufeff" + `${csvCols.join(",").toString()}` + "\r\n");
    let cursor = moongose
      .model("FiscalRanking")
      .aggregate(query).allowDiskUse(true)
      .cursor({ batchSize: 300 })
      .addCursorFlag("noCursorTimeout", true)
      .exec();
    cursor.on("data", (document) => {
      try {
        document = JSON.parse(JSON.stringify(document));
        document = concatenateUrls(document);
        let fyMapperData = document.fiscalrankingmapper;
        let sortKeys = fiscalRankingQestionSortkeys();
        let stateObj = stateList.length ? stateList.find(e => e._id.toString() == document.state.toString()) : null
        let stateName = stateObj ? stateObj.name : ""
        let censusCode = document.censusCode ? document.censusCode : document.sbCode;
        for (let key in sortKeys) {
          let fyData = fyMapperData.length ? fyMapperData.filter(e => parseFloat(e.displayPriority) == sortKeys[key]) : null;
          if (fyData) {
            for (let pf of fyData) {
              let status = (pf.status && pf.status.length > 0) ? pf.status : "N/A"
              let value = pf.file ? pf.file : pf.date ? pf.date : ((pf.value != null) && pf.value.toString()) ? pf.value.toString() : ""
              if(typeof value == 'object') {
                continue;
              }
              let mainArr = [stateName, document.ulbName, document.cityFinanceCode, censusCode, MASTER_STATUS_ID[document.currentFormStatus], YEAR_CONSTANTS_IDS[document.designYear]];
              let mappersValues = [YEAR_CONSTANTS_IDS[pf.year], FRShortKeyObj[pf.type], value, pf?.suggestedValue, pf?.pmuSuggestedValue2, pf?.ulbValue, pf?.approvalType, status];

              let str = [...mainArr, ...mappersValues].join(",");
              str.trim()
              res.write("\ufeff" + str + "\r\n");
            }
          }
        }
      } catch (err) {
        console.log("error in writeCsv :: ", err);
        return Response.BadRequest(res, {}, err.message);
      }
    });
    cursor.on("end", (el) => { return res.end() });
  } catch (error) { return Response.BadRequest(res, {}, error) }
}

module.exports.checkUndefinedValidations = checkUndefinedValidations

function createCsv(params) {
  try {
    let {
      query,
      res,
      filename,
      modelName,
      dbCols,
      csvCols,
      removeEscapesFromArr,
      labelObj,
      FRKeyWithDate,
      FRKeyWithFile
    } = params;

    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write("\ufeff" + `${csvCols.join(",").toString()}` + "\r\n");

    let cursor = moongose
      .model(modelName)
      .aggregate(query)
      .allowDiskUse(true)
      .cursor({ batchSize: 500 })
      .addCursorFlag("noCursorTimeout", true)
      .exec();

    cursor.on("data", (document) => {
      try {
        document = JSON.parse(JSON.stringify(document));
        let urlParams = {
          file: "file",
          signedCopyOfFile: "signedCopyOfFile",
          otherUpload: "otherUpload",
        };
        document = concatenateUrls(document, urlParams, true);
        let str = "";
        let str2 = "";
        let FRFlag = false;
        const ignoreZero = 0;
        const completionKey = "completionPercentFR";
        const mandatoryFieldsKey = "arrayOfMandatoryField";
        if (Array.isArray(document[mandatoryFieldsKey]) && document[mandatoryFieldsKey]) {
          document["completionPercent"] = completionPercent(document[mandatoryFieldsKey], document[completionKey]);
        }

        for (let key of dbCols) {
          if (removeEscapesFromArr.includes(key)) {
            document[key] = removeEscapeChars(document[key]);
          }
          if (key == "currentFormStatus") {
            document[key] = MASTER_STATUS_ID[document.currentFormStatus]
          }
          if (key.split("_")[0] !== "FR") {
            if (document[key] === ignoreZero || document[key]) {
              /* A destructuring assignment.FR case in Fiscal Mapper */
              FRFinancialCsvCase(
                key,
                document,
                labelObj
              );
              str += document[key].toString().split(",").join("-") + ",";
            } else {
              str += " " + ",";
            }
          } else {
            let fiscalrankingmappersDocument = document[
              "fiscalrankingmappers"
            ].find((el) => key === el.key);
            if (fiscalrankingmappersDocument) {
              let FRMapperKey = "value"
              if (FRKeyWithDate.length > 0 && FRKeyWithDate.includes(key)) {
                FRMapperKey = "date"
              } else if (FRKeyWithFile.length > 0 && FRKeyWithFile.includes(key)) {
                FRMapperKey = "file"
              }
              if (fiscalrankingmappersDocument[FRMapperKey]) {
                str += fiscalrankingmappersDocument[FRMapperKey].split(",").join("-") + ",";
              } else {
                str += " " + ",";
              }
            } else {
              str += " " + ",";
            }
          }
        }
        str.trim()
        res.write("\ufeff" + str + "\r\n");
      } catch (err) {
        console.log("error in writeCsv :: ", err);
      }
    });
    cursor.on("end", (el) => {
      return res.end();
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
}
/**
 * The function calculates review count based on completed, approved, and rejected indicators for a
 * given item.
 * @param item - The item parameter is likely an object that contains information about a review, such
 * as the review value and status.
 * @param completedIndicator - A variable that keeps track of whether the item has been completed or
 * not. It is initially set to 0 and will be set to 1 if the item has a value.
 * @param approvedIndicator - A variable that keeps track of whether the item has been approved or not.
 * It is initially set to 0 and will be set to 1 if the item has a value and its status is "APPROVED".
 * @param rejectedIndicator - The rejectedIndicator parameter is a variable that keeps track of whether
 * a review item has been rejected or not. It is initially set to 0 and will be set to 1 if the item
 * has a value and its status is "REJECTED".
 * @returns An array containing the values of `completedIndicator`, `approvedIndicator`, and
 * `rejectedIndicator`.
 */
function calculateReviewCount(item) {
  let completedIndicator = 0
  let approvedIndicator = 0
  let rejectedIndicator = 0
  if (item.value || item.date != null || (item.file && item?.file?.url) || (item.file && item.modelName === "ULBLedger")) {
    completedIndicator = 1;
  }
  if (item.status === "APPROVED" || (item.file && item.modelName === "ULBLedger")) {
    approvedIndicator = 1;
  }
  if (item.status === "REJECTED" || (item.file && item.modelName === "ULBLedger")) {
    rejectedIndicator = 1;
  }
  return [completedIndicator, approvedIndicator, rejectedIndicator]
}



module.exports.getTrackingHistory = async (req, res) => {
  let response = {
    success: false,
    data: [],
    message: ""
  }
  try {
    let _id = req.query.id
    if (!_id || _id === "null") {
      response.message = "Id is required"
      return res.status(400).json(response)
    }
    let history = await StatusHistory.find({
      "recordId": ObjectId(_id)
    }).sort({
      "createdAt": 1
    }).lean()
    let maxSrNo = 1
    let filteredHistory = history.filter((item, idx) => {
      let nextItem = history[idx + 1] || { data: { status: "null" } }
      let status = item?.data?.status || item['data'][0]['status']
      let nextStatus = (nextItem?.data?.status || nextItem['data'][0]['status'])
      if (status === statusTracker['VIP'] && nextStatus === statusTracker['VIP']) {
        item.createdAt = nextItem.createdAt || item.createdAt
      }
      return (status !== nextStatus)
    })
    let histories = filteredHistory.map((item, index) => {
      maxSrNo += 1
      let status = item?.data?.status || item['data'][0]['status']
      return {
        "srNo": index + 1,
        "action": statusList[status],
        "date": item.createdAt ? (item?.createdAt.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Kolkata',
        }) + " " + item?.createdAt.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
        })) : ""
      }
    })
    // let formModified = form.modifiedAt  ? form.modifiedAt.toLocaleDateString()+" "+form?.createdAt.toLocaleTimeString():  histories[histories.length -1].date
    // histories.push(
    //   {
    //     "srNo":maxSrNo,
    //     "action":statusList[form['currentFormStatus']],
    //     "date":formModified
    //   }
    // )
    response.success = true
    response.data = histories
    response.message = histories.length ? "" : "No history found"
    return res.status(200).json(response)

  }
  catch (err) {
    if (["staging", "demo"].includes((process.env.ENV))) {
      response.message = err.message
    }
    console.log(err)
    console.log("error in getTrackingHistory :: ", err.message)
    return res.status(400).json(response)
  }
}

//This api is used only for once...(After that please remove this api..)
const jwt = require('jsonwebtoken');
const Config = require('../../config/app_config');
const axios = require('axios');
const { appendFile } = require('fs');
const { concatenateUrls } = require("../../service/common");

module.exports.freezeForm = async (req, res) => {
  try {
    let counterSuccess = 0;
    let counterRejection = 0;
    const currentDate = new Date();
    const october22th = new Date(currentDate.getFullYear(), 9, 22);

    let url = "http://localhost:8080/api/v1/";

    if ((process.env.ENV == ENV['prod'])) {
      url = `https://${process.env.PROD_HOST}/api/v1/`;
    } else if ((process.env.ENV == ENV['demo'])) {
      url = `https://${process.env.DEMO_HOST_BACKEND}/api/v1/`;
    } else if ((process.env.ENV == ENV['stg'])) {
      url = `https://${process.env.STAGING_HOST}/api/v1/`;
    }

    let viewEndPoint = "fiscal-ranking/view";
    let createEndPoint = "fiscal-ranking/create-form";

    if (currentDate < october22th) {
      let getUlbForms = await FiscalRanking.find({
        currentFormStatus: { $in: [MASTER_FORM_STATUS['IN_PROGRESS'], MASTER_FORM_STATUS['RETURNED_BY_PMU']] },
        $expr: {
          $gt: [
            { $toDouble: "$progress.rejectedProgress" },
            0
          ]
        },
        pmuSubmissionDate: { $exists: false }
      }).select('ulb design_year');

      for (let frData of getUlbForms) {
        let user = await Users.findOne({ role: 'ULB', ulb: ObjectId(frData?.ulb) });
        if (!user) continue;
        let token = createToken(user)

        const response = await axios.get(`${url}${viewEndPoint}`, {
          params: {
            design_year: frData?.design_year.toString(),
            ulb: frData?.ulb.toString()
          },
          headers: {
            "x-access-token": token || req?.query?.token || "",
          },
        });
        const responseData = response?.data?.data;

        let payload = {
          ulbId: frData?.ulb?.toString(),
          formId: frData?._id?.toString(),
          design_year: frData?.design_year.toString(),
          isDraft: false,
          currentFormStatus: MASTER_FORM_STATUS['VERIFICATION_IN_PROGRESS'],
          actions: responseData?.tabs,
          freezeDate: new Date()
        }

        Object.entries(payload['actions'][2]['data']).forEach(([key, indicator]) => {
          indicator.yearData?.reverse();
          indicator['position'] = +indicator.displayPriority || 1;
        });

        //Api call for ulb to submit the FR form.
        try {
          await axios.post(`${url}${createEndPoint}`, payload, {
            headers: {
              "x-access-token": token || req?.query?.token || "",
            }
          });
          counterSuccess++
          // Handle the response data as needed
        } catch (postError) {
          counterRejection++

          const logDetails = {
            timestamp: new Date().toISOString(),
            ulbId: frData?.ulb?.toString(),
            frFormId: frData?._id?.toString(),
            data: JSON.stringify(postError?.response?.data || {}, 3, 3),
            message: postError?.message,
          };
          appendFile("freezeform-error-logs.txt", JSON.stringify(logDetails, 3, 3) + ",", function (err) {
            if (err) throw err;
            console.log('Saved!');
          })
        }
      }
      return res.status(200).json({ status: true, message: "Executed successfully!", data: { counterSuccess, counterRejection } });
    } else {
      res.status(400).json({ error: 'Current date is greater than October 22th' });
    }
  }
  catch (err) {
    console.log("error in Freeze Form :: ", err.message)
    return res.status(400).json(err)
  }
}

const createToken = (user) => {
  let keys = [
    '_id',
    'accountantEmail',
    'email',
    'role',
    'name',
    'ulb',
    'state',
    'isEmailVerified',
    'isPasswordResetInProgress',
  ];

  let data = {};
  for (k in user) {
    if (keys.indexOf(k) > -1) {
      data[k] = user[k];
    }
  }
  data['purpose'] = 'WEB';
  return jwt.sign(data, Config.JWT.SECRET, { expiresIn: Config.JWT.TOKEN_EXPIRY });
}


async function getDataOFErrorUlbs(ulbIds) {
  return FiscalRanking.aggregate([
    {
      $match: {
        ulb: { $in: ulbIds }
      }
    },
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulbData"
      }
    },
    { $unwind: "$ulbData" },
    {
      $lookup: {
        from: 'fiscalrankingmappers',
        let: {
          frId: '$_id'
        },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$$frId", "$fiscal_ranking"] },
            },
          },
          {
            $match: {
              status: 'REJECTED',
              suggestedValue: { $exists: true, $ne: null, $ne: '' }
            }
          },
        ],
        as: 'mapperData'
      }
    },
    {
      $unwind: "$mapperData"
    },
    {
      $lookup: {
        from: "years",
        localField: "mapperData.year",
        foreignField: "_id",
        as: "yearData"
      }
    },
    { $unwind: "$yearData" },
    {
      $project: {
        _id: 0,
        ulbName: "$ulbData.name",
        censusCode: "$ulbData.censusCode",
        sbCOde: "$ulbData.sbCode",
        "Indicator No": "$mapperData.displayPriority",
        "Year": "$yearData.year",
        "Value": "$mapperData.value",
        "ApprovalType": "$mapperData.approvalType",
        "suggestedValue": "$mapperData.suggestedValue",

      }
    }
  ]);
}

function convertToExcel(data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);
  data.forEach((item) => {
    const row = headers.map((header) => item[header]);
    worksheet.addRow(row);
  });
  return workbook;
}


module.exports.errorLogs = async (req, res) => {
  try {
    const filePath = 'cron-freeze-error-logs.txt';

    fs.readFile(filePath, 'utf8', async (err, data) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error reading file');
      } else {
        fileData = JSON.parse(data);

        const ulbIds = fileData.map(i => ObjectId(i.ulbId));

        const finalData = await getDataOFErrorUlbs(ulbIds);
        const workbook = convertToExcel(finalData);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${process.env.ENV}-error-logs.xlsx`);
        workbook.xlsx.write(res)
          .then(() => {
            res.end();
          })
          .catch((err) => {
            res.status(500).json({ error: 'Error generating Excel file' });
          });
      }
    });
  }
  catch (err) {
    console.log("error While getting logs File :: ", err.message)
    return res.status(400).json(err)
  }
}
