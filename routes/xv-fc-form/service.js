const Ulb = require("../../models/Ulb");
const UlbFinancialData = require("../../models/UlbFinancialData");
const XVFCGrantULBData = require("../../models/XVFcGrantForm");
const LoginHistory = require("../../models/LoginHistory");
const User = require("../../models/User");
const State = require("../../models/State");
const XVStateForm = require("../../models/XVStateForm");
const Response = require("../../service").response;
const Service = require("../../service");
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");
const { JsonWebTokenError } = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
var AdmZip = require("adm-zip");
const { strict } = require("assert");
const { MongooseDocument, QueryCursor } = require("mongoose");
const dir = "uploads";
const axios = require('axios')
const request = require('request')
const subDir = "/source";
const date = moment().format("DD-MMM-YY");
const catchAsync = require("../../util/catchAsync");
const Year = require("../../models/Year");
const { findOne } = require("../../models/LedgerLog");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const UA = require("../../models/UA");
const util = require("util");
const { isNull } = require("util");
const statusTypes = require('../../util/statusTypes')
const FORM_STATUS = require("../../util/newStatusList");
const SLB28 = require('../../models/TwentyEightSlbsForm')
const IndicatorLineItem = require('../../models/indicatorLineItems')
const {calculateSlbMarks} = require('../Scoring/service')
const MasterForm = require('../../models/MasterForm')
const { calculateStatus} = require('../CommonActionAPI/service')
const TwentyEightSlbForm = require('../../models/TwentyEightSlbsForm');
const PrevLineItem_CONSTANTS = require('../../util/lineItems');
const { years } = require("../../service/years");
const { getKeyByValue } = require("../../util/masterFunctions");
const { MASTER_STATUS_ID, YEAR_CONSTANTS } = require("../../util/FormNames");
const { concatenateUrls } = require("../../service/common");

const BackendHeaderHost ={
  Demo: `${process.env.DEMO_HOST_BACKEND}`,
  Staging: `${process.env.STAGING_HOST}`,
  Prod: `${process.env.PROD_HOST}`,
}
const FrontendHeaderHost ={
  Demo: `${process.env.DEMO_HOST_FRONTEND}`,
  Staging: `${process.env.STAGING_HOST}`,
  Prod: `${process.env.PROD_HOST}`,
}
async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
module.exports.createDir = function (req, res, next) {
  if (!fs.existsSync(dir + subDir + "_" + date)) {
    fs.mkdirSync(dir + subDir + "_" + date);
    console.log("Created subDir", dir + subDir + "_" + date);
  }
  next();
};
module.exports.unzip = async (req, res, next) => {
  let user = req.decoded;
  var destinationPath = req.file.path;
  var zip = new AdmZip(destinationPath);
  var zipEntries = zip.getEntries(); // an array of ZipEntry records
  let error = [];
  fs.unlinkSync(destinationPath);
  for (let zipEntry of zipEntries) {
    let st = zipEntry.entryName.split("/");
    let filename = st[st.length - 1];
    st = st[st.length - 1].split("_");
    let st1 = st[1].split("."); // fetch extension of file
    let resp = st1[0].split("");
    let year = "20" + resp[0] + resp[1] + "-" + resp[2] + resp[3];
    let ulb = await Ulb.findOne({ code: st[0] }, { _id: 1, code: 1 });
    if (ulb) {
      let query = {
        financialYear: year,
        referenceCode: st[0] + "_" + year + "_Audited",
        ulb: ObjectId(ulb._id),
      };
      let ulbFobj = await UlbFinancialData.findOne(query);
      let dataObj = ulbFobj ? ulbFobj : obj();
      dataObj["referenceCode"] = st[0] + "_" + year + "_Audited";
      dataObj["financialYear"] = year;
      dataObj["ulb"] = ObjectId(ulb._id);
      console.log(ulb.code, st1);
      if (st1[1] == "pdf") {
        dataObj["overallReport"]["pdfUrl"] =
          req.protocol +
          "://" +
          req.headers.host +
          "/source_" +
          date +
          "/" +
          filename;
      }
      if (st1[1] == "xlsx") {
        dataObj["overallReport"]["excelUrl"] =
          req.protocol +
          "://" +
          req.headers.host +
          "/source_" +
          date +
          "/" +
          zipEntry.entryName;
      }
      dataObj["actionTakenBy"] = ObjectId(user._id);
      let up = await UlbFinancialData.update(query, dataObj, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      zip.extractEntryTo(
        zipEntry.entryName,
        "uploads/source_" + date + "/",
        false,
        true
      );
    } else {
      error.push(`ulb code: ${st[0]} not exist`);
    }
  }
  res.send({ message: "success", error: error });
};

const obj = () => {
  let obj = {
    tag: "BULKMIGRATION",
    referenceCode: "",
    audited: true,
    financialYear: "",
    completeness: "APPROVED",
    correctness: "APPROVED",
    status: "APPROVED",
    modifiedAt: new Date(),
    createdAt: new Date(),
    isActive: false,
    balanceSheet: {
      completeness: "NA",
      correctness: "NA",
      message: "",
      pdfUrl: "",
      excelUrl: "",
    },
    schedulesToBalanceSheet: {
      completeness: "NA",
      correctness: "NA",
      message: "",
      pdfUrl: "",
      excelUrl: "",
    },
    incomeAndExpenditure: {
      completeness: "NA",
      correctness: "NA",
      message: "",
      pdfUrl: "",
      excelUrl: "",
    },
    schedulesToIncomeAndExpenditure: {
      completeness: "NA",
      correctness: "NA",
      message: "",
      pdfUrl: "",
      excelUrl: "",
    },
    trialBalance: {
      completeness: "NA",
      correctness: "NA",
      message: null,
      pdfUrl: "",
      excelUrl: "",
    },
    auditReport: {
      completeness: "NA",
      correctness: "NA",
      message: null,
      pdfUrl: "",
    },
    ulb: "",
    overallReport: {
      completeness: "APPROVED",
      correctness: "APPROVED",
      message: null,
      pdfUrl: "",
      excelUrl: "",
    },
  };
  return obj;
};

const waterManagementKeys = [
  "serviceLevel",
  "houseHoldCoveredPipedSupply",
  "waterSuppliedPerDay",
  "reduction",
  "houseHoldCoveredWithSewerage",
];
const solidWasteManagementKeys = ["garbageFreeCities", "waterSupplyCoverage"];
const millionPlusCitiesKeys = [
  "cityPlan",
  "waterBalancePlan",
  "serviceLevelPlan",
  "solidWastePlan",
];
const mappingKeys = {
  serviceLevel: "serviceLevel",
  houseHoldCoveredPipedSupply:
    "% of households covered with piped water supply",
  waterSuppliedPerDay: "Water Supplied in litre per day(lpcd)",
  reduction: "Reduction in non-water revenue",
  houseHoldCoveredWithSewerage:
    "% of household covered with sewerage/septage services",
  garbageFreeCities: "Plan for garbage free star rating of the cities",
  waterSupplyCoverage:
    "Plan for coverage of water supply for public/community toilets",
  cityPlan: "City Plan DPR",
  waterBalancePlan: "Water Balance Plan",
  serviceLevelPlan: "Service Level Improvement Plan",
  solidWastePlan: "Solid Waste Management Plan",
};

const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};

