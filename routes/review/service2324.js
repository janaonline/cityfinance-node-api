const Ulb = require('../../models/Ulb')
const UA = require('../../models/UA')
const State = require('../../models/State');
const CurrentStatus = require('../../models/CurrentStatus');
const IndicatorLineItems = require('../../models/indicatorLineItems');
const GtcInstallmentForm = require('../../models/GtcInstallmentForm');
const CollectionNames = require('../../util/collectionName')
const Response = require("../../service").response;
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require('../../service');
const STATUS_LIST = require('../../util/newStatusList');
const { MASTER_STATUS, MASTER_STATUS_ID, YEAR_CONSTANTS, YEAR_CONSTANTS_IDS, MASTER_FORM_STATUS, MASTER_FORM_QUESTION_STATUS, MASTER_FORM_QUESTION_STATUS_STATE, FORM_TYPE_SUBMIT_CLAIM, FORM_TYPE_NAME, INSTALLMENT_NAME, PREV_MASTER_FORM_STATUS } = require('../../util/FormNames');
const { getCurrentYear, getAccessYear, getFinancialYear } = require('../../util/masterFunctions');
const { canTakeActionOrViewOnlyMasterForm, checkUlbAccess, getLastYearUlbAccess, calculateStatus } = require('../../routes/CommonActionAPI/service')
const { createObjectFromArray, addActionKeys } = require('../CommonFormSubmissionState/service');
// const { createDynamicColumns } = require('./service')
const List = require('../../util/15thFCstatus');
let outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
const MASTERSTATUS = require('../../models/MasterStatus');
const Rating = require('../../models/Rating');
const { roundValue, convertValue, removeEscapeChars, formatDate } = require('../../util/helper')
const { years } = require('../../service/years');
const mongoose = require('mongoose');
const { canShow, decideDisplayPriority, getKeyByValue } = require("../PropertyTaxOp/service")
const PropertyTaxOp = require('../../models/PropertyTaxOp')
const { sortPosition, propertyTaxOpFormJson } = require('../PropertyTaxOp/fydynemic')
const ExcelJS = require("exceljs")
const fs = require("fs")
var path = require('path');
var request = require('request');
const Year = require('../../models/Year');
const { state } = require('../../util/userTypes');
const { dashboard } = require('../../routes/FormDashboard/service');
const { dateFormatter, convertToKolkataDate } = require('../../util/dateformatter');
const { concatenateUrls } = require('../../service/common');

const isMillionPlus = async (data) => {
  try {
    for (let element of data) {
      let ulb = await Ulb.findOne({
        "state": ObjectId(element.state),
        "isMillionPlus": "Yes"
      })
      console.log("")
      if (ulb) {
        element.isMillionPlus = true
      }
      else {
        element.isMillionPlus = false
      }
    }
    return data
  }
  catch (err) {
    console.log("error in isMillionPlus ::: ", err.message)
  }
}

module.exports.get = async (req, res) => {
  try {

    let loggedInUserRole = req.decoded.role
    let filter = {};
    const ulbColumnNames = {
      sNo: "S No.",
      ulbName: "ULB Name",
      stateName: "State Name",
      censusCode: "Census/SB Code",
      ulbType: "ULB Type",
      populationType: "Population Type",
      UA: "UA",
      formStatus: "Form Status",
      filled: "Filled Status",
      filled_audited: "Audited Filled Status",
      filled_provisional: "Provisional Filled Status",
      action: "Action"
    }
    const stateColumnNames = {
      sNo: "S No.",
      stateName: "State Name",
      formStatus: "Form Status",
      action: "Action"
    }
    //    formId --> sidemenu collection --> e.g Annual Accounts --> _id = formId
    let total;
    let design_year = req.query.design_year;
    let form = Number(req.query.formId)

    if (!design_year || !form) {
      return res.status(400).json({ success: false, message: "Missing FormId or Design Year" })
    }

    let skip = req.query.skip ? parseInt(req.query.skip) : 0
    let limit = req.query.limit ? parseInt(req.query.limit) : 10
    let csv = req.query.csv == "true"

    let formTab = await Sidemenu.findOne({ formId: form }).lean();

    if (loggedInUserRole == "STATE") {
      delete ulbColumnNames['stateName']
    }
    let title_value = formTab?.role == 'ULB' ? 'Review Grant Application' : 'Review State Forms';

    if ((loggedInUserRole == "MoHUA" || loggedInUserRole == "ADMIN") && title_value === "Review Grant Application") {
      delete ulbColumnNames['stateName']
    }

    let dbCollectionName = formTab?.dbCollectionName
    let formType = formTab?.role
    if (formType === "ULB") {
      filter['ulbName'] = req.query.ulbName != 'null' ? req.query.ulbName : ""
      filter['censusCode'] = req.query.censusCode != 'null' ? req.query.censusCode : ""
      filter['populationType'] = req.query.populationType != 'null' ? req.query.populationType : ""
      filter['state'] = req.query.stateName != 'null' ? req.query.stateName : ""
      filter['ulbType'] = req.query.ulbType != 'null' ? req.query.ulbType : ""
      filter['UA'] = req.query.UA != 'null' ? req.query.UA : ""
      filter['formData.currentFormStatus'] = req.query.status != 'null' ? Number(req.query.status) : ""
      // keys = calculateKeys(filter['status'], formType);

      // filled1 -> will be used for all the forms and Provisional of Annual accounts
      // filled2 -> only for annual accounts -> audited section
      filter['filled1'] = req.query.filled1 != 'null' ? req.query.filled1 : ""
      filter['filled2'] = req.query.filled2 != 'null' ? req.query.filled2 : ""
      if (filter["censusCode"]) {
        let code = filter["censusCode"];
        var digit = code.toString()[0];
        if (digit == "9") {
          delete filter["censusCode"];
          filter["sbCode"] = code;
        }
      }
    }

    if (formTab.collectionName == CollectionNames['annual']) {
      filter['filled_audited'] = filter['filled1']
      filter['filled_provisional'] = filter['filled2']
      delete filter['filled1']
      delete filter['filled2']
    } else {
      filter['filled'] = filter['filled1']
      delete filter['filled1']
    }
    if (formType == 'STATE') {
      filter['formData.currentFormStatus'] = req.query.status != 'null' ? Number(req.query.status) : "";
      filter['state'] = req.query.state != 'null' ? req.query.state : ""
    }

    let state = req.query.state ?? req.decoded.state
    if (req.decoded.role === "STATE") { state = req.decoded.state }

    let getQuery = req.query.getQuery == 'true'

    if (!design_year || !form) {
      return res.status(400).json({ success: false, message: "Data Missing" })
    }
    //path -> file of models
    let path = formTab.path
    let collectionName = formTab.collectionName;
    if (collectionName == CollectionNames.annual) {
      delete ulbColumnNames['filled']
    } else {
      delete ulbColumnNames.filled_audited
      delete ulbColumnNames.filled_provisional
    }
    let isFormOptional = formTab.optional
    // const model = require(`../../models/${path}`)
    let newFilter = await Service.mapFilterNew(filter);
    if (Number(req.query.status) === MASTER_STATUS['Not Started']) {// to apply not started filter
      Object.assign(newFilter, { formData: "" });
      delete newFilter['formData.currentFormStatus']
    }
    const yearData = await Year.findOne({
      _id: ObjectId(design_year)
    }, { year: 1, _id: 0 }).lean()
    let folderName = formTab?.folderName;
    let params = { collectionName, formType, isFormOptional, state, design_year, csv, skip, limit, newFilter, dbCollectionName, folderName, yearData }
    let query = computeQuery(params);

    if (getQuery) return res.json({ query: query[0] })
    // if csv - then no skip and limit, else with skip and limit

    /* CSV DOWNLOAD */
    let data = []
    if (csv) {
      await createCSV({ formType, collectionName, res, loggedInUserRole, req, query });
      // res.end();
      return;
    } else {
      data = formType == "ULB" ? Ulb.aggregate(query[0]).allowDiskUse(true) : State.aggregate(query[0]).allowDiskUse(true)
    }
    let allData = await Promise.all([data]);
    data = allData[0][0].data
    total = allData[0][0]['count']?.length ? allData[0][0]['count'][0].total : 0
    if (data?.length) {
      let approvedUlbs = await fetchApprovedUlbsData(collectionName, data);
      await setCurrentStatus(req, data, approvedUlbs, collectionName, loggedInUserRole);
    }
    if (collectionName === CollectionNames.state_gtc || collectionName === CollectionNames.state_grant_alloc) {
      // stateColumnNames['action'] = 'Action'
      data = await isMillionPlus(data)
      data.forEach((element) => {
        let { status, pending } = countStatusData(element, collectionName);
        element.formStatus = status;
        if (pending > 0 && [CollectionNames.state_gtc, CollectionNames.state_grant_alloc].includes(collectionName)) {
          element.cantakeAction = true;
        }
        else {
          element.cantakeAction = false;
        }
      });
    }
    data.forEach(el => { if (el.formData || el.formData === "") delete el.formData })
    const Query15FC = { $or: [{ type: "15thFC" }, { multi: { $in: ["15thFC"] } }] };
    const ulbFormStatus = await MASTERSTATUS.find(Query15FC, { statusId: 1, status: 1 }).lean();
    let stateFormStatus = [];
    if (ulbFormStatus.length) {
      stateFormStatus = ulbFormStatus.filter(el => {
        return ![MASTER_FORM_STATUS['RETURNED_BY_STATE'], MASTER_FORM_STATUS['UNDER_REVIEW_BY_STATE']].includes(el.statusId)
      })
    }
    if (formType == "STATE" && ['GrantClaim', ''].includes(collectionName)) {
      delete stateColumnNames.formStatus
    }

    return res.status(200).json({
      success: true,
      data: data,
      total: total,
      columnNames: formType == 'ULB' ? ulbColumnNames : stateColumnNames,
      statusList: formType == 'ULB' ? ulbFormStatus : stateFormStatus,
      ulbType: formType == 'ULB' ? List.ulbType : {},
      populationType: formType == 'ULB' ? List.populationType : {},
      title: formType == 'ULB' ? 'Review Grant Application' : 'Review State Forms'
    })
  } catch (error) {
    console.log("error", error)
    return Response.BadRequest(res, {}, error.message);
  }
}


