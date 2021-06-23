const catchAsync = require("../../util/catchAsync");
const MasterFormData = require("../../models/MasterForm");
const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../service");
const UA = require('../../models/UA')
const moment = require("moment");
const util = require('util');
const { forEach } = require("jszip");
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
          state: ObjectId(user.state)
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
          "isSubmit": 1,
          modifiedAt: "$modifiedAt",
          utilReport: "$steps.utilReport",
          pfmsAccount: "$steps.pfmsAccount",
          plans: "$steps.plans",
          slbForWaterSupplyAndSanitation: "$steps.slbForWaterSupplyAndSanitation",
          annualAccounts: "$steps.annualAccounts"

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
              financialYear: ObjectId(financialYear)
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

module.exports.finalSubmit = catchAsync(async (req, res) => {
  let user = req.decoded;
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role === 'ULB') {
    let data = req.body;
    let design_year = data.design_year;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found"
      })
    }
    let ulb = user.ulb
    data['actionTakenBy'] = ObjectId(user._id);
    data['modifiedAt'] = time();

    let query = {
      "design_year": ObjectId(design_year),
      "ulb": ObjectId(ulb)
    }
    // console.log(data)

    let updatedData = await MasterFormData.findOneAndUpdate(query, data, { new: true })
    if (updatedData) {
      return res.status(200).json({
        success: true,
        message: 'Master Form Updated Successfully!',
        data: data
      })
    } else {
      return res.status(400).json({
        success: false,
        message: 'Master Data Update Failed!'
      })
    }
  } else {
    return res.status(403).json({
      success: false,
      message: user.role + ' Not Authenticated to Perform this Action'
    })
  }

})

module.exports.plansData = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { design_year } = req.params
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
      $match:
      {
        state: ObjectId(state)
      }
    },
    {
      $project:
      {
        "name": 1,
        "totalULBs": { $size: "$ulb" }
      }
    }
  ];

  let count = await UA.aggregate(baseQuery)
  console.log(count)
  let query = [
    {
      $match:
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year)
      }
    },
    {
      $lookup:
      {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulbData"
      }
    },

    { $unwind: "$ulbData" },
    {
      $lookup:
      {
        from: "uas",
        localField: "ulb",
        foreignField: "ulb",
        as: "uaData"
      }
    },

    { $unwind: "$uaData" },


    {
      $project:
      {
        "steps": 1,
        "actionTakenByRole": 1,
        "status": 1,
        "isSubmit": 1,
        "ulb": 1,
        "state": 1,
        "design_year": 1,
        "isUA": "$ulbData.isUA",
        "isMillionPlus": "$ulbData.isMillionPlus",
        "UA": "$uaData.name"

      }
    },
    {
      $match:
      {
        status: "APPROVED"
      }

    },
    {
      $group: {
        _id: "$UA",
        count: { $sum: 1 }
      }

    }
  ]
  let data = await MasterFormData.aggregate(query)
  const finalData = formatPlansData(data, count);
  res.json({
    success: true,
    data: finalData
  })

})

const formatPlansData = (data, count) => {
  let ulbCount = 0,
    plans = 0,
    submissionOfPlans = false,
    UA = '',
    compiledUlbs = 0,
    totalUlbs = 0;
  let finalOutput = [];
  data.forEach(el1 => {
    count.forEach(el2 => {
      if (el1._id == el2.name) {
        compiledUlbs = el1.count;
        totalUlbs = el2?.totalULBs
        ulbCount = (compiledUlbs / totalUlbs) * 100
        let obj = {
          "UA": el1._id,
          "submissionOfPlans": true,
          "plans": 25,
          "ulbCount": parseInt(ulbCount),
          "ulbs": compiledUlbs
        }
        finalOutput.push(obj)
      }

    })
  })

  console.log(finalOutput)

  return finalOutput;
}