module.exports.getSLBDataUAWise = catchAsync(async (req, res) => {
  let user = req.decoded;

  
    let { design_year } = req.params;
    let { ua_id } = req.query;
    if (!ua_id) {
      return res.status(400).json({
        success: false,
        message: "UA Id NOT FOUND"
      })
    }
    if (!design_year) {
      return res.status(404).json({
        success: false,
        message: "Design Year Not Found",
      });
    }
    // let state = user?.state;

    let query1 = [
      {
        $match: {

          _id: ObjectId(ua_id)
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
      {
        $unwind: "$masterformData"
      },

      {
        $match: {
          "masterformData.design_year": ObjectId(design_year),
          $or: [
            {
              $and: [{ "masterformData.actionTakenByRole": "STATE" },
              { "masterformData.isSubmit": true }]
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

      {
        $lookup: {
          from: "xvfcgrantulbforms",
          localField: "masterformData.ulb",
          foreignField: "ulb",
          as: "xvfcformDataApproved"

        }
      },

      {
        $unwind: "$xvfcformDataApproved"
      },
      {

        $match: {
          "xvfcformDataApproved.design_year": ObjectId(design_year)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "xvfcformDataApproved.actionTakenBy",
          foreignField: "_id",
          as: "actionTakenBy"

        }
      },
      { $unwind: "$actionTakenBy" },
      {
        $match: {
          $or: [{
            $and: [{ "actionTakenBy.role": "STATE" },
            { "xvfcformDataApproved.waterManagement.status": "APPROVED" }]
          },

          {
            $and: [{ "actionTakenBy.role": "MoHUA" }, {
              $or: [
                { "xvfcformDataApproved.waterManagement.status": "APPROVED" },
                { "xvfcformDataApproved.waterManagement.status": "PENDING" }]
            }]
          }]


        }
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "xvfcformDataApproved.ulb",
          foreignField: "_id",
          as: "approvedULBs"

        }
      },
      {
        $unwind: "$approvedULBs"
      },
      {
        $project: {
          ua:"$name",
          waterSuppliedPerDay: "$xvfcformDataApproved.waterManagement.waterSuppliedPerDay",
          reduction: "$xvfcformDataApproved.waterManagement.reduction",
          houseHoldCoveredWithSewerage:
            "$xvfcformDataApproved.waterManagement.houseHoldCoveredWithSewerage",
          houseHoldCoveredPipedSupply:
            "$xvfcformDataApproved.waterManagement.houseHoldCoveredPipedSupply",
          ulb: "$approvedULBs",
population:"$approvedULBs.population"
        },
      },
      {
        $project: {
    ua: 1,
          ulbData:  "$ulb" ,
            population:"$population",
          waterSuppliedPerDay2021: {
        
              $convert: {
                input: "$waterSuppliedPerDay.baseline.2021",
                to: "double",
              },
            
          },
          waterSuppliedPerDay2122: {

              $convert: {
                input: "$waterSuppliedPerDay.target.2122",
                to: "double",
              },
           
          },
          waterSuppliedPerDay2223: {
        
              $convert: {
                input: "$waterSuppliedPerDay.target.2223",
                to: "double",
              },
          
          },
          waterSuppliedPerDay2324: {
    
              $convert: {
                input: "$waterSuppliedPerDay.target.2324",
                to: "double",
              },
       
          },
          waterSuppliedPerDay2425: {
        
              $convert: {
                input: "$waterSuppliedPerDay.target.2425",
                to: "double",
              },
         
          },
          reduction2021: {
     
              $convert: { input: "$reduction.baseline.2021", to: "double" },
           
          },
          reduction2122: {
     
              $convert: { input: "$reduction.target.2122", to: "double" },
        
          },
          reduction2223: {
    
              $convert: { input: "$reduction.target.2223", to: "double" },
            
          },
          reduction2324: {
     
              $convert: { input: "$reduction.target.2324", to: "double" },
            
          },
          reduction2425: {
     
              $convert: { input: "$reduction.target.2425", to: "double" },
            
          },
          houseHoldCoveredWithSewerage2021: {
           
              $convert: { input: "$houseHoldCoveredWithSewerage.baseline.2021", to: "double" },
            
          },
          houseHoldCoveredWithSewerage2122: {
      
              $convert: {
                input: "$houseHoldCoveredWithSewerage.target.2122",
                to: "double",
              },
        
          },
          houseHoldCoveredWithSewerage2223: {

              $convert: {
                input: "$houseHoldCoveredWithSewerage.target.2223",
                to: "double",
              },
          
          },
          houseHoldCoveredWithSewerage2324: {
      
              $convert: {
                input: "$houseHoldCoveredWithSewerage.target.2324",
                to: "double",
              },
            
          },
          houseHoldCoveredWithSewerage2425: {
      
              $convert: {
                input: "$houseHoldCoveredWithSewerage.target.2425",
                to: "double",
              },
            
          },
          houseHoldCoveredPipedSupply2021: {
      
              $convert: {
                input: "$houseHoldCoveredPipedSupply.baseline.2021",
                to: "double",
              },
       
          },
          houseHoldCoveredPipedSupply2122: {
       
              $convert: {
                input: "$houseHoldCoveredPipedSupply.target.2122",
                to: "double",
              },
            
          },
          houseHoldCoveredPipedSupply2223: {
         
              $convert: {
                input: "$houseHoldCoveredPipedSupply.target.2223",
                to: "double",
              },
            
          },
          houseHoldCoveredPipedSupply2324: {

              $convert: {
                input: "$houseHoldCoveredPipedSupply.target.2324",
                to: "double",
              },
         
          },
          houseHoldCoveredPipedSupply2425: {
       
              $convert: {
                input: "$houseHoldCoveredPipedSupply.target.2425",
                to: "double",
              },
       
          },

        },


      },
      
      {
          $group:{
         _id:"",
         ua:{$first:"$ua"},
         ulbData:{$addToSet:"$ulbData._id"},
         total:{$sum:1},
                  "waterSuppliedPerDay2021n":{
                      $sum:{$multiply:["$waterSuppliedPerDay2021","$population"]}
                      },
                      "waterSuppliedPerDay2021d":{$sum:"$population"},
                      
                            "waterSuppliedPerDay2122n":{
                      $sum:{$multiply:["$waterSuppliedPerDay2122","$population"]}
                      },
                      "waterSuppliedPerDay2122d":{$sum:"$population"},
                      
                          "waterSuppliedPerDay2223n":{
                      $sum:{$multiply:["$waterSuppliedPerDay2223","$population"]}
                      },
                      "waterSuppliedPerDay2223d":{$sum:"$population"},
                      
                          "waterSuppliedPerDay2324n":{
                      $sum:{$multiply:["$waterSuppliedPerDay2324","$population"]}
                      },
                      "waterSuppliedPerDay2324d":{$sum:"$population"},
                      
                          "waterSuppliedPerDay2425n":{
                      $sum:{$multiply:["$waterSuppliedPerDay2425","$population"]}
                      },
                      "waterSuppliedPerDay2425d":{$sum:"$population"},
                      
                          "reduction2021n":{
                      $sum:{$multiply:["$reduction2021","$population"]}
                      },
                      "reduction2021d":{$sum:"$population"},
                      
                             "reduction2122n":{
                      $sum:{$multiply:["$reduction2122","$population"]}
                      },
                      "reduction2122d":{$sum:"$population"},
                      
                             "reduction2223n":{
                      $sum:{$multiply:["$reduction2223","$population"]}
                      },
                      "reduction2223d":{$sum:"$population"},
                      
                             "reduction2324n":{
                      $sum:{$multiply:["$reduction2324","$population"]}
                      },
                      "reduction2324d":{$sum:"$population"},
                      
                             "reduction2425n":{
                      $sum:{$multiply:["$reduction2425","$population"]}
                      },
                      "reduction2425d":{$sum:"$population"},
                      
                             "houseHoldCoveredWithSewerage2021n":{
                      $sum:{$multiply:["$houseHoldCoveredWithSewerage2021","$population"]}
                      },
                      "houseHoldCoveredWithSewerage2021d":{$sum:"$population"},
                      
                       "houseHoldCoveredWithSewerage2122n":{
                      $sum:{$multiply:["$houseHoldCoveredWithSewerage2122","$population"]}
                      },
                      "houseHoldCoveredWithSewerage2122d":{$sum:"$population"},
                      
                       "houseHoldCoveredWithSewerage2223n":{
                      $sum:{$multiply:["$houseHoldCoveredWithSewerage2223","$population"]}
                      },
                      "houseHoldCoveredWithSewerage2223d":{$sum:"$population"},
                      
                       "houseHoldCoveredWithSewerage2324n":{
                      $sum:{$multiply:["$houseHoldCoveredWithSewerage2324","$population"]}
                      },
                      "houseHoldCoveredWithSewerage2324d":{$sum:"$population"},
                      
                       "houseHoldCoveredWithSewerage2425n":{
                      $sum:{$multiply:["$houseHoldCoveredWithSewerage2425","$population"]}
                      },
                      "houseHoldCoveredWithSewerage2425d":{$sum:"$population"},
                      
                      
                           "houseHoldCoveredPipedSupply2021n":{
                      $sum:{$multiply:["$houseHoldCoveredPipedSupply2021","$population"]}
                      },
                      "houseHoldCoveredPipedSupply2021d":{$sum:"$population"},
                      
                                  "houseHoldCoveredPipedSupply2122n":{
                      $sum:{$multiply:["$houseHoldCoveredPipedSupply2122","$population"]}
                      },
                      "houseHoldCoveredPipedSupply2122d":{$sum:"$population"},
                      
                                  "houseHoldCoveredPipedSupply2223n":{
                      $sum:{$multiply:["$houseHoldCoveredPipedSupply2223","$population"]}
                      },
                      "houseHoldCoveredPipedSupply2223d":{$sum:"$population"},
                      
                                  "houseHoldCoveredPipedSupply2324n":{
                      $sum:{$multiply:["$houseHoldCoveredPipedSupply2324","$population"]}
                      },
                      "houseHoldCoveredPipedSupply2324d":{$sum:"$population"},
                      
                      
                                  "houseHoldCoveredPipedSupply2425n":{
                      $sum:{$multiply:["$houseHoldCoveredPipedSupply2425","$population"]}
                      },
                      "houseHoldCoveredPipedSupply2425d":{$sum:"$population"},

                      
                  }
              
          },
          
          {
              $project:{
                total:1,
                ulbData:1,
                ua:1,
                  waterSuppliedPerDay2021:{
                    '$cond': [
                      { '$eq': [ '$waterSuppliedPerDay2021d', 0 ] },
                      0,
                      { '$divide': [ '$waterSuppliedPerDay2021n', '$waterSuppliedPerDay2021d' ] }
                    ]
                  },
                    waterSuppliedPerDay2122:{
                      '$cond': [
                        { '$eq': [ '$waterSuppliedPerDay2122d', 0 ] },
                        0,
                        { '$divide': [ '$waterSuppliedPerDay2122n', '$waterSuppliedPerDay2122d' ] }
                      ]
                    },
                     
                      waterSuppliedPerDay2223:{
                        '$cond': [
                          { '$eq': [ '$waterSuppliedPerDay2223d', 0 ] },
                          0,
                          { '$divide': [ '$waterSuppliedPerDay2223n', '$waterSuppliedPerDay2223d' ] }
                        ]
                      },
                      
                      
                        waterSuppliedPerDay2324:{
                          '$cond': [
                            { '$eq': [ '$waterSuppliedPerDay2324d', 0 ] },
                            0,
                            { '$divide': [ '$waterSuppliedPerDay2324n', '$waterSuppliedPerDay2324d' ] }
                          ]
                        },
                         
                          waterSuppliedPerDay2425: {
                            '$cond': [
                              { '$eq': [ '$waterSuppliedPerDay2425d', 0 ] },
                              0,
                              { '$divide': [ '$waterSuppliedPerDay2425n', '$waterSuppliedPerDay2425d' ] }
                            ]
                          },
                          
                          
                           reduction2021: {
                            '$cond': [
                              { '$eq': [ '$reduction2021d', 0 ] },
                              0,
                              { '$divide': [ '$reduction2021n', '$reduction2021d' ] }
                            ]
                          },
                            
                    reduction2122:  {
                      '$cond': [
                        { '$eq': [ '$reduction2122d', 0 ] },
                        0,
                        { '$divide': [ '$reduction2122n', '$reduction2122d' ] }
                      ]
                    },
                    
                      reduction2223: {
                        '$cond': [
                          { '$eq': [ '$reduction2223d', 0 ] },
                          0,
                          { '$divide': [ '$reduction2223n', '$reduction2223d' ] }
                        ]
                      },
                       
                        reduction2324:  {
                          '$cond': [
                            { '$eq': [ '$reduction2324d', 0 ] },
                            0,
                            { '$divide': [ '$reduction2324n', '$reduction2324d' ] }
                          ]
                        },
                        
                          reduction2425:  {
                            '$cond': [
                              { '$eq': [ '$reduction2425d', 0 ] },
                              0,
                              { '$divide': [ '$reduction2425n', '$reduction2425d' ] }
                            ]
                          },
                          
                          
                          
                          houseHoldCoveredWithSewerage2021: {
                            '$cond': [
                              { '$eq': [ '$houseHoldCoveredWithSewerage2021d', 0 ] },
                              0,
                              { '$divide': [ '$houseHoldCoveredWithSewerage2021n', '$houseHoldCoveredWithSewerage2021d' ] }
                            ]
                          },
                           
                    houseHoldCoveredWithSewerage2122: {
                      '$cond': [
                        { '$eq': [ '$houseHoldCoveredWithSewerage2122d', 0 ] },
                        0,
                        { '$divide': [ '$houseHoldCoveredWithSewerage2122n', '$houseHoldCoveredWithSewerage2122d' ] }
                      ]
                    },
                     
                     houseHoldCoveredWithSewerage2223: {
                      '$cond': [
                        { '$eq': [ '$houseHoldCoveredWithSewerage2223d', 0 ] },
                        0,
                        { '$divide': [ '$houseHoldCoveredWithSewerage2223n', '$houseHoldCoveredWithSewerage2223d' ] }
                      ]
                    },
                      
                       houseHoldCoveredWithSewerage2324:  {
                        '$cond': [
                          { '$eq': [ '$houseHoldCoveredWithSewerage2324d', 0 ] },
                          0,
                          { '$divide': [ '$houseHoldCoveredWithSewerage2324n', '$houseHoldCoveredWithSewerage2324d' ] }
                        ]
                      },
                       
                         houseHoldCoveredWithSewerage2425:  {
                          '$cond': [
                            { '$eq': [ '$houseHoldCoveredWithSewerage2425d', 0 ] },
                            0,
                            { '$divide': [ '$houseHoldCoveredWithSewerage2425n', '$houseHoldCoveredWithSewerage2425d' ] }
                          ]
                        },
                         
                         
houseHoldCoveredPipedSupply2021: {
  '$cond': [
    { '$eq': [ '$houseHoldCoveredPipedSupply2021d', 0 ] },
    0,
    { '$divide': [ '$houseHoldCoveredPipedSupply2021n', '$houseHoldCoveredPipedSupply2021d' ] }
  ]
},
 
houseHoldCoveredPipedSupply2122: {
  '$cond': [
    { '$eq': [ '$houseHoldCoveredPipedSupply2122d', 0 ] },
    0,
    { '$divide': [ '$houseHoldCoveredPipedSupply2122n', '$houseHoldCoveredPipedSupply2122d' ] }
  ]
},

houseHoldCoveredPipedSupply2223: {
  '$cond': [
    { '$eq': [ '$houseHoldCoveredPipedSupply2223d', 0 ] },
    0,
    { '$divide': [ '$houseHoldCoveredPipedSupply2223n', '$houseHoldCoveredPipedSupply2223d' ] }
  ]
},

houseHoldCoveredPipedSupply2324: {
  '$cond': [
    { '$eq': [ '$houseHoldCoveredPipedSupply2324d', 0 ] },
    0,
    { '$divide': [ '$houseHoldCoveredPipedSupply2324n', '$houseHoldCoveredPipedSupply2324d' ] }
  ]
},

houseHoldCoveredPipedSupply2425: {
  '$cond': [
    { '$eq': [ '$houseHoldCoveredPipedSupply2425d', 0 ] },
    0,
    { '$divide': [ '$houseHoldCoveredPipedSupply2425n', '$houseHoldCoveredPipedSupply2425d' ] }
  ]
},

                          
                          
                          
                  
                  }
              }

    ]

    let query2 = [
      {

        $match: {
          _id: ObjectId(ua_id)
        },
      },
      {
        $unwind: "$ulb"
      },

      {
        $lookup: {
          from: "masterforms",
          localField: "ulb",
          foreignField: "ulb",
          as: "masterformData"
        }
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
          $or: [
            { "masterformData.design_year": ObjectId(design_year) },
            { masterformData: { $exists: false } }
          ]
        }
      },

      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb"

        }
      },
      { $unwind: "$ulb" }



    ]


    let { output1, output2 } = await new Promise(async (resolve, reject) => {
      let prms1 = new Promise(async (rslv, rjct) => {
        console.log(util.inspect(query1, { showHidden: false, depth: null }))
        
        let output = await UA.aggregate(query1);

        if (output.length > 0) {
          console.log('1')
          // console.log(util.inspect(output, { showHidden: false, depth: null }))
          rslv(output);

        } else {
          rjct({ message: "DATA NOT FOUND" });
        }
      });
      let prms2 = new Promise(async (rslv, rjct) => {
        console.log(util.inspect(query2, { showHidden: false, depth: null }))
        
        let output = await UA.aggregate(query2);
        let ulbA = []
        let ulbB = []
        let ulbC = []
        if (output.length > 0) {
          console.log("4");
          let outputTemplate = {
            pendingCompletion: ulbA,
            completedAndpendingSubmission: ulbB,
            underStateReview: ulbC,

          }
          output.forEach(el => {
            if (!el.hasOwnProperty('masterformData')) {
              ulbA.push({
                name: el.ulb.name,
                censusCode: el.ulb.censusCode,
                sbCode: el.ulb.sbCode
              })
            } else {
              if (el.masterformData.steps.slbForWaterSupplyAndSanitation.isSubmit == null) {
                ulbA.push({
                  name: el.ulb.name,
                  censusCode: el.ulb.censusCode,
                  sbCode: el.ulb.sbCode
                })
              } else if (
                el.masterformData.steps.slbForWaterSupplyAndSanitation.isSubmit
                &&
                el.masterformData.actionTakenByRole == 'ULB'
                &&
                !el.masterformData.isSubmit
              ) {
                ulbB.push({
                  name: el.ulb.name,
                  censusCode: el.ulb.censusCode,
                  sbCode: el.ulb.sbCode
                })
              } else if (
                (el.masterformData.isSubmit && el.masterformData.actionTakenByRole == 'ULB') ||
                (!el.masterformData.isSubmit && el.masterformData.actionTakenByRole == 'STATE')

              ) {
                ulbC.push({
                  name: el.ulb.name,
                  censusCode: el.ulb.censusCode,
                  sbCode: el.ulb.sbCode
                })
              }
            }
          })
          console.log(util.inspect(outputTemplate, { showHidden: false, depth: null }))
          rslv(outputTemplate);
        } else {
          rjct({ message: "DATA NOT FOUND" });
          console.log("5");
        }
      });

      Promise.all([prms1, prms2]).then(
        (outputs) => {
          let output1 = outputs[0];

          let output2 = outputs[1];

          if (output1 && output2) {
            resolve({ output1, output2 });
          } else {
            reject({ message: "No Data Found" });
          }
        },
        (e) => {
          reject(e);
        }
      );
    });

    // let ulbData = extractUlbData(output2);
    makeNumbersFixed(output1[0]);
    let finalOutput = [...output1, output2]; 
    return res.status(200).json({
      success: true,
      message: "Data Found Successfully",
      data: finalOutput,
    });
  
});

extractUlbData = (arr2) => {
  let approved = [];
  let pending = [];
  let output = {};
  // console.log(util.inspect(arr2, false, null))
  arr2.forEach((el) => {
    if (el._id.status == "APPROVED") {
      approved.push(el.ulbData);
    } else if (el._id.status == "PENDING") {
      pending.push(el.ulbData);
    }
  });

  output["pending"] = pending;
  output["approved"] = approved;
  console.log(util.inspect(output, false, null));
  // console.log(output);
};


module.exports.create = catchAsync(async (req, res) => {
  let user = req.decoded;
  let data = req.body;
  if (user.role == "ULB") {
    let design_year = data.design_year;
    if (!design_year) {
      return res.status(400).json({
        success: false,
        message: "Design Year Not Found!",
      });
    }
    let ulb = await Ulb.findOne({ _id: user.ulb }, "_id name code").lean();
    if (!ulb) {
      return Response.BadRequest(res, {}, `Ulb not found.`);
    }
    // if (data?.water_index && (!data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url || data?.waterPotability?.documents?.waterPotabilityPlan[0]?.url === "")) {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Must Submit Water Potability Plan (PDF Format)'
    //     })
    // } else if (!data?.water_index && (data?.waterPotability?.documents?.waterPotabilityPlan[0].url)) {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Water Potability Plan Cannot be Submitted.'
    //     })
    // }

    data.ulb = user.ulb;
    // req.body["createdAt"] = time();
    data.modifiedAt = new Date();
    data.actionTakenBy = ObjectId(user._id);
    let ulbUpdateRequest = new XVFCGrantULBData(data);
    /**Now**/
    let query = {};
    req.body["overallReport"] = null;
    if (!req.body["blank"]) {
      req.body["status"] = "PENDING";
    } else {
      req.body["status"] = "N/A";
    }
    
    query["ulb"] = ObjectId(data.ulb);

    if (design_year && design_year != "") {
      Object.assign(query, { design_year: ObjectId(design_year) });
    }
    let decade = "20"
    let targetYears = Object.keys(req?.body?.waterManagement?.waterSuppliedPerDay?.target).map((item)=>{
      return (years[`${decade}${item.substring(0,2)}-${item.substring(2,item.length)}`])
    } )
    if(targetYears){
      req.body.accessibleForYears = targetYears
    }

    let ulbData = await XVFCGrantULBData.findOne(query);
    if (ulbData && !data.isOldForm) {
      req.body.actionTakenByRole = user.role
      req.body["history"] = [...ulbData.history];
      ulbData.history = undefined;
      req.body["history"].push(ulbData);
    }
    if (ulbData && ulbData.status == "PENDING" && data.isOldForm) {
      if (ulbData.isCompleted) {
        return Response.BadRequest(res, {}, `Form is already submitted`);
      }
    }
    
    if (ulbData && ulbData.isCompleted == true && data.isOldForm) {
      req.body["history"] = [...ulbData.history];
      ulbData.history = undefined;
      req.body["history"].push(ulbData);
    }
    Service.put(
      query,
      req.body,
      XVFCGrantULBData,
      async function (response, value) {
        if (response) {
          let ulbData = await XVFCGrantULBData.findOne(query);
          if (!ulbData?.isOldForm) {
            await UpdateMasterSubmitForm(req, "slbForWaterSupplyAndSanitation");
          }
          if (ulbData.isOldForm) {
            if (ulbData.isCompleted) {
              let email =
                await Service.emailTemplate.sendFinancialDataStatusEmail(
                  ulbData._id,
                  "UPLOAD"
                );
            }
          }
          /* Checking if the ulbData object is not null and if the isCompleted property is true.
            then update 22-23 28slb form with latest values  
          */
          if(ulbData?.isCompleted){
            query.design_year = design_year_2223;
            let slb28Form = await TwentyEightSlbForm.findOne(query).lean();
            if (slb28Form) {
              let slb28FormStatus = calculateStatus(
                slb28Form.status,
                slb28Form.actionTakenByRole,
                slb28Form.isDraft,
                "ULB"
              );

              /* Checking if the form status is in progress, rejected by MoHUA or rejected by state. */
              if (
                [
                  FORM_STATUS.In_Progress,
                  FORM_STATUS.Rejected_By_MoHUA,
                  FORM_STATUS.Rejected_By_State,
                  FORM_STATUS.STATE_REJECTED
                ].includes(slb28FormStatus)
              ) {
                slb28Form["data"].forEach((element) => {
                  /* Checking if the element is equal to the previous line item. */
                  if (
                    element["indicatorLineItem"].toString() ===
                    PrevLineItem_CONSTANTS[
                      "Coverage of water supply connections"
                    ]
                  ) {
                    element.target_1.value = ulbData?.waterManagement
                      .houseHoldCoveredPipedSupply.target["2223"]
                      ? Number(
                          ulbData?.waterManagement.houseHoldCoveredPipedSupply
                            ?.target["2223"]
                        )
                      : "";
                  }
                  if (
                    element["indicatorLineItem"].toString() ===
                    PrevLineItem_CONSTANTS["Per capita supply of water(lpcd)"]
                  ) {
                    element.target_1.value = ulbData?.waterManagement
                      .waterSuppliedPerDay.target["2223"]
                      ? Number(
                          ulbData?.waterManagement.waterSuppliedPerDay?.target[
                            "2223"
                          ]
                        )
                      : "";
                  }
                  if (
                    element["indicatorLineItem"].toString() ===
                    PrevLineItem_CONSTANTS["Extent of non-revenue water (NRW)"]
                  ) {
                    element.target_1.value = ulbData?.waterManagement.reduction
                      .target["2223"]
                      ? Number(
                          ulbData?.waterManagement.reduction?.target["2223"]
                        )
                      : "";
                  }
                  if (
                    element["indicatorLineItem"].toString() ===
                    PrevLineItem_CONSTANTS[
                      "Coverage of waste water network services"
                    ]
                  ) {
                    element.target_1.value = ulbData?.waterManagement
                      .houseHoldCoveredWithSewerage.target["2223"]
                      ? Number(
                          ulbData?.waterManagement.houseHoldCoveredWithSewerage
                            ?.target["2223"]
                        )
                      : "";
                  }
                });
              }
              let slb28UpdatedForm = await TwentyEightSlbForm.findOneAndUpdate(
                query,
                {
                  $set: {
                    data: slb28Form["data"],
                  },
                }
              ).lean();
            }
            await update28SlbForms(ulbData)
          }
          return res.status(response ? 200 : 400).send(value);
        } else {
          return Response.DbError(res, err, "Failed to create entry");
        }
      }
    );
  } else {
    return Response.BadRequest(res, {}, "This action is only allowed by ULB");
  }
});

const design_year_2122 = ObjectId("606aaf854dff55e6c075d219") 
const design_year_2223 = ObjectId("606aafb14dff55e6c075d3ae")
module.exports.get = catchAsync(async (req, res) => {
  let user = req.decoded,
    filter = req.body.filter,
    sort = req.body.sort,
    skip = req.query.skip ? parseInt(req.query.skip) : 0,
    limit = req.query.limit ? parseInt(req.query.limit) : 50,
    design_year = req.query?.design_year,
    { ulb } = req.params,
    actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE", "ULB"];
    let role = req.decoded.role
let from = req.query?.from
if(!ulb){
  ulb = req.decoded.ulb
}
let ulbData = await Ulb.findOne({_id: ObjectId(ulb)}).lean();
  if (!design_year || design_year === "") {
    return res.status(400).json({
      success: false,
      message: "Design Year Not Found!",
    });
  }
  if(from == "2223"){
    let host = "";
    host = req.headers.host
    /* Checking if the host is the same as the backend host. If it is, then it sets the host to the
    frontend host. */
    if (req.headers.host === BackendHeaderHost.Demo) {
      host = FrontendHeaderHost.Demo;
    }
    /* Checking if the host is empty, if it is, it will set the host to the req.headers.host. */
    req.headers.host = host !== "" ? host : req.headers.host;
    const masterFormData = await MasterForm.findOne({
      ulb: ulb,
      design_year: design_year_2122,
    }).lean();
    /* The above code is checking the status of the form. If the status is not in the list of statuses,
    it will return a message. */
    if (masterFormData) {
      let status = calculateStatus(
        masterFormData.status,
        masterFormData.actionTakenByRole,
        !masterFormData.isSubmit,
        "ULB"
      );
      /* Checking the status of the form. If the status is not in the list of statuses, it will
        return a message. */
      if (
        ![
          FORM_STATUS.Under_Review_By_MoHUA,
          FORM_STATUS.Approved_By_MoHUA,
          FORM_STATUS.Approved_By_State,
        ].includes(status)
      ) {
        return res.status(400).json({
          status: true,
          show: true,
          message: `Your Previous Year's form status is - ${
            status ? status : "Not Submitted"
          }. Kindly submit form for previous year at - <a href =https://${host}/ulbform/ulbform-overview target="_blank">Click here</a> in order to submit form`,
        });
      }
    } else {
      return res.status(400).json({
        status: true,
        show: true,
        message: `Your Previous Year's form status is - "Not Submitted". Kindly submit form for previous year at - <a href =https://${host}/ulbform/ulbform-overview target="_blank">Click here</a> in order to submit form`,
      });
    }
    const lineItems = await IndicatorLineItem.find({
      isPartOfSLB : true
    }).select("_id").lean()
    const lineItemIDs = []
     lineItems.forEach(el=> {
      lineItemIDs.push(el._id)
    })
    let userData = await User.findOne({isNodalOfficer: true, state:ulbData.state })
let slbData = await XVFCGrantULBData.findOne({
  design_year: design_year_2122,
  ulb: ObjectId(ulb),
}).lean()
let status =""

if(!slbData){

  return res.status(400).json({
    success: false,
    status: true,
    show: true,
     message: role == "ULB" ? `Dear User, Your previous Year's form status is - ${status ? status : 'Not Submitted'} .Kindly submit SLBs Form for the previous year at - <a href=https://${req.headers.host}/ulbform/ulbform-overview target="_blank">Click Here!</a> in order to submit this year's form . ` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to mark your response once the ULB Submits this form. `
  })
}
status = slbData['waterManagement']['status']
let twoEightSlbData = await SLB28.findOne({
  design_year: design_year_2223,
  ulb: ObjectId(ulb),

}).lean();
let twoEightSlbDataStatus;
if(twoEightSlbData){
  twoEightSlbDataStatus = calculateStatus(twoEightSlbData.status, twoEightSlbData.actionTakenByRole,twoEightSlbData.isDraft,
   "ULB")
}
if(twoEightSlbData && [FORM_STATUS.Under_Review_By_MoHUA, FORM_STATUS.Approved_By_MoHUA,
].includes(twoEightSlbDataStatus)){
  let allData = twoEightSlbData['data'];
  // let filteredData = allData.filter(el => {
  //   if (lineItemIDs.includes(el.indicatorLineItem))
  //   return el
    
  // })
  for(let key in slbData['waterManagement']){
   let value = {}
    if(key == "houseHoldCoveredPipedSupply"){
value = allData.filter(el => {
  return( el.indicatorLineItem.toString() == "6284d6f65da0fa64b423b53a")
})
      Object.assign( slbData['waterManagement'][key], {
        "achieved": {
          "2122":String(value[0]['actual']['value'])
        }
      })
     
    }else if(key == "waterSuppliedPerDay"){
      value = allData.filter(el => {
        return el.indicatorLineItem.toString() == "6284d6f65da0fa64b423b53c"
      })
            Object.assign( slbData['waterManagement'][key], {
              "achieved": {
                "2122":String(value[0]['actual']['value'])
              }
            })

    }else if(key == "reduction"){
      value = allData.filter(el => {
        return el.indicatorLineItem.toString() ==  "6284d6f65da0fa64b423b540"
      })
            Object.assign( slbData['waterManagement'][key], {
              "achieved": {
                "2122":String(value[0]['actual']['value'])
              }
            })
    }else if(key == "houseHoldCoveredWithSewerage"){
      value = allData.filter(el => {
        return el.indicatorLineItem.toString() == "6284d6f65da0fa64b423b52a"
      })
            Object.assign( slbData['waterManagement'][key], {
              "achieved": {
                "2122":String(value[0]['actual']['value'])
              }
            })
    }
  }
  //calculateScore
  let scores =  []
  scores = calculateSlbMarks(slbData.waterManagement)
  for(let key in slbData['waterManagement']){
    let value = {}
     if(key == "houseHoldCoveredPipedSupply"){
 
       Object.assign( slbData['waterManagement'][key], {
         "score": {
           "2122":scores[3]
         }
       })
      
     }else if(key == "waterSuppliedPerDay"){
      
             Object.assign( slbData['waterManagement'][key], {
               "score": {
                 "2122":scores[0]
               }
             })
 
     }else if(key == "reduction"){
   
             Object.assign( slbData['waterManagement'][key], {
               "score": {
                 "2122":scores[1]
               }
             })
     }else if(key == "houseHoldCoveredWithSewerage"){
     
             Object.assign( slbData['waterManagement'][key], {
               "score": {
                 "2122":scores[2]
               }
             })
     }
   }
  return res.status(200).json({
    success: true,
    data: [slbData],
    message:""
  })
}else{

 return res.status(400).json({
    success: true,
    data: [slbData],
    status: true,
    show: true,
    message: role == "ULB" ? `Dear User, Your 28 SLBs form status is - ${twoEightSlbDataStatus ? twoEightSlbDataStatus : 'Not Submitted'}. Kindly submit 28 SLBs Form at - <a href=https://${req.headers.host}/ulbform2223/28SLBsForm target="_blank">Click Here!</a> in order to submit this year's form. ` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to view this form once ULB's previous year SLBs for Water Supply and Sanitation and this year's 28 SLBs form is APPROVED by State or MoHUA. `
  })
}
  }
  if (user.role != "ULB" && ulb) {
    let query = {
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
    };
    let output = [];
    try {
      let data = await XVFCGrantULBData.findOne(query)
        .populate([
          {
            path: "ulb",
            select: "_id name code state",
            populate: {
              path: "state",
              select: "_id name code",
            },
          },
          {
            path: "actionTakenBy",
            select: "_id name email role",
          },
        ])
        .populate([
          {
            path: "history.actionTakenBy",
            model: User,
            select: "_id name email role",
          },
          {
            path: "history.ulb",
            select: "_id name code state",
            populate: {
              path: "state",
              select: "_id name code",
            },
          },
        ])
        .lean()
        .exec();

      if (design_year != "606aadac4dff55e6c075c507") {
        if (
          req.decoded.role === "MoHUA" &&
          data.actionTakenByRole === "STATE" &&
          data.waterManagement.status == "APPROVED"
        ) {
          data.waterManagement.status = "PENDING";
          data.waterManagement.rejectReason = null;
        }
      }
      output.push(data);

      return Response.OK(res, output, "Request fetched.");
    } catch (e) {
      console.log("Exception:", e);
      return Response.DbError(res, e, e.message);
    }
  }
  if (actionAllowed.indexOf(user.role) > -1) {
    if (req.query._id) {
      try {
        let query = { _id: ObjectId(req.query._id) };

        let data = await XVFCGrantULBData.findOne(query)
          .populate([
            {
              path: "ulb",
              select: "_id name code state",
              populate: {
                path: "state",
                select: "_id name code",
              },
            },
            {
              path: "actionTakenBy",
              select: "_id name email role",
            },
          ])
          .populate([
            {
              path: "history.actionTakenBy",
              model: User,
              select: "_id name email role",
            },
            {
              path: "history.ulb",
              select: "_id name code state",
              populate: {
                path: "state",
                select: "_id name code",
              },
            },
          ])
          .lean()
          .exec();
        // if (data.length == 0) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'No Data Found'
        //     })
        // }
        return Response.OK(res, data, "Request fetched.");
      } catch (e) {
        console.log("Exception:", e);
        return Response.DbError(res, e, e.message);
      }
    } else {
      let ulbs;
      if (user.role == "STATE") {
        try {
          let stateId = ObjectId(user.state);
          ulbs = await Ulb.distinct("_id", { state: stateId });
        } catch (e) {
          console.log("Exception:", e);
          return Response.DbError(res, e, e.message);
        }
      } else if (user.role == "ULB") {
        ulbs = [ObjectId(user.ulb)];
      }
      try {
        let query = ulbs ? { ulb: { $in: ulbs } } : {};
        if (design_year && design_year != "") {
          Object.assign(query, { design_year: ObjectId(design_year) });
        }

        let total = undefined;
        if (filter) {
          for (key in filter) {
            if (
              (typeof filter[key] == "string" && filter[key]) ||
              typeof filter[key] == "boolean"
            ) {
              query[key] =
                typeof filter[key] == "string"
                  ? { $regex: filter[key] }
                  : filter[key];
            }
          }
        }

        if (!skip) {
          total = await XVFCGrantULBData.count(query);
        }

        let data = await XVFCGrantULBData.find(query)
          .sort(sort ? sort : { modifiedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate([
            {
              path: "ulb",
              select: "_id name code state",
              populate: {
                path: "state",
                select: "_id name code",
              },
            },
            {
              path: "actionTakenBy",
              select: "_id name email role",
            },
          ])
          .populate([
            {
              path: "history.actionTakenBy",
              model: User,
              select: "_id name email role",
            },
            {
              path: "history.ulb",
              select: "_id name code state",
              populate: {
                path: "state",
                select: "_id name code",
              },
            },
          ])
          .lean()
          .exec();

        // if (data.length == 0) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'No Data Found'
        //     })
        // }
        for (s of data) {
          // s["status"] = getStatus(s);
        }

        return res.status(200).json({
          success: true,
          message: "data",
          total: total,
          data: data,
        });
      } catch (e) {
        console.log("Exception:", e);
        return Response.DbError(res, e, e.message);
      }
      function getStatus() {
        if (s.correctness == "PENDING" && s.completeness == "PENDING") {
          return "PENDING";
        } else if (
          s.correctness == "APPROVED" &&
          s.completeness == "APPROVED"
        ) {
          return "APPROVED";
        } else if (s.completeness == "PENDING") {
          return "PENDING";
        } else if (s.correctness == "PENDING") {
          return "PENDING";
        } else {
          return "REJECTED";
        }
      }
    }
  } else {
    return Response.BadRequest(res, {}, "Action not allowed.");
  }
});

module.exports.slbDownload = catchAsync(async (req, res) => {
  let filename = "SLB-Report.csv";

  res.setHeader("Content-disposition", "attachment; filename=" + filename)
  res.flushHeaders();
  let headers = [
    'Design Year',
    'ULB Name',
    'ULB Code',
    'State',
    'SLB Form Status',

    'Water supplied in litre per capita per day(lpcd)* - Actual Indicator 2020-21',
    'Water supplied in litre per capita per day(lpcd)* - Actual Indicator 2021-22',
    'Water supplied in litre per capita per day(lpcd)* - Actual Indicator 2022-23',
    'Water supplied in litre per capita per day(lpcd)* - Actual Indicator 2023-24',
    'Water supplied in litre per capita per day(lpcd)* - Actual Indicator 2024-25',

    '% of Non-revenue water * - Actual Indicator 2020-21',
    '% of Non-revenue water * - Actual Indicator 2021-22',
    '% of Non-revenue water * - Actual Indicator 2022-23',
    '% of Non-revenue water * - Actual Indicator 2023-24',
    '% of Non-revenue water * - Actual Indicator 2024-25',

    '% of households covered with sewerage/septage services * - Actual Indicator 2020-21',
    '% of households covered with sewerage/septage services * - Actual Indicator 2021-22',
    '% of households covered with sewerage/septage services * - Actual Indicator 2022-23',
    '% of households covered with sewerage/septage services * - Actual Indicator 2023-24',
    '% of households covered with sewerage/septage services * - Actual Indicator 2024-25',

    '% of households covered with piped water supply * - Actual Indicator 2020-21',
    '% of households covered with piped water supply * - Actual Indicator 2021-22',
    '% of households covered with piped water supply * - Actual Indicator 2022-23',
    '% of households covered with piped water supply * - Actual Indicator 2023-24',
    '% of households covered with piped water supply * - Actual Indicator 2024-25'
  ];
  let headersKey = [
    'design_year.year',
    'ulb.name',
    'ulb.code',
    'ulb.state.name',
    'status',

    'waterManagement.waterSuppliedPerDay.baseline.2021',
    'waterManagement.waterSuppliedPerDay.target.2122',
    'waterManagement.waterSuppliedPerDay.target.2223',
    'waterManagement.waterSuppliedPerDay.target.2324',
    'waterManagement.waterSuppliedPerDay.target.2425',

    'waterManagement.reduction.baseline.2021',
    'waterManagement.reduction.target.2122',
    'waterManagement.reduction.target.2223',
    'waterManagement.reduction.target.2324',
    'waterManagement.reduction.target.2425',

    'waterManagement.houseHoldCoveredWithSewerage.baseline.2021',
    'waterManagement.houseHoldCoveredWithSewerage.target.2122',
    'waterManagement.houseHoldCoveredWithSewerage.target.2223',
    'waterManagement.houseHoldCoveredWithSewerage.target.2324',
    'waterManagement.houseHoldCoveredWithSewerage.target.2425',

    'waterManagement.houseHoldCoveredPipedSupply.baseline.2021',
    'waterManagement.houseHoldCoveredPipedSupply.target.2122',
    'waterManagement.houseHoldCoveredPipedSupply.target.2223',
    'waterManagement.houseHoldCoveredPipedSupply.target.2324',
    'waterManagement.houseHoldCoveredPipedSupply.target.2425'
  ];
  try {
    const cursor = await XVFCGrantULBData.find({},{waterManagement : 1,status : 1,actionTakenByRole : 1})
    .populate([
      {
        path: "ulb",
        select: "_id name code state",
        populate: {
          path: "state",
          select: "_id name code",
        },
      },
      {
        path: "design_year",
        select: "year"
      }
    ]);
    let mainArr = [];
    if(cursor.length > 0){
      new Promise(async (resolve,reject) => {
        await cursor.forEach(async (result) => {
          let arr = [];
          for (resData of headersKey) {
            if(resData == 'status'){
              if (result.actionTakenByRole == "ULB") {
                arr.push(FORM_STATUS.In_Progress);
              } else if (result.actionTakenByRole == "ULB") {
                arr.push(FORM_STATUS.Submitted);
              } else if (result.actionTakenByRole == "STATE") {
                arr.push(FORM_STATUS.Under_Review_By_State);
              } else if (result.actionTakenByRole == "STATE") {
                if (result.status == "APPROVED") {
                  arr.push(FORM_STATUS.Approved_By_State);
                } else if (result.status == "REJECTED") {
                  arr.push(FORM_STATUS.Rejected_By_State);
                }
              } else if (result.actionTakenByRole == "MoHUA") {
                arr.push(FORM_STATUS.Under_Review_By_MoHUA);
              } else if (result.actionTakenByRole == "MoHUA") {
                if (result.status == "APPROVED") {
                  arr.push(FORM_STATUS.Approved_By_MoHUA);
                } else if (result.status == "REJECTED") {
                  arr.push(FORM_STATUS.Rejected_By_MoHUA);
                }
              }else{
                arr.push("NA");
              }
            }else{
              let ineerdData = await innerListGet(result,resData);
              arr.push(ineerdData);
            }
          }
          mainArr.push(arr.toString());
          if(mainArr.length === cursor.length){
            resolve(mainArr);
          }
        });
      }).then(resultDataIs => {
        res.write(headers.toString() + "\r\n");
        for (stringVal of resultDataIs) {
          res.write(stringVal + "\r\n");
        }
        res.end();
      });
    }
  } catch (e) {
    console.log("Exception:", e);
    return Response.DbError(res, e, e.message);
  }
});

/**
 * The function "makeNumbersFixed" takes an object as input and converts any numeric values in the
 * object to fixed decimal numbers with two decimal places.
 * @param output1 - The parameter `output1` is an object.
 */
function makeNumbersFixed(input) {
  try {
    for (let key in input) {
      input[key] = typeof(input[key]) == 'number' ? Number(input[key].toFixed(2)) : input[key];
    }
  } catch (error) {
    throw {message: `makeNumbersFixed: ${error.message}`}
  }
}

async function innerListGet(t, path) {
  return await path.split(".").reduce((r, k) => r?.[k], t);
}

module.exports.getAll = catchAsync(async (req, res) => {
  try {
    /**
        1 Save as draft 
        2 Under review by State
        3 Under review by MOHUA
        4 Rejected By State
        5 Rejected By MOhua
        6 Approval Completed
        */

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
      limit = req.query.limit ? parseInt(req.query.limit) : 50,
      csv = req.query.csv,
      actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE", "ULB"];
    let { design_year } = req.params;
    let status = "PENDING";
    // if(user.role=='ULB'){
    //     status = 'REJECTED'
    // }
    let priority = false;
    let cond = { priority: 0 };
    if (user.role == "STATE") {
      priority = true;
      cond["priority"] = {
        $cond: [
          {
            $and: [
              { $eq: ["$actionTakenByUserRole", "ULB"] },
              { $eq: ["$isCompleted", true] },
            ],
          },
          1,
          0,
        ],
      };
      cond["priority_1"] = {
        $cond: [
          {
            $and: [
              { $eq: ["$actionTakenByUserRole", "STATE"] },
              { $eq: ["$isCompleted", false] },
            ],
          },
          1,
          0,
        ],
      };
    }
    if (user.role == "MoHUA") {
      priority = true;
      cond["priority"] = {
        $cond: [
          {
            $and: [
              { $eq: ["$actionTakenByUserRole", "STATE"] },
              { $eq: ["$status", "APPROVED"] },
            ],
          },
          1,
          0,
        ],
      };

      cond["priority_1"] = {
        $cond: [
          {
            $and: [
              { $eq: ["$actionTakenByUserRole", "MoHUA"] },
              { $eq: ["$isCompleted", false] },
            ],
          },
          1,
          0,
        ],
      };
    }

    if (actionAllowed.indexOf(user.role) > -1) {
      let match = {
        $match: { overallReport: null, isActive: true },
      };

      if (design_year) {
        match = {
          $match: {
            overallReport: null,
            isActive: true,
            design_year: ObjectId(design_year),
          },
        };
      }
      let q = [
        match,

        {
          $lookup: {
            from: "ulbs",
            localField: "ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "ulbtypes",
            localField: "ulb.ulbType",
            foreignField: "_id",
            as: "ulbType",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
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
        { $unwind: "$ulb" },
        { $unwind: "$ulbType" },
        { $unwind: "$state" },
        { $unwind: "$actionTakenBy" },
        {
          $project: {
            _id: 1,
            audited: 1,
            priority: 1,
            priority_1: 1,
            // auditStatus: {
            //     $cond: {
            //         if: '$audited',
            //         then: 'Audited',
            //         else: 'Unaudited'
            //     }
            // },

            baeline_waterSuppliedPerDay_2020_21:
              "$waterManagement.waterSuppliedPerDay.baseline.2021",
            baseline_reduction_2020_21:
              "$waterManagement.reduction.baseline.2021",
            baeline_houseHoldCoveredWithSewerage_2020_21:
              "$waterManagement.houseHoldCoveredWithSewerage.baseline.2021",
            baeline_houseHoldCoveredPipedSupply_2020_21:
              "$waterManagement.houseHoldCoveredPipedSupply.baseline.2021",

            target_waterSuppliedPerDay_2021_22:
              "$waterManagement.waterSuppliedPerDay.target.2122",
            target_reduction_2021_22: "$waterManagement.reduction.target.2122",
            target_houseHoldCoveredWithSewerage_2021_22:
              "$waterManagement.houseHoldCoveredWithSewerage.target.2122",
            target_houseHoldCoveredPipedSupply_2021_22:
              "$waterManagement.houseHoldCoveredPipedSupply.target.2122",

            target_waterSuppliedPerDay_2022_23:
              "$waterManagement.waterSuppliedPerDay.target.2223",
            target_reduction_2022_23: "$waterManagement.reduction.target.2223",
            target_houseHoldCoveredWithSewerage_2022_23:
              "$waterManagement.houseHoldCoveredWithSewerage.target.2223",
            target_houseHoldCoveredPipedSupply_2022_23:
              "$waterManagement.houseHoldCoveredPipedSupply.target.2223",

            target_waterSuppliedPerDay_2023_24:
              "$waterManagement.waterSuppliedPerDay.target.2324",
            target_reduction_2023_24: "$waterManagement.reduction.target.2324",
            target_houseHoldCoveredWithSewerage_2023_24:
              "$waterManagement.houseHoldCoveredWithSewerage.target.2324",
            target_houseHoldCoveredPipedSupply_2023_24:
              "$waterManagement.houseHoldCoveredPipedSupply.target.2324",

            target_waterSuppliedPerDay_2024_25:
              "$waterManagement.waterSuppliedPerDay.target.2425",
            target_reduction_2024_25: "$waterManagement.reduction.target.2425",
            target_houseHoldCoveredWithSewerage_2024_25:
              "$waterManagement.houseHoldCoveredWithSewerage.target.2425",
            target_houseHoldCoveredPipedSupply_2024_25:
              "$waterManagement.houseHoldCoveredPipedSupply.target.2425",

            garbageFreeCities:
              "$solidWasteManagement.documents.garbageFreeCities",
            waterSupplyCoverage:
              "$solidWasteManagement.documents.waterSupplyCoverage",

            cityPlan: "$millionPlusCities.documents.cityPlan",
            waterBalancePlan: "$millionPlusCities.documents.waterBalancePlan",
            serviceLevelPlan: "$millionPlusCities.documents.serviceLevelPlan",
            solidWastePlan: "$millionPlusCities.documents.solidWastePlan",

            waterManagement: 1,
            solidWasteManagement: 1,
            millionPlusCities: 1,
            completeness: 1,
            correctness: 1,
            status: 1,
            //financialYear: 1,
            ulbType: "$ulbType.name",
            ulb: "$ulb._id",
            ulbName: "$ulb.name",
            ulbCode: "$ulb.code",
            sbCode: "$ulb.sbCode",
            censusCode: "$ulb.censusCode",
            isMillionPlus: "$ulb.isMillionPlus",
            populationType: {
              $cond: {
                if: { $eq: ["$ulb.isMillionPlus", "Yes"] },
                then: "Million Plus",
                else: "Non Million",
              },
            },
            state: "$state._id",
            stateName: "$state.name",
            stateCode: "$state.code",
            actionTakenByUserName: "$actionTakenBy.name",
            actionTakenByUserRole: "$actionTakenBy.role",
            isCompleted: 1,
            isActive: "$isActive",
            createdAt: "$createdAt",
            modifiedAt: "$modifiedAt",
          },
        },
        {
          $addFields: cond,
        },
      ];

      let newFilter = await Service.mapFilter(filter);
      let total = undefined;
      if (user.role == "STATE") {
        newFilter["state"] = ObjectId(user.state);
      }
      if (user.role == "ULB") {
        newFilter["ulb"] = ObjectId(user.ulb);
      }
      if (newFilter["status"]) {
        Object.assign(newFilter, statusFilter[newFilter["status"]]);
        if (newFilter["status"] == "2" || newFilter["status"] == "3") {
          delete newFilter["status"];
        }
      }
      if (newFilter && Object.keys(newFilter).length) {
        q.push({ $match: newFilter });
      }
      if (sort && Object.keys(sort).length) {
        q.push({ $sort: sort });
      } else {
        if (priority) {
          sort = {
            $sort: { priority: -1, priority_1: -1, modifiedAt: -1 },
          };
        } else {
          sort = { $sort: { createdAt: -1 } };
        }
        q.push(sort);
      }
      if (csv) {
        let arr = await XVFCGrantULBData.aggregate(q).exec();
        let index =0;
        for (let d of arr) {
          d = JSON.parse(JSON.stringify(d));
          arr[index] = concatenateUrls(d);
          if (
            d.status == "PENDING" &&
            d.isCompleted == false &&
            d.actionTakenByUserRole == "ULB"
          ) {
            d.status = "Saved as Draft";
          }
          if (
            d.status == "PENDING" &&
            d.isCompleted == true &&
            d.actionTakenByUserRole == "ULB"
          ) {
            d.status = "Under Review by State";
          }
          if (
            d.status == "PENDING" &&
            d.isCompleted == false &&
            d.actionTakenByUserRole == "STATE"
          ) {
            d.status = "Under Review by State";
          }
          if (d.status == "APPROVED" && d.actionTakenByUserRole == "STATE") {
            d.status = statusTypes.Approved_By_State;
          }
          if (
            d.status == "PENDING" &&
            d.actionTakenByUserRole == "STATE" &&
            d.isCompleted == false
          ) {
            d.status = statusTypes.Approved_By_State;
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

          (d.garbageFreeCities =
            d.garbageFreeCities && d.garbageFreeCities.length > 0
              ? d.garbageFreeCities[0]["url"]
              : ""),
            (d.waterSupplyCoverage =
              d.waterSupplyCoverage && d.waterSupplyCoverage.length > 0
                ? d.waterSupplyCoverage[0]["url"]
                : ""),
            (d.cityPlan =
              d.cityPlan && d.cityPlan.length > 0 ? d.cityPlan[0]["url"] : ""),
            (d.waterBalancePlan =
              d.waterBalancePlan && d.waterBalancePlan.length > 0
                ? d.waterBalancePlan[0]["url"]
                : ""),
            (d.serviceLevelPlan =
              d.serviceLevelPlan && d.serviceLevelPlan.length > 0
                ? d.serviceLevelPlan[0]["url"]
                : ""),
            (d.solidWastePlan =
              d.solidWastePlan && d.solidWastePlan.length > 0
                ? d.solidWastePlan[0]["url"]
                : "");
             index++;

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
        try {
          if (!skip) {
            let qrr = [...q, { $count: "count" }];
            let d = await XVFCGrantULBData.aggregate(qrr);
            total = d.length ? d[0].count : 0;
          }
          q.push({ $skip: skip });
          q.push({ $limit: limit });

          let arr = await XVFCGrantULBData.aggregate(q).exec();
          return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: "Ulb update request list",
            data: arr,
            total: total,
          });
        } catch (e) {
          console.log("exception", e);
          return Response.DbError(res, q);
        }
      }
    } else {
      return Response.BadRequest(res, {}, "Action not allowed.");
    }
  } catch (e) {
    return Response.BadRequest(res, e, e.message);
  }
});

function csvData() {
  return (field = {
    stateName: "State name",
    ulbName: "ULB name",
    ulbType: "ULB Type",
    populationType: "Population Type",
    censusCode: "Census Code",
    sbCode: "ULB Code",
    //financialYear: 'Financial Year',
    //auditStatus: 'Audit Status',
    status: "Status",
    baeline_waterSuppliedPerDay_2020_21:
      "Baseline 2020-21_Water supplied in litre per day(lpcd)",
    target_waterSuppliedPerDay_2021_22:
      "Target 2021-22_Water supplied in litre per day(lpcd)",
    target_waterSuppliedPerDay_2022_23:
      "Target 2022-23_Water supplied in litre per day(lpcd)",
    target_waterSuppliedPerDay_2023_24:
      "Target 2023-24_Water supplied in litre per day(lpcd)",
    target_waterSuppliedPerDay_2024_25:
      "Target 2024_25_Water supplied in litre per day(lpcd)",

    baseline_reduction_2020_21:
      "Baseline 2020-21_Reduction in non-water revenue",
    target_reduction_2021_22: "Target 2021-22_Reduction in non-water revenue",
    target_reduction_2022_23: "Target 2022-23_Reduction in non-water revenue",
    target_reduction_2023_24: "Target 2023-24_Reduction in non-water revenue",
    target_reduction_2024_25: "Target 2024_25_Reduction in non-water revenue",

    baeline_houseHoldCoveredWithSewerage_2020_21:
      "Baseline 2020-21_% of households covered with sewerage/septage services",
    target_houseHoldCoveredWithSewerage_2021_22:
      "Target 2021-22_% of households covered with sewerage/septage services",
    target_houseHoldCoveredWithSewerage_2022_23:
      "Target 2022-23_% of households covered with sewerage/septage services",
    target_houseHoldCoveredWithSewerage_2023_24:
      "Target 2023-24_% of households covered with sewerage/septage services",
    target_houseHoldCoveredWithSewerage_2024_25:
      "Target 2024_25_% of households covered with sewerage/septage services",

    baeline_houseHoldCoveredPipedSupply_2020_21:
      "Baseline 2020-21_% of households covered with piped water supply",
    target_houseHoldCoveredPipedSupply_2021_22:
      "Target 2021-22_% of households covered with piped water supply",
    target_houseHoldCoveredPipedSupply_2022_23:
      "Target 2022-23_% of households covered with piped water supply",
    target_houseHoldCoveredPipedSupply_2023_24:
      "Target 2023-24_% of households covered with piped water supply",
    target_houseHoldCoveredPipedSupply_2024_25:
      "Target 2024_25_% of households covered with piped water supply",

    garbageFreeCities: "Plan for garbage free star rating of the cities",
    waterSupplyCoverage:
      "Plan for coverage of water supply for public/community toilets",
    cityPlan: "City Plan DPR",
    waterBalancePlan: "Water Balance Plan",
    serviceLevelPlan: "Service Level Improvement Plan",
    solidWastePlan: "Solid Waste Management Plan",
  });
}

module.exports.getHistories = async (req, res) => {
  try {
    let user = req.decoded,
      filter = req.query.filter
        ? JSON.parse(req.query.filter)
        : req.body.filter
          ? req.body.filter
          : {},
      sort = req.query.sort
        ? JSON.parse(req.query.sort)
        : req.body.sort
          ? req.body.sort
          : { modifiedAt: 1 },
      skip = req.query.skip ? parseInt(req.query.skip) : 0,
      limit = req.query.limit ? parseInt(req.query.limit) : 50,
      csv = req.query.csv,
      actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE", "ULB"];
    if (actionAllowed.indexOf(user.role) > -1) {
      let q = [
        { $match: { _id: ObjectId(req.params._id) } },
        {
          $project: {
            history: {
              $concatArrays: [
                [
                  {
                    _id: "$_id",
                    referenceCode: "$referenceCode",
                    isCompleted: "$isCompleted",
                    audited: "$audited",
                    overallReport: "$overallReport",
                    //completeness: '$completeness',
                    //correctness: '$correctness',
                    status: "$status",
                    modifiedAt: "$modifiedAt",
                    createdAt: "$createdAt",
                    isActive: "$isActive",
                    //balanceSheet: '$balanceSheet',
                    //schedulesToBalanceSheet:
                    //    '$schedulesToBalanceSheet',
                    //incomeAndExpenditure:
                    //    '$incomeAndExpenditure',
                    //schedulesToIncomeAndExpenditure:
                    //    '$schedulesToIncomeAndExpenditure',
                    //trialBalance: '$trialBalance',
                    //financialYear: '$financialYear',
                    ulb: "$ulb",
                    actionTakenBy: "$actionTakenBy",
                  },
                ],
                "$history",
              ],
            },
          },
        },
        { $unwind: "$history" },
        {
          $lookup: {
            from: "ulbs",
            localField: "history.ulb",
            foreignField: "_id",
            as: "ulb",
          },
        },
        {
          $lookup: {
            from: "ulbtypes",
            localField: "ulb.ulbType",
            foreignField: "_id",
            as: "ulbType",
          },
        },
        {
          $lookup: {
            from: "states",
            localField: "ulb.state",
            foreignField: "_id",
            as: "state",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "history.actionTakenBy",
            foreignField: "_id",
            as: "actionTakenBy",
          },
        },
        { $unwind: { path: "$ulb", preserveNullAndEmptyArrays: true } },
        {
          $unwind: {
            path: "$ulbType",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$state",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$actionTakenBy",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            isCompleted: "$history.isCompleted",
            audited: "$history.audited",
            //completeness: '$history.completeness',
            //correctness: '$history.correctness',
            status: "$history.status",
            //financialYear: '$history.financialYear',
            ulbType: "$ulbType.name",
            ulb: "$ulb._id",
            ulbName: "$ulb.name",
            ulbCode: "$ulb.code",
            state: "$state._id",
            stateName: "$state.name",
            stateCode: "$state.code",
            actionTakenByUserName: "$actionTakenBy.name",
            actionTakenByUserRole: "$actionTakenBy.role",
            modifiedAt: "$history.modifiedAt",
          },
        },
        {
          $match: {
            $or: [
              {
                actionTakenByUserRole: {
                  $nin: ["STATE", "MoHUA"],
                },
              },
              { isCompleted: { $ne: false } },
            ],
          },
        },
      ];
      let newFilter = await Service.mapFilter(filter);
      let total = undefined;
      if (user.role == "STATE") {
        newFilter["state"] = ObjectId(user.state);
      }
      if (user.role == "ULB") {
        newFilter["ulb"] = ObjectId(user.ulb);
      }
      if (newFilter && Object.keys(newFilter).length) {
        q.push({ $match: newFilter });
      }

      if (sort && Object.keys(sort).length) {
        q.push({ $sort: sort });
      }
      if (csv) {
        let arr = await XVFCGrantULBData.aggregate(q).exec();
        return res.xls("financial-data-history.xlsx", arr);
      } else {
        q.push({ $skip: skip });
        q.push({ $limit: limit });
        if (!skip) {
          let qrr = [...q, { $count: "count" }];
          let d = await XVFCGrantULBData.aggregate(qrr);
          total = d.length ? d[0].count : 0;
        }
        let arr = await XVFCGrantULBData.aggregate(q).exec();
        if (
          arr.length > 0 &&
          arr[0]["isCompleted"] == false &&
          arr[0]["actionTakenByUserRole"] == "ULB"
        ) {
          arr.push(arr.shift());
        }
        return res.status(200).json({
          timestamp: moment().unix(),
          success: true,
          message: "Ulb update request list",
          data: arr,
          total: total,
        });
      }
    } else {
      return Response.BadRequest(res, {}, "Action not allowed.");
    }
  } catch (e) {
    return Response.BadRequest(res, e, e.message);
  }
};
module.exports.getDetails = async (req, res) => {
  let user = req.decoded,
    actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE", "ULB"];
  if (actionAllowed.indexOf(user.role) > -1) {
    let CASE = null;
    let query = { _id: ObjectId(req.params._id) };
    let data = await XVFCGrantULBData.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
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
      { $unwind: "$ulb" },
      {
        $unwind: {
          path: "$actionTakenBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          waterManagement: 1,
          solidWasteManagement: 1,
          millionPlusCities: 1,
          isCompleted: 1,
          status: 1,
          ulb: "$ulb._id",
          ulbName: "$ulb.name",
          ulbCode: "$ulb.code",
          actionTakenByUserName: "$actionTakenBy.name",
          actionTakenByUserRole: "$actionTakenBy.role",
          isActive: "$isActive",
          createdAt: "$createdAt",
        },
      },
    ]).exec();

    if (
      user.role == "ADMIN" ||
      user.role == "PARTNER" ||
      user.role == "ULB" ||
      user.role == "MoHUA"
    ) {
      if (
        data[0].isCompleted == false &&
        data[0].actionTakenByUserRole == "STATE"
      ) {
        CASE = "STATE";
        var ULBdata = await draftQuery(query, "PENDING", "ULB");
      }
    }

    if (
      user.role == "PARTNER" ||
      user.role == "ULB" ||
      user.role == "STATE" ||
      user.role == "ADMIN"
    ) {
      if (
        data[0].isCompleted == false &&
        data[0].actionTakenByUserRole == "MoHUA"
      ) {
        CASE = "MOHUA";
        var StateData = await draftQuery(query, "APPROVED", "STATE");
      }
    }
    // Match from history
    let rejectedDataFromHistory = await XVFCGrantULBData.aggregate([
      {
        $match: query,
      },
      { $unwind: "$history" },
      { $match: { "history.status": "REJECTED" } },
    ]).exec();

    // match from data

    //if(rejectedDataFromHistory.length == 0){
    var rejectedData = await XVFCGrantULBData.aggregate([
      {
        $match: query,
      },
      { $match: { status: "REJECTED" } },
    ]).exec();
    //}

    let firstSubmitedFromHistory = await XVFCGrantULBData.aggregate([
      {
        $match: query,
      },
      { $unwind: "$history" },
      {
        $lookup: {
          from: "users",
          localField: "history.actionTakenBy",
          foreignField: "_id",
          as: "actionTakenBy",
        },
      },
      {
        $unwind: {
          path: "$actionTakenBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "actionTakenBy.role": "ULB",
          "history.isCompleted": true,
        },
      },
    ]).exec();

    let firstSubmited = await XVFCGrantULBData.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          localField: "actionTakenBy",
          foreignField: "_id",
          as: "actionTakenBy",
        },
      },
      {
        $unwind: {
          path: "$actionTakenBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $match: { "actionTakenBy.role": "ULB", isCompleted: true } },
    ]).exec();

    let firstSubmitedAt =
      firstSubmitedFromHistory.length > 0
        ? firstSubmitedFromHistory[0].history.createdAt
        : firstSubmited.length > 0
          ? firstSubmited[firstSubmited.length - 1].createdAt
          : null;
    let rejectedAt =
      rejectedData.length > 0
        ? rejectedData[rejectedData.length - 1].modifiedAt
        : rejectedDataFromHistory.length > 0
          ? rejectedDataFromHistory[rejectedDataFromHistory.length - 1].history
            .modifiedAt
          : null;
    let history = { histroy: "" };
    let finalData = Object.assign(data[0], {
      rejectedAt: rejectedAt,
      firstSubmitedAt: firstSubmitedAt,
    });

    if (CASE == "STATE") {
      finalData = Object.assign(ULBdata, {
        rejectedAt: rejectedAt,
        firstSubmitedAt: firstSubmitedAt,
      });
    }
    if (CASE == "MOHUA") {
      finalData = Object.assign(StateData, {
        rejectedAt: rejectedAt,
        firstSubmitedAt: firstSubmitedAt,
      });
    }

    if (user.role == "MoHUA") {
      if (
        data[0]["actionTakenByUserRole"] == "STATE" &&
        data[0]["status"] == "APPROVED"
      ) {
        let historyData = await commonQuery(query);
        if (historyData.length > 0) {
          history["histroy"] = resetDataStatus(
            historyData[historyData.length - 1],
            false
          );
          let rejectReasonKeys = await getRejectedStatusKey(
            history["histroy"].data
          );
          let newData = await getRejectedStatusKey(data[0], rejectReasonKeys);
          newData = Object.assign(data[0], {
            rejectedAt: rejectedAt,
            firstSubmitedAt: firstSubmitedAt,
          });

          return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: "Ulb update request list",
            data: newData,
          });
        } else {
          let newData = resetDataStatus(data[0]);
          let finalData = Object.assign(newData, {
            rejectedAt: rejectedAt,
            firstSubmitedAt: firstSubmitedAt,
          });
          return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: "Ulb update request list",
            data: finalData,
          });
        }
      }
    }

    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: "Ulb update request list",
      data: finalData,
    });
  } else {
    return Response.BadRequest(res, {}, "Action not allowed.");
  }
};

