const catchAsync = require('../../util/catchAsync')
const UA = require('../../models/UA')
const ExcelJS = require("exceljs")
const ObjectId = require('mongoose').Types.ObjectId;
const State = require('../../models/State')
const Ulb = require('../../models/Ulb')
const Category = require('../../models/Category')
const DUR = require("../../models/UtilizationReport")
const SLBData = require('../../models/XVFcGrantForm')
const GFC = require('../../models/GfcFormCollection')
const ODF = require('../../models/OdfFormCollection')
const Year = require("../../models/Year")
const SLB28 = require('../../models/TwentyEightSlbsForm')
const fs = require("fs")
const xlstojson = require("xls-to-json-lc")
const xlsxtojson = require("xlsx-to-json-lc")
const UaFileList = require("../../models/UAFileList")
const { years } = require("../../service/years")
const GlobalService = require('../../service');
const axios = require('axios')
const { sendCsv, apiUrls } = require("../../routes/CommonActionAPI/service")
const { calculateSlbMarks } = require('../Scoring/service');
const { ulb } = require('../../util/userTypes');
const { columns, csvCols, sortFilterKeys, dashboardColumns, filterYears, types } = require("./constants.js")
const Redis = require("../../service/redis")
const { AggregationServices } = require("../../routes/CommonActionAPI/service");
const { YEAR_CONSTANTS, FORMIDs, FormNames, MASTER_STATUS, MASTER_FORM_STATUS } = require('../../util/FormNames');
const { getKeyByValue } = require('../../util/masterFunctions');
const AmrutReports = require('../../models/AmrutReports');
const lineItemIndicatorIDs = [
    "6284d6f65da0fa64b423b52a",
    "6284d6f65da0fa64b423b53a",
    "6284d6f65da0fa64b423b53c",
    "6284d6f65da0fa64b423b540"

]
const recommendationSlab = (score) => {
    switch (score) {
        case score >= 0 && score <= 29:
            return 0;
            break;
        case score >= 30 && score <= 45:
            return 60;
            break;
        case score >= 46 && score <= 60:
            return 75;
            break;
        case score >= 61 && score <= 80:
            return 90;
            break;
        case score >= 81 && score <= 100:
            return 100;
            break;

        default:
            break;
    }
}

module.exports.getAll = catchAsync(async (req, res) => {
    let user = req.decoded;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    if (user.role === "STATE") {
        let state = user.state;
        let arr = await UA.find({ "state": ObjectId(state) })
        if (arr.length > 0) {
            return res.status(200).json({
                success: true,
                message: "UA List Found Successfully",
                data: arr,
                total: arr.length
            })
        } else {
            return res.status(404).json({
                success: false,
                message: "No UA List Found"
            })
        }
    } else if (user.role === "ADMIN" || "MoHUA" || "PARTNER") {
        let arr = await UA.find({})
        if (arr.length > 0) {
            return res.status(200).json({
                success: true,
                message: "UA List Found Successfully",
                data: arr,
                total: arr.length
            })
        } else {
            return res.status(404).json({
                success: false,
                message: "No UA List Found"
            })
        }
    } else {
        return res.status(403).json({
            success: false,
            message: user.role + " is Not Authorized to perform this Action"
        })
    }


})
module.exports.create = catchAsync(async (req, res) => {
    let user = req.decoded;
    let data = req.body;
    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'User Not Found'
        })
    }
    if (user.role === 'ADMIN') {
        let state = data.state;
        let stateData = await State.findOne({ "name": state })
        if (!stateData) {
            return res.status(400).json({
                success: false,
                message: 'UA Data NOT Stored'
            })
        }
        data['state'] = ObjectId(stateData._id);
        let UA = new UAData(data)
        let uaData = await UA.save()
        if (uaData) {
            return res.status(200).json({
                success: true,
                message: 'UA Data Stored Successfully',
                data: uaData
            })
        } else {
            return res.status(400).json({
                success: false,
                message: 'UA Data NOT Stored'
            })
        }
    } else {
        return res.status(403).json({
            success: false,
            message: 'Not Authenticated to Perform this Action'
        })
    }
})

