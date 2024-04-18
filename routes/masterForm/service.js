const catchAsync = require("../../util/catchAsync");
const MasterFormData = require("../../models/MasterForm");
const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../service");
const UA = require("../../models/UA");
const moment = require("moment");
const util = require("util");
const { forEach } = require("jszip");
const User = require("../../models/User");
const State = require("../../models/State");
const Response = require("../../service").response;
const Redis = require("../../service/redis");
const { promisify } = require("util");
const { toUnicode } = require("punycode");
const MasterForm = require("../../models/MasterForm");
const UtilizationReport = require("../../models/UtilizationReport");
const Category = require("../../models/Category");
const statusTypes = require("../../util/statusTypes");
const { getKeyByValue } = require('../../util/masterFunctions');
const { years } = require('../../service/years');


const { dateFormatter}  = require('../../util/dateformatter')
module.exports.get = catchAsync(async (req, res) => {
  let user = req.decoded;

  let { design_year, masterform_id } = req.params;
  if (!design_year) {
    return res.status(400).json({
      success: false,
      message: "Design Year Not Found",
    });
  }
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  let query = {
    ulb: ObjectId(user.ulb),
    design_year: ObjectId(design_year),
  };

  if (masterform_id && user.role != "ULB") {
    query = [
      {
        $match: {
          _id: ObjectId(masterform_id),
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulbInfo",
        },
      },
      { $unwind: "$ulbInfo" },
      {
        $lookup: {
          from: "states",
          localField: "ulbInfo.state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $project: {
          steps: "$steps",
          history: "$history",
          isUA: "$ulbInfo.isUA",
          isMillionPlus: "$ulbInfo.isMillionPlus",
          UA: "$ulbInfo.UA",
          status: "$status",
          isSubmit: "$isSubmit",
          modifiedAt: "$modifiedAt",
          createdAt: "$createdAt",
          isActive: "$isActive",
          ulb: "$ulb",
          ulbName: "$ulbInfo.name",
          actionTakenBy: "$actionTakenBy",
          state: "$state._id",
          stateName: "$state.name",
          design_year: "$design_year",
          actionTakenByRole: "$actionTakenByRole",
        },
      },
    ];

    let masterFormData = await MasterFormData.aggregate(query);

    if (!masterFormData || masterFormData.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Master Data Not Found for " + user.name,
      });
    } else {
      masterFormData = JSON.parse(JSON.stringify(masterFormData[0]));
      let percentage = calculatePercentage(masterFormData, user.role);
      if (masterFormData.actionTakenByRole != user.role) {
        if (masterFormData.history.length != 0)
          masterFormData =
            masterFormData.history[masterFormData.history.length - 1];
        masterFormData["stateName"] = masterFormData.stateName;
        masterFormData["ulbName"] = masterFormData.ulbName;
      }
      if (
        user.role == "MoHUA" &&
        masterFormData.actionTakenByRole == "STATE" &&
        masterFormData.status == "APPROVED"
      ) {
        for (const key in masterFormData.steps) {
          if (masterFormData.steps[key].status == "N/A" || masterFormData.steps[key].status === "NA") continue;
          masterFormData.steps[key].status = "PENDING";
        }
        try {
          masterFormData = await updateDataInMaster(
            masterFormData,
            req.decoded
          );
        } catch (error) {
          console.log(error);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Data Found Successfully!",
        response: masterFormData,
        percentage: percentage,
      });
    }
  }
  console.log("before percentage function");
  let masterFormData = await MasterFormData.findOne(query);
  let percentage = calculatePercentage(masterFormData, user.role);
  if (masterFormData["actionTakenByRole"] != user.role) {
    masterFormData = masterFormData.history[masterFormData.history.length - 1];
    masterFormData["stateName"] = masterFormData.stateName;
    masterFormData["ulbName"] = masterFormData.ulbName;
  }
  masterFormData.history = null;
  if (!masterFormData) {
    return res.status(500).json({
      success: false,
      message: "Master Data Not Found for " + user.name,
    });
  } else {
    return res.status(200).json({
      success: true,
      message: "Data Found Successfully!",
      response: masterFormData,
      percentage: percentage,
    });
  }
});

const updateDataInMaster = async (data, user) => {
  const { design_year, state, ulb } = data;
  let newData = new MasterForm();
  newData.actionTakenBy = user._id;
  newData.actionTakenByRole = user.role;
  newData.modifiedAt = new Date();
  newData.steps = data.steps;
  newData = JSON.parse(JSON.stringify(newData));
  delete newData.history;
  delete newData._id;
  let query = [
    {
      $match: {
        $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
      }
    },
    {
      $match: {
        _id: ObjectId(ulb),
      },
    },
    {
      $lookup: {
        from: "annualaccountdatas",
        pipeline: [
          {
            $match: {
              ulb: ObjectId(ulb),
              design_year: ObjectId(design_year),
            },
          },
          {
            $project: {
              status: 1,
              actionTakenByRole: 1,
              isSubmit: 1,
            },
          },
        ],
        as: "annualAccountData",
      },
    },
    {
      $lookup: {
        from: "utilizationreports",
        pipeline: [
          {
            $match: {
              ulb: ObjectId(ulb),
              designYear: ObjectId(design_year),
            },
          },
          {
            $project: {
              status: 1,
              actionTakenByRole: 1,
              isSubmit: 1,
            },
          },
        ],
        as: "utilizationReport",
      },
    },
    {
      $lookup: {
        from: "xvfcgrantplans",
        pipeline: [
          {
            $match: {
              ulb: ObjectId(ulb),
              designYear: ObjectId(design_year),
            },
          },
          {
            $project: {
              status: 1,
              actionTakenByRole: 1,
              isSubmit: 1,
            },
          },
        ],
        as: "plansData",
      },
    },
    {
      $lookup: {
        from: "xvfcgrantulbforms",
        pipeline: [
          {
            $match: {
              ulb: ObjectId(ulb),
              design_year: ObjectId(design_year),
            },
          },
          {
            $project: {
              waterManagement: 1,
              actionTakenByRole: 1,
              isSubmit: 1,
            },
          },
        ],
        as: "SLBs",
      },
    },
    {
      $project: {
        SLBs: 1,
        plansData: 1,
        utilizationReport: 1,
        annualAccountData: 1,
      },
    },
  ];
  let compareData = await Ulb.aggregate(query);
  compareData = JSON.parse(JSON.stringify(compareData[0]));
  if (compareData.annualAccountData[0]?.actionTakenByRole == "MoHUA") {
    newData.steps.annualAccounts.status =
      compareData.annualAccountData[0].status;
  }
  if (compareData.SLBs[0]?.actionTakenByRole == "MoHUA") {
    newData.steps.slbForWaterSupplyAndSanitation.status =
      compareData.SLBs[0].waterManagement.status;
  }
  if (compareData.plansData[0]?.actionTakenByRole == "MoHUA") {
    newData.steps.plans.status = compareData.plansData[0].status;
  }
  if (compareData.utilizationReport[0]?.actionTakenByRole == "MoHUA") {
    newData.steps.utilReport.status = compareData.utilizationReport[0].status;
  }
  await MasterFormData.findOneAndUpdate(
    { ulb: ObjectId(ulb), design_year: ObjectId(design_year) },
    newData,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
  return newData;
};

module.exports.getAll = catchAsync(async (req, res) => {
  let statusFilter = {
    1: {
      status: "PENDING",
      isCompleted: false,
      actionTakenByUserRole: "ULB",
    },
    2: {
      $or: [
        {
          status: "PENDING",
          isCompleted: true,
          actionTakenByUserRole: "ULB",
        },
        { isCompleted: false, actionTakenByUserRole: "STATE" },
      ],
    },
    3: {
      $or: [
        { status: "APPROVED", actionTakenByUserRole: "STATE" },
        { isCompleted: false, actionTakenByUserRole: "MoHUA" },
      ],
    },
    4: { status: "REJECTED", actionTakenByUserRole: "STATE" },
    5: { status: "REJECTED", actionTakenByUserRole: "MoHUA" },
    6: { status: "APPROVED", actionTakenByUserRole: "MoHUA" },
  };
  let { state_id } = req.query
  let user = req.decoded,
    filter =
      req.query.filter && !req.query.filter != "null"
        ? JSON.parse(req.query.filter)
        : req.body.filter
          ? req.body.filter
          : {},
    sort =
      req.query.sort && !req.query.sort != "null"
        ? JSON.parse(req.query.sort)
        : req.body.sort
          ? req.body.sort
          : {},
    skip = req.query.skip ? parseInt(req.query.skip) : 0,
    csv = req.query.csv === "true",
    limit = req.query.limit ? parseInt(req.query.limit) : 50;

  if (filter["censusCode"]) {
    let code = filter["censusCode"];
    var digit = code.toString()[0];
    if (digit == "9") {
      delete filter["censusCode"];
      filter["sbCode"] = code;
    }
  }

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found!",
    });
  }
  if (user.role === "ADMIN" || "MoHUA" || "PARTNER" || "USER" || "STATE") {
    let { design_year } = req.params;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User Not Found",
      });
    }

    let match = {
      $match: {
        design_year: ObjectId(design_year),
      },
    };


    if (state_id && state_id != 'null') {
      match = {

        $match: {
          state: ObjectId(state_id),
          design_year: ObjectId(design_year)
        }
      }
    }
    let state = user.state ?? state_id
    if (user.role === "STATE") {
      match = {
        $match: {
          design_year: ObjectId(design_year),
          state: ObjectId(user.state),
        },
      };
    }

    let queryFilled = [
      match,
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      { $unwind: "$ulb" },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulb.ulbType",
        },
      },
      { $unwind: "$ulb.ulbType" },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $match: {
          "state.accessToXVFC": true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "actionTakenBy",
          foreignField: "_id",
          as: "actionTakenBy",
        },
      },
      { $unwind: "$actionTakenBy" },

      {
        $lookup: {
          from: "uas",
          localField: "ulb.UA",
          foreignField: "_id",
          as: "ulb.UA",
        },
      },
      // { $unwind: '$ulb.UA' },
      {
        $project: {
          state: "$state.name",
          ulbName: "$ulb.name",
          ulb: "$ulb._id",
          censusCode: "$ulb.censusCode",
          sbCode: "$ulb.sbCode",
          populationType: {
            $cond: {
              if: { $eq: ["$ulb.isMillionPlus", "Yes"] },
              then: "Million Plus",
              else: "Non Million",
            },
          },
          isUA: "$ulb.isUA",
          isMillionPlus: "$ulb.isMillionPlus",
          UA: {
            $cond: {
              if: { $eq: ["$ulb.isUA", "Yes"] },
              then: { $arrayElemAt: ["$ulb.UA.name", 0] },
              else: "NA",
            },
          },
          ulbType: "$ulb.ulbType.name",
          actionTakenByUserRole: "$actionTakenBy.role",
          status: {
            $cond: {
              if: { $eq: ["$status", "NA"] },
              then: "Not Started",
              else: "$status",
            },
          },
          createdAt: "$createdAt",
          isSubmit: 1,
          modifiedAt: "$modifiedAt",
          utilReport: "$steps.utilReport",
          pfmsAccount: "$steps.pfmsAccount",
          plans: "$steps.plans",
          slbForWaterSupplyAndSanitation:
            "$steps.slbForWaterSupplyAndSanitation",
          annualAccounts: "$steps.annualAccounts",
        },
      },
    ];
    // let match2 =  {
    //   $match: {
    //     state: ObjectId(state),
    //   },
    // };
    let accessVariable = await getAccessYearKey(design_year);
    let queryNotStarted = [
      {
        $match: {
          [accessVariable]:true,
          $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
        }
      },
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $match: {
          "state.accessToXVFC": true,
        },
      },
      {
        $lookup: {
          from: "masterforms",
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
                      $eq: ["$ulb", "$$secondUser"],
                    },
                  ],
                },
              },
            },
          ],
          as: "masterformData",
        },

      },
      {
        $unwind: {
          path: "$masterformData",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $match: {
          masterformData: { $exists: false },
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
        $lookup: {
          from: "ulbtypes",
          localField: "ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      { $unwind: "$ulbType" },
      { $addFields: { printStatus: "Not Started" } },
      {
        $project: {
          state: "$state.name",
          ulbName: "$name",
          ulb: "$_id",
          censusCode: "$censusCode",
          sbCode: "$sbCode",
          populationType: {
            $cond: {
              if: { $eq: ["$isMillionPlus", "Yes"] },
              then: "Million Plus",
              else: "Non Million",
            },
          },
          isUA: "$isUA",
          isMillionPlus: "$isMillionPlus",
          UA: {
            $cond: {
              if: { $eq: ["$isUA", "Yes"] },
              then: { $arrayElemAt: ["$UA.name", 0] },
              else: "NA",
            },
          },
          ulbType: "$ulbType.name",
          printStatus: 1,
        },
      },
    ];
    if (user.role === "ADMIN" || "MoHUA" || "PARTNER" || "USER" || "STATE") {
      if (state) {
        queryNotStarted.unshift({
          $match: {
            state: ObjectId(state),
          },
        });
      }

    }

    let newFilter = await Service.mapFilter(filter);
    let total = undefined;
    let priority = false;

    // if (newFilter["status"]) {

    //   Object.assign(newFilter, statusFilter[newFilter["status"]]);
    //   newFilter['printStatus'] = newFilter['status']
    //   delete newFilter['status']
    // }
    if (newFilter && !newFilter["status"] && Object.keys(newFilter).length) {
      queryFilled.push({ $match: newFilter });
      queryNotStarted.push({ $match: newFilter });
    }

    if (sort && Object.keys(sort).length) {
      queryFilled.push({ $sort: sort });
      queryNotStarted.push({ $sort: sort });
    } else {
      if (priority) {
        sort = {
          $sort: { priority: -1, priority_1: -1, modifiedAt: -1 },
        };
      } else {
        sort = { $sort: { createdAt: -1 } };
      }
      queryFilled.push(sort);
      queryNotStarted.push(sort);
    }

    if (csv) {
      let arr = await MasterFormData.aggregate(queryFilled).exec();
      for (d of arr) {
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = statusTypes.In_Progress;
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == true &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = statusTypes.Under_Review_By_State;
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = statusTypes.Under_Review_By_State;
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = statusTypes.Approved_By_State;
        }
        if (d.isSubmit == false && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = statusTypes.Approved_By_State;
        }
        if (
          d.status == "PENDING" &&
          d.actionTakenByUserRole == "STATE" &&
          d.isSubmit == false
        ) {
          d["printStatus"] = statusTypes.Under_Review_By_State;
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = statusTypes.Rejected_By_State;
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = statusTypes.Rejected_By_MoHUA;
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = statusTypes.Approval_Completed;
        }
      }
      let field = csvULBReviewData();
      if (user.role == "STATE") {
        delete field.state;
      }
      let xlsData = await Service.dataFormating(arr, field);
      let date = moment().format("DD-MMM-YY").toString();
      let filename = `15th-FC-Form${date}.xlsx`;
      return res.xls(filename, xlsData);
    } else {
      if (!skip) {
        let qrr = [...queryFilled, { $count: "count" }];
        // console.log(util.inspect(qrr, {showHidden: false, depth : null}))
        let d = await MasterFormData.aggregate(qrr);
        total = d.length ? d[0].count : 0;
      }
      queryFilled.push({ $skip: skip });
      queryNotStarted.push({ $skip: skip });
      // queryFilled.push({ $limit: limit });
      // queryNotStarted.push({ $limit: limit });
      // console.log(util.inspect(queryFilled, { showHidden: false, depth: null }))
      let masterFormData = await MasterFormData.aggregate(queryFilled).exec();
      let p1 = [];
      let p2 = [];
      let p3 = [];
      let p4 = [];
      let p5 = [];
      let p6 = [];
      let finalOutput = [];

      for (d of masterFormData) {
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = statusTypes.In_Progress;
          p6.push(d);
        } else if (
          d.status == "PENDING" &&
          d.isSubmit == true &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = statusTypes.Under_Review_By_State;
          p2.push(d);
        } else if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = statusTypes.Under_Review_By_State;
          p2.push(d);
        } else if (
          d.status == "APPROVED" &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = statusTypes.Approved_By_State;
          p1.push(d);
        } else if (d.isSubmit == false && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = statusTypes.Approved_By_State;
          p1.push(d);
        } else if (
          d.status == "REJECTED" &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = statusTypes.Rejected_By_State;
          p5.push(d);
        } else if (
          d.status == "REJECTED" &&
          d.actionTakenByUserRole == "MoHUA"
        ) {
          d["printStatus"] = statusTypes.Rejected_By_MoHUA;
          p4.push(d);
        } else if (
          d.status == "APPROVED" &&
          d.actionTakenByUserRole == "MoHUA"
        ) {
          d["printStatus"] = statusTypes.Approval_Completed;
          p3.push(d);
        }
      }
      console.log(util.inspect(queryNotStarted, { showHidden: false, depth: null }))
      let noMasterFormData = await Ulb.aggregate(queryNotStarted).exec();
      finalOutput.push(
        ...p1,
        ...p2,
        ...p3,
        ...p4,
        ...p5,
        ...p6,
        ...noMasterFormData
      );
      let tryData = [];
      if (newFilter["status"]) {
        finalOutput = finalOutput.filter((data) => {
          // console.log(data.printStatus.toLowerCase() == newFilter["status"].toLowerCase())
          return (
            data.printStatus.toLowerCase() == newFilter["status"].toLowerCase()
          );
        });
      }
      console.log(finalOutput);
      if (finalOutput) {
        return res.status(200).json({
          success: true,
          message: "ULB Master Form Data Found Successfully!",
          data: finalOutput,
          total: finalOutput.length,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "No Data Found",
        });
      }
    }
  } else {
    return res.status(403).json({
      success: false,
      message: user.role + " is Not Authenticated to Perform this Action",
    });
  }
});

