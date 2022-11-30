const mongoose = require('mongoose');
const ObjectId = require("mongoose").Types.ObjectId;
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const UlbLedger = require('../../models/UlbLedger');
const { fiscalRankingFormJson } = require('./fydynemic');


exports.CreateorUpdate = async (req, res, next) => {
  try {
    let { ulb, design_year } = req.body;
    if (!ulb && !design_year) {
      return res.status(400).json({ status: false, message: "ULB and Design year required fields!" });
    }
    let condition = { "ulb": ObjectId(ulb), design_year: ObjectId(design_year) }
    let fsData = await FiscalRanking.findOne(condition).lean();
    let id = "";

    if (fsData) {
      id = fsData._id;
      let fsMapper = await FiscalRankingMapper.find({ fiscal_ranking: ObjectId(fsData._id) });
      let obj = { ...fsData, fsMapper };
      delete obj.history;
      let history = fsData.history;
      history.push(obj);
      req.body['history'] = history;
      await FiscalRankingMapper.deleteMany({ fiscal_ranking: ObjectId(fsData._id) });
      await FiscalRanking.update(condition, req.body);
    } else {
      let d = await FiscalRanking.create(req.body);
      id = d._id;
    }
    if (req.body && req?.body?.fyData?.length) {
      req.body.fyData.map(e => {
        e['fiscal_ranking'] = ObjectId(id);
      })
      await fRMapperCreate({ fyData: req.body.fyData });
    }
    return res.status(200).json({
      status: true,
      message: "Successfully saved data!"
    });
  } catch (error) {
    console.log(error);
    let msg = "Something went wrong";
    if (error?.code === "11000") {
      msg = "Form already submitted."
    }
    return res.status(400).json({
      status: false,
      message: msg,
    });
  }
}
/**
 * It takes in an object with a property called fyData, which is an object with properties that match
 * the columns in the FiscalRankingMapper table. It then creates a new row in the FiscalRankingMapper
 * table with the data in fyData
 * @param objData - {
 */
const fRMapperCreate = (objData) => {
  return new Promise(async (resolve, reject) => {
    try {
      let { fyData } = objData;
      let d = await FiscalRankingMapper.create(fyData);
      resolve(d)
    } catch (error) {
      reject(error);
    }
  })
}

