const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const CollectionNames = require("../../util/collectionName");
const Response = require("../../service").response;
const Sidemenu = require("../../models/Sidemenu");
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../service");
const STATUS_LIST = require("../../util/newStatusList");
const {
  MASTER_STATUS,
  MASTER_STATUS_ID,
  YEAR_CONSTANTS,
} = require("../../util/FormNames");
const {
  canTakeActionOrViewOnlyMasterForm,
} = require("../../routes/CommonActionAPI/service");
const List = require("../../util/15thFCstatus");
const MASTERSTATUS = require("../../models/MasterStatus");
const { years } = require("../../service/years");
const mongoose = require("mongoose");

module.exports.get = async (req, res) => {
  try {
    let loggedInUserRole = req.decoded.role;
    let filter = {};
    let total;
    let design_year = req.query.design_year;
    let form = Number(req.query.formId);
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let csv = req.query.csv == "true";
    /* The above code is importing the `ulbColumnNames` and `stateColumnNames` variables from the
    `getColumns()` function and assigning them.*/
    const { ulbColumnNames, stateColumnNames } = getColumns();
    //"Missing FormId or Design Year Validation"
    if (!design_year || !form) {
      return res.status(400).json({
        success: false,
        message: "Missing FormId or Design Year",
      });
    }
    let formTab = await Sidemenu.findOne({ formId: form }).lean();
    if (loggedInUserRole == "STATE") {
      delete ulbColumnNames["stateName"];
    }
    let title_value =
      formTab.role == "ULB" ? "Review Grant Application" : "Review State Forms";

    /* The above code is defining a function called `getColumnNamesMoHUA` that takes three parameters:
    `loggedInUserRole`, `title_value`, and `ulbColumnNames`. iT generates a list of column names based on
    the provided parameters. */
    getColumnNamesMoHUA(loggedInUserRole, title_value, ulbColumnNames);

    let dbCollectionName = formTab?.dbCollectionName;
    let formType = formTab.role;
    //Add ulb filters
    ulbFilters(formType, filter, req);
    /* The code is checking if the `formTab.collectionName` is equal to the value of
    `CollectionNames["annual"]`. If it is, then it is updating the `filter` object by renaming the
    keys `filled1` and `filled2` to `filled_audited` and `filled_provisional`, respectively, and
    deleting the original keys. If it is not equal to `CollectionNames["annual"]`, then it is
    renaming the key `filled1` to `filled` and deleting the original key. */
    filterOnFilledCondition(formTab, filter);
    stateFilters(formType, filter, req);
    let state = req.query.state ?? req.decoded.state;
    if (req.decoded.role === "STATE") {
      state = req.decoded.state;
    }
    //Get Query when param is true
    let getQuery = req.query.getQuery == "true";
    if (!design_year || !form) {
      return res.status(400).json({
        success: false,
        message: "Data Missing",
      });
    }
    //path -> file of models
    let collectionName = formTab.collectionName;
    if (collectionName == CollectionNames.annual) {
      delete ulbColumnNames["filled"];
    } else {
      delete ulbColumnNames.filled_audited;
      delete ulbColumnNames.filled_provisional;
    }
    let isFormOptional = formTab.optional;
    let newFilter = await Service.mapFilterNew(filter);
    // to apply not started filter
    if (Number(req.query.status) === MASTER_STATUS["Not Started"]) {
      Object.assign(newFilter, { formData: "" });
      delete newFilter["formData.currentFormStatus"];
    }
    let folderName = formTab?.folderName;
    let params = {
      collectionName,
      formType,
      isFormOptional,
      state,
      design_year,
      csv,
      skip,
      limit,
      newFilter,
      dbCollectionName,
      folderName,
    };
    let query = computeQuery(params);
    if (getQuery)
      return res.json({
        query: query[0],
      });

    // if csv - then no skip and limit, else with skip and limit
    let data =
      formType == "ULB"
        ? Ulb.aggregate(query[0]).allowDiskUse(true)
        : State.aggregate(query[0]).allowDiskUse(true);
    total =
      formType == "ULB"
        ? Ulb.aggregate(query[1]).allowDiskUse(true)
        : State.aggregate(query[1]).allowDiskUse(true);

    let allData = await Promise.all([data, total]);
    data = allData[0];
    total = calculateCount(total, skip, allData);

    let approvedUlbs = await forms2223(collectionName, data);
    /* The above code is a function definition in JavaScript that takes in several parameters: `data`,
    `collectionName`, `loggedInUserRole`, `req`, and `approvedUlbs`. The purpose of the function is not
    clear from the code snippet alone, but it likely performs some calculations or operations based on
    the input data and returns a result. */
    calculateFormCurrentStatus(data, collectionName, loggedInUserRole, req, approvedUlbs);

    calculateStatusForStateFormste(collectionName, data);

     filterFormData(data);
    const ulbFormStatus = await getMasterStatus();

    return res.status(200).json({
      success: true,
      data: data,
      total: total,
      columnNames: formType == "ULB" ? ulbColumnNames : stateColumnNames,
      statusList: formType == "ULB" ? ulbFormStatus : List.stateFormStatus,
      ulbType: formType == "ULB" ? List.ulbType : {},
      populationType: formType == "ULB" ? List.populationType : {},
      title:
        formType == "ULB" ? "Review Grant Application" : "Review State Forms",
    });
  } catch (error) {
    return Response.BadRequest(res, {}, error.message);
  }
};