module.exports.StateDashboard = catchAsync(async (req, res) => {
  let user = req.decoded;
  // console.log(user)
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "User Not Found",
    });
  }
  if (user.role != 'ULB') {
    let { design_year } = req.params;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    let baseQuery = [
      {
        $match:
        {

          "state": ObjectId(user.state)
        }
      },
      {
        $group:
        {
          _id:
          {
            isUA: "$isUA",
            isMillionPlus: "$isMillionPlus"

          },
          // ulbs: { $addToSet: "$_id" },
          count: { $sum: 1 }
        }
      }
    ]

    let ulbData = await Ulb.aggregate(baseQuery)

    let numbers = calculateTotalNumbers(ulbData);
    console.log(numbers)
    let finalOutput = [];

    for (let i = 0; i < 3; i++) {
      let match, match2;

      if (i == 0) {
        match = {
          $match:
          {
            "isSubmit": true,
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state)
          }
        };
        match2 = {
          $match:
          {
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state)
          }
        }
      } else if (i == 1) {
        match = {
          $match:
          {
            "isSubmit": true,
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state),
            "isUA": "Yes"
          }
        };
        match2 = {
          $match:
          {
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state),
            "isUA": "Yes"
          }
        }
      } else if (i == 2) {
        match = {
          $match:
          {
            "isSubmit": true,
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state),
            "isMillionPlus": "No"
          }
        };
        match2 = {
          $match:
          {
            "design_year": ObjectId(design_year),
            "state": ObjectId(user.state),
            "isMillionPlus": "No"
          }
        }
      }


      let query1 = [
        {
          $lookup:
          {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData"
          }
        },
        {
          $unwind: "$ulbData"
        },
        {
          $project:
          {
            "steps": 1,
            "actionTakenByRole": 1,
            "status": 1,
            "isSubmit": 1,
            "ulb": 1,
            "state": 1,
            "design_year": 1,
            "isUA": "$ulbData.isUA",
            "isMillionPlus": "$ulbData.isMillionPlus"

          }
        },
        match,
        {
          $group: {
            _id:
            {
              status: "$status",
              actionTakenByRole: "$actionTakenByRole"
            },
            count: { $sum: 1 }
          }
        }

      ];

      let query2 = [
        {
          $lookup:
          {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData"
          }
        },
        {
          $unwind: "$ulbData"
        },
        {
          $project:
          {
            "steps": 1,
            "actionTakenByRole": 1,
            "status": 1,
            "isSubmit": 1,
            "ulb": 1,
            "state": 1,
            "design_year": 1,
            "isUA": "$ulbData.isUA",
            "isMillionPlus": "$ulbData.isMillionPlus"

          }
        },
        match,
        {
          $lookup:
          {
            from: "pfmsaccounts",
            localField: "ulb",
            foreignField: "ulb",
            as: "pfms"
          }
        },
        {
          $unwind: "$pfms"
        },

        {
          $group:
          {
            _id: "$pfms.linked",
            count: { $sum: 1 }
          }
        }
      ]

      let query3 = [
        {
          $lookup:
          {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData"
          }
        },
        {
          $unwind: "$ulbData"
        },
        {
          $project:
          {
            "steps": 1,
            "actionTakenByRole": 1,
            "status": 1,
            "isSubmit": 1,
            "ulb": 1,
            "state": 1,
            "design_year": 1,
            "isUA": "$ulbData.isUA",
            "isMillionPlus": "$ulbData.isMillionPlus"

          }
        },
        match,
        {
          $lookup:
          {
            from: "annualaccountdatas",
            localField: "ulb",
            foreignField: "ulb",
            as: "annualaccount"
          }
        },
        { $unwind: "$annualaccount" },
        {
          $project:
          {
            "_id": 0,
            "audit_status": "$annualaccount.audit_status",
            "annualaccount": 1
          }
        },
        {
          $group:
          {
            _id: {
              audit_status: "$audit_status",
              answer: "$annualaccount.submit_annual_accounts.answer"
            },
            count: { $sum: 1 }



          }
        }

      ];

      let query4 = [
        {
          $lookup:
          {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData"
          }
        },
        {
          $unwind: "$ulbData"
        },
        {
          $project:
          {
            "steps": 1,
            "actionTakenByRole": 1,
            "status": 1,
            "isSubmit": 1,
            "ulb": 1,
            "state": 1,
            "design_year": 1,
            "isUA": "$ulbData.isUA",
            "isMillionPlus": "$ulbData.isMillionPlus"

          }
        },
        match2,
        {
          $lookup:
          {
            from: "utilizationreports",
            localField: "ulb",
            foreignField: "ulb",
            as: "utilReportForm"
          }
        },
        { $unwind: "$utilReportForm" },
        {
          $group:
          {
            _id:
            {
              "isSubmit": "$isSubmit",
              "actionTakenByRole": "$actionTakenByRole",
              "isDraft": "$utilReportForm.isDraft",
              "status": "$utilReportForm.status"

            },
            count: { $sum: 1 }


          }
        }

      ]

      let query5 = [
        {
          $lookup:
          {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulbData"
          }
        },
        {
          $unwind: "$ulbData"
        },
        {
          $project:
          {
            "steps": 1,
            "actionTakenByRole": 1,
            "status": 1,
            "isSubmit": 1,
            "ulb": 1,
            "state": 1,
            "design_year": 1,
            "isUA": "$ulbData.isUA",
            "isMillionPlus": "$ulbData.isMillionPlus"

          }
        },
        match2,
        {
          $lookup:
          {
            from: "xvfcgrantulbforms",
            localField: "ulb",
            foreignField: "ulb",
            as: "slbForm"
          }
        },
        { $unwind: "$slbForm" },
        {
          $group:
          {
            _id:
            {
              "isSubmit": "$isSubmit",
              "actionTakenByRole": "$actionTakenByRole",
              "status": "$slbForm.status",
              "isCompleted": "$slbForm.isCompleted"

            },
            count: { $sum: 1 }

          }
        }
      ]

      let { output1, output2, output3, output4, output5 } = await new Promise(async (resolve, reject) => {
        let prms1 = new Promise(async (rslv, rjct) => {
          let output = await MasterFormData.aggregate(query1);

          rslv(output)
        })
        let prms2 = new Promise(async (rslv, rjct) => {
          let output = await MasterFormData.aggregate(query2);

          rslv(output)
        })
        let prms3 = new Promise(async (rslv, rjct) => {
          let output = await MasterFormData.aggregate(query3);

          rslv(output)
        })
        let prms4 = new Promise(async (rslv, rjct) => {
          let output = await MasterFormData.aggregate(query4);

          rslv(output)
        })
        let prms5 = new Promise(async (rslv, rjct) => {
          let output = await MasterFormData.aggregate(query5);

          rslv(output)
        })
        Promise.all([prms1, prms2, prms3, prms4, prms5]).then(outputs => {
          let output1 = outputs[0];
          let output2 = outputs[1];
          let output3 = outputs[2];
          let output4 = outputs[3];
          let output5 = outputs[4];
          if (output1 && output2 && output3 && output4 && output5) {
            resolve({ output1, output2, output3, output4, output5 });
          } else {
            reject({ message: "No Data Found" });
          }
        }, e => {
          reject(e);
        })


      })


      let data = formatOutput(output1, output2, output3, output4, output5, i, numbers);
      finalOutput.push(data)

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
      data: finalOutput
    })



  } else {
    return res.status(403).json({
      success: false,
      message: 'ULB is Not Authorized to Access This API'
    })
  }



})