async function draftQuery(query, status, role) {
  let data = await XVFCGrantULBData.aggregate([
    {
      $match: query,
    },
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    { $unwind: "$history" },
    {
      $lookup: {
        from: "users",
        localField: "history.actionTakenBy",
        foreignField: "_id",
        as: "actionTakenBy",
      },
    },
    {
      $unwind: {
        path: "$actionTakenBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $unwind: "$ulb" },
    { $match: { "history.status": status, "actionTakenBy.role": role } },
    {
      $project: {
        _id: 1,
        waterManagement: "$history.waterManagement",
        solidWasteManagement: "$history.solidWasteManagement",
        millionPlusCities: "$history.millionPlusCities",
        isCompleted: "$history.isCompleted",
        status: "$history.status",
        ulb: "$ulb._id",
        ulbName: "$ulb.name",
        ulbCode: "$ulb.code",
        actionTakenByUserName: "$actionTakenBy.name",
        actionTakenByUserRole: "$actionTakenBy.role",
        isActive: "$isActive",
        createdAt: "$createdAt",
      },
    },
  ]).exec();
  return data.length > 0 ? data[data.length - 1] : data[0];
}

module.exports.update = async (req, res) => {
  let user = req.decoded,
    data = req.body,
    _id = ObjectId(req.params._id);
  let actionAllowed = ["ULB"];
  let keys = [
    "audited",
    "balanceSheet",
    "schedulesToBalanceSheet",
    "incomeAndExpenditure",
    "schedulesToIncomeAndExpenditure",
    "trialBalance",
    "auditReport",
  ];
  if (actionAllowed.indexOf(user.role) > -1) {
    try {
      for (k in data) {
        if (
          data[k] &&
          typeof data[k] == "object" &&
          Object.keys(data[k]).length
        ) {
          if (!(data[k].pdfUrl || data[k].excelUrl)) {
            data[k].completeness = "NA";
            data[k].correctness = "NA";
          } else {
            data[k].completeness = "PENDING";
            data[k].correctness = "PENDING";
          }
        }
      }

      let prevState = await XVFCGrantULBData.findOne(
        { _id: _id },
        "-history"
      ).lean();

      let history = Object.assign({}, prevState);
      if (!prevState) {
        return Response.BadRequest(res, {}, "Requested record not found.");
      } else if (
        prevState.completeness == "REJECTED" ||
        prevState.correctness == "REJECTED"
      ) {
        for (let key of keys) {
          if (
            data[key] &&
            typeof data[key] == "object" &&
            Object.keys(data[key]).length
          ) {
            if (
              !(data[key].pdfUrl || data[key].excelUrl) ||
              data[key].pdfUrl === "" ||
              data[key].excelUrl === ""
            ) {
              prevState[key].completeness = "NA";
              prevState[key].correctness = "NA";
              if (data[key].pdfUrl === "") {
                prevState[key].pdfUrl = "";
              }
              if (data[key].excelUrl === "") {
                prevState[key].excelUrl = "";
              }
              if (data[key].pdfUrl === "" && data[key].excelUrl === "") {
                prevState[key].message = "";
              }
            } else {
              if (key == "auditReport" && prevState.audited) {
                Object.assign(prevState[key], data[key]);
                prevState[key]["completeness"] = "PENDING";
                prevState[key]["correctness"] = "PENDING";
              } else if (key != "auditReport") {
                Object.assign(prevState[key], data[key]);
                prevState[key]["completeness"] = "PENDING";
                prevState[key]["correctness"] = "PENDING";
              }
            }
          }
        }

        prevState["completeness"] = "PENDING";
        prevState["correctness"] = "PENDING";
        prevState["status"] = "PENDING";
        prevState.modifiedAt = new Date();
        prevState.actionTakenBy = user._id;

        if (user.role == "ULB") {
          if (data.balanceSheet) {
            if (
              data.balanceSheet.pdfUrl == "" ||
              data.balanceSheet.pdfUrl == null ||
              data.balanceSheet.excelUrl == "" ||
              data.balanceSheet.excelUrl == null
            ) {
              return Response.BadRequest(
                res,
                {},
                `balanceSheet must be provided`
              );
            }
          }
          if (data.incomeAndExpenditure) {
            if (
              data.incomeAndExpenditure.pdfUrl == "" ||
              data.incomeAndExpenditure.pdfUrl == null ||
              data.incomeAndExpenditure.excelUrl == "" ||
              data.incomeAndExpenditure.excelUrl == null
            ) {
              return Response.BadRequest(
                res,
                {},
                `incomeAndExpenditure must be provided`
              );
            }
          }
          if (data.trialBalance) {
            if (
              data.trialBalance.pdfUrl == "" ||
              data.trialBalance.pdfUrl == null ||
              data.trialBalance.excelUrl == "" ||
              data.trialBalance.excelUrl == null
            ) {
              return Response.BadRequest(
                res,
                {},
                `trialBalance must be provided`
              );
            }
          }
          if (data.audited == true) {
            if (
              !data.auditReport ||
              data.auditReport.pdfUrl == "" ||
              data.auditReport.pdfUrl == null
            ) {
              return Response.BadRequest(
                res,
                {},
                `auditReport must be provided`
              );
            }
          }
        }

        let du = await XVFCGrantULBData.update(
          { _id: prevState._id },
          { $set: prevState, $push: { history: history } }
        );
        let ulbFinancialDataobj = await XVFCGrantULBData.findOne({
          _id: prevState._id,
        }).exec();

        return Response.OK(
          res,
          ulbFinancialDataobj,
          `completeness status changed to ${prevState.completeness}`
        );
      } else {
        return Response.BadRequest(res, {}, "Update not allowed.");
      }
    } catch (e) {
      console.log(e);
      return Response.DbError(res, e.message, "Caught Database Exception");
    }
  } else {
    return Response.BadRequest(
      res,
      {},
      `This action is only allowed by ${actionAllowed.join()}`
    );
  }
};

module.exports.action = async (req, res) => {
  try {
    let user = req.decoded;
    (data = req.body), (_id = ObjectId(req.params._id));
    let design_year = await Year.findOne({ _id: ObjectId(data.design_year) });
    if (design_year.year === "2021-22") {
      delete data.waterManagement.houseHoldCoveredPipedSupply["status"];
      delete data.waterManagement.houseHoldCoveredPipedSupply["rejectReason"];
      delete data.waterManagement.waterSuppliedPerDay["status"];
      delete data.waterManagement.waterSuppliedPerDay["rejectReason"];
      delete data.waterManagement.reduction["status"];
      delete data.waterManagement.reduction["rejectReason"];
      delete data.waterManagement.houseHoldCoveredWithSewerage["status"];
      delete data.waterManagement.houseHoldCoveredWithSewerage["rejectReason"];
    } else {
      delete data.waterManagement["status"];
      delete data.waterManagement["rejectReason"];
    }

    let prevState = await XVFCGrantULBData.findOne(
      { _id: _id },
      "-history"
    ).lean();
    let prevUser = await User.findOne({
      _id: ObjectId(prevState.actionTakenBy),
    }).exec();

    if (prevState.status == "APPROVED" && prevUser.role == "MoHUA") {
      return Response.BadRequest(res, {}, "Already approved By MoHUA User.");
    }
    if (prevState.status == "REJECTED" && prevUser.role == "MoHUA") {
      return Response.BadRequest(res, {}, "Already Rejected By MoHUA User.");
    }
    if (
      prevState.status == "APPROVED" &&
      user.role == "STATE" &&
      prevUser.role == "STATE"
    ) {
      return Response.BadRequest(res, {}, "Already approved By STATE User.");
    }
    if (
      prevState.status == "REJECTED" &&
      user.role == "STATE" &&
      prevUser.role == "STATE"
    ) {
      return Response.BadRequest(res, {}, "Already Rejected By State User.");
    }
    let flag = overAllStatus(data);

    flag
      .then(
        async (value) => {
          data["status"] = value.status ? "REJECTED" : "APPROVED";
          if (!data["isCompleted"]) {
            data["status"] = "PENDING";
          }
          let actionAllowed = ["MoHUA", "STATE"];
          if (actionAllowed.indexOf(user.role) > -1) {
            if (user.role == "STATE") {
              let ulb = await Ulb.findOne({
                _id: ObjectId(data.ulb),
              }).exec();

              if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
                let message = !ulb
                  ? "Ulb not found."
                  : "State is not matching.";
                return Response.BadRequest(res, {}, message);
              }
            }
            let history = Object.assign({}, prevState);
            if (!prevState) {
              return Response.BadRequest(
                res,
                {},
                "Requested record not found."
              );
            }
            data["actionTakenBy"] = user._id;
            data["ulb"] = prevState.ulb;
            data["modifiedAt"] = time();
            data['actionTakenByRole'] = user?.role
            let du = await XVFCGrantULBData.update(
              { _id: ObjectId(prevState._id) },
              { $set: data, $push: { history: history } }
            );
            let ulbFinancialDataobj = await XVFCGrantULBData.findOne({
              _id: ObjectId(prevState._id),
            }).exec();
            let ulbUser = await User.findOne({
              ulb: ObjectId(ulbFinancialDataobj.ulb),
              isDeleted: false,
              role: "ULB",
            })
              .populate([
                {
                  path: "state",
                  model: State,
                  select: "_id name",
                },
              ])
              .exec();

            if (data["status"] == "APPROVED" && user.role == "MoHUA") {
              let mailOptions
              /** ULB TRIGGER */
              let ulbEmails = [];
              let UlbTemplate =
                await Service.emailTemplate.xvUploadApprovalMoHUA(ulbUser.name);
              ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
              ulbUser.accountantEmail
                ? ulbEmails.push(ulbUser.accountantEmail)
                : "";
              // (mailOptions.to = ulbEmails.join()),
              //   (mailOptions.subject = UlbTemplate.subject),
              //   (mailOptions.html = UlbTemplate.body);
                   mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: ulbEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: UlbTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: UlbTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
              Service.sendEmail(mailOptions);
              /** STATE TRIGGER */
              let stateEmails = [];
              let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: "STATE",
              }).exec();
              for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : "";
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
                let stateTemplate =
                  await Service.emailTemplate.xvUploadApprovalByMoHUAtoState(
                    ulbUser.name,
                    d.name
                  );
                // mailOptions.to = stateEmails.join();
                // mailOptions.subject = stateTemplate.subject;
                // mailOptions.html = stateTemplate.body;
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: stateEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: stateTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: stateTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
                Service.sendEmail(mailOptions);
              }
            }
            if (data["status"] == "APPROVED" && user.role == "STATE") {
              // let mailOptions = {
              //   to: "",
              //   subject: "",
              //   html: "",
              // };

              let UlbTemplate =
                await Service.emailTemplate.xvUploadApprovalByStateToUlb(
                  ulbUser.name
                );
              // (mailOptions.to = ulbUser.email),
              //   (mailOptions.subject = UlbTemplate.subject),
              //   (mailOptions.html = UlbTemplate.body);
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: [ulbUser.email]
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: UlbTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: UlbTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
              Service.sendEmail(mailOptions);
              /** STATE TRIGGER */
              let MohuaUser = await User.find({
                isDeleted: false,
                role: "MoHUA",
              }).exec();
              for (let d of MohuaUser) {
                sleep(700);
                let MohuaTemplate =
                  await Service.emailTemplate.xvUploadApprovalState(
                    d.name,
                    ulbUser.name,
                    ulbUser.state.name
                  );
                // (mailOptions.to = d.email),
                //   (mailOptions.subject = MohuaTemplate.subject),
                //   (mailOptions.html = MohuaTemplate.body);
                  mailOptions =     {
                    Destination: {
                      /* required */
                      ToAddresses: [d.email]
                    },
                    Message: {
                      /* required */
                      Body: {
                        /* required */
                        Html: {
                          Charset: "UTF-8",
                          Data: MohuaTemplate.body
                        },
                      },
                      Subject: {
                        Charset: 'UTF-8',
                        Data: MohuaTemplate.subject
                      }
                    },
                    Source: process.env.EMAIL,
                    /* required */
                    ReplyToAddresses: [process.env.EMAIL],
                  }
                Service.sendEmail(mailOptions);
              }

              /** STATE TRIGGER */
              let stateEmails = [];
              let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: "STATE",
              }).exec();
              for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : "";
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
                let stateTemplate =
                  await Service.emailTemplate.xvUploadApprovalForState(
                    ulbUser.name,
                    d.name
                  );
                // mailOptions.to = stateEmails.join();
                // mailOptions.subject = stateTemplate.subject;
                // mailOptions.html = stateTemplate.body;
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: stateEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: stateTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: stateTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
                Service.sendEmail(mailOptions);
              }

              let historyData = await commonQuery({ _id: _id });
              if (historyData.length > 0) {
                let du = await XVFCGrantULBData.update(
                  { _id: ObjectId(prevState._id) },
                  { $set: data }
                );
              } else {
                let newData = resetDataStatus(data);
                let du = await XVFCGrantULBData.update(
                  { _id: ObjectId(prevState._id) },
                  { $set: newData }
                );
              }
            }
            if (data["status"] == "REJECTED" && user.role == "MoHUA") {
              let mailOptions 
              /** ULB TRIGGER */
              let ulbEmails = [];
              let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                ulbUser.name,
                value.reason,
                "MoHUA"
              );
              ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
              ulbUser.accountantEmail
                ? ulbEmails.push(ulbUser.accountantEmail)
                : "";
              // (mailOptions.to = ulbEmails.join()),
              //   (mailOptions.subject = UlbTemplate.subject),
              //   (mailOptions.html = UlbTemplate.body);
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: ulbEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: UlbTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: UlbTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
              Service.sendEmail(mailOptions);

              /** STATE TRIGGER */
              let stateEmails = [];
              let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: "STATE",
              }).exec();
              for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : "";
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
                let stateTemplate =
                  await Service.emailTemplate.xvUploadRejectState(
                    ulbUser.name,
                    d.name,
                    value.reason
                  );
                // mailOptions.to = stateEmails.join();
                // mailOptions.subject = stateTemplate.subject;
                // mailOptions.html = stateTemplate.body;
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: stateEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: stateTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: stateTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
                Service.sendEmail(mailOptions);
              }
            }
            if (data["status"] == "REJECTED" && user.role == "STATE") {
              let mailOptions 
              /** ULB TRIGGER */
              let ulbEmails = [];
              let UlbTemplate = await Service.emailTemplate.xvUploadRejectUlb(
                ulbUser.name,
                value.reason,
                "STATE"
              );
              ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
              ulbUser.accountantEmail
                ? ulbEmails.push(ulbUser.accountantEmail)
                : "";
              // (mailOptions.to = ulbEmails.join()),
              //   (mailOptions.subject = UlbTemplate.subject),
              //   (mailOptions.html = UlbTemplate.body);
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: ulbEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: UlbTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: UlbTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
              Service.sendEmail(mailOptions);

              /** STATE TRIGGER */
              let stateEmails = [];
              let stateUser = await User.find({
                state: ObjectId(ulbUser.state._id),
                isDeleted: false,
                role: "STATE",
              }).exec();
              for (let d of stateUser) {
                sleep(700);
                d.email ? stateEmails.push(d.email) : "";
                d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
                let stateTemplate =
                  await Service.emailTemplate.xvUploadRejectByStateTrigger(
                    ulbUser.name,
                    d.name,
                    value.reason
                  );
                // mailOptions.to = stateEmails.join();
                // mailOptions.subject = stateTemplate.subject;
                // mailOptions.html = stateTemplate.body;
                mailOptions =     {
                  Destination: {
                    /* required */
                    ToAddresses: stateEmails.join()
                  },
                  Message: {
                    /* required */
                    Body: {
                      /* required */
                      Html: {
                        Charset: "UTF-8",
                        Data: stateTemplate.body
                      },
                    },
                    Subject: {
                      Charset: 'UTF-8',
                      Data: stateTemplate.subject
                    }
                  },
                  Source: process.env.EMAIL,
                  /* required */
                  ReplyToAddresses: [process.env.EMAIL],
                }
                Service.sendEmail(mailOptions);
              }
            }
            return Response.OK(res, ulbFinancialDataobj, ``);
          } else {
            return Response.BadRequest(
              res,
              {},
              `This action is only allowed by ${actionAllowed.join()}`
            );
          }
        },
        (rejectError) => {
          return Response.BadRequest(res, {}, rejectError);
        }
      )
      .catch((caughtError) => {
        console.log("final caughtError", caughtError);
      });
  } catch (e) {
    console.log("Exception", e);
    res.json({
      message: e.message,
    });
  }
};

