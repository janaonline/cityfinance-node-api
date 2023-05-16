const ObjectId = require("mongoose").Types.ObjectId;
const moongose = require("mongoose");
const Response = require("../../service").response;
const { years } = require("../../service/years");
const FiscalRanking = require("../../models/FiscalRanking");
const FiscalRankingMapper = require("../../models/FiscalRankingMapper");
const { FRTypeShortKey } = require('./formjson')
const UlbLedger = require("../../models/UlbLedger");
const {FORMIDs, MASTER_STATUS,MASTER_STATUS_ID, FORM_LEVEL,POPULATION_TYPE} = require("../../util/FormNames");
const {saveCurrentStatus, saveFormHistory, saveStatusHistory} = require("../../util/masterFunctions");
const FeedBackFiscalRanking = require("../../models/FeedbackFiscalRanking");
const TwentyEightSlbsForm = require("../../models/TwentyEightSlbsForm");
const Ulb = require("../../models/Ulb");
const Service = require("../../service");
const Users = require("../../models/User");
const FiscalRankingArray = require("./formjson").arr;
const {
  csvColsFr,
  getCsvProjectionQueries,
  updateCsvCols,
} = require("../../util/fiscalRankingsConst");
const userTypes = require("../../util/userTypes");
const { dateFormatter } = require("../../util/dateformatter");
// const converter = require('json-2-csv');

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
  questionLevelStatus
} = require("./fydynemic");
const catchAsync = require("../../util/catchAsync");
const State = require("../../models/State");
const fs = require("fs");
const { fiscalRankingColsNameCsv } = require("../../util/Constants");
const TabsFiscalRankings = require("../../models/TabsFiscalRankings");
let priorTabsForFiscalRanking = {
  basicUlbDetails: "s1",
  conInfo: "s2",
  financialInformation: "s3",
  uploadFyDoc: "s4",
  selDec: "s5",
};
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
      // console.log("key ::::",dp)
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
const getReadOnly = (status, isDraft,role,questionStatus) => {
  let allowedMainLevelStatus = [statusTracker.IP,statusTracker.NS,statusTracker.RBP]
  let allowedQuestionLevelStatus = [questionLevelStatus['3']]
  let specialCases = [statusTracker.RBP,questionLevelStatus['1']]
  if(role !== "ULB" || status === statusTracker.VIP){
    return true
  }
  if(status === undefined || questionStatus === undefined){
    return false
  }
  if(!allowedMainLevelStatus.includes(status) && !allowedQuestionLevelStatus.includes(questionStatus)){
    return true
  }
  if(specialCases.includes(status) && specialCases.includes(questionStatus)){
    return true
  }
  return false
};