module.exports.update = catchAsync(async (req, res) => {
    let data = req.body;
    let UA_name = data.UA_name;
    let ULBs = data.ULBs_to_be_removed;
    let UA_Data = await UA.findOne({ name: UA_name });
    let All_Ulbs = UA_Data['ulb']

    let delete_ulbs = []
    for (let el of ULBs) {
        let ulbData = await Ulb.findOne({ censusCode: el })
        delete_ulbs.push((ulbData._id))
    }
    console.log('All ULBs', All_Ulbs)

    console.log('Delete ULBs', delete_ulbs)

    let filtered_Ulbs = []

    for (let el of All_Ulbs) {
        let flag
        for (let el2 of delete_ulbs) {
            flag = 0;
            if (String(el2) == String(el)) {
                console.log('match', el2, el)
                flag = 1;
                break;
            }

        }
        if (!flag)
            filtered_Ulbs.push(el)
    }
    console.log(filtered_Ulbs)
    UA_Data.ulb = filtered_Ulbs;
    await UA_Data.save();
    return res.json({
        success: true
    })

})
const design_year_2122 = ObjectId("606aaf854dff55e6c075d219")
module.exports.get2223 = catchAsync(async (req, res) => {
    let uaId = req.query.ua;
    let design_year = req.query.design_year;
    let slbApproved = {
        count: 0,
        ulbs: [
        ]
    }, slbPending = {
        count: 0,
        ulbs: [
        ]
    }, gfcApproved = {
        count: 0,
        ulbs: [

        ]
    }, gfcPending = {
        count: 0,
        ulbs: [

        ]
    }, odfPending = {
        count: 0,
        ulbs: [

        ]
    }, odfApproved = {
        count: 0,
        ulbs: [

        ]
    }
    if (!uaId || !design_year) {
        return res.status(404).json({
            success: false,
            message: "UA ID and Design Year is Required"
        })
    }
    let responseObj = {
        totalUlbs: 0,
        fourSLB: {
            data: {},
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            }
        },
        gfc: {
            score: 0,
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            }
        },
        odf: {
            score: 0,
            approved: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            },
            pending: {
                count: 2,
                ulbs: [
                    {
                        ulbName: "",
                        censusCode: ""
                    },
                    {
                        ulbName: "",
                        censusCode: ""
                    }
                ]
            }
        }
    }

    let uaData =  await UA.findOne({ _id: ObjectId(uaId) }).lean();
    let ulbs = []

    ulbs = uaData.ulb;
    let ulbData = await Ulb.find({_id:{$in:ulbs}}).lean();
    responseObj.totalUlbs = ulbs.length
    let slbdata = await Ulb.aggregate([
        {
            $match: {

                _id: { $in: ulbs }
            }
        },
        {
            $lookup: {
                from: "xvfcgrantulbforms",
                let: {
                    firstUser: design_year_2122,
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
    ])
    let TEslbdata = await Ulb.aggregate([
        {
            $match: {

                _id: { $in: ulbs }
            }
        },
        {
            $lookup: {
                from: "twentyeightslbforms",
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
                as: "twentyeightslbforms",
            },
        },
        {
            $unwind: {
                path: "$twentyeightslbforms",
                preserveNullAndEmptyArrays: true,
            },
        },
    ])
    let TEslbdata2 =[];
    if(![YEAR_CONSTANTS['21_22'],YEAR_CONSTANTS['22_23'] ].includes(design_year)){
        TEslbdata2 = await getTwentyEightSLb2223Data(TEslbdata2, ulbs);
    }
    if (slbdata.length) {
      slbdata.forEach((el) => {
        if (
          el.hasOwnProperty("xvfcgrantulbforms") &&
          Object.keys(el.xvfcgrantulbforms).length > 0
        ) {
          if (TEslbdata.length) {
            TEslbdata.forEach((el2) => {
              if (
                el2.hasOwnProperty("twentyeightslbforms") &&
                Object.keys(el2.twentyeightslbforms).length > 0
              ) {
                if (el._id.toString() == el2._id.toString()) {
                  if (
                    (el.xvfcgrantulbforms.waterManagement.status ==
                      "APPROVED" &&
                      el2.twentyeightslbforms.status == "APPROVED") ||
                    [MASTER_STATUS["Under Review By MoHUA"]].includes(
                      el2.twentyeightslbforms?.currentFormStatus
                    )
                  ) {
                    slbApproved.count += 1;
                    slbApproved.ulbs.push({
                      ulbName: el2.name,
                      censusCode: el2.censusCode ?? el2.sbCode,
                    });
                  } else {
                    slbPending.count += 1;
                    slbPending.ulbs.push({
                      ulbName: el2.name,
                      censusCode: el2.censusCode ?? el2.sbCode,
                    });
                  }
                }
              } else {
                slbPending.count += 1;
                slbPending.ulbs.push({
                  ulbName: el2.name,
                  censusCode: el2.censusCode ?? el2.sbCode,
                });
              }
            });
          }
        } else {
          slbPending.count += 1;
          slbPending.ulbs.push({
            ulbName: el.name,
            censusCode: el.censusCode ?? el.sbCode,
          });
        }
      });
    }
    //get slbApproved and pending count
    get28SLB2223Data(design_year, TEslbdata2, slbApproved, slbPending);
    if (
      ![YEAR_CONSTANTS["21_22"], YEAR_CONSTANTS["22_23"]].includes(design_year)
    ) {
      slbApproved.ulbs = removeApproved(slbPending.ulbs, slbApproved.ulbs);
      slbPending.ulbs = removeDuplicates(slbPending.ulbs);
      slbApproved.ulbs = removeDuplicates(slbApproved.ulbs);
    }
    slbPending.count = slbPending.ulbs.length;
    slbApproved.count = slbApproved.ulbs.length;

    let gfcData = await Ulb.aggregate([
        {
            $match: {

                _id: { $in: ulbs }
            }
        },
        {
            $lookup: {
                from: "gfcformcollections",
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
                as: "gfcformcollections",
            },
        },
        {
            $unwind: {
                path: "$gfcformcollections",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {

                from: "ratings",
                localField: "gfcformcollections.rating",
                foreignField: "_id",
                as: "rating"
            }
        }, {
            $unwind: "$rating"
        }
    ])
    if (gfcData) {
        gfcData.forEach(el => {
            if (el.hasOwnProperty("gfcformcollections") && Object.keys(el.gfcformcollections).length > 0) {
                if (el.gfcformcollections.status == "APPROVED" || [MASTER_STATUS['Under Review By MoHUA']].includes(el.gfcformcollections.currentFormStatus)) {
                    gfcApproved.count += 1;
                    gfcApproved.ulbs.push({
                        ulbName: el.name,
                        censusCode: el.censusCode ?? el.sbCode
                    })
                } else {
                    gfcPending.count += 1
                    gfcPending.ulbs.push({
                        ulbName: el.name,
                        censusCode: el.censusCode ?? el.sbCode
                    })
                }
            } else {
                gfcPending.count += 1
                gfcPending.ulbs.push({
                    ulbName: el.name,
                    censusCode: el.censusCode ?? el.sbCode
                })
            }

        });
    }

    let odfData = await Ulb.aggregate([
        {
            $match: {

                _id: { $in: ulbs }
            }
        },
        {
            $lookup: {
                from: "odfformcollections",
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
                as: "odfformcollections",
            },
        },
        {
            $unwind: {
                path: "$odfformcollections",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {

                from: "ratings",
                localField: "odfformcollections.rating",
                foreignField: "_id",
                as: "rating"
            }
        }, {
            $unwind: "$rating"
        }
    ])
    if (odfData) {
        odfData.forEach(el => {
            if (el.hasOwnProperty("odfformcollections") && Object.keys(el.odfformcollections).length > 0) {
                if (el.odfformcollections.status == "APPROVED" || [MASTER_STATUS['Under Review By MoHUA']].includes(el.odfformcollections.currentFormStatus)) {
                    odfApproved.count += 1;
                    odfApproved.ulbs.push({
                        ulbName: el.name,
                        censusCode: el.censusCode ?? el.sbCode
                    })
                } else {
                    odfPending.count += 1
                    odfPending.ulbs.push({
                        ulbName: el.name,
                        censusCode: el.censusCode ?? el.sbCode
                    })
                }
            } else {
                odfPending.count += 1
                odfPending.ulbs.push({
                    ulbName: el.name,
                    censusCode: el.censusCode ?? el.sbCode
                })
            }

        });
    }
    if(![YEAR_CONSTANTS['21_22'],YEAR_CONSTANTS['22_23'] ].includes(design_year)){
        gfcPending.ulbs = checkUlbFormStatus(ulbData, gfcApproved, gfcPending);
        odfPending.ulbs = checkUlbFormStatus(ulbData, odfApproved, odfPending);

      }
    responseObj.fourSLB.approved = slbApproved
    responseObj.fourSLB.pending = slbPending
    responseObj.gfc.approved = gfcApproved
    responseObj.gfc.pending = gfcPending
    responseObj.odf.approved = odfApproved
    responseObj.odf.pending = odfPending

    if (responseObj.fourSLB.pending.count === ulbs.length ||
        responseObj.gfc.pending.count === ulbs.length ||
        responseObj.odf.pending.count === ulbs.length
    ) {
        if(![YEAR_CONSTANTS['21_22'],YEAR_CONSTANTS['22_23'] ].includes(design_year)){
            responseObj = updateResponse(responseObj, true)
            return res.status(200).json({
                success: true,
                data: responseObj
            })
        }
        return res.status(200).json({
            data: responseObj,
            message: "Insufficient Data",
            ans: 0
        })
    }

    let slbWeigthed = {}
    // console.log(uaId,`${process.env.BASEURL}/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${uaId}` )
    await axios
      .get(
        `https://${process.env.STAGING_HOST}/api/v1/xv-fc-form/state/606aaf854dff55e6c075d219?ua_id=${uaId}`
      )
      .then(function (response) {
        slbWeigthed = response.data.data[0];
      })
      .catch(function (error) {
        console.log("Not Fetched", error.message);
      });

    //   return res.json(slbWeigthed);
    slbWeigthed = roundOffToTwoDigits(slbWeigthed);
    Object.assign(responseObj.fourSLB.data, slbWeigthed)
    // let usableData = []
    let arr = []
    let filteredData = []
    TEslbdata.forEach(el => {
        if (el.hasOwnProperty("twentyeightslbforms")) {
            filteredData = el.twentyeightslbforms.data.filter((el2) =>
                lineItemIndicatorIDs.includes(el2.indicatorLineItem.toString())
            );
        }
        arr.push({
            data: filteredData,
            population: el.population,
        });


    })
    let numerator = [{ id: "", value: 0 }, { id: "", value: 0 }, { id: "", value: 0 }, { id: "", value: 0 }], popData = [{ id: "", value: 0 }, { id: "", value: 0 }, { id: "", value: 0 }, { id: "", value: 0 }]
    arr.forEach(el => {
        el.data.forEach((el2, index) => {
            numerator[index]['id'] = el2.indicatorLineItem.toString()
            numerator[index]['value'] += el2.actual.value * el.population
            popData[index]['value'] += el.population
            popData[index]['id'] = el2.indicatorLineItem.toString()
        })
    })




    let wtAvgSLB = [];
    let year = design_year === YEAR_CONSTANTS["23_24"] ? "2223" : "2122";
    
    numerator.forEach((el, index) => {
        wtAvgSLB.push({ value: numerator[index].value / popData[index].value, id: numerator[index].id })
        if (el.id == lineItemIndicatorIDs[0]) {
            Object.assign(slbWeigthed, {
                [`houseHoldCoveredWithSewerage_actual${year}`]: wtAvgSLB[index].value,
            })

        } else if (el.id == lineItemIndicatorIDs[1]) {
            Object.assign(slbWeigthed, {
                [`houseHoldCoveredPipedSupply_actual${year}`]: wtAvgSLB[index].value,
            })
        } else if (el.id == lineItemIndicatorIDs[2]) {
            Object.assign(slbWeigthed, {
                [`waterSuppliedPerDay_actual${year}`]: wtAvgSLB[index].value,
            })
        } else if (el.id == lineItemIndicatorIDs[3]) {
            Object.assign(slbWeigthed, {
                [`reduction_actual${year}`]: wtAvgSLB[index].value,
            })
        }
    })
    //   Object.assign(slbWeigthed, {
    //     "houseHoldCoveredWithSewerage_actual2122": wtAvgSLB[0],
    //     "houseHoldCoveredPipedSupply_actual2122": wtAvgSLB[1],
    //     "waterSuppliedPerDay_actual2122": wtAvgSLB[2],
    //     "reduction_actual2122": wtAvgSLB[3]
    //   })
    slbWeigthed = roundOffToTwoDigits(slbWeigthed);
    let scores = calculateSlbMarks(slbWeigthed, false)
    Object.assign(slbWeigthed, {
        "houseHoldCoveredWithSewerage_score": scores[2],
        "houseHoldCoveredPipedSupply_score": scores[3],
        "waterSuppliedPerDay_score": scores[0],
        "reduction_score": scores[1],
    })
    let numeratorGFC = 0, popDataGFC = 0
    gfcData.forEach((el2, index) => {
        numeratorGFC += el2.rating.marks * el2.population
        popDataGFC += el2.population
    })
    if(gfcData.length){
        responseObj.gfc.score = Number((numeratorGFC / popDataGFC).toFixed(2));
    }else{
        responseObj.gfc.score = 0;
    }

    let numeratorOdf = 0, popDataOdf = 0
    odfData.forEach((el2, index) => {
        numeratorOdf += el2.rating.marks * el2.population
        popDataOdf += el2.population
    })
    if(odfData.length){
        responseObj.odf.score = Number((numeratorOdf / popDataOdf).toFixed(2));
    }else{
        responseObj.odf.score = 0;

    }
    responseObj.fourSLB.data = slbWeigthed

    if(design_year === YEAR_CONSTANTS['23_24']){
       responseObj.fourSLB.data = get2223TwentySlbData(TEslbdata2, slbWeigthed, design_year);
       responseObj = updateResponse(responseObj, false)
    }
    return res.status(200).json({
        success: true,
        data: responseObj
    })
})

function roundOffToTwoDigits(obj) {
  try {
    const newObj = {};

    for (let key in obj) {
      if (typeof obj[key] === "number") {
        newObj[key] = Number(obj[key].toFixed(2));
      } else {
        newObj[key] = obj[key];
      }
    }

    return newObj;
  } catch (error) {
    throw `roundOffToTwoDigits:: ${error.message}`;
  }
}

/**
 * The function retrieves data related to SLB forms for ULBs based on the design year and updates the
 * count and ULB lists for approved and pending forms.
 * @param design_year - The design year is a variable that represents the year for which the data is
 * being retrieved. It is expected to be either "21_22" or "22_23".
 * @param TEslbdata2 - TEslbdata2 is an array of objects containing data related to various ULBs (Urban
 * Local Bodies).
 * @param slbApproved - slbApproved is an object that contains a count property and an ulbs property.
 * The count property represents the number of ULBs (Urban Local Bodies) that have been approved, while
 * the ulbs property is an array of objects that contain the name and census code of each approved ULB.
 * @param slbPending - `slbPending` is an object that contains a `count` property and an array of
 * `ulbs`. The `count` property represents the number of ULBs (Urban Local Bodies) with pending status,
 * while the `ulbs` array contains objects representing each ULB with pending status.
 */
function get28SLB2223Data(design_year, TEslbdata2, slbApproved, slbPending) {
  try {
    if (
      ![YEAR_CONSTANTS["21_22"], YEAR_CONSTANTS["22_23"]].includes(design_year)
    ) {
      if (TEslbdata2.length) {
        TEslbdata2.forEach((el2) => {
          if (
            el2.hasOwnProperty("twentyeightslbforms") &&
            Object.keys(el2.twentyeightslbforms).length > 0
          ) {
            //   if (el._id.toString() == el2._id.toString()) {
            if (el2.twentyeightslbforms.status == "APPROVED") {
              slbApproved.count += 1;
              slbApproved.ulbs.push({
                ulbName: el2.name,
                censusCode: el2.censusCode ?? el2.sbCode,
              });
            } else {
              slbPending.count += 1;
              slbPending.ulbs.push({
                ulbName: el2.name,
                censusCode: el2.censusCode ?? el2.sbCode,
              });
              // }
            }
          } else {
            slbPending.count += 1;
            slbPending.ulbs.push({
              ulbName: el2.name,
              censusCode: el2.censusCode ?? el2.sbCode,
            });
          }
        });
      }
    }
  } catch (error) {
    throw `get28SLB2223Data:: ${error.message}`;
  }
}

/**
 * The function retrieves data from the "twentyeightslbforms" collection for a given set of ULBs.
 * @param TEslbdata2 - an array that will contain the data retrieved from the database query
 * @param ulbs - An array of MongoDB ObjectIds representing the ULBs (Urban Local Bodies) to be matched
 * in the aggregation pipeline.
 * @returns The function `getTwentyEightSLb2223Data` returns the result of an aggregation query
 * performed on the `Ulb` collection, with a `` stage to filter by `_id` values in the `ulbs`
 * array, a `` stage to join with the `twentyeightslbforms` collection based on a matching
 * `design_year` and `ulb` fields
 */
async function getTwentyEightSLb2223Data(TEslbdata2, ulbs) {
    TEslbdata2 = await Ulb.aggregate([
        {
            $match: {
                _id: { $in: ulbs }
            }
        },
        {
            $lookup: {
                from: "twentyeightslbforms",
                let: {
                    firstUser: ObjectId(YEAR_CONSTANTS['22_23']),
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
                as: "twentyeightslbforms",
            },
        },
        {
            $unwind: {
                path: "$twentyeightslbforms",
                preserveNullAndEmptyArrays: true,
            },
        },
    ]);
    return TEslbdata2;
}

/**
 * The function checks the status of ULB forms and adds pending ULBs to a list if they are not already
 * approved or pending.
 * @param ulbData - an array of objects containing data about ULBs (Urban Local Bodies)
 * @param approvedUlbs - an object containing an array of approved ULBs (urban local bodies) with their
 * names and census codes.
 * @param pendingUlbs - an object that contains an array called "ulbs" which stores information about
 * ULBs (Urban Local Bodies) that are pending approval.
 * @returns an array of pending ULBs (Urban Local Bodies) that have not been approved yet.
 */
function checkUlbFormStatus(ulbData, approvedUlbs,pendingUlbs) {
    ulbData.forEach(ulb => {
        let found = approvedUlbs.ulbs.find(el => {
            return el.ulbName === ulb.name;
        });
        if(!found){
            found = pendingUlbs.ulbs.find(el => {
                return el.ulbName === ulb.name;
            });
            if(!found){
                pendingUlbs.ulbs.push({
                    ulbName: ulb.name,
                    censusCode: ulb.censusCode ?? ulb.sbCode
                })
            }
        }
    });
    return pendingUlbs.ulbs;
}

/**
 * The function removes objects from the "approved" array that are also present in the "pending" array.
 * @param pending - The `pending` parameter is an array of objects representing items that are waiting
 * for approval.
 * @param approved - The "approved" parameter is an array of objects that have been approved.
 * @returns The function `removeApproved` is returning an array of objects that are present in the
 * `approved` array but not in the `pending` array. It does this by using the `filter` method on the
 * `approved` array and checking if each object is present in the `pending` array using the `some`
 * method and the `compareObjects` function. If the object is not present in
 */
function removeApproved(pending, approved) {
    return approved.filter(approvedObj =>
      !pending.some(pendingObj =>
        compareObjects(pendingObj, approvedObj)
      )
    );
  }
  
  /**
   * The function compares two objects by checking if they have the same keys and values.
   * @param obj1 - The first object to be compared.
   * @param obj2 - The `obj2` parameter is an object that is being compared to another object (`obj1`)
   * in the `compareObjects` function.
   * @returns The `compareObjects` function is returning a boolean value. It returns `true` if the two
   * objects passed as arguments have the same keys and values for each key, and `false` otherwise.
   */
  function compareObjects(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    return keys1.every(key => obj1[key] === obj2[key]);
  }
/**
 * The function calculates and returns SLB data and scores based on input data.
 * @param TEslbdata2 - TEslbdata2 is an array of objects containing data related to the 22-23 SLB
 * (Service Level Benchmark) indicators.
 * @param slbWeigthed - slbWeigthed is an object that contains data related to SLB (Service Level
 * Benchmark) indicators, including actual values and scores. The function is updating the values of
 * this object based on the data passed in the TEslbdata2 parameter.
 * @returns the updated `slbWeigthed` object with calculated scores for four different indicators
 * related to water supply and sanitation.
 */
function get2223TwentySlbData(TEslbdata2, slbWeigthed, design_year) {
  try {
    let arr1 = [];
    let filteredData2 = [];
    TEslbdata2.forEach((el) => {
      if (el.hasOwnProperty("twentyeightslbforms")) {
        filteredData2 = el.twentyeightslbforms.data.filter((el2) =>
          lineItemIndicatorIDs.includes(el2.indicatorLineItem.toString())
        );
      }
      arr1.push({
        data: filteredData2,
        population: el.population,
      });
    });
    let numerator2 = [
        { id: "", value: 0 },
        { id: "", value: 0 },
        { id: "", value: 0 },
        { id: "", value: 0 },
      ],
      popData2 = [
        { id: "", value: 0 },
        { id: "", value: 0 },
        { id: "", value: 0 },
        { id: "", value: 0 },
      ];
    arr1.forEach((el) => {
      el.data.forEach((el2, index) => {
        numerator2[index]["id"] = el2.indicatorLineItem.toString();
        numerator2[index]["value"] += el2.actual.value * el.population;
        popData2[index]["value"] += el.population;
        popData2[index]["id"] = el2.indicatorLineItem.toString();
      });
    });

    let wtAvgSLB2 = [];
    numerator2.forEach((el, index) => {
      wtAvgSLB2.push({
        value: numerator2[index].value / popData2[index].value,
        id: numerator2[index].id,
      });
      if (el.id == lineItemIndicatorIDs[0]) {
        Object.assign(slbWeigthed, {
          houseHoldCoveredWithSewerage_actual2122: wtAvgSLB2[index].value,
        });
      } else if (el.id == lineItemIndicatorIDs[1]) {
        Object.assign(slbWeigthed, {
          houseHoldCoveredPipedSupply_actual2122: wtAvgSLB2[index].value,
        });
      } else if (el.id == lineItemIndicatorIDs[2]) {
        Object.assign(slbWeigthed, {
          waterSuppliedPerDay_actual2122: wtAvgSLB2[index].value,
        });
      } else if (el.id == lineItemIndicatorIDs[3]) {
        Object.assign(slbWeigthed, {
          reduction_actual2122: wtAvgSLB2[index].value,
        });
      }
    });
    slbWeigthed = roundOffToTwoDigits(slbWeigthed);
    let scores2 = calculateSlbMarks(slbWeigthed, true);
    Object.assign(slbWeigthed, {
      houseHoldCoveredWithSewerage_score: Number(scores2[2].toFixed(2)),
      houseHoldCoveredPipedSupply_score: Number(scores2[3].toFixed(2)),
      waterSuppliedPerDay_score: Number(scores2[0].toFixed(2)),
      reduction_score: Number(scores2[1].toFixed(2)),
    });
    return slbWeigthed;
  } catch (error) {
    throw `get2223TwentySlbData:: ${error.message}`;
  }
}

/**
 * The function removes duplicate objects from an array based on a specific property.
 * @param arr - an array of objects that may contain duplicates. Each object has a property called
 * "ulbName".
 * @returns The `removeDuplicates` function is returning an array with unique objects based on the
 * `ulbName` property.
 */
function removeDuplicates(arr) {
    const uniqueArr = arr.filter((obj, index, self) => {
      return (
        index ===
        self.findIndex((o) => {
          return o.ulbName === obj.ulbName;
        })
      );
    });
  
    return uniqueArr;
  }
  
function updateResponse(response, InsufficientFlag) {
  try {
    let responseObj = {
      formName: FormNames['indicatorForm'],
      formId: FORMIDs['indicatorForm'],
      status: "",
      statusId: "",
      info: "The below tables denotes the aggregate indicators and targets of ULBs in respective UA",
      previousYrMsg: "",
      data: {
        indicators_wss: {
          title: "Indicators for Water Supply and Sanitation(A)",
          key: 'indicators_wss',
          dataCount: {
            fourSlbData: {
              name: "",
              data: createNewFormat(response["fourSLB"]),
            },
          },
          tables: InsufficientFlag ? [] :[
            {
              tableType: "four-slb",
              rows: convertToRows(response),
              columns: getColumnsIndicatorWss(),
            },
          ],
          uaScore: {
            title:
              "Total UA Score for Water Supply and Sanitation :",
            value: InsufficientFlag ? null : getUAScore(response["fourSLB"]['data']),
            maximum: 60
          },
        },
        indicators_swm: {
          title: "Indicators for Solid Waste Management(B)",
          key: 'indicators_swm',
          dataCount: {
            odfFormData: getODFFormat(response["odf"]),
            gfcFormData: getGFCFormat(response["gfc"]),
          },
          uaScore: {
            title:
              "Total UA Score for Solid Waste Management :",
            value: InsufficientFlag ? null : getindicators_swmScore(
              response["odf"]["score"],
              response["gfc"]["score"]
            ),
            maximum: 40
          },
        },
        performanceAsst: {
          title: "Performance Assessment",
          key : "performanceAsst",
          info: "",
          id: "",    
          name: "On the basis of the total marks obtained by UA, proportionate grants shall be recommended by MOH&UA as per the table given below:",
          tables: getPerformanceAsstTable(),
          dataCount: {},
          uaScore: {
            title: `Total UA Score:`,
            value: InsufficientFlag ? null :
              getUAScore(response["fourSLB"]['data']) +
              getindicators_swmScore(
                response["odf"]["score"],
                response["gfc"]["score"]
              ),
            maximum: 100
          },
        },
      },
    };
    return responseObj;
  } catch (error) {
    throw `updateResponse:: ${error.message}`;
  }
}

function getPerformanceAsstTable() {
  return [
    {
      tableType: "lineItem-highlited",
      rows: [
        {
          marks: "% of Recommended tied grant",
          less30: "0%",
          "30To45": "60%",
          "45To60": "75%",
          "60To80": "90%",
          greater80: "100%",
        },
      ],
      columns: getPerformanceAsstColumns(),
    },
  ];
}

function getindicators_swmScore(odfScore, gfcScore) {
  return Number((odfScore + gfcScore).toFixed(2));
}
function getPerformanceAsstColumns() {
  return [
    {
      key: "marks",
      display_name: "Marks",
    },
    {
      key: "less30",
      display_name: "< 30",
    },
    {
      key: "30To45",
      display_name: "< 30 and <=45",
    },
    {
      key: "45To60",
      display_name: "> 45 and <=60",
    },
    {
      key: "60To80",
      display_name: "> 60 and <=80",
    },
    {
      key: "greater80",
      display_name: "> 80",
    },
  ];
}

function getColumnsIndicatorWss() {
  return [
    {
      key: "serviceLevelIndicators",
      display_name: "Service Level Indicators",
    },
    {
      key: "benchmark",
      display_name: "Benchmark",
    },
    {
      key: "achieved2122",
      display_name: "Achieved <br> 2021-22",
    },
    {
      key: "target2223",
      display_name: "Target <br> 2022-23",
    },
    {
      key: "achieved2223",
      display_name: "Achieved <br> 2022-23",
    },
    // {
    //   key: "target2122",
    //   display_name: "Target <br> 2021-22",
    // },
    {
      key: "target2324",
      display_name: "Target <br> 2023-24",
    },
    {
      key: "target2425",
      display_name: "Target <br> 2024-25",
    },
    {
      key: "wghtd_score",
      display_name: "Weighted Score",
    },
  ];
}

/**
 * The function converts data from an old format into rows with specific indicators and benchmarks.
 * @param oldFormat - The input data in the old format that needs to be converted to a new format.
 * @returns an array of objects, where each object represents a row of data for a specific service
 * level indicator. The objects contain properties such as the name of the indicator, benchmark,
 * achieved and target values for different years, and a weighted score.
 */
function convertToRows(oldFormat) {
  try {
    const rows = [];
    const indicators = [
      {
        serviceLevelIndicators:
          "Water supplied in litre per capita per day(lpcd)",
        key: "waterSuppliedPerDay",
        benchmark: "135 LPCD",
        wghtd_score: "waterSuppliedPerDay_score",
      },
      {
        serviceLevelIndicators: "% of Non-revenue water",
        key: "reduction",
        benchmark: "20 %",
        wghtd_score: "reduction_score",
      },
      {
        serviceLevelIndicators:
          "% of households covered with sewerage/septage services",
        key: "houseHoldCoveredWithSewerage",
        benchmark: "100 %",
        wghtd_score: "houseHoldCoveredWithSewerage_score",
      },
      {
        serviceLevelIndicators:
          "% of households covered with piped water supply",
        key: "houseHoldCoveredPipedSupply",
        benchmark: "100 %",
        wghtd_score: "houseHoldCoveredPipedSupply_score",
      },
    ];

    /* The above code is iterating through an array called "indicators" and creating a new object
        called "row" for each element in the array. The properties of the "row" object are being
        populated with values from another object called "oldFormat.fourSLB.data". The values are
        being converted to strings using the "String()" method. The "row" objects are being pushed
        into an array called "rows". */
    for (let i = 0; i < indicators.length; i++) {
      const indicator = indicators[i];
      const row = {
        serviceLevelIndicators: indicator.serviceLevelIndicators,
        key: indicator.key,
        benchmark: indicator.benchmark,
        achieved2122:  String(oldFormat.fourSLB.data[`${indicator.key}_actual2122`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}_actual2122`]) ,
        target2223: String(oldFormat.fourSLB.data[`${indicator.key}2223`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}2223`]) ,
        achieved2223: String(oldFormat.fourSLB.data[`${indicator.key}_actual2223`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}_actual2223`]) ,
        // target2122: String(oldFormat.fourSLB.data[`${indicator.key}2122`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}2122`]) ,
        target2324: String(oldFormat.fourSLB.data[`${indicator.key}2324`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}2324`]) ,
        target2425: String(oldFormat.fourSLB.data[`${indicator.key}2425`]) === "" ? null : String(oldFormat.fourSLB.data[`${indicator.key}2425`]),
        wghtd_score: String(oldFormat.fourSLB.data[indicator.wghtd_score]) === "" ? null : String(oldFormat.fourSLB.data[indicator.wghtd_score]) ,
      };
      rows.push(row);
    }

    return rows;
  } catch (error) {
    throw `convertToRows:: ${error.message}`;
  }
}
/**
 * The function creates a new format for a given input of fourSLB data by categorizing ULBs into "Total
 * Number of ULBs in UA", "Approved by State", and "Pending for Submission/Approval".
 * @param fourSLB - It is an object that contains information about ULBs (Urban Local Bodies) that are
 * approved and pending for submission/approval. It has the following structure:
 * @returns a new format object that categorizes ULBs (Urban Local Bodies) based on their approval
 * status. The object has three categories: "Total Number of ULBs in UA", "Approved by State", and
 * "Pending for Submission/Approval". Each category has an empty value and key, and an array of ULBs
 * with their names and census codes. The ULBs are added to
 */
function createNewFormat(fourSLB) {
  try {
    const newFormat = [
      {
        name: "Total Number of ULBs in UA",
        value: "",
        key: "",
        ulbs: [],
      },
      {
        name: "Approved by State",
        value: "",
        key: "",
        ulbs: [],
      },
      {
        name: "Pending for Submission/Approval",
        value: "",
        key: "",
        ulbs: [],
      },
    ];

    // Add ULBs to "Approved by State" category
    const approvedULBs = fourSLB.approved.ulbs;
    for (const ulb of approvedULBs) {
      newFormat[1].ulbs.push({
        ulbName: ulb.ulbName,
        censusCode: ulb.censusCode,
      });
      newFormat[0].ulbs.push({
        ulbName: ulb.ulbName,
        censusCode: ulb.censusCode
      })
    }

    // Add ULBs to "Pending for Submission/Approval" category
    const pendingULBs = fourSLB.pending.ulbs;
    for (const ulb of pendingULBs) {
      newFormat[2].ulbs.push({
        ulbName: ulb.ulbName,
        censusCode: ulb.censusCode,
      });
      newFormat[0].ulbs.push({
        ulbName: ulb.ulbName,
        censusCode: ulb.censusCode
      })
    }
    Object.assign(newFormat[0],{
        value:  String(fourSLB.approved.count + fourSLB.pending.count),
        ulbs: [...fourSLB.approved.ulbs, ...fourSLB.pending.ulbs]
      })
    Object.assign( newFormat[1], {
        value:fourSLB.approved.ulbs.length.toString(),
        ulbs: fourSLB.approved.ulbs
    })
    Object.assign(newFormat[2] ,{
        value: fourSLB.pending.ulbs.length.toString(),
        ulbs: fourSLB.pending.ulbs
    })

    return newFormat;
  } catch (error) {
    throw `createNewFormat:: ${error.message}`;
  }
}

/**
 * The function takes an input object and returns a formatted object in the GFC format with specific
 * data keys and values.
 * @param input - The input parameter is an object that contains information about the ULBs (Urban
 * Local Bodies) in a particular area, including the number of ULBs approved by the state, the ULBs
 * pending for submission/approval, and a score for the overall performance of the ULBs.
 * @returns The function `getGFCFormat` returns an object in the GFC format, which includes the name of
 * the format, an array of data items, and a GFC rating value. The data items include the total number
 * of ULBs in UA, the number of ULBs approved by the state, and the number of ULBs pending for
 * submission/approval. The values for these data items
 */
function getGFCFormat(input) {
  try {
    const gfcFormat = {
      name: "GFC",
      data: [],
      gfcRatings: {
        name: "GFC Rating",
        value: Number(input.score.toFixed(2)),
      },
    };

    const dataKeys = [
      "Total Number of ULBs in UA",
      "Approved by State",
      "Pending for Submission/Approval",
    ];

    for (const key of dataKeys) {
      const dataItem = {
        name: key,
        value: "",
        key: "",
        ulbs:[]
      };
      gfcFormat.data.push(dataItem);
    }

    Object.assign(gfcFormat.data[0],{
        value:  String(input.approved.ulbs.length + input.pending.ulbs.length),
        ulbs: [...input.approved.ulbs, ...input.pending.ulbs]
      })
    Object.assign( gfcFormat.data[1], {
        value: input.approved.ulbs.length.toString(),
        ulbs: input.approved.ulbs
    })
    Object.assign(gfcFormat.data[2] ,{
        value: input.pending.ulbs.length.toString(),
        ulbs: input.pending.ulbs
    })
    return gfcFormat;
  } catch (error) {
    throw `getGFCFormat:: ${error.message}`;
  }
}
/**
 * The function takes an input object and returns an ODF format object with specific data keys and
 * values.
 * @param input - The input parameter is an object that contains information about the ODF (Open
 * Defecation Free) status of a region. It has the following properties:
 * @returns an object with the name "ODF", an array of data, and an object with the name "ODF Rating"
 * and a value that is a string representation of the input score. The data array contains objects with
 * the keys "name", "value", and "key", where "name" is a string representing the name of the data,
 * "value" is a string
 */
function getODFFormat(input) {
  try {
    const odfFormat = {
      name: "ODF",
      data: [],
      odfRatings: {
        name: "ODF Rating",
        value: Number(input.score.toFixed(2)),
      },
    };

    const dataKeys = [
      "Total Number of ULBs in UA",
      "Approved by State",
      "Pending for Submission/Approval",
    ];

    for (const key of dataKeys) {
      odfFormat.data.push({
        name: key,
        value: "",
        key: "",
        ulbs:[]
      });
    }

    Object.assign(odfFormat.data[0],{
        value:  String(input.approved.ulbs.length + input.pending.ulbs.length),
        ulbs: [...input.approved.ulbs, ...input.pending.ulbs]
      })
    Object.assign( odfFormat.data[1], {
        value:input.approved.ulbs.length.toString(),
        ulbs: input.approved.ulbs
    })
    Object.assign(odfFormat.data[2] ,{
        value: input.pending.ulbs.length.toString(),
        ulbs: input.pending.ulbs
    })
    return odfFormat;
  } catch (error) {
    throw `getODFFormat:: ${error.message}`;
  }
}

/**
 * The function calculates a score based on four input parameters related to household water and
 * sanitation.
 * @param input - The input parameter is an object that contains four properties:
 * @returns The function `getUAScore` is returning a numerical value which is the sum of four
 * properties of the `input` object, after rounding the result to two decimal places using the
 * `toFixed()` method.
 */
function getUAScore(input) {
  try {
    return Number(
      (
        input["houseHoldCoveredWithSewerage_score"] +
        input["houseHoldCoveredPipedSupply_score"] +
        input["waterSuppliedPerDay_score"] +
        input["reduction_score"]
      ).toFixed(2)
    );
  } catch (error) {
    throw `getUAScore:: ${error.message}`;
  }
}
  
module.exports.getRelatedUAFile = catchAsync(async (req, res) => {
    let response = {
        "success": false,
        "message": ""
    }
    try {
        const { ulbId } = req.query
        if (!ulbId) {
            response.message = "Please provide a ulb id"
            return res.status(400).json(response)
        }
        let ulbObj = await Ulb.findOne({ "_id": ObjectId(ulbId) }).lean()
        if (!ulbObj || ulbObj === undefined) {
            response.message = "Ulb not found";
            return res.status(400).json(response);
        }
        else if (ulbObj.isUA === "No") {
            response.message = "Ulb does not have any UA"
            return res.status(400).json(response);
        }
        else {
            let uaFileArr = await UaFileList.find({ "UA": ObjectId(ulbObj.UA) })
            let modifiedUaFileArr = [...uaFileArr]
            modifiedUaFileArr = modifiedUaFileArr.map((item) => {
                let obj = { ...item._doc }
                obj['modifiedAt'] = new Date(item.modifiedAt).toISOString().substring(0, 10)
                return obj
            })
            if (uaFileArr.length > 0) {
                response.success = true
                response.fileUrls = modifiedUaFileArr
                response.message = "Fetched successfully"
                return res.status(200).json(response)
            }
            else {
                response.success = true
                response.fileUrls = []
                response.message = "File Not found"
                return res.status(404).json(response)
            }
        }
    }
    catch (err) {
        console.log("error in getRelatedUAFile :: ", err.message)
        response.message = err.message
        res.status(500).json(response)
    }
})
module.exports.getUAByuaCode = catchAsync(async (req, res) => {
    let response = {
        "success": false,
        "message": ""
    }
    try {
        let { uaCode } = req.params
        let ua = await UA.findOne({ "UACode": uaCode }).select(["name", "_id"])
        if (!ua) {
            response.message = "UA object not found"
            return res.status(400).json(response)
        }
        response.message = "found"
        response.ua = ua
        return res.status(200).json(response)
    }
    catch (err) {
        console.log("error in getUAById", err.message)
    }
})
module.exports.addUAFile = catchAsync(async (req, res) => {
    let response = {
        "success": false,
        "message": ""
    }
    try {
        let data = { ...req.body }
        let design_year = data.Year
        let yearObj = await Year.findOne({ "year": design_year })
        if (!yearObj) {
            response.message = "Year object not found in database"
            return res.status(400).json(response)
        }
        if (!data || data === undefined || Object.keys(data).length < 1) {
            response.message = "data  is required"
            return res.status(400).json(response)
        }
        try {
            data.Year = yearObj._id
            let UaFileObj = new UaFileList(data)
            await UaFileObj.save()
            response.success = true
            response.message = "Created Successfully"
            return res.status(201).json(response)
        }
        catch (err) {
            // console.log(Object.keys(err))
            response.message = err.message
            return res.status(500).json(response)
        }

    }
    catch (err) {
        console.log("error in addUAFile ::: ", err.message)
        response.message = err.message
        return res.status(500).json(response)
    }
})

//function for DUR project queries starts here 

function getStringConvertedAmount(service,field,field2,csv){
    try{
        if(csv){
            return field2
        }
        return service.getCommonConcatObj([
            "₹ ",
            (service.getCommonConvertor(field,"string"))
            ,
            " ",
            "Cr"
        ])
    }
    catch(err){
        console.log("error in getStringConvertedAmount ",err.message)
    }
}



function getUlbShare(service,csv){
    try{
        if(csv){
            return "$ulbShare"
        }
        return service.getCommonConcatObj([
            getStringConvertedAmount(service,"$ulbShareInlkh","$ulbShare",csv),
            
            " (",
            service.getCommonConvertor(
                service.getCommonPerCalc("$ulbShare","$totalProjectCost"),
                "string"
            ),
            ")",
            "%"
        ])
    }
    catch(err){
        console.log("error in getUlbShare :: ",err.message)
    }
    
}

function getConcatinatedUrl(service,ulbId){
    return service.getCommonConcatObj([apiUrls[process.env.ENV] + "/UA/get-mou-project/" + ulbId + "?csv=true&projects=",(service.getCommonConvertor("$amrProjects._id","string"))])
}

function addCsvFields(dataObj,fieldName){
    dataObj["$group"][fieldName]['$addToSet']['ulbName'] = "$name",
    dataObj["$group"][fieldName]['$addToSet']['censusCode'] = "$censuscode"
    dataObj["$group"][fieldName]['$addToSet']['cfCode'] =  "$code"
    dataObj["$group"][fieldName]["$addToSet"]['population'] = {
        "$cond":{
            "if":{
                "$eq":["$isMillionPlus","No"],
            },
            "then":"Non-million",
            "else":"Million"
        }
    }
    dataObj["$group"][fieldName]["$addToSet"]['stateName'] = "$state.name"
    return dataObj
}

function getProjectReportDetail(csv){
    let obj = {
        "name": "Project Report file",
        "url": "$amrProjects.dprDocument.url"
    }
    // if(csv){
    //     return "https://jana-cityfinance.s3.ap-south-1.amazonaws.com/objects/94d21e52-3439-4221-9844-2d76972c7107.pdf"
    // }
    return obj
}
function amrProjects(service,csv,ulbId){
    try{
        let configObj  ={
            "projectName":"$amrProjects.name",
            "projectId": "$amrProjects._id",
            "totalProjectCost":"$amrProjects.cost",
            "type": "amrut",
            "implementationAgency":"$name",
            "capitalExpenditureState": {
                "$add": [
                    "$amrProjects.capitalExpenditureState",
                    "$amrProjects.capitalExpenditureCentralAssist"
                ]
            },
            "capitalExpenditureUlb": "$amrProjects.capitalExpenditureUlb",
            "omExpensesState": {
                "$add": [
                    "$amrProjects.omExpensesState",
                    "$amrProjects.omExpensesCentralAssist"
                ]
            },
            "omExpensesUlb": "$amrProjects.omExpensesUlb",
            "stateShare": {
                "$add": [
                    "$amrProjects.stateShare",
                    "$amrProjects.CentralAssistCost"
                ]
            },
            "expenditure": "$amrProjects.expenditure",
            "ulbShare":"$amrUlbShare",
            "sectorId": "$amrProjects.category._id",
            "sector":"$amrProjects.category.name",
            "divideTo":100,
            "lat":"$amrProjects.location.lat",
            "long":"$amrProjects.location.lng",
            "startDate":service.getCommonDateTransformer("$amrProjects.startDate"),
            "estimatedCompletionDate":service.getCommonDateTransformer("$amrProjects.endDate"),
            "dprPrepared":"$amrProjects.dprPrepared",
            "dprPrepationDate": service.getCommonDateTransformer("$amrProjects.dprPrepDate"),
            "moreInformation": {
                "name": "More information",
                "url": apiUrls[process.env.ENV] + "/UA/get-mou-project/"
            },
            "projectReport":getProjectReportDetail(csv),
            "links":"$links.link",
            "creditRating": {
                    "name": "Credit rating",
                    "url": `https://demo${process.env.PROD_HOST}/creditRating.pdf`
                }
        }
        let obj =  {
            "$cond":{
                "if":{
                        "$or":[
                            {'$eq': ['$amrProjects.name', null]}, 
                            {'$gt': ['$amrProjects.name', null]},
                        ]
                },
                "then":configObj,
                "else":"$$REMOVE"
                
            }
        }
        if(!csv){
            return obj
        }
        return configObj
    }
    catch(err){
        console.log("error in amrProjects :: ",err.message)
    }
}

function durProjects(service,csv,ulbId){
    let configObj = {
        "projectName":"$projects.name",
        "projectId": "$projects._id",
        "implementationAgency":"$name",
        "type": "dur",
        "totalProjectCost":"$projects.cost",
        "lat" : "$projects.location.lat",
        "long": "$projects.location.long",
        "expenditure": "$projects.expenditure",
        "ulbShare": "$ulbShare",
        "sectorId": "$projectCategory._id",
        "sector":"$projectCategory.name",
        "divideTo":100,
        "creditRating": {
            "name": "Credit rating",
            "url": `https://demo${process.env.PROD_HOST}/creditRating.pdf`
        },
        "links":"$links.link",
        "moreInformation": {
            "name": "More information",
            "url": apiUrls[process.env.ENV] + "/UA/get-mou-project/"
        },
    }
    let obj = {
        "$cond":{
            "if":{
                "$or":[
                    {'$eq': ['$projects.name', null]}, 
                    {'$gt': ['$projects.name', null]},
                ]
            },
            "then":configObj,
            "else":"$$REMOVE",
        }
    }
    if(!csv){
        return obj
    }
    return configObj
}

function getGroupByQuery(service,ulbId,csv) {
    try {
        let obj = {
            "$group": {
                "_id": "$_id",
                "durSectors": {
                    "$addToSet": { "_id": "$projectCategory._id", "name": "$projectCategory.name" }
                },
                "amrSectors":{
                    "$addToSet": { "_id": "$amrProjects.category._id", "name": "$amrProjects.category.name" }
                },
                "implementationAgencies": {
                    "$addToSet": { "_id": "$_id", "name": "$name" }
                },
                "amrprojectsNames": {
                    "$addToSet": {
                        "_id": "$amrProjects._id",
                        "name": "$amrProjects.name",
                        "sectorId": "$amrProjects.category._id"
                    }
                },
                "durProjectsNames": {
                    "$addToSet": {
                        "_id": "$projects._id",
                        "name": "$projects.name",
                        "sectorId": "$projectCategory._id"
                       
                    }
                },
                "amrProjectData": {
                    "$addToSet": amrProjects(service,csv,ulbId)
                },
                "durProjects": {
                    "$addToSet": durProjects(service,csv,ulbId)
                },
                // "startDate": service.getCommonDateTransformer("$projects.createdAt"),
                // "estimatedCompletionDate": service.getCommonDateTransformer("$projects.modifiedAt"),
                
                "links":{
                    "$first":"$links.link"
                }
                // "projectReport": getProjectReportDetail(csv),
                

            }
            
        }
        if(csv){
            obj = addCsvFields(obj,"amrProjectData")
            obj = addCsvFields(obj,"durProjects") 
        }
        return obj
    }
    catch (err) {
        console.log("error in getGroupByQuery ::: ", err.message)
    }
}

function getFiltersForModule(filters) {
    let filteredObj = {
        "provided": false,
        filters: {}
    }
    try {
        if (Object.keys(filters).length > 0) {
            filteredObj["provided"] = true
            for (var k in filters) {
                try {
                    filteredObj["filters"][k] = filters[k].map(item => item)
                }
                catch (err) {
                    console.log("err.message",err.message)
                    filteredObj["filters"][k] = [filters[k]]
                }
            }
        }
    }
    catch (err) {
        console.log("error in getFiltersForModule ::: ", err.message)
    }
    return filteredObj
}

function getFilterConditions(filters) {
   let filtersName = {
        "implementationAgencies": "ulbId",
        "sectors": "sectorId",
        "type": "type",
        "projects": "projectId"
    }
    try {
        let obj = {
            "$and": [],
        }
        let keys = Object.keys(filters)
        let lengthofObj = Object.keys(filters).length
        for (let filter in filters) {
            let tempObj = {}
            tempObj["$or"] = []
            let filter_arr = filters[filter]
            for (let elem of filter_arr) {
                let temp = {
                    "$eq": [`$$row.${filtersName[filter]}`]
                }
                
                temp["$eq"].push(mongoose.isValidObjectId(elem) ? ObjectId(elem) : elem);
                tempObj["$or"].push(temp)
                
            }
            obj["$and"].push(tempObj)

        }
        return obj
    }
    catch (err) {
        console.log("error in getFilterConditions ::: ", err.message)
    }
}

function getFilteredObjects(filteredObj, arrName) {
    try {
        let obj = {
            "$filter": {
                "input": arrName,
                "as": "row",
            }
        }
        obj["$filter"]["cond"] = getFilterConditions(filteredObj.filters)
        return obj
    }
    catch (err) {
        console.log("error in getFilteredObjects ::: ", err.message)
    }
}


function getProjectionQueries(service, filteredObj, skip, limit, sortKey) {
    let { sectors: sectorObj, type } = { ...filteredObj.filters }
    let sectorialObj = { "filters": { "sectors": sectorObj } }
    
    // slicing is used for pagination as data structure is totally created with mongodb aggregation
    try {
        let obj = {
            "$project": {
                "_id": 1,
                "filters": 1,
                "total": service.getCommonTotalObj("$results"),
                "rows": "$rows",
                "sectors": 1,
                "projects": 1,
                "implementationAgencies": 1
            }
        }
        return obj
    }
    catch (err) {
        console.log("error in getProjectionQueries ::: ", err.message)
    }
    return obj
}

function addUlbShare(service,fields,fieldName='ulbShare'){
    let {fromValue,toValue} = fields
    
    try{
        let obj = {
            "$addFields":{}
        }
        obj['$addFields'][fieldName] = {
            "$cond":{
                "if":{
                    "$gte":[toValue,0]
                },
                "then":service.getCommonSubtract([fromValue,toValue]),
                "else":0
            }
        }
        return obj
    }
    catch(err){
        console.log("error while getting ulbShare",err.message)
    }
}

function addUlbAndAmrutFields(service,fields,fieldName='ulbShare'){
    let {fromValue,toValue} = fields
    try{
        let obj = {
            "$addFields":{}
        }
        obj['$addFields']['totalAmrutProjectCost'] = {"$sum": "$AMRUT.cost"}
        obj['$addFields']['totalDurProjectCost'] = {"$sum": "$DUR.projects.cost"}
        obj['$addFields']['totalAmrutProjects'] = {"$size": "$AMRUT"}
        obj['$addFields']['totalDurProjects'] = {
            "$cond": {
                "if": {
                    "$isArray": "$DUR.projects"
                },
                "then": {
                    "$size": "$DUR.projects"
                },
                "else": 0
            }
        },
        obj['$addFields']['totalAmrutUlbShare'] = {"$sum": "$AMRUT.ulbShare"},
        obj['$addFields'][fieldName] = {
            "$cond":{
                "if":{
                    "$gte":[toValue,0]
                },
                "then":service.getCommonSubtract([fromValue,toValue]),
                "else":0
            }
        }
        return obj
    }
    catch(err){
        console.log("error while getting ulbShare",err.message)
    }
}

function addCensusCode(){
    let obj = {
        "$addFields":{
            "censuscode":{
                "$cond":{
                    "if":{
                       "$eq":["$censusCode",null]
                    },
                    "then":"$sbCode",
                    "else":"$censusCode"
                }
            }
        }
    }
    return obj
}

function getFieldTypeToAdd(fieldName,convertTo){
    try{
        return {
            "field":fieldName,
            "type":convertTo
        }
    }
    catch(err){
        console.log("error in fieldName ::: ",err.message)
    }
}

function getExpendituresField(){
    let obj = {}
    try{
        obj = {
            "$projects.cost" : getFieldTypeToAdd("totalProjectCost","lakhs"),
            "$projects.expenditure":getFieldTypeToAdd("projectExpenditure","lakhs"),
            // "$totalProjectCost":getFieldTypeToAdd("projectCostInCr","crore"),
            // "$projectExpenditure":getFieldTypeToAdd("projectExpenditureInCr","crore"),
            //
            "$projects.stateShare":getFieldTypeToAdd("stateSh","lakhs"),
            "$projects.capitalExpenditureState":getFieldTypeToAdd("cpExpState","lakhs"),
            "$projects.capitalExpenditureUlb":getFieldTypeToAdd("cpExpUlb","lakhs"),
            "$projects.omExpensesState":getFieldTypeToAdd("omExpState","lakhs"),
            "$projects.omExpensesUlb":getFieldTypeToAdd("omExpUlb","lakhs"),//
            "$projects.capitalExpenditureState":getFieldTypeToAdd("cpExpState","lakhs"),
            //
            "$cpExpState":getFieldTypeToAdd("cpExpStateInCr","crore"),
            "$cpExpUlb":getFieldTypeToAdd("cpExpUlbInCr","crore"),
            "$omExpState":getFieldTypeToAdd("omExpStateInCr","crore"),
            "$omExpUlb":getFieldTypeToAdd("omExpUlbInCr","crore"),//
        }
    }
    catch(err){
        console.log("error in getExpenditure :: ",err.message)
    }
    return obj
}

function queryPipelineLookup(service,fromTable,as){
    let obj = {}
    try{
        obj = {
            "$lookup":{}
        }
        obj["$lookup"]["from"] = fromTable,
        obj["$lookup"]["let"] = {
            "ulb_id":"$ulb._id"
        }
        obj["$lookup"]['pipeline'] = [
            {
                "$match":{
                    "$expr":{
                        "$eq":["$ulb","$$ulb_id"]
                    }
                }
            }
        ]
        obj["$lookup"]['pipeline'].push(
            service.getCommonLookupObj("categories","category","_id","category")
        )
        obj["$lookup"]['pipeline'].push(service.getUnwindObj("$category",true))
        obj["$lookup"]["as"] = as
        return obj
    }
    catch(err){
        console.log("error in queryPipeLineLookup :: ",err.message)
    }
    return obj
}

function getFilteredProjects(filteredObj){
    let { sectors: sectorObj, type } = { ...filteredObj.filters }
    let sectorialObj = { "filters": { "sectors": sectorObj, type } }
    try{
        let obj = {
            "$addFields":{
                "projects":"$projects"
            }
        }
        if(sectorObj){
            let filters = getFilteredObjects(sectorialObj,"$projects")
            obj["$addFields"]["projects"] = filters
        }
        return obj
    }
    catch(err){
        console.log("error in getProjectsFilters :: ",err.message)
    }
}

function getDataAccToFilters(filteredObj){
    try{
        let obj = {
            "$addFields":{
                "results":"$data"
            }
        }
        if(filteredObj.provided){
            let filters = getFilteredObjects(filteredObj,"$data")
            obj["$addFields"]["results"] = filters
        }
        return obj
    }
    catch(err){
        console.log("error in getDataAccToFilters :: ",err.message)
        return {}
    }
}

function getPaginatedResults(skip,limit,csv){
    try{
        let obj = {
            "$addFields":{
                "rows": csv ? "$results" : {
                    "$slice": ["$results", skip, limit]
                } 
            }
        }
        return obj
    }
    catch(err){
        console.log("error in getPaginatedResults: :: ",err.message)
        return {}
    }
}

function concatArrays(){
    try{
        let obj = {
            "$addFields": {
                "data": { "$setUnion": ["$amrProjectData", "$durProjects"] },
                "projects": { "$setUnion": ["$amrprojectsNames", "$durProjectsNames"] },
                "sectors": {"$setUnion":["$amrSectors","$durSectors"]}
            }
        }
        return obj
    }
    catch(err){
        console.log("error in addFIeldsQuery :: ",err.message)
    }
}


function filterNoUlbShare(inputArr){
    try{
        let obj = {
            "$addFields":{
                "projects":{
                    "$filter":{
                        "input":inputArr,
                        "as":"row",
                        "cond":{
                            "$and":[
                                {"$gte":["$$row.expenditure",0]},
                                {"$lt":["$$row.expenditure","$$row.cost"]},
                                ]
                        }
                    }
                }
            }
        }
        return obj
    }
    catch(err){
        console.log("error in filterNoUlbShare :: ",err.message)
    }
}

function appendMultipleSorters(sortBy,order){
    try{
        let multipleKeys = {
            "totalProjectCost":["totalProjectCost"],
            "ulbShare":["ulbShare"]
        }
        let temp = {}
        let keysObj = multipleKeys[sortBy]
        for (let keys of  keysObj){
                temp[keys] = parseInt(order)
        }
        return temp
    }
    catch(err){
        console.log("error in appendMultipleSorters :: ",err.message)
    }
}

function getSortByKeysForMergedTable(sortBy, order) {
    let sortKey = {
        "provided": false
    }
    try {
        if ((sortBy != undefined) && (order != undefined)) {
            let temp = {}
            sortKey["provided"] = true
            if(Array.isArray(sortBy)){
                for(let key in sortBy){
                    let temp2 = {}
                    let name = sortBy[key]
                    if(!isNaN(parseInt(order[key]))){
                        // console.log("sorter::",order[key])
                        console.log(">>>")
                        temp2 = appendMultipleSorters(name,order)
                        Object.assign(temp,temp2)
                        // temp[sortFilterKeys[name]] = parseInt(order[key])
                    }
                }
            }
            else{
                if(!isNaN(parseInt(order))){
                    temp = appendMultipleSorters(sortBy,order)

                }
            }
            if (Object.keys(temp).length > 0){
                sortKey['provided'] = true
                sortKey["filters"] = temp
            }
        }
    }
    catch (err) {
        console.log("error in getSortByKeysForMergedTable ::: ", err.message)
    }
    console.log(sortKey)
    return sortKey
}

function getSortByKeys(sortBy, order) {
    let sortKey = {
        "provided": false
    }
    try {
        if ((sortBy != undefined) && (order != undefined)) {
            let temp = {}
            sortKey["provided"] = true
            if(Array.isArray(sortBy)){
                for(let key in sortBy){
                    let name = sortBy[key]
                    if(!isNaN(parseInt(order[key]))){
                        temp[sortFilterKeys[name]] = parseInt(order[key])
                    }
                }
            }
            else{
                if(!isNaN(parseInt(order))){
                    temp[sortFilterKeys[sortBy]] = parseInt(order)
                }
            }
            if (Object.keys(temp).length > 0){
                sortKey['provided'] = true
                sortKey["filters"] = temp
            }
        }
    }
    catch (err) {
        console.log("error in getSortByKeys ::: ", err.message)
    }
    console.log(sortKey)
    return sortKey
}

function createRedisKeys(filterObj,ulbId){
    try{
        let key = JSON.stringify(filterObj) + JSON.stringify(ulbId)
        return JSON.stringify(key)
    }
    catch(err){
        console.log("error while creating redis keys :: ",err.message)
    }
}

function deleteExtraKeys(arr,obj){
    for(var key of arr){
        delete obj[key]
    }
}

function changeDocument(document){
    let obj = {...document}
    if(!obj.projectName){
        return {}
    }
    if(obj['links'] && obj['links'].length){
        let arr = obj['links']
       
        for(var  rating in arr){
            let r = parseInt(rating) + 1
            obj[`creditRating${r}`]  = arr[rating]
            // console.log("arr[rating] :: ",arr[rating])
        }
    }
    else{
       for(let i=0; i<4 ; i++){
        obj[`creditRating${i+1}`] = '' 
       }
    }
    return obj
}

module.exports.getInfrastructureProjects = catchAsync(async (req, res) => {
    let response = {
        success: false,
        message: "Something went wrong"
    }
    let menuNames = ['filterYear','type','implementationAgencies', 'sectors', 'projects']
    let keysDisplayName = {
        "filterYear": "Year",
        'type': "Type",
        'sectors': "Sectors",
        'projects': "Projects",
        'implementationAgencies': "Implemenation Agency"
    }
    let status = 500
    let dbResponse = []
    try {
        let { ulbId } = req.params
        let filters = { ...req.query }
        let skip = parseInt(filters.skip) || 0
        let limit = parseInt(filters.limit) || 10
        let { getQuery, sortBy, order,csv } = filters
        csv = csv === "true" ? true :false;
        let design_year = filters.filterYear || years['2022-23']
        let redis_key = createRedisKeys(filters,ulbId)
        let sortKey = getSortByKeysForMergedTable(sortBy, order)
        deleteExtraKeys(['getQuery','limit','skip','order','sortBy','csv','filterYear'],filters)
        let filteredObj = getFiltersForModule(filters)
        if (ulbId === undefined) {
            // if (ulbId === undefined) {
                response.message = "ulb id is missing"
            // }
            return res.status(status).json(response)
        }
        let query = await getQueryCityRelated({ ulbId, skip, limit, filteredObj, sortKey,csv,design_year })
        
        if (getQuery === "true") {
            return res.status(200).json(query)
        }
        // let document = await redisStoreData(redis_key);
        // if (document) {
        //     dbResponse = JSON.parse(document)
        // } else {
        dbResponse = await Ulb.aggregate(query).allowDiskUse(true)
        // await Redis.set(redis_key, JSON.stringify(dbResponse));
        // }
        if(csv){
            let filename = "Projects.csv"
            let dbCols = Object.values(csvCols)
             await sendCsv(filename,"Ulb",query,res,dbCols,csvCols,"rows",changeDocument)
             return;
        }
        if (dbResponse.length) {
            response.total = dbResponse[0].total;
            response.rows = dbResponse[0]['rows'] || [];
            response.filters = menuNames.map(el => {
                let options = null;
                if (el === "filterYear") {
                    options = filterYears.map(item => ({
                        name: item.label,
                        _id: item.id
                    }));
                } else if (el === "type") {
                    options = types;
                } else {
                    options = dbResponse[0][el];
                }
                return {
                    key: el,
                    name: keysDisplayName[el],
                    options
                };
            });
            response.columns = columns;
            response.message = "Fetched Successfully";
        }
        
        else {
            response.message = "No data for particular ulb"
            response.rows = []
            response.filters = []
        }
        console.log("filterYears :: ",filterYears)
        response.filterYears = filterYears
        response.filterYear = design_year
        response.columns = columns
        response.success = true
        return res.status(200).json(response)
    }
    catch (err) {
        response.message = err.message
        console.log("error in getInfrastructureProjects ::: ", err.message)
    }
    return res.status(status).json(response)
})



const redisStoreData = (redis_key) => {
    return new Promise((resolve, reject) => {
        Redis.get(redis_key, (err, dk) => {
            if (err) {
                console.log("err", err.message)
                reject(err);
            } else {
                resolve(dk);
            }
        });
    })
}

function getProjectionForDur(service){
    let totalProjectCostSum = service.addTwoFieldData("$totalDurProjectCost", "$totalAmrutProjectCost"); 
    let totalProjectSum = service.addTwoFieldData("$totalAmrutProjects", "$totalDurProjects");
    let totalUlbShareSum = service.addTwoFieldData("$ulbShare", "$totalAmrutUlbShare"); 
    try{
        const obj = {
            "$project":{
                "ulbName":"$name",
                "stateName":"$state.name",
                "totalProjectCost":totalProjectCostSum,
                "totalProjects":totalProjectSum,
                "ulbShare" :totalUlbShareSum,
                "expenditureTotal":{
                    $sum :"$DUR.projects.expenditure"
                },
                // "total":{"$count":"$DUR.ulb"}
            }
        }
        return obj
    }
    catch(err){
        console.log("error in getProjectionForDur :: ",err.message)
    }
}


const getApprovedFormQuery =(keyName = false,designYear)=>{
    let statusKeyName = (keyName) ? `${keyName}.status` : "status"
    let actionKeyName = (keyName) ? `${keyName}.actionTakenByRole` : "actionTakenByRole" 
    let outDatedYears = ["2018-19", "2019-20", "2021-22", "2022-23"]
    let queryObj = {
        "$or": []
    }
    try{
        let stringStatusQuery = {
            "$or": [
                {
                    "$and": [
                        {
                            "$eq": [`$${actionKeyName}`,
                                "STATE"]
                        },
                        {
                            "$eq": [`$${statusKeyName}`,
                                "APPROVED"]
                        }
                    ]
                },
                {
                    "$and": [
                        {
                            "$eq": [`$${actionKeyName}`,
                                "MoHUA"]
                        },
                        {
                            "$eq": [`$${statusKeyName}`,
                                "APPROVED"]
                        }
                    ]
                },
            ]

        }
        let idWiseQuery = {
            "$in":["$currentFormStatus",[MASTER_FORM_STATUS.SUBMISSION_ACKNOWLEDGED_BY_MoHUA,MASTER_FORM_STATUS.UNDER_REVIEW_BY_MoHUA]]       
        }

        for (const year of designYear) {
            const yearKey = getKeyByValue(years, year.toString());
            const queryForYear = outDatedYears.includes(yearKey) ? stringStatusQuery : idWiseQuery;
            queryObj["$or"].push(queryForYear);
        }

        return queryObj
    }
    catch(err){
        console.log("error in getApprovedFormQuery ::: ",err.message)
    }
}

function lookupQueryForAmrut(service,designYear,project=false){
    try{
        let obj = {
            "$lookup":{
                "from":"amrutprojects",
                "let":{
                    "ulb_id":"$_id",
                    "designYearArray": Array.isArray(designYear) ? designYear.map(year => ObjectId(year)) : [ObjectId(designYear)]
                },
                "pipeline":[
                    {
                        "$match":{
                            "$expr":{
                                "$and":[
                                    service.getCommonEqObj("$ulb","$$ulb_id"),
                                    // service.getCommonEqObj("$designYear","$$designYear")
                                    { "$in": ["$designYear", "$$designYearArray"] },
                                ]
                            }
                        }
                    }
                ],
                "as":"AMRUT"
            }
        }
        return obj
    }
    catch(err){
        console.log("error in lookupQUery :: ",err.message)
    }
}

function lookupQueryForDur(service,designYear,project=false){
    try{
        designYear = Array.isArray(designYear) ? designYear.map(year => ObjectId(year)) : [ObjectId(designYear)]
        let obj = {
            "$lookup":{
                "from":"utilizationreports",
                "let":{
                    "ulb_id":"$_id",
                    "designYearArray": designYear
                },
                "pipeline":[
                    {
                        "$match":{
                            "$expr":{
                                "$and":[
                                    service.getCommonEqObj("$ulb","$$ulb_id"),
                                    { "$in": ["$designYear", "$$designYearArray"] },
                                    service.getCommonEqObj("$isDraft",false),
                                    getApprovedFormQuery(false,designYear)
                                ]
                            }
                        }
                    }
                ],
                "as":"DUR"
            }
        }
        obj['$lookup']['pipeline'].push(filterNoUlbShare("$projects"))
        if(project){
            obj['$lookup']['pipeline'].push(
                {
                    "$project":{
                        "projects":1
                    }
                }
            )
        }
        return obj
    }
    catch(err){
        console.log("error in lookupQUery :: ",err.message)
    }
}

function facetQueryForPagination(skip,limit,sortKey){
    let dataArr = []
    if(sortKey.provided){
        dataArr.push(
            {
                "$sort":sortKey.filters
            }
        )
    }
    dataArr.push({"$skip":skip})
    dataArr.push({"$limit":limit})
    try{
        let obj = {
            "$facet":{
                "total": [
                    { $group: {
                      _id: null,
                      total: { $sum: 
                        { $cond: 
                            { if:  
                                { $gt: ["$ulbShare", 0 ] } , 
                                then: 1, 
                                else: 0 } } },
                    }}
                ],
                "data":dataArr
            }
        }
        return obj
    }
    catch(err){
        console.log("error in facetQueryForPagination :: ",err.message)
    }
}
// {
//     "$unwind":{
//         "path":"$data",
//         "preserveNullAndEmptyArrays":true
//     }
// },
// {
//     "$sort":{
//         "data.expenditure":1,
//     }  
// },
// {
//     "$group":{
//         "_id":"data.projectId",
//         "data":{
//             "$push":"$data"
//         },
//         "implementationAgencies":{
//             "$first" :"$implementationAgencies"
//         },
//         "sectors":{
//             "$first":"$sectors"
//         },
//        "projects":{
//            "$first":"$projects"
//        }
//     }
// },


function groupQuery(){
    try{
        let groupByQuery = {
            "$group":{
                "_id":"data.projectId",
                "data":{
                    "$push":"$data"
                },
                "implementationAgencies":{
                    "$first" :"$implementationAgencies"
                },
                "sectors":{
                    "$first":"$sectors"
                },
               "projects":{
                   "$first":"$projects"
               }
            }
        }
        return groupByQuery
    }
    catch(err){
        console.log("error in groupQUery ::: ",err.message)
    }
}


function unWindForSort(service,sortKey){
    try{
        let queryObj = []
        let sorters = Object.entries(sortKey.filters).reduce((acc,[key,value])=>(
            {...acc,[`data.${key}`]:value}
        ),{})
        queryObj.push(service.getUnwindObj("$data",true)),
        queryObj.push({
            "$sort":sorters
        })
        queryObj.push(groupQuery())
        return queryObj
    }
    catch(err){
        console.log("error in unWindForSort ::: ",err.message)
    }
}


// new Query >>>>>>>>>>>>>>>>>
function getQueryCityRelated(obj){
    let service = AggregationServices
    let { ulbId, skip, limit, filteredObj, sortKey,csv,years,design_year:designYear} = obj
    try{
        let query = []
        let matchQuery = {
            "$match":{
                "_id":ObjectId(ulbId)
            }  
       }
       query.push(matchQuery)
       if(csv){
        query.push(addCensusCode())
        query.push(service.getCommonLookupObj("states", "state", "_id", "state"))
        query.push(service.getUnwindObj("$state", true))
    }
        query.push(lookupQueryForDur(service,designYear,true))
        query.push(service.getUnwindObj("$DUR",true))
        query.push(lookupQueryForAmrut(service, designYear))
        query.push(service.getUnwindObj("$AMRUT",true))
        query.push(filterNoUlbShare("$DUR.projects"))
        // query.push(service.addFields("projects","$DUR.projects"))
        query.push(service.addFields("amrProjects","$AMRUT"))
        query.push(service.getUnwindObj("$projects",true))
        query.push(service.getCommonLookupObj("categories", "projects.category", "_id", "projectCategory"))
        query.push(service.getCommonLookupObj("creditratings", "_id", "ulb", "links"))
        query.push(service.getUnwindObj("$projectCategory",true))
        query.push(service.getCommonLookupObj("categories", "amrProjects.category", "_id", "amrProjects.category"))
        query.push(service.getUnwindObj("$amrProjects.category",true))
        let fieldsForCalc = {
            "fromValue":"$amrProjects.cost",
            "toValue":"$amrProjects.expenditure"
        }
        query.push(service.addFields("amrUlbShare","$amrProjects.ulbShare"))
        query.push(service.addFields("totalProjectCost","$projects.cost"))
        // let fieldsToAdd = getExpendituresField()
        // query = query.concat(service.addMultipleFields(fieldsToAdd,true))
        let fieldstoCalculate = {
            fromValue:"$totalProjectCost",
            toValue: "$projects.expenditure"
        }
        query.push(addUlbShare(service,fieldstoCalculate))
        let groupBy = getGroupByQuery(service,ulbId,csv)
        let projections = getProjectionQueries(service, filteredObj, skip, limit, sortKey)
        query.push(groupBy)
        query.push(concatArrays())
        query.push(getFilteredProjects(filteredObj))
        if(sortKey.provided){
            let unwindedSortedProject = unWindForSort(service,sortKey)
            query = [...query,...unwindedSortedProject]
        }
        query.push(getDataAccToFilters(filteredObj))
        query.push(getPaginatedResults(skip,limit,csv))
        query.push(projections)
        return query
    }
    catch(err){
        console.log("error ::: ",err)
        console.log("error in getQueryCityRelated:::",err.message)
    }
}
///ends 
function getQueryStateRelated(designYear,filterObj,sortKey,skip,limit){
    const service = AggregationServices
    let query = []
    try{
        let match = {
            "$match":{
                "access_2223":true
            }
        }
        // stage 1
        query.push(service.getCommonLookupObj("states","state","_id","state"))
        query.push(service.getUnwindObj("$state",true))
        // stage 2
        query.push(lookupQueryForAmrut(service,designYear))
        //stage 3
        query.push(lookupQueryForDur(service,designYear,true))
        query.push(service.getUnwindObj("$DUR",true))

        // add fields 
        let fields = {
            fromValue:{
                "$sum": {
                    "$sum": "$DUR.projects.cost"
                }
            },
            toValue:{
                "$sum": {
                    "$sum": "$DUR.projects.expenditure"
                }
            }
        }
        query.push(addUlbAndAmrutFields(service,fields))
        //stage 4
        query.push(getProjectionForDur(service))
        // stage match if filters provided
        let matchObj = {
            "$match":{
                "ulbShare":{"$gte":1}
            }
        }
        if(filterObj.provided){
            Object.assign(matchObj["$match"],filterObj.filters)
        }

        query.push(matchObj)
       
        // stage 4
        query.push(facetQueryForPagination(skip,limit,sortKey))
        query.push({
            "$project":{
                "total":{ $arrayElemAt: [ "$total.total", 0 ] },
                "data":1
            }
        })
    }
    catch(err){
        console.log("error in getQueryStateRelated :: ",err.message)
    }
    return query
}

module.exports.getInfProjectsWithState = catchAsync(async(req,res,next)=>{
    let response = {
        success:false,
        message:"",
        columns : dashboardColumns,
        total : 0,
        data:[],
        filterYears:filterYears,
        filterYear:years['2022-23']
    }
    try{
        let skip = parseInt(req.query.skip) || 0
        let limit = parseInt(req.query.limit) || 10
        let {sortBy,order} = req.query
        let filters = {...req.query}
        let designYear = filters.filterYear || years['2022-23']
        let getQuery = req.query.getQuery === "true" || false
        
        await deleteExtraKeys(["sortBy","order","skip","limit","getQuery","filterYear"],filters)
        filters = await GlobalService.mapFilter(filters)
        let filterObj = {
            "provided":Object.keys(filters).length > 0 ? true :false,
            "filters":Object.keys(filters).length > 0 ? {...filters} :"",
        }
        let sortKey = getSortByKeys(sortBy, order)
        let query = await getQueryStateRelated(designYear,filterObj,sortKey,skip,limit)

        if(["staging","demo"].includes(process.env.ENV) && getQuery){
            return res.json(query)
        }
        let dbResponse = await Ulb.aggregate(query)
        response.data = dbResponse[0]['data']
        response.total = dbResponse[0]['total'] || 0
        response.filterYear = designYear
        response.message = "Fetched Successfully"
        response.success = true
        return res.status(200).json(response)
    }
    catch(err){
        response.message = "Something went wrong"
        console.log("error in getInfProjectsWithState :: ",err.message)
    }
    res.status(500).json(response)
})

module.exports.bulkUpload = catchAsync(async (req, res, next) => {
    try {
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath);
        const data = await readXlsxFile({ path: filePath, buffer: fileContent });
        //perform validation of the fields in the xls or xlsx
        const validationErrors = await validateBulkUpload(data, res)

        if (validationErrors.length > 0) {
            return res.status(400).send({ status: false, errors: validationErrors });
        }

        // Apply the mapping to transform the data keys
        const transformedData = transformData(data);

        //preform the bulk upload logic.
        await performBulkUpload(req, res, transformedData)
    }
    catch (err) {
        console.log("error in amrutBulkUpload :: ", err.message)
        return res.status(500).send({ status: false, message: "Something went wrong" });
    }
})

async function readXlsxFile(file) {
    try {
        const fileInfo = file.path.split(".");
        let exceltojson = xlstojson;

        if (fileInfo && fileInfo.length > 0 && fileInfo[fileInfo.length - 1] === "xlsx") {
            exceltojson = xlsxtojson
        }

        return sheet = await new Promise((resolve, reject) => {
            exceltojson({ input: file.path, output: null, lowerCaseHeaders: true },
                function (err, sheet) {
                    if (err) {
                        reject({ message: "Error: sheet1" });
                    } else {
                        resolve(sheet);
                    }
                }
            );
        });

    } catch (error) {
        console.log("readXlsxFile: Exception", error);
        throw {
            message: "Caught Exception while reading file.",
            errMessage: error.message,
        };
    }
}
function isValidDateOrNumber(value, isDate = false) {
    if (isDate) {
        const datePattern = /^(\d{2}-\d{2}-\d{4})|(\d{1,2}\/\d{1,2}\/\d{2})$/;
        return datePattern.test(value);
    } else {
        const numberPattern = /^\d+(\.\d+)?$/;
        return numberPattern.test(value);
    }
}
function validateAWSS3Link(link) {
    const prefix = "https://";
    const suffix = ".s3.ap-south-1.amazonaws.com";
    const pdfSuffix = ".pdf";
  
    return link.startsWith(prefix) && link.includes(suffix) && link.endsWith(pdfSuffix);
  }
  

async function validateFileSize(awsS3Link, maxSizeInMB) {
    try {
        const response = await axios.head(awsS3Link);
        const contentLength = response.headers['content-length'];

        if (contentLength) {
            const fileSizeInBytes = parseInt(contentLength);
            const fileSizeInMB = fileSizeInBytes / (1024 * 1024); // Convert to MB

            console.log({ fileSizeInMB })
            if (fileSizeInMB > maxSizeInMB) {
                return false;
            }
            return true;
        } else {
            throw new Error('Content-Length header not found in response');
        }
    } catch (error) {
        console.error(error);
        return 'from catch';
    }
}

async function validateBulkUpload(data, res) {
    const validationFields = [
        { field: 'dpr preparation date', isDate: true },
        { field: 'estimated project award date', isDate: true },
        { field: 'estimated project completion date', isDate: true },
        { field: 'latitude' },
        { field: 'longitude' },
        { field: 'total project cost (in cr.)' },
        { field: 'project central assistance  (in cr.)' },
        { field: 'project state share (in cr.)' },
        { field: 'project ulb share (in cr.)' },
        { field: 'project central assistance  (in cr.)' },
        { field: 'capex ulb share (in cr.)' },
        { field: 'o&m central assistance  (in cr.)' },
        { field: 'o&m state share  (in cr.)' },
        { field: 'o&m ulb share  (in cr.)' }
    ];
    const errors = [];
    try {
        for (const item of data) {
            for (const fieldInfo of validationFields) {
                const fieldValue = item[fieldInfo.field];

                if (fieldValue && !isValidDateOrNumber(fieldValue, fieldInfo.isDate)) {
                    errors.push(`${fieldInfo.field} is invalid`);
                }
            }
            if (item['year'] && !years[item['year']]) {
                errors.push(`year is invalid of this for the project having code: ${item['project code']} it should be in the format of YYYY-YY (Ex:-2023-24)`)
            }
            if (item['is dpr prepared?'] && !['yes', 'no'].includes(item['is dpr prepared?'].toLowerCase())) {
                errors.push(`Dpr prepration is invalid (only Yes or No allowed) of this ulb  :- ${item['ulb']}`)
            }
            if (item['dpr (pdf)'] && !validateAWSS3Link(item['dpr (pdf)'])) {
                errors.push(`dpr document link is invalid of this ulb :- ${item['ulb']}`)
            }

            if (item['dpr (pdf)']) {
                let validFileSize = await validateFileSize(item['dpr (pdf)'], 5)
                if (!validFileSize) {
                    errors.push(`DPR (pdf) file size exceeds 5MB for this ulb: ${item['ulb']}`);
                }
            }
        }
        return errors;
    } catch (error) {
        console.log("readXlsxFile: Exception", error);
        throw {
            message: "Caught Exception while reading file.",
            errMessage: error.message,
        };
    }
}

// Function to change keys and transform the data to match the model fields.
function transformData(data) {
    return data.map((item) => {
        return {
            name: item['project title'],
            categoriesName: item['form type/ sector'],
            cost: croreToLakh(item['total project cost (in cr.)']),
            code: item['project code'],
            ulbCode: item['code'],
            ulbName: item['ulb'],
            designYear: years[item['year']],
            stateShare: croreToLakh(item['project state share (in cr.)']),
            capitalExpenditureState: croreToLakh(item['capex state share  (in cr.)']),
            capitalExpenditureUlb: croreToLakh(item['capex ulb share (in cr.)']),
            capitalExpenditureCentralAssist: croreToLakh(item['capex central assistance  (in cr.)']),
            CentralAssistCost: croreToLakh(item['project central assistance  (in cr.)']),
            omExpensesUlb: croreToLakh(item['o&m ulb share  (in cr.)']),
            omExpensesState: croreToLakh(item['o&m state share  (in cr.)']),
            omExpensesCentralAssist: croreToLakh(item['o&m central assistance  (in cr.)']),
            ulbShare: croreToLakh(item['project ulb share (in cr.)']),
            startDate: new Date(item['estimated project award date'].split("-").reverse().join("-")),
            endDate: new Date(item['estimated project completion date'].split("-").reverse().join("-")),
            location: { lat: item['latitude'], lng: item['longitude'] },
            dprPrepared: item['is dpr prepared?'].toLowerCase() == "yes" ? "Yes" : "No",
            dprPrepDate: new Date(item['dpr preparation date'].split("-").reverse().join("-")),
            dprDocument: {
                name: "",
                url: item['dpr (pdf)']
            }
        };
    });
}

function croreToLakh(crore) {
    var lakh = crore * 100;
    return lakh;
}

async function performBulkUpload(req, res, data) {
    try {
        const bulkOps = [];
        const ulbMap = new Map();
        const categoryMap = new Map();

        for (const itemData of data) {
            const findUlbName = itemData['ulbName'].toLowerCase();
            if (!ulbMap.has(findUlbName)) {
                // const findUlb = await Ulb.findOne({
                //     name: { $regex: new RegExp(`^${findUlbName}`, 'i') }
                // });
                const findUlb = await Ulb.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${findUlbName}`, 'i') } },
                        { code: itemData['ulbCode'] }
                    ]
                });
                ulbMap.set(findUlbName, findUlb);
            }

            const findCategoryName = itemData['categoriesName'].toLowerCase();
            if (!categoryMap.has(findCategoryName)) {
                const findCategory = await Category.findOne({
                    name: { $regex: new RegExp(`^${findCategoryName}`, 'i') }
                });
                categoryMap.set(findCategoryName, findCategory);
            }

            const ulb = ulbMap.get(findUlbName);
            if (ulb) {
                itemData['ulb'] = ulb._id;
            } else {
                return res.status(400).send({ status: false, message: `ULB not found with this name: ${itemData.ulbName}` })
            }

            const category = categoryMap.get(findCategoryName);
            if (category) {
                itemData['category'] = category._id;
            } else {
                return res.status(400).send({ status: false, message: `Form Type/ Sector not found with this name: ${itemData.categoriesName}` })
            }
            bulkOps.push(itemData)
            // bulkOps.push({ insertOne: { document: itemData } });
        }
        if (bulkOps.length > 0) {
            await AmrutReports.insertMany(bulkOps);
        }

        return res.status(201).send({ status: true, message: `Data Uploaded successfully!` })
    } catch (error) {
        console.log("performBulkUpload: Exception", error);
        throw {
            message: "Caught Exception while saving file.",
            errMessage: error.message,
        };
    }
}