module.exports.multipleApprove = async (req, res) => {
  let user = req.decoded;
  if (user.role == "MoHUA") {
    _id = ObjectId(req.params._id);
    let prevState = await XVFCGrantULBData.findOne(
      { _id: _id },
      "-history"
    ).lean();

    let prevUser = await User.findOne({
      _id: ObjectId(prevState.actionTakenBy),
    }).exec();

    let ulbUser = await User.findOne({
      ulb: ObjectId(prevState.ulb),
      isDeleted: false,
      role: "ULB",
    })
      .populate([
        {
          path: "state",
          model: State,
          select: "_id name",
        },
      ])
      .exec();
    let history = Object.assign({}, prevState);
    if (
      prevState.status == "APPROVED" &&
      prevUser.role == "MoHUA" &&
      prevState.isCompleted
    ) {
      return Response.BadRequest(res, {}, "Already approved By MoHUA User.");
    }
    let data = setFormStatus(prevState, { status: "APPROVED" });
    data["actionTakenBy"] = user._id;
    data["status"] = "APPROVED";
    data["modifiedAt"] = time();

    // return res.send({ prevState, prevUser, user });

    if (
      ((prevState["status"] == "APPROVED" && prevUser.role === "STATE") ||
        (!prevState.isCompleted && prevUser.role === "MoHUA")) &&
      user.role == "MoHUA"
    ) {
      let du = await XVFCGrantULBData.update(
        { _id: ObjectId(prevState._id) },
        { $set: data, $push: { history: history } }
      );
      let mailOptions 
      /** ULB TRIGGER */
      let ulbEmails = [];
      let UlbTemplate = await Service.emailTemplate.xvUploadApprovalMoHUA(
        ulbUser.name
      );
      ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
      ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
      // (mailOptions.to = ulbEmails.join()),
      //   (mailOptions.subject = UlbTemplate.subject),
      //   (mailOptions.html = UlbTemplate.body);
        mailOptions =     {
          Destination: {
            /* required */
            ToAddresses: ulbEmails.join()
          },
          Message: {
            /* required */
            Body: {
              /* required */
              Html: {
                Charset: "UTF-8",
                Data: UlbTemplate.body
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: UlbTemplate.subject
            }
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
        }
      Service.sendEmail(mailOptions);
      /** STATE TRIGGER */
      let stateEmails = [];
      let stateUser = await User.find({
        state: ObjectId(ulbUser.state._id),
        isDeleted: false,
        role: "STATE",
      }).exec();
      for (let d of stateUser) {
        sleep(700);
        d.email ? stateEmails.push(d.email) : "";
        d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
        let stateTemplate =
          await Service.emailTemplate.xvUploadApprovalByMoHUAtoState(
            ulbUser.name,
            d.name
          );
        // mailOptions.to = stateEmails.join();
        // mailOptions.subject = stateTemplate.subject;
        // mailOptions.html = stateTemplate.body;
        mailOptions =     {
          Destination: {
            /* required */
            ToAddresses: stateEmails.join()
          },
          Message: {
            /* required */
            Body: {
              /* required */
              Html: {
                Charset: "UTF-8",
                Data: stateTemplate.body
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: stateTemplate.subject
            }
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
        }
        Service.sendEmail(mailOptions);
      }
      return Response.OK(res, {}, ``);
    } else {
      return Response.BadRequest(res, {}, "Something went wrong!");
    }
  } else {
    return Response.BadRequest(res, {}, "This action is only allowed by MoHUA");
  }
};

module.exports.multipleReject = async (req, res) => {
  let user = req.decoded;
  if (user.role == "MoHUA") {
    _id = ObjectId(req.params._id);
    let prevState = await XVFCGrantULBData.findOne(
      { _id: _id },
      "-history"
    ).lean();

    let prevUser = await User.findOne({
      _id: ObjectId(prevState.actionTakenBy),
    }).exec();

    let ulbUser = await User.findOne({
      ulb: ObjectId(prevState.ulb),
      isDeleted: false,
      role: "ULB",
    })
      .populate([
        {
          path: "state",
          model: State,
          select: "_id name",
        },
      ])
      .exec();
    let history = Object.assign({}, prevState);
    if (prevState.status == "APPROVED" && prevUser.role == "MoHUA") {
      return Response.BadRequest(res, {}, "Already approved By MoHUA User.");
    }
    if (prevState.status == "REJECTED" && prevUser.role == "MoHUA") {
      return Response.BadRequest(res, {}, "Already REJECTED By MoHUA User.");
    }
    let data = setFormStatus(prevState, {
      status: "REJECTED",
      rejectReason: req.body.rejectReason,
    });
    data["actionTakenBy"] = user._id;
    data["status"] = "REJECTED";
    data["modifiedAt"] = time();

    if (
      (!prevState.isCompleted && prevUser.role === "MoHUA") ||
      (prevState.isCompleted && prevUser.role === "STATE")
    ) {
      let du = await XVFCGrantULBData.update(
        { _id: ObjectId(prevState._id) },
        { $set: data, $push: { history: history } }
      );
      let mailOptions
      /** ULB TRIGGER */
      let ulbEmails = [];
      let UlbTemplate = await Service.emailTemplate.xvUploadMultiRejectUlb(
        ulbUser.name,
        `<b>Reason for Rejection:</b> ${req.body.rejectReason}`,
        "MoHUA"
      );
      ulbUser.email ? ulbEmails.push(ulbUser.email) : "";
      ulbUser.accountantEmail ? ulbEmails.push(ulbUser.accountantEmail) : "";
      // (mailOptions.to = ulbEmails.join()),
      //   (mailOptions.subject = UlbTemplate.subject),
      //   (mailOptions.html = UlbTemplate.body);
      // console.log(mailOptions);
      mailOptions =     {
        Destination: {
          /* required */
          ToAddresses: ulbEmails.join()
        },
        Message: {
          /* required */
          Body: {
            /* required */
            Html: {
              Charset: "UTF-8",
              Data: UlbTemplate.body
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: UlbTemplate.subject
          }
        },
        Source: process.env.EMAIL,
        /* required */
        ReplyToAddresses: [process.env.EMAIL],
      }
      Service.sendEmail(mailOptions);
      /** STATE TRIGGER */
      let stateEmails = [];
      let stateUser = await User.find({
        state: ObjectId(ulbUser.state._id),
        isDeleted: false,
        role: "STATE",
      }).exec();
      for (let d of stateUser) {
        sleep(700);
        d.email ? stateEmails.push(d.email) : "";
        d.departmentEmail ? stateEmails.push(d.departmentEmail) : "";
        let stateTemplate =
          await Service.emailTemplate.xvUploadMultiRejectState(
            ulbUser.name,
            d.name,
            `<b>Reason for Rejection:</b> ${req.body.rejectReason}`
          );
        // mailOptions.to = stateEmails.join();
        // mailOptions.subject = stateTemplate.subject;
        // mailOptions.html = stateTemplate.body;
        mailOptions =     {
          Destination: {
            /* required */
            ToAddresses: stateEmails.join()
          },
          Message: {
            /* required */
            Body: {
              /* required */
              Html: {
                Charset: "UTF-8",
                Data: stateTemplate.body
              },
            },
            Subject: {
              Charset: 'UTF-8',
              Data: stateTemplate.subject
            }
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
        }
        Service.sendEmail(mailOptions);
      }
      return Response.OK(res, {}, ``);
    } else {
      return Response.BadRequest(res, {}, "Something went wrong!");
    }
  } else {
    return Response.BadRequest(res, {}, "This action is only allowed by MoHUA");
  }
};

/**
 *
 * @param {{status: 'APPROVED'} | {status: 'REJECTED' , rejectReason: string}} option
 */
function setFormStatus(data, option) {
  const newData = { ...data };
  for (key in newData) {
    if (typeof newData[key] === "object" && newData[key] !== null) {
      if (key == "waterManagement") {
        for (let objKey of waterManagementKeys) {
          if (newData[key][objKey]) {
            newData[key][objKey]["status"] = option.status;
            newData[key][objKey]["rejectReason"] = option.rejectReason || "";
          }
        }
      }
      if (key == "solidWasteManagement") {
        for (let objKey of solidWasteManagementKeys) {
          if (newData[key]["documents"][objKey]) {
            for (let d of newData[key]["documents"][objKey]) {
              d.status = option.status;
              d.rejectReason = option.rejectReason || "";
            }
          }
        }
      }
      if (key == "millionPlusCities") {
        for (let objKey of millionPlusCitiesKeys) {
          if (newData[key]["documents"][objKey]) {
            for (let d of newData[key]["documents"][objKey]) {
              d.status = option.status;
              d.rejectReason = option.rejectReason || "";
            }
          }
        }
      }
    } else {
      newData["status"] = option.status;
    }
  }
  newData["status"] = option.status;
  newData.isCompleted = true;
  return newData;
}

async function commonQuery(query) {
  let historyData = await XVFCGrantULBData.aggregate([
    {
      $match: query,
    },
    {
      $unwind: {
        path: "$history",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "history.actionTakenBy",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $match: { "user.role": "MoHUA", "history.status": "REJECTED" } },
    {
      $project: {
        data: "$history",
      },
    },
  ]).exec();
  return historyData;
}
async function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
/**
 * @param{data}  - type Object
 * @param{check} - type Boolean
 */
function resetDataStatus(data, check = false) {
  for (key in data) {
    if (typeof data[key] === "object" && data[key] !== null) {
      if (key == "waterManagement") {
        for (let objKey of waterManagementKeys) {
          if (data[key][objKey]) {
            if (check) {
              if (data[key][objKey]["status"] == "REJECTED") {
                data[key][objKey]["status"] = "";
                data[key][objKey]["rejectReason"] = "";
              }
            } else {
              data[key][objKey]["status"] = "";
              data[key][objKey]["rejectReason"] = "";
            }
          }
        }
        // for(let d of data[key]["documents"]["wasteWaterPlan"]){

        //     if(check){
        //         if(d.status=='REJECTED'){
        //             d.status='NA';
        //             d.rejectReason = '';
        //         }
        //     }
        //     else{
        //         d.status='NA';
        //         d.rejectReason = '';
        //     }
        // }
      }
      if (key == "solidWasteManagement") {
        for (let objKey of solidWasteManagementKeys) {
          if (data[key]["documents"][objKey]) {
            for (let d of data[key]["documents"][objKey]) {
              if (check) {
                if (d.status == "REJECTED") {
                  d.status = "";
                  d.rejectReason = "";
                }
              } else {
                d.status = "";
                d.rejectReason = "";
              }
            }
          }
        }
      }
      if (key == "millionPlusCities") {
        for (let objKey of millionPlusCitiesKeys) {
          if (data[key]["documents"][objKey]) {
            for (let d of data[key]["documents"][objKey]) {
              if (check) {
                if (d.status == "REJECTED") {
                  d.status = "";
                  d.rejectReason = "";
                }
              } else {
                d.status = "";
                d.rejectReason = "";
              }
            }
          }
        }
      }
    } else {
      data["status"] = "APPROVED";
    }
  }
  return data;
}

async function getRejectedStatusKey(data, keyArray = []) {
  let rejectReason = [];
  let keyFLag = keyArray && keyArray.length > 0 ? true : false;
  let status = keyFLag ? "APPROVED" : "REJECTED";
  for (key in data) {
    if (typeof data[key] === "object" && data[key] !== null) {
      if (key == "waterManagement") {
        for (let objKey of waterManagementKeys) {
          if (data[key][objKey] && data[key][objKey]["status"] == status) {
            if (keyFLag && keyArray.includes(objKey)) {
              data[key][objKey]["status"] = "";
              data[key][objKey]["rejectReason"] = "";
            } else {
              rejectReason.push(objKey);
            }
          }
        }
        // for(let d of data[key]["documents"]["wasteWaterPlan"]){
        //     if(d.status==status){
        //         if(keyFLag && keyArray.includes('wasteWaterPlan')){
        //             d.status = ''
        //             d.rejectReason = ''
        //         }
        //         else{
        //             rejectReason.push('wasteWaterPlan')
        //         }
        //     }
        // }
      }
      if (key == "solidWasteManagement") {
        for (let objKey of solidWasteManagementKeys) {
          if (data[key]["documents"][objKey]) {
            for (let d of data[key]["documents"][objKey]) {
              if (d.status == status) {
                if (keyFLag && keyArray.includes(objKey)) {
                  d.status = "";
                  d.rejectReason = "";
                } else {
                  rejectReason.push(objKey);
                }
              }
            }
          }
        }
      }
      if (key == "millionPlusCities") {
        for (let objKey of millionPlusCitiesKeys) {
          for (let d of data[key]["documents"][objKey]) {
            if (d.status == status) {
              if (keyFLag && keyArray.includes(objKey)) {
                d.status = "";
                d.rejectReason = "";
              } else {
                rejectReason.push(objKey);
              }
            }
          }
        }
      }
    } else {
      if (data["status"] == "REJECTED") {
        rejected = true;
      }
    }
  }
  /** Concat reject reason string */
  return keyFLag ? data : rejectReason;
}

/**
 *
 * @param {object} data
 */
function overAllStatus(data) {
  return new Promise((resolve, reject) => {
    let rejected = false;
    let rejectReason = [];
    let rejectDataSet = [];
    for (key in data) {
      if (typeof data[key] === "object" && data[key] !== null) {
        if (key == "waterManagement") {
          for (let objKey of waterManagementKeys) {
            if (
              data[key][objKey] &&
              data[key][objKey]["status"] == "REJECTED"
            ) {
              if (!data[key][objKey]["rejectReason"] && data["isCompleted"]) {
                reject("reject reason is missing");
              }
              rejected = true;
              let tab = "Service Level Indicators:" + mappingKeys[objKey];
              let reason = {
                [tab]: data[key][objKey]["rejectReason"],
              };
              rejectReason.push(reason);
            }
          }
          // for(let d of data[key]["documents"]["wasteWaterPlan"]){
          //     if(d.status=='REJECTED'){
          //         rejected=true;
          //         let tab = "Water Supply & Waste-Water Management:Upload Documents"
          //         if(!d.rejectReason){
          //             reject('reject reason is missing')
          //         }
          //         let reason = {
          //             [tab]:d.rejectReason
          //         }
          //         rejectReason.push(reason)
          //     }
          // }
        }

        if (key == "solidWasteManagement") {
          for (let objKey of solidWasteManagementKeys) {
            if (data[key]["documents"][objKey]) {
              for (let d of data[key]["documents"][objKey]) {
                if (d.status == "REJECTED") {
                  if (
                    (!d.rejectReason || d.rejectReason == "") &&
                    data["isCompleted"]
                  ) {
                    reject("reject reason is missing");
                  }
                  rejected = true;
                  let tab = "Upload Plans:" + mappingKeys[objKey];
                  let reason = {
                    [tab]: d.rejectReason,
                  };
                  rejectReason.push(reason);
                }
              }
            }
          }
        }
        if (key == "millionPlusCities") {
          for (let objKey of millionPlusCitiesKeys) {
            for (let d of data[key]["documents"][objKey]) {
              if (d.status == "REJECTED") {
                if (
                  (!d.rejectReason || d.rejectReason == "") &&
                  data["isCompleted"]
                ) {
                  reject("reject reason is missing");
                }
                rejected = true;
                let tab = "Upload Plans(Million+ City):" + mappingKeys[objKey];
                let reason = {
                  [tab]: d.rejectReason,
                };
                rejectReason.push(reason);
              }
            }
          }
        }
      } else {
        if (data["status"] == "REJECTED") {
          rejected = true;
        }
      }
    }
    /** Concat reject reason string */

    if (rejectReason.length > 0) {
      let finalString = rejectReason.map((obj) => {
        let service = Object.keys(obj)[0];
        let reason = obj[service];
        let s = service.split(":");
        let arr = [...s, reason];
        return arr;
        // service = `<strong>` + service + `</strong>`;
        //return `<p> ${service + ` :` + reason} </p>`;
      });
      let x = `<table border='1'>
            <tr>
                <th>Tab Name</th>
                <th>Field Name</th>
                <th>Reason for Rejection</th>
            </tr>
            `;
      for (i of finalString) {
        x += `<tr>`;
        for (t of i) {
          x += `<td>${t}</td>`;
        }
        x += `</tr>`;
      }
      x += `</table>`;
      resolve({ status: rejected, reason: x });
    }
    resolve({ status: rejected, reason: "" });
  });
}

module.exports.completeness = async (req, res) => {
  let user = req.decoded,
    data = req.body,
    _id = ObjectId(req.params._id);
  let actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE"];
  let keys = [
    "balanceSheet",
    "schedulesToBalanceSheet",
    "incomeAndExpenditure",
    "schedulesToIncomeAndExpenditure",
    "trialBalance",
    "auditReport",
  ];
  if (actionAllowed.indexOf(user.role) > -1) {
    try {
      if (user.role == "STATE") {
        let ulb = await Ulb.findOne({ _id: ObjectId(data.ulb) }).exec();
        if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
          let message = !ulb ? "Ulb not found." : "State is not matching.";
          return Response.BadRequest(res, {}, message);
        }
      }
      let prevState = await UlbFinancialData.findOne(
        { _id: _id },
        "-history"
      ).lean();
      let history = Object.assign({}, prevState);
      if (!prevState) {
        return Response.BadRequest(res, {}, "Requested record not found.");
      } else if (prevState.completeness == "APPROVED") {
        return Response.BadRequest(res, {}, "Already approved.");
      } else {
        let rejected = keys.filter((key) => {
          return (
            data[key] &&
            data[key].completeness &&
            data[key].completeness == "REJECTED"
          );
        });
        let pending = keys.filter((key) => {
          return (
            data[key] &&
            data[key].completeness &&
            data[key].completeness == "PENDING"
          );
        });
        console.log(rejected.length, pending.length);
        for (let key of keys) {
          if (data[key] && data[key].completeness) {
            prevState[key].completeness = data[key].completeness;
            prevState[key].message = data[key].message;
          }
        }
        prevState["completeness"] = pending.length
          ? "PENDING"
          : rejected.length
            ? "REJECTED"
            : "APPROVED";
        prevState["status"] =
          prevState["completeness"] == "REJECTED" ? "REJECTED" : "PENDING";
        prevState.modifiedAt = new Date();
        prevState.actionTakenBy = user._id;

        if (user.role == "ULB") {
          if (
            !data.balanceSheet ||
            data.balanceSheet.pdfUrl != "" ||
            data.balanceSheet.pdfUrl != null ||
            data.balanceSheet.excelUrl != "" ||
            data.balanceSheet.excelUrl != null
          ) {
            return Response.BadRequest(
              res,
              {},
              `balanceSheet must be provided`
            );
          }
          if (
            !data.incomeAndExpenditure ||
            data.incomeAndExpenditure.pdfUrl != "" ||
            data.incomeAndExpenditure.pdfUrl != null ||
            data.incomeAndExpenditure.excelUrl != "" ||
            data.incomeAndExpenditure.excelUrl != null
          ) {
            return Response.BadRequest(
              res,
              {},
              `incomeAndExpenditure must be provided`
            );
          }
          if (
            !data.trialBalance ||
            data.trialBalance.pdfUrl != "" ||
            data.trialBalance.pdfUrl != null ||
            data.trialBalance.excelUrl != "" ||
            data.trialBalance.excelUrl != null
          ) {
            return Response.BadRequest(
              res,
              {},
              `trialBalance must be provided`
            );
          }
          if (data.audited == true) {
            if (
              !data.auditReport ||
              data.auditReport.pdfUrl != "" ||
              data.auditReport.pdfUrl != null
            ) {
              return Response.BadRequest(
                res,
                {},
                `auditReport must be provided`
              );
            }
          }
        }

        let du = await UlbFinancialData.update(
          { _id: prevState._id },
          { $set: prevState, $push: { history: history } }
        );
        let ulbFinancialDataobj = await UlbFinancialData.findOne({
          _id: prevState._id,
        }).exec();

        if (prevState.status == "REJECTED" || prevState.status == "APPROVED") {
          let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
            prevState._id,
            "ACTION"
          );
        }
        return Response.OK(
          res,
          ulbFinancialDataobj,
          `completeness status changed to ${prevState.completeness}`
        );
      }
    } catch (e) {
      return Response.DbError(res, e.message, "Caught Database Exception");
    }
  } else {
    return Response.BadRequest(
      res,
      {},
      `This action is only allowed by ${actionAllowed.join()}`
    );
  }
};
module.exports.correctness = async (req, res) => {
  let user = req.decoded,
    data = req.body,
    _id = ObjectId(req.params._id);
  let actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE"];
  let keys = [
    "balanceSheet",
    "schedulesToBalanceSheet",
    "incomeAndExpenditure",
    "schedulesToIncomeAndExpenditure",
    "trialBalance",
    "auditReport",
  ];
  if (actionAllowed.indexOf(user.role) > -1) {
    try {
      if (user.role == "STATE") {
        let ulb = await Ulb.findOne({ _id: ObjectId(data.ulb) }).exec();
        if (!(ulb && ulb.state && ulb.state.toString() == user.state)) {
          let message = !ulb ? "Ulb not found." : "State is not matching.";
          return Response.BadRequest(res, {}, message);
        }
      }
      let prevState = await UlbFinancialData.findOne(
        { _id: _id },
        "-history"
      ).lean();
      let history = Object.assign({}, prevState);
      if (!prevState) {
        return Response.BadRequest(res, {}, "Requested record not found.");
      } else if (prevState.completeness != "APPROVED") {
        return Response.BadRequest(
          res,
          {},
          "Completeness is on allowed after correctness."
        );
      } else if (prevState.correctness == "APPROVED") {
        return Response.BadRequest(res, {}, "Already approved.");
      } else {
        let rejected = keys.filter((key) => {
          return (
            data[key] &&
            data[key].correctness &&
            data[key].correctness == "REJECTED"
          );
        });
        let pending = keys.filter((key) => {
          return (
            data[key] &&
            data[key].correctness &&
            data[key].correctness == "PENDING"
          );
        });
        console.log(rejected.length, pending.length);
        for (let key of keys) {
          if (data[key] && data[key].correctness) {
            prevState[key].correctness = data[key].correctness;
            prevState[key].message = data[key].message;
          }
        }
        prevState["correctness"] = pending.length
          ? "PENDING"
          : rejected.length
            ? "REJECTED"
            : "APPROVED";
        prevState["status"] = prevState["correctness"];
        prevState.modifiedAt = new Date();
        prevState.actionTakenBy = user._id;
        let du = await UlbFinancialData.update(
          { _id: prevState._id },
          { $set: prevState, $push: { history: history } }
        );
        let ulbFinancialDataobj = await UlbFinancialData.findOne({
          _id: prevState._id,
        }).exec();

        if (prevState.status == "REJECTED" || prevState.status == "APPROVED") {
          let email = await Service.emailTemplate.sendFinancialDataStatusEmail(
            prevState._id,
            "ACTION"
          );
        }
        return Response.OK(
          res,
          ulbFinancialDataobj,
          `correctness status changed to ${prevState.correctness}`
        );
      }
    } catch (e) {
      console.log(e);
      return Response.DbError(res, e.message, "Caught Database Exception");
    }
  } else {
    return Response.BadRequest(
      res,
      {},
      `This action is only allowed by ULB ${actionAllowed.join()}`
    );
  }
};
module.exports.getApprovedFinancialData = async (req, res) => {
  try {
    let year = req.query.year
      ? req.query.year.length
        ? req.query.year
        : null
      : null;
    let ulb = req.query.ulb
      ? req.query.ulb.length
        ? req.query.ulb
        : null
      : null;
    let condition = {};
    year = year ? year.split(",") : null;
    ulb = ulb ? ulb.split(",") : null;
    year ? (condition["financialYear"] = { $in: year }) : null;
    ulb = ulb ? ulb.map((x) => ObjectId(x)) : null;
    ulb ? (condition["ulb"] = { $in: ulb }) : null;

    let user = req.decoded,
      filter = req.query.filter
        ? JSON.parse(req.query.filter)
        : req.body.filter
          ? req.body.filter
          : {},
      sort = req.query.sort
        ? JSON.parse(req.query.sort)
        : req.body.sort
          ? req.body.sort
          : {},
      skip = req.query.skip ? parseInt(req.query.skip) : 0,
      limit = req.query.limit ? parseInt(req.query.limit) : 50,
      csv = req.query.csv;
    let q = [
      { $match: { status: "APPROVED" } },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulb.ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      {
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$ulb" },
      { $unwind: "$ulbType" },
      { $unwind: "$state" },
      {
        $project: {
          _id: 1,
          audited: 1,
          financialYear: 1,
          ulbType: "$ulbType.name",
          ulb: "$ulb._id",
          ulbName: "$ulb.name",
          ulbCode: "$ulb.code",
          state: "$state._id",
          stateName: "$state.name",
          stateCode: "$state.code",
          /*"balanceSheet.pdfUrl":1,
                    "balanceSheet.excelUrl":1,
                    "schedulesToBalanceSheet.pdfUrl":1,
                    "schedulesToBalanceSheet.excelUrl":1,
                    "incomeAndExpenditure.pdfUrl":1,
                    "incomeAndExpenditure.excelUrl":1,
                    "schedulesToIncomeAndExpenditure.pdfUrl":1,
                    "schedulesToIncomeAndExpenditure.excelUrl":1,
                    "trialBalance.pdfUrl":1,
                    "trialBalance.excelUrl":1,
                    "auditReport.pdfUrl":1,
                    "auditReport.excelUrl":1*/
        },
      },
      { $match: condition },
    ];
    let newFilter = await Service.mapFilter(filter);
    let total = undefined;
    if (newFilter && Object.keys(newFilter).length) {
      q.push({ $match: newFilter });
    }
    if (sort && Object.keys(sort).length) {
      q.push({ $sort: sort });
    }
    if (csv) {
      let arr = await UlbFinancialData.aggregate(q).exec();
      let xlsData = await Service.dataFormating(arr, {
        stateName: "State",
        ulbName: "ULB name",
        ulbCode: "ULB Code",
        financialYear: "Financial Year",
        auditStatus: "Audit Status",
        status: "Status",
      });
      return res.xls("financial-data.xlsx", xlsData);
    } else {
      if (!skip) {
        let qrr = [...q, { $count: "count" }];
        let d = await UlbFinancialData.aggregate(qrr);
        total = d.length ? d[0].count : 0;
      }
      /* q.push({$skip: skip});
            q.push({$limit: limit});*/
      let arr = await UlbFinancialData.aggregate(q).exec();
      return res.status(200).json({
        timestamp: moment().unix(),
        success: true,
        message: "Ulb update request list",
        data: arr,
        total: total,
      });
    }
  } catch (e) {
    return Response.BadRequest(res, e, e.message);
  }
};
module.exports.sourceFiles = async (req, res) => {
  try {
    let lh_id = ObjectId(req.decoded.lh_id); // Login history id
    let _id = ObjectId(req.params._id);
    let select = {
      "balanceSheet.pdfUrl": 1,
      "balanceSheet.excelUrl": 1,
      "schedulesToBalanceSheet.pdfUrl": 1,
      "schedulesToBalanceSheet.excelUrl": 1,
      "incomeAndExpenditure.pdfUrl": 1,
      "incomeAndExpenditure.excelUrl": 1,
      "schedulesToIncomeAndExpenditure.pdfUrl": 1,
      "schedulesToIncomeAndExpenditure.excelUrl": 1,
      "trialBalance.pdfUrl": 1,
      "trialBalance.excelUrl": 1,
      "auditReport.pdfUrl": 1,
      "auditReport.excelUrl": 1,
      "overallReport.pdfUrl": 1,
      "overallReport.excelUrl": 1,
    };
    let data = await UlbFinancialData.find({ _id: _id }, select).exec();
    let lh = await LoginHistory.update(
      { _id: lh_id },
      { $push: { reports: _id } }
    );
    return Response.OK(res, data.length ? getSourceFiles(data[0]) : {});
  } catch (e) {
    return Response.DbError(res, e);
  }
};
function getSourceFiles(obj) {
  let o = {
    pdf: [],
    excel: [],
  };
  obj.balanceSheet && obj.balanceSheet.pdfUrl
    ? o.pdf.push({ name: "Balance Sheet", url: obj.balanceSheet.pdfUrl })
    : "";
  obj.balanceSheet && obj.balanceSheet.excelUrl
    ? o.excel.push({
      name: "Balance Sheet",
      url: obj.balanceSheet.excelUrl,
    })
    : "";

  obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.pdfUrl
    ? o.pdf.push({
      name: "Schedules To Balance Sheet",
      url: obj.schedulesToBalanceSheet.pdfUrl,
    })
    : "";
  obj.schedulesToBalanceSheet && obj.schedulesToBalanceSheet.excelUrl
    ? o.excel.push({
      name: "Schedules To Balance Sheet",
      url: obj.schedulesToBalanceSheet.excelUrl,
    })
    : "";

  obj.incomeAndExpenditure && obj.incomeAndExpenditure.pdfUrl
    ? o.pdf.push({
      name: "Income And Expenditure",
      url: obj.incomeAndExpenditure.pdfUrl,
    })
    : "";
  obj.incomeAndExpenditure && obj.incomeAndExpenditure.excelUrl
    ? o.excel.push({
      name: "Income And Expenditure",
      url: obj.incomeAndExpenditure.excelUrl,
    })
    : "";

  obj.schedulesToIncomeAndExpenditure &&
    obj.schedulesToIncomeAndExpenditure.pdfUrl
    ? o.pdf.push({
      name: "Schedules To Income And Expenditure",
      url: obj.schedulesToIncomeAndExpenditure.pdfUrl,
    })
    : "";
  obj.schedulesToIncomeAndExpenditure &&
    obj.schedulesToIncomeAndExpenditure.excelUrl
    ? o.excel.push({
      name: "Schedules To Income And Expenditure",
      url: obj.schedulesToIncomeAndExpenditure.excelUrl,
    })
    : "";

  obj.trialBalance && obj.trialBalance.pdfUrl
    ? o.pdf.push({ name: "Trial Balance", url: obj.trialBalance.pdfUrl })
    : "";
  obj.trialBalance && obj.trialBalance.excelUrl
    ? o.excel.push({
      name: "Trial Balance",
      url: obj.trialBalance.excelUrl,
    })
    : "";

  obj.auditReport && obj.auditReport.pdfUrl
    ? o.pdf.push({ name: "Audit Report", url: obj.auditReport.pdfUrl })
    : "";
  obj.auditReport && obj.auditReport.excelUrl
    ? o.excel.push({ name: "Audit Report", url: obj.auditReport.excelUrl })
    : "";

  obj.overallReport && obj.overallReport.pdfUrl
    ? o.pdf.push({ name: "Overall Report", url: obj.overallReport.pdfUrl })
    : "";
  obj.overallReport && obj.overallReport.excelUrl
    ? o.excel.push({
      name: "Overall Report",
      url: obj.overallReport.excelUrl,
    })
    : "";

  return o;
}

module.exports.XVFCStateForm = async (req, res) => {
  let user = req.decoded;
  let data = req.body;
  if (user.role == "STATE") {
    data.modifiedAt = time();
    let query = {};
    data["state"] = ObjectId(user.state);
    query["state"] = data["state"];
    Service.put(query, data, XVStateForm, async function (response, value) {
      if (response) {
        return res.status(response ? 200 : 400).send(value);
      } else {
        return Response.DbError(res, err, "Failed to create entry");
      }
    });
  } else {
    return Response.BadRequest(res, {}, "This action is only allowed by STATE");
  }
};

module.exports.getXVFCStateForm = async (req, res) => {
  let user = req.decoded;
  let skip = req.query.skip ? parseInt(req.query.skip) : 0;
  let limit = req.query.limit ? parseInt(req.query.limit) : 10;
  let csv = req.query.csv;
  let query = {};
  query["isActive"] = true;
  query["$or"] = [
    { grantTransferCertificate: { $ne: null } },
    { serviceLevelBenchmarks: { $ne: null } },
    { utilizationReport: { $ne: null } },
  ];
  if (user.role == "STATE") {
    query["state"] = ObjectId(user.state);
  }
  let actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE"];
  if (actionAllowed.indexOf(user.role) > -1) {
    if (csv) {
      let field = {
        state: "State Name",
        grantTransferCertificate:
          "Grant transfer certificate signed by Principal secretary/ secretary(UD)",
        utilizationReport:
          "Utilization report signed by Principal secretary/ secretary (UD)",
        serviceLevelBenchmarks:
          "Letter signed by Principal secretary/ secretary (UD) confirming submission of service level benchmarks by all ULBs",
      };
      let q = [
        {
          $match: query,
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
          $project: {
            state: "$state.name",
            grantTransferCertificate: {
              $arrayElemAt: ["$grantTransferCertificate", 0],
            },
            serviceLevelBenchmarks: {
              $arrayElemAt: ["$serviceLevelBenchmarks", 0],
            },
            utilizationReport: {
              $arrayElemAt: ["$utilizationReport", 0],
            },
          },
        },
        {
          $project: {
            state: 1,
            grantTransferCertificate: {
              $cond: {
                if: {
                  $eq: ["$grantTransferCertificate", null],
                },
                then: "N/A",
                else: "$grantTransferCertificate.url",
              },
            },
            utilizationReport: {
              $cond: {
                if: { $eq: ["$utilizationReport", null] },
                then: "N/A",
                else: "$utilizationReport.url",
              },
            },
            serviceLevelBenchmarks: {
              $cond: {
                if: { $eq: ["$serviceLevelBenchmarks", null] },
                then: "N/A",
                else: "$serviceLevelBenchmarks.url",
              },
            },
          },
        },
      ];
      let arr = await XVStateForm.aggregate(q).exec();
      if(arr.length)  updateURLs(arr);
      let xlsData = await Service.dataFormating(arr, field);
      let filename =
        "state-form" + moment().format("DD-MMM-YY HH:MM:SS") + ".xlsx";
      return res.xls(filename, xlsData);
    }

    let total = await XVStateForm.count(query).exec();
    let data = await XVStateForm.find(query)
      .populate([{ path: "state", select: "name" }])
      .skip(skip)
      .limit(limit)
      .exec();
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: "list",
      data: data,
      total: total,
    });
  } else {
    return Response.BadRequest(res, {}, "This action is only allowed");
  }
};

module.exports.getXVFCStateFormById = async (req, res) => {
  let user = req.decoded;
  actionAllowed = ["STATE", "ADMIN", "MoHUA", "PARTNER"];
  if (actionAllowed.indexOf(user.role) > -1) {
    let query = {};
    query["state"] = req.params.state
      ? ObjectId(req.params.state)
      : ObjectId(user.state);
    let data = await XVStateForm.findOne(query)
      .populate([{ path: "state", select: "name" }])
      .exec();
    return Response.OK(res, data, "Request fetched.");
  } else {
    return Response.BadRequest(
      res,
      {},
      "This action is only allowed for STATE User"
    );
  }
};

/**
 *
 * @param {Express.Request} req
 * @param {Express.Response} res
 */
module.exports.state = async (req, res) => {
  console.dir(req.query);
  let q = [
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "users",
        localField: "actionTakenBy",
        foreignField: "_id",
        as: "actionTakenBy",
      },
    },
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
        from: "states",
        localField: "ulb.state",
        foreignField: "_id",
        as: "state",
      },
    },
    { $unwind: "$state" },
    { $unwind: "$actionTakenBy" },
  ];
  if (req.query.formStatus === "draft-by-MoHUA") {
    q.push({
      $match: { status: "PENDING", "actionTakenBy.role": "MoHUA" },
    });
  } else if (req.query.formStatus === "under-review-by-MoHUA") {
    q.push({
      $match: { status: "APPROVED", "actionTakenBy.role": "STATE" },
    });
  } else {
    q.push({
      $match: {
        $or: [
          { status: "APPROVED", "actionTakenBy.role": "STATE" },
          { status: "PENDING", "actionTakenBy.role": "MoHUA" },
        ],
      },
    });
  }

  q.push({ $group: { _id: { name: "$state.name", _id: "$state._id" } } });
  q.push({
    $project: {
      name: "$_id.name",
      _id: "$_id._id",
    },
  });

  // return res.send({q})
  let arr = await XVFCGrantULBData.aggregate(q).exec();
  return res.status(200).json({
    timestamp: moment().unix(),
    success: true,
    message: "list",
    data: arr,
  });
};