/* A function which is used to get the data from the database. */
exports.getView = async function (req, res, next) {
  try {
    let condition = {};
    if (req.query.ulb && req.query.design_year) {
      condition = { "ulb": ObjectId(req.query.ulb), "design_year": ObjectId(req.query.design_year) }
    }
    let data = await FiscalRanking.findOne(condition, { "history": 0 }).lean();
    let viewOne = {};
    let fyData = [];
    if (data) {
      fyData = await FiscalRankingMapper.find({ fiscal_ranking: data._id }).lean();
      viewOne = { data, fyData }
    } else {
      let numberOfQuestion = {
        value: null,
        status: "",
        actionTakenByRole: "",
      }
      viewOne = {
        "ulb": null,
        "design_year": null,
        "population11": null,
        "populationFr": null,
        "webLink": null,
        "nameCmsnr": "",
        "nameOfNodalOfficer": "",
        "designationOftNodalOfficer": "",
        "email": null,
        "mobile": null,
        "webUrlAnnual": numberOfQuestion,
        "digitalRegtr": numberOfQuestion,
        "registerGis": numberOfQuestion,
        "accountStwre": numberOfQuestion,
        "totalOwnRevenueArea": numberOfQuestion,
        "fy_19_20_cash": {
          "type": null,
          "amount": null,
          "status": "",
          "actionTakenByRole": ""
        },
        "signedCopyOfFile": {
          "name": null,
          "url": null
        },
        "fy_19_20_online": {
          "type": null,
          "amount": null,
          "status": "",
          "actionTakenByRole": ""
        },
        "fyData": [],
        "property_tax_register": {
          "value": "",
          "status": "",
          "actionTakenByRole": ""
        },
        "paying_property_tax": {
          "value": "",
          "status": "",
          "actionTakenByRole": ""
        },
        "paid_property_tax": {
          "value": "",
          "status": "",
          "actionTakenByRole": ""
        },
        "isDraft": null
      }
    }

    let fyDynemic = await fiscalRankingFormJson();
    let ulbData = await ulbLedgersData({ "ulb": req.query.ulb });
    let ulbDataUniqueFy = await ulbLedgerFy({ "financialYear": { $in: ['2016-17', '2017-18', '2018-19', '2019-20'] }, "ulb": ObjectId(req.query.ulb) });
    for (let sortKey in fyDynemic) {
      let subData = fyDynemic[sortKey];
      for (let key in subData) {
        for (let pf of subData[key]?.yearData) {
          if (pf?.code?.length > 0) {
            if (fyData.length) {
              let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type));
              if (singleFydata) {
                pf['amount'] = singleFydata.amount;
                pf['status'] = singleFydata.status;
              } else {
                let ulbFyAmount = await getUlbLedgerDataFilter({ code: pf.code, year: pf.year, data: ulbData });
                pf['amount'] = ulbFyAmount;
                pf['status'] = ulbFyAmount ? "NA" : "";
              }
            } else {
              let ulbFyAmount = await getUlbLedgerDataFilter({ code: pf.code, year: pf.year, data: ulbData });
              pf['amount'] = ulbFyAmount;
              pf['status'] = ulbFyAmount ? "NA" : "";
            }
          } else {
            if (['appAnnualBudget', 'auditedAnnualFySt'].includes(subData[key]?.key)) {
              if (fyData.length) {
                let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type));
                if (singleFydata) {
                  pf['file'] = singleFydata.file;
                  pf['status'] = singleFydata.status;
                } else {
                  let chekFile = ulbDataUniqueFy ? ulbDataUniqueFy.some(el => el?.year_id.toString() === pf?.year.toString()) : false;
                  pf['readonly'] = chekFile;
                  pf['status'] = chekFile ? "NA" : ""
                }
              } else {
                let chekFile = ulbDataUniqueFy ? ulbDataUniqueFy.some(el => el?.year_id.toString() === pf?.year.toString()) : false;
                pf['readonly'] = chekFile;
                pf['status'] = chekFile ? "NA" : "";
              }
            } else {
              if (fyData.length) {
                if (pf.year && pf.type) {
                  let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type));
                  pf['amount'] = singleFydata ? singleFydata.amount : 0;
                  pf['status'] = singleFydata ? singleFydata.status : "";
                }
              }
            }
          }
        }
      }
    }
    return res.status(200).json({ status: false, message: "Success fetched data!", "data": viewOne, fyDynemic });
  } catch (error) {
    console.log("err", error)
    return res.status(400).json({ status: false, message: "Something error wrong!" });
  }
}

/**
 * It takes an object with three properties (code, year, data) and returns the sum of the totalAmount
 * property of the objects in the data array that have a code property that matches one of the values
 * in the code array and a year_id property that matches the year property
 * @param objData - The object that contains the data to be filtered.
 */
const getUlbLedgerDataFilter = (objData) => {
  const { code, year, data } = objData;
  if (code.length) {
    let ulbFyData = data.length ? data.filter(el => code.includes(el.code) && el.year_id.toString() === year.toString()) : []
    var sum = ulbFyData ? ulbFyData.reduce((pv, cv) => pv + cv.totalAmount, 0) : 0;
    return sum;
  } else {
    return 0;
  }
}
/**
 * It returns an array of years from the ulb_ledger collection, based on the condition passed to it
 * @param condition - This is the condition that you want to apply to the query.
 */