module.exports.getAllForms = catchAsync(async (req, res) => {

  try {
    const { design_year, ulb, financialYear } = req.query;

    let query = [
      {
        $match: {
          $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
        }
      },
      {
        $match: {
          _id: ObjectId(ulb),
        },
      },
      {
        $lookup: {
          from: "annualaccountdatas",
          pipeline: [
            {
              $match: {
                ulb: ObjectId(ulb),
                design_year: ObjectId(design_year),
              },
            },
            {
              $project: {
                history: 0,
              },
            },
          ],
          as: "annualAccountData",
        },
      },
      {
        $lookup: {
          from: "utilizationreports",
          pipeline: [
            {
              $match: {
                ulb: ObjectId(ulb),
                designYear: ObjectId(design_year),
                financialYear: ObjectId(financialYear),
              },
            },
            {
              $project: {
                history: 0,
              },
            },
          ],
          as: "utilizationReport",
        },
      },
      {
        $lookup: {
          from: "xvfcgrantulbforms",
          pipeline: [
            {
              $match: {
                ulb: ObjectId(ulb),
                design_year: ObjectId(design_year),
              },
            },
            {
              $project: {
                history: 0,
              },
            },
          ],
          as: "SLBs",
        },
      },
      {
        $project: {
          history: 0,
        },
      },
    ];
    let fetchMasterQuery = [
      {
        $match: {
          ulb: ObjectId(ulb),
          design_year: ObjectId(design_year),
        },
      },
    ];
    const masterData = await MasterFormData.aggregate(fetchMasterQuery);
    let submissionByUlb = "";
    let actionInfo = "";
    if (masterData.length > 0) {
      masterFormData = masterData[0];
      if (masterFormData["status"] == "PENDING") {
        if (masterFormData["history"].length == 0) {
          submissionByUlb = "Not Submitted by ULB";
          actionInfo = "No Action Taken by State/MoHUA";
        } else {
          if (masterFormData["isSubmit"]) {
            submissionByUlb =
              "Submitted by ULB on " +
              masterFormData["modifiedAt"]
                .toString()
                .replace("GMT+0530 (India Standard Time)", "");
            if (masterFormData["history"].length > 1) {
              let len = masterFormData["history"].length;
              let historicalData = masterFormData["history"][len - 2];
              let role = historicalData["actionTakenByRole"];
              let status = historicalData["status"];
              let date = historicalData["modifiedAt"];
              actionInfo =
                status +
                " by " +
                role +
                " on " +
                date.toString().replace("GMT+0530 (India Standard Time)", "");
            } else {
              actionInfo = "No Action Taken by State/MoHUA";
            }
          } else {
            if (masterFormData["actionTakenByRole"] == "ULB") {
              submissionByUlb = "Not Submitted by ULB";
              let len = masterFormData["history"].length;
              let historicalData = masterFormData["history"][len - 1];
              let role = historicalData["actionTakenByRole"];
              let status = historicalData["status"];
              let date = historicalData["modifiedAt"];
              actionInfo =
                status +
                " by " +
                role +
                " on " +
                date.toString().replace("GMT+0530 (India Standard Time)", "");
            } else if (masterFormData["actionTakenByRole"] == "STATE") {
              let len = masterFormData["history"].length;
              let historicalData = masterFormData["history"][len - 1];
              let role = historicalData["actionTakenByRole"];
              let status = historicalData["status"];
              let date = historicalData["modifiedAt"];
              submissionByUlb =
                "Submitted by " +
                role +
                " on " +
                date.toString().replace("GMT+0530 (India Standard Time)", "");
              actionInfo = "Under Review by State";
            } else if (masterFormData["actionTakenByRole"] == "MoHUA") {
              let len = masterFormData["history"].length;
              let historicalDataULB = masterFormData["history"][len - 2];
              let historicalDataSTATE = masterFormData["history"][len - 1];
              let roleULB = historicalDataULB["actionTakenByRole"];
              let statusULB = historicalDataULB["status"];
              let dateULB = historicalDataULB["modifiedAt"];
              let roleSTATE = historicalDataSTATE["actionTakenByRole"];
              let statusSTATE = historicalDataSTATE["status"];
              let dateSTATE = historicalDataSTATE["modifiedAt"];

              if (dateSTATE !== null) {
                dateSTATE
                  .toString()
                  .replace("GMT+0530 (India Standard Time)", "")
              }
              if (dateULB !== null) {
                dateULB.toString().replace("GMT+0530 (India Standard Time)", "")
              }
              submissionByUlb =
                "Submitted by " +
                roleULB +
                " on " +
                dateULB;
              actionInfo =
                statusSTATE +
                " by " +
                roleSTATE +
                " on " +
                dateSTATE;
            }
          }
        }
      } else if (
        masterFormData["status"] == "APPROVED" ||
        masterFormData["status"] == "REJECTED"
      ) {
        let len = masterFormData["history"].length;
        let historicalData;
        if (masterFormData["actionTakenByRole"] == "MoHUA") {
          historicalData = masterFormData["history"][len - 2];
        } else if (masterFormData["actionTakenByRole"] == "STATE") {
          historicalData = masterFormData["history"][len - 1];
        }
        submissionByUlb =
          "Submitted by ULB on " +
          historicalData["modifiedAt"]
            .toString()
            .replace("GMT+0530 (India Standard Time)", "");
        actionInfo =
          masterFormData["status"] +
          " by " +
          masterFormData["actionTakenByRole"] +
          " on " +
          masterFormData["modifiedAt"]
            .toString()
            .replace("GMT+0530 (India Standard Time)", "");
      }
    }
    const data = await Ulb.aggregate(query);

    let queryUtilReportAnalytics = [
      {
        $match: {
          ulb: ObjectId(ulb),
          designYear: ObjectId(design_year),
          financialYear: ObjectId(financialYear),
        },
      },
      {
        $unwind: "$projects",
      },
      {
        $group: {
          _id: "$projects.category",
          count: { $sum: 1 },
          amount: { $sum: { $toDouble: "$projects.expenditure" } },
          totalProjectCost: { $sum: { $toDouble: "$projects.cost" } },
        },
      },
    ];
    let arr = await UtilizationReport.aggregate(queryUtilReportAnalytics);
    let catData = await Category.find().lean().exec();
    let flag = 0;
    let filteredCat = [];
    for (let el of catData) {
      for (let el2 of arr) {
        // console.log(el['_id'], el2['_id'])
        if (String(el["_id"]) === String(el2["_id"])) {
          // console.log(ObjectId(el._id), ObjectId(el2._id))
          flag = 1;
          break;
        }
      }
      if (!flag) {
        filteredCat.push(el);
      } else {
        flag = 0;
      }
    }
    // console.log(filteredCat)
    filteredCat.forEach((el) => {
      arr.push({
        _id: el._id,
        count: 0,
        amount: 0,
        totalProjectCost: 0,
      });
    });
    data[0]["utilizationReport"][0]["analytics"] = arr;
    //index of "on" in the text output
    let onIndexInSubmissionByUlb = -1;
    const addOnIndex = 4
    submissionByUlb.search(" on ") !== -1 ? onIndexInSubmissionByUlb = submissionByUlb.search(" on ") : "" ;
    let newSubmisionByUlbDate = submissionByUlb.slice(0, onIndexInSubmissionByUlb + addOnIndex).concat( dateFormatter(submissionByUlb.slice(onIndexInSubmissionByUlb, submissionByUlb.length),'-'));

    let onIndexInActionInfo = -1;
    actionInfo.search(" on ") !== -1 ? onIndexInActionInfo = actionInfo.search(" on ") : "" ;
    let newActonInfoDate = actionInfo.slice(0, onIndexInActionInfo + addOnIndex).concat( dateFormatter(actionInfo.slice(onIndexInActionInfo, actionInfo.length),'-'));
    
    data[0]["submissionByUlb"] = newSubmisionByUlbDate;
    data[0]["actionInfo"] = newActonInfoDate;
    // console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }))
    return res.json(data);
  } catch (error) {
    console.log("error", error)
    return res.status(400).json({
      success: false,
      data: "Something went wrong!",
    });
  }
});