module.exports.addFlag = async (req, res) => {
  await XVFCGrantULBData.aggregate([{
    $match: {
      design_year: ObjectId("606aaf854dff55e6c075d219")
    }
  },
  {
    $addFields: { blank: false }
  }
  ])
}

module.exports.getUAwiseCSV = catchAsync (async (req,res) => {
let uaIDs = await UA.find().select("_id").lean()

let finalData = []
let x = 1;
let data = await axios.post(`https://${process.env.PROD_HOST}/api/v1/login`, {
  "email":`admin@${process.env.PROD_HOST}`,
  "password":"admin007@cityfinance"
})

for(let el of uaIDs ){
  await axios.get(`https://${process.env.PROD_HOST}/api/v1/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${el._id}`,
  { params:{}, headers: { "x-access-token": data?.data?.token } }
  ).then(function(response) {
 

   finalData.push(response.data.data)

}).catch(function(error) {


});

}
  
  

 console.log(util.inspect(finalData, {showHidden: false, depth: null}))
let printData = {}
let totalDataa = []
 finalData.forEach(el => {
   Object.assign(printData, el[0]);
   if(el[1].completedAndpendingSubmission.length){
    let arr = []
    el[1].completedAndpendingSubmission.forEach(el2 => {
  
      arr.push(el2.name)
      
    })
    Object.assign(printData, {"pending": arr })

   }
totalDataa.push(printData)
printData = {}
 })
 console.log('printData',totalDataa)
res.status(200).json({
  success: true,
  data: totalDataa
})
})

