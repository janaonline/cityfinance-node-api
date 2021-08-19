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
      if (masterFormData.actionTakenByRole != user.role) {
        if (masterFormData.history.length != 0)
          masterFormData =
            masterFormData.history[masterFormData.history.length - 1];
        masterFormData['stateName'] = masterFormData.stateName
        masterFormData['ulbName'] = masterFormData.ulbName
      }
      if (
        user.role == "MoHUA" &&
        masterFormData.actionTakenByRole == "STATE" &&
        masterFormData.status == "APPROVED"
      ) {
        for (const key in masterFormData.steps) {
          masterFormData.steps[key].status = "PENDING";
        }
        try {

          masterFormData = await updateDataInMaster(masterFormData, req.decoded);
        } catch (error) {
          console.log(error);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Data Found Successfully!",
        response: masterFormData,
      });
    }
  }

  let masterFormData = await MasterFormData.findOne(query);
  if (masterFormData['actionTakenByRole'] != user.role) {
    masterFormData = masterFormData.history[masterFormData.history.length - 1];
    masterFormData['stateName'] = masterFormData.stateName
    masterFormData['ulbName'] = masterFormData.ulbName
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
    csv = req.query.csv === 'true',
    limit = req.query.limit ? parseInt(req.query.limit) : 50;

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
        $match:
        {
          "state.accessToXVFC": true
        }
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
    let match2 = {
      $match: {
        state: ObjectId(user.state)
      }
    }
    let queryNotStarted = [{
      $lookup: {
        from: "states",
        localField: "state",
        foreignField: "_id",
        as: "state",
      },
    },
    { $unwind: "$state" },
    {
      $match:
      {
        "state.accessToXVFC": true
      }
    },
    {
      $lookup: {
        from: "masterforms",
        localField: "_id",
        foreignField: "ulb",
        as: "masterformData",
      },
    },
    {
      $unwind: {
        path: "$masterformData",
        preserveNullAndEmptyArrays: true
      }
    },

    {
      $match:
      {
        "masterformData": { $exists: false },

      }
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
    { $addFields: { "printStatus": "Not Started" } },
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
        printStatus: 1
      },
    },
    ]
    if (user.role == 'STATE') {
      queryNotStarted.unshift(match2)
    }



    let newFilter = await Service.mapFilter(filter);
    let total = undefined;
    let priority = false;

    // if (newFilter["status"]) {

    //   Object.assign(newFilter, statusFilter[newFilter["status"]]);
    //   newFilter['printStatus'] = newFilter['status']
    //   delete newFilter['status']
    // }
    if (newFilter && !newFilter['status'] && Object.keys(newFilter).length) {
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
          d["printStatus"] = "In Progress";
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == true &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = "Under Review by State";
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = "Under Review by State";
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = "Under Review by MoHUA";
        }
        if (d.isSubmit == false && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Under Review by MoHUA";
        }
        if (
          d.status == "PENDING" &&
          d.actionTakenByUserRole == "STATE" &&
          d.isSubmit == false
        ) {
          d["printStatus"] = "Under Review by State";
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = "Rejected by STATE";
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Rejected by MoHUA";
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Approval Completed";
        }
      }
      let field = csvULBReviewData();
      if (user.role == "STATE") {
        delete field.state;
      }
      let xlsData = await Service.dataFormating(arr, field);
      let date = moment().format("DD-MMM-YY").toString()
      let filename = `15th-FC-Form${date}.xlsx`
      return res.xls(filename, xlsData);
    } else {
      if (!skip) {
        let qrr = [...queryFilled, { $count: "count" }];
        let d = await MasterFormData.aggregate(qrr);
        total = d.length ? d[0].count : 0;
      }
      queryFilled.push({ $skip: skip });
      queryNotStarted.push({ $skip: skip });
      // queryFilled.push({ $limit: limit });
      // queryNotStarted.push({ $limit: limit });
      console.log(util.inspect(queryFilled, { showHidden: false, depth: null }))
      let masterFormData = await MasterFormData.aggregate(queryFilled).exec();
      let p1 = [];
      let p2 = [];
      let p3 = [];
      let p4 = [];
      let p5 = [];
      let p6 = [];
      let finalOutput = []

      for (d of masterFormData) {
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = "In Progress";
          p6.push(d)
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == true &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d["printStatus"] = "Under Review by State";
          p2.push(d)
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d["printStatus"] = "Under Review by State";
          p2.push(d)
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = "Under Review by MoHUA";
          p1.push(d)
        }
        if (d.isSubmit == false && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Under Review by MoHUA";
          p1.push(d)
        }
        if (
          d.status == "PENDING" &&
          d.actionTakenByUserRole == "STATE" &&
          d.isSubmit == false
        ) {
          d["printStatus"] = "Under Review by State";
          p2.push(d)
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "STATE") {
          d["printStatus"] = "Rejected by STATE";
          p5.push(d)
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Rejected by MoHUA";
          p4.push(d)
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "MoHUA") {
          d["printStatus"] = "Approval Completed";
          p3.push(d)
        }
      }

      let noMasterFormData = await Ulb.aggregate(queryNotStarted).exec();
      finalOutput.push(...p1, ...p2, ...p3, ...p4, ...p5, ...p6, ...noMasterFormData)
      let tryData = []
      if (newFilter["status"]) {

        finalOutput = finalOutput.filter(data => {
          // console.log(data.printStatus.toLowerCase() == newFilter["status"].toLowerCase())
          return data.printStatus.toLowerCase() == newFilter["status"].toLowerCase()
        });
      }
      console.log(finalOutput)
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
  const { design_year, ulb, financialYear } = req.query;

  let query = [
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
        from: "pfmsaccounts",
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
        as: "pfmsAccounts",
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
              history: 0,
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
  const data = await Ulb.aggregate(query);
  return res.json(data);
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
        totalULBs: { $sum: { $size: "$ulb" } }
      }
    }
  ];
  if (user.role != 'STATE' && !state) {
    baseQuery = [
      {
        $group: {
          _id: null,
          totalULBs: { $sum: { $size: "$ulb" } }
        }
      }
    ]
  }

  let count = await UA.aggregate(baseQuery);
  console.log(count);
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
        ulbs: { $push: "$ulb" }
      }
    },
    {
      $project: {
        totalULBs: 1,
        "ulb": {
          $reduce: {
            input: "$ulbs",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] }
          }
        }
      }
    },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb",
        foreignField: "ulb",
        as: "masterformData"

      }
    },
    { $unwind: "$masterformData" },
    {
      $match: {
        "masterformData.design_year": ObjectId(design_year),
        $or: [{
          $and: [{ "masterformData.actionTakenByRole": "STATE" },
          { "masterformData.status": "APPROVED" }]
        },

        {
          $and: [{ "masterformData.actionTakenByRole": "MoHUA" }, {
            $or: [
              { "masterformData.status": "APPROVED" },
              { "masterformData.status": "PENDING" }]
          }]
        }]
      }
    },
    { $count: "filledULBs" }


  ]
  if (user.role != 'STATE' && !state) {
    query = [

      {
        $group: {
          _id: "$state",
          totalULBs: { $sum: { $size: "$ulb" } },
          ulbs: { $push: "$ulb" }
        }
      },
      {
        $project: {
          totalULBs: 1,
          "ulb": {
            $reduce: {
              input: "$ulbs",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          }
        }
      },
      {
        $lookup: {
          from: "masterforms",
          localField: "ulb",
          foreignField: "ulb",
          as: "masterformData"

        }
      },
      { $unwind: "$masterformData" },
      {
        $match: {
          "masterformData.design_year": ObjectId(design_year),
          $or: [{
            $and: [{ "masterformData.actionTakenByRole": "STATE" },
            { "masterformData.status": "APPROVED" }]
          },

          {
            $and: [{ "masterformData.actionTakenByRole": "MoHUA" }, {
              $or: [
                { "masterformData.status": "APPROVED" },
                { "masterformData.status": "PENDING" }]
            }]
          }]
        }
      },
      { $count: "filledULBs" }


    ]
  }
  let data = await UA.aggregate(query);
  console.log(data[0]?.filledULBs, count[0]?.totalULBs)

  let finalData = {
    filledULBs: data[0]?.filledULBs ? data[0]?.filledULBs : 0,
    totalULBs: count[0]?.totalULBs ? count[0]?.totalULBs : 0
  }
  res.json({
    success: true,
    data: finalData,
  });
});