async function createCSV(params) {
  const { formType, collectionName, res, loggedInUserRole, req, query } = params;
  try {
    let ratingList = []
    if (['ODF', 'GFC'].includes(collectionName)) {
      // let ratingIds = [...new Set(data.map(e => e?.formData?.rating))].filter(e => e !== undefined)
      ratingList = await getRating();
    }
    let data = formType == "ULB" ? await Ulb.aggregate(query[0]).allowDiskUse(true).cursor({ batchSize: 500 }).exec() : await State.aggregate(query[0]).allowDiskUse(true)
    // Set appropriate download headers
    let fixedColumns
    if (formType === 'ULB') {
      let filename = `Review_${formType}-${collectionName}.csv`;
      res.setHeader("Content-disposition", "attachment; filename=" + filename);
      res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
      fixedColumns = `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name,`;
      // dynamicColumns = createDynamicColumns(collectionName);
      res.write("\ufeff" + `${fixedColumns.toString()} ${createDynamicColumns(collectionName).toString()} \r\n`);
      // res.flushHeaders();
      let indiLineList = []
      if (!(collectionName !== CollectionNames.annual && collectionName !== CollectionNames['28SLB'])) {
        indiLineList = await indicatorLineItemList();
      }
      data.on("data", async (el) => {
        el = JSON.parse(JSON.stringify(el));
        el = concatenateUrls(el);
        el.UA = el?.UA === "null" ? "NA" : el?.UA;
        el.isUA = el?.UA === "NA" ? "No" : "Yes";
        el.censusCode = el.censusCode || "NA";
        if (!el?.formData) {
          el['formStatus'] = "Not Started";
        } else {
          el['formStatus'] = MASTER_STATUS_ID[el?.formData?.currentFormStatus]
        }
        let row = "";
        if (collectionName !== CollectionNames.annual && collectionName !== CollectionNames['28SLB']) {
          if (['ODF', 'GFC'].includes(collectionName)) setRating(el, ratingList);
          let dynamicElementData = createDynamicElements(collectionName, formType, el);
          row = `${el.stateName},${el.ulbName},${el.ulbCode},${el.censusCode},${el.populationType},${el.isUA},${el.UA},${dynamicElementData.toString()}\r\n`;
        } else {
          if (el?.formData) {
            el.formData.data = setIndicatorSequense(indiLineList, el)
          }
          let [row1, row2] = createDynamicElements(collectionName, formType, el);
          const rowOne = `${el?.stateName},${el?.ulbName},${el?.ulbCode},${el?.censusCode},${el?.populationType},${el?.isUA},${el?.UA},${row1?.toString()}\r\n`;
          const rowTwo = `${el?.stateName},${el?.ulbName},${el?.ulbCode},${el?.censusCode},${el?.populationType},${el?.isUA},${el?.UA},${row2?.toString()}\r\n`;
          row = rowOne + rowTwo
        }
        res.write("\ufeff" + row);
      })
      data.on("end", (pl) => {
        res.end();
      });
    } else if (formType === "STATE") {
      if (collectionName == "waterrejenuvationrecyclings") {
        await waterSenitationXlsDownload(data, res, loggedInUserRole); // xls
      } else if (collectionName == 'ActionPlan') {
        await actionPlanXlsDownload(data, res, loggedInUserRole)   // xls
      } else {
        let mainArrData = stateArrData = []
        if (collectionName == CollectionNames.state_grant_claim) {
          stateArrData = data;
          let states = stateArrData.map(e => e._id?.toString());
          for (let key in FORM_TYPE_SUBMIT_CLAIM) {
            const { installment, formType } = getFormTypeInstallment(FORM_TYPE_SUBMIT_CLAIM[key]);
            Object.assign(req.query, {
              formType: formType,
              states: states,
              installment: installment,
              flagFunction: true
            });
            let installmentData = await dashboard(req, res);
            mainArrData.push({ [`${req?.query?.installment}_${req?.query?.formType}`]: installmentData });
          }
        } else {
          mainArrData = data;
        }
        let filename = `Review_${formType}-${collectionName}.csv`;
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
        if (collectionName != CollectionNames.state_grant_claim) {
          dynamicColumns = createDynamicColumns(collectionName);
          res.write("\ufeff" + `${dynamicColumns.toString()} \r\n`);
        }
        // let uaFormData = await UA.find({}).lean();
        if (mainArrData?.length) {
          if (collectionName == CollectionNames.state_grant_claim) {
            let output = extractDataForCSV(mainArrData, req);
            await writeSubmitClaimCSV(output, res);
          } else {
            for (let el of mainArrData) {
              if (!el?.formData) {
                el['formStatus'] = "Not Started";
              } else {
                el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]
              }
              if (collectionName == "GTC") {
                let gtcData = await gtcInstallmentForms([...new Set(mainArrData.map(e => e._id))]);
                let GTC = gtcData?.length ? gtcData?.filter(e => (e.state.toString() == el._id.toString() && e.gtcForm.toString() == el?.formData?._id?.toString() && e.installment == el.formData.installment)) : []
                el['formData']['installment_form'] = GTC;
                el = JSON.parse(JSON.stringify(el));
                el = concatenateUrls(el);
                gtcStateFormCSVFormat(el, res);
              } else if (collectionName == 'GrantAllocation') {
                el = JSON.parse(JSON.stringify(el));
                el = concatenateUrls(el);
                await grantAllCsvDownload(el, res);
              }
            }
          }
        } else {
          res.write("\ufeff" + "");
        }
        res.end()
      }
    }
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}
const gtcInstallmentForms = (stateId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await GtcInstallmentForm.find({ "state": { $in: stateId } }).populate("transferGrantdetail").lean();
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

async function grantAllCsvDownload(el, res) {
  let { stateName, stateCode, formData } = el;
  let row = [stateName, stateCode];
  if (formData && formData.length && (formData[0] !== "")) {
    for (let pf of formData) {
      let currentStatus = await CurrentStatus.findOne({ recordId: ObjectId(pf?._id) });
      currentStatus = JSON.parse(JSON.stringify(currentStatus));
      currentStatus = concatenateUrls(currentStatus);
      let MohuaformStatus = MASTER_STATUS_ID[currentStatus?.status];
      let mohuaStatusComment = [MASTER_STATUS_ID[pf?.currentFormStatus]];
      if (['Returned By MoHUA', 'Submission Acknowledged By MoHUA'].includes(MASTER_STATUS_ID[pf?.currentFormStatus])) {
        mohuaStatusComment.push(MohuaformStatus, currentStatus?.rejectReason, currentStatus?.responseFile?.url);
      }
      let tempArr = [pf?.type, pf?.installment, pf?.url];
      let str = [...row, ...tempArr, ...mohuaStatusComment].join(',') + "\r\n";
      res.write("\ufeff" + str);
    }
  } else {
    let str = [...row].join(',') + "\r\n";
    res.write("\ufeff" + str);
  }
}

/**
 * The function `writeSubmitClaimCSV` writes the output data in CSV format, including state name, state
 * code, and submitted values for each item. 
 */
async function writeSubmitClaimCSV(output, res) {
  try {
    Object.entries(output).forEach(([key, items], index) => {
      items = JSON.parse(JSON.stringify(items));
      items = concatenateUrls(items);
      let stateObj = {};
      if (stateArrData.length == 1) {
        stateObj = stateArrData[0]
      } else {
        stateObj = stateArrData.find((state) => state._id == Object.keys(output)[index]);
      }
      const { stateName, stateCode } = stateObj
      let row = 'State Name,State Code,';
      let row1 = `${stateName},${stateCode},`;
      if (index === 0) {
        row += items.map(item => item.hideFormName ? `${item.headerLabel}` : `${item.headerLabel}-${item.formName == "Property Tax Operationalisation" ? "Details of   Property Tax & User Charges (%)" : item.formName + " (%)"} `).join(',');
        row1 += items.map(item => item.submittedValue).join(',');
        res.write(`\ufeff${row} \r\n\ufeff${row1} \r\n`);
      } else {
        row1 += items.map(item => item.submittedValue).join(',');
        res.write(`\ufeff${row1} \r\n`);
      }
    });
  } catch (error) {
    console.log(error)
    throw { message: `writeSubmitClaimCSV:: ${error.message} ` }
  }
}

/**
 * The function `extractDataForCSV` takes in an array of data and a request object, and returns an
 * object with the extracted data for CSV formatting.
 */
function extractDataForCSV(mainArrData, req) {
  try {
    let output = {};
    mainArrData.forEach(item => {
      const [installmentKey, obj] = Object.entries(item)[0];
      const { installment, formType } = getFormTypeInstallment(installmentKey);
      const headerLabel = `${FORM_TYPE_NAME[formType]}: ${INSTALLMENT_NAME[installment]} (FY ${YEAR_CONSTANTS_IDS[req.query.design_year]})`;

      Object.entries(obj).forEach(([key, value]) => {
        const grantStatus = { headerLabel: "Claim Grants status", submittedValue: "", hideFormName: true };// temp added to show blank grant status
        const resArray = Object.values(value).flat(1).map(item => ({ ...item, headerLabel }));
        resArray.push(grantStatus); // temp added to show blank grant status
        output[key] = output[key] ? [...output[key], ...resArray] : resArray;
      });
    });
    return output;
  } catch (error) {
    console.log("error", error)
    throw { message: `extractDataForCSV:: ${error.message} ` }
  }
}

// async function actionPlanCSVDownload(obj, res, role, uaFormData) {
//   let rowsArr = [obj?.stateName || "", obj?.stateCode || "", "", obj?.formStatus || ""];
//   if (obj?.formData) {
//     const { uaData } = obj?.formData
//     let uaStateObj = uaFormData?.filter(e => e.state.toString() == obj?.state.toString());
//     // console.log("uaStateObj",uaStateObj);process.exit()
//     uaStateObj = createObjectFromArray(uaStateObj);
//     addActionKeys(obj?.formData, uaStateObj, obj?.MohuaStatus, role);
//     for (const ua of uaData) {
//       let commentArr = [];
//       // console.log("obj?.formStatus",ua)
//       if (['Returned By MoHUA', 'Submission Acknowledged By MoHUA'].includes(obj?.formStatus)) {
//         commentArr.push(ua?.status || "", ua?.rejectReason || "", ua?.responseFile?.url || "");
//       }
//       let UAName = uaFormData?.length ? uaFormData.find(e => e?._id?.toString() == ua?.ua?.toString()) : null
//       rowsArr[2] = UAName?.name
//       let projectExecute = ua?.projectExecute;
//       let sourceFund = ua?.sourceFund;
//       let yearOutlay = ua?.yearOutlay;
//       if (projectExecute?.length) {
//         for (const el of projectExecute) {
//           let sourceObj = sourceFund?.find(e => e?.Project_Code == el?.Project_Code);
//           let yearOutlayObj = yearOutlay?.find(e => e?.Project_Code == el?.Project_Code);
//           let mainArr = [
//             {
//               "data": el,
//               "sortKey": ["Project_Code", "Project_Name", "Details", "Cost", "Executing_Agency", "Parastatal_Agency", "Sector", "Type", "Estimated_Outcome"]
//             },
//             {
//               "data": sourceObj,
//               "sortKey": ["Project_Code", "Project_Name", "Cost", "XV_FC", "Other", "Total", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
//             },
//             {
//               "data": yearOutlayObj,
//               "sortKey": ["Project_Code", "Project_Name", "Cost", "Funding", "Amount", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
//             },
//           ]
//           let arr = []
//           for (const singleObj of mainArr) {
//             const { sortKey, data } = singleObj;
//             for (let index = 0; index < sortKey.length; index++) {
//               const key = sortKey[index];
//               if (data[key] && typeof data[key] !== 'number') {
//                 data[key] = data[key].split(',').join(' ')
//               }
//               arr.push(data[key])
//             }
//           }
//           let str = [...rowsArr, ...arr, ...commentArr].join(",") + "\r\n";
//           res.write("\ufeff" + str);
//         }
//       }
//     }
//   } else {
//     let str = [...rowsArr].join(",") + "\r\n";
//     res.write("\ufeff" + str);
//   }
// }

function getFormTypeInstallment(str) {
  const typeInstallent = str.indexOf('_');
  if (typeInstallent !== -1) {
    const installment = str.substring(0, typeInstallent);
    const formType = str.substring(typeInstallent + 1);
    return { installment, formType };
  } else {
    return null;
  }
}

/* GTC Manupulate data */
function gtcStateFormCSVFormat(obj, res) {
  const { stateName, stateCode, formData, formStatus } = obj;
  const { design_year, type, installment, installment_form } = formData;
  let row = [stateName, stateCode, formStatus, design_year?.year, "", type, installment];
  if (installment_form?.length) {
    let installment = installment_form;
    let mainArr = [];
    let sortKey = ["totalMpc", "totalNmpc", "totalElectedMpc", "totalElectedNmpc", "recAmount", "receiptDate", "transferGrantdetail"]
    let transSortKey = ["transAmount", "transDate", "transDelay", "daysDelay", "interest", "intTransfer", "recomAvail", "sfcNotificationCopy", "grantDistribute", "projectUndtkn", "propertyTaxNotifCopy", "accountLinked", "file", "rejectReason_mohua", "responseFile_mohua", "currentFormStatus"]
    for (const el of installment) {
      row[4] = el?.ulbType;
      for (const key of sortKey) {
        if (key == "transferGrantdetail") {
          let transferGrantdetail = el[key];
          if (transferGrantdetail?.length) {
            for (const tfgObj of transferGrantdetail) {
              let tArr = detailsGrantTransferredManipulate({ transSortKey, tfgObj, el, formData })
              let str = [...row, ...mainArr, ...tArr].join(',') + "\r\n"
              res.write("\ufeff" + str);
            }
          } else {
            let tArr = detailsGrantTransferredManipulate({ transSortKey, tfgObj: null, el, formData })
            let str = [...row, ...mainArr, ...tArr].join(',') + "\r\n"
            res.write("\ufeff" + str);
          }

        } else {
          key !== "receiptDate" ? mainArr.push(el[key]) : mainArr.push(formatDate(el[key]))
        }
      }
    }
  } else {
    res.write("\ufeff" + [...row].join(',') + "\r\n");
  }
}

function detailsGrantTransferredManipulate(params) {
  const { transSortKey, tfgObj, el, formData } = params;
  const tArr = [];
  for (const tKey of transSortKey) {
    if (["recomAvail", "grantDistribute", "sfcNotificationCopy", "projectUndtkn", "propertyTaxNotifCopy", "accountLinked"].includes(tKey)) {
      tArr.push(getToValueInObj(el[tKey]));
    } else if (["file", "rejectReason_mohua", "responseFile_mohua", "currentFormStatus"].includes(tKey)) {
      let fData = getToValueInObj(formData[tKey]);
      if (tKey === "currentFormStatus") {
        tArr.push(MASTER_FORM_QUESTION_STATUS_STATE[formData[tKey]] || "");
      } else {
        tArr.push(fData);
      }
    } else if (["transDate"].includes(tKey)) {
      tArr.push(tfgObj && tfgObj[tKey] ? formatDate(tfgObj[tKey]) : "");
    } else {
      tArr.push(getToValueInObj(tfgObj[tKey]));
    }
  }
  return tArr;
}

function getToValueInObj(value) {
  if (value && Object.keys(value).length !== 0 && value.constructor === Object) {
    return value?.url || ""
  } else {
    return value || ""
  }
}


const sortKeysWaterSenitation = (key) => {
  switch (key) {
    case 'waterBodies':
      return [
        "name", "nameOfBody", "area", "lat", "long", "bod", "bod_expected", "cod", "cod_expected", "do", "do_expected",
        "tds", "tds_expected", "turbidity", "turbidity_expected", "details", "dprPreparation", "dprCompletion", "workCompletion"
      ]
    case "serviceLevelIndicators":
      return ["name", "component", "indicator", "existing", "after", "cost", "dprPreparation", "dprCompletion", "workCompletion"]
    case "reuseWater":
      return ["name", "lat", "long", "stp", "treatmentPlant", "targetCust", "dprPreparation", "dprCompletion", "workCompletion"]
    case "projectExecute":
      return ["Project_Code", "Project_Name", "Details", "Cost", "Executing_Agency", "Parastatal_Agency", "Sector", "Type", "Estimated_Outcome"]
    case "sourceFund":
      return ["Project_Code", "Project_Name", "Cost", "XV_FC", "Other", "Total", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    case "yearOutlay":
      return ["Project_Code", "Project_Name", "Cost", "Funding", "Amount", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26"]
    default:
      return []
  }
}

const actionPlanXlsDownload = async (data, res, role) => {
  try {
    const tempFilePath = "uploads/excel";
    if (!fs.existsSync(tempFilePath)) {
      fs.mkdirSync(tempFilePath);
    }
    const filename = `${Date.now()}__actionPlan.xlsx`;
    const workbook = new ExcelJS.Workbook();

    const projectExecute = workbook.addWorksheet('Projects to be Executed with 15th FC Grants');
    const sourceFund = workbook.addWorksheet('Project List and Source of Funds (Annual In INR Lakhs)');
    const yearOutlay = workbook.addWorksheet('Year wise Outlay for 15th FC Grants(Annual In INR Lakhs)');

    let uaFormData = await UA.find({}).lean();
    projectExecute.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Name", "Project_Details", "Project_Cost", "Executing_Agency", "Parastatal_Agency", "Sector", "Project_Type", "Estimated_Outcome", "Review Status", "MoHUA Comments", "Review Documents"
    ]);
    sourceFund.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Code", "XV_FC", "Other", "Total", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "Review Status", "MoHUA Comments", "Review Documents"
    ]);
    yearOutlay.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project_Code", "Project_Name", "Project_Cost", "Funding", "Amount", "2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "Review Status", "MoHUA Comments", "Review Documents"
    ]);

    let counter = { projectExecute: 2, sourceFund: 2, yearOutlay: 2 } // counter
    if (data?.length) {
      for (let pf of data) {
        pf = JSON.parse(JSON.stringify(pf));
        pf = concatenateUrls(pf);
        if (!pf?.formData) {
          pf['formStatus'] = "Not Started";
        } else {
          pf['formStatus'] = MASTER_STATUS_ID[pf?.formData?.currentFormStatus]
        }
        let rowsArr = [pf?.stateName, pf?.stateCode, pf?.formStatus];
        let sortKeys = { projectExecute, sourceFund, yearOutlay };
        if (pf?.formData) {
          let { uaData } = pf?.formData;
          let uaCode = await UA.find({ state: ObjectId(pf?.state) }, { UACode: 1 }).lean();
          uaCode = createObjectFromArray(uaCode);
          addActionKeys(pf?.formData, uaCode, pf?.MohuaStatus, role);
          for (const ua of uaData) {
            let commentArr = [];
            if (['Returned By MoHUA', 'Submission Acknowledged By MoHUA'].includes(pf?.formStatus)) {
              commentArr.push(ua?.status, ua?.rejectReason, ua?.responseFile ? ua?.responseFile.url : "");
            }
            let UAName = uaFormData?.length ? uaFormData.find(e => e?._id?.toString() == ua?.ua?.toString()) : null
            rowsArr[3] = UAName?.name
            for (const key in sortKeys) {
              let projData = ua[key];
              let keysArr = sortKeysWaterSenitation(key)
              for (const proj of projData) {
                let projArr = [];
                for (const k of keysArr) {
                  if (proj[k] && typeof proj[k] !== 'number') {
                    proj[k] = proj[k].split(',').join(' ')
                  }
                  projArr.push(proj[k])
                }
                sortKeys[key].addRow([...rowsArr, ...projArr, ...commentArr]);
                sortKeys[key].getRow(counter[key])
                counter[key]++
              }
            }
          }
        } else {
          for (const key in sortKeys) {
            sortKeys[key].addRow([...rowsArr]);
            sortKeys[key].getRow(counter[key])
            counter[key]++
          }
        }
      }
    }
    // Create a write stream
    const writeStream = fs.createWriteStream(`${tempFilePath}/${filename}`);
    // Write the stream to the file
    await workbook.xlsx.write(writeStream);
    // Set response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=" + `${filename}`);
    // Write the stream to the response object
    fs.unlink(`${tempFilePath}/${filename}`, (err) => console.log(err))
    await workbook.xlsx.write(res);
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}