function calculateCount(total, skip, allData) {
  if (!total && skip !== 0) {
    allData[1] = [{ total: 0 }];
  }
  total = allData[1].length ? allData[1][0]["total"] : 0;
  return total;
}

function calculateFormCurrentStatus(data, collectionName, loggedInUserRole, req, approvedUlbs) {
  data.forEach((el) => {
    if (!el.formData) {
      el["formStatus"] = "Not Started";
      el["cantakeAction"] = false;
    } else {
      if (collectionName === CollectionNames.dur ||
        collectionName === CollectionNames["28SLB"]) {
        el["formStatus"] = MASTER_STATUS_ID[el.formData.currentFormStatus];
        let params = {
          status: el.formData.currentFormStatus,
          userRole: loggedInUserRole,
        };
        el["cantakeAction"] =
          req.decoded.role === "ADMIN"
            ? false
            : canTakeActionOrViewOnlyMasterForm(params);
        if (!approvedUlbs.find(
          (ulb) => ulb.toString() === el.ulbId.toString()
        ) &&
          loggedInUserRole === "MoHUA") {
          el["cantakeAction"] = false;
        }
      } else {
        // el['formStatus'] = calculateStatus(el.formData.status, el.formData.actionTakenByRole, el.formData.isDraft, formType);
        let params = {
          status: el.formData.currentFormStatus,
          userRole: loggedInUserRole,
        };
        el["cantakeAction"] =
          req.decoded.role === "ADMIN"
            ? false
            : canTakeActionOrViewOnlyMasterForm(params);
        el["formStatus"] = MASTER_STATUS_ID[el.formData.currentFormStatus];
      }
    }
  });
}

function calculateStatusForStateFormste(collectionName, data) {
  if (collectionName === CollectionNames.state_gtc ||
    collectionName === CollectionNames.state_grant_alloc) {
    data.forEach((element) => {
      let { status, pending } = countStatusData(element, collectionName);
      element.formStatus = status;
      if (pending > 0 && collectionName === CollectionNames.state_gtc) {
        element.cantakeAction = true;
      }
    });
  }
}

function filterFormData(data) {
  data.forEach((el) => {
    if (el.formData || el.formData === "")
      delete el.formData;
  });
}

async function getMasterStatus() {
  const Query15FC = {
    $or: [{ type: "15thFC" }, { multi: { $in: ["15thFC"] } }],
  };
  const ulbFormStatus = await MASTERSTATUS.find(Query15FC, {
    statusId: 1,
    status: 1,
  }).lean();
  return ulbFormStatus;
}

function stateFilters(formType, filter, req) {
  if (formType == "STATE") {
    // filter['state'] = req.query.stateName
    // filter['status'] = req.query.status
    filter["formData.currentFormStatus"] =
      req.query.status != "null" ? Number(req.query.status) : "";
    filter["state"] = req.query.state != "null" ? req.query.state : "";
    // keys = calculateKeys(filter['status'], formType);
    // Object.assign(filter, keys)
    // delete filter['status']
  }
}