module.exports.UAList = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query;
  let state = user.state ?? state_id
  let uaData = await UA.find({ state: ObjectId(state) })
  return res.status(200).json({
    success: true,
    data: uaData
  })
})

module.exports.slbWaterSanitationState = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query
  let state = req.decoded.state ?? state_id
  let { ua_id } = req.query;
  if (!ua_id || !state) {
    return res.status(400).json({
      success: false,
      message: !ua_id ? "UA ID NOT FOUND" : !state ? "STATE ID NOT FOUND" : "State/UA ID Not Found"
    })
  }

  let { design_year } = req.params
  let match;
  if (ua_id == 'all') {
    match = {
      $match: {
        state: ObjectId(state)
      }
    }
  } else {
    match = {
      $match: {
        _id: ObjectId(ua_id)
      }
    }
  }
  let countQuery = [
    match,
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
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 }
      }
    }

  ]

  let queryNotStarted = [
    match,
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
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 },
        ulb: { $addToSet: "$ulb" }
      }
    },
    { $unwind: "$ulb" },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb._id",
        foreignField: "ulb",
        as: "masterFormData"

      }
    },
    {
      $match: {
        "masterFormData._id": { $exists: false }
      }
    },
    {
      $group: {
        _id: null,
        totalULBsInUA: { $first: "$totalULBsinUA" },
        notStarted: { $sum: 1 }
      }
    }

  ]
  let queryUA = [
    match,
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
      $match: {
        "ulb.isUA": "Yes"
      }
    },



    {
      $lookup: {
        from: "masterforms",
        localField: "ulb._id",
        foreignField: "ulb",
        as: "masterFormData"
      }
    },
    {
      $unwind: "$masterFormData"
    },

    {
      $group: {
        _id: {
          actionTakenByRole: "$masterFormData.actionTakenByRole",
          status: "$masterFormData.status",
          isSubmit: "$masterFormData.isSubmit",
          "slbFormStatus": "$masterFormData.steps.slbForWaterSupplyAndSanitation.status",
          "slbFormComplete": "$masterFormData.steps.slbForWaterSupplyAndSanitation.isSubmit"
        },
        count: { $sum: 1 }
      }
    }

  ]

  let queryNonMillionNonUA_NotStarted = [
    {
      $match: {
        state: ObjectId(state),
        isMillionPlus: "No",
        isUA: "No"
      }

    },
    {
      $group: {
        _id: null,
        totalULBsinUA: { $sum: 1 },
        ulb_id: { $addToSet: "$_id" }
      }
    },
    { $unwind: "$ulb_id" },
    {
      $lookup: {
        from: "masterforms",
        localField: "ulb_id",
        foreignField: "ulb",
        as: "masterFormData"

      }
    },
    {
      $match: {
        "masterFormData._id": { $exists: false }
      }
    },
    {
      $group: {
        _id: null,
        totalULBsInUA: { $first: "$totalULBsinUA" },
        notStarted: { $sum: 1 }
      }
    }

  ]
  let queryNonMillionNonUA = [

    {
      $match: {
        state: ObjectId(state),
        "isMillionPlus": "No",
        "isUA": "No"
      }
    },
    {
      $lookup: {
        from: "masterforms",
        localField: "_id",
        foreignField: "ulb",
        as: "masterFormData"
      }
    },
    {
      $unwind: "$masterFormData"
    },

    {
      $group: {
        _id: {
          actionTakenByRole: "$masterFormData.actionTakenByRole",
          status: "$masterFormData.status",
          isSubmit: "$masterFormData.isSubmit",
          "slbFormStatus": "$masterFormData.steps.slbForWaterSupplyAndSanitation.status",
          "slbFormComplete": "$masterFormData.steps.slbForWaterSupplyAndSanitation.isSubmit"

        },
        count: { $sum: 1 }
      }
    }

  ]


  let { output1, output2, output3, output4, output5 } =
    await new Promise(async (resolve, reject) => {
      let prms1 = new Promise(async (rslv, rjct) => {
        let output = await UA.aggregate(countQuery);
        rslv(output);
      });

      let prms2 = new Promise(async (rslv, rjct) => {
        console.log(util.inspect(queryNotStarted, { showHidden: false, depth: null }))
        let output = await UA.aggregate(queryNotStarted);
        rslv(output);
      });
      let prms3 = new Promise(async (rslv, rjct) => {
        let output = await UA.aggregate(queryUA);
        rslv(output);
      });
      let prms4 = new Promise(async (rslv, rjct) => {
        let output = await Ulb.aggregate(queryNonMillionNonUA_NotStarted);
        rslv(output);
      });
      let prms5 = new Promise(async (rslv, rjct) => {
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
          if (
            output1 &&
            output2 &&
            output3 &&
            output4 &&
            output5
          ) {
            resolve({
              output1,
              output2,
              output3,
              output4,
              output5
            });
          } else {
            reject({ message: "No Data Found" });
          }
        },
        (e) => {
          reject(e);
        }
      );
    });

  let finalData = processSLBData(output1, output2, output3, output4, output5)


  return res.status(200).json({
    success: true,
    data: finalData
  })
})
processSLBData = (output1, output2, output3, output4, output5) => {
  console.log("outputs", output1, output2, output3, output4, output5)
  let million_pendingCompletion = 0,
    million_completedAndPendingSubmission = 0,
    million_underReviewByState = 0,
    million_approvedByState = 0,
    nonMillion_pendingCompletion = 0,
    nonMillion_completedAndPendingSubmission = 0,
    nonMillion_underReviewByState = 0,
    nonMillion_approvedByState = 0;

  //not started ulbs (pending completion)


  nonMillion_pendingCompletion = output2[0]?.hasOwnProperty('notStarted') ? output2[0].notStarted : 0 + nonMillion_pendingCompletion;
  million_pendingCompletion = output4[0]?.hasOwnProperty('notStarted') ? output4[0].notStarted : 0 + million_pendingCompletion;


  //isUA
  output3.forEach(el => {
    let newEl = el['_id']
    //pendingCompletion
    if ((newEl['isSubmit'] &&
      (newEl['actionTakenByRole'] == 'STATE' || newEl['actionTakenByRole'] == 'MoHUA') &&
      newEl['status'] == 'REJECTED' &&
      newEl['slbFormStatus'] == 'REJECTED'
    ) ||
      (!newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'ULB' &&
        newEl['status'] == 'PENDING' &&
        !newEl['slbFormComplete']

      )
    ) {
      nonMillion_pendingCompletion = el['count'] + nonMillion_pendingCompletion;
    }

    //completed but pending submission
    if (!newEl['isSubmit'] &&
      newEl['actionTakenByRole'] == 'ULB' &&
      newEl['status'] == 'PENDING' &&
      newEl['slbFormComplete']) {
      nonMillion_completedAndPendingSubmission = el['count'] + nonMillion_completedAndPendingSubmission
    }
    //under review by state
    if ((newEl['isSubmit'] &&
      newEl['actionTakenByRole'] == 'ULB' &&
      newEl['status'] == 'PENDING') ||
      (
        !newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'STATE' &&
        newEl['status'] == 'PENDING'
      )) {
      nonMillion_underReviewByState = el['count'] + nonMillion_underReviewByState
    }

    //approvedBySTate
    if ((newEl['isSubmit'] &&
      (newEl['actionTakenByRole'] == 'STATE' || newEl['actionTakenByRole'] == 'MoHUA') &&
      newEl['status'] == 'APPROVED'

    ) ||
      (
        !newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'MoHUA' &&
        (newEl['status'] == 'PENDING' || newEl['status'] == 'APPROVED')
      )) {
      nonMillion_approvedByState = el['count'] + nonMillion_approvedByState
    }


  })

  // NOn UA, NOn Million
  output5.forEach(el => {
    let newEl = el['_id']
    //pendingCompletion
    if ((newEl['isSubmit'] &&
      (newEl['actionTakenByRole'] == 'STATE' || newEl['actionTakenByRole'] == 'MoHUA') &&
      newEl['status'] == 'REJECTED' &&
      newEl['slbFormStatus'] == 'REJECTED'
    ) ||
      (!newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'ULB' &&
        newEl['status'] == 'PENDING' &&
        !newEl['slbFormComplete']

      )
    ) {
      million_pendingCompletion = el['count'] + million_pendingCompletion;
    }

    //completed but pending submission
    if (!newEl['isSubmit'] &&
      newEl['actionTakenByRole'] == 'ULB' &&
      newEl['status'] == 'PENDING' &&
      newEl['slbFormComplete']) {
      million_completedAndPendingSubmission = el['count'] + million_completedAndPendingSubmission
    }
    //under review by state
    if ((newEl['isSubmit'] &&
      newEl['actionTakenByRole'] == 'ULB' &&
      newEl['status'] == 'PENDING') ||
      (
        !newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'STATE' &&
        newEl['status'] == 'PENDING'
      )) {
      million_underReviewByState = el['count'] + million_underReviewByState
    }

    //approvedBySTate
    if ((newEl['isSubmit'] &&
      (newEl['actionTakenByRole'] == 'STATE' || newEl['actionTakenByRole'] == 'MoHUA') &&
      newEl['status'] == 'APPROVED'

    ) ||
      (
        !newEl['isSubmit'] &&
        newEl['actionTakenByRole'] == 'MoHUA' &&
        (newEl['status'] == 'PENDING' || newEl['status'] == 'APPROVED')
      )) {
      million_approvedByState = el['count'] + million_approvedByState
    }


  })
  let finalOutput = [
    {
      category: "NonMillionNonUA",
      pendingCompletion: million_pendingCompletion,
      completedAndPendingSubmission: million_completedAndPendingSubmission,
      underReviewByState: million_underReviewByState,
      approvedByState: million_approvedByState
    },
    {
      category: "UA",
      pendingCompletion: nonMillion_pendingCompletion,
      completedAndPendingSubmission: nonMillion_completedAndPendingSubmission,
      underReviewByState: nonMillion_underReviewByState,
      approvedByState: nonMillion_approvedByState
    }
  ]

  console.log(finalOutput)

  return finalOutput;
}

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
    if (user.role == 'STATE') {
      k = 3
    } else if (user.role == 'MoHUA') {
      k = 1
    }
    for (let i = 0; i < k; i++) {
      let match, match2;

      if (i == 0) {
        match = {
          $match: {
            $or: [
              { isSubmit: true, actionTakenByRole: "ULB", status: "PENDING" },
              {
                $and:
                  [
                    { $or: [{ actionTakenByRole: "MoHUA" }, { actionTakenByRole: "STATE" }] },
                    { $or: [{ status: "PENDING" }, { status: "APPROVED" }] }
                  ]
              }],
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
          $unwind: "$ulbData",
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
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData",
          },
        },
        {
          $unwind: "$ulbData",
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
            localField: "ulb",
            foreignField: "ulb",
            as: "annualaccount",
          },
        },
        { $unwind: "$annualaccount" },
        {
          $group: {
            _id: "$annualaccount.audited.submit_annual_accounts",
            audited: { $sum: 1 },
            annualaccount: { $first: "$annualaccount" }
          }
        },
        {
          $match: {
            _id: true
          }
        },
        {
          $group: {
            _id: "$annualaccount.unAudited.submit_annual_accounts",
            unAudited: { $sum: 1 },
            audited: { $first: "$audited" }

          }
        }

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
          $unwind: "$ulbData",
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
            localField: "ulb",
            foreignField: "ulb",
            as: "utilReportForm",
          },
        },
        { $unwind: "$utilReportForm" },
        {
          '$group': {
            _id: {
              isSubmit: '$steps.utilReport.isSubmit',
              actionTakenByRole: '$actionTakenByRole',
              isDraft: '$utilReportForm.isDraft',
              status: '$steps.utilReport.status'
            },
            count: { '$sum': 1 }
          }
        }
      ];

      // let query5 = [
      //   {
      //     $lookup: {
      //       from: "ulbs",
      //       localField: "ulb",
      //       foreignField: "_id",
      //       as: "ulbData",
      //     },
      //   },
      //   {
      //     $unwind: "$ulbData",
      //   },
      //   {
      //     $project: {
      //       steps: 1,
      //       actionTakenByRole: 1,
      //       status: 1,
      //       isSubmit: 1,
      //       ulb: 1,
      //       state: 1,
      //       design_year: 1,
      //       isUA: "$ulbData.isUA",
      //       isMillionPlus: "$ulbData.isMillionPlus",
      //     },
      //   },
      //   match2,
      //   {
      //     $lookup: {
      //       from: "xvfcgrantulbforms",
      //       localField: "ulb",
      //       foreignField: "ulb",
      //       as: "slbForm",
      //     },
      //   },
      //   { $unwind: "$slbForm" },
      //   {
      //     $group: {
      //       _id: {
      //         isSubmit: "$isSubmit",
      //         actionTakenByRole: "$actionTakenByRole",
      //         status: "$slbForm.status",
      //         isCompleted: "$slbForm.isCompleted",
      //         isMillionPlus:"$isMillionPlus"
      //       },
      //       count: { $sum: 1 },
      //     },
      //   },
      // ];
      // let query6 = [
      //   {
      //     $lookup: {
      //       from: "ulbs",
      //       localField: "ulb",
      //       foreignField: "_id",
      //       as: "ulbData",
      //     },
      //   },
      //   {
      //     $unwind: "$ulbData",
      //   },
      //   {
      //     $project: {
      //       steps: 1,
      //       actionTakenByRole: 1,
      //       status: 1,
      //       isSubmit: 1,
      //       ulb: 1,
      //       state: 1,
      //       design_year: 1,
      //       isUA: "$ulbData.isUA",
      //       isMillionPlus: "$ulbData.isMillionPlus",
      //     },
      //   },
      //   match2,
      //   {
      //     $lookup: {
      //       from: "xvfcgrantplans",
      //       localField: "ulb",
      //       foreignField: "ulb",
      //       as: "plans",
      //     },
      //   },
      //   { $unwind: "$plans" },
      //   {
      //     $group: {
      //       _id: {
      //         isSubmit: "$isSubmit",
      //         actionTakenByRole: "$actionTakenByRole",
      //         status: "$plans.status",
      //         isDraft: "$plans.isDraft",
      //       },
      //       count: { $sum: 1 },
      //     },
      //   },
      // ];
      let { output1, output3, output4 } =
        await new Promise(async (resolve, reject) => {
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


              if (
                output1 &&
                output3 &&
                output4

              ) {
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
        });

      let data = formatOutput(
        output1,

        output3,
        output4,


        i,
        numbers
      );
      finalOutput.push(data);
    }
    // console.log(util.inspect({
    //   "overall": output1,
    //   "pfms": output2,
    //   "annualaccounts": output3,
    //   "utilreport": output4,
    //   "slb": output5
    // }, { showHidden: false, depth: null }))

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

      "audited_annualaccounts.isDraft": true,
    },
    15: {
      // Not Submitted Accounts

      "audited_annualaccounts.isDraft": false,
      "audited_annualaccounts.auditedSubmitted": false,
    },
    16: {
      "audited_annualaccounts.isDraft": false,
      "audited_annualaccounts.auditedSubmitted": true,
    },
    17: {
      unaudited_annualaccounts: {
        //Not Started
      },
    },
    18: {
      //In Progress

      "unaudited_annualaccounts.isDraft": true,
    },
    19: {
      //Not Submitted Accounts
      "unaudited_annualaccounts.isDraft": false,
      "unaudited_annualaccounts.unAuditedSubmitted": false,
    },
    20: {
      // Submitted Accounts

      "unaudited_annualaccounts.isDraft": false,
      "unaudited_annualaccounts.unAuditedSubmitted": true,
    },

    21: {
      //not started
      utilizationreport: {},
    },
    22: {
      "utilizationreport.isDraft": true,
    },
    23: {
      "utilizationreport.isDraft": false,
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
    csv = req.query.csv === 'true',
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
    let { state_id } = req.query
    let state = user.state ?? state_id
    let query;
    if (user.role == 'MoHUA' && !state) {
      query = [

        // {
        //   $lookup: {
        //     from: "uas",
        //     localField: "_id",
        //     foreignField: "ulb",
        //     as: "uas",
        //   },
        // },
        // {
        //   $unwind: {
        //     path: "$uas",
        //     preserveNullAndEmptyArrays: true,
        //   },
        // },

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
          $lookup: {
            from: "annualaccountdatas",
            localField: "_id",
            foreignField: "ulb",
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
            from: "pfmsaccounts",
            localField: "_id",
            foreignField: "ulb",
            as: "pfmsaccounts",
          },
        },
        {
          $unwind: {
            path: "$pfmsaccounts",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "utilizationreports",
            localField: "_id",
            foreignField: "ulb",
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
            from: "xvfcgrantplans",
            localField: "_id",
            foreignField: "ulb",
            as: "xvfcgrantplans",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantplans",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "xvfcgrantulbforms",
            localField: "_id",
            foreignField: "ulb",
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
            "state.accessToXVFC": true
          }
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
            localField: "xvfcgrantplans.actionTakenBy",
            foreignField: "_id",
            as: "xvfcgrantplans.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantplans.actionTakenBy",
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

            pfmsaccount: {
              isDraft: "$pfmsaccounts.isDraft",
              registered: "$pfmsaccounts.linked",
            },

            utilizationreport: {
              isDraft: "$utilizationreports.isDraft",
              status: "$utilizationreports.status",
              actionTakenBy: "$utilizationreports.actionTakenBy.role",
            },
            xvfcgrantplans: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Not Applicable",
                else: {
                  isDraft: "$xvfcgrantplans.isDraft",
                  status: "$xvfcgrantplans.status",
                  actionTakenBy: "$xvfcgrantplans.actionTakenBy.role",
                },
              },
            },
            xvfcgrantulbforms: {
              $cond: {
                if: { $eq: ["$isUA", "No"] },
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
          $lookup: {
            from: "annualaccountdatas",
            localField: "_id",
            foreignField: "ulb",
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
            from: "pfmsaccounts",
            localField: "_id",
            foreignField: "ulb",
            as: "pfmsaccounts",
          },
        },
        {
          $unwind: {
            path: "$pfmsaccounts",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "utilizationreports",
            localField: "_id",
            foreignField: "ulb",
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
            from: "xvfcgrantplans",
            localField: "_id",
            foreignField: "ulb",
            as: "xvfcgrantplans",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantplans",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "xvfcgrantulbforms",
            localField: "_id",
            foreignField: "ulb",
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
            localField: "xvfcgrantplans.actionTakenBy",
            foreignField: "_id",
            as: "xvfcgrantplans.actionTakenBy",
          },
        },
        {
          $unwind: {
            path: "$xvfcgrantplans.actionTakenBy",
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

            pfmsaccount: {
              isDraft: "$pfmsaccounts.isDraft",
              registered: "$pfmsaccounts.linked",
            },

            utilizationreport: {
              isDraft: "$utilizationreports.isDraft",
              status: "$utilizationreports.status",
              actionTakenBy: "$utilizationreports.actionTakenBy.role",
            },
            xvfcgrantplans: {
              $cond: {
                if: { $eq: ["$isMillionPlus", "Yes"] },
                then: "Not Applicable",
                else: {
                  isDraft: "$xvfcgrantplans.isDraft",
                  status: "$xvfcgrantplans.status",
                  actionTakenBy: "$xvfcgrantplans.actionTakenBy.role",
                },
              },
            },
            xvfcgrantulbforms: {
              $cond: {
                if: { $eq: ["$isUA", "No"] },
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

    let newFilter = await Service.mapFilter(filter);

    if (
      newFilter["status"] ||
      newFilter["pfmsStatus"] ||
      newFilter["auditedStatus"] ||
      newFilter["unauditedStatus"] ||
      newFilter["utilStatus"] ||
      newFilter["slbStatus"] ||
      newFilter["plansStatus"]
    ) {
      Object.assign(newFilter, statusFilter[newFilter["status"]]);
      Object.assign(newFilter, statusFilter[newFilter["pfmsStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["auditedStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["unauditedStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["utilStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["slbStatus"]]);
      Object.assign(newFilter, statusFilter[newFilter["plansStatus"]]);
      delete newFilter["status"];
      delete newFilter["pfmsStatus"];
      delete newFilter["auditedStatus"];
      delete newFilter["unauditedStatus"];
      delete newFilter["utilStatus"];
      delete newFilter["slbStatus"];
      delete newFilter["plansStatus"];
    }
    if (newFilter && Object.keys(newFilter).length) {
      query.push({ $match: newFilter });
    }

    if (csv) {
      let data = await Ulb.aggregate(query).exec();
      data.forEach((el) => {
        if (Object.entries(el?.masterform).length === 0) {
          el["masterformStatus"] = "Not Started";
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = "Under Review by State";
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "STATE"
        ) {
          el["masterformStatus"] = "Under Review by State";
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = "In Progress";
        } else if (
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = "Rejected by State";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = "Rejected by MoHUA";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "APPROVED"
        ) {
          el["masterformStatus"] = "Approval Completed";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.isSubmit === false
        ) {
          el["masterformStatus"] = "Under Review by MoHUA";
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "PENDING"
        ) {
          el["masterformStatus"] = "Under Review by MoHUA";
        }

        if (Object.entries(el?.pfmsaccount).length === 0) {
          el["pfmsaccountStatus"] = "Not Started";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == "no"
        ) {
          el["pfmsaccountStatus"] = "Not Registered";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == "yes"
        ) {
          el["pfmsaccountStatus"] = "Registered";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == ""
        ) {
          el["pfmsaccountStatus"] = "Not Registered";
        } else if (el?.pfmsaccount.isDraft == "true") {
          el["pfmsaccountStatus"] = "In Progress";
        }

        if (Object.entries(el?.utilizationreport).length === 0) {
          el["utilizationreportStatus"] = "Not Started";
        } else if (el?.utilizationreport.isDraft == false) {
          el["utilizationreportStatus"] = "Completed";
        } else if (el?.utilizationreport.isDraft == true) {
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
          el?.audited_annualaccounts.auditedSubmitted == true
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
          el?.unaudited_annualaccounts.unAuditedSubmitted == true
        ) {
          el["unaudited_annualaccountsStatus"] = "Accounts Submitted";
        } else if (el?.unaudited_annualaccounts.isDraft == true) {
          el["unaudited_annualaccountsStatus"] = "In Progress";
        }

        if (Object.entries(el?.xvfcgrantplans).length === 0) {
          el["xvfcgrantplansStatus"] = "Not Started";
        } else if (el?.xvfcgrantplans.isDraft == false) {
          el["xvfcgrantplansStatus"] = "Completed";
        } else if (el?.xvfcgrantplans.isDraft == true) {
          el["xvfcgrantplansStatus"] = "In Progress";
        } else if (el?.xvfcgrantplans == "Not Applicable") {
          el["xvfcgrantplansStatus"] = "Not Applicable";
        } else {
        }

        if (Object.entries(el?.xvfcgrantulbforms).length === 0) {
          el["xvfcgrantulbformsStatus"] = "Not Started";
        } else if (el?.xvfcgrantulbforms.isCompleted == true) {
          el["xvfcgrantulbformsStatus"] = "Completed";
        } else if (el?.xvfcgrantulbforms.isCompleted == false) {
          el["xvfcgrantulbformsStatus"] = "In Progress";
        } else if (el?.xvfcgrantulbforms == "Not Applicable") {
          el["xvfcgrantulbformsStatus"] = "Not Applicable";
        }
      });

      console.log(data)
      let field = csvData();
      if (user.role == "STATE") {
        delete field.stateName;
      }
      if (formName == "utilReport") {
        delete field.masterformStatus;
        delete field.pfmsaccountStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.xvfcgrantplansStatus;
        delete field.xvfcgrantulbformsStatus;

      } else if (formName == "pfms") {
        delete field.masterformStatus;
        delete field.xvfcgrantulbformsStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.xvfcgrantplansStatus;
        delete field.utilizationreportStatus;

      } else if (formName == "plans") {
        delete field.masterformStatus;
        delete field.xvfcgrantulbformsStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.pfmsaccountStatus;
        delete field.utilizationreportStatus;
      } else if (formName == "slb") {
        delete field.masterformStatus;
        delete field.xvfcgrantplansStatus;
        delete field.audited_annualaccountsStatus;
        delete field.unaudited_annualaccountsStatus;
        delete field.pfmsaccountStatus;
        delete field.utilizationreportStatus;
      } else if (formName == "annualaccount") {
        delete field.masterformStatus;
        delete field.xvfcgrantplansStatus;
        delete field.pfmsaccountStatus;
        delete field.utilizationreportStatus;
        delete field.xvfcgrantulbformsStatus;

      }
      let xlsData = await Service.dataFormating(data, field);
      let filename =
        `15th-FC-Form${moment().format("DD-MMM-YY HH:MM:SS")}.xlsx`;
      return res.xls(filename, xlsData);

    } else {
      if (sort && Object.keys(sort).length) {
        query.push({ $sort: sort });
      }
      query.push({ $skip: skip });
      // query.push({ $limit: limit });
      console.log(util.inspect(query, false, null));
      let data = await Ulb.aggregate(query).exec();

      console.log(data);
      data.forEach((el) => {
        if (Object.entries(el?.masterform).length === 0) {
          el["masterformStatus"] = "Not Started";
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = "Under Review by State";
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "STATE"
        ) {
          el["masterformStatus"] = "Under Review by State";
        } else if (
          el?.masterform.isSubmit == false &&
          el?.masterform.actionTakenByRole === "ULB" &&
          (el.masterform.status === "PENDING" || el.masterform.status === "NA")
        ) {
          el["masterformStatus"] = "In Progress";
        } else if (
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = "Rejected by State";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "REJECTED"
        ) {
          el["masterformStatus"] = "Rejected by MoHUA";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.status === "APPROVED"
        ) {
          el["masterformStatus"] = "Approval Completed";
        } else if (
          el?.masterform.actionTakenByRole === "MoHUA" &&
          el?.masterform.isSubmit === false
        ) {
          el["masterformStatus"] = "Under Review by MoHUA";
        } else if (
          el?.masterform.isSubmit == true &&
          el?.masterform.actionTakenByRole === "STATE" &&
          el?.masterform.status === "PENDING"
        ) {
          el["masterformStatus"] = "Under Review by MoHUA";
        }

        if (Object.entries(el?.pfmsaccount).length === 0) {
          el["pfmsaccountStatus"] = "Not Started";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == "no"
        ) {
          el["pfmsaccountStatus"] = "Not Registered";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == "yes"
        ) {
          el["pfmsaccountStatus"] = "Registered";
        } else if (
          el?.pfmsaccount.isDraft == false &&
          el?.pfmsaccount.registered == ""
        ) {
          el["pfmsaccountStatus"] = "Not Registered";
        } else if (el?.pfmsaccount.isDraft == "true") {
          el["pfmsaccountStatus"] = "In Progress";
        }

        if (Object.entries(el?.utilizationreport).length === 0) {
          el["utilizationreportStatus"] = "Not Started";
        } else if (el?.utilizationreport.isDraft == false) {
          el["utilizationreportStatus"] = "Completed";
        } else if (el?.utilizationreport.isDraft == true) {
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
          el?.audited_annualaccounts.auditedSubmitted == true
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
          el?.unaudited_annualaccounts.unAuditedSubmitted == true
        ) {
          el["unaudited_annualaccountsStatus"] = "Accounts Submitted";
        } else if (el?.unaudited_annualaccounts.isDraft == true) {
          el["unaudited_annualaccountsStatus"] = "In Progress";
        }

        if (Object.entries(el?.xvfcgrantplans).length === 0) {
          el["xvfcgrantplansStatus"] = "Not Started";
        } else if (el?.xvfcgrantplans.isDraft == false) {
          el["xvfcgrantplansStatus"] = "Completed";
        } else if (el?.xvfcgrantplans.isDraft == true) {
          el["xvfcgrantplansStatus"] = "In Progress";
        } else if (el?.xvfcgrantplans == "Not Applicable") {
          el["xvfcgrantplansStatus"] = "Not Applicable";
        } else {
        }

        if (Object.entries(el?.xvfcgrantulbforms).length === 0) {
          el["xvfcgrantulbformsStatus"] = "Not Started";
        } else if (el?.xvfcgrantulbforms.isCompleted == true) {
          el["xvfcgrantulbformsStatus"] = "Completed";
        } else if (el?.xvfcgrantulbforms.isCompleted == false) {
          el["xvfcgrantulbformsStatus"] = "In Progress";
        } else if (el?.xvfcgrantulbforms == "Not Applicable") {
          el["xvfcgrantulbformsStatus"] = "Not Applicable";
        }
      });

      if (formName == "utilReport") {
        data.forEach((el) => {
          delete el.masterform;
          delete el?.annualaccount;
          delete el.pfmsaccount;
          delete el.xvfcgrantplans;
          delete el.xvfcgrantulbforms;
        });
      } else if (formName == "pfms") {
        data.forEach((el) => {
          delete el.masterform;
          delete el?.annualaccount;
          delete el.utilizationreport;
          delete el.xvfcgrantplans;
          delete el.xvfcgrantulbforms;
        });
      } else if (formName == "plans") {
        data.forEach((el) => {
          delete el.masterform;
          delete el?.annualaccount;
          delete el.utilizationreport;
          delete el.pfmsaccount;
          delete el.xvfcgrantulbforms;
        });
      } else if (formName == "slb") {
        data.forEach((el) => {
          delete el.masterform;
          delete el?.annualaccount;
          delete el.utilizationreport;
          delete el.pfmsaccount;
          delete el.xvfcgrantplans;
        });
      } else if (formName == "annualaccount") {
        data.forEach((el) => {
          delete el.masterform;
          delete el.xvfcgrantulbforms;
          delete el.utilizationreport;
          delete el.pfmsaccount;
          delete el.xvfcgrantplans;
        });
      }
      return res.status(200).json({
        success: true,
        data: data,
        total: data.length
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
  // console.log(
  //   util.inspect(
  //     {
  //       overall: output1,

  //       annualaccounts: output3,
  //       utilreport: output4,


  //       numbers: numbers,
  //       i: i
  //     },
  //     { showHidden: false, depth: null }
  //   )
  // );
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

    audited_yes = 0



  //overall
  if (output1.length == 0) {
    pendingForSubmission = numbers[i]
  } else {
    output1.forEach((el) => {
      if (el._id.status == "PENDING" && el._id.actionTakenByRole == "ULB" && el._id.isSubmit == true
        || el._id.status == "PENDING" && el._id.actionTakenByRole == "STATE" && el._id.isSubmit == false) {
        underReviewByState = el.count;
      } else if (
        el._id.status === "APPROVED" &&
        el._id.actionTakenByRole === "STATE"
        ||
        (el._id.status === "APPROVED" || el._id.status === "PENDING") &&
        el._id.actionTakenByRole === "MoHUA"

      ) {
        overall_approvedByState = el.count;
      }

      pendingForSubmission =
        numbers[i] - underReviewByState - overall_approvedByState;
    });
  }


  //annualaccounts
  console.log(output3)
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
    util_pendingCompletion =
      numbers[i]
  } else {
    output4.forEach((el) => {
      if (
        el._id.status == "PENDING" && el._id.actionTakenByRole == "ULB" && el._id.isSubmit == true
        || el._id.status == "PENDING" && el._id.actionTakenByRole == "STATE" && el._id.isSubmit == false
      ) {
        util_underStateReview = el.count;
      } else if (
        el._id.status === "APPROVED" &&
        el._id.actionTakenByRole === "STATE"
        ||
        (el._id.status === "APPROVED" || el._id.status === "PENDING") &&
        el._id.actionTakenByRole === "MoHUA"
      ) {
        util_approvedbyState = el.count;
      } else if (
        !el._id.isSubmit &&
        el._id.actionTakenByRole === "ULB" &&
        !el._id.isDraft
      ) {
        util_completedAndPendingSubmission = el.count;
      }

      util_pendingCompletion =
        numbers[i] -
        util_underStateReview -
        util_approvedbyState -
        util_completedAndPendingSubmission;
    });
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
function csvULBReviewData() {
  return (field = {
    ulbName: "ULB name",
    state: "State",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    ulbType: "ULB Type",
    populationType: "Population Type",
    UA: "Name of UA",
    printStatus: "Status"
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
    pfmsaccountStatus: "PFMS Status",
    audited_annualaccountsStatus: "Audited Accounts 2019-2020 Status",
    unaudited_annualaccountsStatus: "Provisional Accounts 2020-2021 Status",
    utilizationreportStatus: "Utilisation Report Status",
    xvfcgrantulbformsStatus: "SLB Status",
    xvfcgrantplansStatus: "Plans for Water Supply and Sanitation Status"

  });
}

function csvTableData() {
  return (field = {
    name: "State",
    totalULBs: "Total ULBs",
    approvedByState: "ULBs Submitted & Approved",
    withState: "ULBs Under Review by State",
    notSubmittedForm: "ULBs Not Submitted Data",
    submittedForm: "Completed & Approved Forms (%)"

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
    let { csv } = req.query
    let allStates;
    // allStates = await getAsync("states");

    // if (!allStates) {
    allStates = await State.find({ "accessToXVFC": true }).select({ _id: 1, name: 1, code: 1 });
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

      allUlbsData.forEach(el => {
        el['submittedForm'] = String(((el['approvedByState'] / el['totalULBs']) * 100).toFixed(2)) + "%"
      })
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

const oneStatePromise = (element, design_year) => {
  return new Promise(async (res, rej) => {
    let data = await Promise.all([
      stateULB(element._id),
      stateAgg(design_year, element._id),
    ]);
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
    let stateULB = await Ulb.find({ state }).count();
    res(stateULB);
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