const waterSenitationXlsDownload = async (data, res, role) => {
  try {
    const tempFilePath = "uploads/excel";
    if (!fs.existsSync(tempFilePath)) {
      fs.mkdirSync(tempFilePath);
    }
    const filename = `${Date.now()}__waterSupplyAndSanitation.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const waterBodies = workbook.addWorksheet('waterBodies');
    const reuseWater = workbook.addWorksheet('reuseWater');
    const serviceLevelIndicators = workbook.addWorksheet('serviceLevelIndicators');
    let uaFormData = await UA.find({}).lean();
    let indicatorLineItems = await IndicatorLineItems.find({ "type": "water supply" }).lean();
    waterBodies.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name", "Name of water body", "Area",
      "Latitude", "Longitude", "BOD in mg/L (Current)", "BOD in mg/L (Expected)",
      "COD in mg/L (Current)", "COD in mg/L (Expected)", "DO in mg/L (Current)", "DO in mg/L(Expected)", "TDS in mg/L (Current)",
      "TDS in mg/L(Expected)", "Turbidity in  NTU (Current)", "Turbidity in  NTU(Expected)", "Project Details", "Preparation of  DPR",
      "Completion  of tendering process", "%  of  work completion", "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);
    reuseWater.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name",
      "Latitude", "Longitude", "Proposed capacity of STP(MLD)", "Proposed water quantity  to be reused(MLD)",
      "Target customers/ consumer for  reuse of  water", "Preparation of  DPR", "Completion of tendering process", "%  of  work completion",
      "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);
    serviceLevelIndicators.addRow([
      "State Name", "State Code", "Form Status", "UA Name", "Project Name", "Physical  Components",
      "Indicator", "Existing  (As- is)", "After  (To-be)", "Estimated  Cost (Amount  in  INR Lakhs)",
      "Preparation of  DPR", "Completion of tendering process", "%  of  work completion",
      "MoHUA Review For UA Wise Status", "MoHUA Review Comments", "MoHUA Review Files"
    ]);

    let counter = { waterBodies: 2, serviceLevelIndicators: 2, reuseWater: 2 } // counter
    if (data?.length) {
      for (let pf of data) {
        pf = JSON.parse(JSON.stringify(pf));
        pf = concatenateUrls(pf);
        if (!pf?.formData) {
          pf['formStatus'] = "Not Started";
        } else {
          pf['formStatus'] = MASTER_STATUS_ID[pf?.formData?.currentFormStatus]
        }
        let rowsArr = [pf?.stateName, pf?.stateCode, pf?.formStatus];
        let sortKeys = { waterBodies, reuseWater, serviceLevelIndicators };
        if (pf?.formData) {
          let { uaData } = pf?.formData;
          let uaCode = await UA.find({ state: ObjectId(pf?.state) }, { UACode: 1 }).lean();
          uaCode = createObjectFromArray(uaCode);
          addActionKeys(pf?.formData, uaCode, pf?.MohuaStatus, role);
          for (const ua of uaData) {
            let commentArr = [];
            if (['Returned By MoHUA', 'Submission Acknowledged By MoHUA'].includes(pf?.formStatus)) {
              commentArr.push(ua?.status, ua?.rejectReason, ua?.responseFile ? ua?.responseFile.url : "");
            }
            let UAName = uaFormData?.length ? uaFormData.find(e => e?._id?.toString() == ua?.ua?.toString()) : null
            rowsArr[3] = UAName?.name
            for (const key in sortKeys) {
              let projData = ua[key];
              let keysArr = sortKeysWaterSenitation(key)
              for (const proj of projData) {
                let projArr = [];
                for (const k of keysArr) {
                  if (k == "indicator") {
                    let indiData = indicatorLineItems?.length ? indicatorLineItems.find(e => e?.lineItemId?.toString() == proj[k]) : null
                    let indicatorName = indiData ? indiData?.name : ""
                    projArr.push(indicatorName)
                  } else {
                    projArr.push(proj[k])
                  }
                }
                sortKeys[key].addRow([...rowsArr, ...projArr, ...commentArr]);
                sortKeys[key].getRow(counter[key])
                counter[key]++
              }
            }
          }
        } else {
          for (const key in sortKeys) {
            sortKeys[key].addRow([...rowsArr]);
            sortKeys[key].getRow(counter[key])
            counter[key]++
          }
        }
      }
    }

    // Create a write stream
    const writeStream = fs.createWriteStream(`${tempFilePath}/${filename}`);
    // Write the stream to the file
    await workbook.xlsx.write(writeStream);
    // Set response headers for downloading the file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=" + `${filename}`);
    // Write the stream to the response object
    fs.unlink(`${tempFilePath}/${filename}`, (err) => console.log(err))
    await workbook.xlsx.write(res);
  } catch (error) {
    console.log("CSV Download Error", error);
    return Response.BadRequest(res, {}, error.message);
  }
}

function countStatusData(element, collectionName) {
  let total = 0;
  let notStarted = 0;
  let status = "";
  let arr = [CollectionNames.state_gtc, CollectionNames.state_grant_alloc].includes(collectionName) ? element.status : element.draft
  let totalGtcForms = element.isMillionPlus ? 5 : 4
  if (collectionName === CollectionNames.state_gtc) {
    total = totalGtcForms
    notStarted = totalGtcForms;
  } else if (collectionName === CollectionNames.state_grant_alloc) {
    total = 5;
    notStarted = 5;
  }
  let pending = 0, rejected = 0, approved = 0;
  if (arr?.length <= 0) {
    status = collectionName === CollectionNames.state_gtc ? `${notStarted} Not Started` : `${notStarted} Not Submitted`;
    return { status, pending };
  } else {
    if ([CollectionNames.state_gtc, CollectionNames.state_grant_alloc].includes(collectionName)) {
      for (let i = 0; i < arr?.length; i++) {
        if (arr[i] === MASTER_FORM_STATUS["UNDER_REVIEW_BY_MoHUA"]) {
          pending++;
        } else if (arr[i] === MASTER_FORM_STATUS['SUBMISSION_ACKNOWLEDGED_BY_MoHUA']) {
          approved++;
        } else if (arr[i] === MASTER_FORM_STATUS['RETURNED_BY_MoHUA']) {
          rejected++;
        }
      }
      notStarted = total - pending - approved - rejected;
      status = ` ${approved} Approved, ${rejected} Rejected, ${pending} Pending`;
      if (notStarted > 0) {
        status = `${status}, ${notStarted} Not Started`;
      }
      return { status, pending };
    }
    // else if (collectionName === CollectionNames.state_grant_alloc) {
    //   for (let i = 0; i < arr.length; i++) {
    //     if (arr[i] === false) {
    //       notStarted--;
    //     }
    //   }
    //   status = `${total - notStarted} submitted`
    //   return { status, pending };
    // }
  }
}

async function fetchApprovedUlbsData(collectionName, data) {
  try {
    let ulbsArray = [], approvedUlbs = [];
    let forms2223;
    let modelName;
    let designYearField = "design_year";
    if (collectionName == CollectionNames.dur) {
      designYearField = "designYear";
    }
    if (collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) {
      modelName = collectionName === CollectionNames.dur ? List.ModelNames['dur'] : List.ModelNames['twentyEightSlbs']
      ulbsArray = data.map((el) => { return el.ulbId });

      if (Array.isArray(ulbsArray) && ulbsArray.length) {
        forms2223 = await mongoose.model(modelName).find(
          {
            ulb: { $in: ulbsArray },
            [designYearField]: YEAR_CONSTANTS['22_23']
          },
          { history: 0, steps: 0 }
        ).lean();
      }
      approvedUlbs = getUlbsApprovedByMoHUA(forms2223)
    }
    return approvedUlbs;
  } catch (error) {
    throw (`forms2223:: ${error.message}`)
  }
}

const sequentialReview = `Cannot review since last year form is not approved by MoHUA.`
const setCurrentStatus = (req, data, approvedUlbs, collectionName, loggedInUserRole) => {
  data.forEach(el => {
    el['info'] = '';
    el['prevYearStatus'] = ''
    el['prevYearStatusId'] = ''
    if (!el.formData) {
      el['formStatus'] = "Not Started";
      el['cantakeAction'] = false;
    } else {
      el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]
      let params = { status: el.formData.currentFormStatus, userRole: loggedInUserRole }
      el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnlyMasterForm(params)
      if (collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) {
        //   el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnlyMasterForm(params);
        //   if (!(approvedUlbs.find(ulb => ulb.toString() === el.ulbId.toString())) && loggedInUserRole === "MoHUA") {
        //     el['cantakeAction'] = false;
        //     el['formData']['currentFormStatus'] === MASTER_STATUS['Under Review By MoHUA'] ? el['info'] = sequentialReview : ""
        //   }
        el['prevYearStatus'] = approvedUlbs[el._id] ?? STATUS_LIST['Not_Started']
        const previousStatus = el['prevYearStatus']?.toUpperCase().split(' ').join('_')
        el['prevYearStatusId'] = PREV_MASTER_FORM_STATUS[previousStatus] ?? PREV_MASTER_FORM_STATUS['NOT_STARTED']
      }
      // else {
      // let params = { status: el.formData.currentFormStatus, userRole: loggedInUserRole }
      // el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnlyMasterForm(params);
      // el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]
      // }
    }
  })
  return data;
}

const setRating = (el, ratingList) => {
  if (ratingList.length && el?.formData) {
    let rating = ratingList.find(e => e?._id.toString() == el?.formData?.rating?.toString());
    el['formData']['rating'] = rating ? rating : {
      "name": "",
      "marks": ""
    };
  }
  return el
}

/**
 * This is an asynchronous function that retrieves the name and marks of a rating based on its ID.
 * @param ratingId - The `ratingId` parameter is an array of MongoDB ObjectIds used to query the
 * database for ratings with matching `_id` values.
 * @returns The `getRating` function is returning a Promise that resolves to an array of objects
 * containing the `name` and `marks` properties of the ratings with the specified `_id` values. The
 * `_id` values are passed as an argument to the function.
 */
const getRating = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      let d = await Rating.find({}, { "name": 1, "marks": 1 }).lean();
      resolve(d)
    } catch (error) {
      reject(error)
    }
  })
}

/// Master Form Indicator LineItmem
const indicatorLineItemList = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await IndicatorLineItems.find({ "isActive": true }, { "sequence": 1, "type": 1, "name": 1 }).sort({ "sequence": 1 }).lean();
      resolve(data)
    } catch (error) {
      console.log("error", error)
      reject(error)
    }
  })
}


const setIndicatorSequense = (indicatorList, el) => {
  let mainArr = []
  if (indicatorList?.length) {
    let keysList = ['water supply', 'sanitation', 'solid waste', 'storm water'];
    for (let index = 0; index < keysList.length; index++) {
      let fData = indicatorList?.filter(e => e?.type == keysList[index]);
      for (let kf of fData) {
        let sequenceData = el?.formData?.data?.find(e => e.indicatorLineItem.toString() == kf._id.toString());
        if (sequenceData) mainArr.push(sequenceData)
      }
    }
  }
  return mainArr;
}

/**
 * This function returns an array of ULBs (Urban Local Bodies) that have been approved by the Ministry
 * of Housing and Urban Affairs (MoHUA) based on certain conditions.
 * @param forms - an array of objects representing forms, where each object has the following
 * properties:
 * @returns an array of ULBs (Urban Local Bodies) that have been approved by the Ministry of Housing
 * and Urban Affairs (MoHUA) based on the input parameter `forms`.
 */
function getUlbsApprovedByMoHUA(forms) {
  try {
    let ulbArray = {};
    for (let form of forms) {
      // if (form.actionTakenByRole === "MoHUA" && !form.isDraft && form.status === "APPROVED") {
      ulbArray[form.ulb] = calculateStatus(form.status, form.actionTakenByRole, form.isDraft, "ULB");
      // }
    }
    return ulbArray;
  } catch (error) {
    throw (`getUlbsApprovedByMoHUA:: ${error.message}`);
  }
}

/**
 * @param params - The `params` object contains various parameters used to construct a MongoDB query
 * pipeline. These parameters include `collectionName` (the name of the MongoDB collection to query),
 * `formType` (the user role for which the query is being constructed), `isFormOptional` (a boolean
 * indicating whether the
 */
const computeQuery = (params) => {
  const { collectionName: formName, formType: userRole, isFormOptional, state, design_year, csv, skip, limit, newFilter: filter, dbCollectionName, folderName, yearData } = params
  let filledQueryExpression = {};
  let filledProvisionalExpression = {}, filledAuditedExpression = {};
  if (isFormOptional) {
    // if form is optional check if the deciding condition is true or false
    filledQueryExpression = getFilledQueryExpression(formName, filledQueryExpression, design_year);
    if (formName === CollectionNames.annual) {
      ({ filledProvisionalExpression, filledAuditedExpression } = getFilledQueryExpression(formName, filledQueryExpression, design_year));
    }
  }
  let dY = "$design_year";
  let designYearField = "design_year"
  if (formName == CollectionNames.dur) {
    dY = "$designYear";
    designYearField = "designYear";
  }
  let condition = {
    isActive: true
  };
  if (state && state !== 'null') {
    condition['state'] = ObjectId(state)
  }
  const decadePrefixtoSlice = 2;
  const accessYear = checkUlbAccess(yearData.year, decadePrefixtoSlice);
  condition[accessYear] = true;
  if ([CollectionNames.pfms].includes(formName)) {
    let lastYearAccess = getLastYearUlbAccess(yearData.year);
    condition[lastYearAccess] = false;
  }
  let pipeLine = [
    {
      $match: {
        $expr: {
          $and: [
            {
              $eq: [dY, "$$firstUser"],
            },
            {
              $eq: ["$ulb", "$$secondUser"],
            },
          ],
        },
      },
    },
    {
      $lookup: {
        from: "years",
        localField: designYearField,
        foreignField: "_id",
        as: "design_year",
      },
    },
    {
      $unwind: "$design_year",
    }
  ]
  if (csv) {
    pipeLine.push({
      "$lookup": {
        "from": "currentstatuses",
        "localField": "_id",
        "foreignField": "recordId",
        "as": "currentstatuse"
      }
    })
  }

  switch (userRole) {
    case "ULB":
      let query = [
        { $match: condition },
        {
          $lookup: {

            from: "states",
            localField: "state",
            foreignField: "_id",
            as: "state"
          }
        }, { $unwind: "$state" },
        {
          $match: { "state.accessToXVFC": true }
        }
      ]
      let query_2 = [
        {
          $lookup: {
            from: dbCollectionName,
            let: {
              firstUser: ObjectId(design_year),
              secondUser: "$_id",
            },
            pipeline: pipeLine,
            as: dbCollectionName,
          },
        },
        {
          $unwind: {
            path: `$${dbCollectionName}`,
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "uas",
            localField: "UA",
            foreignField: "_id",
            as: "UA",
          },
        },
        {
          $unwind: {
            path: "$UA",
            preserveNullAndEmptyArrays: true,
          },
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
          $project: {
            ulbName: "$name",
            ulbId: "$_id",
            ulbCode: "$code",
            access: `$${accessYear}`,
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
            UA: {
              $cond: {
                if: { $eq: ["$isUA", "Yes"] },
                then: "$UA.name",
                else: "NA",
              },
            },
            UA_id: {
              $cond: {
                if: { $eq: ["$isUA", "Yes"] },
                then: "$UA._id",
                else: "NA",
              },
            },
            ulbType: "$ulbType.name",
            ulbType_id: "$ulbType._id",
            population: "$population",
            state_id: "$state._id",
            stateName: "$state.name",
            populationType: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Million Plus",
                else: "Non Million",
              },
            },
            formData: { $ifNull: [`$${dbCollectionName}`, ""] },
          },
        },
        {
          $project: {
            ulbName: 1,
            ulbId: 1,
            ulbCode: 1,
            access: 1,
            censusCode: 1,
            UA: 1,
            UA_id: 1,
            ulbType: 1,
            ulbType_id: 1,
            population: 1,
            state_id: 1,
            stateName: 1,
            populationType: 1,
            formData: 1,
            filled: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$formData", ""] },
                    {
                      "$eq": [
                        "$formData.currentFormStatus",
                        1
                      ]
                    },
                    {
                      "$eq": [
                        "$formData.currentFormStatus",
                        2
                      ]
                    }
                  ],
                },
                then: "No",
                else: isFormOptional ? filledQueryExpression : "Yes",
              },
            },
          },
        },
        {
          $sort: { "formData.modifiedAt": -1 },
        },
      ];
      query.push(...query_2)

      if (formName == CollectionNames.annual) {
        delete query[query.length - 2]['$project']['filled']
        Object.assign(query[query.length - 2]['$project'], { filled_provisional: filledProvisionalExpression, filled_audited: filledAuditedExpression })
      }

      let filterApplied = Object.keys(filter).length > 0

      if (filterApplied) {
        if (filter.sbCode) { delete Object.assign(filter, { ["censusCode"]: filter["sbCode"] })["sbCode"]; }
        query.push({ $match: filter })
      }
      let limitSkip = !csv ? [{ "$skip": skip }, { $limit: limit }] : [{ $match: {} }]
      let paginator = [
        { $addFields: { "dummy": [] } },
        {
          $unwind: {
            path: "$dummy",
            preserveNullAndEmptyArrays: true
          }
        }
      ]
      if (!csv) {
        query.push(...paginator)
        query.push({
          $facet: {
            data: limitSkip,
            count: [{ $count: "total" }]
          }
        })
      }
      return [query]
    case "STATE":
      let query_s = [
        {
          $match: {
            accessToXVFC: true,
          },
        },
      ];
      if (dbCollectionName) {
        if ([List.CollectionNames['waterRej'], List.CollectionNames['actionPlan']].includes(dbCollectionName)) {
          query_s.push(...[
            {
              "$lookup": {
                "from": "uas",
                "localField": "_id",
                "foreignField": "state",
                "as": "uas"
              }
            },
            {
              "$match": {
                "uas": { "$ne": [] }
              }
            }
          ])
        }
        query_s.push(...[
          {
            $lookup: {
              from: dbCollectionName,
              let: {
                firstUser: ObjectId(design_year),
                secondUser: "$_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ["$design_year", "$$firstUser"],
                        },
                        {
                          $eq: ["$state", "$$secondUser"],
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
                  $unwind: "$design_year",
                },
              ],
              as: dbCollectionName,
            },
          },
          {
            $unwind: {
              path: `$${dbCollectionName}`,
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "currentstatuses",
              localField: `${dbCollectionName}._id`,
              foreignField: "recordId",
              as: "currentstatus"
            }
          },
          {
            $project: {
              state: "$_id",
              stateName: "$name",
              stateCode: "$code",
              regionalName: 1,
              formData: { $ifNull: [`$${dbCollectionName}`, ""] },
              "MohuaStatus": {
                "$filter": {
                  "input": "$currentstatus",
                  "as": "cs",
                  "cond": {
                    "$eq": [
                      "$$cs.actionTakenByRole",
                      "MoHUA"
                    ]
                  }
                }
              },
              filled: {
                $cond: { if: { $or: [{ $eq: ["$formData", ""] }, { $eq: ["$formData.isDraft", true] }] }, then: "No", else: isFormOptional ? filledQueryExpression : "Yes" }
              }
            },
          },
          { $sort: csv ? sortingData(formName) : { formData: -1 } }
        ])

        query_s = createDynamicQuery(formName, query_s, userRole, csv);
        if (folderName === List['FolderName']['IndicatorForWaterSupply']) {
          let startIndex = query_s.findIndex((el) => {
            return el.hasOwnProperty("$lookup");
          })
          /* Splicing the query_s string starting at the startIndex. */
          query_s.splice(startIndex);
          query_s.push({
            $project: {
              state: "$_id",
              stateName: "$name",
              stateCode: "$code",
              regionalName: 1,
              filled: "Not Applicable"
            },
          })
        }
      } else {
        query_s.push({
          $project: {
            state: "$_id",
            stateName: "$name",
            stateCode: "$code",
            regionalName: 1,
            filled: "Not Applicable"
          },
        })
      }

      /* Checking if the user role is STATE and the folder name is IndicatorForWaterSupply. */
      let filterApplied_s = Object.keys(filter).length > 0
      if (filterApplied_s) {
        query_s.push({
          $match: filter
        },
        )
      }
      // let countQuery_s = query_s
      // let limitSkipk = !csv ? [{ "$skip": skip }, { $limit: limit }] : [{ $match: {} }]
      if (!csv) {
        query_s.push({
          $facet: {
            data: [{ "$skip": skip }, { $limit: limit }],
            count: [{ $count: "total" }]
          }
        })
      }
      return [query_s]
    default:
      break;
  }
}

const sortingData = (dbCollectionName) => {
  switch (dbCollectionName) {
    case CollectionNames['state_gtc']:
      return { "formData.installment": 1 }
    default:
      return { "formData": -1 }
  }
}


/**
 * @param formName - The name of the form for which the filled query expression is being generated.
 * @param filledQueryExpression - The parameter filledQueryExpression is a query expression that is
 * used to determine whether a form has been filled or not. It is updated based on the formName and
 * design_year parameters passed to the function.
 * @returns either a `filledQueryExpression` object or both `filledProvisionalExpression` and
 * `filledAuditedExpression` objects, depending on the `formName` parameter and `design_year`
 * parameter.
 */
function getFilledQueryExpression(formName, filledQueryExpression, design_year) {
  let filledAuditedExpression = {}, filledProvisionalExpression = {}
  switch (formName) {
    case CollectionNames.slb:
      filledQueryExpression = {
        $cond: {
          if: { $eq: [`$formData.blank`, true] },
          then: STATUS_LIST.Not_Submitted,
          else: STATUS_LIST.Submitted,
        },
      };
      break;
    case CollectionNames.pfms:
      filledQueryExpression = {
        $cond: {
          if: { $eq: [`$formData.linkPFMS`, "Yes"] },
          then: STATUS_LIST.Submitted,
          else: STATUS_LIST.Not_Submitted,
        },
      };
      break;
    case CollectionNames.propTaxUlb:
      filledQueryExpression = {
        $cond: {
          if: { $eq: [`$formData.toCollect`, "Yes"] },
          then: STATUS_LIST.Submitted,
          else: STATUS_LIST.Not_Submitted,
        },
      };
      if (design_year === years['2023-24']) {
        filledQueryExpression = STATUS_LIST.Submitted
      }

      break;
    case CollectionNames.annual:
      filledProvisionalExpression = {
        $cond: {
          if: { $eq: [`$formData.unAudited.submit_annual_accounts`, true] },
          then: STATUS_LIST.Submitted,
          else: STATUS_LIST.Not_Submitted,
        },
      };
      filledAuditedExpression = {
        $cond: {
          if: { $eq: [`$formData.audited.submit_annual_accounts`, true] },
          then: STATUS_LIST.Submitted,
          else: STATUS_LIST.Not_Submitted,
        },
      };
      return { filledProvisionalExpression, filledAuditedExpression }
    case CollectionNames.sfc:
      filledQueryExpression = {
        $cond: {
          if: { $eq: [`$formData.constitutedSfc`, "Yes"] },
          then: STATUS_LIST.Submitted,
          else: STATUS_LIST.Not_Submitted,
        },
      };
    default:
      break;
  }
  return filledQueryExpression;
}

/**
 * The function creates a dynamic query for MongoDB based on the collection name, user role, and
 * existing query.
 * @param collectionName - The name of the collection for which the dynamic query is being created.
 * @param oldQuery - an array of MongoDB query objects that will be modified and returned
 * @param userRole - The role of the user accessing the function. It can be either "ULB" or "STATE".
 * @param csv - It is a boolean parameter that indicates whether the output should be in CSV format or
 * not.
 */

function createDynamicQuery(collectionName, oldQuery, userRole, csv) {
  let query_2 = {};
  let query_3 = {}, query_4 = {}, query_5 = {};
  let pipelineIndex;
  for (let i = 0; i < oldQuery.length; i++) {
    if (oldQuery[i].hasOwnProperty("$lookup")) {
      let lookupQuery = oldQuery[i]["$lookup"];
      if (lookupQuery.hasOwnProperty("pipeline") && lookupQuery.hasOwnProperty("let")) {
        pipelineIndex = i;
        break;
      }
    }
  }
  switch (userRole) {
    case "ULB":
      switch (collectionName) {
        case CollectionNames.odf:
        case CollectionNames.gfc:
          query_2 = {
            $lookup: {
              from: "ratings",
              localField: "rating",
              foreignField: "_id",
              as: "rating",
            },
          };
          query_3 = { $unwind: { path: "$rating" } };

          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          break;

        case CollectionNames.pfms:

          break;
        case CollectionNames.annual:
          query_2 = {
            $lookup: {
              "from": "years",
              "localField": "audited.year",
              "foreignField": "_id",
              "as": "auditedYear"
            },
          }
          query_3 = {
            $unwind: {
              "path": "$auditedYear"
            }
          };
          query_4 = {
            $lookup: {
              "from": "years",
              "localField": "unAudited.year",
              "foreignField": "_id",
              "as": "unAuditedYear"
            }
          }
          query_5 = {
            $unwind: {
              "path": "$unAuditedYear"
            }
          }
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_4);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_5);
          break;
        case CollectionNames['28SLB']:
          query_2 = {
            $lookup: {
              from: "years",
              localField: "data.actual.year",
              foreignField: "_id",
              as: "actual_year"
            }
          }
          query_3 = {
            $unwind: "$actual_year"
          }
          query_4 = {
            $lookup: {
              from: "years",
              localField: "data.target_1.year",
              foreignField: "_id",
              as: "target_1_year"
            }
          };
          query_5 = {
            $unwind: "$target_1_year"
          };
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_4);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_5);
          break;
        case CollectionNames.dur:
          query_2 = {
            "$lookup": {
              "from": "years",
              "localField": "financialYear",
              "foreignField": "_id",
              "as": "financialYear"
            }
          };
          query_3 = {
            "$unwind": "$financialYear"
          }
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_2);
          oldQuery[pipelineIndex]["$lookup"]["pipeline"].push(query_3);
          break;
        default:
          query = {};
          break;
      }
      break;
    case "STATE":
      switch (collectionName) {
        case CollectionNames.state_gtc:
          if (!csv) {
            query_2 = {
              $group: {
                _id: "$state",
                status: { $push: "$formData.currentFormStatus" },
                stateName: { $first: "$stateName" },
                state: { $first: "$state" },
                stateCode: { $first: "$stateCode" },
              },
            };
            oldQuery.push(query_2);
          }
          break;
        case CollectionNames.state_grant_alloc:
          query_2 = {
            $group: {
              _id: "$state",
              draft: { $push: "$formData.isDraft" },
              stateName: { $first: "$stateName" },
              state: { $first: "$state" },
              stateCode: { $first: "$stateCode" },
              status: { $push: "$formData.currentFormStatus" },
              formData: { $push: "$formData" }
            }
          }
          oldQuery.push(query_2);
          break;
      }
  }
  return oldQuery;
}

function createDynamicElements(collectionName, formType, entity) {
  try {
    if (!entity.formData) {
      entity["filled"] = "No";
      entity['formData'] = createDynamicObject(collectionName, formType);
    }
    let actions = actionTakenByResponse(entity.formData);

    if (formType === "ULB") {
      if (!entity["formData"]["rejectReason_state"]) {
        entity["formData"]["rejectReason_state"] = ""
      }
      if (!entity["formData"]["rejectReason_mohua"]) {
        entity["formData"]["rejectReason_mohua"] = ""
      }
      if (!entity["formData"]["responseFile_state"]) {
        entity["formData"]["responseFile_state"] = {
          url: "",
          name: ""
        }
      }
      if (!entity["formData"]["responseFile_mohua"]) {
        entity["formData"]["responseFile_mohua"] = {
          url: "",
          name: ""
        }
      }
      if (entity?.formData.ulbSubmit) {
        entity["formData"]["ulbSubmit"] = formatDate(
          entity?.formData.ulbSubmit
        );
      }
    }
    if (!entity["formData"]["design_year"]) {
      entity["formData"]["design_year"] = {
        year: ""
      }
    }
    if (entity?.formData.createdAt) {
      entity["formData"]["createdAt"] = formatDate(
        entity?.formData.createdAt
      );
    }
    if (entity?.formData.modifiedAt) {
      entity["formData"]["modifiedAt"] = formatDate(
        entity?.formData.modifiedAt
      );
    }
    let data = entity?.formData;

    switch (formType) {
      case "ULB":
        switch (collectionName) {
          case CollectionNames.odf:
          case CollectionNames.gfc:
            if (entity?.formData?.certDate) entity["formData"]["certDate"] = formatDate(entity?.formData.certDate)
            // if (!entity?.formData.certDate) entity.formData.certDate = ""

            entity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
              }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
              }, ${data["rating"]["name"] ?? ""},${data["rating"]["marks"] ?? ""
              },${data?.cert?.url ? data?.cert?.url : data?.cert_declaration?.url ?? ""},${data?.cert?.name ? data?.cert?.name : data?.cert_declaration?.name ?? ""},${data["certDate"] ?? ""
              },${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""
              },${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""
              },${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""
              } `;
            break;
          case CollectionNames.annual:
            let auditedEntity, unAuditedEntity;
            let unAuditedProvisional = data?.unAudited?.provisional_data;
            let auditedProvisional = data?.audited?.provisional_data;
            let unAuditedStandardized = data?.unAudited?.standardized_data;
            let auditedStandardized = data?.audited?.standardized_data;
            ({ auditedEntity, unAuditedEntity } = annualAccountCsvFormat(data, auditedEntity, entity, auditedProvisional, auditedStandardized, actions, unAuditedEntity, unAuditedProvisional, unAuditedStandardized));
            return [auditedEntity, unAuditedEntity];
          case CollectionNames.dur:
            const {
              design_year,
              createdAt,
              ulbSubmit,
              financialYear,
              grantPosition,
              categoryWiseData_wm,
              categoryWiseData_swm,
              name,
              designation
            } = data;

            let wmData = [];
            let swmData = [];
            if (categoryWiseData_wm && categoryWiseData_wm.length > 0) {
              wmData = convertValue({ data: categoryWiseData_wm, keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"] });
            }
            if (categoryWiseData_swm && categoryWiseData_swm.length > 0) {
              swmData = convertValue({ data: categoryWiseData_swm, keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"] });
            }
            entity = ` ${design_year?.year ?? ""}, ${entity?.formStatus ?? ""
              }, ${createdAt ?? ""}, ${ulbSubmit ?? ""},${entity.filled ?? ""
              },${YEAR_CONSTANTS_IDS[financialYear] || ""}, ${(roundValue(grantPosition?.unUtilizedPrevYr)) ?? ""
              } ,${(roundValue(grantPosition?.receivedDuringYr)) ?? ""
              }, ${(roundValue(grantPosition?.expDuringYr)) ?? ""
              },${(roundValue(grantPosition?.closingBal)) ?? ""
              },${wmData[0]?.["grantUtilised"] ?? ""
              },${wmData[0]?.["numberOfProjects"] ?? ""
              }, ${wmData[0]?.["totalProjectCost"] ?? ""

              },${wmData[1]?.["grantUtilised"] ?? ""
              },${wmData[1]?.["numberOfProjects"] ?? ""
              }, ${wmData[1]?.["totalProjectCost"] ?? ""
              },${wmData[2]?.["grantUtilised"] ?? ""
              },${wmData[2]?.["numberOfProjects"] ?? ""
              }, ${wmData[2]?.["totalProjectCost"] ?? ""
              },${wmData[3]?.["grantUtilised"] ?? ""
              },${wmData[3]?.["numberOfProjects"] ?? ""
              }, ${wmData[3]?.["totalProjectCost"] ?? ""
              },${swmData[0]?.["grantUtilised"] ?? ""
              },${swmData[0]?.["numberOfProjects"] ?? ""
              }, ${swmData[0]?.["totalProjectCost"] ?? ""
              },${swmData[1]?.["grantUtilised"] ?? ""
              },${swmData[1]?.["numberOfProjects"] ?? ""
              }, ${swmData[1]?.["totalProjectCost"] ?? ""
              }, ${removeEscapeChars(name) ?? ""
              }, ${removeEscapeChars(designation) ?? ""
              }, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""
              },${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""
              },${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""
              }`;
            break;
          case CollectionNames['28SLB']:
            let actualYear = data?.data?.[0]?.actual?.year ? YEAR_CONSTANTS_IDS[data.data[0].actual.year] : "";
            let i = 0;
            let actualEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
              }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""
              },Actual,${actualYear || ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""},${data["data"][i++]["actual"]["value"] ?? ""
              },${data["data"][i++]["actual"]["value"] ?? ""}, ${actions["state_status"] ?? ""
              },${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""
              },${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""
              },${actions["responseFile_mohua"]["url"] ?? ""} `;
            i = 0;
            let targetYear = data?.data?.[0]?.target_1?.year ? YEAR_CONSTANTS_IDS[data.data[0].target_1.year] : "";
            let targetEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""}, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity.filled ?? ""},Target,${targetYear || ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""},${data['data'][i++]['target_1']['value'] ?? ""}, ${actions["state_status"] ?? ""},${actions["rejectReason_state"] ?? ""},${actions["mohua_status"] ?? ""},${actions["rejectReason_mohua"] ?? ""},${actions["responseFile_state"]["url"] ?? ""},${actions["responseFile_mohua"]["url"] ?? ""} `
            return [actualEntity, targetEntity];
        };
        break;
      case "STATE":
        switch (collectionName) {
          case CollectionNames.state_gtc:
            entity = ""
            break;
        };
        break;
    }
    return entity;
  } catch (error) {
    console.log("erro", error)
  }
}