function filterOnFilledCondition(formTab, filter) {
  if (formTab.collectionName == CollectionNames["annual"]) {
    filter["filled_audited"] = filter["filled1"];
    filter["filled_provisional"] = filter["filled2"];
    delete filter["filled1"];
    delete filter["filled2"];
  } else {
    filter["filled"] = filter["filled1"];
    delete filter["filled1"];
  }
}

function ulbFilters(formType, filter, req) {
  if (formType === "ULB") {
    filter["ulbName"] = req.query.ulbName != "null" ? req.query.ulbName : "";
    filter["censusCode"] =
      req.query.censusCode != "null" ? req.query.censusCode : "";
    filter["populationType"] =
      req.query.populationType != "null" ? req.query.populationType : "";
    filter["state"] =
      req.query.stateName != "null" ? req.query.stateName : "";
    filter["ulbType"] = req.query.ulbType != "null" ? req.query.ulbType : "";
    filter["UA"] = req.query.UA != "null" ? req.query.UA : "";
    filter["formData.currentFormStatus"] =
      req.query.status != "null" ? Number(req.query.status) : "";
    // keys = calculateKeys(filter['status'], formType);
    // Object.assign(filter, keys)
    // delete filter['status']
    // filled1 -> will be used for all the forms and Provisional of Annual accounts
    // filled2 -> only for annual accounts -> audited section
    filter["filled1"] = req.query.filled1 != "null" ? req.query.filled1 : "";
    filter["filled2"] = req.query.filled2 != "null" ? req.query.filled2 : "";
    if (filter["censusCode"]) {
      let code = filter["censusCode"];
      var digit = code.toString()[0];
      if (digit == "9") {
        delete filter["censusCode"];
        filter["sbCode"] = code;
      }
    }
  }
}

function getColumnNamesMoHUA(loggedInUserRole, title_value, ulbColumnNames) {
  if ((loggedInUserRole == "MoHUA" || loggedInUserRole == "ADMIN") &&
    title_value === "Review Grant Application") {
    delete ulbColumnNames["stateName"];
  }
}

function getColumns() {
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
    action: "Action",
  };
  const stateColumnNames = {
    sNo: "S No.",
    stateName: "State Name",
    formStatus: "Form Status",
  };
  return { ulbColumnNames, stateColumnNames };
}

async function forms2223(collectionName, data) {
  try {
    let ulbsArray = [],
      approvedUlbs = [];
    // let ulbsObject = {},
    let forms2223;
    let modelName;
    let designYearField = "design_year";
    if (collectionName == CollectionNames.dur) {
      designYearField = "designYear";
    }
    if (
      collectionName === CollectionNames.dur ||
      collectionName === CollectionNames["28SLB"]
    ) {
      modelName =
        collectionName === CollectionNames.dur
          ? List.ModelNames["dur"]
          : List.ModelNames["twentyEightSlbs"];
      ulbsArray = data.map((el) => {
        return el.ulbId;
      });
      // for (let entity of ulbsArray) {
      //   ulbsObject[entity] = false;
      // }
      if (Array.isArray(ulbsArray) && ulbsArray.length) {
        forms2223 = await mongoose
          .model(modelName)
          .find(
            {
              ulb: { $in: ulbsArray },
              [designYearField]: YEAR_CONSTANTS["22_23"],
            },
            { history: 0, steps: 0 }
          )
          .lean();
      }
      approvedUlbs = getUlbsApprovedByMoHUA(forms2223);
    }
    return approvedUlbs;
  } catch (error) {
    throw `forms2223:: ${error.message}`;
  }
}

function getUlbsApprovedByMoHUA(forms) {
  try {
    let ulbArray = [];
    for (let form of forms) {
      if (
        form.actionTakenByRole === "MoHUA" &&
        !form.isDraft &&
        form.status === "APPROVED"
      ) {
        ulbArray.push(form.ulb);
      }
    }
    return ulbArray;
  } catch (error) {
    throw `getUlbsApprovedByMoHUA:: ${error.message}`;
  }
}