const calculateTotalNumbers = (data) => {
  let totalUlbs = 0;
  let ulbInMillionPlusUA = 0
  let nonMillionPlusULBs = 0;
  data.forEach(el => {

    totalUlbs = el.count + totalUlbs
    if (el._id.isUA == "Yes") {
      ulbInMillionPlusUA = ulbInMillionPlusUA + el.count
    }
    if (el._id.isMillionPlus == "No") {
      nonMillionPlusULBs = nonMillionPlusULBs + el.count;
    }
  })
  return [totalUlbs, ulbInMillionPlusUA, nonMillionPlusULBs];
}

const formatOutput = (output1, output2, output3, output4, output5, i, numbers) => {
  // console.log(util.inspect({
  //   "overall": output1,
  //   "pfms": output2,
  //   "annualaccounts": output3,
  //   "utilreport": output4,
  //   "slb": output5
  // }, { showHidden: false, depth: null }))
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
    audited_no = 0;

  //overall
  output1.forEach((el) => {



    if (el._id.status == "PENDING" && el._id.actionTakenByRole == "ULB") {
      underReviewByState = el.count;
    } else if (el._id.status === "APPROVED" && el._id.actionTakenByRole === "STATE") {
      overall_approvedByState = el.count;
    }

    pendingForSubmission = numbers[i] - underReviewByState - overall_approvedByState


  })

  //pfms
  output2.forEach((el) => {
    if (el._id === "no") {
      notRegistered = el.count;
    } else if (el._id === "yes")
      registered = el.count;

    pendingResponse = numbers[i] - registered - notRegistered

  })

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
  })
  provisional = ((provisional_yes) / (numbers[i])) * 100
  audited = ((audited_yes) / (numbers[i])) * 100

  //detailed utilization report
  output4.forEach(el => {
    if (el._id.actionTakenByRole === "ULB" && el._id.status === "PENDING" && el._id.isSubmit) {
      util_underStateReview = el.count
    } else if (el._id.actionTakenByRole === "STATE" && el._id.status === "APPROVED" && el._id.isSubmit) {
      util_approvedbyState = el.count
    } else if (!el._id.isSubmit && el._id.actionTakenByRole === "ULB" && !el._id.isDraft) {
      util_completedAndPendingSubmission = el.count
    }

    util_pendingCompletion = numbers[i] - util_underStateReview - util_approvedbyState - util_completedAndPendingSubmission
  })

  output5.forEach(el => {
    if (el._id.actionTakenByRole === "ULB" && el._id.status === "PENDING" && el._id.isSubmit) {
      slb_underStateReview = el.count
    } else if (el._id.actionTakenByRole === "STATE" && el._id.status === "APPROVED" && el._id.isSubmit) {
      slb_approvedbyState = el.count
    } else if (!el._id.isSubmit && el._id.actionTakenByRole === "ULB" && el._id.isCompleted) {
      slb_completedAndPendingSubmission = el.count
    }

    slb_pendingCompletion = numbers[i] - slb_underStateReview - slb_approvedbyState - slb_completedAndPendingSubmission
  })




  let finalOutput = {
    "type": i == 0 ? "allULB" : i == 1 ? "ulbsInMillionPlusUA" : "nonMillionPlusULBs",
    "overallFormStatus": {
      "pendingForSubmission": pendingForSubmission,
      "underReviewByState": underReviewByState,
      "approvedByState": overall_approvedByState
    },
    "annualAccounts": {
      "provisional": parseInt(provisional),
      "audited": parseInt(audited)
    },
    "pfms": {
      "registered": registered,
      "notRegistered": notRegistered,
      "pendingResponse": pendingResponse
    },
    "utilReport": {
      "pendingCompletion": util_pendingCompletion,
      "completedAndPendingSubmission": util_completedAndPendingSubmission,
      "underStateReview": util_underStateReview,
      "approvedbyState": util_approvedbyState
    },
    "slb": {
      "pendingCompletion": slb_pendingCompletion,
      "completedAndPendingSubmission": slb_completedAndPendingSubmission,
      "underStateReview": slb_underStateReview,
      "approvedbyState": slb_approvedbyState
    }
  }

  // console.log(finalOutput)
  return finalOutput;
}

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