const ulbLedgerFy = (condition) => {
  return new Promise(async (resolve, reject) => {
    try {
      let data = await UlbLedger.aggregate([
        { $match: condition },
        {
          $group: {
            _id: "$financialYear",
          }
        },
        {
          $lookup: {
            from: "years",
            localField: "_id",
            foreignField: "year",
            as: "years"
          }
        },
        { $unwind: "$years" },
        {
          $project: {
            _id: 0,
            year_id: "$years._id",
            year: "$years.year"
          }
        }
      ])

      resolve(data)
    } catch (error) {
      reject(error);
    }
  })
}
/**
 * It takes an object with a single property, ulb, which is the id of the ULB, and returns a promise
 * that resolves to an array of objects, each of which has the following properties: year_id, year,
 * code, and totalAmount
 * @param objData - {
 */
const ulbLedgersData = (objData) => {
  return new Promise(async (resolve, reject) => {
    const { ulb } = objData;
    try {
      let data = await UlbLedger.aggregate([
        { $match: { ulb: ObjectId(ulb) } },
        {
          $lookup: {
            from: "lineitems",
            localField: "lineItem",
            foreignField: "_id",
            as: "lineitems"
          }
        },
        { $unwind: "$lineitems" },
        {
          $project: {
            _id: 1,
            year: "$financialYear",
            amount: 1,
            ulb: 1,
            code: "$lineitems.code"
          }
        },
        {
          $match: {
            code: { $in: ["110", "130", "140", "150", "180", "11001", "410", "412", "210", "220", "230", "240", "200"] },
            year: { $in: ['2016-17', '2017-18', '2018-19', '2019-20'] }
          }
        },
        {
          "$group": {
            "_id": { "year": "$year", "code": "$code" },
            "totalAmount": { $sum: "$amount" }
          }
        },
        {
          $project: {
            year: "$_id.year",
            code: "$_id.code",
            totalAmount: 1
          }
        },
        {
          $lookup: {
            from: "years",
            localField: "year",
            foreignField: "year",
            as: "years"
          }
        },
        {
          $unwind: "$years"
        },
        {
          $project: {
            _id: 0,
            year_id: "$years._id",
            year: "$years.year",
            code: "$_id.code",
            totalAmount: 1
          }
        }
      ]);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  })
}
exports.getAll = async function (req, res, next) {
  try {
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;
    let limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let condition = {};
    if (req.decoded.ulb) {
      condition['ulb'] = ObjectId(req.decoded.ulb);
    }
    let prmsArr = []
    if (!skip || true) {
      let totalPrms = new Promise((resolve, reject) => {
        FiscalRanking.count(condition).exec((err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      });
      prmsArr.push(totalPrms);
    }

    let dataPrms = new Promise((resolve, reject) => {
      FiscalRanking.aggregate([
        { $match: condition },
        {
          $lookup: {
            from: "ulbs",
            as: "ulb",
            localField: "ulb",
            foreignField: "_id",
          },
        },
        { "$unwind": "$ulb" },
        {
          $lookup: {
            from: "years",
            as: "design_year",
            localField: "design_year",
            foreignField: "_id",
          },
        },
        { "$unwind": "$design_year" },
        {
          "$lookup": {
            "from": "fiscalrankingmappers",
            "let": {
              "fyId": "$_id"
            },
            "pipeline": [
              {
                "$match": {
                  "$expr": {
                    "$eq": [
                      "$fiscal_ranking",
                      "$$fyId"
                    ]
                  }
                }
              },
              {
                "$lookup": {
                  "from": "years",
                  "let": { "yeardId": "$year" },
                  "pipeline": [
                    {
                      "$match": {
                        "$expr": {
                          "$eq": [
                            "$_id",
                            "$$yeardId"
                          ]
                        }
                      }
                    }
                  ],
                  "as": "years"
                }
              },
              { "$unwind": "$years" },
            ],
            "as": "fyData"
          }
        },
        {
          $project: {
            "fy_19_20_cash": 1,
            "fy_19_20_online": 1,
            "population11": 1,
            "populationFr": 1,
            "webLink": 1,
            "nameCmsnr": 1,
            "nameOfNodalOfficer": 1,
            "designationOftNodalOfficer": 1,
            "mobile": 1,
            "webUrlAnnual": 1,
            "totalOwnRevenueArea": 1,
            "property_tax_register": 1,
            "paying_property_tax": 1,
            "paid_property_tax": 1,
            "createdAt": 1,
            "modifiedAt": 1,
            "isDraft": 1,
            "ulb": { "name": "$ulb.name", "_id": "$ulb._id", "code": "$ulb.code" },
            "design_year": 1,
            "email": 1,
            "digitalRegtr": 1,
            "registerGis": 1,
            "accountStwre": 1,
            "fyData": 1
          }
        },
        { $skip: skip },
        { $limit: limit }
      ]).exec((err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    prmsArr.push(dataPrms);
    Promise.all(prmsArr).then((values) => {
      if (values.length == 2) {
        return res.status(200).json({
          status: true,
          message: "Successfully saved data!",
          total: values[0],
          data: values[1]
        });
      } else {
        return res.status(200).json({
          status: true,
          message: "Successfully saved data!",
          total: values[0]
        });
      }
    }, (rejectError) => {
      console.log("final rejectError", rejectError);
      return res.status(400).json({ status: false, message: "Something error wrong!" });
    }).catch((caughtError) => {
      return res.status(400).json({ status: false, message: "Something error wrong!" });
    });
  } catch (error) {
    console.log("err", error)
    return res.status(400).json({ status: false, message: "Something error wrong!" });
  }
}
exports.approvedByMohua = async function (req, res, next) {
  try {
    let { ulb, design_year, year, type, actionTakenByRole, status } = req.body;
    if (!ulb && !design_year) {
      return res.status(400).json({ status: false, message: "ULB and Design year required fields!" });
    }
    let condition = { "ulb": ObjectId(ulb), design_year: ObjectId(design_year) }
    let fsData = await FiscalRanking.findOne(condition).lean();
    if (fsData) {
      let frMCount = await FiscalRankingMapper.count({ "fiscal_ranking": fsData._id, "status": "PENDING" }).lean();
      let cond = {
        "fiscal_ranking": fsData._id,
        "year": year,
        "type": type
      }
      let upObj = {
        "actionTakenByRole": actionTakenByRole,
        "actionTakenBy": req.decoded._id,
        "status": status,
        "modifiedAt": new Date()
      }
      if (year) {
        let d = await FiscalRankingMapper.findOneAndUpdate(cond, upObj, { upsert: true, new: false });
      } else {
        let upObj1 = fsData[type];
        upObj1['status'] = status
        upObj1['actionTakenByRole'] = actionTakenByRole
        upObj1['actionTakenBy'] = req.decoded._id
        let d = await FiscalRanking.findOneAndUpdate(condition, { $set: { [type]: upObj1 } }, { upsert: true, new: false });
      }
      if (frMCount == 0 && !await checkPendingStatus(fsData)) {
        let d = await FiscalRanking.findOneAndUpdate(condition, { $set: upObj }, { upsert: true, new: false });
      }
      return res.status(200).json({
        status: true,
        message: "Successfully change request!"
      })
    } else {
      return res.status(400).json({
        status: false,
        message: "Data not found!"
      })
    }
  } catch (error) {
    console.log(error)
    return res.status(400).json({
      status: false,
      message: "Something went wrong!"
    })
  }
}
const checkPendingStatus = (fsData) => {
  return new Promise((resolve, reject) => {
    try {
      let isStatusFy = false;
      for (const key in fsData) {
        if (fsData[key]?.status == "PENDING") {
          isStatusFy = true;
        }
      }
      resolve(isStatusFy)
    } catch (error) {
      reject(error);
    }
  })
}