exports.newFormAction = async (req, res) => {
  try {
    const data = req.body,
      user = req.decoded;
    const { design_year } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    req.body.actionTakenByRole = user.role;
    req.body.modifiedAt = new Date();

    let currentState = await XVFCGrantULBData.findOne(
      { ulb: ObjectId(data.ulb), design_year, isActive: true },
      { history: 0 }
    );

    if (!currentState) {
      return res.status(400).json({ msg: "Requested record not found." });
    } else {
      let updatedRecord = await XVFCGrantULBData.findOneAndUpdate(
        { ulb: ObjectId(data.ulb), isActive: true, design_year },
        { $set: req.body, $push: { history: currentState } }
      );
      if (!updatedRecord) {
        return res.status(400).json({ msg: "No Record Found" });
      }
      req.body.status = req.body.waterManagement.status;
      req.body.rejectReason = req.body.waterManagement.rejectReason;
      await UpdateMasterSubmitForm(req, "slbForWaterSupplyAndSanitation");
      updatedRecord.history = null;
      let waterManagement = updatedRecord.waterManagement;
      return res.status(200).json({
        msg: "Action successful",
        waterManagement: { status: data.status },
      });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};


/**
 * The function `updateURLs` takes an array of entities, clones each entity, concatenates the URLs
 * within each entity, and returns the updated array.
 */
function updateURLs(arr) {
  try{
    let index = 0;
    for (let entity of arr) {
      entity = JSON.parse(JSON.stringify(entity));
      let urlParams = {
        grantTransferCertificate: "grantTransferCertificate",
        serviceLevelBenchmarks: "serviceLevelBenchmarks",
        utilizationReport: "utilizationReport",
      };
      for(let key in urlParams){
        if(entity[key] === "N/A"){
          delete urlParams[key]
        }
      }
      arr[index] = concatenateUrls(entity, urlParams);
      index++;
    }
  }catch(e){
    throw {message: `updateUrls: ${e.message}`}
  }
}

async function update28SlbForms(ulbData){
  try{
    // query.design_year = design_year_2223;
    let yearsIds = [...ulbData.accessibleForYears]
    yearsIds = yearsIds.map(item => ObjectId(item));
    // let ulbUA =  await Ulb.findOne({_id: ulbData?.ulb},{UA:1}).lean();
    // if(!ulbUA?.UA){
    //    yearsIds = yearsIds.filter(year=> ![YEAR_CONSTANTS['24_25']].includes(year.toString()));
    // }
    let query = {}
    query["ulb"] = ulbData.ulb;
    query["design_year"] = {"$in":yearsIds}
    let slb28Forms = await TwentyEightSlbForm.find(query).lean();
    for(let slb28Form of slb28Forms){
      if (slb28Form) {
        let year = getKeyByValue(years,slb28Form.design_year.toString())
        let spilltedYear = year.split("-")
        let updationQuery = {
          "_id":slb28Form._id
        }
        let targetValidator = `${spilltedYear[0].slice(-2)}${spilltedYear[1]}`
        let slb28FormStatus = calculateStatus(
          slb28Form.status,
          slb28Form.actionTakenByRole,
          slb28Form.isDraft,
          "ULB"
        );
        if(slb28Form.status === ""){
          slb28FormStatus = MASTER_STATUS_ID[slb28Form.currentFormStatus] || "Not Started"
        }
        /* Checking if the form status is in progress, rejected by MoHUA or rejected by state. */
        if (
          [
            FORM_STATUS.In_Progress,
            FORM_STATUS.Rejected_By_MoHUA,
            FORM_STATUS.Rejected_By_State,
            FORM_STATUS.STATE_REJECTED,
          ].includes(slb28FormStatus)
        ) {
          slb28Form["data"].forEach((element) => {
            /* Checking if the element is equal to the previous line item. */
            if (
              element["indicatorLineItem"].toString() ===
              PrevLineItem_CONSTANTS[
                "Coverage of water supply connections"
              ]
            ) {
              element.target_1.value = ulbData?.waterManagement
                .houseHoldCoveredPipedSupply.target[targetValidator]
                ? Number(
                    ulbData?.waterManagement.houseHoldCoveredPipedSupply
                      ?.target[targetValidator]
                  )
                : "";
              element.targetDisable = true
            }
            if (
              element["indicatorLineItem"].toString() ===
              PrevLineItem_CONSTANTS["Per capita supply of water(lpcd)"]
            ) {
              element.target_1.value = ulbData?.waterManagement
                .waterSuppliedPerDay.target[targetValidator]
                ? Number(
                    ulbData?.waterManagement.waterSuppliedPerDay?.target[
                      targetValidator
                    ]
                  )
                : "";
                element.targetDisable = true
            }
            if (
              element["indicatorLineItem"].toString() ===
              PrevLineItem_CONSTANTS["Extent of non-revenue water (NRW)"]
            ) {
              element.target_1.value = ulbData?.waterManagement.reduction
                .target[targetValidator]
                ? Number(
                    ulbData?.waterManagement.reduction?.target[targetValidator]
                  )
                : "";
                element.targetDisable = true
            }
            if (
              element["indicatorLineItem"].toString() ===
              PrevLineItem_CONSTANTS[
                "Coverage of waste water network services"
              ]
            ) {
              element.target_1.value = ulbData?.waterManagement
                .houseHoldCoveredWithSewerage.target[targetValidator]
                ? Number(
                    ulbData?.waterManagement.houseHoldCoveredWithSewerage
                      ?.target[targetValidator]
                  )
                : "";
                element.targetDisable = true
            }
          });
        }
        let slb28UpdatedForm = await TwentyEightSlbForm.findOneAndUpdate(
          updationQuery,
          {
            $set: {
              data: slb28Form["data"],
            },
          }
        ).lean();
      }
    }
  }
  catch(err){
    console.log(err)
    console.log("error in update28SlbForms :::: ",err.message)
  }
}