const computeQuery = (params) => {
  const {
    collectionName: formName,
    formType: userRole,
    isFormOptional,
    state,
    design_year,
    csv,
    skip,
    limit,
    newFilter: filter,
    dbCollectionName,
    folderName,
  } = params;
  let filledQueryExpression = {};
  let filledProvisionalExpression = {},
    filledAuditedExpression = {};
  if (isFormOptional) {
    // if form is optional check if the deciding condition is true or false
    filledQueryExpression = getFilledQueryExpression(
      formName,
      filledQueryExpression,
      design_year
    );
    if (formName === CollectionNames.annual) {
      ({ filledProvisionalExpression, filledAuditedExpression } =
        getFilledQueryExpression(formName, filledQueryExpression, design_year));
    }
  }
  let dY = "$design_year";
  let designYearField = "design_year";
  if (formName == CollectionNames.dur) {
    dY = "$designYear";
    designYearField = "designYear";
  }
  switch (userRole) {
    case "ULB":
      let query = getQuery(state, dbCollectionName, design_year, dY, designYearField, isFormOptional, filledQueryExpression);
    
      annualAccountFilledStage(formName, query, filledProvisionalExpression, filledAuditedExpression);
      let countQuery = filterAndSkipStages(filter, query, skip, limit, csv);
      
      return [query, countQuery];
      break;
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
            filled: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$formData", ""] },
                    { $eq: ["$formData.isDraft", true] },
                  ],
                },
                then: "No",
                else: isFormOptional ? filledQueryExpression : "Yes",
              },
            },
          },
        },
        {
          $sort: { formData: -1 },
        },
      ];

      query_s = createDynamicQuery(formName, query_s, userRole, csv);
      /* Checking if the user role is STATE and the folder name is IndicatorForWaterSupply. */
      if (folderName === List["FolderName"]["IndicatorForWaterSupply"]) {
        let startIndex = query_s.findIndex((el) => {
          return el.hasOwnProperty("$lookup");
        });

        /* Splicing the query_s string starting at the startIndex. */
        query_s.splice(startIndex);
        query_s.push({
          $project: {
            state: "$_id",
            stateName: "$name",
            stateCode: "$code",
            regionalName: 1,
            filled: "Not Applicable",
          },
        });
      }
      let filterApplied_s = Object.keys(filter).length > 0;
      if (filterApplied_s) {
        query_s.push({
          $match: filter,
        });
      }
      let countQuery_s = query_s.slice();
      countQuery_s.push({
        $count: "total",
      });
      let paginator_s = [
        {
          $skip: skip,
        },
        { $limit: limit },
      ];
      if (!csv) {
        query_s.push(...paginator_s);
      }
      return [query_s, countQuery_s];
      break;

    default:
      break;
  }
};

function filterAndSkipStages(filter, query, skip, limit, csv) {
  let filterApplied = Object.keys(filter).length > 0;
  if (filterApplied) {
    if (filter.sbCode) {
      delete Object.assign(filter, { ["censusCode"]: filter["sbCode"] })["sbCode"];
    }
    query.push({
      $match: filter,
    });
  }
  let countQuery = query.slice();
  countQuery.push({
    $count: "total",
  });

  let paginator = [
    { $addFields: { dummy: [] } },
    {
      $unwind: {
        path: "$dummy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $skip: skip,
    },
    { $limit: limit },
  ];
  if (!csv) {
    query.push(...paginator);
  }
  return countQuery;
}

function annualAccountFilledStage(formName, query, filledProvisionalExpression, filledAuditedExpression) {
  if (formName == CollectionNames.annual) {
    delete query[query.length - 2]["$project"]["filled"];
    Object.assign(query[query.length - 2]["$project"], {
      filled_provisional: filledProvisionalExpression,
      filled_audited: filledAuditedExpression,
    });
  }
}

function getQuery(state, dbCollectionName, design_year, dY, designYearField, isFormOptional, filledQueryExpression) {
  let query = [
    {
      $match: {
        access_2223: true,
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
      $unwind: "$state",
    },
    {
      $match: {
        "state.accessToXVFC": true,
      },
    },
  ];
  if (state && state !== "null") {
    query.push({
      $match: {
        "state._id": ObjectId(state),
      },
    });
  }
  let query_2 = [
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
                  $eq: ["$formData.currentFormStatus", 1],
                },
                {
                  $eq: ["$formData.currentFormStatus", 2],
                },
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
  query.push(...query_2);
  return query;
}

function getFilledQueryExpression(
  formName,
  filledQueryExpression,
  design_year
) {
  let filledAuditedExpression = {},
    filledProvisionalExpression = {};
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
      if (design_year === years["2023-24"]) {
        filledQueryExpression = STATUS_LIST.Submitted;
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
      return { filledProvisionalExpression, filledAuditedExpression };
      break;
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