const getColumnWiseData = (key, obj, isDraft, dataSource = "",role,formStatus) => {
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
        // rejectReason:"",
      };
    case "auditorName":
      console.log({
        ...getInputKeysByType("text", "", "Auditor Name", dataSource, "7"),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
        // rejectReason:"",
      })
      return {
        ...getInputKeysByType("text", "", "Auditor Name", dataSource, "7"),
        ...obj,
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
        // rejectReason:"",
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
        readonly: getReadOnly(formStatus, isDraft,role,obj.status),
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

exports.getView = async function (req, res, next) {
  try {
    let condition = {};
    let {role} = req.decoded
    if (req.query.ulb && req.query.design_year) {
      condition = {
        ulb: ObjectId(req.query.ulb),
        design_year: ObjectId(req.query.design_year),
      };
    }
    let data = await FiscalRanking.findOne(condition, { history: 0 }).lean();
    let twEightSlbs = await TwentyEightSlbsForm.findOne(condition, {
      population: 1,
    }).lean();
    let ulbPData = await Ulb.findOne(
      { _id: ObjectId(req.query.ulb) },
      { population: 1 }
    ).lean();
    let viewOne = {};
    let fyData = [];
    if (data) {
      fyData = await FiscalRankingMapper.find({
        fiscal_ranking: data._id,
      }).lean();
      data["populationFr"] = {...data.populationFr,
        value: data.populationFr.value
          ? data.populationFr.value
          : twEightSlbs
            ? twEightSlbs?.population
            : "",
        readonly: false,
        modelName: twEightSlbs?.population > 0 ? "TwentyEightSlbForm" : "",
      };
      data["population11"] = {...data.population11,
        value: data.population11.value
          ? data.population11.value
          : ulbPData
            ? ulbPData?.population
            : "",
        readonly: true,
        modelName: ulbPData?.population > 0 ? "Ulb" : "",
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
          rejectReason:"",
        },
        populationFr: {
          value: twEightSlbs ? twEightSlbs?.population : "",
          readonly: false,
          status: "PENDING",
          modelName: twEightSlbs?.population > 0 ? "Ulb" : "",
          rejectReason:"",
        },
        fy_21_22_cash: {
          year: null,
          type: null,
          value: null,
          status: "PENDING",
          rejectReason:"",
        },
        signedCopyOfFile: {
          name: null,
          url: null,
          required: true,
          status: "PENDING",
          rejectReason:"",
        },
        otherUpload: {
          name: null,
          url: null,
          required: false, // IMPORTANT :: if changed inform frotend
          status: "PENDING",
          rejectReason:"",
        },
        fy_21_22_online: {
          type: null,
          value: null,
          year: null,
          status: "PENDING",
          rejectReason:"",
        },
        auditorName:{
          type: null,
          value: null,
          year: null,
          status: "PENDING",
          rejectReason:"",
        },
        fyData: [],
        isDraft: null,
        currentFormStatus : 1
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
        viewOne['readonly'] = getReadOnly(data?.currentFormStatus,viewOne.isDraft,role)

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

    let fyDynemic = await fiscalRankingFormJson();
    // await assignCalculatedValues(fyDynemic, viewOne)

    let ulbData = await ulbLedgersData({ ulb: ObjectId(req.query.ulb) });
    let ulbDataUniqueFy = await ulbLedgerFy({
      financialYear: {
        $in: [
          "2017-18",
          "2018-19",
          "2019-20",
          "2020-21",
          "2021-22",
          "2022-23",
          "2023-24",
        ],
      },
      ulb: ObjectId(req.query.ulb),
    });
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
          pf['readonly'] =  getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,"PENDING");
          if (pf?.code?.length > 0) {
            pf["status"] = null;
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
                pf["status"] = singleFydata.status
                pf["rejectReason"] = singleFydata.rejectReason
                pf["modelName"] = singleFydata ? singleFydata.modelName : "";
                pf["status"] = singleFydata.status;
                if (subData[key].calculatedFrom === undefined) {
                  pf["readonly"] =  getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,singleFydata.status);
                } else {
                  pf["readonly"] = true;
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
                pf["status"] = ulbFyAmount ? "NA" : "PENDING";
                // subData[key]["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "FiscalRanking"
                pf["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "";
                if (subData[key].calculatedFrom === undefined) {
                  pf["readonly"] = ulbFyAmount > 0 ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,singleFydata.status);
                } else {
                  pf["readonly"] = true;
                }
                console.log(">>>>>.readOnly ulb ::",pf['readonly'])
              }
            } else {
              if ([1,2].includes(viewOne.currentFormStatus) === null) {
                let ulbFyAmount = await getUlbLedgerDataFilter({
                  code: pf.code,
                  year: pf.year,
                  data: ulbData,
                });
                pf["value"] = ulbFyAmount;
                // pf['value'] = ulbFyAmount;
                pf["status"] = ulbFyAmount ? "NA" : "PENDING";
                // subData[key]["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "FiscalRanking"
                pf["modelName"] = ulbFyAmount > 0 ? "ULBLedger" : "";
                console.log("ulbFyAmount ::: ",ulbFyAmount)
                if (subData[key].calculatedFrom === undefined) {
                  pf["readonly"] = ulbFyAmount > 0 ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,singleFydata.status);
                } else {
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
                  pf["status"] = singleFydata.status;
                  pf["modelName"] = singleFydata.modelName;
                  pf['rejectReason'] = singleFydata.rejectReason
                  if (subData[key].calculatedFrom === undefined) {
                    pf["required"] =
                      singleFydata.status && singleFydata.status == "NA"
                        ? false
                        : true;
                    pf["readonly"] = getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,singleFydata?.status);
                  } else {
                    pf["readonly"] = true;
                  }
                  
                } else {
                  if (
                    subData[key]?.key !== "appAnnualBudget" &&
                    viewOne.isDraft == null
                  ) {
                    let chekFile = ulbDataUniqueFy
                      ? ulbDataUniqueFy.some(
                        (el) => el?.year_id.toString() === pf?.year.toString()
                      )
                      : false;
                    pf["status"] = chekFile ? singleFydata.status : "PENDING";
                    pf["modelName"] = chekFile ? "ULBLedger" : "";
                    console.log("chekFile :: ", chekFile);
                    if (chekFile) {
                      pf[
                        "info"
                      ] = `Available on Cityfinance - <a href ="https://cityfinance.in/resources-dashboard/data-sets/income_statement ">View here</a>`;
                    }
                    if (subData[key].calculatedFrom === undefined) {
                      console.log("chekFile", chekFile);
                      pf["readonly"] = chekFile ? true : false;
                      pf["required"] = chekFile ? false : true;
                    } else {
                      pf["readonly"] = true;
                    }
                    
                  }
                }
              } else {
                if (
                  subData[key]?.key !== "appAnnualBudget" &&
                  viewOne.isDraft == null
                ) {
                  let chekFile = ulbDataUniqueFy
                    ? ulbDataUniqueFy.some(
                      (el) => el?.year_id.toString() === pf?.year.toString()
                    )
                    : false;
                  pf["status"] = chekFile ? "NA" : "PENDING";
                  pf["modelName"] = chekFile ? "ULBLedger" : "";
                  if (chekFile) {
                    pf[
                      "info"
                    ] = `Available on Cityfinance - <a href ="https://cityfinance.in/resources-dashboard/data-sets/income_statement ">View here</a>`;
                  }
                  if (subData[key].calculatedFrom === undefined) {
                    pf["readonly"] = chekFile ? true : getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,"PENDING");
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
                    pf["status"] = singleFydata
                      ? singleFydata.status
                      : "PENDING";
                    pf["modelName"] = singleFydata
                      ? singleFydata.modelName
                      : "";
                    pf["rejectReason"] = singleFydata ?  singleFydata.rejectReason : ""
                    if (subData[key].calculatedFrom === undefined) {
                      pf["readonly"] = getReadOnly(data?.currentFormStatus, viewOne.isDraft,role,singleFydata.status);
                    } else {
                      pf["readonly"] = true;
                    }
                  }
                }
              } else if (pf?.previousYearCodes?.length) {
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
                  pf["modelName"] = "ULBLedger";
                  // console.log(">>>>>>>>>>>> ",pf['value'])
                }
              }
            }
          }
        }
      }
    }

    let tabs = await TabsFiscalRankings.find({})
      .sort({ displayPriority: 1 })
      .lean();
    let conditionForFeedbacks = {
      fiscal_ranking: data?._id || null,
    };
    Object.assign(conditionForFeedbacks, condition);
    let modifiedTabs = await getModifiedTabsFiscalRanking(
      tabs,
      viewOne,
      fyDynemic,
      conditionForFeedbacks
    );
    let viewData = {
      _id: viewOne._id ? viewOne._id : null,
      ulb: viewOne.ulb ? viewOne.ulb : req.query.ulb,
      design_year: viewOne.design_year
        ? viewOne.design_year
        : req.query.design_year,
      isDraft: viewOne.isDraft,
      tabs: modifiedTabs,
      currentFormStatus:viewOne.currentFormStatus,
      financialYearTableHeader,
    };
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
              $in: ["2017-18", "2018-19", "2019-20", "2020-21", "2021-22"],
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
        then: "4Mn+",
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
  csv
) {
  try {
    //   let removeEmptyForms = {
    //     "$match": {
    //         "formData":{"$exists":true, $not: {$size: 0}}
    //     }
    // }
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
        state_id: "$state._id",
        stateName: "$state.name",
        populationType: getPopulationCondition(),
        populationCategory:"$population",

        formData: { $ifNull: [`$${collectionName}`, ""] },
      },
    };
    if(!csv){
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
          populationType: getPopulationCondition(),
          populationCategory:"$population",
  
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
    if(!csv){
      let sortObj ={
        "formData.modifiedAt": -1,
      }
      queryArr.push({ $sort: sortObj });
    }
    getFacetQueryForPagination(queryArr, skip, limit);
    //projection query that decides which cols to show
    if(csv){
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

function appendStages(query){
  let arr = [
    {
      $unwind: {
        path: "$records",
      },
    },
    {
      $lookup: {
        from: "states",
        localField: "records.state_id",
        foreignField: "_id",
        as: "stateName",
      },
    },
    {
      $unwind: {
        path: "$stateName",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        ulbName: "$records.ulbName",
        ulbCode: "$records.ulbCode",
        ulbId: "$records.ulbId",
        censusCode: "$records.censusCode",
        population: "$records.population",
        stateName: "$stateName.name",
        populationType: "$records.populationType",
        filled: "$records.filled",
        populationCategory: "$records.populationCategory",
        formData: "$records.formData",
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
    if(csv){
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
          actionTakenByRole: 1,
          isDraft: 1,
          currentFormStatus:1,
          modifiedAt:1
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
function getAggregateQuery(
  collectionName,
  path,
  year,
  skip,
  limit,
  newFilter,
  csv,
  stateId = null,
  sort
) {
  let query = [];
  try {
    //stage one get Matching ulbs
    let match_ulb_with_access = {
      $match: { access_2223: true },
    };
    // if state id is provided then it will search ulb with state
    if (stateId !== null && stateId !== undefined) {
      match_ulb_with_access["$match"]["state"] = ObjectId(stateId);
    }
    query.push(match_ulb_with_access);
    // stage 2 get all states realted to ulb
    if(csv){
      get_state_query(query, stateId);
    }

    // stage 3 get form data which is filled in this case fiscalranking form
    getFormQuery(query, collectionName, year, csv);
    // if(csv){
    query.push(getUnwindObj(`$${collectionName}`, true));
    if(csv){
      rankingFormQuery(query, "fiscalrankingmappers");
    }
    // query.push(getUnwindObj(`$fiscalrankingmappers`,true))
    // }
    // stage 4 get all UA realted to tthis ulb and unwind all ua,s
    if(csv){
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
      getProjectionQueries(query, collectionName, skip, limit, newFilter, csv);
    }
    // stage 7 sort by formData
    // let sortObj ={
    //   "formData.modifiedAt": -1,
    // }
    let sortObj = {};
    if(sort && sort !== "null"){
      let splitSort = sort.split('_');
      sortObj[splitSort[0]] = Number(splitSort[1])
      query.push({ $sort: sortObj });
    }
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
function populationTypeFilter(populationType){
  let filterObj = {

  }

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
    apopulationCategory:"Population Category"
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
    if (role === userTypes.mohua) {
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
        let params = {status: el.formData.currentFormStatus, userRole: role}
        el['cantakeAction'] = role === "ADMIN" || role === userTypes.state ? false : canTakeActionOrViewOnlyMasterForm(params);
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
    console.log(validation);
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
    aggregateQuery = getAggregateQuery(
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
    console.log("error in getFrForms", err.message);
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
      let str = "";
      for (let key of csvColsFr) {
        if (key == "Form Status") {
          key = "filled";
        }
        if (el[key] !== undefined && el[key] !== null) {
          if (key == "filled") {
            el[key] = el[key] === "Yes" ? "filled" : "Not filled";
          }
          str += el[key] + ",";
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
          (validator.valid = true), (validator.value = years.value);
        } else {
          (validator.valid = false),
            (validator.message = `Data in our ledger records in not matching the sub of break up. Please check these fields in financial information. ${dynamicObj.calculatedFrom.join(
              ","
            )}`);
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
  financialInfo
) {
  try {
    for (var years of yearData) {
      let upsert = false;
      if (years.year) {
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
          payload["displayPriority"] = dynamicObj.position;
        } else {
          payload["status"] = years.status;
          payload["rejectReason"] = years?.rejectReason
        }
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
  session
) {
  try {
    let filter = {
      _id: ObjectId(formId),
    };
    let payload = {};
    for (let key in obj) {
      if (updateForm) {
        if (key === "signedCopyOfFile" || key === "otherUpload") {
          payload[key] = obj[key];
        } else {
          // if (!obj[key].value && !notRequiredValidations.includes(key) && !isDraft) {
          //   throw { "message": `value for field ${key} is required`, "type": "ValidationError" }
          // }
          payload[`${key}.value`] = obj[key].value;
          payload[`${key}.status`] = obj[key].status;
          payload[`${key}.modelName`] = obj[key].modelName;
        }
      } else {
        let status = null;
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
  isDraft
) {
  try {
    let conditionalObj = {};
    let ignorablevariables = ["guidanceNotes"];
    const fiscalRankingKeys = [
      "ownRevDetails",
      "webLink",
      "totalOwnRevenueArea",
      "signedCopyOfFile",
      "otherUpload",
    ];

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
          let yearArr = obj[k].yearData;
          let dynamicObj = obj[k];
          let financialInfo = obj;
          let status = yearArr.every((item) => {
            if(item?.type == 'registerGisProof') return true;
            if (item?.type) {
              return item.status === "APPROVED";
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
            financialInfo
          );
        } else {
          if (
            key === priorTabsForFiscalRanking["basicUlbDetails"] ||
            key === priorTabsForFiscalRanking["conInfo"] ||
            fiscalRankingKeys.includes(k)
          ) {
            let statueses = getStatusesFromObject(tab.data, "status", [
              "population11",
              "populationFr"
            ]);
            let finalStatus = statueses.every((item) => item === "APPROVED");
            temp["status"].push(finalStatus);
            await updateFiscalRankingForm(
              tab.data,
              ulbId,
              formId,
              year,
              updateForm,
              isDraft,
              session
            );
          }
        }
        conditionalObj[tab._id.toString()] = temp;
      }
    }
    for (var tabName in conditionalObj) {
      if (conditionalObj[tabName].status.length > 0) {
        conditionalObj[tabName].status = conditionalObj[tabName].status.every(
          (item) => item == true
        );
      } else {
        conditionalObj[tabName].status = "NA";
      }
    }
    await session.commitTransaction();
    await session.endSession();
    return conditionalObj;
  } catch (err) {
    // await session.abortTransaction()
    // await session.endSession()
    throw err;
    console.log("error in calculatAndUpdateStatusForMappers :: ", err.message);
  }
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
    currentFormStatus:formStatus,
  };
  let filterForForm = {
    // _id: ObjectId(formId),
    ulb:ObjectId(ulbId),
    design_year:ObjectId(design_year)

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

const decideOverAllStatus = (statusObject)=>{
  try{
    let isFormApproved = Object.values(statusObject).every(item => item.status === true)
    return isFormApproved ? 11 : 10
  }
  catch(err){
    console.log("error in decideOverAllStatus :: ",err.message)
  }
  return 9
}

const sendEmailToUlb = async (ulbId)=>{
  try{
    let userInf = await Users.findOne({
      "ulb":ObjectId(ulbId),
      "role":"ULB"
    }).populate("ulb")
    let emailAddress = [userInf.email]
    let ulbName = userInf.name
    let ulbTemplate = Service.emailTemplate.CfrFormRejected(
        ulbName,
    );
    console.log("emailAddress ::: ",emailAddress)
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
   console.log("email Sent")
  }
  catch(err){
    console.log("error in sendEmailToUlb ::: ",err.message)
  }

}

module.exports.actionTakenByMoHua = catchAsync(async (req, res) => {
  const response = {
    success: false,
    message: "",
  };
  try {
    let { ulbId, formId, actions, design_year, isDraft,currentFormStatus } = req.body;
    console.log("currentFormStatus :: ",currentFormStatus)
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
    if (role !== userTypes.mohua) {
      response.message = "Not permitted";
      return res.status(500).json(response);
    }
    const session = await mongoose.startSession();
    await session.startTransaction();
    let masterFormId = FORMIDs['fiscalRanking'];
    let params = {isDraft,role,userId,formId,masterFormId, formBodyStatus:currentFormStatus}
    await createHistory(params)
    let calculationsTabWise = await calculateAndUpdateStatusForMappers(
      session,
      actions,
      ulbId,
      formId,
      design_year,
      false,
      isDraft
    );    
    let formStatus = currentFormStatus
    console.log("currentFormStatus :: ",currentFormStatus)
    if(currentFormStatus != 9){
      formStatus = await  decideOverAllStatus(calculationsTabWise)
      console.log("formStatus :: ",formStatus)
      if(formStatus === 10){
        await sendEmailToUlb(ulbId)
      }
      
    }
    let feedBackResp = await saveFeedbacksAndForm(
      calculationsTabWise,
      ulbId,
      formId,
      design_year,
      userId,
      role,
      formStatus
    ); 
    console.log("feedBackResp ::: ",calculationsTabWise)
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
    console.log("currentFormStatus ::: ",currentFormStatus)
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
module.exports.createForm = catchAsync(async (req, res) => {
  const response = {
    success: false,
    message: "",
  };
  const session = await mongoose.startSession();
  await session.startTransaction();
  try {
    let { ulbId, formId, actions, design_year, isDraft,currentFormStatus } = req.body;
    let { role, _id: userId } = req.decoded;
    console.log("currentFormStatus ::: 1 ",currentFormStatus)
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
    let params = {isDraft,role,userId,formId,masterFormId, formBodyStatus:currentFormStatus}
    await createHistory(params)
    let calculationsTabWise = await calculateAndUpdateStatusForMappers(
      session,
      actions,
      ulbId,
      formId,
      design_year,
      true,
      isDraft
    );
    if (!isDraft) {
      await FiscalRanking.findOneAndUpdate({
        ulb: ObjectId(req.body.ulbId),
        design_year: ObjectId(req.body.design_year),
      }, {
        submittedDate: new Date()
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
          currentFormStatus:2
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

module.exports.FRUlbFinancialData = async (req, res) => {
  try {
    let filters = { ...req.query };
    let skip = parseInt(filters.skip) || 0;
    let limit = parseInt(filters.limit) || 10;
    let { getQuery, sortBy, csv } = filters;
    csv = csv === "true" ? true : false;

    let params = { FRUlbFinancialData: true };
    let { FRUlbFinancialData: query } = await computeQuery(params);
    if (getQuery === "true") {
      return res.status(200).json(query);
    }

    filters["csv"] ? delete filters["csv"] : "";

    let newFilter = await Service.mapFilterNew(filters);
    let { financialInformation } = await fiscalRankingFormJson();

    const FinancialRankingFilename = "ULB_Ranking_Financial_Data.csv";
    let { csvCols, dbCols, FRShortKeyObj } = await columnsForCSV(params);
    let csv2 = createCsv({
      query,
      res,
      filename: FinancialRankingFilename,
      modelName: "FiscalRankingMapper",
      dbCols,
      csvCols,
      removeEscapesFromArr: [],
      labelObj: FRShortKeyObj,
      // percentCompletionArr: [],
      FRKeyWithDate: [],
      FRKeyWithFile: []

    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};

module.exports.FROverAllUlbData = async (req, res) => {
  try {
    let filters = { ...req.query };
    let skip = parseInt(filters.skip) || 0;
    let limit = parseInt(filters.limit) || 10;
    let { getQuery, sortBy, csv } = filters;
    csv = csv === "true" ? true : false;

    let params = { FROverAllUlbData: true };
    let { FROverAllUlbData: query } = await computeQuery(params);
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
    // let percentCompletionArr = [
    //   "population11",
    //   "populationFr",
    //   "webLink",
    //   "nameCmsnr",
    //   "auditorName",
    //   "nameOfNodalOfficer",
    //   "designationOftNodalOfficer",
    //   "email",
    //   "mobile",
    //   "waterSupply",
    //   "sanitationService",
    //   "propertyWaterTax",
    //   "propertySanitationTax",
    //   "FR_auditAnnualReport_2021-22",
    //   "FR_auditAnnualReport_2020-21",
    //   "FR_auditAnnualReport_2019-20",
    //   "FR_webUrlAnnual_2021-22",
    //   "FR_registerGis_2021-22",
    //   "FR_accountStwre_2021-22",
    //   "FR_accountStwreProof_2021-22",
    //   "FR_appAnnualBudget_2023-24",
    //   "FR_appAnnualBudget_2022-23",
    //   "FR_appAnnualBudget_2021-22",
    //   "FR_appAnnualBudget_2020-21",
    //   "FR_auditedAnnualFySt_2021-22",
    //   "FR_auditedAnnualFySt_2020-21",
    //   "FR_auditedAnnualFySt_2019-20",
    //   "FR_auditedAnnualFySt_2018-19",
    // ];
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
      "Upload Signed Copy"
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
      "formStatus",
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
      "signedCopyOfFile"
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
    // if(!dbCols.length){
    //   dbCols =  Object.keys(cols)
    // }
    // if(!csvCols.length){
    //   csvCols = Object.values(cols)
    // }
    let cursor = moongose
      .model(modelName)
      .aggregate(query)
      .allowDiskUse(true)
      .cursor({ batchSize: 500 })
      .addCursorFlag("noCursorTimeout", true)
      .exec();
    res.setHeader("Content-disposition", "attachment; filename=" + filename);
    res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
    res.write("\ufeff" + `${csvCols.join(",").toString()}` + "\r\n");
    // res.write();
    cursor.on("data", (document) => {
      try {
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
          /* *
              this condition converts date to DD/MM/YYYY format
            * */
          // if (["createdAt", "modifiedAt"].includes(key)) {
          //   document[key]
          //     ? (document[key] = dateFormatter(document[key], "/"))
          //     : "";
          // }
          if (removeEscapesFromArr.includes(key)) {
            document[key] = removeEscapeChars(document[key]);
          }

          if (key.split("_")[0] !== "FR") {
            if (document[key] === ignoreZero || document[key]) {
              /* A destructuring assignment.FR case in Fiscal Mapper */
              FRFinancialCsvCase(
                key,
                document,
                labelObj
              );
              // if (key === "formStatus") {
              //   let { status, actionTakenByRole, isDraft } = document[key];
              //   document[key] = calculateStatusForFiscalRankingForms(
              //     status,
              //     actionTakenByRole,
              //     isDraft,
              //     "ULB"
              //   );
              // }

              str += document[key] + ",";
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
                str += fiscalrankingmappersDocument[FRMapperKey] + ",";
              } else {
                str += " " + ",";
              }
            } else {
              str += " " + ",";
            }
          }
        }
        // if (FROverallFlag) {
        //   let percent = (
        //     (completionPercent / denominatorMandatory) *
        //     100
        //   ).toFixed();
        //   str2 = str.split(",");
        //   str2.splice(9, 1, `${percent}%`);
        //   str = str2.join(",");
        // }
        str.trim()
        res.write("\ufeff" + str + "\r\n");
        // if (FRFlag) {
        //   res.write("\ufeff" + str2 + "\r\n");
        //   FRFlag = false;
        // }
      } catch (err) {
        console.log("error in writeCsv :: ", err.message);
      }
    });

    cursor.on("end", (el) => {
      // res.flushHeaders();
      // console.log("ended");
      return res.end();
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
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


async function createHistory(params){
  try{
    let {isDraft,role:actionTakenByRole,userId:actionTakenBy,formId,masterFormId,formBodyStatus} = params
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
    // } 
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
      await saveCurrentStatus({ body: currentStatusData, 
        // session
       });

      // await session.commitTransaction();
      // return Response.OK(res, {}, "Form Submitted");
    } else if (
      formBodyStatus === MASTER_STATUS["Verification Not Started"]
    ) {
      let data = await FiscalRanking.find({"_id":formId}).lean()
      let mapperData  = await FiscalRankingMapper.find({"fiscal_ranking":formId})
      data[0]['fiscalMapperData'] = mapperData
      let bodyData = {
        formId: masterFormId,
        recordId: formId,
        data: data,
      };
      /* Saving the form history of the user. */
      await saveFormHistory({ body: bodyData , 
        // session
      });

      let currentStatusData = {
        formId: masterFormId,
        recordId: formId,
        status: MASTER_STATUS["Verification Not Started"],
        level: FORM_LEVEL["form"],
        shortKey: "form_level",
        rejectReason: "",
        responseFile: "",
        actionTakenByRole: actionTakenByRole,
        actionTakenBy: ObjectId(actionTakenBy),
      };
      await saveCurrentStatus({ body: currentStatusData , 
        // session
      });

      let statusHistory = {
        formId: masterFormId,
        recordId: formId,
        shortKey: "form_level",
        data: currentStatusData,
      };
      await saveStatusHistory({ body: statusHistory ,
        //  session 
        });
      
      // await session.commitTransaction();
      // return Response.OK(res, {}, "Form Submitted");
    }
  }
  catch (err) {
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
    //  if (document[key] === "totalOwnRevenueArea") {
    // FRFlag = true;
    // str2 = str;
    // str2 += `${totalownOwnRevenueAreaLabel}, ${
    // document["fy_21_22_cash"] ?? ""
    //   // }`;
    // }
    document[key] = removeEscapeChars(labelObj[document[key]]);
    // if(!labelObj[document[key]]){
    //   console.log(document["indicator"])
    // }
  }
  // return { FRFlag, 
  //   // str2 
  // };
}

/**
 * It takes in a parameter called params, which is an object containing the names of the collections
 * that need to be queried. It then creates an object called output, which will contain the query for
 * each collection
 * @param params - This is the object that is passed to the function.
 * @returns The query returns the data for the fiscal ranking dashboard.
 */
function computeQuery(params) {
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
          // ulb: ObjectId("5fa24662072dab780a6f15c9"),
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
    output["FROverAllUlbData"] = [
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
                designYear: 1,
                isDraft: 1,
                population11: 1,
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
                signedCopyOfFile: 1,
                arrayOfMandatoryField: [
                  {
                    population11: "$population11.value",
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
                "$fiscalrankings.modifiedAt"
              ),
              "",
            ],
          },
          formStatus: {
            $cond: {
              if: {
                $or: [
                  {
                    $eq: [{ $ifNull: ["$fiscalrankings", ""] }, ""],
                  },
                ],
              },
              then: FRFormStatus["Not_Started"],
              else: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $eq: ["$fiscalrankings.isDraft", true],
                      },
                    ],
                  },
                  then: FRFormStatus["In_Progress"],
                  else: FRFormStatus["Under_Review_By_MoHUA"],
                },
              },
            },
          },
          comment_1: "",
          "II CONTACT INFORMATION_Comments": "",
          "III FINANCIAL INFORMATION_Comments": "",
          "IV UPLOAD FINANCIAL DOCUMENTS_Comments": "",
          "V SELF DECLARATION_Comments": "",
          population11: { $ifNull: ["$fiscalrankings.population11.value", ""] },
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
/**
 * It removes newline and comma characters from a string
 * @param entity - The entity to be cleaned up.
 * @returns A function that takes an entity as an argument and returns the entity with all newline and
 * comma characters replaced with a space.
 */
function removeEscapeChars(entity) {
  return !entity ? entity : entity.replace(/(\n|,)/gm, " ");
}
module.exports.checkUndefinedValidations = checkUndefinedValidations