function createDynamicObject(collectionName, formType) {
  let obj = {};
  switch (formType) {
    case "ULB":
      switch (collectionName) {
        case CollectionNames.gfc:
        case CollectionNames.odf:
          obj = {
            design_year: {
              year: "",
            },
            createdAt: "",
            modifiedAt: "",
            ulbSubmit: "",
            rating: {
              name: "",
              marks: "",
            },
            cert: {
              url: "",
              name: "",
            },
            certDate: "",
            rejectReason_state: "",
            rejectReason_mohua: "",
            responseFile_state: {
              url: "",
              name: "",
            },
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames.pfms:
          obj = {
            design_year: {
              year: "",
            },
            createdAt: "",
            modifiedAt: "",
            ulbSubmit: "",
            linkPFMS: "",
            PFMSAccountNumber: "",
            isUlbLinkedWithPFMS: "",
            cert: {
              url: "",
              name: "",
            },
            otherDocs: {
              url: "",
              name: "",
            },
            rejectReason_state: "",
            rejectReason_mohua: "",
            responseFile_state: {
              url: "",
              name: "",
            },
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames.annual:
          obj = {
            modifiedAt: "",
            createdAt: "",
            ulbSubmit: "",
            design_year: {
              year: "",
            },
            status: "",
            audited: {
              submit_annual_accounts: "",
              submit_standardized_data: "",
              provisional_data: {
                bal_sheet: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                assets: "",
                f_assets: "",
                s_grant: "",
                c_grant: "",
                bal_sheet_schedules: {
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  rejectReason: "",
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                inc_exp: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                revenue: "",
                expense: "",
                inc_exp_schedules: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                cash_flow: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                auditor_report: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
              },
              standardized_data: {
                declaration: "",
                excel: {
                  url: "",
                  name: "",
                },
              },
              audit_status: "",
              year: "",
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: ""
              },
              rejectReason: "",
              responseFile: {
                url: "",
                name: ""
              }
            },
            unAudited: {
              rejectReason: "",
              responseFile: {
                url: "",
                name: ""
              },
              rejectReason_state: "",
              rejectReason_mohua: "",
              responseFile_state: {
                url: "",
                name: "",
              },
              responseFile_mohua: {
                url: "",
                name: ""
              },
              submit_annual_accounts: "",
              submit_standardized_data: "",
              provisional_data: {
                bal_sheet: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                assets: "",
                f_assets: "",
                s_grant: "",
                c_grant: "",
                bal_sheet_schedules: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                inc_exp: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                revenue: "",
                expense: "",
                inc_exp_schedules: {
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  rejectReason: "",
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
                cash_flow: {
                  rejectReason: "",
                  rejectReason_state: "",
                  rejectReason_mohua: "",
                  responseFile_state: {
                    url: "",
                    name: "",
                  },
                  responseFile_mohua: {
                    url: "",
                    name: ""
                  },
                  pdf: {
                    url: "",
                    name: "",
                  },
                  excel: {
                    url: "",
                    name: "",
                  },
                  status: "",
                  responseFile: {
                    url: "",
                    name: "",
                  },
                },
              },
              standardized_data: {
                declaration: "",
                excel: {
                  url: "",
                  name: "",
                },
              },
              audit_status: "",
              year: "",
            },
            actionTakenBy: "",
            filled_provisional: "",
            filled_audited: "",
          };
          break;
        case CollectionNames.propTaxUlb:
          obj = {
            rejectReason_state: "",
            rejectReason_mohua: "",
            isDraft: false,
            history: [],
            ulb: "",
            design_year: "",
            toCollect: "",
            operationalize: "",
            method: "",
            other: "",
            collection2019_20: "",
            collection2020_21: "",
            collection2021_22: "",
            target2022_23: null,
            proof: {
              url: "",
              name: "",
            },
            rateCard: {
              url: "",
              name: "",
            },
            ptCollection: {
              url: "",
              name: "",
            },
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            ulbSubmit: "",
            status: "",
          };
          break;
        case CollectionNames.dur:
          obj = {
            _id: "",
            designYear: "",
            financialYear: "",
            ulb: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            categoryWiseData_swm: [
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
            ],
            categoryWiseData_wm: [
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
              {
                category_name: "",
                grantUtilised: "",
                numberOfProjects: "",
                totalProjectCost: "",
                _id: "",
              },
            ],
            createdAt: "",
            declaration: "",
            designation: "",
            grantPosition: {
              unUtilizedPrevYr: "",
              receivedDuringYr: "",
              expDuringYr: "",
              closingBal: "",
            },
            grantType: "",
            history: [],
            isActive: "",
            isDraft: "",
            modifiedAt: "",
            name: "",
            projects: [
              {
                cost: "",
                expenditure: "",
                modifiedAt: "",
                createdAt: "",
                isActive: "",
                _id: "",
                category: "",
                name: "",
                location: {
                  lat: "",
                  long: "",
                },
              },
            ],
            rejectReason: "",
            rejectReason_mohua: "",
            rejectReason_state: "",
            status: "",
            responseFile_state: {
              url: "",
              name: "",
            },
            design_year: {
              _id: "",
              year: "",
              isActive: "",
            },
          };
          break;
        case CollectionNames["28SLB"]:
          obj = {
            _id: "",
            population: "",
            createdAt: "",
            modifiedAt: "",
            ulbSubmit: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            data: [],
            design_year: "",
            ulb: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            status: "",
            actual_year: {
              _id: "",
              year: "",
              isActive: "",
            },
            target_1_year: {
              _id: "",
              year: "",
              isActive: "",
            },
          };
          let quesObj = {
            question: "",
            type: "",
            unit: "",
            range: "",
            actualDisable: "",
            targetDisable: "",
            _id: "",
            actual: {
              year: "",
              value: "",
            },
            target_1: {
              year: "",
              value: "",
            },
            indicatorLineItem: "",
          };
          for (let i = 0; i < 28; i++) {
            //adding question object to data array
            obj["data"].push(quesObj);
          }
          break;
      }
      break;

    case "STATE":
      switch (collectionName) {
        case CollectionNames["propTaxState"]:
          obj = {
            actPage: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            state: "",
            design_year: "",
            floorRate: {
              url: "",
              name: "",
            },
            stateNotification: {
              url: "",
              name: "",
            },
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            comManual: {
              url: "",
              name: "",
            },
            status: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames["sfc"]:
          obj = {
            _id: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            constitutedSfc: "",
            state: "",
            design_year: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            stateNotification: {
              url: "",
              name: "",
            },
            status: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
        case CollectionNames['state_gtc']:
          obj = {
            _id: "",
            isDraft: "",
            rejectReason: "",
            history: [],
            installment: "",
            year: "",
            type: "",
            file: {
              name: "",
              url: "",
            },
            status: "",
            state: "",
            design_year: "",
            actionTakenBy: "",
            actionTakenByRole: "",
            createdAt: "",
            modifiedAt: "",
            __v: "",
            rejectReason_mohua: "",
            responseFile_mohua: {
              url: "",
              name: "",
            },
          };
          break;
      }
      break;
  }
  return obj;
}

function annualAccountCsvFormat(data, auditedEntity, entity, auditedProvisional, auditedStandardized, actions, unAuditedEntity, unAuditedProvisional, unAuditedStandardized) {

  const { IN_PROGRESS, UNDER_REVIEW_BY_STATE } = MASTER_FORM_STATUS;
  if (![IN_PROGRESS, UNDER_REVIEW_BY_STATE].includes(entity?.formData?.currentFormStatus)) {
    annualAccountSetCurrentStatus(data, entity?.formData?.currentFormStatus)
  }
  auditedEntity = auditedEntity = ` ${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
    }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_audited ?? ""
    }, Audited, ${data?.audited?.year ? YEAR_CONSTANTS_IDS[data?.audited?.year] : ""},${auditedProvisional?.bal_sheet?.pdf?.url ?? ""
    }, ${auditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet?.state_status ?? ""}, ${auditedProvisional?.bal_sheet?.rejectReason_state ?? ""},${auditedProvisional?.bal_sheet?.mohua_status ?? ""
    }, ${auditedProvisional?.bal_sheet?.rejectReason_mohua ?? ""},  ${auditedProvisional?.assets ?? ""
    }, ${auditedProvisional?.f_assets ?? ""}, ${auditedProvisional?.s_grant ?? ""
    }, ${auditedProvisional?.c_grant ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
    }, ${auditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${auditedProvisional?.bal_sheet_schedules?.state_status ?? ""
    }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason_state}, ${auditedProvisional?.bal_sheet_schedules?.mohua_status ?? ""
    }, ${auditedProvisional?.bal_sheet_schedules?.rejectReason_mohua ?? ""},${auditedProvisional?.inc_exp?.pdf?.url ?? ""
    }, ${auditedProvisional?.inc_exp?.excel?.url ?? ""}, ${auditedProvisional?.inc_exp?.state_status ?? ""
    }, ${auditedProvisional?.inc_exp?.rejectReason_state}, ${auditedProvisional?.inc_exp?.mohua_status ?? ""
    }, ${auditedProvisional?.inc_exp?.rejectReason_mohua ?? ""}, ${auditedProvisional?.revenue ?? ""
    }, ${auditedProvisional?.expense ?? ""},${auditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""
    }, ${auditedProvisional?.inc_exp_schedules?.excel?.url ?? ""}, ${auditedProvisional?.inc_exp_schedules?.state_status ?? ""
    }, ${auditedProvisional?.inc_exp_schedules?.rejectReason_state},${auditedProvisional?.inc_exp_schedules?.mohua_status ?? ""
    }, ${auditedProvisional?.inc_exp_schedules?.rejectReason_mohua ?? ""}, ${auditedProvisional?.cash_flow?.pdf?.url ?? ""
    }, ${auditedProvisional?.cash_flow?.excel?.url ?? ""}, ${auditedProvisional?.cash_flow?.state_status ?? ""
    }, ${auditedProvisional?.cash_flow?.rejectReason_state}, ${auditedProvisional?.cash_flow?.mohua_status ?? ""
    }, ${auditedProvisional?.cash_flow?.rejectReason_mohua ?? ""}, ${auditedProvisional?.auditor_report?.pdf?.url ?? ""
    }, ${auditedProvisional?.auditor_report?.state_status ?? ""
    }, ${auditedProvisional?.auditor_report?.rejectReason_state},${auditedProvisional?.auditor_report?.mohua_status ?? ""}, ${auditedProvisional?.auditor_report?.rejectReason_mohua ?? ""
    }, ${data?.audited?.submit_standardized_data ?? ""}, ${auditedStandardized?.excel?.url ?? ""
    } ,${data?.audited?.submit_annual_accounts === false
      ? (data?.audited?.rejectReason_state ?? "")
      : ""
    } ,${data?.audited?.submit_annual_accounts === false
      ? (data?.audited?.rejectReason_mohua ?? "")
      : ""
    },  ${data?.audited?.responseFile_state?.url ?? ""},${data?.audited?.responseFile_mohua?.url ?? "" ?? ""
    } `;

  unAuditedEntity = `${data?.design_year?.year ?? ""}, ${entity?.formStatus ?? ""
    }, ${data?.createdAt ?? ""}, ${data?.ulbSubmit ?? ""},${entity?.filled_provisional ?? ""
    }, Provisional,${data?.unAudited?.year ? YEAR_CONSTANTS_IDS[data?.unAudited?.year] : ""}, ${unAuditedProvisional?.bal_sheet?.pdf?.url ?? ""
    }, ${unAuditedProvisional?.bal_sheet?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet?.state_status ?? ""
    }, ${unAuditedProvisional?.bal_sheet?.rejectReason_state},  ${unAuditedProvisional?.bal_sheet?.mohua_status ?? ""
    }, ${unAuditedProvisional?.bal_sheet?.rejectReason_mohua ?? ""},  ${unAuditedProvisional?.assets ?? ""
    }, ${unAuditedProvisional?.f_assets ?? "" ?? ""}, ${unAuditedProvisional?.s_grant ?? ""
    }, ${unAuditedProvisional?.c_grant ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.pdf?.url ?? ""
    }, ${unAuditedProvisional?.bal_sheet_schedules?.excel?.url ?? ""}, ${unAuditedProvisional?.bal_sheet_schedules?.state_status ?? ""
    }, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason_state}, ${unAuditedProvisional?.bal_sheet_schedules?.mohua_status ?? ""
    }, ${unAuditedProvisional?.bal_sheet_schedules?.rejectReason_mohua ?? ""
    }, ${unAuditedProvisional?.inc_exp?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp?.excel?.url ?? ""
    }, ${unAuditedProvisional?.inc_exp?.state_status ?? ""
    }, ${unAuditedProvisional?.inc_exp?.rejectReason_state}, ${unAuditedProvisional?.inc_exp?.mohua_status ?? ""}, ${unAuditedProvisional?.inc_exp?.rejectReason_mohua ?? ""
    },  ${unAuditedProvisional?.revenue ?? ""}, ${unAuditedProvisional?.expense ?? ""
    },${unAuditedProvisional?.inc_exp_schedules?.pdf?.url ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.excel?.url ?? ""
    }, ${unAuditedProvisional?.inc_exp_schedules?.state_status ?? ""
    }, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason_state},  ${unAuditedProvisional?.inc_exp_schedules?.mohua_status ?? ""}, ${unAuditedProvisional?.inc_exp_schedules?.rejectReason_mohua ?? ""
    }, ${unAuditedProvisional?.cash_flow?.pdf?.url ?? ""}, ${unAuditedProvisional?.cash_flow?.excel?.url ?? ""
    }, ${unAuditedProvisional?.cash_flow?.state_status ?? ""
    }, ${unAuditedProvisional?.cash_flow?.rejectReason_state},  ${unAuditedProvisional?.cash_flow?.mohua_status ?? ""}, ${unAuditedProvisional?.cash_flow?.rejectReason_mohua ?? ""
    }, , , , , , ${data?.unAudited?.submit_standardized_data ?? ""}, ${unAuditedStandardized?.excel?.url ?? ""
    } , ${data?.unAudited?.submit_annual_accounts === false
      ? (data?.unAudited?.rejectReason_state ?? "")
      : ""
    }, ${data?.unAudited?.submit_annual_accounts === false
      ? (data?.unAudited?.rejectReason_mohua ?? "")
      : ""
    }, ${data?.unAudited?.responseFile_state?.url ?? ""},${data?.unAudited?.responseFile_mohua?.url ?? ""
    } `;
  return { auditedEntity, unAuditedEntity };
}

const annualAccountSetCurrentStatus = (data, currentFormStatus) => {
  let mainArr = ['unAudited', 'audited'];
  let subArr = ['provisional_data'];
  let sheetkey = [
    'bal_sheet',
    'bal_sheet_schedules',
    'auditor_report',
    'inc_exp',
    'inc_exp_schedules',
    'cash_flow',
  ]
  const { currentstatuse } = data;
  const { UNDER_REVIEW_BY_MoHUA } = MASTER_FORM_STATUS;
  let role = [UNDER_REVIEW_BY_MoHUA].includes(currentFormStatus) ? ['STATE'] : ['MoHUA', 'STATE'];
  let currentStatusList = currentstatuse?.filter(e => role.includes(e.actionTakenByRole));
  if (currentStatusList?.length) {
    for (let key of mainArr) {
      let subObData = data[key];
      let tab = setCurrentStatusQuestionLevel(currentStatusList, key)
      Object.assign(subObData, { ...tab })
      for (let subkey of subArr) {
        let d = subObData[subkey];
        for (let skey of sheetkey) {
          let sortkey = `${key}.${skey}`;
          let statusList = currentStatusList.filter(e => e.shortKey == sortkey);
          if (statusList.length) {
            let b = setCurrentStatusQuestionLevel(statusList)
            Object.assign(d[skey], { ...b })
          }
        }
      }
    }
  }
  delete data.currentstatuse
  return data;
}
const setCurrentStatusQuestionLevel = (statusList, key = null) => {
  let obj = {
    "state_status": "",
    "rejectReason_state": "",
    "responseFile_state": {
      "url": "",
      "name": ""
    },
    "rejectReason_mohua": "",
    "mohua_status": "",
    "responseFile_mohua": {
      "url": "",
      "name": ""
    }
  };
  if(key){ 
    let pattern = new RegExp(key);
    statusList = statusList.filter(status => pattern.test(status.shortKey))
  }
  if (statusList.length) {
    for (let statusObj of statusList) {
      if (statusObj.actionTakenByRole == "STATE" && (statusObj?.rejectReason || statusObj?.responseFile.url)) {
        obj['state_status'] = MASTER_FORM_QUESTION_STATUS[statusObj.status]
        obj['rejectReason_state'] = removeEscapeChars(statusObj.rejectReason)
        obj['responseFile_state'] = statusObj.responseFile
      } else if (statusObj?.rejectReason || statusObj?.responseFile.url) {
        obj['mohua_status'] = MASTER_FORM_QUESTION_STATUS[statusObj.status]
        obj['rejectReason_mohua'] = removeEscapeChars(statusObj.rejectReason)
        obj['responseFile_mohua'] = statusObj.responseFile
      }
    }
  }
  return obj;
}

function createDynamicColumns(collectionName) {
  let columns = ``;
  switch (collectionName) {
    case CollectionNames.odf:
    case CollectionNames.gfc:
      columns = `Financial Year,Form Status, Created, Submitted On, Filled Status, Rating, Score, Certificate URL, Certificate Name, Certificate Issue Date,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `;
      break;
    case CollectionNames.pfms:
      columns = `Financial Year, Form Status, Created, Submitted On, Filled Status, Link PFMS, PFMS Account Number, Is Ulb Linked With PFMS, Certificate URL, Certificate Name, Other Doc URL, Other Doc Name,State Review Status, State Comments,MoHUA Review Status, MoHUA Comments, State Review File URL, MoHUA Review File URL `
      break;
    case CollectionNames.annual:
      columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Type,Audited/Provisional Year,Balance Sheet_PDF_URL,Balance Sheet_Excel_URL,Balance Sheet_State Review Status,Balance Sheet_State_Comments,Balance Sheet_MoHUA Review Status,Balance Sheet_MoHUA_Comments,Balance Sheet_Total Amount of Assets,Balance Sheet_Total Amount of Fixed Assets,Balance Sheet_Total Amount of State Grants received,Balance Sheet_Total Amount of Central Grants received,Balance Sheet Schedule_PDF_URL,Balance Sheet Schedule_Excel_URL,Balance Sheet Schedule_State Review Status,Balance Sheet Schedule_State_Comments,Balance Sheet Schedule_MoHUA Review Status,Balance Sheet Schedule_MoHUA_Comments,Income Expenditure_PDF_URL,Income Expenditure_Excel_URL,Income Expenditure_State Review Status,Income Expenditure_State_Comments,Income Expenditure_MoHUA Review Status,Income Expenditure_MoHUA_Comments,Income Expenditure_Total Amount of Revenue,Income Expenditure_Total Amount of Expenses,Income Expenditure Schedule_PDF_URL,Income Expenditure Schedule_Excel_URL,Income Expenditure Schedule_State Review Status,Income Expenditure Schedule_State_Comments,Income Expenditure Schedule_MoHUA Review Status,Income Expenditure Schedule_MoHUA_Comments,Cash Flow Schedule_PDF_URL,Cash Flow Schedule_Excel_URL,Cash Flow Schedule_State Review Status,Cash Flow Schedule_State_Comments,Cash Flow Schedule_MoHUA Review Status,Cash Flow Schedule_MoHUA_Comments,Auditor Report PDF_URL,Auditor Report State Review Status,Auditor Report State_Comments,Auditor Report MoHUA Review Status,Auditor Report MoHUA_Comments,Financials in Standardized Format_Filled Status,Financials in Standardized Format_Excel URL,State Comments if Accounts for 2022-23 is selected No,MoHUA Comments if Accounts for 2022-23 is selected No,State Review File_URL,MoHUA Review File_URL`;
      break;
    case CollectionNames.dur:
      columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Tied grants for year,Unutilised Tied Grants from previous installment (INR in lakhs),15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs),Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs),Closing balance at the end of year (INR in lakhs),WM Rejuvenation of Water Bodies Total Tied Grant Utilised on WM(INR in lakhs),WM Rejuvenation of Water Bodies Number of Projects Undertaken,WM_Rejuvenation of Water Bodies_Total Project Cost Involved,WM_Drinking Water_Total Tied Grant Utilised on WM(INR in lakhs),WM_Drinking Water_Number of Projects Undertaken,WM_Drinking Water_Total Project Cost Involved,WM_Rainwater Harvesting_Total Tied Grant Utilised on WM(INR in lakhs),WM_Rainwater Harvesting_Number of Projects Undertaken,WM_Rainwater Harvesting_Total Project Cost Involved,WM_Water Recycling_Total Tied Grant Utilised on WM(INR in lakhs),WM_Water Recycling_Number of Projects Undertaken,WM_Water Recycling_Total Project Cost Involved,SWM_Sanitation_Total Tied Grant Utilised on SWM(INR in lakhs),SWM_Sanitation_Number of Projects Undertaken,SWM_Sanitation_Total Project Cost Involved(INR in lakhs),SWM_Solid Waste Management_Total Tied Grant Utilised on SWM(INR in lakhs),SWM_Solid Waste Management_Number of Projects Undertaken,SWM_Solid Waste Management_Total Project Cost Involved(INR in lakhs),Name,Designation,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL`
      break;
    case CollectionNames['28SLB']:
      columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Type,Year,Coverage of water supply connections,Per capita supply of water(lpcd),Extent of metering of water connections,Extent of non-revenue water (NRW),Continuity of water supply,Efficiency in redressal of customer complaints,Quality of water supplied,Cost recovery in water supply service,Efficiency in collection of water supply-related charges,Coverage of toilets,Coverage of waste water network services,Collection efficiency of waste water network,Adequacy of waste water treatment capacity,Extent of reuse and recycling of waste water,Quality of waste water treatment,Efficiency in redressal of customer complaints,Extent of cost recovery in waste water management,Efficiency in collection of waste water charges,Household level coverage of solid waste management services,Efficiency of collection of municipal solid waste,Extent of segregation of municipal solid waste,Extent of municipal solid waste recovered,Extent of scientific disposal of municipal solid waste,Extent of cost recovery in SWM services,Efficiency in collection of SWM related user related charges,Efficiency in redressal of customer complaints,Coverage of storm water drainage network,Incidence of water logging,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL `
      break;
    // case CollectionNames['GrantClaim']:
    //   columns = `State Name, City Finance Code, Regional Name, `
    //   break;
    case CollectionNames['state_gtc']:
      columns = `State Name,City Finance Code,Form Status,Year,Type of ULB,Type of Grant Received (Tied/Untied),Installment Type,Total No: of MPCs,Total No: of NMPCS,Total No: of Duly Elected MPCS,Total No: of Duly Elected NMPCS,Amount Received(In Lakhs),Date of Receipt,Amount Transferred excluding interest (in lakhs),Date of Transfer,Was there any delay in transfer?,No. of days delayed,Rate of interest (annual rate),Amount of interest transferred - If there's any delay (in lakhs),Whether State Finance Commission recommendations available? (Yes/No),If No Upload notification for constitution of SFC issued,If Yes-Whether Grants distributed as per Census 2011 or as per SFC recommendations?,Whether Project works undertaken are uploaded on the website (Yes/No),Upload copy of Property Tax Notification issued,Whether the ULB accounts   for 15th FC Grants linked to PFMS for all transactions,Upload Signed Grant Transfer Certificate,MoHUA Comments,Supporting Document,Review Status`
      break;
    case CollectionNames['state_grant_alloc']:
      columns = `State Name,City Finance Code,Type of Grant,Installment No,Grant Allocation to ULBs (FY23-24),Form Status,Review Status,MoHUA Comments,Review Documents`
      break;
    case CollectionNames['state_action_plan']:
      columns = `State Name,CF Code,UA Name,Form Status,executed with 15th: Project_Code,Executed with 15th: Project_Name,Executed with 15th :Project_Details,Executed with 15th:Project_Cost,Executed with 15th : Executing_Agency,Executed with 15th:Parastatal_Agency,Executed with 15th: : Sector,Executed with 15th : Project_Type,Executed with 15th :Estimated_Outcome,Project List and Source of Funds (Annual In INR Lakhs) : Project_Code,Project List and Source of Funds (Annual In INR Lakhs) :Project_Name,Project List and Source of Funds (Annual In INR Lakhs) : Project_Cost,Project List and Source of Funds (Annual In INR Lakhs) : XV_FC,Project List and Source of Funds (Annual In INR Lakhs) : Other,Project List and Source of Funds (Annual In INR Lakhs) : Total,Project List and Source of Funds (Annual In INR Lakhs) :2021-22,Project List and Source of Funds (Annual In INR Lakhs) :2022-23,Project List and Source of Funds (Annual In INR Lakhs) :2023-24,Project List and Source of Funds (Annual In INR Lakhs) :2024-25,Project List and Source of Funds (Annual In INR Lakhs) :2025-26,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : Project_Code,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : Project_Name,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : Project_Cost,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : Funding,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : Amount,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs) : 2021-22,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs):2022-23,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs): 2023-24,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs):2024-25,Year wise Outlay for 15th FC Grants(Annual In INR Lakhs):2025-26,Review Status,MoHUA Comments,Review Documents`
      break;
    default:
      columns = '';
      break;
  }
  return columns.replace(/\n/g, '');
}

function actionTakenByResponse(entity) {
  let obj = {
    state_status: "",
    mohua_status: "",
    rejectReason_state: "",
    rejectReason_mohua: "",
    responseFile_state: {
      url: "",
      name: ""
    },
    responseFile_mohua: {
      url: "",
      name: ""
    }
  };
  const { IN_PROGRESS, UNDER_REVIEW_BY_STATE } = MASTER_FORM_STATUS;
  if (![IN_PROGRESS, UNDER_REVIEW_BY_STATE].includes(entity.currentFormStatus)) {
    getActionStatus(obj, entity);
  }
  return obj;
}

const getActionStatus = (obj, entity) => {
  if (entity?.currentstatuse) {
    const { UNDER_REVIEW_BY_MoHUA } = MASTER_FORM_STATUS;
    let role = [UNDER_REVIEW_BY_MoHUA].includes(entity?.currentstatuse) ? ['STATE'] : ['MoHUA', 'STATE'];
    let statusList = entity?.currentstatuse.filter(e => e.shortKey == "form_level" && role.includes(e.actionTakenByRole));
    if (statusList) {
      for (let pf of statusList) {
        if (pf.actionTakenByRole == "STATE") {
          obj['state_status'] = MASTER_FORM_QUESTION_STATUS[pf.status]
          obj['rejectReason_state'] = removeEscapeChars(pf.rejectReason)
          obj['responseFile_state'] = pf.responseFile
        } else {
          obj['mohua_status'] = MASTER_FORM_QUESTION_STATUS[pf.status]
          obj['rejectReason_mohua'] = removeEscapeChars(pf.rejectReason)
          obj['responseFile_mohua'] = pf.responseFile
        }
      }
    }
  }
  return obj
}

module.exports.getExcelCol = (index) => {
  const ordA = 'A'.charCodeAt(0);
  const ordZ = 'Z'.charCodeAt(0);
  const len = ordZ - ordA + 1;

  let s = "";
  while (index >= 0) {
    s = String.fromCharCode(index % len + ordA) + s;
    index = Math.floor(index / len) - 1;
  }
  return s;
}

/**
 * creating a map of questions and excel column (sequential)
 * @param {*} questions
 * @param {*} counter
 * @returns mapped object
 */
const getQuestionsMapping = (questions, counter = 0) => {
  const questionColMapping = {}
  // columns need to map due to anomaly
  const userChargesCol = ["userChargesDmndChild", "userChargesCollectionChild"] // have options with no specific position when adding in form
  const otherValueCol = ["otherValuePropertyType", "otherValueSewerageType", "othersValueWaterType"] // have multiple child questions

  for (const key in questions) {
    const crrQuestion = questions[key]
    if (crrQuestion.copyChildFrom?.length) {
      // these keys are added in group
      if (otherValueCol.includes(key)) {
        for (let i = 0; i < crrQuestion.maxChild; i++) {
          for (const child of crrQuestion.copyChildFrom) {
            questionColMapping[`${child.key}-textValue-${i}`] = this.getExcelCol(counter)
            counter++
            for (const year of child.yearData) {
              if (Object.keys(year).length) {
                questionColMapping[`${child.key}-${year.key.split("-")[1]}-${i}`] = this.getExcelCol(counter)
                counter++
              }
            }
          }
        }
      } else {
        for (const child of crrQuestion.copyChildFrom) {
          counter++
          for (let i = 0; i < crrQuestion.maxChild; i++) {
            // these keys doesn't have 'input value' field
            if (!userChargesCol.includes(child.key)) {
              questionColMapping[`${child.key}-textValue-${i}`] = this.getExcelCol(counter)
              counter++
            }
            for (const year of child.yearData) {
              if (Object.keys(year).length) {
                questionColMapping[userChargesCol.includes(child.key) ? `${child.key}-${crrQuestion.copyOptions[i].id.replace(/ /g, '')}-${year.key.split("-")[1]}` : `${child.key}-${year.key.split("-")[1]}-${i}`] = this.getExcelCol(counter)
                counter++
              }
            }
          }
        }
      }
    } else {
      if (crrQuestion.yearData?.length) {
        for (const year of crrQuestion.yearData) {
          if (year.key) {
            questionColMapping[`${key}-${year.key.split("-")[1]}`] = this.getExcelCol(counter)
            counter++
          }
        }
      } else {
        questionColMapping[`${key}`] = crrCol = this.getExcelCol(counter)
        counter++
      }
    }
  }
  return questionColMapping
}

module.exports.downloadPTOExcel = async (req, res) => {
  try {
    return res.status(400).json({
      success: false,
      message: "Forbidden"
    })
    
    const { crrWorkbook, filename, tempFilePath, year } = await excelPTOMapping(req.query)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader("Content-Disposition", "attachment; filename=" + `${filename}`);
    fs.unlink(`${tempFilePath}/${filename}`, (err) => console.log(err))
    await crrWorkbook.xlsx.write(res);

    return res.end();
  } catch (err) {
    console.log("err", err)
    console.log("error in downloadPTOExcel ::::: ", err.message)
    throw err.message
  }
}

/**
 * creates an excel workbook with mapped cell position and answers
 * @returns
 */
const excelPTOMapping = async (query) => {
  return new Promise(async (resolve, reject) => {
    try {
      // get mapping for form questions and child questions
      const questions = propertyTaxOpFormJson()['tabs'][0]['data']
      // static, we know the first four rows will be occupied by headers
      const startRowIndex = 5;
      // map form questions with excel columns
      const userCharges = ["userChargesDmndChild", "userChargesCollectionChild"]
      const questionColMapping = getQuestionsMapping(questions, 8)
      let design_year, accessYear = null;
      let { getQuery, year } = query;

      if (year && mongoose.isValidObjectId(year)) {
        design_year = ObjectId(year);
      } else {
        const financialYear = getFinancialYear();
        design_year = getCurrentYear(financialYear, design_year);
      }
      accessYear = getAccessYear(design_year, accessYear);
      getQuery = getQuery === "true"
      if (getQuery) {
        response.query = getQuery
        return response
      }

      let counter = 0;
      const tempFilePath = "uploads/p-tax"
      if (!fs.existsSync(tempFilePath)) {
        fs.mkdirSync(tempFilePath);
      }
      const filename = `PropertyTaxCSV.xlsx`

      // copying the template in new workbook and sheet in excel
      const template = fs.readFileSync(`p-tax/ptax-template.xlsx`)
      fs.writeFileSync(`${tempFilePath}/${filename}`, template)
      const workbook = new ExcelJS.Workbook()
      workbook.calcProperties.fullCalcOnLoad = false;
      const crrWorkbook = await workbook.xlsx.readFile(`${tempFilePath}/${filename}`)
      const crrWorksheet = crrWorkbook.getWorksheet("Sheet 1")

      const states = await State.find({accessToXVFC:true}).lean();
      let STATE_DATA = {}, ALLOWED_STATES = [];
      states.forEach(el=> { STATE_DATA[el?._id] = el?.name});
      states.forEach(el=> ALLOWED_STATES.push(el._id))
      const cursor = await Ulb.aggregate([
        {
          $match: {
            [accessYear]: true,
            state: { $in: ALLOWED_STATES },
          },
        },
        // {
        //   $lookup: {
        //     from: "states",
        //     localField: "state",
        //     foreignField: "_id",
        //     as: "state",
        //   },
        // },
        // {
        //   $unwind: "$state",
        // },
        // {
        //   $match: { "state.accessToXVFC": true },
        // },
        {
          $lookup: {
            from: "propertytaxops",
            let: {
              firstUser: design_year,
              secondUser: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$design_year", "$$firstUser"] },
                      { $eq: ["$ulb", "$$secondUser"] },
                    ],
                  },
                },
              },
            ],
            as: "propertytaxop",
          },
        },
        {
          $unwind: {
            path: "$propertytaxop",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "currentstatuses",
            localField: "propertytaxop._id",
            foreignField: "recordId",
            as: "currentstatuse",
          },
        },
        {
          $addFields: {
            currentFormStatus: {
              $cond: {
                if: { $ne: [{ $type: "$propertytaxop" }, "object"] },
                then: "1",
                else: "$propertytaxop.currentFormStatus",
              },
            },
            stateStatusData: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$currentstatuse",
                    as: "cs",
                    cond: {
                      $eq: ["$$cs.actionTakenByRole", "STATE"],
                    },
                  },
                },
                0,
              ],
            },
            mohuaStatusData: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$currentstatuse",
                    as: "cs",
                    cond: {
                      $eq: ["$$cs.actionTakenByRole", "MoHUA"],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: "propertytaxopmappers",
            localField: "propertytaxop._id",
            foreignField: "ptoId",
            // let: {
            //   first: "$propertytaxop._id",
            // },
            // pipeline: [
            //   {
            //     $match: {
            //       $expr: {
            //         $and: [{ $eq: ["$$first", "$ptoId"] }],
            //       },
            //     },
            //   },
            //   {
            //     $addFields: {
            //       date: {
            //         $ifNull: [
            //           AggregationServices.getCommonDateTransformer(
            //             "$date"
            //           ),
            //           null,
            //         ]
            //       },
            //     },
            //   },
            // ],
            as: "propertytaxopmapper",
          },
        },
        {
          $lookup: {
            from: "propertymapperchilddatas",
            localField: "propertytaxop._id",
            foreignField: "ptoId",
            as: "propertymapperchilddata",
          },
        },
        {
            $project:{
              currentstatuse:0,
              propertytaxop:0
          }
        }
      ])
        .allowDiskUse(true)
        .cursor({ batchSize: 50 })
        .addCursorFlag("noCursorTimeout", true)
        .exec();

      cursor.on("data", (el) => {
        el = JSON.parse(JSON.stringify(el));
        el = concatenateUrls(el);
        if (STATE_DATA[el?.state?.toString()]) {
          // Filters the current status of a form element and removes certain data fields based on the status.
          currentStatusFilter(el);

          // mapping these fields manually as they aren't available in the fydynamic.js file
          crrWorksheet.getCell(`A${startRowIndex + counter}`).value =
            counter + 1;
          crrWorksheet.getCell(`B${startRowIndex + counter}`).value =
            STATE_DATA[el.state.toString()];
          crrWorksheet.getCell(`C${startRowIndex + counter}`).value = el.name;
          crrWorksheet.getCell(`D${startRowIndex + counter}`).value = el.code;
          crrWorksheet.getCell(`E${startRowIndex + counter}`).value =
            el.censusCode ?? el.sbCode;
          crrWorksheet.getCell(`F${startRowIndex + counter}`).value =
            YEAR_CONSTANTS_IDS[design_year];
          crrWorksheet.getCell(`G${startRowIndex + counter}`).value =
            MASTER_STATUS_ID[el.currentFormStatus];
          crrWorksheet.getCell(`BBX${startRowIndex + counter}`).value =
            el?.stateStatusData?.rejectReason;
          crrWorksheet.getCell(`BBY${startRowIndex + counter}`).value =
            el?.stateStatusData?.responseFile?.url;
          crrWorksheet.getCell(`BBZ${startRowIndex + counter}`).value =
            el?.mohuaStatusData?.rejectReason;
          crrWorksheet.getCell(`BCA${startRowIndex + counter}`).value =
            el?.mohuaStatusData?.responseFile?.url;

          const sortedResults = el.propertytaxopmapper;
          // mapping form questions and child questions with their cell position
          for (const result of sortedResults) {
            if (
              result?.year &&
              questionColMapping[
              `${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]
              }`
              ]
            ) {
              crrWorksheet.getCell(
                `${questionColMapping[
                `${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]
                }`
                ]
                }${startRowIndex + counter}`
              ).value = result.file
                  ? result.file.url
                  : result.date
                    ? convertToKolkataDate(result.date)
                    : result.value;
            }
            if (result.child?.length) {
              const childCounter = {};
              for (const childId of result.child) {
                const child =
                  el?.propertymapperchilddata?.length > 0
                    ? el?.propertymapperchilddata.find(
                      (e) => e._id.toString() === childId.toString()
                    )
                    : null;
                if (child) {
                  if (!childCounter[child.type]) childCounter[child.type] = 0;

                  // mapping 'input type' column
                  if (
                    childCounter[child.type] % 5 === 0 ||
                    childCounter[child.type] === 0
                  ) {
                    const textValueCounter = childCounter[child.type]
                      ? childCounter[child.type] / 5
                      : 0;
                    if (
                      questionColMapping[
                      `${child.type}-textValue-${textValueCounter}`
                      ]
                    )
                      crrWorksheet.getCell(
                        `${questionColMapping[
                        `${child.type}-textValue-${textValueCounter}`
                        ]
                        }${startRowIndex + counter}`
                      ).value = child.textValue;
                  }

                  if (
                    userCharges.includes(child.type) &&
                    child?.year &&
                    questionColMapping[
                    `${child.type}-${child.textValue.replace(/ /g, "")}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]
                    }`
                    ]
                  ) {
                    crrWorksheet.getCell(
                      `${questionColMapping[
                      `${child.type}-${child.textValue.replace(/ /g, "")}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]
                      }`
                      ]
                      }${startRowIndex + counter}`
                    ).value = child.value;
                  }

                  if (
                    child?.year &&
                    questionColMapping[
                    `${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]
                    }-${child.replicaNumber - 1}`
                    ]
                  ) {
                    crrWorksheet.getCell(
                      `${questionColMapping[
                      `${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]
                      }-${child.replicaNumber - 1}`
                      ]
                      }${startRowIndex + counter}`
                    ).value = child.value;
                  }
                  childCounter[child.type]++;
                }
              }
            }
          }
          counter++;
        
      }
    }
      );
      cursor.on("end", () => {
        resolve({ crrWorkbook, filename, tempFilePath })
      });
    } catch (err) {
      console.log("err", err)
      console.log("error in excelPTOMapping ::::: ", err.message)
      reject(err)
    }
  })

}

/**
 * Filters the current status of a form element and removes certain data fields based on the status.
 * @param {*} el - The form element with a 'currentFormStatus' property.
 */
function currentStatusFilter(el) {
  if (el.currentFormStatus == MASTER_FORM_STATUS['NOT_STARTED'] || el.currentFormStatus == MASTER_FORM_STATUS['IN_PROGRESS'] || el.currentFormStatus == MASTER_FORM_STATUS['UNDER_REVIEW_BY_STATE']) {
    delete el?.stateStatusData;
    delete el?.mohuaStatusData;
  } else if (el.currentFormStatus == MASTER_FORM_STATUS['UNDER_REVIEW_BY_MoHUA'] || el.currentFormStatus == MASTER_FORM_STATUS['RETURNED_BY_STATE']) {
    delete el?.mohuaStatusData;
  }
}