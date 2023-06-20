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
        if (['ODF', 'GFC'].includes(collectionName))
          await setRating(el, ratingList);
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
      let limitSkip = !csv ? [{ $limit: limit }, { "$skip": skip }] : [{ $match: {} }]
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
          data: [{ $limit: limit }, { "$skip": skip }],
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
    },  ${data?.audited?.responseFile_state?.url ?? ""},${data?.audited?.rejectReason_mohua?.url ?? "" ?? ""
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
    }, ${data?.unAudited?.responseFile_state?.url ?? ""},${data?.unAudited?.rejectReason_mohua?.url ?? ""
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