module.exports.plansData = catchAsync(async (req, res) => {
  let { state_id } = req.query;
  let user = req.decoded;
  let { design_year } = req.params;
  let state = user.state ?? state_id;
  // console.log(user)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }

  let baseQuery = [
    {
      $match: {
        state: ObjectId(state),
      },
    },
    {
      $group: {
        _id: null,
        totalULBs: { $sum: { $size: "$ulb" } },
      },
    },
  ];
  if (user.role != "STATE" && !state) {
    baseQuery = [
      {
        $group: {
          _id: null,
          totalULBs: { $sum: { $size: "$ulb" } },
        },
      },
    ];
  }

  let count = await UA.aggregate(baseQuery);
  // console.log(count);
  let query = [
    {
      $match: {
        state: ObjectId(state),
      },
    },
    {
      $group: {
        _id: "$state",
        totalULBs: { $sum: { $size: "$ulb" } },
        ulbs: { $push: "$ulb" },
      },
    },
    {
      $project: {
        totalULBs: 1,
        ulb: {
          $reduce: {
            input: "$ulbs",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
      },
    },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb",
        foreignField: "ulb",
        as: "masterformData",
      },
    },
    { $unwind: "$masterformData" },
    {
      $match: {
        "masterformData.design_year": ObjectId(design_year),
        $or: [
          {
            $and: [
              { "masterformData.actionTakenByRole": "STATE" },
              { "masterformData.status": "APPROVED" },
            ],
          },

          {
            $and: [
              { "masterformData.actionTakenByRole": "MoHUA" },
              {
                $or: [
                  { "masterformData.status": "APPROVED" },
                  { "masterformData.status": "PENDING" },
                ],
              },
            ],
          },
        ],
      },
    },
    { $count: "filledULBs" },
  ];
  if (user.role != "STATE" && !state) {
    query = [
      {
        $group: {
          _id: "$state",
          totalULBs: { $sum: { $size: "$ulb" } },
          ulbs: { $push: "$ulb" },
        },
      },
      {
        $project: {
          totalULBs: 1,
          ulb: {
            $reduce: {
              input: "$ulbs",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $lookup: {
          from: "masterforms",
          localField: "ulb",
          foreignField: "ulb",
          as: "masterformData",
        },
      },
      { $unwind: "$masterformData" },
      {
        $match: {
          "masterformData.design_year": ObjectId(design_year),
          $or: [
            {
              $and: [
                { "masterformData.actionTakenByRole": "STATE" },
                { "masterformData.status": "APPROVED" },
              ],
            },

            {
              $and: [
                { "masterformData.actionTakenByRole": "MoHUA" },
                {
                  $or: [
                    { "masterformData.status": "APPROVED" },
                    { "masterformData.status": "PENDING" },
                  ],
                },
              ],
            },
          ],
        },
      },
      { $count: "filledULBs" },
    ];
  }
  let data = await UA.aggregate(query);
  // console.log(data[0]?.filledULBs, count[0]?.totalULBs)

  let finalData = {
    filledULBs: data[0]?.filledULBs ? data[0]?.filledULBs : 0,
    totalULBs: count[0]?.totalULBs ? count[0]?.totalULBs : 0,
  };
  res.json({
    success: true,
    data: finalData,
  });
});

module.exports.UAList = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query;
  let state = user.state ?? state_id;
  let uaData = await UA.find({ state: ObjectId(state) });
  return res.status(200).json({
    success: true,
    data: uaData,
  });
});

module.exports.slbWaterSanitationState = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query;
  if (state_id == "undefined") {
    state_id = undefined;
  }
  let state = req.decoded.state ?? state_id;
  let { ua_id } = req.query;

  let { design_year } = req.params;
  let match = {};

  let countQuery = [
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    { $unwind: "$ulb" },
    {
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 },
      },
    },
  ];

  let queryNotStarted = [
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    { $unwind: "$ulb" },
    {
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 },
        ulb: { $addToSet: "$ulb" },
      },
    },
    { $unwind: "$ulb" },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb._id",
        foreignField: "ulb",
        as: "masterFormData",
      },
    },
    {
      $match: {
        "masterFormData._id": { $exists: false },
      },
    },
    {
      $group: {
        _id: null,
        totalULBsInUA: { $first: "$totalULBsinUA" },
        notStarted: { $sum: 1 },
      },
    },
  ];
  let queryUA = [
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    { $unwind: "$ulb" },
    {
      $match: {
        "ulb.isUA": "Yes",
      },
    },

    {
      $lookup: {
        from: "masterforms",
        localField: "ulb._id",
        foreignField: "ulb",
        as: "masterFormData",
      },
    },
    {
      $unwind: "$masterFormData",
    },

    {
      $group: {
        _id: {
          actionTakenByRole: "$masterFormData.actionTakenByRole",
          status: "$masterFormData.status",
          isSubmit: "$masterFormData.isSubmit",
          slbFormStatus:
            "$masterFormData.steps.slbForWaterSupplyAndSanitation.status",
          slbFormComplete:
            "$masterFormData.steps.slbForWaterSupplyAndSanitation.isSubmit",
        },
        count: { $sum: 1 },
      },
    },
  ];

  let queryNonMillionNonUA_NotStarted = [
    {
      $match: {
        $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
      }
    },
    {
      $match: {
        isMillionPlus: "No",
        isUA: "No",
      },
    },
    {
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 },
        ulb_id: { $addToSet: "$_id" },
      },
    },
    { $unwind: "$ulb_id" },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb_id",
        foreignField: "ulb",
        as: "masterFormData",
      },
    },
    {
      $match: {
        "masterFormData._id": { $exists: false },
      },
    },
    {
      $group: {
        _id: null,
        totalULBsInUA: { $first: "$totalULBsinUA" },
        notStarted: { $sum: 1 },
      },
    },
  ];
  let queryNonMillionNonUA = [
    {
      $match: {
        $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
      }
    },
    {
      $match: {
        isMillionPlus: "No",
        isUA: "No",
      },
    },
    {
      $lookup: {
        from: "masterforms",
        localField: "_id",
        foreignField: "ulb",
        as: "masterFormData",
      },
    },
    {
      $unwind: "$masterFormData",
    },

    {
      $group: {
        _id: {
          actionTakenByRole: "$masterFormData.actionTakenByRole",
          status: "$masterFormData.status",
          isSubmit: "$masterFormData.isSubmit",
          slbFormStatus:
            "$masterFormData.steps.slbForWaterSupplyAndSanitation.status",
          slbFormComplete:
            "$masterFormData.steps.slbForWaterSupplyAndSanitation.isSubmit",
        },
        count: { $sum: 1 },
      },
    },
  ];
  if (state) {
    if (ua_id == "all") {
      match = {
        $match: {
          state: ObjectId(state),
        },
      };
    } else {
      match = {
        $match: {
          _id: ObjectId(ua_id),
        },
      };
    }

    countQuery.unshift(match);
    queryNotStarted.unshift(match);
    queryUA.unshift(match);
    queryNonMillionNonUA_NotStarted.unshift({
      $match: {
        state: ObjectId(state),
      },
    });
    queryNonMillionNonUA.unshift({
      $match: {
        state: ObjectId(state),
      },
    });
  } else {
    let UT_Filter = [
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $match: {
          "state.accessToXVFC": true,
        },
      },
    ];

    queryNonMillionNonUA_NotStarted.unshift(...UT_Filter);
    queryNonMillionNonUA.unshift(...UT_Filter);
  }

  let { output1, output2, output3, output4, output5 } = await new Promise(
    async (resolve, reject) => {
      let prms1 = new Promise(async (rslv, rjct) => {
        // console.log(util.inspect(countQuery, { showHidden: true, depth: null }))
        let output = await UA.aggregate(countQuery);
        rslv(output);
      });

      let prms2 = new Promise(async (rslv, rjct) => {
        // console.log(util.inspect(queryNotStarted, { showHidden: false, depth: null }))
        let output = await UA.aggregate(queryNotStarted);
        rslv(output);
      });
      let prms3 = new Promise(async (rslv, rjct) => {
        // console.log(util.inspect(queryUA, { showHidden: true, depth: null }))
        let output = await UA.aggregate(queryUA);
        rslv(output);
      });
      let prms4 = new Promise(async (rslv, rjct) => {
        // console.log(util.inspect(queryNonMillionNonUA_NotStarted, { showHidden: true, depth: null }))
        let output = await Ulb.aggregate(queryNonMillionNonUA_NotStarted);
        rslv(output);
      });
      let prms5 = new Promise(async (rslv, rjct) => {
        // console.log(util.inspect(queryNonMillionNonUA, { showHidden: true, depth: null }))
        let output = await Ulb.aggregate(queryNonMillionNonUA);
        rslv(output);
      });

      Promise.all([prms1, prms2, prms3, prms4, prms5]).then(
        (outputs) => {
          let output1 = outputs[0];
          let output2 = outputs[1];
          let output3 = outputs[2];
          let output4 = outputs[3];
          let output5 = outputs[4];
          if (output1 && output2 && output3 && output4 && output5) {
            resolve({
              output1,
              output2,
              output3,
              output4,
              output5,
            });
          } else {
            reject({ message: "No Data Found" });
          }
        },
        (e) => {
          reject(e);
        }
      );
    }
  );

  let finalData = processSLBData(output1, output2, output3, output4, output5);

  return res.status(200).json({
    success: true,
    data: finalData,
  });
});
processSLBData = (output1, output2, output3, output4, output5) => {
  // console.log("outputs", output1, output2, output3, output4, output5)
  let million_pendingCompletion = 0,
    million_completedAndPendingSubmission = 0,
    million_underReviewByState = 0,
    million_approvedByState = 0,
    nonMillion_pendingCompletion = 0,
    nonMillion_completedAndPendingSubmission = 0,
    nonMillion_underReviewByState = 0,
    nonMillion_approvedByState = 0;

  //not started ulbs (pending completion)

  nonMillion_pendingCompletion = output2[0]?.hasOwnProperty("notStarted")
    ? output2[0].notStarted
    : 0 + nonMillion_pendingCompletion;
  million_pendingCompletion = output4[0]?.hasOwnProperty("notStarted")
    ? output4[0].notStarted
    : 0 + million_pendingCompletion;

  //isUA
  output3.forEach((el) => {
    let newEl = el["_id"];
    //pendingCompletion
    if (
      (newEl["isSubmit"] &&
        (newEl["actionTakenByRole"] == "STATE" ||
          newEl["actionTakenByRole"] == "MoHUA") &&
        newEl["status"] == "REJECTED" &&
        newEl["slbFormStatus"] == "REJECTED") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "ULB" &&
        newEl["status"] == "PENDING" &&
        !newEl["slbFormComplete"])
    ) {
      nonMillion_pendingCompletion = el["count"] + nonMillion_pendingCompletion;
    }

    //completed but pending submission
    if (
      !newEl["isSubmit"] &&
      newEl["actionTakenByRole"] == "ULB" &&
      newEl["status"] == "PENDING" &&
      newEl["slbFormComplete"]
    ) {
      nonMillion_completedAndPendingSubmission =
        el["count"] + nonMillion_completedAndPendingSubmission;
    }
    //under review by state
    if (
      (newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "ULB" &&
        newEl["status"] == "PENDING") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "STATE" &&
        newEl["status"] == "PENDING")
    ) {
      nonMillion_underReviewByState =
        el["count"] + nonMillion_underReviewByState;
    }

    //approvedBySTate
    if (
      (newEl["isSubmit"] &&
        (newEl["actionTakenByRole"] == "STATE" ||
          newEl["actionTakenByRole"] == "MoHUA") &&
        newEl["status"] == "APPROVED") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "MoHUA" &&
        (newEl["status"] == "PENDING" || newEl["status"] == "APPROVED"))
    ) {
      nonMillion_approvedByState = el["count"] + nonMillion_approvedByState;
    }
  });

  // NOn UA, NOn Million
  output5.forEach((el) => {
    let newEl = el["_id"];
    //pendingCompletion
    if (
      (newEl["isSubmit"] &&
        (newEl["actionTakenByRole"] == "STATE" ||
          newEl["actionTakenByRole"] == "MoHUA") &&
        newEl["status"] == "REJECTED" &&
        newEl["slbFormStatus"] == "REJECTED") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "ULB" &&
        newEl["status"] == "PENDING" &&
        !newEl["slbFormComplete"])
    ) {
      million_pendingCompletion = el["count"] + million_pendingCompletion;
    }

    //completed but pending submission
    if (
      !newEl["isSubmit"] &&
      newEl["actionTakenByRole"] == "ULB" &&
      newEl["status"] == "PENDING" &&
      newEl["slbFormComplete"]
    ) {
      million_completedAndPendingSubmission =
        el["count"] + million_completedAndPendingSubmission;
    }
    //under review by state
    if (
      (newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "ULB" &&
        newEl["status"] == "PENDING") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "STATE" &&
        newEl["status"] == "PENDING")
    ) {
      million_underReviewByState = el["count"] + million_underReviewByState;
    }

    //approvedBySTate
    if (
      (newEl["isSubmit"] &&
        (newEl["actionTakenByRole"] == "STATE" ||
          newEl["actionTakenByRole"] == "MoHUA") &&
        newEl["status"] == "APPROVED") ||
      (!newEl["isSubmit"] &&
        newEl["actionTakenByRole"] == "MoHUA" &&
        (newEl["status"] == "PENDING" || newEl["status"] == "APPROVED"))
    ) {
      million_approvedByState = el["count"] + million_approvedByState;
    }
  });
  let finalOutput = [
    {
      category: "NonMillionNonUA",
      pendingCompletion: million_pendingCompletion,
      completedAndPendingSubmission: million_completedAndPendingSubmission,
      underReviewByState: million_underReviewByState,
      approvedByState: million_approvedByState,
    },
    {
      category: "UA",
      pendingCompletion: nonMillion_pendingCompletion,
      completedAndPendingSubmission: nonMillion_completedAndPendingSubmission,
      underReviewByState: nonMillion_underReviewByState,
      approvedByState: nonMillion_approvedByState,
    },
  ];

  // console.log(finalOutput)

  return finalOutput;
};
// query for finding status of annual accounts
// {
//   $match:{
//       $and:[
//       { $or:[
//           {"audited.submit_annual_accounts": true},
//           {"unAudited.submit_annual_accounts": true}
//           ]},
//       {isDraft:false}, 
//       {actionTakenByRole: "ULB"}]

