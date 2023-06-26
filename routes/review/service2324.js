const Ulb = require('../../models/Ulb')
const State = require('../../models/State');
const CollectionNames = require('../../util/collectionName')
const Response = require("../../service").response;
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require('../../service');
const STATUS_LIST = require('../../util/newStatusList');
const { MASTER_STATUS, MASTER_STATUS_ID, YEAR_CONSTANTS, YEAR_CONSTANTS_IDS, MASTER_FORM_STATUS, MASTER_FORM_QUESTION_STATUS } = require('../../util/FormNames');
const { canTakeActionOrViewOnlyMasterForm } = require('../../routes/CommonActionAPI/service')
// const { createDynamicColumns } = require('./service')
const List = require('../../util/15thFCstatus')
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
      formStatus: "Form Status"

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
    let title_value = formTab.role == 'ULB' ? 'Review Grant Application' : 'Review State Forms';

    if ((loggedInUserRole == "MoHUA" || loggedInUserRole == "ADMIN") && title_value === "Review Grant Application") {
      delete ulbColumnNames['stateName']
    }

    let dbCollectionName = formTab?.dbCollectionName
    let formType = formTab.role
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
    let folderName = formTab?.folderName;
    let params = { collectionName, formType, isFormOptional, state, design_year, csv, skip, limit, newFilter, dbCollectionName, folderName }
    let query = computeQuery(params);

    if (getQuery) return res.json({ query: query[0] })
    // if csv - then no skip and limit, else with skip and limit
    let data = formType == "ULB" ? Ulb.aggregate(query[0]).allowDiskUse(true) : State.aggregate(query[0]).allowDiskUse(true)

    let allData = await Promise.all([data]);
    data = allData[0][0].data
    total = allData[0][0]['count']?.length ? allData[0][0]['count'][0].total : 0
    if (!data.length) {
      return res.status(200).json({ success: true, message: "Data not found" })
    }
    let approvedUlbs = await forms2223(collectionName, data);
    await setCurrentStatus(req, data, approvedUlbs, collectionName, loggedInUserRole);
    // if users clicks on Download Button - the data gets downloaded as per the applied filter
    let ratingList = []
    if (['ODF', 'GFC'].includes(collectionName)) {
      let ratingIds = [...new Set(data.map(e => e?.formData?.rating))].filter(e => e !== undefined)
      ratingList = ratingIds.length ? await getRating(ratingIds) : [];
    }
    if (csv) {
      await createCSV(formType, collectionName, res, data, ratingList);
      res.end();
      return;
    }
    if (collectionName === CollectionNames.state_gtc || collectionName === CollectionNames.state_grant_alloc) {
      data.forEach((element) => {
        let { status, pending } = countStatusData(element, collectionName);
        element.formStatus = status;
        if (pending > 0 && collectionName === CollectionNames.state_gtc) {
          element.cantakeAction = true;
        }
      });
    }
    //  console.log(data)
    data.forEach(el => { if (el.formData || el.formData === "") delete el.formData })
    const Query15FC = { $or: [{ type: "15thFC" }, { multi: { $in: ["15thFC"] } }] };
    const ulbFormStatus = await MASTERSTATUS.find(Query15FC, { statusId: 1, status: 1 }).lean()
    return res.status(200).json({
      success: true,
      data: data,
      total: total,
      columnNames: formType == 'ULB' ? ulbColumnNames : stateColumnNames,
      statusList: formType == 'ULB' ? ulbFormStatus : List.stateFormStatus,
      ulbType: formType == 'ULB' ? List.ulbType : {},
      populationType: formType == 'ULB' ? List.populationType : {},
      title: formType == 'ULB' ? 'Review Grant Application' : 'Review State Forms'
    })
  } catch (error) {
    console.log("error", error)
    return Response.BadRequest(res, {}, error.message);
  }
}

async function createCSV(formType, collectionName, res, data, ratingList) {
  let filename = `Review_${formType}-${collectionName}.csv`;
  // Set appropriate download headers
  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  let fixedColumns, dynamicColumns;
  if (formType === 'ULB') {
    fixedColumns = `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name,`;
    dynamicColumns = createDynamicColumns(collectionName);
    // console.log("dynamicColumns",dynamicColumns);process.exit()
    if (collectionName !== CollectionNames.annual && collectionName !== CollectionNames['28SLB']) {
      res.write("\ufeff" + `${fixedColumns.toString()} ${dynamicColumns.toString()} \r\n`);
      for (let el of data) {
        if (['ODF', 'GFC'].includes(collectionName)) await setRating(el, ratingList);
        let dynamicElementData = await createDynamicElements(collectionName, formType, el);
        el.UA = el.UA === "null" ? "NA" : el.UA;
        el.isUA = el.UA === "NA" ? "No" : "Yes";
        el.censusCode = el.censusCode || "NA";
        const row = `${el.stateName},${el.ulbName},${el.ulbCode},${el.censusCode},${el.populationType},${el.isUA},${el.UA},${dynamicElementData.toString()}\r\n`;
        res.write("\ufeff" + row);
      }
    } else {
      res.write("\ufeff" + `State Name, ULB Name, City Finance Code, Census Code, Population Category, UA, UA Name, ${dynamicColumns.toString()}\r\n`);
      for (let el of data) {
        let [row1, row2] = await createDynamicElements(collectionName, formType, el);
        el.UA = el.UA === "null" ? "NA" : el.UA;
        el.isUA = el.UA === "NA" ? "No" : "Yes";
        el.censusCode = el.censusCode || "NA";
        const rowOne = `${el.stateName},${el.ulbName},${el.ulbCode},${el.censusCode},${el.populationType},${el.isUA},${el.UA},${row1.toString()}\r\n`;
        const rowTwo = `${el.stateName},${el.ulbName},${el.ulbCode},${el.censusCode},${el.populationType},${el.isUA},${el.UA},${row2.toString()}\r\n`;
        res.write("\ufeff" + rowOne + rowTwo);
      }
    }
  } else if (formType === "STATE") {
    fixedColumns = `State Name, City Finance Code, Regional Name,`;
    dynamicColumns = createDynamicColumns(collectionName);
    res.write("\ufeff" + `${fixedColumns.toString()} ${dynamicColumns.toString()} \r\n`);
    for (let el of data) {
      let dynamicElementData = await createDynamicElements(collectionName, formType, el);
      const row = `${el.stateName},${el.stateCode},${el.regionalName},${dynamicElementData.toString()}\r\n`;
      res.write("\ufeff" + row);
    }
  }
}

async function forms2223(collectionName, data) {
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

const setCurrentStatus = (req, data, approvedUlbs, collectionName, loggedInUserRole) => {
  data.forEach(el => {
    if (!el.formData) {
      el['formStatus'] = "Not Started";
      el['cantakeAction'] = false;
    } else {
      if (collectionName === CollectionNames.dur || collectionName === CollectionNames['28SLB']) {
        el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]
        let params = { status: el.formData.currentFormStatus, userRole: loggedInUserRole }
        el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnlyMasterForm(params);
        if (!(approvedUlbs.find(ulb => ulb.toString() === el.ulbId.toString())) && loggedInUserRole === "MoHUA") {
          el['cantakeAction'] = false
        }
      } else {
        let params = { status: el.formData.currentFormStatus, userRole: loggedInUserRole }
        el['cantakeAction'] = req.decoded.role === "ADMIN" ? false : canTakeActionOrViewOnlyMasterForm(params);
        el['formStatus'] = MASTER_STATUS_ID[el.formData.currentFormStatus]
      }
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
const getRating = async (ratingId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let d = await Rating.find({ "_id": { $in: ratingId } }, { "name": 1, "marks": 1 }).lean();
      resolve(d)
    } catch (error) {
      reject(error)
    }
  })
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
    let ulbArray = [];
    for (let form of forms) {
      if (form.actionTakenByRole === "MoHUA" && !form.isDraft && form.status === "APPROVED") {
        ulbArray.push(form.ulb);
      }
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
  const { collectionName: formName, formType: userRole, isFormOptional, state, design_year, csv, skip, limit, newFilter: filter, dbCollectionName, folderName } = params
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
  let condition = {};
  if (state && state !== 'null') {
    condition['state'] = ObjectId(state)
  }
  condition["access_2223"] = true
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
      }
      query.push({
        $facet: {
          data: limitSkip,
          count: [{ $count: "total" }]
        }
      })
      return [query]
    case "STATE":
      let query_s = [
        {
          $match: {
            accessToXVFC: true,
          },
        },
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
          $project: {
            state: "$_id",
            stateName: "$name",
            stateCode: "$code",
            regionalName: 1,
            formData: { $ifNull: [`$${dbCollectionName}`, ""] },
            filled:
            {
              $cond: { if: { $or: [{ $eq: ["$formData", ""] }, { $eq: ["$formData.isDraft", true] }] }, then: "No", else: isFormOptional ? filledQueryExpression : "Yes" }
            }
          },
        },
        {
          $sort: { formData: -1 },
        },
      ];
      query_s = createDynamicQuery(formName, query_s, userRole, csv);
      /* Checking if the user role is STATE and the folder name is IndicatorForWaterSupply. */
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
      let filterApplied_s = Object.keys(filter).length > 0
      if (filterApplied_s) {
        query_s.push({
          $match: filter
        },
        )
      }
      let countQuery_s = query_s.slice()
      let paginator_s = [{
        $facet: {
          data: [{ "$skip": skip }, { $limit: limit }],
          count: [{ $count: "totalRecords" }]
        }
      }]
      if (!csv) {
        console.log("ssss")
        query_s.push(...paginator_s)
      }
      return [query_s, countQuery_s]
    default:
      break;
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
 * The function removes escape characters from specific properties of an object.
 * @param element - an object that contains properties with values that may have escape characters
 */
function removeEscapesFromAnnual(element) {
  for (let key in element) {
    if (element[key] && typeof element[key] === "object") {
      if (element[key].hasOwnProperty("rejectReason_state")) {
        element[key]["rejectReason_state"] = removeEscapeChars(element[key]["rejectReason_state"]);
      }
      if (element[key].hasOwnProperty("rejectReason_mohua")) {
        element[key]["rejectReason_mohua"] = removeEscapeChars(element[key]["rejectReason_mohua"]);
      }
    }
  }
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
                status: { $push: "$formData.status" },
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
            }
          }
          oldQuery.push(query_2);
          break;
      }
  }
  return oldQuery;
}

