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
      return res.status(200).json({
        success: true,
        message: "Data Found Successfully!",
        response: masterFormData[0],
      });
    }
  }
  let masterFormData = await MasterFormData.findOne(query, "-history");
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
    csv = req.query.csv,
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

    let query = [
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

    let newFilter = await Service.mapFilter(filter);
    let total = undefined;
    let priority = false;

    if (newFilter["status"]) {
      Object.assign(newFilter, statusFilter[newFilter["status"]]);
      if (newFilter["status"] == "2" || newFilter["status"] == "3") {
        delete newFilter["status"];
      }
    }
    if (newFilter && Object.keys(newFilter).length) {
      query.push({ $match: newFilter });
    }
    if (sort && Object.keys(sort).length) {
      query.push({ $sort: sort });
    } else {
      if (priority) {
        sort = {
          $sort: { priority: -1, priority_1: -1, modifiedAt: -1 },
        };
      } else {
        sort = { $sort: { createdAt: -1 } };
      }
      query.push(sort);
    }

    if (csv) {
      let arr = await MasterFormData.aggregate(query).exec();
      for (d of arr) {
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d.status = "Saved as Draft";
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == true &&
          d.actionTakenByUserRole == "ULB"
        ) {
          d.status = "Under Review by State";
        }
        if (
          d.status == "PENDING" &&
          d.isSubmit == false &&
          d.actionTakenByUserRole == "STATE"
        ) {
          d.status = "Under Review by State";
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "STATE") {
          d.status = "Under Review by MoHUA";
        }
        if (
          d.status == "PENDING" &&
          d.actionTakenByUserRole == "STATE" &&
          d.isSubmit == false
        ) {
          d.status = "Under Review by MoHUA";
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "STATE") {
          d.status = "Rejected by STATE";
        }
        if (d.status == "REJECTED" && d.actionTakenByUserRole == "MoHUA") {
          d.status = "Rejected by MoHUA";
        }
        if (d.status == "APPROVED" && d.actionTakenByUserRole == "MoHUA") {
          d.status = "Approval Completed";
        }
      }
      let field = csvData();
      if (user.role == "STATE") {
        delete field.stateName;
      }
      let xlsData = await Service.dataFormating(arr, field);
      let filename =
        "15th-FC-Form" + moment().format("DD-MMM-YY HH:MM:SS") + ".xlsx";
      return res.xls(filename, xlsData);
    } else {
      if (!skip) {
        let qrr = [...query, { $count: "count" }];
        let d = await MasterFormData.aggregate(qrr);
        total = d.length ? d[0].count : 0;
      }
      query.push({ $skip: skip });
      query.push({ $limit: limit });

      let masterFormData = await MasterFormData.aggregate(query).exec();
      for (d of masterFormData) {
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
      if (masterFormData) {
        return res.status(200).json({
          success: true,
          message: "ULB Master Form Data Found Successfully!",
          data: masterFormData,
          total: total,
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
  let user = req.decoded;
  let { design_year } = req.params;
  // console.log(user)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  let state = user.state;
  let baseQuery = [
    {
      $match: {
        state: ObjectId(state),
      },
    },
    {
      $project: {
        name: 1,
        totalULBs: { $size: "$ulb" },
      },
    },
  ];

  let count = await UA.aggregate(baseQuery);
  console.log(count);
  let query = [
    {
      $match: {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
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

    { $unwind: "$ulbData" },
    {
      $lookup: {
        from: "uas",
        localField: "ulb",
        foreignField: "ulb",
        as: "uaData",
      },
    },

    { $unwind: "$uaData" },

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
        UA: "$uaData.name",
      },
    },
    {
      $match: {
        status: "APPROVED",
      },
    },
    {
      $group: {
        _id: "$UA",
        count: { $sum: 1 },
      },
    },
  ];
  let data = await MasterFormData.aggregate(query);
  const finalData = formatPlansData(data, count);
  res.json({
    success: true,
    data: finalData,
  });
});

const formatPlansData = (data, count) => {
  let ulbCount = 0,
    plans = 0,
    submissionOfPlans = false,
    UA = "",
    compiledUlbs = 0,
    totalUlbs = 0;
  let finalOutput = [];
  data.forEach((el1) => {
    count.forEach((el2) => {
      if (el1._id == el2.name) {
        compiledUlbs = el1.count;
        totalUlbs = el2?.totalULBs;
        ulbCount = (compiledUlbs / totalUlbs) * 100;
        let obj = {
          UA: el1._id,
          submissionOfPlans: true,
          plans: 25,
          ulbCount: parseInt(ulbCount),
          ulbs: compiledUlbs,
        };
        finalOutput.push(obj);
      }
    });
  });

  console.log(finalOutput);

  return finalOutput;
};

module.exports.StateDashboard = catchAsync(async (req, res) => {
  let user = req.decoded;
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
          state: ObjectId(user.state),
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

    for (let i = 0; i < 3; i++) {
      let match, match2;

      if (i == 0) {
        match = {
          $match: {
            isSubmit: true,
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
          },
        };
      } else if (i == 1) {
        match = {
          $match: {
            isSubmit: true,
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
            isUA: "Yes",
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
            isUA: "Yes",
          },
        };
      } else if (i == 2) {
        match = {
          $match: {
            isSubmit: true,
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
            isMillionPlus: "No",
          },
        };
        match2 = {
          $match: {
            design_year: ObjectId(design_year),
            state: ObjectId(user.state),
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
              status: "$status",
              actionTakenByRole: "$actionTakenByRole",
            },
            count: { $sum: 1 },
          },
        },
      ];

      let query2 = [
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
            from: "pfmsaccounts",
            localField: "ulb",
            foreignField: "ulb",
            as: "pfms",
          },
        },
        {
          $unwind: "$pfms",
        },

        {
          $group: {
            _id: "$pfms.linked",
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
          $project: {
            _id: 0,
            audit_status: "$annualaccount.audit_status",
            annualaccount: 1,
          },
        },
        {
          $group: {
            _id: {
              audit_status: "$audit_status",
              answer: "$annualaccount.submit_annual_accounts.answer",
            },
            count: { $sum: 1 },
          },
        },
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
          $group: {
            _id: {
              isSubmit: "$isSubmit",
              actionTakenByRole: "$actionTakenByRole",
              isDraft: "$utilReportForm.isDraft",
              status: "$utilReportForm.status",
            },
            count: { $sum: 1 },
          },
        },
      ];

      let query5 = [
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
            from: "xvfcgrantulbforms",
            localField: "ulb",
            foreignField: "ulb",
            as: "slbForm",
          },
        },
        { $unwind: "$slbForm" },
        {
          $group: {
            _id: {
              isSubmit: "$isSubmit",
              actionTakenByRole: "$actionTakenByRole",
              status: "$slbForm.status",
              isCompleted: "$slbForm.isCompleted",
            },
            count: { $sum: 1 },
          },
        },
      ];
      let query6 = [
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
            from: "xvfcgrantplans",
            localField: "ulb",
            foreignField: "ulb",
            as: "plans",
          },
        },
        { $unwind: "$plans" },
        {
          $group: {
            _id: {
              isSubmit: "$isSubmit",
              actionTakenByRole: "$actionTakenByRole",
              status: "$plans.status",
              isDraft: "$plans.isDraft",
            },
            count: { $sum: 1 },
          },
        },
      ];
      let { output1, output2, output3, output4, output5, output6 } = await new Promise(
        async (resolve, reject) => {
          let prms1 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query1);

            rslv(output);
          });
          let prms2 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query2);

            rslv(output);
          });
          let prms3 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query3);

            rslv(output);
          });
          let prms4 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query4);

            rslv(output);
          });
          let prms5 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query5);

            rslv(output);
          });
          let prms6 = new Promise(async (rslv, rjct) => {
            let output = await MasterFormData.aggregate(query6);

            rslv(output);
          });
          Promise.all([prms1, prms2, prms3, prms4, prms5, prms6]).then(
            (outputs) => {
              let output1 = outputs[0];
              let output2 = outputs[1];
              let output3 = outputs[2];
              let output4 = outputs[3];
              let output5 = outputs[4];
              let output6 = outputs[5];
              if (output1 && output2 && output3 && output4 && output5 && output6) {
                resolve({ output1, output2, output3, output4, output5, output6 });
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
        output2,
        output3,
        output4,
        output5,
        output6,
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
    1://Not Started
    {
      masterform: {
      }
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
          "masterform.actionTakenByRole": "ULB"
        },
        {
          "masterform.isSubmit": false,
          "masterform.actionTakenByRole": "STATE",
          "masterform.status": "PENDING"

        }]
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
          "masterform.actionTakenByRole": "MoHUA"

        }
      ]
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
      }
    },
    10: {
      "pfmsaccount.isDraft": "true"
    },
    11: {

      "pfmsaccount.isDraft": false,
      "pfmsaccount.registered": "yes"

    },
    12: {
      $or: [
        {
          "pfmsaccount.isDraft": false,
          "pfmsaccount.registered": "no"
        },
        {
          "pfmsaccount.isDraft": false,
          "pfmsaccount.registered": ""

        }
      ]
    },
    13: {
      audited_annualaccounts: {
        //Not Started
      }

    },
    14: { //In Progress

      "audited_annualaccounts.isDraft": true

    },
    15: { // Not Submitted Accounts

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
      }

    },
    18: { //In Progress

      "unaudited_annualaccounts.isDraft": true

    },
    19: { //Not Submitted Accounts
      "unaudited_annualaccounts.isDraft": false,
      "unaudited_annualaccounts.unAuditedSubmitted": false
    },
    20: { // Submitted Accounts

      "unaudited_annualaccounts.isDraft": false,
      "unaudited_annualaccounts.unAuditedSubmitted": true

    },

    21: {//not started
      utilizationreport: {

      }

    },
    22: {
      "utilizationreport.isDraft": true
    },
    23: {
      "utilizationreport.isDraft": false

    },
    24: {//not started
      xvfcgrantulbforms: {

      }

    },
    25: {

      "xvfcgrantulbforms.isCompleted": false


    },
    26: {

      "xvfcgrantulbforms.isCompleted": true


    },
    30: {
      "xvfcgrantulbforms": "Not Applicable"
    },
    27: {//not started
      xvfcgrantplans: {

      }

    },
    28: {

      "xvfcgrantplans.isDraft": true


    },
    29: {

      "xvfcgrantplans.isDraft": false


    },
    31: {
      "xvfcgrantplans": "Not Applicable"
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
    csv = req.query.csv,
    limit = req.query.limit ? parseInt(req.query.limit) : 50;
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

    let query = [
      {
        $match: {
          state: ObjectId(user.state),
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
            }
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
    let newFilter = await Service.mapFilter(filter);

    if (newFilter["status"] ||
      newFilter["pfmsStatus"] ||
      newFilter["auditedStatus"] ||
      newFilter["unauditedStatus"] ||
      newFilter["utilStatus"] ||
      newFilter["slbStatus"] ||
      newFilter["plansStatus"]) {
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
    if (sort && Object.keys(sort).length) {
      query.push({ $sort: sort });
    }
    console.log(util.inspect(query, false, null));
    let data = await Ulb.aggregate(query);

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
        el['pfmsaccountStatus'] = 'Not Started'
      } else if (el?.pfmsaccount.isDraft == false && el?.pfmsaccount.registered == "no") {
        el['pfmsaccountStatus'] = 'Not Registered'
      } else if (el?.pfmsaccount.isDraft == false && el?.pfmsaccount.registered == "yes") {
        el['pfmsaccountStatus'] = 'Registered'
      } else if (el?.pfmsaccount.isDraft == false && el?.pfmsaccount.registered == "") {
        el['pfmsaccountStatus'] = 'Not Registered'
      } else if (el?.pfmsaccount.isDraft == "true") {
        el['pfmsaccountStatus'] = 'In Progress'
      }

      if (Object.entries(el?.utilizationreport).length === 0) {
        el['utilizationreportStatus'] = 'Not Started'
      } else if (el?.utilizationreport.isDraft == false) {
        el['utilizationreportStatus'] = 'Completed'
      } else if (el?.utilizationreport.isDraft == true) {
        el['utilizationreportStatus'] = 'In Progress'
      }
      if (Object.entries(el?.audited_annualaccounts).length === 0) {
        el['audited_annualaccountsStatus'] = 'Not Started'
      } else if (el?.audited_annualaccounts.isDraft == false && el?.audited_annualaccounts.auditedSubmitted == false) {
        el['audited_annualaccountsStatus'] = 'Accounts Not Submitted'
      } else if (el?.audited_annualaccounts.isDraft == false && el?.audited_annualaccounts.auditedSubmitted == true) {
        el['audited_annualaccountsStatus'] = 'Accounts Submitted'
      } else if (el?.audited_annualaccounts.isDraft == true) {
        el['audited_annualaccountsStatus'] = 'In Progress'
      }
      if (Object.entries(el?.unaudited_annualaccounts).length === 0) {
        el['unaudited_annualaccountsStatus'] = 'Not Started'
      } else if (el?.unaudited_annualaccounts.isDraft == false && el?.unaudited_annualaccounts.unAuditedSubmitted == false) {
        el['unaudited_annualaccountsStatus'] = 'Accounts Not Submitted'
      } else if (el?.unaudited_annualaccounts.isDraft == false && el?.unaudited_annualaccounts.unAuditedSubmitted == true) {
        el['unaudited_annualaccountsStatus'] = 'Accounts Submitted'
      } else if (el?.unaudited_annualaccounts.isDraft == true) {
        el['unaudited_annualaccountsStatus'] = 'In Progress'
      }

      if (Object.entries(el?.xvfcgrantplans).length === 0) {
        el['xvfcgrantplansStatus'] = 'Not Started'
      } else if (el?.xvfcgrantplans.isDraft == false) {
        el['xvfcgrantplansStatus'] = 'Completed'
      } else if (el?.xvfcgrantplans.isDraft == true) {
        el['xvfcgrantplansStatus'] = 'In Progress'
      } else if (el?.xvfcgrantplans == "Not Applicable") {
        el['xvfcgrantplansStatus'] = 'Not Applicable'
      } else {

      }

      if (Object.entries(el?.xvfcgrantulbforms).length === 0) {
        el['xvfcgrantulbformsStatus'] = 'Not Started'
      } else if (el?.xvfcgrantulbforms.isCompleted == true) {
        el['xvfcgrantulbformsStatus'] = 'Completed'
      } else if (el?.xvfcgrantulbforms.isCompleted == false) {
        el['xvfcgrantulbformsStatus'] = 'In Progress'
      } else if (el?.xvfcgrantulbforms == "Not Applicable") {
        el['xvfcgrantulbformsStatus'] = 'Not Applicable'
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
    });

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
  output2,
  output3,
  output4,
  output5,
  output6,
  i,
  numbers
) => {
  console.log(util.inspect({
    "overall": output1,
    "pfms": output2,
    "annualaccounts": output3,
    "utilreport": output4,
    "slb": output5,
    "plans": output6
  }, { showHidden: false, depth: null }))
  let underReviewByState = 0,
    pendingForSubmission = 0,
    overall_approvedByState = 0,
    provisional = 0,
    audited = 0,
    registered = 0,
    notRegistered = 0,
    pendingResponse = 0,
    util_pendingCompletion = 0,
    util_completedAndPendingSubmission = 0,
    util_underStateReview = 0,
    util_approvedbyState = 0,
    slb_pendingCompletion = 0,
    slb_completedAndPendingSubmission = 0,
    slb_underStateReview = 0,
    slb_approvedbyState = 0,
    provisional_yes = 0,
    provisional_no = 0,
    audited_yes = 0,
    audited_no = 0,
    plans_pendingCompletion = 0,
    plans_completedAndPendingSubmission = 0,
    plans_underStateReview = 0,
    plans_approvedbyState = 0;

  //overall
  output1.forEach((el) => {
    if (el._id.status == "PENDING" && el._id.actionTakenByRole == "ULB") {
      underReviewByState = el.count;
    } else if (
      el._id.status === "APPROVED" &&
      el._id.actionTakenByRole === "STATE"
    ) {
      overall_approvedByState = el.count;
    }

    pendingForSubmission =
      numbers[i] - underReviewByState - overall_approvedByState;
  });

  //pfms
  output2.forEach((el) => {
    if (el._id === "no") {
      notRegistered = el.count;
    } else if (el._id === "yes") {
      registered = el.count;
    }

    pendingResponse = numbers[i] - registered - notRegistered;
  });

  //annualaccounts
  output3.forEach((el) => {
    if (el._id.audit_status === "Unaudited" && el._id.answer === "yes") {
      provisional_yes = el.count;
    } else if (el._id.audit_status === "Audited" && el._id.answer === "yes") {
      audited_yes = el.count;
    } else if (el._id.audit_status === "Audited" && el._id.answer === "no") {
      audited_no = el.count;
    } else if (el._id.audit_status === "Unaudited" && el._id.answer === "no") {
      provisional_no = el.count;
    }
  });
  provisional = (provisional_yes / numbers[i]) * 100;
  audited = (audited_yes / numbers[i]) * 100;

  //detailed utilization report
  output4.forEach((el) => {
    if (
      el._id.actionTakenByRole === "ULB" &&
      el._id.status === "PENDING" &&
      el._id.isSubmit
    ) {
      util_underStateReview = el.count;
    } else if (
      el._id.actionTakenByRole === "STATE" &&
      el._id.status === "APPROVED" &&
      el._id.isSubmit
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

  //slb
  output5.forEach((el) => {
    if (
      el._id.actionTakenByRole === "ULB" &&
      el._id.status === "PENDING" &&
      el._id.isSubmit
    ) {
      slb_underStateReview = el.count;
    } else if (
      el._id.actionTakenByRole === "STATE" &&
      el._id.status === "APPROVED" &&
      el._id.isSubmit
    ) {
      slb_approvedbyState = el.count;
    } else if (
      !el._id.isSubmit &&
      el._id.actionTakenByRole === "ULB" &&
      el._id.isCompleted
    ) {
      slb_completedAndPendingSubmission = el.count;
    }

    slb_pendingCompletion =
      numbers[i] -
      slb_underStateReview -
      slb_approvedbyState -
      slb_completedAndPendingSubmission;
  });

  output6.forEach((el) => {
    if (
      el._id.actionTakenByRole === "ULB" &&
      el._id.status === "PENDING" &&
      el._id.isSubmit
    ) {
      plans_underStateReview = el.count;
    } else if (
      el._id.actionTakenByRole === "STATE" &&
      el._id.status === "APPROVED" &&
      el._id.isSubmit
    ) {
      plans_approvedbyState = el.count;
    } else if (
      !el._id.isSubmit &&
      el._id.actionTakenByRole === "ULB" &&
      el._id.isCompleted
    ) {
      plans_completedAndPendingSubmission = el.count;
    }

    plans_pendingCompletion =
      numbers[i] -
      plans_underStateReview -
      plans_approvedbyState -
      plans_completedAndPendingSubmission;
  });


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
    pfms: {
      registered: registered,
      notRegistered: notRegistered,
      pendingResponse: pendingResponse,
    },
    utilReport: {
      pendingCompletion: util_pendingCompletion,
      completedAndPendingSubmission: util_completedAndPendingSubmission,
      underStateReview: util_underStateReview,
      approvedbyState: util_approvedbyState,
    },
    slb: {
      pendingCompletion: slb_pendingCompletion,
      completedAndPendingSubmission: slb_completedAndPendingSubmission,
      underStateReview: slb_underStateReview,
      approvedbyState: slb_approvedbyState,
    },
    plans: {
      pendingCompletion: plans_pendingCompletion,
      completedAndPendingSubmission: plans_completedAndPendingSubmission,
      underStateReview: plans_underStateReview,
      approvedbyState: plans_approvedbyState,
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

function csvData() {
  return (field = {
    state: "State name",
    ulbName: "ULB name",
    ulbType: "ULB Type",
    populationType: "Population Type",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    status: "Status",
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
    data["modifiedAt"] = time();

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
      $set: req.body,
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
    data["modifiedAt"] = time();

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
    }
    let getData = await MasterFormData.findOne(query, { "history": 1 })
    let outputArr = [];
    if (getData) {
      getData['history'].forEach(el => {
        let output = {};

        if (el.actionTakenByRole == 'ULB' && el.status == "PENDING") {
          output['status'] = 'Submitted by ULB';
          output['time'] = el.modifiedAt
        } else if (el.actionTakenByRole == 'STATE' && el.status == "APPROVED") {
          output['status'] = 'Approved By State';
          output['time'] = el.modifiedAt
        } else if (el.actionTakenByRole == 'STATE' && el.status == "REJECTED") {
          output['status'] = 'Rejected By State';
          output['time'] = el.modifiedAt
        } else if (el.actionTakenByRole == 'MoHUA' && el.status == "REJECTED") {
          output['status'] = 'Rejected By MoHUA';
          output['time'] = el.modifiedAt
        } else if (el.actionTakenByRole == 'MoHUA' && el.status == "APPROVED") {
          output['status'] = 'Approved By MoHUA';
          output['time'] = el.modifiedAt
        }

        outputArr.push(output)
      })


      return res.status(200).json({
        success: true,
        message: "Data Fetched Successfully!",
        data: outputArr
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'No Data Found'
      })
    }


  } else {
    return res.status('403').json({
      success: false,
      message: user.role + " Not Authorized to Access this Data"
    })
  }
})
async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