//       }
//   },
// {
//   $group:{
//       _id:{
//           submitAudited:"$audited.submit_annual_accounts",
//           submitUnAudited: "$unAudited.submit_annual_accounts"
//           },
//           count:{$sum:1}
//       }
//   }
module.exports.StateDashboard = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query;
  let state = req.decoded.state ?? state_id;

  // console.log(user)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role != "ULB") {
    let { design_year } = req.params;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    let baseQuery = [
      {
        $match: {
          $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
        }
      },
      {
        $match: {
          state: ObjectId(state),
        },
      },
      {
        $group: {
          _id: {
            isUA: "$isUA",
            isMillionPlus: "$isMillionPlus",
          },
          // ulbs: { $addToSet: "$_id" },
          count: { $sum: 1 },
        },
      },
    ];

    let ulbData = await Ulb.aggregate(baseQuery);

    let numbers = calculateTotalNumbers(ulbData);
    console.log(numbers);
    let finalOutput = [];
    let k;
    if (user.role == "STATE") {
      k = 3;
    } else if (user.role != "ULB" || user.role != "STATE") {
      k = 1;
    }
    for (let i = 0; i < k; i++) {
      let match, match2;

      if (i == 0) {
        match = {
          $match: {
            $or: [
              { isSubmit: true, actionTakenByRole: "ULB", status: "PENDING" },
              {
                $and: [
                  {
                    $or: [
                      { actionTakenByRole: "MoHUA" },
                      { actionTakenByRole: "STATE" },
                    ],
                  },
                  { $or: [{ status: "PENDING" }, { status: "APPROVED" }] },
                ],
              },
            ],
            design_year: ObjectId(design_year),
            state: ObjectId(state),
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(state),
          },
        };
      } else if (i == 1) {
        match = {
          $match: {
            isSubmit: true,
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            isUA: "Yes",
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            isUA: "Yes",
          },
        };
      } else if (i == 2) {
        match = {
          $match: {
            isSubmit: true,
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            isMillionPlus: "No",
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(state),
            isMillionPlus: "No",
          },
        };
      }

      let query1 = [
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData",
          },
        },
        {
          $unwind: {
            path: "$ulbData",
          },
        },
        {
          $project: {
            steps: 1,
            actionTakenByRole: 1,
            status: 1,
            isSubmit: 1,
            ulb: 1,
            state: 1,
            design_year: 1,
            isUA: "$ulbData.isUA",
            isMillionPlus: "$ulbData.isMillionPlus",
          },
        },
        match,
        {
          $group: {
            _id: {
              isSubmit: "$isSubmit",
              status: "$status",
              actionTakenByRole: "$actionTakenByRole",
            },
            count: { $sum: 1 },
          },
        },
      ];

      let query3 = [
        {
          $match: {
            design_year: ObjectId(design_year),
            $or: [
              { isSubmit: true, actionTakenByRole: "ULB", status: "PENDING" },
              {
                $and: [
                  {
                    $or: [
                      { actionTakenByRole: "MoHUA" },
                      { actionTakenByRole: "STATE" },
                    ],
                  },
                  { $or: [{ status: "PENDING" }, { status: "APPROVED" }] },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData",
          },
        },
        {
          $unwind: {
            path: "$ulbData",
          },
        },
        {
          $project: {
            steps: 1,
            actionTakenByRole: 1,
            status: 1,
            isSubmit: 1,
            ulb: 1,
            state: 1,
            design_year: 1,
            isUA: "$ulbData.isUA",
            isMillionPlus: "$ulbData.isMillionPlus",
          },
        },
        match,
        {
          $lookup: {
            from: "annualaccountdatas",
            let: {
              firstUser: ObjectId(design_year),
              secondUser: "$ulb",
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
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "annualaccount",
          },
        },
        {
          $unwind: {
            path: "$annualaccount",
            preserveNullAndEmptyArrays: true

          },
        },
        {
          $group: {
            _id: "$annualaccount.audited.submit_annual_accounts",
            audited: { $sum: 1 },
            annualaccount: { $addToSet: "$annualaccount" },
          },
        },
        { $match: { _id: true } },
        {
          $unwind: {
            path: "$annualaccount",
          },
        },
        {
          $group: {
            _id: "$annualaccount.unAudited.submit_annual_accounts",
            unAudited: { $sum: 1 },
            audited: { $first: "$audited" },
          },
        },
        { $match: { _id: true } },
      ];

      let query4 = [
        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData",
          },
        },
        {
          $unwind: {
            path: "$ulbData",
          },
        },
        {
          $project: {
            steps: 1,
            actionTakenByRole: 1,
            status: 1,
            isSubmit: 1,
            ulb: 1,
            state: 1,
            design_year: 1,
            isUA: "$ulbData.isUA",
            isMillionPlus: "$ulbData.isMillionPlus",
          },
        },
        match2,
        {
          $lookup: {
            from: "utilizationreports",
            let: {
              firstUser: ObjectId(design_year),
              secondUser: "$ulb",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$designYear", "$$firstUser"],
                      },
                      {
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "utilReportForm",
          },
        },

        {
          $unwind: {
            path: "$utilReportForm",
            preserveNullAndEmptyArrays: true
          },
        },
        {
          $group: {
            _id: {
              isSubmit: { $not: "$utilReportForm.isDraft" },
              actionTakenByRole: "$actionTakenByRole",
              masterformSubmit: "$isSubmit",
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
      ];

      let { output1, output3, output4 } = await new Promise(
        async (resolve, reject) => {
          let prms1 = new Promise(async (rslv, rjct) => {
            // console.log(util.inspect(query1, { showHidden: false, depth: null }))
            let output = await MasterFormData.aggregate(query1);

            rslv(output);
          });

          let prms3 = new Promise(async (rslv, rjct) => {
            // console.log(util.inspect(query3, { showHidden: false, depth: null }))
            let output = await MasterFormData.aggregate(query3);

            rslv(output);
          });
          let prms4 = new Promise(async (rslv, rjct) => {
            console.log(util.inspect(query4, { showHidden: false, depth: null }))

            let output = await MasterFormData.aggregate(query4);

            rslv(output);
          });

          Promise.all([prms1, prms3, prms4]).then(
            (outputs) => {
              let output1 = outputs[0];

              let output3 = outputs[1];
              let output4 = outputs[2];

              if (output1 && output3 && output4) {
                resolve({
                  output1,

                  output3,
                  output4,
                });
              } else {
                reject({ message: "No Data Found" });
              }
            },
            (e) => {
              reject(e);
            }
          );
        }
      );

      let data = formatOutput(
        output1,

        output3,
        output4,

        i,
        numbers
      );
      finalOutput.push(data);
    }

    console.log(finalOutput);
    res.status(200).json({
      success: true,
      data: finalOutput,
    });
  } else {
    return res.status(403).json({
      success: false,
      message: "ULB is Not Authorized to Access This API",
    });
  }
});

module.exports.viewList = catchAsync(async (req, res) => {
  let user = req.decoded;
  let statusFilter = {
    //Not Started
    1: {
      masterform: {},
    },
    2: {
      //In Progress

      "masterform.isSubmit": false,
      "masterform.actionTakenByRole": "ULB",
      "masterform.status": "PENDING",
    },
    4: {
      // Under Review By State
      $or: [
        {
          "masterform.status": "PENDING",
          "masterform.isSubmit": true,
          "masterform.actionTakenByRole": "ULB",
        },
        {
          "masterform.isSubmit": false,
          "masterform.actionTakenByRole": "STATE",
          "masterform.status": "PENDING",
        },
      ],
    },
    5: {
      //Under Review By Mohua
      $or: [
        {
          "masterform.isSubmit": true,
          "masterform.status": "PENDING",
          "masterform.actionTakenByRole": "STATE",
        },
        {
          "masterform.isSubmit": false,
          "masterform.actionTakenByRole": "MoHUA",
        },
      ],
    },
    6: {
      //Approved By MoHUA
      "masterform.status": "APPROVED",
      "masterform.actionTakenByRole": "MoHUA",
    },
    7: {
      //Rejected By State
      "masterform.status": "REJECTED",
      "masterform.actionTakenByRole": "STATE",
    },
    8: {
      //Rejected By MoHUA
      "masterform.status": "REJECTED",
      "masterform.actionTakenByRole": "MoHUA",
    },
    9: {
      pfmsaccount: {
        //Not Started
      },
    },
    10: {
      "pfmsaccount.isDraft": "true",
    },
    11: {
      "pfmsaccount.isDraft": false,
      "pfmsaccount.registered": "yes",
    },
    12: {
      $or: [
        {
          "pfmsaccount.isDraft": false,
          "pfmsaccount.registered": "no",
        },
        {
          "pfmsaccount.isDraft": false,
          "pfmsaccount.registered": "",
        },
      ],
    },
    13: {
      audited_annualaccounts: {
        //Not Started
      },
    },
    14: {
      //In Progress

      $and: [
        { "audited_annualaccounts.isDraft": true },
        {
          $or: [
            {
              $and: [
                { "masterform.isSubmit": { $ne: true } },
                { "masterform.actionTakenByRole": { $ne: "ULB" } },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { "masterform.actionTakenByRole": { $ne: "STATE" } },
                    { "masterform.actionTakenByRole": { $ne: "MoHUA" } },
                  ],
                },
                {
                  $or: [
                    { "masterform.status": { $ne: "PENDING" } },
                    { "masterform.status": { $ne: "APPROVED" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    15: {
      // Not Submitted Accounts

      "audited_annualaccounts.isDraft": false,
      "audited_annualaccounts.auditedSubmitted": false,
    },
    16: {
      $and: [
        { "audited_annualaccounts.isDraft": false },
        { "audited_annualaccounts.auditedSubmitted": true },
        {
          $or: [
            {
              $and: [
                { "masterform.isSubmit": true },
                { "masterform.actionTakenByRole": "ULB" },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { "masterform.actionTakenByRole": "STATE" },
                    { "masterform.actionTakenByRole": "MoHUA" },
                  ],
                },
                {
                  $or: [
                    { "masterform.status": "PENDING" },
                    { "masterform.status": "APPROVED" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    17: {
      unaudited_annualaccounts: {
        //Not Started
      },
    },
    18: {
      //In Progress

      $and: [
        { "unaudited_annualaccounts.isDraft": true },
        {
          $or: [
            {
              $and: [
                { "masterform.isSubmit": { $ne: true } },
                { "masterform.actionTakenByRole": { $ne: "ULB" } },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { "masterform.actionTakenByRole": { $ne: "STATE" } },
                    { "masterform.actionTakenByRole": { $ne: "MoHUA" } },
                  ],
                },
                {
                  $or: [
                    { "masterform.status": { $ne: "PENDING" } },
                    { "masterform.status": { $ne: "APPROVED" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    19: {
      //Not Submitted Accounts
      "unaudited_annualaccounts.isDraft": false,
      "unaudited_annualaccounts.unAuditedSubmitted": false,
    },
    20: {
      // Submitted Accounts

      $and: [
        { "unaudited_annualaccounts.isDraft": false },
        { "unaudited_annualaccounts.unAuditedSubmitted": true },
        {
          $or: [
            {
              $and: [
                { "masterform.isSubmit": true },
                { "masterform.actionTakenByRole": "ULB" },
              ],
            },
            {
              $and: [
                {
                  $or: [
                    { "masterform.actionTakenByRole": "STATE" },
                    { "masterform.actionTakenByRole": "MoHUA" },
                  ],
                },
                {
                  $or: [
                    { "masterform.status": "PENDING" },
                    { "masterform.status": "APPROVED" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    21: {
      //not started
      utilizationreport: {},
    },
    22: {
      $and: [
        { "utilizationreport.isDraft": true },
        { "utilizationreport.actionTakenBy": "ULB" }
      ]
    },
    23: {
      $or: [{
        $and: [
          { "utilizationreport.isDraft": false },
          { "utilizationreport.actionTakenBy": "ULB" }]
      },
      {
        $or: [{ "utilizationreport.actionTakenBy": "STATE" }, { "utilizationreport.actionTakenBy": "MoHUA" }]

      }]
      ,
    },
    24: {
      //not started
      xvfcgrantulbforms: {},
    },
    25: {
      "xvfcgrantulbforms.isCompleted": false,
    },
    26: {
      "xvfcgrantulbforms.isCompleted": true,
    },
    30: {
      xvfcgrantulbforms: "Not Applicable",
    },
    27: {
      //not started
      xvfcgrantplans: {},
    },
    28: {
      "xvfcgrantplans.isDraft": true,
    },
    29: {
      "xvfcgrantplans.isDraft": false,
    },
    31: {
      xvfcgrantplans: "Not Applicable",
    },
    32: {
      slbMillion: {},
    },
    33: {
      "slbMillion.isCompleted": false,
    },
    34: {
      "slbMillion.isCompleted": true,
    },
    35: {
      slbMillion: "Not Applicable",
    },

    36: {
      slbNonMillion: {},
    },
    38: {
      "slbNonMillion.isCompleted": false,
    },
    37: {
      "slbNonMillion.isCompleted": true,
    },
    39: {
      slbNonMillion: "Not Applicable",
    },
  };
  let filter =
    req.query.filter && !req.query.filter != "null"
      ? JSON.parse(req.query.filter)
      : req.body.filter
        ? req.body.filter
        : {},
    sort =
      req.query.sort && !req.query.sort != "null"
        ? JSON.parse(req.query.sort)
        : req.body.sort
          ? req.body.sort
          : {},
    skip = req.query.skip ? parseInt(req.query.skip) : 0,
    csv = req.query.csv === "true",
    limit = req.query.limit ? parseInt(req.query.limit) : 10000;
  // console.log(user)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role != "ULB") {
    let { design_year } = req.params;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    let { formName } = req.params;
    let { state_id } = req.query;
    let state = user.state ?? state_id;
    let query;
    if ((user.role != "STATE" || user.role != "ULB") && !state) {
      query = [
        {
          $match: {
            $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
          }
        },
        {
          $lookup: {
            from: "uas",
            localField: "_id",
            foreignField: "ulb",
            as: "uas",
          },
        },
        {
          $unwind: {
            path: "$uas",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "masterforms",
            localField: "_id",
            foreignField: "ulb",
            as: "masterforms",
          },
        },
        {
          $unwind: {
            path: "$masterforms",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [{ "masterforms.design_year": ObjectId(design_year) }, { "masterforms.design_year": { $exists: false } }]
          }
        },
        {
          $lookup: {
            from: "annualaccountdatas",
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
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "annualaccountdatas",
          },
        },
        {
          $unwind: {
            path: "$annualaccountdatas",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "utilizationreports",
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
                        $eq: ["$designYear", "$$firstUser"],
                      },
                      {
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "utilizationreports",
          },
        },

        {
          $unwind: {
            path: "$utilizationreports",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "xvfcgrantulbforms",
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
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "xvfcgrantulbforms",
          },
        },

        {
          $unwind: {
            path: "$xvfcgrantulbforms",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [
              { xvfcgrantulbforms: { $exists: false } },
              { "xvfcgrantulbforms.design_year": ObjectId(design_year) },
            ],
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
        {
          $match: {
            "state.accessToXVFC": true,
          },
        },
        {
          $lookup: {
            from: "ulbtypes",
            localField: "ulbType",
            foreignField: "_id",
            as: "ulbtypes",
          },
        },
        {
          $unwind: {
            path: "$ulbtypes",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "annualaccountdatas.actionTakenBy",
            foreignField: "_id",
            as: "annualaccountdatas.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$annualaccountdatas.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "utilizationreports.actionTakenBy",
            foreignField: "_id",
            as: "utilizationreports.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$utilizationreports.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "xvfcgrantulbforms.actionTakenBy",
            foreignField: "_id",
            as: "xvfcgrantulbforms.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantulbforms.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            state: "$state.name",
            ulbName: "$name",
            ulbType: "$ulbtypes.name",
            censusCode: 1,
            sbCode: 1,
            populationType: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Million Plus",
                else: "Non Million",
              },
            },
            isUA: 1,
            UA: "$uas.name",

            audited_annualaccounts: {
              isDraft: "$annualaccountdatas.isDraft",
              status: "$annualaccountdatas.status",
              actionTakenBy: "$annualaccountdatas.actionTakenBy.role",
              auditedSubmitted:
                "$annualaccountdatas.audited.submit_annual_accounts",
            },
            unaudited_annualaccounts: {
              isDraft: "$annualaccountdatas.isDraft",
              status: "$annualaccountdatas.status",
              actionTakenBy: "$annualaccountdatas.actionTakenBy.role",
              unAuditedSubmitted:
                "$annualaccountdatas.unAudited.submit_annual_accounts",
            },
            masterform: {
              isSubmit: "$masterforms.isSubmit",
              actionTakenByRole: "$masterforms.actionTakenByRole",
              status: "$masterforms.status",
            },

            utilizationreport: {
              isDraft: "$utilizationreports.isDraft",
              status: "$utilizationreports.status",
              actionTakenBy: "$utilizationreports.actionTakenBy.role",
            },

            slbMillion: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "No"] },
                then: "Not Applicable",
                else: {
                  isCompleted: "$xvfcgrantulbforms.isCompleted",
                  status: "$xvfcgrantulbforms.status",
                  actionTakenBy: "$xvfcgrantulbforms.actionTakenBy.role",
                },
              },
            },
            slbNonMillion: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Not Applicable",
                else: {
                  isCompleted: "$xvfcgrantulbforms.isCompleted",
                  status: "$xvfcgrantulbforms.status",
                  actionTakenBy: "$xvfcgrantulbforms.actionTakenBy.role",
                },
              },
            },
          },
        },
      ];
    } else {
      query = [
        {
          $match: {
            $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
          }
        },
        {
          $match: {
            state: ObjectId(state),
          },
        },
        {
          $lookup: {
            from: "uas",
            localField: "_id",
            foreignField: "ulb",
            as: "uas",
          },
        },
        {
          $unwind: {
            path: "$uas",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "masterforms",
            localField: "_id",
            foreignField: "ulb",
            as: "masterforms",
          },
        },
        {
          $unwind: {
            path: "$masterforms",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [{ "masterforms.design_year": ObjectId(design_year) }, { "masterforms.design_year": { $exists: false } }]
          }
        },
        {
          $lookup: {
            from: "annualaccountdatas",
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
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "annualaccountdatas",
          },
        },
        {
          $unwind: {
            path: "$annualaccountdatas",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "utilizationreports",
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
                        $eq: ["$designYear", "$$firstUser"],
                      },
                      {
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "utilizationreports",
          },
        },

        {
          $unwind: {
            path: "$utilizationreports",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "xvfcgrantulbforms",
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
                        $eq: ["$ulb", "$$secondUser"],
                      },
                    ],
                  },
                },
              },
            ],
            as: "xvfcgrantulbforms",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantulbforms",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $or: [
              { "xvfcgrantulbforms.design_year": ObjectId(design_year) },
              { xvfcgrantulbforms: { $exists: false } },
            ],
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
        {
          $lookup: {
            from: "ulbtypes",
            localField: "ulbType",
            foreignField: "_id",
            as: "ulbtypes",
          },
        },
        {
          $unwind: {
            path: "$ulbtypes",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "annualaccountdatas.actionTakenBy",
            foreignField: "_id",
            as: "annualaccountdatas.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$annualaccountdatas.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "utilizationreports.actionTakenBy",
            foreignField: "_id",
            as: "utilizationreports.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$utilizationreports.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $lookup: {
            from: "users",
            localField: "xvfcgrantulbforms.actionTakenBy",
            foreignField: "_id",
            as: "xvfcgrantulbforms.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantulbforms.actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            state: "$state.name",
            ulbName: "$name",
            ulbType: "$ulbtypes.name",
            censusCode: 1,
            sbCode: 1,
            populationType: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Million Plus",
                else: "Non Million",
              },
            },
            isUA: 1,
            UA: "$uas.name",

            audited_annualaccounts: {
              isDraft: "$annualaccountdatas.isDraft",
              status: "$annualaccountdatas.status",
              actionTakenBy: "$annualaccountdatas.actionTakenBy.role",
              auditedSubmitted:
                "$annualaccountdatas.audited.submit_annual_accounts",
              submittedon: "$annualaccountdatas.createdAt",
            },
            unaudited_annualaccounts: {
              isDraft: "$annualaccountdatas.isDraft",
              status: "$annualaccountdatas.status",
              actionTakenBy: "$annualaccountdatas.actionTakenBy.role",
              unAuditedSubmitted:
                "$annualaccountdatas.unAudited.submit_annual_accounts",
              submittedon: "$annualaccountdatas.createdAt",
            },
            masterform: {
              isSubmit: "$masterforms.isSubmit",
              actionTakenByRole: "$masterforms.actionTakenByRole",
              status: "$masterforms.status",
            },

            utilizationreport: {
              isDraft: "$utilizationreports.isDraft",
              status: "$utilizationreports.status",
              actionTakenBy: "$utilizationreports.actionTakenBy.role",
            },

            slbMillion: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "No"] },
                then: "Not Applicable",
                else: {
                  isCompleted: "$xvfcgrantulbforms.isCompleted",
                  status: "$xvfcgrantulbforms.status",
                  actionTakenBy: "$xvfcgrantulbforms.actionTakenBy.role",
                },
              },
            },
            slbNonMillion: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Not Applicable",
                else: {
                  isCompleted: "$xvfcgrantulbforms.isCompleted",
                  status: "$xvfcgrantulbforms.status",
                  actionTakenBy: "$xvfcgrantulbforms.actionTakenBy.role",
                },
              },
            },
          },
        },
      ];
    }
    let redactMillion = {
      $redact: {
        $cond: {
          if: { $eq: ["$slbMillion", "Not Applicable"] },
          then: "$$PRUNE",
          else: "$$DESCEND",
        },
      },
    };
    let redactNonMillion = {
      $redact: {
        $cond: {
          if: { $eq: ["$slbNonMillion", "Not Applicable"] },
          then: "$$PRUNE",
          else: "$$DESCEND",
        },
      },
    };

    let newFilter = await Service.mapFilter(filter);
    let statusfilArray = []
    if (
      newFilter["status"] ||
      newFilter["auditedStatus"] ||
      newFilter["unauditedStatus"] ||
      newFilter["utilStatus"] ||
      newFilter["slbMillionStatus"] ||
      newFilter["slbNonMillionStatus"]
    ) {
      statusfilArray.push(statusFilter[newFilter["status"]])
      statusfilArray.push(statusFilter[newFilter["auditedStatus"]])
      statusfilArray.push(statusFilter[newFilter["unauditedStatus"]])
      statusfilArray.push(statusFilter[newFilter["utilStatus"]])
      statusfilArray.push(statusFilter[newFilter["slbMillionStatus"]])
      statusfilArray.push(statusFilter[newFilter["slbNonMillionStatus"]])
      Object.assign(newFilter, statusFilter[newFilter["status"]]);
      Object.assign(newFilter, statusFilter[newFilter["auditedStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["unauditedStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["utilStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["slbMillionStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["slbNonMillionStatus"]]);
      delete newFilter["status"];
      delete newFilter["auditedStatus"];
      delete newFilter["unauditedStatus"];
      delete newFilter["utilStatus"];
      delete newFilter["slbMillionStatus"];
      delete newFilter["slbNonMillionStatus"];
    }
    if (newFilter && Object.keys(newFilter).length) {
      statusfilArray.forEach(el => {
        if (el)
          query.push({ $match: el });
      })
      console.log(newFilter)
      for (const [key, value] of Object.entries(newFilter)) {
        query.push({
          $match: {
            [key]: value
          }
        });
      }
      // for(let fil in newFilter ){
      //   let keyName = fil;
      //   console.log(fil)
      //   query.push({ $match: {
      //     keyName:newFilter[fil]
      //   } });
      // }

    }

    if (formName == "slbMillion") {
      query.push(redactMillion);
    } else if (formName == "slbNonMillion") {
      query.push(redactNonMillion);
    }

    if (csv) {
      let data = await Ulb.aggregate(query).exec();
      data.forEach((el) => {
        if (Object.entries(el?.masterform).length === 0) {
          el["masterformStatus"] = statusTypes.Not_Started;
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = statusTypes.Under_Review_By_State;
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "STATE"
        ) {
          el["masterformStatus"] = statusTypes.Under_Review_By_State;
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = statusTypes.In_Progress;
        } else if (
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = statusTypes.Rejected_By_State;
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = statusTypes.Rejected_By_MoHUA;
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "APPROVED"
        ) {
          el["masterformStatus"] = statusTypes.Approval_Completed;
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.isSubmit === false
        ) {
          el["masterformStatus"] = statusTypes.Approved_By_State;
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "PENDING"
        ) {
          el["masterformStatus"] = statusTypes.Approved_By_State;
        }

        if (Object.entries(el?.utilizationreport).length === 0) {
          el["utilizationreportStatus"] = statusTypes.Not_Started;
        } else if (el?.utilizationreport.isDraft == false) {
          el["utilizationreportStatus"] = "Completed";
        } else if (el?.utilizationreport.isDraft == true) {
          el["utilizationreportStatus"] = statusTypes.In_Progress;
        }
        if (Object.entries(el?.audited_annualaccounts).length === 0) {
          el["audited_annualaccountsStatus"] = statusTypes.Not_Started;
        } else if (
          el?.audited_annualaccounts.isDraft == false &&
          el?.audited_annualaccounts.auditedSubmitted == false
        ) {
          el["audited_annualaccountsStatus"] =
            statusTypes.Accounts_Not_Submitted;
        } else if (
          el?.audited_annualaccounts.isDraft == false &&
          el?.audited_annualaccounts.auditedSubmitted == true
        ) {
          el["audited_annualaccountsStatus"] = statusTypes.Accounts_Submitted;
        } else if (el?.audited_annualaccounts.isDraft == true) {
          el["audited_annualaccountsStatus"] = statusTypes.In_Progress;
        }
        if (Object.entries(el?.unaudited_annualaccounts).length === 0) {
          el["unaudited_annualaccountsStatus"] = statusTypes.Not_Started;
        } else if (
          el?.unaudited_annualaccounts.isDraft == false &&
          el?.unaudited_annualaccounts.unAuditedSubmitted == false
        ) {
          el["unaudited_annualaccountsStatus"] =
            statusTypes.Accounts_Not_Submitted;
        } else if (
          el?.unaudited_annualaccounts.isDraft == false &&
          el?.unaudited_annualaccounts.unAuditedSubmitted == true
        ) {
          el["unaudited_annualaccountsStatus"] = statusTypes.Accounts_Submitted;
        } else if (el?.unaudited_annualaccounts.isDraft == true) {
          el["unaudited_annualaccountsStatus"] = statusTypes.In_Progress;
        }

        if (Object.entries(el?.slbMillion).length === 0) {
          el["slbMillionStatus"] = statusTypes.Not_Started;
        } else if (el?.slbMillion.isCompleted == true) {
          el["slbMillionStatus"] = "Completed";
        } else if (el?.slbMillion.isCompleted == false) {
          el["slbMillionStatus"] = "In Progress";
        } else if (el?.slbMillion == "Not Applicable") {
          el["slbMillionStatus"] = "Not Applicable";
        }

        if (Object.entries(el?.slbNonMillion).length === 0) {
          el["slbNonMillionStatus"] = "Not Started";
        } else if (el?.slbNonMillion.isCompleted == true) {
          el["slbNonMillionStatus"] = "Completed";
        } else if (el?.slbNonMillion.isCompleted == false) {
          el["slbNonMillionStatus"] = "In Progress";
        } else if (el?.slbNonMillion == "Not Applicable") {
          el["slbNonMillionStatus"] = "Not Applicable";
        }
      });

      // console.log(data)
      let field = csvData();
      if (user.role == "STATE") {
        delete field.stateName;
      }
      if (formName == "utilReport") {
        delete field.masterformStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.slbMillionStatus;
        delete field.slbNonMillionStatus;
      } else if (formName == "slbMillion") {
        delete field.masterformStatus;
        delete field.slbNonMillionStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.utilizationreportStatus;
      } else if (formName == "slbNonMillion") {
        delete field.masterformStatus;
        delete field.slbMillionStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.utilizationreportStatus;
      } else if (formName == "annualaccount") {
        delete field.masterformStatus;
        delete field.slbMillionStatus;
        delete field.slbNonMillionStatus;
        delete field.utilizationreportStatus;
      }
      let xlsData = await Service.dataFormating(data, field);
      let filename = `15th-FC-Form${moment().format(
        "DD-MMM-YY HH:MM:SS"
      )}.xlsx`;
      return res.xls(filename, xlsData);
    } else {
      if (sort && Object.keys(sort).length) {
        query.push({ $sort: sort });
      }
      query.push({ $skip: skip });
      // query.push({ $limit: limit });
      console.log(util.inspect(query, false, null));

      Redis.get(JSON.stringify(query), async (err, value) => {
        let data;
        if (!value) {
          data = await Ulb.aggregate(query).exec();
          Redis.set(JSON.stringify(query), JSON.stringify(data));
        } else {
          data = JSON.parse(value);
        }
        // console.log(data);
        data.forEach((el) => {
          if (Object.entries(el?.masterform).length === 0) {
            el["masterformStatus"] = statusTypes.Not_Started;
          } else if (
            el?.masterform.isSubmit == true &&
            el?.masterform.actionTakenByRole === "ULB" &&
            (el.masterform.status === "PENDING" ||
              el.masterform.status === "NA")
          ) {
            el["masterformStatus"] = statusTypes.Under_Review_By_State;
          } else if (
            el?.masterform.isSubmit == false &&
            el?.masterform.actionTakenByRole === "STATE"
          ) {
            el["masterformStatus"] = statusTypes.Under_Review_By_State;
          } else if (
            el?.masterform.isSubmit == false &&
            el?.masterform.actionTakenByRole === "ULB" &&
            (el.masterform.status === "PENDING" ||
              el.masterform.status === "NA")
          ) {
            el["masterformStatus"] = statusTypes.In_Progress;
          } else if (
            el?.masterform.actionTakenByRole === "STATE" &&
            el?.masterform.status === "REJECTED"
          ) {
            el["masterformStatus"] = statusTypes.Rejected_By_State;
          } else if (
            el?.masterform.actionTakenByRole === "MoHUA" &&
            el?.masterform.status === "REJECTED"
          ) {
            el["masterformStatus"] = statusTypes.Rejected_By_MoHUA;
          } else if (
            el?.masterform.actionTakenByRole === "MoHUA" &&
            el?.masterform.status === "APPROVED"
          ) {
            el["masterformStatus"] = statusTypes.Approval_Completed;
          } else if (
            el?.masterform.actionTakenByRole === "MoHUA" &&
            el?.masterform.isSubmit === false
          ) {
            el["masterformStatus"] = statusTypes.Approved_By_State;
          } else if (
            el?.masterform.isSubmit == true &&
            el?.masterform.actionTakenByRole === "STATE" &&
            el?.masterform.status === "PENDING"
          ) {
            el["masterformStatus"] = statusTypes.Approved_By_State;
          }

          if (Object.entries(el?.utilizationreport).length === 0) {
            el["utilizationreportStatus"] = "Not Started";
          } else if ((el?.utilizationreport.isDraft == false && el?.utilizationreport.actionTakenBy == "ULB") ||
            (el?.utilizationreport.actionTakenBy == "STATE" || el?.utilizationreport.actionTakenBy == "MoHUA")
          ) {
            // console.log(el)
            el["utilizationreportStatus"] = "Completed";
          } else if ((el?.utilizationreport.isDraft == true && el?.utilizationreport.actionTakenBy == "ULB")) {
            el["utilizationreportStatus"] = "In Progress";
          }
          if (Object.entries(el?.audited_annualaccounts).length === 0) {
            el["audited_annualaccountsStatus"] = "Not Started";
          } else if (
            el?.audited_annualaccounts.isDraft == false &&
            el?.audited_annualaccounts.auditedSubmitted == false
          ) {
            el["audited_annualaccountsStatus"] = "Accounts Not Submitted";
          } else if (
            el?.audited_annualaccounts.isDraft == false &&
            el?.audited_annualaccounts.auditedSubmitted == true &&
            ((el?.masterform.isSubmit == true &&
              el?.masterform.actionTakenByRole == "ULB") ||
              ((el?.masterform.actionTakenByRole == "STATE" ||
                el?.masterform.actionTakenByRole == "MoHUA") &&
                (el?.masterform.status == "PENDING" ||
                  el?.masterform.status == "APPROVED")))
          ) {
            el["audited_annualaccountsStatus"] = "Accounts Submitted";
          } else if (el?.audited_annualaccounts.isDraft == true) {
            el["audited_annualaccountsStatus"] = "In Progress";
          }
          if (Object.entries(el?.unaudited_annualaccounts).length === 0) {
            el["unaudited_annualaccountsStatus"] = "Not Started";
          } else if (
            el?.unaudited_annualaccounts.isDraft == false &&
            el?.unaudited_annualaccounts.unAuditedSubmitted == false
          ) {
            el["unaudited_annualaccountsStatus"] = "Accounts Not Submitted";
          } else if (
            el?.unaudited_annualaccounts.isDraft == false &&
            el?.unaudited_annualaccounts.unAuditedSubmitted == true &&
            ((el?.masterform.isSubmit == true &&
              el?.masterform.actionTakenByRole == "ULB") ||
              ((el?.masterform.actionTakenByRole == "STATE" ||
                el?.masterform.actionTakenByRole == "MoHUA") &&
                (el?.masterform.status == "PENDING" ||
                  el?.masterform.status == "APPROVED")))
          ) {
            el["unaudited_annualaccountsStatus"] = "Accounts Submitted";
          } else if (el?.unaudited_annualaccounts.isDraft == true) {
            el["unaudited_annualaccountsStatus"] = "In Progress";
          }

          if (Object.entries(el?.slbMillion).length === 0) {
            el["slbMillionStatus"] = "Not Started";
          } else if (el?.slbMillion.isCompleted == true) {
            el["slbMillionStatus"] = "Completed";
          } else if (el?.slbMillion.isCompleted == false) {
            el["slbMillionStatus"] = "In Progress";
          } else if (el?.slbMillion == "Not Applicable") {
            el["slbMillionStatus"] = "Not Applicable";
          }

          if (Object.entries(el?.slbNonMillion).length === 0) {
            el["slbNonMillionStatus"] = "Not Started";
          } else if (el?.slbNonMillion.isCompleted == true) {
            el["slbNonMillionStatus"] = "Completed";
          } else if (el?.slbNonMillion.isCompleted == false) {
            el["slbNonMillionStatus"] = "In Progress";
          } else if (el?.slbNonMillion == "Not Applicable") {
            el["slbNonMillionStatus"] = "Not Applicable";
          }
        });

        if (formName == "utilReport") {
          data.forEach((el) => {
            delete el.masterform;
            delete el?.annualaccount;
            delete el.slbMillion;
            delete el.slbNonMillion;
          });
        } else if (formName == "slbMillion") {
          data.forEach((el) => {
            delete el.masterform;
            delete el?.annualaccount;
            delete el.utilizationreport;
            delete el.slbNonMillion;
          });
        } else if (formName == "slbNonMillion") {
          data.forEach((el) => {
            delete el.masterform;
            delete el?.annualaccount;
            delete el.utilizationreport;
            delete el.slbMillion;
          });
        } else if (formName == "annualaccount") {
          data.forEach((el) => {
            delete el.masterform;
            delete el.slbMillion;
            delete el.slbNonMillion;
            delete el.pfmsaccount;
            delete el.xvfcgrantplans;
          });
        }
        return res.status(200).json({
          success: true,
          data: data,
          total: data.length,
        });
      });
    }
    // console.log(util.inspect({ data }, { showHidden: false, depth: null }))
  } else {
    return res.status(400).json({
      success: false,
      message: user.role + " is Not Authorized to Perform this Action",
    });
  }
});

const calculateTotalNumbers = (data) => {
  let totalUlbs = 0;
  let ulbInMillionPlusUA = 0;
  let nonMillionPlusULBs = 0;
  data.forEach((el) => {
    totalUlbs = el.count + totalUlbs;
    if (el._id.isUA == "Yes") {
      ulbInMillionPlusUA = ulbInMillionPlusUA + el.count;
    }
    if (el._id.isMillionPlus == "No") {
      nonMillionPlusULBs = nonMillionPlusULBs + el.count;
    }
  });
  return [totalUlbs, ulbInMillionPlusUA, nonMillionPlusULBs];
};

const formatOutput = (
  output1,
  output3,
  output4,

  i,
  numbers
) => {
  let underReviewByState = 0,
    pendingForSubmission = 0,
    overall_approvedByState = 0,
    provisional = 0,
    audited = 0,
    pendingResponse = 0,
    util_pendingCompletion = 0,
    util_completedAndPendingSubmission = 0,
    util_underStateReview = 0,
    util_approvedbyState = 0,
    provisional_yes = 0,
    audited_yes = 0;

  //overall
  if (output1.length == 0) {
    pendingForSubmission = numbers[i];
  } else {
    output1.forEach((el) => {
      if (
        (el._id.status == "PENDING" &&
          el._id.actionTakenByRole == "ULB" &&
          el._id.isSubmit == true) ||
        (el._id.status == "PENDING" &&
          el._id.actionTakenByRole == "STATE" &&
          el._id.isSubmit == false)
      ) {
        underReviewByState = el.count + underReviewByState;
      } else if (
        el._id.status == 'APPROVED' || (el._id.actionTakenByRole === "MoHUA" && el._id.status == !'REJECTED')) {
        overall_approvedByState = el.count + overall_approvedByState;
      }


    });
    pendingForSubmission =
      numbers[i] - underReviewByState - overall_approvedByState;
  }

  let total = 0;
  //annualaccounts
  // console.log(output3)
  if (output3.length > 0) {
    // console.log(output3[0]?.unAudited, '/', numbers[i])
    // console.log(output3[0]?.audited, '/', numbers[i])
    provisional = (output3[0]?.unAudited / numbers[i]) * 100;
    audited = (output3[0]?.audited / numbers[i]) * 100;
  } else {
    provisional = 0;
    audited = 0;
  }

  //detailed utilization report
  if (output4.length == 0) {
    util_pendingCompletion = numbers[i];
  } else {
    // console.log(util.inspect(output4, { showHidden: false, depth: null }))
    output4.forEach((el) => {
      if (
        (el._id.status == "PENDING" &&
          el._id.actionTakenByRole == "ULB" &&
          el._id.isSubmit == true) ||
        (el._id.status == "PENDING" &&
          el._id.actionTakenByRole == "STATE" &&
          el._id.isSubmit == false)
      ) {
        util_underStateReview = el.count + util_underStateReview;
      } else if (
        (el._id.status === "APPROVED" || (el._id.actionTakenByRole === "MoHUA" && el._id.status != "REJECTED"))

      ) {
        util_approvedbyState = el.count + util_approvedbyState;
      } else if (
        el._id.isSubmit &&
        el._id.actionTakenByRole === "ULB" &&
        el._id.status === "PENDING" &&
        el._id.masterformSubmit === false
      ) {
        util_completedAndPendingSubmission = el.count + util_approvedbyState;
      }


    });
    util_pendingCompletion =
      numbers[i] -
      util_underStateReview -
      util_approvedbyState -
      util_completedAndPendingSubmission;
  }

  let finalOutput = {
    type:
      i == 0 ? "allULB" : i == 1 ? "ulbsInMillionPlusUA" : "nonMillionPlusULBs",
    overallFormStatus: {
      pendingForSubmission: pendingForSubmission,
      underReviewByState: underReviewByState,
      approvedByState: overall_approvedByState,
    },
    annualAccounts: {
      provisional: parseInt(provisional),
      audited: parseInt(audited),
    },

    utilReport: {
      pendingCompletion: util_pendingCompletion,
      completedAndPendingSubmission: util_completedAndPendingSubmission,
      underStateReview: util_underStateReview,
      approvedbyState: util_approvedbyState,
    },
  };

  // console.log(finalOutput)
  return finalOutput;
};

const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};
/**
 * The function `getAccessYearKey` retrieves a specific key based on a given design year and formats it
 * into a specific access variable.
 * @param design_year - The `design_year` parameter represents the year for which you want to retrieve
 * the access key. This function takes the `design_year` as input, finds the corresponding key in the
 * `years` object, and then generates an access key based on that key's value.
 * @returns The function `getAccessYearKey` returns a string that is generated based on the
 * `design_year` input.
 */
async function getAccessYearKey(design_year) {
  try {
    let accessVariable = await getKeyByValue(years, design_year);
    accessVariable = `access_${accessVariable
      .split("-")[0]
      .slice(-2)}${accessVariable.split("-")[1].slice(-2)}`;
    return accessVariable;
  } catch (error) {
    throw new Error(error.message)
  }
}

module.exports. getAccessYearKey = getAccessYearKey
function csvULBReviewData() {
  return (field = {
    ulbName: "ULB name",
    state: "State",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    ulbType: "ULB Type",
    populationType: "Population Type",
    UA: "Name of UA",
    printStatus: "Status",
  });
}

function csvData() {
  return (field = {
    ulbName: "ULB name",
    state: "State name",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    ulbType: "ULB Type",
    populationType: "Population Type",
    UA: "Name of UA",

    masterformStatus: "Overall Form Status",
    audited_annualaccountsStatus: "Audited Accounts 2019-2020 Status",
    unaudited_annualaccountsStatus: "Provisional Accounts 2020-2021 Status",
    utilizationreportStatus: "Utilisation Report Status",
    slbMillionStatus: "SLB Million Plus Status",
    slbNonMillionStatus: "SLB Non Million Status",
  });
}

function csvTableData() {
  return (field = {
    name: "State",
    totalULBs: "Total ULBs",
    approvedByState: "ULBs Submitted & Approved",
    withState: "ULBs Under Review by State",
    notSubmittedForm: "ULBs Not Submitted Data",
    submittedForm: "Completed & Approved Forms (%)",
  });
}

module.exports.finalSubmit = catchAsync(async (req, res) => {
  let user = req.decoded;
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role === "ULB") {
    let data = req.body;
    let design_year = data.design_year;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    let ulb = user.ulb;
    data["actionTakenBy"] = ObjectId(user._id);
    data["actionTakenByRole"] = user.role;
    // data["modifiedAt"] = time();
    data["modifiedAt"] = new Date();

    let query = {
      design_year: ObjectId(design_year),
      ulb: ObjectId(ulb),
    };
    // console.log(data)

    let currentMasterForm = await MasterForm.findOne(query).select({
      history: 0,
    });

    currentMasterForm.status = "PENDING";
    currentMasterForm.isSubmit = req.body.isSubmit;
    currentMasterForm.actionTakenByRole = req.body.actionTakenByRole;
    currentMasterForm.actionTakenBy = req.body.actionTakenBy;
    currentMasterForm.modifiedAt = new Date();

    let updatedData = await MasterFormData.findOneAndUpdate(query, {
      $set: data,
      $push: { history: currentMasterForm },
      new: true,
    });

    // let ulbUser = await User.findOne({
    //   ulb: ObjectId(req.decoded.ulb),
    //   isDeleted: false,
    //   role: "ULB",
    // })
    //   .populate([
    //     {
    //       path: "state",
    //       model: State,
    //       select: "_id name",
    //     },
    //   ])
    //   .exec();

    // let mailOptions = {
    //   to: "",
    //   subject: "",
    //   html: "",
    // };
    // /** ULB TRIGGER */
    // let ulbEmails = [];
    // let UlbTemplate = await Service.emailTemplate.fdUploadUlb(ulbUser.name);
    // ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
    // ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
    // (mailOptions.to = ulbEmails.join()),
    //   (mailOptions.subject = UlbTemplate.subject),
    //   (mailOptions.html = UlbTemplate.body);
    // Service.sendEmail(mailOptions);
    // /** STATE TRIGGER */
    // let stateEmails = [];
    // let stateUser = await User.find({
    //   state: ObjectId(ulbUser.state),
    //   isDeleted: false,
    //   role: "STATE",
    // }).exec();
    // for (let d of stateUser) {
    //   sleep(700);
    //   d.email ? stateEmails.push(d.email) : "";
    //   d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
    //   let stateTemplate = await Service.emailTemplate.fdUploadState(
    //     ulbUser.name,
    //     d.name
    //   );
    //   mailOptions.to = stateEmails.join();
    //   mailOptions.subject = stateTemplate.subject;
    //   mailOptions.html = stateTemplate.body;
    //   Service.sendEmail(mailOptions);
    // }
    if (updatedData) {
      return res.status(200).json({
        success: true,
        message: "Master Form Updated Successfully!",
        data: data,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Master Data Update Failed!",
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: user.role + " Not Authenticated to Perform this Action",
    });
  }
});

module.exports.finalAction = catchAsync(async (req, res) => {
  let user = req.decoded;
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role != "ULB") {
    let data = req.body;
    let design_year = data.design_year;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    let ulb = req.body.ulb;
    data["actionTakenBy"] = ObjectId(user._id);
    data["actionTakenByRole"] = user.role;
    // data["modifiedAt"] = time();
    data["modifiedAt"] = new Date();

    let query = {
      design_year: ObjectId(design_year),
      ulb: ObjectId(ulb),
    };

    let currentMasterForm = await MasterFormData.findOne(query).select({
      history: 0,
    });

    currentMasterForm.status = req.body.status;
    currentMasterForm.isSubmit = req.body.isSubmit;
    currentMasterForm.modifiedAt = new Date();
    currentMasterForm.actionTakenByRole = req.body.actionTakenByRole;
    currentMasterForm.actionTakenBy = req.body.actionTakenBy;

    let updatedData = await MasterFormData.findOneAndUpdate(query, {
      $set: req.body,
      $push: { history: currentMasterForm },
      new: true,
    });
    // let ulbUser = await Ulb.findById({
    //   _id: ObjectId(updatedData.ulb),
    //   isActive: true,
    // });
    // if (data["status"] == "APPROVED" && user.role == "MoHUA") {
    //   let mailOptions = {
    //     to: "",
    //     subject: "",
    //     html: "",
    //   };
    //   /** ULB TRIGGER */
    //   let ulbEmails = [];
    //   let UlbTemplate = await Service.emailTemplate.xvUploadApprovalMoHUA(
    //     ulbUser.name
    //   );
    //   ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
    //   ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
    //   (mailOptions.to = ulbEmails.join()),
    //     (mailOptions.subject = UlbTemplate.subject),
    //     (mailOptions.html = UlbTemplate.body);
    //   Service.sendEmail(mailOptions);
    //   /** STATE TRIGGER */
    //   let stateEmails = [];
    //   let stateUser = await User.find({
    //     state: ObjectId(ulbUser.state),
    //     isDeleted: false,
    //     role: "STATE",
    //   }).exec();
    //   for (let d of stateUser) {
    //     sleep(700);
    //     d.email ? stateEmails.push(d.email) : "";
    //     d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
    //     let stateTemplate =
    //       await Service.emailTemplate.xvUploadApprovalByMoHUAtoState(
    //         ulbUser.name,
    //         d.name
    //       );
    //     mailOptions.to = stateEmails.join();
    //     mailOptions.subject = stateTemplate.subject;
    //     mailOptions.html = stateTemplate.body;
    //     Service.sendEmail(mailOptions);
    //   }
    // }
    // if (data["status"] == "APPROVED" && user.role == "STATE") {
    //   let mailOptions = {
    //     to: "",
    //     subject: "",
    //     html: "",
    //   };

    //   let UlbTemplate =
    //     await Service.emailTemplate.xvUploadApprovalByStateToUlb(ulbUser.name);
    //   (mailOptions.to = ulbUser.email),
    //     (mailOptions.subject = UlbTemplate.subject),
    //     (mailOptions.html = UlbTemplate.body);
    //   Service.sendEmail(mailOptions);
    //   /** STATE TRIGGER */
    //   let MohuaUser = await User.find({
    //     isDeleted: false,
    //     role: "MoHUA",
    //   }).exec();
    //   for (let d of MohuaUser) {
    //     sleep(700);
    //     let MohuaTemplate = await Service.emailTemplate.xvUploadApprovalState(
    //       d.name,
    //       ulbUser.name,
    //       ulbUser.state.name
    //     );
    //     (mailOptions.to = d.email),
    //       (mailOptions.subject = MohuaTemplate.subject),
    //       (mailOptions.html = MohuaTemplate.body);
    //     Service.sendEmail(mailOptions);
    //   }

    //   /** STATE TRIGGER */
    //   let stateEmails = [];
    //   let stateUser = await User.find({
    //     state: ObjectId(ulbUser.state._id),
    //     isDeleted: false,
    //     role: "STATE",
    //   }).exec();
    //   for (let d of stateUser) {
    //     sleep(700);
    //     d.email ? stateEmails.push(d.email) : "";
    //     d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
    //     let stateTemplate =
    //       await Service.emailTemplate.xvUploadApprovalForState(
    //         ulbUser.name,
    //         d.name
    //       );
    //     mailOptions.to = stateEmails.join();
    //     mailOptions.subject = stateTemplate.subject;
    //     mailOptions.html = stateTemplate.body;
    //     Service.sendEmail(mailOptions);
    //   }

    //   let historyData = await commonQuery({ _id: _id });
    //   if (historyData.length > 0) {
    //     let du = await XVFCGrantULBData.update(
    //       { _id: ObjectId(prevState._id) },
    //       { $set: data }
    //     );
    //   } else {
    //     let newData = resetDataStatus(data);
    //     let du = await XVFCGrantULBData.update(
    //       { _id: ObjectId(prevState._id) },
    //       { $set: newData }
    //     );
    //   }
    // }
    // if (data["status"] == "REJECTED" && user.role == "MoHUA") {
    //   let mailOptions = {
    //     to: "",
    //     subject: "",
    //     html: "",
    //   };
    //   /** ULB TRIGGER */
    //   let ulbEmails = [];
    //   let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
    //     ulbUser.name,
    //     value.reason,
    //     "MoHUA"
    //   );
    //   ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
    //   ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
    //   (mailOptions.to = ulbEmails.join()),
    //     (mailOptions.subject = UlbTemplate.subject),
    //     (mailOptions.html = UlbTemplate.body);
    //   Service.sendEmail(mailOptions);

    //   /** STATE TRIGGER */
    //   let stateEmails = [];
    //   let stateUser = await User.find({
    //     state: ObjectId(ulbUser.state._id),
    //     isDeleted: false,
    //     role: "STATE",
    //   }).exec();
    //   for (let d of stateUser) {
    //     sleep(700);
    //     d.email ? stateEmails.push(d.email) : "";
    //     d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
    //     let stateTemplate = await Service.emailTemplate.xvUploadRejectState(
    //       ulbUser.name,
    //       d.name,
    //       value.reason
    //     );
    //     mailOptions.to = stateEmails.join();
    //     mailOptions.subject = stateTemplate.subject;
    //     mailOptions.html = stateTemplate.body;
    //     Service.sendEmail(mailOptions);
    //   }
    // }
    // if (data["status"] == "REJECTED" && user.role == "STATE") {
    //   let mailOptions = {
    //     to: "",
    //     subject: "",
    //     html: "",
    //   };
    //   /** ULB TRIGGER */
    //   let ulbEmails = [];
    //   let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
    //     ulbUser.name,
    //     value.reason,
    //     "STATE"
    //   );
    //   ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
    //   ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
    //   (mailOptions.to = ulbEmails.join()),
    //     (mailOptions.subject = UlbTemplate.subject),
    //     (mailOptions.html = UlbTemplate.body);
    //   Service.sendEmail(mailOptions);

    //   /** STATE TRIGGER */
    //   let stateEmails = [];
    //   let stateUser = await User.find({
    //     state: ObjectId(ulbUser.state._id),
    //     isDeleted: false,
    //     role: "STATE",
    //   }).exec();
    //   for (let d of stateUser) {
    //     sleep(700);
    //     d.email ? stateEmails.push(d.email) : "";
    //     d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
    //     let stateTemplate =
    //       await Service.emailTemplate.xvUploadRejectByStateTrigger(
    //         ulbUser.name,
    //         d.name,
    //         value.reason
    //       );
    //     mailOptions.to = stateEmails.join();
    //     mailOptions.subject = stateTemplate.subject;
    //     mailOptions.html = stateTemplate.body;
    //     Service.sendEmail(mailOptions);
    //   }
    // }
    if (updatedData) {
      return res.status(200).json({
        success: true,
        message: "Master Form Updated Successfully!",
        data: data,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Master Data Update Failed!",
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: user.role + " Not Authenticated to Perform this Action",
    });
  }
});

module.exports.getHistory = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { formId } = req.params;
  if (user.role != "ULB") {
    let query = {
      _id: ObjectId(formId),
    };
    let getData = await MasterFormData.findOne(query, { history: 1 });
    let outputArr = [];
    if (getData) {
      getData["history"].forEach((el) => {
        let output = {};

        if (el.actionTakenByRole == "ULB" && el.status == "PENDING") {
          output["status"] = "Submitted By ULB";
          output["time"] = el.modifiedAt;
        } else if (el.actionTakenByRole == "STATE" && el.status == "APPROVED") {
          output["status"] = "Approved By State";
          output["time"] = el.modifiedAt;
        } else if (el.actionTakenByRole == "STATE" && el.status == "REJECTED") {
          output["status"] = "Rejected By State";
          output["time"] = el.modifiedAt;
        } else if (el.actionTakenByRole == "MoHUA" && el.status == "REJECTED") {
          output["status"] = "Rejected By MoHUA";
          output["time"] = el.modifiedAt;
        } else if (el.actionTakenByRole == "MoHUA" && el.status == "APPROVED") {
          output["status"] = "Approved By MoHUA";
          output["time"] = el.modifiedAt;
        }

        outputArr.push(output);
      });

      return res.status(200).json({
        success: true,
        message: "Data Fetched Successfully!",
        data: outputArr,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "No Data Found",
      });
    }
  } else {
    return res.status("403").json({
      success: false,
      message: user.role + " Not Authorized to Access this Data",
    });
  }
});
async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

module.exports.stateUlbData = catchAsync(async (req, res) => {
  try {
    let { design_year } = req.query;
    const getAsync = promisify(Redis.Client.get).bind(Redis.Client);
    let { csv } = req.query;
    let allStates;
    // allStates = await getAsync("states");

    // if (!allStates) {
    allStates = await State.find({ accessToXVFC: true }).select({
      _id: 1,
      name: 1,
      code: 1,
    });
    // Redis.set("states", JSON.stringify(allStates));
    // } else {
    //   allStates = JSON.parse(allStates);
    // }

    const allPromise = [];

    for (let index = 0; index < allStates.length; index++) {
      const element = allStates[index];
      allPromise.push(oneStatePromise(element, design_year));
    }

    let allUlbsData = await Promise.all(allPromise);

    if (csv) {
      allUlbsData.forEach((el) => {
        el["submittedForm"] =
          String(((el["approvedByState"] / el["totalULBs"]) * 100).toFixed(2)) +
          "%";
      });
      let field = csvTableData();

      let xlsData = await Service.dataFormating(allUlbsData, field);
      let filename =
        "15th-FC-Form" + moment().format("DD-MMM-YY HH:MM:SS") + ".xlsx";
      return res.xls(filename, xlsData);
    }

    return Response.OK(res, allUlbsData, "Success");
  } catch (error) {
    return Response.DbError(res, null, `${error.message} Db Error`);
  }
});

module.exports.update = catchAsync(async (req, res) => {
  let { formId } = req.params;
  let data = req.body;
  await MasterForm.findOneAndUpdate({ _id: ObjectId(formId) }, data);
  return res.json({ success: true });
});
//script to check how many ulbs are under review by state even when they have not submitted complete forms.
module.exports.check = catchAsync(async (req, res) => {
  let query = [
    {
      $match: {
        $or: [
          {
            $and: [
              { "steps.utilReport.isSubmit": false },
              { isSubmit: true },
              { actionTakenByRole: "ULB" },
              { actionTakenByRole: "PENDING" },
            ],
          },
          {
            $and: [
              { "steps.slbForWaterSupplyAndSanitation.isSubmit": false },
              { isSubmit: true },
              { actionTakenByRole: "ULB" },
              { actionTakenByRole: "PENDING" },
            ],
          },
          {
            $and: [
              { "steps.annualAccounts.isSubmit": false },
              { isSubmit: true },
              { actionTakenByRole: "ULB" },
              { actionTakenByRole: "PENDING" },
            ],
          },
        ],
      },
    },
  ];
  let data = await MasterForm.aggregate(query);
  return res.json({
    data: data,
  });
});

const oneStatePromise = (element, design_year) => {
  return new Promise(async (res, rej) => {
    let data = await Promise.all([
      stateULB(element._id),
      stateAgg(design_year, element._id),
    ]);
    // console.log('check this', data[0])
    let temp = {
      id: element._id,
      name: element.name,
      code: element.code,
      totalULBs: data[0],
      notSubmittedForm: data[0] - data[1].submittedForm,
      ...data[1],
    };
    res(temp);
  });
};

const stateULB = (state) => {
  return new Promise(async (res, rej) => {
    let query = [
      {
        $match: {
          $or: [{ censusCode: { $exists: true, $ne: "" } }, { sbCode: { $exists: true, $ne: "" } }]
        }
      },
      {
        $match: {
          state: ObjectId(state),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "ulb",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      { $count: "count" },
    ];
    // console.log(util.inspect(query, { showHidden: false, depth: null }))
    let stateULB = await Ulb.aggregate(query);
    // console.log(stateULB)
    // let stateULB = await Ulb.find({ state }).count();
    // console.log(stateULB)
    res(stateULB[0].count);
  });
};

const stateAgg = (design_year, state) => {
  return new Promise(async (res, rej) => {
    let data = await MasterForm.find({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
    }).select({ actionTakenByRole: 1, status: 1, isSubmit: 1 });

    let approvedByState = 0,
      withState = 0;
    submittedForm = 0;

    data.forEach((ele) => {
      if (ele.actionTakenByRole == "MoHUA") {
        approvedByState++;
        submittedForm++;
        return true;
      }
      if (
        ele.actionTakenByRole == "STATE" &&
        ele.status == "APPROVED" &&
        ele.isSubmit
      ) {
        approvedByState++;
        submittedForm++;
        return true;
      }
      if (
        (ele.actionTakenByRole == "ULB" && ele.isSubmit) ||
        (ele.actionTakenByRole == "STATE" && !ele.isSubmit)
      ) {
        withState++;
        submittedForm++;
        return true;
      }
    });
    res({ submittedForm, approvedByState, withState });
  });
};

let calculatePercentage = (masterformData, loggedInUserRole) => {
  // console.log(masterformData)
  if (masterformData == null) {
    return 0;
  }
  if (loggedInUserRole == "ULB") {
    if (masterformData?.history.length == 0) {
      console.log("1");
      let count = 0;
      for (let key in masterformData?.steps) {
        if (masterformData?.steps[key]["isSubmit"]) {
          count++;
        }
      }
      if (count == 3) return 100;
      return count * 33;
    } else if (masterformData?.history.length >= 0) {
      console.log("2");
      if (masterformData?.actionTakenByRole == "ULB") {
        console.log("3");
        let count = 0;
        for (let key in masterformData?.steps) {
          if (masterformData?.steps[key]["isSubmit"]) {
            count = count + 1;
          }
        }
        if (count == 3) return 100;
        return count * 33;
      } else {
        if (
          masterformData?.status == "PENDING" ||
          masterformData?.status == "APPROVED"
        ) {
          console.log("4");
          return 100;
        } else {
          console.log("5");
          let count = 0;
          if (masterformData?.status == "REJECTED") {
            for (let key in masterformData?.steps) {
              if (
                masterformData?.steps[key]["status"] == "APPROVED" ||
                masterformData?.steps[key]["status"] == "N/A"
              ) {
                count = count + 1;
              }
            }
            if (count == 3) return 100;
            return count * 33;
          }
        }
      }
    }
  } else if (loggedInUserRole != "ULB") {
    console.log("6");
    if (masterformData?.history.length == 0) {
      console.log("7");
      let count = 0;
      for (let key in masterformData?.steps) {
        if (masterformData?.steps[key]["isSubmit"]) {
          count++;
        }
      }
      if (count == 3) return 100;
    } else if (masterformData?.history.length >= 0) {
      console.log("8");
      if (masterformData?.actionTakenByRole == "ULB") {
        console.log("9");
        let count = 0;
        for (let key in masterformData?.steps) {
          if (masterformData?.steps[key]["isSubmit"]) {
            count = count + 1;
          }
        }
        if (count == 3) return 100;
        return count * 33;
      } else {
        console.log("10");
        return 100;
      }
    }
  }
};


module.exports.roleCorrection = async (req, res) => {

  const forms = await MasterFormData.find({
    actionTakenByRole: "STATE",
    status: "APPROVED",
    isSubmit: true,
    design_year: ObjectId("606aaf854dff55e6c075d219"),
    // "_id" : ObjectId("613724673a106d7a9f106b4d"),

  }).lean();

  let formsWithWrongHistoryArr = []
  let updatedFormWithCorrectHistoryArr = []
  for (let i = 0; i < forms.length; i++) {

    let form = forms[i];
    let formHistory = form.history;
    let formLastHistory = form.history[form.history.length - 1];

    if (formLastHistory) {

      if (formLastHistory.actionTakenByRole === "ULB") {
        formLastHistory.actionTakenByRole = "STATE"
        // formsWithWrongHistoryArr.push(formLastHistory);
        formHistory[formHistory.length - 1] = formLastHistory;
        let x = await MasterFormData.findOneAndUpdate({
          _id: form._id,

        }, {
          $set: {
            history: formHistory
          }
        }).lean();
        updatedFormWithCorrectHistoryArr.push(x)
      }
    }
  }

  return res.status(200).json({
    data: formsWithWrongHistoryArr,
    totalForms: formsWithWrongHistoryArr.length,
    data2: updatedFormWithCorrectHistoryArr
  })

}

module.exports.statusCorrection = async (req, res)=>{


  let forms = await MasterFormData.find(
    {
      "actionTakenByRole" : "MoHUA",
      "status" : "PENDING",
      "isSubmit" : false,
      "steps.slbForWaterSupplyAndSanitation.status": "PENDING",
      // "_id": "620cc57fd4ad324699e76581"
    }
  ).lean();
  let totalForms=0, totalFormsArray =[];

  for(let i =0; i < forms.length; i++){
    let form = forms[i];
    let formHistory = form["history"];
    let formLastHistory = formHistory[formHistory.length-1];
    if(formHistory && formHistory.length>0){
      if(
        formLastHistory["actionTakenByRole"] === "STATE" && 
        formLastHistory["status"]=== "APPROVED"
        && (
            (formLastHistory["steps"]["slbForWaterSupplyAndSanitation"]["status"] === "NA" 
            // ||
            // formLastHistory["steps"]["annualAccounts"]["status"] === "NA" 
            ) ||
           ( 
            formLastHistory["steps"]["slbForWaterSupplyAndSanitation"]["status"] === "N/A"
            //  ||
            // formLastHistory["steps"]["annualAccounts"]["status"] === "N/A" 
          )
          )
        ){
        totalForms++;
          totalFormsArray.push(formLastHistory);
          let status =  formLastHistory["steps"]["slbForWaterSupplyAndSanitation"]["status"]

        let updatedForm = await MasterFormData.findOneAndUpdate({_id: form._id},
          {
            $set:{
              "steps.slbForWaterSupplyAndSanitation.status": status
            }
          })
          totalFormsArray.push(updatedForm);


      }
    }

  }

  return res.status(200).json({
    totalForms,
    totalFormsArray
  })
}

//Query created to set status of Annual Account NA
// module.exports.statusCorrectionAnnual = async (req, res)=>{


//   let forms = await MasterFormData.find(
//     {
//       "actionTakenByRole" : "MoHUA",
//       "status" : "PENDING",
//       "isSubmit" : false,
//       "steps.annualAccounts.status": "PENDING",
//       // "_id": "620cc57fd4ad324699e76581"
//     }
//   ).lean();
//   let totalForms=0, totalFormsArray =[];

//   for(let i =0; i < forms.length; i++){
//     let form = forms[i];
//     let formHistory = form["history"];
//     let formLastHistory = formHistory[formHistory.length-1];
//     if(formHistory && formHistory.length>0){
//       if(
//         formLastHistory["actionTakenByRole"] === "STATE" && 
//         formLastHistory["status"]=== "APPROVED"
//         // && (
//         //     (formLastHistory["steps"]["annualAccounts"]["status"] === "NA" 
//         //     // ||
//         //     // formLastHistory["steps"]["annualAccounts"]["status"] === "NA" 
//         //     ) ||
//         //    ( 
//         //     formLastHistory["steps"]["annualAccounts"]["status"] === "N/A"
//         //     //  ||
//         //     // formLastHistory["steps"]["annualAccounts"]["status"] === "N/A" 
//         //   )
//           // )
//         ){
//         totalForms++;
//           totalFormsArray.push(formLastHistory);
//           let status =  formLastHistory["steps"]["annualAccounts"]["status"]

//         // let updatedForm = await MasterFormData.findOneAndUpdate({_id: form._id},
//         //   {
//         //     $set:{
//         //       "steps.annualAccounts.status": status
//         //     }
//         //   })
//           // totalFormsArray.push(updatedForm);


//       }
//     }

//   }

//   return res.status(200).json({
//     totalForms,
//     totalFormsArray
//   })
// }