async function createDynamicElements(collectionName, formType, entity) {
  if (!entity.formData) {
    entity["filled"] = "No";
    entity['formData'] = createDynamicObject(collectionName, formType);
  }
  let actions = actionTakenByResponse(entity.formData, entity.formStatus, formType, collectionName);


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
          if (entity?.formData.certDate) {
            entity["formData"]["certDate"] = formatDate(
              entity?.formData.certDate
            );
          }
          if (!entity?.formData.certDate) {
            entity.formData.certDate = "";
          }
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

          removeEscapesFromAnnual(unAuditedProvisional);
          removeEscapesFromAnnual(auditedProvisional);
          removeEscapesFromAnnual(unAuditedStandardized);
          removeEscapesFromAnnual(auditedStandardized);

          if (data.audited.rejectReason_mohua) {
            data.audited.rejectReason_mohua = removeEscapeChars(data?.audited?.rejectReason_mohua);
          }
          if (data.audited.rejectReason_state) {
            data.audited.rejectReason_state = removeEscapeChars(data?.audited?.rejectReason_state);
          }
          if (data.unAudited.rejectReason_mohua) {
            data.unAudited.rejectReason_mohua = removeEscapeChars(data?.unAudited?.rejectReason_mohua);
          }
          if (data.unAudited.rejectReason_state) {
            data.unAudited.rejectReason_state = removeEscapeChars(data?.unAudited?.rejectReason_state);
          }

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
            wmData = await convertValue({ data: categoryWiseData_wm, keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"] });
          }
          if (categoryWiseData_swm && categoryWiseData_swm.length > 0) {
            swmData = await convertValue({ data: categoryWiseData_swm, keyArr: ["grantUtilised", "numberOfProjects", "totalProjectCost"] });
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
  }
  return entity;
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
      let statusTab = currentStatusList.filter(e => e.shortKey == `tab_${key}`);
      statusTab = statusTab.length ? statusTab : currentStatusList;
      let tab = setCurrentStatusQuestionLevel(statusTab)
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
const setCurrentStatusQuestionLevel = (statusList) => {
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
  if (statusList.length) {
    for (let statusObj of statusList) {
      if (statusObj.actionTakenByRole == "STATE") {
        obj['state_status'] = MASTER_FORM_QUESTION_STATUS[statusObj.status]
        obj['rejectReason_state'] = statusObj.rejectReason
        obj['responseFile_state'] = statusObj.responseFile
      } else {
        obj['mohua_status'] = MASTER_FORM_QUESTION_STATUS[statusObj.status]
        obj['rejectReason_mohua'] = statusObj.rejectReason
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
      columns = `Financial Year,Form Status,Created,Submitted On,Filled Status,Type,Year,Coverage of water supply connections,Per capita supply of water(lpcd),Extent of metering of water connections,Continuity of water supply,Quality of water supplied,Efficiency in redressal of customer complaints,Cost recovery in water supply service,Efficiency in collection of water supply-related charges,Extent of non-revenue water (NRW),Coverage of toilets,Coverage of waste water network services,Collection efficiency of waste water network,Adequacy of waste water treatment capacity,Quality of waste water treatment,Extent of reuse and recycling of waste water,Efficiency in collection of waste water charges,Efficiency in redressal of customer complaints,Extent of cost recovery in waste water management,Household level coverage of solid waste management services,Extent of segregation of municipal solid waste,Extent of municipal solid waste recovered,Extent of cost recovery in SWM services,Efficiency in collection of SWM related user related charges,Efficiency of collection of municipal solid waste,Extent of scientific disposal of municipal solid waste,Efficiency in redressal of customer complaints,Incidence of water logging,Coverage of storm water drainage network,State_Review Status,State_Comments,MoHUA Review Status,MoHUA_Comments,State_File URL,MoHUA_File URL `
      break;
    default:
      columns = '';
      break;
  }
  return columns;
}

function actionTakenByResponse(entity, formStatus, formType, collectionName) {
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

  if (collectionName === CollectionNames['annual']) {
    obj.auditedResponseFile_state = {
      url: "",
      name: ""
    };
    obj.unAuditedResponseFile_state = {
      url: "",
      name: ""
    };
    obj.auditedResponseFile_mohua = {
      url: "",
      name: ""
    };
    obj.unAuditedResponseFile_mohua = {
      url: "",
      name: ""
    };
  }

  if (
    formStatus === STATUS_LIST.Under_Review_By_MoHUA ||
    formStatus === STATUS_LIST.Rejected_By_State
  ) {
    if (entity["rejectReason_state"]) {
      obj.rejectReason_state = removeEscapeChars(entity["rejectReason_state"]);
    }
    if (entity["responseFile_state"]) {
      entity["responseFile_state"]["name"] = removeEscapeChars(entity["responseFile_state"]["name"])
      obj.responseFile_state = entity["responseFile_state"];
    }
    if (entity["status"]) {
      obj.state_status = entity["status"];
    }
    if (collectionName === CollectionNames['annual']) {
      if (entity.audited.responseFile_state) {
        entity.audited.responseFile_state.name = removeEscapeChars(entity.audited.responseFile_state?.name)
        obj.auditedResponseFile_state = entity.audited.responseFile_state;
      }
      if (entity.unAudited.responseFile_state) {
        entity.unAudited.responseFile_state.name = removeEscapeChars(entity.unAudited.responseFile_state?.name)
        obj.unAuditedResponseFile_state = entity.unAudited.responseFile_state;
      }
    }
  }

  if (
    formStatus === STATUS_LIST.Approved_By_MoHUA ||
    formStatus === STATUS_LIST.Rejected_By_MoHUA
  ) {
    if (entity["rejectReason_mohua"]) {
      obj.rejectReason_mohua = removeEscapeChars(entity["rejectReason_mohua"]);
    }
    if (entity["responseFile_mohua"]) {
      entity["responseFile_mohua"]["name"] = removeEscapeChars(entity["responseFile_mohua"]["name"])
      obj.responseFile_mohua = entity["responseFile_mohua"];
    }
    if (entity["status"]) {
      obj.mohua_status = entity["status"];
    }
    if (collectionName === CollectionNames['annual']) {
      if (entity.audited.responseFile_mohua) {
        entity.audited.responseFile_mohua.name = removeEscapeChars(entity.audited.responseFile_mohua?.name)
        obj.auditedResponseFile_mohua = entity.audited.responseFile_mohua;
      }
      if (entity.unAudited.responseFile_mohua) {
        entity.unAudited.responseFile_mohua.name = removeEscapeChars(entity.unAudited.responseFile_mohua?.name)
        obj.unAuditedResponseFile_mohua = entity.unAudited.responseFile_mohua;
      }
    }
    mohuaFlag = false;
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
          obj['rejectReason_state'] = pf.rejectReason
          obj['responseFile_state'] = pf.responseFile
        } else {
          obj['mohua_status'] = MASTER_FORM_QUESTION_STATUS[pf.status]
          obj['rejectReason_mohua'] = pf.rejectReason
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

const getQuestionsMapping = (questions, counter = 0) => {
  const questionColMapping = {}
  for (const key in questions) {
    const crrQuestion = questions[key]
    if (crrQuestion.copyChildFrom?.length) {
      if (["otherValuePropertyType", "otherValueSewerageType", "othersValueWaterType"].includes(key)) {
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
            if (!["userChargesDmndChild", "userChargesCollectionChild"].includes(child.key)) {
              questionColMapping[`${child.key}-textValue-${i}`] = this.getExcelCol(counter)
              counter++
            }
            for (const year of child.yearData) {
              if (Object.keys(year).length) {
                questionColMapping[`${child.key}-${year.key.split("-")[1]}-${i}`] = this.getExcelCol(counter)
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
    const questions = propertyTaxOpFormJson()['tabs'][0]['data']
    const startRowIndex = 5;
    const questionColMapping = getQuestionsMapping(questions, 8)
    // const questionColMapping = jdoson
    console.log(":::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::")
    // jdoson
    // return questionColMapping;
    // return res.status(400).json({ success: false, message: "State code is mandatory", "questionColMapping": questionColMapping })


    // console.log("questionColMapping", JSON.stringify(questionColMapping, 0, 3));
    let { getQuery } = req.query
    getQuery = getQuery === "true"
    const design_year = ObjectId(years['2023-24'])
    if (getQuery) {
      response.query = getQuery
      return response
    }

    let counter = 0;
    const timestamp = Date.now()

    const tempFilePath = "uploads/p-tax"
    if (!fs.existsSync(tempFilePath)) {
      fs.mkdirSync(tempFilePath);
    }
    var myfilepath = `${tempFilePath}/${timestamp}_ptax_download.xlsx`;

    const template = fs.readFileSync(`p-tax/ptax-template.xlsx`)
    fs.writeFileSync(`${tempFilePath}/${timestamp}_ptax_download.xlsx`, template)
    const workbook = new ExcelJS.Workbook()
    workbook.calcProperties.fullCalcOnLoad = false;

    const crrWorkbook = await workbook.xlsx.readFile(`${tempFilePath}/${timestamp}_ptax_download.xlsx`)
    const crrWorksheet = crrWorkbook.getWorksheet("Sheet 1")

    // if (!req.query.state_code)
    //   return res.status(400).json({ success: false, message: "State code is mandatory" })

    // let stateCode = req.query.state_code.split(",").map(e => e.trim())

    const cursor = await PropertyTaxOp.aggregate([
      { $match: { "design_year": design_year } },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb"
        }
      },
      { $unwind: "$ulb" },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state"
        }
      },
      { $unwind: "$state" },
      // { $match: { "state.code": { $in: stateCode } } },
      {
        $lookup: {
          from: "propertytaxopmappers",
          localField: "_id",
          foreignField: "ptoId",
          as: "propertytaxopmapper"
        }
      },
      {
        $lookup: {
          from: "propertymapperchilddatas",
          localField: "_id",
          foreignField: "ptoId",
          as: "propertymapperchilddata"
        }
      },
      // { $limit: 5 }
    ]).allowDiskUse(true)
      .cursor({ batchSize: 100 })
      .addCursorFlag("noCursorTimeout", true)
      .exec();
    // crrWorksheet.properties.defaultRowHeight = null;
    // const outputStream = fs.createWriteStream(`${tempFilePath}/${timestamp}_ptax_download.xlsx`);
    // crrWorkbook.xlsx.write(outputStream);
    cursor.on("data", (el) => {
      crrWorksheet.getCell(`A${startRowIndex + counter}`).value = counter + 1
      crrWorksheet.getCell(`B${startRowIndex + counter}`).value = el.state.name
      crrWorksheet.getCell(`C${startRowIndex + counter}`).value = el.ulb.name
      crrWorksheet.getCell(`D${startRowIndex + counter}`).value = el.ulb.code
      crrWorksheet.getCell(`E${startRowIndex + counter}`).value = el.ulb.censusCode ?? el.ulb.sbCode
      crrWorksheet.getCell(`F${startRowIndex + counter}`).value = YEAR_CONSTANTS_IDS[el.design_year]
      crrWorksheet.getCell(`G${startRowIndex + counter}`).value = MASTER_STATUS_ID[el.currentFormStatus]

      // const positionValuePair = {
      //   [`A${startRowIndex + counter}`]: counter + 1,
      //   [`B${startRowIndex + counter}`]: el.state.name,
      //   [`C${startRowIndex + counter}`]: el.ulb.name,
      //   [`D${startRowIndex + counter}`]: el.ulb.code,
      //   [`E${startRowIndex + counter}`]: el.ulb.censusCode ?? el.ulb.sbCode,
      //   // [`F${startRowIndex + counter}`]: getKeyByValue(years, el.design_year.toString()),
      //   [`F${startRowIndex + counter}`]: YEAR_CONSTANTS_IDS[el.design_year],
      //   [`G${startRowIndex + counter}`]: MASTER_STATUS_ID[el.currentFormStatus],
      // }

      const sortedResults = el.propertytaxopmapper;
      for (const result of sortedResults) {
        if (result?.year && questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]) {
          crrWorksheet.getCell(`${questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]}${startRowIndex + counter}`).value = result.value
          // positionValuePair[`${questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]}${startRowIndex + counter}`] = result.value;
        }
        // if (!canShow(result.type, sortedResults, updatedDatas, el.ulb._id)) continue;
        if (result.child && result.child.length) {
          const childCounter = new Map();
          for (const childId of result.child) {
            const child = el?.propertymapperchilddata?.length > 0 ? el?.propertymapperchilddata.find(e => e._id.toString() === childId.toString()) : null;
            // const number = decideDisplayPriority(0, child.type, result.displayPriority, child.replicaNumber, result.type);
            // child.displayPriority = number;
            if (child) {
              if (!childCounter.has(child.type))
                childCounter.set(child.type, 0);

              if ((childCounter.get(child.type) % 5 === 0 || childCounter.get(child.type) === 0)) {
                const textValueCounter = childCounter.get(child.type) ? childCounter.get(child.type) / 5 : 0;
                if (questionColMapping[`${child.type}-textValue-${textValueCounter}`])
                  crrWorksheet.getCell(`${questionColMapping[`${child.type}-textValue-${textValueCounter}`]}${startRowIndex + counter}`).value = child.textValue
                // positionValuePair[`${questionColMapping[`${child.type}-textValue-${textValueCounter}`]}${startRowIndex + counter}`] = child.textValue;
              }

              if (child?.year && questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]) {
                crrWorksheet.getCell(`${questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]}${startRowIndex + counter}`).value = child.value
                // positionValuePair[`${questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]}${startRowIndex + counter}`] = child.value;
              }
              childCounter.set(child.type, childCounter.get(child.type) + 1);
            }
          }
        }
      }
      // for (const key in positionValuePair) {
      //   crrWorksheet.getCell(key).value = positionValuePair[key]
      // }

      // const crrTime2 = Date.now()
      // crrWorkbook.xlsx.writeFile(`${tempFilePath}/${timestamp}_ptax_download.xlsx`);
      // console.log(Date.now() - crrTime2, "-------write time----------")
      // crrWorkbook.commit();
      counter++
      console.log(counter, "---------loop time------")
    });
    cursor.on("end", async function (el) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader("Content-Disposition", "attachment; filename=" + `${timestamp}_ptax_download.xlsx`);
      await crrWorkbook.xlsx.write(res);
      fs.unlink(`${tempFilePath}/${timestamp}_ptax_download.xlsx`, (err) => console.log(err))
      return res.end();
    });
  } catch (err) {
    console.log("err", err)
    console.log("error in getCsvForPropertyTaxMapper ::::: ", err.message)
  }
}

module.exports.download = (req, res) => {
  var file = __dirname + `/../../uploads/p-tax/1687616674122_ptax_download.xlsx`;
  console.log("file :::::", file)
  res.download(file)
}

const jdoson = {
  "ulbCollectPtax-19": "I",
  "ulbFinancialYear-19": "J",
  "ulbPassedResolPtax-19": "K",
  "resolutionFile-19": "L",
  "notificationPropertyTax-19": "M",
  "notificationAdoptionDate-19": "N",
  "notificationIssuedBy-19": "O",
  "notificationFile-19": "P",
  "dmdIncludingCess-19": "Q",
  "dmdIncludingCess-20": "R",
  "dmdIncludingCess-21": "S",
  "dmdIncludingCess-22": "T",
  "dmdIncludingCess-23": "U",
  "cdmdIncludingCess-19": "V",
  "cdmdIncludingCess-20": "W",
  "cdmdIncludingCess-21": "X",
  "cdmdIncludingCess-22": "Y",
  "cdmdIncludingCess-23": "Z",
  "admdIncludingCess-19": "AA",
  "admdIncludingCess-20": "AB",
  "admdIncludingCess-21": "AC",
  "admdIncludingCess-22": "AD",
  "admdIncludingCess-23": "AE",
  "dmdexcludingCess-19": "AF",
  "dmdexcludingCess-20": "AG",
  "dmdexcludingCess-21": "AH",
  "dmdexcludingCess-22": "AI",
  "dmdexcludingCess-23": "AJ",
  "taxTypeDemandChild-textValue-0": "AL",
  "taxTypeDemandChild-19-0": "AM",
  "taxTypeDemandChild-20-0": "AN",
  "taxTypeDemandChild-21-0": "AO",
  "taxTypeDemandChild-22-0": "AP",
  "taxTypeDemandChild-23-0": "AQ",
  "taxTypeDemandChild-textValue-1": "AR",
  "taxTypeDemandChild-19-1": "AS",
  "taxTypeDemandChild-20-1": "AT",
  "taxTypeDemandChild-21-1": "AU",
  "taxTypeDemandChild-22-1": "AV",
  "taxTypeDemandChild-23-1": "AW",
  "taxTypeDemandChild-textValue-2": "AX",
  "taxTypeDemandChild-19-2": "AY",
  "taxTypeDemandChild-20-2": "AZ",
  "taxTypeDemandChild-21-2": "BA",
  "taxTypeDemandChild-22-2": "BB",
  "taxTypeDemandChild-23-2": "BC",
  "taxTypeDemandChild-textValue-3": "BD",
  "taxTypeDemandChild-19-3": "BE",
  "taxTypeDemandChild-20-3": "BF",
  "taxTypeDemandChild-21-3": "BG",
  "taxTypeDemandChild-22-3": "BH",
  "taxTypeDemandChild-23-3": "BI",
  "taxTypeDemandChild-textValue-4": "BJ",
  "taxTypeDemandChild-19-4": "BK",
  "taxTypeDemandChild-20-4": "BL",
  "taxTypeDemandChild-21-4": "BM",
  "taxTypeDemandChild-22-4": "BN",
  "taxTypeDemandChild-23-4": "BO",
  "taxTypeDemandChild-textValue-5": "BP",
  "taxTypeDemandChild-19-5": "BQ",
  "taxTypeDemandChild-20-5": "BR",
  "taxTypeDemandChild-21-5": "BS",
  "taxTypeDemandChild-22-5": "BT",
  "taxTypeDemandChild-23-5": "BU",
  "taxTypeDemandChild-textValue-6": "BV",
  "taxTypeDemandChild-19-6": "BW",
  "taxTypeDemandChild-20-6": "BX",
  "taxTypeDemandChild-21-6": "BY",
  "taxTypeDemandChild-22-6": "BZ",
  "taxTypeDemandChild-23-6": "CA",
  "taxTypeDemandChild-textValue-7": "CB",
  "taxTypeDemandChild-19-7": "CC",
  "taxTypeDemandChild-20-7": "CD",
  "taxTypeDemandChild-21-7": "CE",
  "taxTypeDemandChild-22-7": "CF",
  "taxTypeDemandChild-23-7": "CG",
  "taxTypeDemandChild-textValue-8": "CH",
  "taxTypeDemandChild-19-8": "CI",
  "taxTypeDemandChild-20-8": "CJ",
  "taxTypeDemandChild-21-8": "CK",
  "taxTypeDemandChild-22-8": "CL",
  "taxTypeDemandChild-23-8": "CM",
  "taxTypeDemandChild-textValue-9": "CN",
  "taxTypeDemandChild-19-9": "CO",
  "taxTypeDemandChild-20-9": "CP",
  "taxTypeDemandChild-21-9": "CQ",
  "taxTypeDemandChild-22-9": "CR",
  "taxTypeDemandChild-23-9": "CS",
  "cessDemandChild-textValue-0": "CU",
  "cessDemandChild-19-0": "CV",
  "cessDemandChild-20-0": "CW",
  "cessDemandChild-21-0": "CX",
  "cessDemandChild-22-0": "CY",
  "cessDemandChild-23-0": "CZ",
  "cessDemandChild-textValue-1": "DA",
  "cessDemandChild-19-1": "DB",
  "cessDemandChild-20-1": "DC",
  "cessDemandChild-21-1": "DD",
  "cessDemandChild-22-1": "DE",
  "cessDemandChild-23-1": "DF",
  "cessDemandChild-textValue-2": "DG",
  "cessDemandChild-19-2": "DH",
  "cessDemandChild-20-2": "DI",
  "cessDemandChild-21-2": "DJ",
  "cessDemandChild-22-2": "DK",
  "cessDemandChild-23-2": "DL",
  "cessDemandChild-textValue-3": "DM",
  "cessDemandChild-19-3": "DN",
  "cessDemandChild-20-3": "DO",
  "cessDemandChild-21-3": "DP",
  "cessDemandChild-22-3": "DQ",
  "cessDemandChild-23-3": "DR",
  "cessDemandChild-textValue-4": "DS",
  "cessDemandChild-19-4": "DT",
  "cessDemandChild-20-4": "DU",
  "cessDemandChild-21-4": "DV",
  "cessDemandChild-22-4": "DW",
  "cessDemandChild-23-4": "DX",
  "cessDemandChild-textValue-5": "DY",
  "cessDemandChild-19-5": "DZ",
  "cessDemandChild-20-5": "EA",
  "cessDemandChild-21-5": "EB",
  "cessDemandChild-22-5": "EC",
  "cessDemandChild-23-5": "ED",
  "cessDemandChild-textValue-6": "EE",
  "cessDemandChild-19-6": "EF",
  "cessDemandChild-20-6": "EG",
  "cessDemandChild-21-6": "EH",
  "cessDemandChild-22-6": "EI",
  "cessDemandChild-23-6": "EJ",
  "cessDemandChild-textValue-7": "EK",
  "cessDemandChild-19-7": "EL",
  "cessDemandChild-20-7": "EM",
  "cessDemandChild-21-7": "EN",
  "cessDemandChild-22-7": "EO",
  "cessDemandChild-23-7": "EP",
  "cessDemandChild-textValue-8": "EQ",
  "cessDemandChild-19-8": "ER",
  "cessDemandChild-20-8": "ES",
  "cessDemandChild-21-8": "ET",
  "cessDemandChild-22-8": "EU",
  "cessDemandChild-23-8": "EV",
  "cessDemandChild-textValue-9": "EW",
  "cessDemandChild-19-9": "EX",
  "cessDemandChild-20-9": "EY",
  "cessDemandChild-21-9": "EZ",
  "cessDemandChild-22-9": "FA",
  "cessDemandChild-23-9": "FB",
  "doesUserChargesDmnd-19": "FC",
  "userChargesDmndChild-19-0": "FE",
  "userChargesDmndChild-20-0": "FF",
  "userChargesDmndChild-21-0": "FG",
  "userChargesDmndChild-22-0": "FH",
  "userChargesDmndChild-23-0": "FI",
  "userChargesDmndChild-19-1": "FJ",
  "userChargesDmndChild-20-1": "FK",
  "userChargesDmndChild-21-1": "FL",
  "userChargesDmndChild-22-1": "FM",
  "userChargesDmndChild-23-1": "FN",
  "userChargesDmndChild-19-2": "FO",
  "userChargesDmndChild-20-2": "FP",
  "userChargesDmndChild-21-2": "FQ",
  "userChargesDmndChild-22-2": "FR",
  "userChargesDmndChild-23-2": "FS",
  "userChargesDmndChild-19-3": "FT",
  "userChargesDmndChild-20-3": "FU",
  "userChargesDmndChild-21-3": "FV",
  "userChargesDmndChild-22-3": "FW",
  "userChargesDmndChild-23-3": "FX",
  "userChargesDmndChild-19-4": "FY",
  "userChargesDmndChild-20-4": "FZ",
  "userChargesDmndChild-21-4": "GA",
  "userChargesDmndChild-22-4": "GB",
  "userChargesDmndChild-23-4": "GC",
  "collectIncludingCess-19": "GD",
  "collectIncludingCess-20": "GE",
  "collectIncludingCess-21": "GF",
  "collectIncludingCess-22": "GG",
  "collectIncludingCess-23": "GH",
  "cuCollectIncludingCess-19": "GI",
  "cuCollectIncludingCess-20": "GJ",
  "cuCollectIncludingCess-21": "GK",
  "cuCollectIncludingCess-22": "GL",
  "cuCollectIncludingCess-23": "GM",
  "arCollectIncludingCess-19": "GN",
  "arCollectIncludingCess-20": "GO",
  "arCollectIncludingCess-21": "GP",
  "arCollectIncludingCess-22": "GQ",
  "arCollectIncludingCess-23": "GR",
  "collectExcludingCess-19": "GS",
  "collectExcludingCess-20": "GT",
  "collectExcludingCess-21": "GU",
  "collectExcludingCess-22": "GV",
  "collectExcludingCess-23": "GW",
  "taxTypeCollectionChild-textValue-0": "GY",
  "taxTypeCollectionChild-19-0": "GZ",
  "taxTypeCollectionChild-20-0": "HA",
  "taxTypeCollectionChild-21-0": "HB",
  "taxTypeCollectionChild-22-0": "HC",
  "taxTypeCollectionChild-23-0": "HD",
  "taxTypeCollectionChild-textValue-1": "HE",
  "taxTypeCollectionChild-19-1": "HF",
  "taxTypeCollectionChild-20-1": "HG",
  "taxTypeCollectionChild-21-1": "HH",
  "taxTypeCollectionChild-22-1": "HI",
  "taxTypeCollectionChild-23-1": "HJ",
  "taxTypeCollectionChild-textValue-2": "HK",
  "taxTypeCollectionChild-19-2": "HL",
  "taxTypeCollectionChild-20-2": "HM",
  "taxTypeCollectionChild-21-2": "HN",
  "taxTypeCollectionChild-22-2": "HO",
  "taxTypeCollectionChild-23-2": "HP",
  "taxTypeCollectionChild-textValue-3": "HQ",
  "taxTypeCollectionChild-19-3": "HR",
  "taxTypeCollectionChild-20-3": "HS",
  "taxTypeCollectionChild-21-3": "HT",
  "taxTypeCollectionChild-22-3": "HU",
  "taxTypeCollectionChild-23-3": "HV",
  "taxTypeCollectionChild-textValue-4": "HW",
  "taxTypeCollectionChild-19-4": "HX",
  "taxTypeCollectionChild-20-4": "HY",
  "taxTypeCollectionChild-21-4": "HZ",
  "taxTypeCollectionChild-22-4": "IA",
  "taxTypeCollectionChild-23-4": "IB",
  "taxTypeCollectionChild-textValue-5": "IC",
  "taxTypeCollectionChild-19-5": "ID",
  "taxTypeCollectionChild-20-5": "IE",
  "taxTypeCollectionChild-21-5": "IF",
  "taxTypeCollectionChild-22-5": "IG",
  "taxTypeCollectionChild-23-5": "IH",
  "taxTypeCollectionChild-textValue-6": "II",
  "taxTypeCollectionChild-19-6": "IJ",
  "taxTypeCollectionChild-20-6": "IK",
  "taxTypeCollectionChild-21-6": "IL",
  "taxTypeCollectionChild-22-6": "IM",
  "taxTypeCollectionChild-23-6": "IN",
  "taxTypeCollectionChild-textValue-7": "IO",
  "taxTypeCollectionChild-19-7": "IP",
  "taxTypeCollectionChild-20-7": "IQ",
  "taxTypeCollectionChild-21-7": "IR",
  "taxTypeCollectionChild-22-7": "IS",
  "taxTypeCollectionChild-23-7": "IT",
  "taxTypeCollectionChild-textValue-8": "IU",
  "taxTypeCollectionChild-19-8": "IV",
  "taxTypeCollectionChild-20-8": "IW",
  "taxTypeCollectionChild-21-8": "IX",
  "taxTypeCollectionChild-22-8": "IY",
  "taxTypeCollectionChild-23-8": "IZ",
  "taxTypeCollectionChild-textValue-9": "JA",
  "taxTypeCollectionChild-19-9": "JB",
  "taxTypeCollectionChild-20-9": "JC",
  "taxTypeCollectionChild-21-9": "JD",
  "taxTypeCollectionChild-22-9": "JE",
  "taxTypeCollectionChild-23-9": "JF",
  "cessCollectChild-textValue-0": "JH",
  "cessCollectChild-19-0": "JI",
  "cessCollectChild-20-0": "JJ",
  "cessCollectChild-21-0": "JK",
  "cessCollectChild-22-0": "JL",
  "cessCollectChild-23-0": "JM",
  "cessCollectChild-textValue-1": "JN",
  "cessCollectChild-19-1": "JO",
  "cessCollectChild-20-1": "JP",
  "cessCollectChild-21-1": "JQ",
  "cessCollectChild-22-1": "JR",
  "cessCollectChild-23-1": "JS",
  "cessCollectChild-textValue-2": "JT",
  "cessCollectChild-19-2": "JU",
  "cessCollectChild-20-2": "JV",
  "cessCollectChild-21-2": "JW",
  "cessCollectChild-22-2": "JX",
  "cessCollectChild-23-2": "JY",
  "cessCollectChild-textValue-3": "JZ",
  "cessCollectChild-19-3": "KA",
  "cessCollectChild-20-3": "KB",
  "cessCollectChild-21-3": "KC",
  "cessCollectChild-22-3": "KD",
  "cessCollectChild-23-3": "KE",
  "cessCollectChild-textValue-4": "KF",
  "cessCollectChild-19-4": "KG",
  "cessCollectChild-20-4": "KH",
  "cessCollectChild-21-4": "KI",
  "cessCollectChild-22-4": "KJ",
  "cessCollectChild-23-4": "KK",
  "cessCollectChild-textValue-5": "KL",
  "cessCollectChild-19-5": "KM",
  "cessCollectChild-20-5": "KN",
  "cessCollectChild-21-5": "KO",
  "cessCollectChild-22-5": "KP",
  "cessCollectChild-23-5": "KQ",
  "cessCollectChild-textValue-6": "KR",
  "cessCollectChild-19-6": "KS",
  "cessCollectChild-20-6": "KT",
  "cessCollectChild-21-6": "KU",
  "cessCollectChild-22-6": "KV",
  "cessCollectChild-23-6": "KW",
  "cessCollectChild-textValue-7": "KX",
  "cessCollectChild-19-7": "KY",
  "cessCollectChild-20-7": "KZ",
  "cessCollectChild-21-7": "LA",
  "cessCollectChild-22-7": "LB",
  "cessCollectChild-23-7": "LC",
  "cessCollectChild-textValue-8": "LD",
  "cessCollectChild-19-8": "LE",
  "cessCollectChild-20-8": "LF",
  "cessCollectChild-21-8": "LG",
  "cessCollectChild-22-8": "LH",
  "cessCollectChild-23-8": "LI",
  "cessCollectChild-textValue-9": "LJ",
  "cessCollectChild-19-9": "LK",
  "cessCollectChild-20-9": "LL",
  "cessCollectChild-21-9": "LM",
  "cessCollectChild-22-9": "LN",
  "cessCollectChild-23-9": "LO",
  "userChargesCollectionChild-19-0": "LQ",
  "userChargesCollectionChild-20-0": "LR",
  "userChargesCollectionChild-21-0": "LS",
  "userChargesCollectionChild-22-0": "LT",
  "userChargesCollectionChild-23-0": "LU",
  "userChargesCollectionChild-19-1": "LV",
  "userChargesCollectionChild-20-1": "LW",
  "userChargesCollectionChild-21-1": "LX",
  "userChargesCollectionChild-22-1": "LY",
  "userChargesCollectionChild-23-1": "LZ",
  "userChargesCollectionChild-19-2": "MA",
  "userChargesCollectionChild-20-2": "MB",
  "userChargesCollectionChild-21-2": "MC",
  "userChargesCollectionChild-22-2": "MD",
  "userChargesCollectionChild-23-2": "ME",
  "userChargesCollectionChild-19-3": "MF",
  "userChargesCollectionChild-20-3": "MG",
  "userChargesCollectionChild-21-3": "MH",
  "userChargesCollectionChild-22-3": "MI",
  "userChargesCollectionChild-23-3": "MJ",
  "userChargesCollectionChild-19-4": "MK",
  "userChargesCollectionChild-20-4": "ML",
  "userChargesCollectionChild-21-4": "MM",
  "userChargesCollectionChild-22-4": "MN",
  "userChargesCollectionChild-23-4": "MO",
  "totalMappedPropertiesUlb-19": "MP",
  "totalMappedPropertiesUlb-20": "MQ",
  "totalMappedPropertiesUlb-21": "MR",
  "totalMappedPropertiesUlb-22": "MS",
  "totalMappedPropertiesUlb-23": "MT",
  "totalPropertiesTax-19": "MU",
  "totalPropertiesTax-20": "MV",
  "totalPropertiesTax-21": "MW",
  "totalPropertiesTax-22": "MX",
  "totalPropertiesTax-23": "MY",
  "totalPropertiesTaxDm-19": "MZ",
  "totalPropertiesTaxDm-20": "NA",
  "totalPropertiesTaxDm-21": "NB",
  "totalPropertiesTaxDm-22": "NC",
  "totalPropertiesTaxDm-23": "ND",
  "totalPropertiesTaxDmCollected-19": "NE",
  "totalPropertiesTaxDmCollected-20": "NF",
  "totalPropertiesTaxDmCollected-21": "NG",
  "totalPropertiesTaxDmCollected-22": "NH",
  "totalPropertiesTaxDmCollected-23": "NI",
  "resValuePropertyTaxDm-19": "NJ",
  "resValuePropertyTaxDm-20": "NK",
  "resValuePropertyTaxDm-21": "NL",
  "resValuePropertyTaxDm-22": "NM",
  "resValuePropertyTaxDm-23": "NN",
  "resNoPropertyTaxDm-19": "NO",
  "resNoPropertyTaxDm-20": "NP",
  "resNoPropertyTaxDm-21": "NQ",
  "resNoPropertyTaxDm-22": "NR",
  "resNoPropertyTaxDm-23": "NS",
  "resValuePropertyTaxCollected-19": "NT",
  "resValuePropertyTaxCollected-20": "NU",
  "resValuePropertyTaxCollected-21": "NV",
  "resValuePropertyTaxCollected-22": "NW",
  "resValuePropertyTaxCollected-23": "NX",
  "resNoPropertyTaxCollected-19": "NY",
  "resNoPropertyTaxCollected-20": "NZ",
  "resNoPropertyTaxCollected-21": "OA",
  "resNoPropertyTaxCollected-22": "OB",
  "resNoPropertyTaxCollected-23": "OC",
  "comValuePropertyTaxDm-19": "OD",
  "comValuePropertyTaxDm-20": "OE",
  "comValuePropertyTaxDm-21": "OF",
  "comValuePropertyTaxDm-22": "OG",
  "comValuePropertyTaxDm-23": "OH",
  "comNoPropertyTaxDm-19": "OI",
  "comNoPropertyTaxDm-20": "OJ",
  "comNoPropertyTaxDm-21": "OK",
  "comNoPropertyTaxDm-22": "OL",
  "comNoPropertyTaxDm-23": "OM",
  "comValuePropertyTaxCollected-19": "ON",
  "comValuePropertyTaxCollected-20": "OO",
  "comValuePropertyTaxCollected-21": "OP",
  "comValuePropertyTaxCollected-22": "OQ",
  "comValuePropertyTaxCollected-23": "OR",
  "comNoPropertyTaxCollected-19": "OS",
  "comNoPropertyTaxCollected-20": "OT",
  "comNoPropertyTaxCollected-21": "OU",
  "comNoPropertyTaxCollected-22": "OV",
  "comNoPropertyTaxCollected-23": "OW",
  "indValuePropertyTaxDm-19": "OX",
  "indValuePropertyTaxDm-20": "OY",
  "indValuePropertyTaxDm-21": "OZ",
  "indValuePropertyTaxDm-22": "PA",
  "indValuePropertyTaxDm-23": "PB",
  "indNoPropertyTaxDm-19": "PC",
  "indNoPropertyTaxDm-20": "PD",
  "indNoPropertyTaxDm-21": "PE",
  "indNoPropertyTaxDm-22": "PF",
  "indNoPropertyTaxDm-23": "PG",
  "indValuePropertyTaxCollected-19": "PH",
  "indValuePropertyTaxCollected-20": "PI",
  "indValuePropertyTaxCollected-21": "PJ",
  "indValuePropertyTaxCollected-22": "PK",
  "indValuePropertyTaxCollected-23": "PL",
  "indNoPropertyTaxCollected-19": "PM",
  "indNoPropertyTaxCollected-20": "PN",
  "indNoPropertyTaxCollected-21": "PO",
  "indNoPropertyTaxCollected-22": "PP",
  "indNoPropertyTaxCollected-23": "PQ",
  "govValuePropertyTaxDm-19": "PR",
  "govValuePropertyTaxDm-20": "PS",
  "govValuePropertyTaxDm-21": "PT",
  "govValuePropertyTaxDm-22": "PU",
  "govValuePropertyTaxDm-23": "PV",
  "govNoPropertyTaxDm-19": "PW",
  "govNoPropertyTaxDm-20": "PX",
  "govNoPropertyTaxDm-21": "PY",
  "govNoPropertyTaxDm-22": "PZ",
  "govNoPropertyTaxDm-23": "QA",
  "govValuePropertyTaxCollected-19": "QB",
  "govValuePropertyTaxCollected-20": "QC",
  "govValuePropertyTaxCollected-21": "QD",
  "govValuePropertyTaxCollected-22": "QE",
  "govValuePropertyTaxCollected-23": "QF",
  "govNoPropertyTaxCollected-19": "QG",
  "govNoPropertyTaxCollected-20": "QH",
  "govNoPropertyTaxCollected-21": "QI",
  "govNoPropertyTaxCollected-22": "QJ",
  "govNoPropertyTaxCollected-23": "QK",
  "insValuePropertyTaxDm-19": "QL",
  "insValuePropertyTaxDm-20": "QM",
  "insValuePropertyTaxDm-21": "QN",
  "insValuePropertyTaxDm-22": "QO",
  "insValuePropertyTaxDm-23": "QP",
  "insNoPropertyTaxDm-19": "QQ",
  "insNoPropertyTaxDm-20": "QR",
  "insNoPropertyTaxDm-21": "QS",
  "insNoPropertyTaxDm-22": "QT",
  "insNoPropertyTaxDm-23": "QU",
  "insValuePropertyTaxCollected-19": "QV",
  "insValuePropertyTaxCollected-20": "QW",
  "insValuePropertyTaxCollected-21": "QX",
  "insValuePropertyTaxCollected-22": "QY",
  "insValuePropertyTaxCollected-23": "QZ",
  "insNoPropertyTaxCollected-19": "RA",
  "insNoPropertyTaxCollected-20": "RB",
  "insNoPropertyTaxCollected-21": "RC",
  "insNoPropertyTaxCollected-22": "RD",
  "insNoPropertyTaxCollected-23": "RE",
  "otherValuePropertyTaxDm-textValue-0": "RF",
  "otherValuePropertyTaxDm-19-0": "RG",
  "otherValuePropertyTaxDm-20-0": "RH",
  "otherValuePropertyTaxDm-21-0": "RI",
  "otherValuePropertyTaxDm-22-0": "RJ",
  "otherValuePropertyTaxDm-23-0": "RK",
  "otherNoPropertyTaxDm-textValue-0": "RL",
  "otherNoPropertyTaxDm-19-0": "RM",
  "otherNoPropertyTaxDm-20-0": "RN",
  "otherNoPropertyTaxDm-21-0": "RO",
  "otherNoPropertyTaxDm-22-0": "RP",
  "otherNoPropertyTaxDm-23-0": "RQ",
  "otherValuePropertyTaxCollected-textValue-0": "RR",
  "otherValuePropertyTaxCollected-19-0": "RS",
  "otherValuePropertyTaxCollected-20-0": "RT",
  "otherValuePropertyTaxCollected-21-0": "RU",
  "otherValuePropertyTaxCollected-22-0": "RV",
  "otherValuePropertyTaxCollected-23-0": "RW",
  "otherNoPropertyTaxCollected-textValue-0": "RX",
  "otherNoPropertyTaxCollected-19-0": "RY",
  "otherNoPropertyTaxCollected-20-0": "RZ",
  "otherNoPropertyTaxCollected-21-0": "SA",
  "otherNoPropertyTaxCollected-22-0": "SB",
  "otherNoPropertyTaxCollected-23-0": "SC",
  "otherValuePropertyTaxDm-textValue-1": "SD",
  "otherValuePropertyTaxDm-19-1": "SE",
  "otherValuePropertyTaxDm-20-1": "SF",
  "otherValuePropertyTaxDm-21-1": "SG",
  "otherValuePropertyTaxDm-22-1": "SH",
  "otherValuePropertyTaxDm-23-1": "SI",
  "otherNoPropertyTaxDm-textValue-1": "SJ",
  "otherNoPropertyTaxDm-19-1": "SK",
  "otherNoPropertyTaxDm-20-1": "SL",
  "otherNoPropertyTaxDm-21-1": "SM",
  "otherNoPropertyTaxDm-22-1": "SN",
  "otherNoPropertyTaxDm-23-1": "SO",
  "otherValuePropertyTaxCollected-textValue-1": "SP",
  "otherValuePropertyTaxCollected-19-1": "SQ",
  "otherValuePropertyTaxCollected-20-1": "SR",
  "otherValuePropertyTaxCollected-21-1": "SS",
  "otherValuePropertyTaxCollected-22-1": "ST",
  "otherValuePropertyTaxCollected-23-1": "SU",
  "otherNoPropertyTaxCollected-textValue-1": "SV",
  "otherNoPropertyTaxCollected-19-1": "SW",
  "otherNoPropertyTaxCollected-20-1": "SX",
  "otherNoPropertyTaxCollected-21-1": "SY",
  "otherNoPropertyTaxCollected-22-1": "SZ",
  "otherNoPropertyTaxCollected-23-1": "TA",
  "otherValuePropertyTaxDm-textValue-2": "TB",
  "otherValuePropertyTaxDm-19-2": "TC",
  "otherValuePropertyTaxDm-20-2": "TD",
  "otherValuePropertyTaxDm-21-2": "TE",
  "otherValuePropertyTaxDm-22-2": "TF",
  "otherValuePropertyTaxDm-23-2": "TG",
  "otherNoPropertyTaxDm-textValue-2": "TH",
  "otherNoPropertyTaxDm-19-2": "TI",
  "otherNoPropertyTaxDm-20-2": "TJ",
  "otherNoPropertyTaxDm-21-2": "TK",
  "otherNoPropertyTaxDm-22-2": "TL",
  "otherNoPropertyTaxDm-23-2": "TM",
  "otherValuePropertyTaxCollected-textValue-2": "TN",
  "otherValuePropertyTaxCollected-19-2": "TO",
  "otherValuePropertyTaxCollected-20-2": "TP",
  "otherValuePropertyTaxCollected-21-2": "TQ",
  "otherValuePropertyTaxCollected-22-2": "TR",
  "otherValuePropertyTaxCollected-23-2": "TS",
  "otherNoPropertyTaxCollected-textValue-2": "TT",
  "otherNoPropertyTaxCollected-19-2": "TU",
  "otherNoPropertyTaxCollected-20-2": "TV",
  "otherNoPropertyTaxCollected-21-2": "TW",
  "otherNoPropertyTaxCollected-22-2": "TX",
  "otherNoPropertyTaxCollected-23-2": "TY",
  "otherValuePropertyTaxDm-textValue-3": "TZ",
  "otherValuePropertyTaxDm-19-3": "UA",
  "otherValuePropertyTaxDm-20-3": "UB",
  "otherValuePropertyTaxDm-21-3": "UC",
  "otherValuePropertyTaxDm-22-3": "UD",
  "otherValuePropertyTaxDm-23-3": "UE",
  "otherNoPropertyTaxDm-textValue-3": "UF",
  "otherNoPropertyTaxDm-19-3": "UG",
  "otherNoPropertyTaxDm-20-3": "UH",
  "otherNoPropertyTaxDm-21-3": "UI",
  "otherNoPropertyTaxDm-22-3": "UJ",
  "otherNoPropertyTaxDm-23-3": "UK",
  "otherValuePropertyTaxCollected-textValue-3": "UL",
  "otherValuePropertyTaxCollected-19-3": "UM",
  "otherValuePropertyTaxCollected-20-3": "UN",
  "otherValuePropertyTaxCollected-21-3": "UO",
  "otherValuePropertyTaxCollected-22-3": "UP",
  "otherValuePropertyTaxCollected-23-3": "UQ",
  "otherNoPropertyTaxCollected-textValue-3": "UR",
  "otherNoPropertyTaxCollected-19-3": "US",
  "otherNoPropertyTaxCollected-20-3": "UT",
  "otherNoPropertyTaxCollected-21-3": "UU",
  "otherNoPropertyTaxCollected-22-3": "UV",
  "otherNoPropertyTaxCollected-23-3": "UW",
  "otherValuePropertyTaxDm-textValue-4": "UX",
  "otherValuePropertyTaxDm-19-4": "UY",
  "otherValuePropertyTaxDm-20-4": "UZ",
  "otherValuePropertyTaxDm-21-4": "VA",
  "otherValuePropertyTaxDm-22-4": "VB",
  "otherValuePropertyTaxDm-23-4": "VC",
  "otherNoPropertyTaxDm-textValue-4": "VD",
  "otherNoPropertyTaxDm-19-4": "VE",
  "otherNoPropertyTaxDm-20-4": "VF",
  "otherNoPropertyTaxDm-21-4": "VG",
  "otherNoPropertyTaxDm-22-4": "VH",
  "otherNoPropertyTaxDm-23-4": "VI",
  "otherValuePropertyTaxCollected-textValue-4": "VJ",
  "otherValuePropertyTaxCollected-19-4": "VK",
  "otherValuePropertyTaxCollected-20-4": "VL",
  "otherValuePropertyTaxCollected-21-4": "VM",
  "otherValuePropertyTaxCollected-22-4": "VN",
  "otherValuePropertyTaxCollected-23-4": "VO",
  "otherNoPropertyTaxCollected-textValue-4": "VP",
  "otherNoPropertyTaxCollected-19-4": "VQ",
  "otherNoPropertyTaxCollected-20-4": "VR",
  "otherNoPropertyTaxCollected-21-4": "VS",
  "otherNoPropertyTaxCollected-22-4": "VT",
  "otherNoPropertyTaxCollected-23-4": "VU",
  "otherValuePropertyTaxDm-textValue-5": "VV",
  "otherValuePropertyTaxDm-19-5": "VW",
  "otherValuePropertyTaxDm-20-5": "VX",
  "otherValuePropertyTaxDm-21-5": "VY",
  "otherValuePropertyTaxDm-22-5": "VZ",
  "otherValuePropertyTaxDm-23-5": "WA",
  "otherNoPropertyTaxDm-textValue-5": "WB",
  "otherNoPropertyTaxDm-19-5": "WC",
  "otherNoPropertyTaxDm-20-5": "WD",
  "otherNoPropertyTaxDm-21-5": "WE",
  "otherNoPropertyTaxDm-22-5": "WF",
  "otherNoPropertyTaxDm-23-5": "WG",
  "otherValuePropertyTaxCollected-textValue-5": "WH",
  "otherValuePropertyTaxCollected-19-5": "WI",
  "otherValuePropertyTaxCollected-20-5": "WJ",
  "otherValuePropertyTaxCollected-21-5": "WK",
  "otherValuePropertyTaxCollected-22-5": "WL",
  "otherValuePropertyTaxCollected-23-5": "WM",
  "otherNoPropertyTaxCollected-textValue-5": "WN",
  "otherNoPropertyTaxCollected-19-5": "WO",
  "otherNoPropertyTaxCollected-20-5": "WP",
  "otherNoPropertyTaxCollected-21-5": "WQ",
  "otherNoPropertyTaxCollected-22-5": "WR",
  "otherNoPropertyTaxCollected-23-5": "WS",
  "otherValuePropertyTaxDm-textValue-6": "WT",
  "otherValuePropertyTaxDm-19-6": "WU",
  "otherValuePropertyTaxDm-20-6": "WV",
  "otherValuePropertyTaxDm-21-6": "WW",
  "otherValuePropertyTaxDm-22-6": "WX",
  "otherValuePropertyTaxDm-23-6": "WY",
  "otherNoPropertyTaxDm-textValue-6": "WZ",
  "otherNoPropertyTaxDm-19-6": "XA",
  "otherNoPropertyTaxDm-20-6": "XB",
  "otherNoPropertyTaxDm-21-6": "XC",
  "otherNoPropertyTaxDm-22-6": "XD",
  "otherNoPropertyTaxDm-23-6": "XE",
  "otherValuePropertyTaxCollected-textValue-6": "XF",
  "otherValuePropertyTaxCollected-19-6": "XG",
  "otherValuePropertyTaxCollected-20-6": "XH",
  "otherValuePropertyTaxCollected-21-6": "XI",
  "otherValuePropertyTaxCollected-22-6": "XJ",
  "otherValuePropertyTaxCollected-23-6": "XK",
  "otherNoPropertyTaxCollected-textValue-6": "XL",
  "otherNoPropertyTaxCollected-19-6": "XM",
  "otherNoPropertyTaxCollected-20-6": "XN",
  "otherNoPropertyTaxCollected-21-6": "XO",
  "otherNoPropertyTaxCollected-22-6": "XP",
  "otherNoPropertyTaxCollected-23-6": "XQ",
  "otherValuePropertyTaxDm-textValue-7": "XR",
  "otherValuePropertyTaxDm-19-7": "XS",
  "otherValuePropertyTaxDm-20-7": "XT",
  "otherValuePropertyTaxDm-21-7": "XU",
  "otherValuePropertyTaxDm-22-7": "XV",
  "otherValuePropertyTaxDm-23-7": "XW",
  "otherNoPropertyTaxDm-textValue-7": "XX",
  "otherNoPropertyTaxDm-19-7": "XY",
  "otherNoPropertyTaxDm-20-7": "XZ",
  "otherNoPropertyTaxDm-21-7": "YA",
  "otherNoPropertyTaxDm-22-7": "YB",
  "otherNoPropertyTaxDm-23-7": "YC",
  "otherValuePropertyTaxCollected-textValue-7": "YD",
  "otherValuePropertyTaxCollected-19-7": "YE",
  "otherValuePropertyTaxCollected-20-7": "YF",
  "otherValuePropertyTaxCollected-21-7": "YG",
  "otherValuePropertyTaxCollected-22-7": "YH",
  "otherValuePropertyTaxCollected-23-7": "YI",
  "otherNoPropertyTaxCollected-textValue-7": "YJ",
  "otherNoPropertyTaxCollected-19-7": "YK",
  "otherNoPropertyTaxCollected-20-7": "YL",
  "otherNoPropertyTaxCollected-21-7": "YM",
  "otherNoPropertyTaxCollected-22-7": "YN",
  "otherNoPropertyTaxCollected-23-7": "YO",
  "otherValuePropertyTaxDm-textValue-8": "YP",
  "otherValuePropertyTaxDm-19-8": "YQ",
  "otherValuePropertyTaxDm-20-8": "YR",
  "otherValuePropertyTaxDm-21-8": "YS",
  "otherValuePropertyTaxDm-22-8": "YT",
  "otherValuePropertyTaxDm-23-8": "YU",
  "otherNoPropertyTaxDm-textValue-8": "YV",
  "otherNoPropertyTaxDm-19-8": "YW",
  "otherNoPropertyTaxDm-20-8": "YX",
  "otherNoPropertyTaxDm-21-8": "YY",
  "otherNoPropertyTaxDm-22-8": "YZ",
  "otherNoPropertyTaxDm-23-8": "ZA",
  "otherValuePropertyTaxCollected-textValue-8": "ZB",
  "otherValuePropertyTaxCollected-19-8": "ZC",
  "otherValuePropertyTaxCollected-20-8": "ZD",
  "otherValuePropertyTaxCollected-21-8": "ZE",
  "otherValuePropertyTaxCollected-22-8": "ZF",
  "otherValuePropertyTaxCollected-23-8": "ZG",
  "otherNoPropertyTaxCollected-textValue-8": "ZH",
  "otherNoPropertyTaxCollected-19-8": "ZI",
  "otherNoPropertyTaxCollected-20-8": "ZJ",
  "otherNoPropertyTaxCollected-21-8": "ZK",
  "otherNoPropertyTaxCollected-22-8": "ZL",
  "otherNoPropertyTaxCollected-23-8": "ZM",
  "otherValuePropertyTaxDm-textValue-9": "ZN",
  "otherValuePropertyTaxDm-19-9": "ZO",
  "otherValuePropertyTaxDm-20-9": "ZP",
  "otherValuePropertyTaxDm-21-9": "ZQ",
  "otherValuePropertyTaxDm-22-9": "ZR",
  "otherValuePropertyTaxDm-23-9": "ZS",
  "otherNoPropertyTaxDm-textValue-9": "ZT",
  "otherNoPropertyTaxDm-19-9": "ZU",
  "otherNoPropertyTaxDm-20-9": "ZV",
  "otherNoPropertyTaxDm-21-9": "ZW",
  "otherNoPropertyTaxDm-22-9": "ZX",
  "otherNoPropertyTaxDm-23-9": "ZY",
  "otherValuePropertyTaxCollected-textValue-9": "ZZ",
  "otherValuePropertyTaxCollected-19-9": "AAA",
  "otherValuePropertyTaxCollected-20-9": "AAB",
  "otherValuePropertyTaxCollected-21-9": "AAC",
  "otherValuePropertyTaxCollected-22-9": "AAD",
  "otherValuePropertyTaxCollected-23-9": "AAE",
  "otherNoPropertyTaxCollected-textValue-9": "AAF",
  "otherNoPropertyTaxCollected-19-9": "AAG",
  "otherNoPropertyTaxCollected-20-9": "AAH",
  "otherNoPropertyTaxCollected-21-9": "AAI",
  "otherNoPropertyTaxCollected-22-9": "AAJ",
  "otherNoPropertyTaxCollected-23-9": "AAK",
  "noOfPropertiesPaidOnline-19": "AAL",
  "noOfPropertiesPaidOnline-20": "AAM",
  "noOfPropertiesPaidOnline-21": "AAN",
  "noOfPropertiesPaidOnline-22": "AAO",
  "noOfPropertiesPaidOnline-23": "AAP",
  "totalCollectionOnline-19": "AAQ",
  "totalCollectionOnline-20": "AAR",
  "totalCollectionOnline-21": "AAS",
  "totalCollectionOnline-22": "AAT",
  "totalCollectionOnline-23": "AAU",
  "propertyTaxValuationDetails-19": "AAV",
  "notificationWaterCharges-19": "AAW",
  "entityWaterCharges-19": "AAX",
  "entityNameWaterCharges-19": "AAY",
  "notificationWaterChargesFile-19": "AAZ",
  "waterChrgDm-19": "ABA",
  "waterChrgDm-20": "ABB",
  "waterChrgDm-21": "ABC",
  "waterChrgDm-22": "ABD",
  "waterChrgDm-23": "ABE",
  "cuWaterChrgDm-19": "ABF",
  "cuWaterChrgDm-20": "ABG",
  "cuWaterChrgDm-21": "ABH",
  "cuWaterChrgDm-22": "ABI",
  "cuWaterChrgDm-23": "ABJ",
  "arWaterChrgDm-19": "ABK",
  "arWaterChrgDm-20": "ABL",
  "arWaterChrgDm-21": "ABM",
  "arWaterChrgDm-22": "ABN",
  "arWaterChrgDm-23": "ABO",
  "waterChrgCol-19": "ABP",
  "waterChrgCol-20": "ABQ",
  "waterChrgCol-21": "ABR",
  "waterChrgCol-22": "ABS",
  "waterChrgCol-23": "ABT",
  "cuWaterChrgCol-19": "ABU",
  "cuWaterChrgCol-20": "ABV",
  "cuWaterChrgCol-21": "ABW",
  "cuWaterChrgCol-22": "ABX",
  "cuWaterChrgCol-23": "ABY",
  "arWaterChrgCol-19": "ABZ",
  "arWaterChrgCol-20": "ACA",
  "arWaterChrgCol-21": "ACB",
  "arWaterChrgCol-22": "ACC",
  "arWaterChrgCol-23": "ACD",
  "waterChrgConnectionDm-19": "ACE",
  "waterChrgConnectionDm-20": "ACF",
  "waterChrgConnectionDm-21": "ACG",
  "waterChrgConnectionDm-22": "ACH",
  "waterChrgConnectionDm-23": "ACI",
  "waterChrgConnectionCol-19": "ACJ",
  "waterChrgConnectionCol-20": "ACK",
  "waterChrgConnectionCol-21": "ACL",
  "waterChrgConnectionCol-22": "ACM",
  "waterChrgConnectionCol-23": "ACN",
  "resValueWaterChrgDm-19": "ACO",
  "resValueWaterChrgDm-20": "ACP",
  "resValueWaterChrgDm-21": "ACQ",
  "resValueWaterChrgDm-22": "ACR",
  "resValueWaterChrgDm-23": "ACS",
  "resNoWaterChrgDm-19": "ACT",
  "resNoWaterChrgDm-20": "ACU",
  "resNoWaterChrgDm-21": "ACV",
  "resNoWaterChrgDm-22": "ACW",
  "resNoWaterChrgDm-23": "ACX",
  "resValueWaterChrgCollected-19": "ACY",
  "resValueWaterChrgCollected-20": "ACZ",
  "resValueWaterChrgCollected-21": "ADA",
  "resValueWaterChrgCollected-22": "ADB",
  "resValueWaterChrgCollected-23": "ADC",
  "resNoWaterChrgCollected-19": "ADD",
  "resNoWaterChrgCollected-20": "ADE",
  "resNoWaterChrgCollected-21": "ADF",
  "resNoWaterChrgCollected-22": "ADG",
  "resNoWaterChrgCollected-23": "ADH",
  "comValueWaterChrgDm-19": "ADI",
  "comValueWaterChrgDm-20": "ADJ",
  "comValueWaterChrgDm-21": "ADK",
  "comValueWaterChrgDm-22": "ADL",
  "comValueWaterChrgDm-23": "ADM",
  "comNoWaterChrgDm-19": "ADN",
  "comNoWaterChrgDm-20": "ADO",
  "comNoWaterChrgDm-21": "ADP",
  "comNoWaterChrgDm-22": "ADQ",
  "comNoWaterChrgDm-23": "ADR",
  "comValueWaterChrgCollected-19": "ADS",
  "comValueWaterChrgCollected-20": "ADT",
  "comValueWaterChrgCollected-21": "ADU",
  "comValueWaterChrgCollected-22": "ADV",
  "comValueWaterChrgCollected-23": "ADW",
  "comNoWaterChrgCollected-19": "ADX",
  "comNoWaterChrgCollected-20": "ADY",
  "comNoWaterChrgCollected-21": "ADZ",
  "comNoWaterChrgCollected-22": "AEA",
  "comNoWaterChrgCollected-23": "AEB",
  "indValueWaterChrgDm-19": "AEC",
  "indValueWaterChrgDm-20": "AED",
  "indValueWaterChrgDm-21": "AEE",
  "indValueWaterChrgDm-22": "AEF",
  "indValueWaterChrgDm-23": "AEG",
  "indNoWaterChrgDm-19": "AEH",
  "indNoWaterChrgDm-20": "AEI",
  "indNoWaterChrgDm-21": "AEJ",
  "indNoWaterChrgDm-22": "AEK",
  "indNoWaterChrgDm-23": "AEL",
  "indValueWaterChrgCollected-19": "AEM",
  "indValueWaterChrgCollected-20": "AEN",
  "indValueWaterChrgCollected-21": "AEO",
  "indValueWaterChrgCollected-22": "AEP",
  "indValueWaterChrgCollected-23": "AEQ",
  "indNoWaterChrgCollected-19": "AER",
  "indNoWaterChrgCollected-20": "AES",
  "indNoWaterChrgCollected-21": "AET",
  "indNoWaterChrgCollected-22": "AEU",
  "indNoWaterChrgCollected-23": "AEV",
  "othersValueWaterChrgDm-textValue-0": "AEW",
  "othersValueWaterChrgDm-19-0": "AEX",
  "othersValueWaterChrgDm-20-0": "AEY",
  "othersValueWaterChrgDm-21-0": "AEZ",
  "othersValueWaterChrgDm-22-0": "AFA",
  "othersValueWaterChrgDm-23-0": "AFB",
  "othersNoWaterChrgDm-textValue-0": "AFC",
  "othersNoWaterChrgDm-19-0": "AFD",
  "othersNoWaterChrgDm-20-0": "AFE",
  "othersNoWaterChrgDm-21-0": "AFF",
  "othersNoWaterChrgDm-22-0": "AFG",
  "othersNoWaterChrgDm-23-0": "AFH",
  "othersValueWaterChrgCollected-textValue-0": "AFI",
  "othersValueWaterChrgCollected-19-0": "AFJ",
  "othersValueWaterChrgCollected-20-0": "AFK",
  "othersValueWaterChrgCollected-21-0": "AFL",
  "othersValueWaterChrgCollected-22-0": "AFM",
  "othersValueWaterChrgCollected-23-0": "AFN",
  "othersNoWaterChrgCollected-textValue-0": "AFO",
  "othersNoWaterChrgCollected-19-0": "AFP",
  "othersNoWaterChrgCollected-20-0": "AFQ",
  "othersNoWaterChrgCollected-21-0": "AFR",
  "othersNoWaterChrgCollected-22-0": "AFS",
  "othersNoWaterChrgCollected-23-0": "AFT",
  "othersValueWaterChrgDm-textValue-1": "AFU",
  "othersValueWaterChrgDm-19-1": "AFV",
  "othersValueWaterChrgDm-20-1": "AFW",
  "othersValueWaterChrgDm-21-1": "AFX",
  "othersValueWaterChrgDm-22-1": "AFY",
  "othersValueWaterChrgDm-23-1": "AFZ",
  "othersNoWaterChrgDm-textValue-1": "AGA",
  "othersNoWaterChrgDm-19-1": "AGB",
  "othersNoWaterChrgDm-20-1": "AGC",
  "othersNoWaterChrgDm-21-1": "AGD",
  "othersNoWaterChrgDm-22-1": "AGE",
  "othersNoWaterChrgDm-23-1": "AGF",
  "othersValueWaterChrgCollected-textValue-1": "AGG",
  "othersValueWaterChrgCollected-19-1": "AGH",
  "othersValueWaterChrgCollected-20-1": "AGI",
  "othersValueWaterChrgCollected-21-1": "AGJ",
  "othersValueWaterChrgCollected-22-1": "AGK",
  "othersValueWaterChrgCollected-23-1": "AGL",
  "othersNoWaterChrgCollected-textValue-1": "AGM",
  "othersNoWaterChrgCollected-19-1": "AGN",
  "othersNoWaterChrgCollected-20-1": "AGO",
  "othersNoWaterChrgCollected-21-1": "AGP",
  "othersNoWaterChrgCollected-22-1": "AGQ",
  "othersNoWaterChrgCollected-23-1": "AGR",
  "othersValueWaterChrgDm-textValue-2": "AGS",
  "othersValueWaterChrgDm-19-2": "AGT",
  "othersValueWaterChrgDm-20-2": "AGU",
  "othersValueWaterChrgDm-21-2": "AGV",
  "othersValueWaterChrgDm-22-2": "AGW",
  "othersValueWaterChrgDm-23-2": "AGX",
  "othersNoWaterChrgDm-textValue-2": "AGY",
  "othersNoWaterChrgDm-19-2": "AGZ",
  "othersNoWaterChrgDm-20-2": "AHA",
  "othersNoWaterChrgDm-21-2": "AHB",
  "othersNoWaterChrgDm-22-2": "AHC",
  "othersNoWaterChrgDm-23-2": "AHD",
  "othersValueWaterChrgCollected-textValue-2": "AHE",
  "othersValueWaterChrgCollected-19-2": "AHF",
  "othersValueWaterChrgCollected-20-2": "AHG",
  "othersValueWaterChrgCollected-21-2": "AHH",
  "othersValueWaterChrgCollected-22-2": "AHI",
  "othersValueWaterChrgCollected-23-2": "AHJ",
  "othersNoWaterChrgCollected-textValue-2": "AHK",
  "othersNoWaterChrgCollected-19-2": "AHL",
  "othersNoWaterChrgCollected-20-2": "AHM",
  "othersNoWaterChrgCollected-21-2": "AHN",
  "othersNoWaterChrgCollected-22-2": "AHO",
  "othersNoWaterChrgCollected-23-2": "AHP",
  "othersValueWaterChrgDm-textValue-3": "AHQ",
  "othersValueWaterChrgDm-19-3": "AHR",
  "othersValueWaterChrgDm-20-3": "AHS",
  "othersValueWaterChrgDm-21-3": "AHT",
  "othersValueWaterChrgDm-22-3": "AHU",
  "othersValueWaterChrgDm-23-3": "AHV",
  "othersNoWaterChrgDm-textValue-3": "AHW",
  "othersNoWaterChrgDm-19-3": "AHX",
  "othersNoWaterChrgDm-20-3": "AHY",
  "othersNoWaterChrgDm-21-3": "AHZ",
  "othersNoWaterChrgDm-22-3": "AIA",
  "othersNoWaterChrgDm-23-3": "AIB",
  "othersValueWaterChrgCollected-textValue-3": "AIC",
  "othersValueWaterChrgCollected-19-3": "AID",
  "othersValueWaterChrgCollected-20-3": "AIE",
  "othersValueWaterChrgCollected-21-3": "AIF",
  "othersValueWaterChrgCollected-22-3": "AIG",
  "othersValueWaterChrgCollected-23-3": "AIH",
  "othersNoWaterChrgCollected-textValue-3": "AII",
  "othersNoWaterChrgCollected-19-3": "AIJ",
  "othersNoWaterChrgCollected-20-3": "AIK",
  "othersNoWaterChrgCollected-21-3": "AIL",
  "othersNoWaterChrgCollected-22-3": "AIM",
  "othersNoWaterChrgCollected-23-3": "AIN",
  "othersValueWaterChrgDm-textValue-4": "AIO",
  "othersValueWaterChrgDm-19-4": "AIP",
  "othersValueWaterChrgDm-20-4": "AIQ",
  "othersValueWaterChrgDm-21-4": "AIR",
  "othersValueWaterChrgDm-22-4": "AIS",
  "othersValueWaterChrgDm-23-4": "AIT",
  "othersNoWaterChrgDm-textValue-4": "AIU",
  "othersNoWaterChrgDm-19-4": "AIV",
  "othersNoWaterChrgDm-20-4": "AIW",
  "othersNoWaterChrgDm-21-4": "AIX",
  "othersNoWaterChrgDm-22-4": "AIY",
  "othersNoWaterChrgDm-23-4": "AIZ",
  "othersValueWaterChrgCollected-textValue-4": "AJA",
  "othersValueWaterChrgCollected-19-4": "AJB",
  "othersValueWaterChrgCollected-20-4": "AJC",
  "othersValueWaterChrgCollected-21-4": "AJD",
  "othersValueWaterChrgCollected-22-4": "AJE",
  "othersValueWaterChrgCollected-23-4": "AJF",
  "othersNoWaterChrgCollected-textValue-4": "AJG",
  "othersNoWaterChrgCollected-19-4": "AJH",
  "othersNoWaterChrgCollected-20-4": "AJI",
  "othersNoWaterChrgCollected-21-4": "AJJ",
  "othersNoWaterChrgCollected-22-4": "AJK",
  "othersNoWaterChrgCollected-23-4": "AJL",
  "othersValueWaterChrgDm-textValue-5": "AJM",
  "othersValueWaterChrgDm-19-5": "AJN",
  "othersValueWaterChrgDm-20-5": "AJO",
  "othersValueWaterChrgDm-21-5": "AJP",
  "othersValueWaterChrgDm-22-5": "AJQ",
  "othersValueWaterChrgDm-23-5": "AJR",
  "othersNoWaterChrgDm-textValue-5": "AJS",
  "othersNoWaterChrgDm-19-5": "AJT",
  "othersNoWaterChrgDm-20-5": "AJU",
  "othersNoWaterChrgDm-21-5": "AJV",
  "othersNoWaterChrgDm-22-5": "AJW",
  "othersNoWaterChrgDm-23-5": "AJX",
  "othersValueWaterChrgCollected-textValue-5": "AJY",
  "othersValueWaterChrgCollected-19-5": "AJZ",
  "othersValueWaterChrgCollected-20-5": "AKA",
  "othersValueWaterChrgCollected-21-5": "AKB",
  "othersValueWaterChrgCollected-22-5": "AKC",
  "othersValueWaterChrgCollected-23-5": "AKD",
  "othersNoWaterChrgCollected-textValue-5": "AKE",
  "othersNoWaterChrgCollected-19-5": "AKF",
  "othersNoWaterChrgCollected-20-5": "AKG",
  "othersNoWaterChrgCollected-21-5": "AKH",
  "othersNoWaterChrgCollected-22-5": "AKI",
  "othersNoWaterChrgCollected-23-5": "AKJ",
  "othersValueWaterChrgDm-textValue-6": "AKK",
  "othersValueWaterChrgDm-19-6": "AKL",
  "othersValueWaterChrgDm-20-6": "AKM",
  "othersValueWaterChrgDm-21-6": "AKN",
  "othersValueWaterChrgDm-22-6": "AKO",
  "othersValueWaterChrgDm-23-6": "AKP",
  "othersNoWaterChrgDm-textValue-6": "AKQ",
  "othersNoWaterChrgDm-19-6": "AKR",
  "othersNoWaterChrgDm-20-6": "AKS",
  "othersNoWaterChrgDm-21-6": "AKT",
  "othersNoWaterChrgDm-22-6": "AKU",
  "othersNoWaterChrgDm-23-6": "AKV",
  "othersValueWaterChrgCollected-textValue-6": "AKW",
  "othersValueWaterChrgCollected-19-6": "AKX",
  "othersValueWaterChrgCollected-20-6": "AKY",
  "othersValueWaterChrgCollected-21-6": "AKZ",
  "othersValueWaterChrgCollected-22-6": "ALA",
  "othersValueWaterChrgCollected-23-6": "ALB",
  "othersNoWaterChrgCollected-textValue-6": "ALC",
  "othersNoWaterChrgCollected-19-6": "ALD",
  "othersNoWaterChrgCollected-20-6": "ALE",
  "othersNoWaterChrgCollected-21-6": "ALF",
  "othersNoWaterChrgCollected-22-6": "ALG",
  "othersNoWaterChrgCollected-23-6": "ALH",
  "othersValueWaterChrgDm-textValue-7": "ALI",
  "othersValueWaterChrgDm-19-7": "ALJ",
  "othersValueWaterChrgDm-20-7": "ALK",
  "othersValueWaterChrgDm-21-7": "ALL",
  "othersValueWaterChrgDm-22-7": "ALM",
  "othersValueWaterChrgDm-23-7": "ALN",
  "othersNoWaterChrgDm-textValue-7": "ALO",
  "othersNoWaterChrgDm-19-7": "ALP",
  "othersNoWaterChrgDm-20-7": "ALQ",
  "othersNoWaterChrgDm-21-7": "ALR",
  "othersNoWaterChrgDm-22-7": "ALS",
  "othersNoWaterChrgDm-23-7": "ALT",
  "othersValueWaterChrgCollected-textValue-7": "ALU",
  "othersValueWaterChrgCollected-19-7": "ALV",
  "othersValueWaterChrgCollected-20-7": "ALW",
  "othersValueWaterChrgCollected-21-7": "ALX",
  "othersValueWaterChrgCollected-22-7": "ALY",
  "othersValueWaterChrgCollected-23-7": "ALZ",
  "othersNoWaterChrgCollected-textValue-7": "AMA",
  "othersNoWaterChrgCollected-19-7": "AMB",
  "othersNoWaterChrgCollected-20-7": "AMC",
  "othersNoWaterChrgCollected-21-7": "AMD",
  "othersNoWaterChrgCollected-22-7": "AME",
  "othersNoWaterChrgCollected-23-7": "AMF",
  "othersValueWaterChrgDm-textValue-8": "AMG",
  "othersValueWaterChrgDm-19-8": "AMH",
  "othersValueWaterChrgDm-20-8": "AMI",
  "othersValueWaterChrgDm-21-8": "AMJ",
  "othersValueWaterChrgDm-22-8": "AMK",
  "othersValueWaterChrgDm-23-8": "AML",
  "othersNoWaterChrgDm-textValue-8": "AMM",
  "othersNoWaterChrgDm-19-8": "AMN",
  "othersNoWaterChrgDm-20-8": "AMO",
  "othersNoWaterChrgDm-21-8": "AMP",
  "othersNoWaterChrgDm-22-8": "AMQ",
  "othersNoWaterChrgDm-23-8": "AMR",
  "othersValueWaterChrgCollected-textValue-8": "AMS",
  "othersValueWaterChrgCollected-19-8": "AMT",
  "othersValueWaterChrgCollected-20-8": "AMU",
  "othersValueWaterChrgCollected-21-8": "AMV",
  "othersValueWaterChrgCollected-22-8": "AMW",
  "othersValueWaterChrgCollected-23-8": "AMX",
  "othersNoWaterChrgCollected-textValue-8": "AMY",
  "othersNoWaterChrgCollected-19-8": "AMZ",
  "othersNoWaterChrgCollected-20-8": "ANA",
  "othersNoWaterChrgCollected-21-8": "ANB",
  "othersNoWaterChrgCollected-22-8": "ANC",
  "othersNoWaterChrgCollected-23-8": "AND",
  "othersValueWaterChrgDm-textValue-9": "ANE",
  "othersValueWaterChrgDm-19-9": "ANF",
  "othersValueWaterChrgDm-20-9": "ANG",
  "othersValueWaterChrgDm-21-9": "ANH",
  "othersValueWaterChrgDm-22-9": "ANI",
  "othersValueWaterChrgDm-23-9": "ANJ",
  "othersNoWaterChrgDm-textValue-9": "ANK",
  "othersNoWaterChrgDm-19-9": "ANL",
  "othersNoWaterChrgDm-20-9": "ANM",
  "othersNoWaterChrgDm-21-9": "ANN",
  "othersNoWaterChrgDm-22-9": "ANO",
  "othersNoWaterChrgDm-23-9": "ANP",
  "othersValueWaterChrgCollected-textValue-9": "ANQ",
  "othersValueWaterChrgCollected-19-9": "ANR",
  "othersValueWaterChrgCollected-20-9": "ANS",
  "othersValueWaterChrgCollected-21-9": "ANT",
  "othersValueWaterChrgCollected-22-9": "ANU",
  "othersValueWaterChrgCollected-23-9": "ANV",
  "othersNoWaterChrgCollected-textValue-9": "ANW",
  "othersNoWaterChrgCollected-19-9": "ANX",
  "othersNoWaterChrgCollected-20-9": "ANY",
  "othersNoWaterChrgCollected-21-9": "ANZ",
  "othersNoWaterChrgCollected-22-9": "AOA",
  "othersNoWaterChrgCollected-23-9": "AOB",
  "waterChrgTariffDetails-19": "AOC",
  "omCostDeleveryWater-19": "AOD",
  "omCostDeleveryWater-20": "AOE",
  "omCostDeleveryWater-21": "AOF",
  "omCostDeleveryWater-22": "AOG",
  "omCostDeleveryWater-23": "AOH",
  "omCostWaterService-19": "AOI",
  "doesColSewerageCharges-19": "AOJ",
  "entitySewerageCharges-19": "AOK",
  "entityNaSewerageCharges-19": "AOL",
  "copyGazetteNotificationSewerage-19": "AOM",
  "totalSewergeChrgDm-19": "AON",
  "totalSewergeChrgDm-20": "AOO",
  "totalSewergeChrgDm-21": "AOP",
  "totalSewergeChrgDm-22": "AOQ",
  "totalSewergeChrgDm-23": "AOR",
  "curSewergeChrgDm-19": "AOS",
  "curSewergeChrgDm-20": "AOT",
  "curSewergeChrgDm-21": "AOU",
  "curSewergeChrgDm-22": "AOV",
  "curSewergeChrgDm-23": "AOW",
  "arrSewergeChrgDm-19": "AOX",
  "arrSewergeChrgDm-20": "AOY",
  "arrSewergeChrgDm-21": "AOZ",
  "arrSewergeChrgDm-22": "APA",
  "arrSewergeChrgDm-23": "APB",
  "totalSewergeChrgCol-19": "APC",
  "totalSewergeChrgCol-20": "APD",
  "totalSewergeChrgCol-21": "APE",
  "totalSewergeChrgCol-22": "APF",
  "totalSewergeChrgCol-23": "APG",
  "curSewergeChrgCol-19": "APH",
  "curSewergeChrgCol-20": "API",
  "curSewergeChrgCol-21": "APJ",
  "curSewergeChrgCol-22": "APK",
  "curSewergeChrgCol-23": "APL",
  "arrSewergeChrgCol-19": "APM",
  "arrSewergeChrgCol-20": "APN",
  "arrSewergeChrgCol-21": "APO",
  "arrSewergeChrgCol-22": "APP",
  "arrSewergeChrgCol-23": "APQ",
  "totalSewergeConnectionDm-19": "APR",
  "totalSewergeConnectionDm-20": "APS",
  "totalSewergeConnectionDm-21": "APT",
  "totalSewergeConnectionDm-22": "APU",
  "totalSewergeConnectionDm-23": "APV",
  "totalSewergeConnectionCol-19": "APW",
  "totalSewergeConnectionCol-20": "APX",
  "totalSewergeConnectionCol-21": "APY",
  "totalSewergeConnectionCol-22": "APZ",
  "totalSewergeConnectionCol-23": "AQA",
  "resValueSewerageTaxDm-19": "AQB",
  "resValueSewerageTaxDm-20": "AQC",
  "resValueSewerageTaxDm-21": "AQD",
  "resValueSewerageTaxDm-22": "AQE",
  "resValueSewerageTaxDm-23": "AQF",
  "resNoSewerageTaxDm-19": "AQG",
  "resNoSewerageTaxDm-20": "AQH",
  "resNoSewerageTaxDm-21": "AQI",
  "resNoSewerageTaxDm-22": "AQJ",
  "resNoSewerageTaxDm-23": "AQK",
  "resValueSewerageTaxCollected-19": "AQL",
  "resValueSewerageTaxCollected-20": "AQM",
  "resValueSewerageTaxCollected-21": "AQN",
  "resValueSewerageTaxCollected-22": "AQO",
  "resValueSewerageTaxCollected-23": "AQP",
  "resNoSewerageTaxCollected-19": "AQQ",
  "resNoSewerageTaxCollected-20": "AQR",
  "resNoSewerageTaxCollected-21": "AQS",
  "resNoSewerageTaxCollected-22": "AQT",
  "resNoSewerageTaxCollected-23": "AQU",
  "comValueSewerageTaxDm-19": "AQV",
  "comValueSewerageTaxDm-20": "AQW",
  "comValueSewerageTaxDm-21": "AQX",
  "comValueSewerageTaxDm-22": "AQY",
  "comValueSewerageTaxDm-23": "AQZ",
  "comNoSewerageTaxDm-19": "ARA",
  "comNoSewerageTaxDm-20": "ARB",
  "comNoSewerageTaxDm-21": "ARC",
  "comNoSewerageTaxDm-22": "ARD",
  "comNoSewerageTaxDm-23": "ARE",
  "comValueSewerageTaxCollected-19": "ARF",
  "comValueSewerageTaxCollected-20": "ARG",
  "comValueSewerageTaxCollected-21": "ARH",
  "comValueSewerageTaxCollected-22": "ARI",
  "comValueSewerageTaxCollected-23": "ARJ",
  "comNoSewerageTaxCollected-19": "ARK",
  "comNoSewerageTaxCollected-20": "ARL",
  "comNoSewerageTaxCollected-21": "ARM",
  "comNoSewerageTaxCollected-22": "ARN",
  "comNoSewerageTaxCollected-23": "ARO",
  "indValueSewerageTaxDm-19": "ARP",
  "indValueSewerageTaxDm-20": "ARQ",
  "indValueSewerageTaxDm-21": "ARR",
  "indValueSewerageTaxDm-22": "ARS",
  "indValueSewerageTaxDm-23": "ART",
  "indNoSewerageTaxDm-19": "ARU",
  "indNoSewerageTaxDm-20": "ARV",
  "indNoSewerageTaxDm-21": "ARW",
  "indNoSewerageTaxDm-22": "ARX",
  "indNoSewerageTaxDm-23": "ARY",
  "indValueSewerageTaxCollected-19": "ARZ",
  "indValueSewerageTaxCollected-20": "ASA",
  "indValueSewerageTaxCollected-21": "ASB",
  "indValueSewerageTaxCollected-22": "ASC",
  "indValueSewerageTaxCollected-23": "ASD",
  "indNoSewerageTaxCollected-19": "ASE",
  "indNoSewerageTaxCollected-20": "ASF",
  "indNoSewerageTaxCollected-21": "ASG",
  "indNoSewerageTaxCollected-22": "ASH",
  "indNoSewerageTaxCollected-23": "ASI",
  "otherValueSewerageTaxDm-textValue-0": "ASJ",
  "otherValueSewerageTaxDm-19-0": "ASK",
  "otherValueSewerageTaxDm-20-0": "ASL",
  "otherValueSewerageTaxDm-21-0": "ASM",
  "otherValueSewerageTaxDm-22-0": "ASN",
  "otherValueSewerageTaxDm-23-0": "ASO",
  "otherNoSewerageTaxDm-textValue-0": "ASP",
  "otherNoSewerageTaxDm-19-0": "ASQ",
  "otherNoSewerageTaxDm-20-0": "ASR",
  "otherNoSewerageTaxDm-21-0": "ASS",
  "otherNoSewerageTaxDm-22-0": "AST",
  "otherNoSewerageTaxDm-23-0": "ASU",
  "otherValueSewerageTaxCollected-textValue-0": "ASV",
  "otherValueSewerageTaxCollected-19-0": "ASW",
  "otherValueSewerageTaxCollected-20-0": "ASX",
  "otherValueSewerageTaxCollected-21-0": "ASY",
  "otherValueSewerageTaxCollected-22-0": "ASZ",
  "otherValueSewerageTaxCollected-23-0": "ATA",
  "otherNoSewerageTaxCollected-textValue-0": "ATB",
  "otherNoSewerageTaxCollected-19-0": "ATC",
  "otherNoSewerageTaxCollected-20-0": "ATD",
  "otherNoSewerageTaxCollected-21-0": "ATE",
  "otherNoSewerageTaxCollected-22-0": "ATF",
  "otherNoSewerageTaxCollected-23-0": "ATG",
  "otherValueSewerageTaxDm-textValue-1": "ATH",
  "otherValueSewerageTaxDm-19-1": "ATI",
  "otherValueSewerageTaxDm-20-1": "ATJ",
  "otherValueSewerageTaxDm-21-1": "ATK",
  "otherValueSewerageTaxDm-22-1": "ATL",
  "otherValueSewerageTaxDm-23-1": "ATM",
  "otherNoSewerageTaxDm-textValue-1": "ATN",
  "otherNoSewerageTaxDm-19-1": "ATO",
  "otherNoSewerageTaxDm-20-1": "ATP",
  "otherNoSewerageTaxDm-21-1": "ATQ",
  "otherNoSewerageTaxDm-22-1": "ATR",
  "otherNoSewerageTaxDm-23-1": "ATS",
  "otherValueSewerageTaxCollected-textValue-1": "ATT",
  "otherValueSewerageTaxCollected-19-1": "ATU",
  "otherValueSewerageTaxCollected-20-1": "ATV",
  "otherValueSewerageTaxCollected-21-1": "ATW",
  "otherValueSewerageTaxCollected-22-1": "ATX",
  "otherValueSewerageTaxCollected-23-1": "ATY",
  "otherNoSewerageTaxCollected-textValue-1": "ATZ",
  "otherNoSewerageTaxCollected-19-1": "AUA",
  "otherNoSewerageTaxCollected-20-1": "AUB",
  "otherNoSewerageTaxCollected-21-1": "AUC",
  "otherNoSewerageTaxCollected-22-1": "AUD",
  "otherNoSewerageTaxCollected-23-1": "AUE",
  "otherValueSewerageTaxDm-textValue-2": "AUF",
  "otherValueSewerageTaxDm-19-2": "AUG",
  "otherValueSewerageTaxDm-20-2": "AUH",
  "otherValueSewerageTaxDm-21-2": "AUI",
  "otherValueSewerageTaxDm-22-2": "AUJ",
  "otherValueSewerageTaxDm-23-2": "AUK",
  "otherNoSewerageTaxDm-textValue-2": "AUL",
  "otherNoSewerageTaxDm-19-2": "AUM",
  "otherNoSewerageTaxDm-20-2": "AUN",
  "otherNoSewerageTaxDm-21-2": "AUO",
  "otherNoSewerageTaxDm-22-2": "AUP",
  "otherNoSewerageTaxDm-23-2": "AUQ",
  "otherValueSewerageTaxCollected-textValue-2": "AUR",
  "otherValueSewerageTaxCollected-19-2": "AUS",
  "otherValueSewerageTaxCollected-20-2": "AUT",
  "otherValueSewerageTaxCollected-21-2": "AUU",
  "otherValueSewerageTaxCollected-22-2": "AUV",
  "otherValueSewerageTaxCollected-23-2": "AUW",
  "otherNoSewerageTaxCollected-textValue-2": "AUX",
  "otherNoSewerageTaxCollected-19-2": "AUY",
  "otherNoSewerageTaxCollected-20-2": "AUZ",
  "otherNoSewerageTaxCollected-21-2": "AVA",
  "otherNoSewerageTaxCollected-22-2": "AVB",
  "otherNoSewerageTaxCollected-23-2": "AVC",
  "otherValueSewerageTaxDm-textValue-3": "AVD",
  "otherValueSewerageTaxDm-19-3": "AVE",
  "otherValueSewerageTaxDm-20-3": "AVF",
  "otherValueSewerageTaxDm-21-3": "AVG",
  "otherValueSewerageTaxDm-22-3": "AVH",
  "otherValueSewerageTaxDm-23-3": "AVI",
  "otherNoSewerageTaxDm-textValue-3": "AVJ",
  "otherNoSewerageTaxDm-19-3": "AVK",
  "otherNoSewerageTaxDm-20-3": "AVL",
  "otherNoSewerageTaxDm-21-3": "AVM",
  "otherNoSewerageTaxDm-22-3": "AVN",
  "otherNoSewerageTaxDm-23-3": "AVO",
  "otherValueSewerageTaxCollected-textValue-3": "AVP",
  "otherValueSewerageTaxCollected-19-3": "AVQ",
  "otherValueSewerageTaxCollected-20-3": "AVR",
  "otherValueSewerageTaxCollected-21-3": "AVS",
  "otherValueSewerageTaxCollected-22-3": "AVT",
  "otherValueSewerageTaxCollected-23-3": "AVU",
  "otherNoSewerageTaxCollected-textValue-3": "AVV",
  "otherNoSewerageTaxCollected-19-3": "AVW",
  "otherNoSewerageTaxCollected-20-3": "AVX",
  "otherNoSewerageTaxCollected-21-3": "AVY",
  "otherNoSewerageTaxCollected-22-3": "AVZ",
  "otherNoSewerageTaxCollected-23-3": "AWA",
  "otherValueSewerageTaxDm-textValue-4": "AWB",
  "otherValueSewerageTaxDm-19-4": "AWC",
  "otherValueSewerageTaxDm-20-4": "AWD",
  "otherValueSewerageTaxDm-21-4": "AWE",
  "otherValueSewerageTaxDm-22-4": "AWF",
  "otherValueSewerageTaxDm-23-4": "AWG",
  "otherNoSewerageTaxDm-textValue-4": "AWH",
  "otherNoSewerageTaxDm-19-4": "AWI",
  "otherNoSewerageTaxDm-20-4": "AWJ",
  "otherNoSewerageTaxDm-21-4": "AWK",
  "otherNoSewerageTaxDm-22-4": "AWL",
  "otherNoSewerageTaxDm-23-4": "AWM",
  "otherValueSewerageTaxCollected-textValue-4": "AWN",
  "otherValueSewerageTaxCollected-19-4": "AWO",
  "otherValueSewerageTaxCollected-20-4": "AWP",
  "otherValueSewerageTaxCollected-21-4": "AWQ",
  "otherValueSewerageTaxCollected-22-4": "AWR",
  "otherValueSewerageTaxCollected-23-4": "AWS",
  "otherNoSewerageTaxCollected-textValue-4": "AWT",
  "otherNoSewerageTaxCollected-19-4": "AWU",
  "otherNoSewerageTaxCollected-20-4": "AWV",
  "otherNoSewerageTaxCollected-21-4": "AWW",
  "otherNoSewerageTaxCollected-22-4": "AWX",
  "otherNoSewerageTaxCollected-23-4": "AWY",
  "otherValueSewerageTaxDm-textValue-5": "AWZ",
  "otherValueSewerageTaxDm-19-5": "AXA",
  "otherValueSewerageTaxDm-20-5": "AXB",
  "otherValueSewerageTaxDm-21-5": "AXC",
  "otherValueSewerageTaxDm-22-5": "AXD",
  "otherValueSewerageTaxDm-23-5": "AXE",
  "otherNoSewerageTaxDm-textValue-5": "AXF",
  "otherNoSewerageTaxDm-19-5": "AXG",
  "otherNoSewerageTaxDm-20-5": "AXH",
  "otherNoSewerageTaxDm-21-5": "AXI",
  "otherNoSewerageTaxDm-22-5": "AXJ",
  "otherNoSewerageTaxDm-23-5": "AXK",
  "otherValueSewerageTaxCollected-textValue-5": "AXL",
  "otherValueSewerageTaxCollected-19-5": "AXM",
  "otherValueSewerageTaxCollected-20-5": "AXN",
  "otherValueSewerageTaxCollected-21-5": "AXO",
  "otherValueSewerageTaxCollected-22-5": "AXP",
  "otherValueSewerageTaxCollected-23-5": "AXQ",
  "otherNoSewerageTaxCollected-textValue-5": "AXR",
  "otherNoSewerageTaxCollected-19-5": "AXS",
  "otherNoSewerageTaxCollected-20-5": "AXT",
  "otherNoSewerageTaxCollected-21-5": "AXU",
  "otherNoSewerageTaxCollected-22-5": "AXV",
  "otherNoSewerageTaxCollected-23-5": "AXW",
  "otherValueSewerageTaxDm-textValue-6": "AXX",
  "otherValueSewerageTaxDm-19-6": "AXY",
  "otherValueSewerageTaxDm-20-6": "AXZ",
  "otherValueSewerageTaxDm-21-6": "AYA",
  "otherValueSewerageTaxDm-22-6": "AYB",
  "otherValueSewerageTaxDm-23-6": "AYC",
  "otherNoSewerageTaxDm-textValue-6": "AYD",
  "otherNoSewerageTaxDm-19-6": "AYE",
  "otherNoSewerageTaxDm-20-6": "AYF",
  "otherNoSewerageTaxDm-21-6": "AYG",
  "otherNoSewerageTaxDm-22-6": "AYH",
  "otherNoSewerageTaxDm-23-6": "AYI",
  "otherValueSewerageTaxCollected-textValue-6": "AYJ",
  "otherValueSewerageTaxCollected-19-6": "AYK",
  "otherValueSewerageTaxCollected-20-6": "AYL",
  "otherValueSewerageTaxCollected-21-6": "AYM",
  "otherValueSewerageTaxCollected-22-6": "AYN",
  "otherValueSewerageTaxCollected-23-6": "AYO",
  "otherNoSewerageTaxCollected-textValue-6": "AYP",
  "otherNoSewerageTaxCollected-19-6": "AYQ",
  "otherNoSewerageTaxCollected-20-6": "AYR",
  "otherNoSewerageTaxCollected-21-6": "AYS",
  "otherNoSewerageTaxCollected-22-6": "AYT",
  "otherNoSewerageTaxCollected-23-6": "AYU",
  "otherValueSewerageTaxDm-textValue-7": "AYV",
  "otherValueSewerageTaxDm-19-7": "AYW",
  "otherValueSewerageTaxDm-20-7": "AYX",
  "otherValueSewerageTaxDm-21-7": "AYY",
  "otherValueSewerageTaxDm-22-7": "AYZ",
  "otherValueSewerageTaxDm-23-7": "AZA",
  "otherNoSewerageTaxDm-textValue-7": "AZB",
  "otherNoSewerageTaxDm-19-7": "AZC",
  "otherNoSewerageTaxDm-20-7": "AZD",
  "otherNoSewerageTaxDm-21-7": "AZE",
  "otherNoSewerageTaxDm-22-7": "AZF",
  "otherNoSewerageTaxDm-23-7": "AZG",
  "otherValueSewerageTaxCollected-textValue-7": "AZH",
  "otherValueSewerageTaxCollected-19-7": "AZI",
  "otherValueSewerageTaxCollected-20-7": "AZJ",
  "otherValueSewerageTaxCollected-21-7": "AZK",
  "otherValueSewerageTaxCollected-22-7": "AZL",
  "otherValueSewerageTaxCollected-23-7": "AZM",
  "otherNoSewerageTaxCollected-textValue-7": "AZN",
  "otherNoSewerageTaxCollected-19-7": "AZO",
  "otherNoSewerageTaxCollected-20-7": "AZP",
  "otherNoSewerageTaxCollected-21-7": "AZQ",
  "otherNoSewerageTaxCollected-22-7": "AZR",
  "otherNoSewerageTaxCollected-23-7": "AZS",
  "otherValueSewerageTaxDm-textValue-8": "AZT",
  "otherValueSewerageTaxDm-19-8": "AZU",
  "otherValueSewerageTaxDm-20-8": "AZV",
  "otherValueSewerageTaxDm-21-8": "AZW",
  "otherValueSewerageTaxDm-22-8": "AZX",
  "otherValueSewerageTaxDm-23-8": "AZY",
  "otherNoSewerageTaxDm-textValue-8": "AZZ",
  "otherNoSewerageTaxDm-19-8": "BAA",
  "otherNoSewerageTaxDm-20-8": "BAB",
  "otherNoSewerageTaxDm-21-8": "BAC",
  "otherNoSewerageTaxDm-22-8": "BAD",
  "otherNoSewerageTaxDm-23-8": "BAE",
  "otherValueSewerageTaxCollected-textValue-8": "BAF",
  "otherValueSewerageTaxCollected-19-8": "BAG",
  "otherValueSewerageTaxCollected-20-8": "BAH",
  "otherValueSewerageTaxCollected-21-8": "BAI",
  "otherValueSewerageTaxCollected-22-8": "BAJ",
  "otherValueSewerageTaxCollected-23-8": "BAK",
  "otherNoSewerageTaxCollected-textValue-8": "BAL",
  "otherNoSewerageTaxCollected-19-8": "BAM",
  "otherNoSewerageTaxCollected-20-8": "BAN",
  "otherNoSewerageTaxCollected-21-8": "BAO",
  "otherNoSewerageTaxCollected-22-8": "BAP",
  "otherNoSewerageTaxCollected-23-8": "BAQ",
  "otherValueSewerageTaxDm-textValue-9": "BAR",
  "otherValueSewerageTaxDm-19-9": "BAS",
  "otherValueSewerageTaxDm-20-9": "BAT",
  "otherValueSewerageTaxDm-21-9": "BAU",
  "otherValueSewerageTaxDm-22-9": "BAV",
  "otherValueSewerageTaxDm-23-9": "BAW",
  "otherNoSewerageTaxDm-textValue-9": "BAX",
  "otherNoSewerageTaxDm-19-9": "BAY",
  "otherNoSewerageTaxDm-20-9": "BAZ",
  "otherNoSewerageTaxDm-21-9": "BBA",
  "otherNoSewerageTaxDm-22-9": "BBB",
  "otherNoSewerageTaxDm-23-9": "BBC",
  "otherValueSewerageTaxCollected-textValue-9": "BBD",
  "otherValueSewerageTaxCollected-19-9": "BBE",
  "otherValueSewerageTaxCollected-20-9": "BBF",
  "otherValueSewerageTaxCollected-21-9": "BBG",
  "otherValueSewerageTaxCollected-22-9": "BBH",
  "otherValueSewerageTaxCollected-23-9": "BBI",
  "otherNoSewerageTaxCollected-textValue-9": "BBJ",
  "otherNoSewerageTaxCollected-19-9": "BBK",
  "otherNoSewerageTaxCollected-20-9": "BBL",
  "otherNoSewerageTaxCollected-21-9": "BBM",
  "otherNoSewerageTaxCollected-22-9": "BBN",
  "otherNoSewerageTaxCollected-23-9": "BBO",
  "sewerageChrgTarrifSheet-19": "BBP",
  "omCostDeleverySewerage-19": "BBQ",
  "omCostDeleverySewerage-20": "BBR",
  "omCostDeleverySewerage-21": "BBS",
  "omCostDeleverySewerage-22": "BBT",
  "omCostDeleverySewerage-23": "BBU",
  "omCostSewerageService-19": "BBV",
  "signedPdf-19": "BBW"
}

// module.exports.downloadPTOExcel = async (req, res) => {
//   try {
//     const questions = propertyTaxOpFormJson()['tabs'][0]['data']
//     const startRowIndex = 5;
//     const questionColMapping = getQuestionsMapping(questions, 8)
//     // console.log("questionColMapping", questionColMapping)
//     let { getQuery } = req.query
//     getQuery = getQuery === "true"
//     const design_year = ObjectId(years['2023-24'])
//     if (getQuery) {
//       response.query = getQuery
//       return response
//     }

//     if (!req.query.state_code)
//       return res.status(400).json({ success: false, message: "State code is mandatory" })

//     let stateCode = req.query.state_code.split(",").map(e => e.trim())

//     // let stateList = await State.find({ "code": { $in: req.query.state_code.split(",").map(e => e.trim()) } },{"_id" : })

//     const cursor = await PropertyTaxOp.aggregate([
//       { $match: { "design_year": design_year } },
//       {
//         $lookup: {
//           from: "ulbs",
//           localField: "ulb",
//           foreignField: "_id",
//           as: "ulb"
//         }
//       },
//       { $unwind: "$ulb" },
//       {
//         $lookup: {
//           from: "states",
//           localField: "ulb.state",
//           foreignField: "_id",
//           as: "state"
//         }
//       },
//       { $unwind: "$state" },
//       { $match: { "state.code": { $in: stateCode } } },
//       {
//         $lookup: {
//           from: "propertytaxopmappers",
//           localField: "_id",
//           foreignField: "ptoId",
//           as: "propertytaxopmapper"
//         }
//       },
//       {
//         $lookup: {
//           from: "propertymapperchilddatas",
//           localField: "_id",
//           foreignField: "ptoId",
//           as: "propertymapperchilddata"
//         }
//       }
//     ]).allowDiskUse(true)
//       .cursor({ batchSize: 100 })
//       .addCursorFlag("noCursorTimeout", true)
//       .exec();

//     let counter = 0;
//     const timestamp = Date.now()

//     const tempFilePath = "uploads/p-tax"
//     if (!fs.existsSync(tempFilePath)) {
//       fs.mkdirSync(tempFilePath);
//     }

//     const template = fs.readFileSync(`p-tax/ptax-template.xlsx`)
//     fs.writeFileSync(`${tempFilePath}/${timestamp}_ptax_download.xlsx`, template)
//     const workbook = new ExcelJS.Workbook()
//     workbook.calcProperties.fullCalcOnLoad = false;

//     const crrWorkbook = await workbook.xlsx.readFile(`${tempFilePath}/${timestamp}_ptax_download.xlsx`)
//     const crrWorksheet = crrWorkbook.getWorksheet("Sheet 1")
//     crrWorksheet.properties.defaultRowHeight = null;

//     cursor.on("data", (el) => {
//       const positionValuePair = {
//         [`A${startRowIndex + counter}`]: counter + 1,
//         [`B${startRowIndex + counter}`]: el.state.name,
//         [`C${startRowIndex + counter}`]: el.ulb.name,
//         [`D${startRowIndex + counter}`]: el.ulb.code,
//         [`E${startRowIndex + counter}`]: el.ulb.censusCode ?? el.ulb.sbCode,
//         // [`F${startRowIndex + counter}`]: getKeyByValue(years, el.design_year.toString()),
//         [`F${startRowIndex + counter}`]: YEAR_CONSTANTS_IDS[el.design_year],
//         [`G${startRowIndex + counter}`]: MASTER_STATUS_ID[el.currentFormStatus],
//       }

//       const updatedDatas = {}
//       const sortedResults = el.propertytaxopmapper;
//       // const sortedResults = filteredResults.sort(sortPosition)
//       // for (const result of sortedResults) {
//       //   if (result?.year && questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`])
//       //     positionValuePair[`${questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]}${startRowIndex + counter}`] = result.value
//       //   if (!canShow(result.type, sortedResults, updatedDatas, el.ulb._id)) continue;
//       //   if (result.child && result.child.length) {
//       //     const childCounter = {}
//       //     for (const childId of result.child) {
//       //       const child = el?.propertymapperchilddata?.length > 0 ? el?.propertymapperchilddata.find(e => e._id.toString() == childId.toString()) : null
//       //       const number = decideDisplayPriority(0, child.type, result.displayPriority, child.replicaNumber, result.type)
//       //       child.displayPriority = number
//       //       if (child) {
//       //         if (!childCounter[child.type])
//       //           childCounter[child.type] = 0

//       //         if ((childCounter[child.type] % 5 === 0 || childCounter[child.type] === 0)) {
//       //           const textValueCounter = childCounter[child.type] ? childCounter[child.type] / 5 : 0
//       //           if (questionColMapping[`${child.type}-textValue-${textValueCounter}`])
//       //             positionValuePair[`${questionColMapping[`${child.type}-textValue-${textValueCounter}`]}${startRowIndex + counter}`] = child.textValue
//       //         }

//       //         if (child?.year && questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]) {
//       //           positionValuePair[`${questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]}${startRowIndex + counter}`] = child.value
//       //         }
//       //         childCounter[child.type]++
//       //       }
//       //     }
//       //   }
//       // }
//       for (const result of sortedResults) {
//         if (result?.year && questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]) {
//           positionValuePair[`${questionColMapping[`${result.type}-${YEAR_CONSTANTS_IDS[result?.year].split("-")[1]}`]}${startRowIndex + counter}`] = result.value;
//         }
//         // if (!canShow(result.type, sortedResults, updatedDatas, el.ulb._id)) continue;
//         if (result.child && result.child.length) {
//           const childCounter = new Map();
//           for (const childId of result.child) {
//             const child = el?.propertymapperchilddata?.length > 0 ? el?.propertymapperchilddata.find(e => e._id.toString() === childId.toString()) : null;
//             // const number = decideDisplayPriority(0, child.type, result.displayPriority, child.replicaNumber, result.type);
//             // child.displayPriority = number;
//             if (child) {
//               if (!childCounter.has(child.type))
//                 childCounter.set(child.type, 0);

//               if ((childCounter.get(child.type) % 5 === 0 || childCounter.get(child.type) === 0)) {
//                 const textValueCounter = childCounter.get(child.type) ? childCounter.get(child.type) / 5 : 0;
//                 if (questionColMapping[`${child.type}-textValue-${textValueCounter}`])
//                   positionValuePair[`${questionColMapping[`${child.type}-textValue-${textValueCounter}`]}${startRowIndex + counter}`] = child.textValue;
//               }

//               if (child?.year && questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]) {
//                 positionValuePair[`${questionColMapping[`${child.type}-${YEAR_CONSTANTS_IDS[child?.year].split("-")[1]}-${child.replicaNumber - 1}`]}${startRowIndex + counter}`] = child.value;
//               }
//               childCounter.set(child.type, childCounter.get(child.type) + 1);
//             }
//           }
//         }
//       }
//       for (const key in positionValuePair) {
//         crrWorksheet.getCell(key).value = positionValuePair[key]
//       }
//       crrWorkbook.xlsx.writeFile(`${tempFilePath}/${timestamp}_ptax_download.xlsx`);
//       counter++
//       console.log("counter", counter)
//     });

//     cursor.on("end", async function (el) {
//       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//       res.setHeader("Content-Disposition", "attachment; filename=" + `${timestamp}_ptax_download.xlsx`);
//       await crrWorkbook.xlsx.write(res);
//       fs.unlink(`${tempFilePath}/${timestamp}_ptax_download.xlsx`, (err) => console.log(err))
//        res.end();
//     });
//   } catch (err) {
//     console.log("err", err)
//     console.log("error in getCsvForPropertyTaxMapper ::::: ", err.message)
//   }
// }