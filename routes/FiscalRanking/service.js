const ObjectId = require("mongoose").Types.ObjectId;
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');
const UlbLedger = require('../../models/UlbLedger');
const feedBackSchema = require("../../models/FeedbackFiscalRanking")
const TwentyEightSlbsForm = require('../../models/TwentyEightSlbsForm');
const Ulb = require('../../models/Ulb');
const Service = require('../../service');
const userTypes = require("../../util/userTypes");
const { calculateKeys,canTakeActionOrViewOnly,calculateStatus } = require('../CommonActionAPI/service');
const Sidemenu = require('../../models/Sidemenu')
const { fiscalRankingFormJson } = require('./fydynemic');
const catchAsync = require('../../util/catchAsync');
const State = require('../../models/State');
const TabsFiscalRankings = require('../../models/TabsFiscalRankings');

exports.CreateorUpdate = async (req, res, next) => {
  // console.log("req.body",req.body)
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
      if (req.decoded.role == "MoHUA") {
        let status = "APPROVED"
        console.log(await checkPendingStatus(req.body))
        if (!await checkPendingStatus(req.body)) {
          status = "REJECTED"
        }
        req.body['status'] = status;
        req.body['actionTakenBy'] = req.decoded._id;
        req.body['actionTakenByRole'] = "MoHUA";
      }
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

module.exports.createTabsFiscalRanking = async (req,res)=>{
  let response = {
    success:true,
    message:""
  }
  try{
    let dataToUpdate = {...req.body}
    let tabObject = new TabsFiscalRankings(dataToUpdate)
    await tabObject.save()
    response.message = "Successfully created"
    response.success = true
    return res.status(201).json(response)
  }
  catch(err){
     response.success = false
     let message =  err.message
     response.message = message
    console.log("error in createTabsFiscalRanking:::",err.message)
  }
  res.status(400).json(response)
}

const checkPendingStatus = (data) => {
  return new Promise((resolve, reject) => {
    try {
      let arr = [];
      for (const key in data) {
        if (Array.isArray(data[key])) {
          let d = data[key].length ? data[key].some(e => e.status == "REJECTED") : false;
          d ? arr.push(1) : ""
        } else {
          if (data[key]?.status == "REJECTED") {
            arr.push(1)
          }
        }
      }
      console.log("arr", arr)
      resolve(arr.length ? false : true)
    } catch (error) {
      reject(error);
    }
  })
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

function  getBasicObject(value,status=""){
    return {
      "status":status,
      "value":value
    }
}

// set this class in a service
class tabsUpdationServiceFR{
  constructor(viewOne,fyDynemic){
    this.detail = {...viewOne}
    this.dynamicData = {...fyDynemic}
  }
 
 /**
  * It returns an object with the same properties as the `detail` object, but with the values of the
  * properties replaced with the values of the properties of the same name in the `detail` object
  * @returns An object with the following properties:
  *   - population11
  *   - populationFr
  *   - webLink
  *   - waterSupply
  *   - sanitationService
  *   - propertySanitationTax
  *   - nameCmsnr
  *   - propertyWaterTax
  */
  getDataForBasicUlbTab(){
    return {
      "population11":{...this.detail.population11},
      "populationFr":{...this.detail.populationFr},
      "webLink":getBasicObject(this.detail.webLink),
      "waterSupply":{...this.detail.waterSupply},
      "sanitationService":{...this.detail.sanitationService},
      "propertySanitationTax":{...this.detail.propertySanitationTax},
      "nameCmsnr":getBasicObject(this.detail.nameCmsnr),
      "propertyWaterTax":{...this.detail.propertyWaterTax}
    }
  }
  getDataForConInfo(){
    return {
      nameOfNodalOfficer :getBasicObject(this.detail.nameOfNodalOfficer),
      designationOftNodalOfficer:getBasicObject(this.detail.designationOftNodalOfficer),
      mobile:getBasicObject(this.detail.mobile,"NA"), // because status field is not applicable from frontend in this case
      email:getBasicObject(this.detail.email,"NA")// because status field is not applicable from frontend in this case
    }
  }
  getDynamicObjects(key){
    return this.dynamicData[key]
  }
  getDataForSignedDoc(){
    return {
      signedCopyOfFile : {...this.detail.signedCopyOfFile}
    }
  }
}


/**
 * It takes in the tabs and viewOne object and returns the modified tabs
 * @param tabs - The tabs that are to be modified.
 * @param viewOne - This is the object that contains all the data for the view.
 */
function getModifiedTabsFiscalRanking(tabs,viewOne,fyDynemic){
  try{
    let priorTabsForFiscalRanking = {
      "basicUlbDetails" : "s1",
      "conInfo" : "s2",
      "revenueMob" : "s4",
      "fisGov" : "s5",
      "upFy" : "s6",
      "selDec" : "s7"
  }
  
    let modifiedTabs = [...tabs]
    let service = new tabsUpdationServiceFR(viewOne,fyDynemic)
    for(var tab of modifiedTabs){
      if(tab.id === priorTabsForFiscalRanking["basicUlbDetails"]){
        tab.data = service.getDataForBasicUlbTab()
      }
      else if(tab.id === priorTabsForFiscalRanking['conInfo']){
        tab.data = service.getDataForConInfo()
      }
      else if(tab.id === priorTabsForFiscalRanking['selDec']){
        tab.data = service.getDataForSignedDoc()
      }
      else {
        tab.data = service.getDynamicObjects(tab.key)
      }
      if(tab.feedback === undefined){
        tab.feedback = {
          "status":null,
          "comment":""
        }
      }
    }
    return modifiedTabs
  }
  catch(err){
    console.log("error in getModifiedTabsFiscalRanking ::: ",err.message)
  }
}


/* A function which is used to get the data from the database. */
exports.getView = async function (req, res, next) {
  try {
    let condition = {};
    if (req.query.ulb && req.query.design_year) {
      condition = { "ulb": ObjectId(req.query.ulb), "design_year": ObjectId( req.query.design_year) }
    }
    let data = await FiscalRanking.findOne(condition, { "history": 0 }).lean();
    let twEightSlbs = await TwentyEightSlbsForm.findOne(condition, { "population": 1 }).lean();
    let ulbPData = await Ulb.findOne({ "_id": ObjectId(req.query.ulb) }, { "population": 1 }).lean();
    let viewOne = {};
    let fyData = [];
    if (data) {
      fyData = await FiscalRankingMapper.find({ fiscal_ranking: data._id }).lean();
      data['populationFr']['value'] = data.populationFr.value ? data.populationFr.value : twEightSlbs ? twEightSlbs?.population : ""
      data['population11']['value'] = data.population11.value ? data.population11.value : ulbPData ? ulbPData?.population : ""
      data['population11']['readonly'] = ulbPData ? ulbPData?.population > 0 ? true : false : false
      data['populationFr']['readonly'] = false
      data['fyData'] = fyData
      viewOne = data
    } else {
      let numberOfQuestion = {
        value: null,
        status: "PENDING"
      }
      viewOne = {
        "ulb": null,
        "design_year": null,
        "population11": {
          "value": ulbPData ? ulbPData?.population : "",
          "readonly": ulbPData ? ulbPData?.population > 0 ? true : false : false
        },
        "populationFr": {
          "value": twEightSlbs ? twEightSlbs?.population : "",
          "readonly": false
        },
        "webLink": null,
        "nameCmsnr": "",
        "nameOfNodalOfficer": "",
        "designationOftNodalOfficer": "",
        "email": null,
        "mobile": null,
        "waterSupply": numberOfQuestion,
        "sanitationService": numberOfQuestion,
        "propertyWaterTax": numberOfQuestion,
        "propertySanitationTax": numberOfQuestion,
        "webUrlAnnual": numberOfQuestion,
        "registerGis": numberOfQuestion,
        "accountStwre": numberOfQuestion,
        "totalOwnRevenueArea": numberOfQuestion,
        "fy_21_22_cash": {
          "year": null,
          "type": null,
          "amount": null,
          "status": "PENDING"
        },
        "signedCopyOfFile": {
          "name": null,
          "url": null
        },
        "fy_21_22_online": {
          "type": null,
          "amount": null,
          "year": null,
          "status": "PENDING"
        },
        "fyData": [],
        "property_tax_register": {
          "value": "",
          "status": "PENDING",
        },
        "paying_property_tax": {
          "value": "",
          "status": "PENDING"
        },
        "paid_property_tax": {
          "value": "",
          "status": "PENDING"
        },
        "isDraft": null
      }
    }
    let fyDynemic = await fiscalRankingFormJson();

    let ulbData = await ulbLedgersData({ "ulb": ObjectId(req.query.ulb) });
    
    let ulbDataUniqueFy = await ulbLedgerFy({ "financialYear": { $in: ['2017-18', '2018-19', '2019-20', '2020-21', '2021-22'] }, "ulb": ObjectId(req.query.ulb) });
    for (let sortKey in fyDynemic) {
      let subData = fyDynemic[sortKey];
      for (let key in subData) {
        for (let pf of subData[key]?.yearData) {
          if (pf?.code?.length > 0) {
            pf['status'] = null
            if (fyData.length) {
              let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type)); 
              if (singleFydata) {
                if (singleFydata?.date !== null) {
                  pf['date'] = singleFydata ? singleFydata.date : null;
                } else {
                  pf['amount'] = singleFydata ? singleFydata.amount : "";
                }
                pf['status'] = singleFydata.status;
                pf['readonly'] = singleFydata.status && singleFydata.status == "NA" ? true : false;
              } else {
                let ulbFyAmount = await getUlbLedgerDataFilter({ code: pf.code, year: pf.year, data: ulbData });                
                pf['amount'] = ulbFyAmount;
                pf['status'] = ulbFyAmount ? "NA":null;
                pf['readonly'] = ulbFyAmount > 0 ? true : false;
              }
            } else {
              if (viewOne.isDraft == null) {
                let ulbFyAmount = await getUlbLedgerDataFilter({ code: pf.code, year: pf.year, data: ulbData});
                pf['amount'] = ulbFyAmount;
                pf['status'] = ulbFyAmount ? "NA":null;
                pf['readonly'] = ulbFyAmount > 0 ? true : false;
              }
            }
          } else {
            if (['appAnnualBudget', 'auditedAnnualFySt'].includes(subData[key]?.key)) {
              if (fyData.length) {
                
                let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type));
                
                if (singleFydata) {
                  pf['file'] = singleFydata.file;
                  pf['status'] = singleFydata.status;
                  pf['readonly'] = singleFydata.status && singleFydata.status == "NA" ? true : false;
                } else {
                  if (subData[key]?.key !== "appAnnualBudget" && viewOne.isDraft == null) {
                    let chekFile = ulbDataUniqueFy ? ulbDataUniqueFy.some(el => el?.year_id.toString() === pf?.year.toString()) : false;
                    pf['status'] = chekFile ? "NA" : null
                    pf['readonly'] = chekFile ? true : false;
                  }
                }
              } else {
                if (subData[key]?.key !== "appAnnualBudget" && viewOne.isDraft == null) {
                  let chekFile = ulbDataUniqueFy ? ulbDataUniqueFy.some(el => el?.year_id.toString() === pf?.year.toString()) : false;
                  pf['status'] = chekFile ? "NA" : null;
                  pf['readonly'] = chekFile ? true : false;
                }
              }
            } else {
              if (fyData.length) {
                if (pf.year && pf.type) {
                  let singleFydata = fyData.find(e => (e.year.toString() == pf.year.toString() && e.type == pf.type));
                  if (singleFydata?.date !== null) {
                    pf['date'] = singleFydata ? singleFydata.date : null;
                  } else {
                    pf['amount'] = singleFydata ? singleFydata.amount : "";
                  }
                  pf['status'] = singleFydata ? singleFydata.status : null;
                  pf['readonly'] = singleFydata && singleFydata.status == "NA" ? true : false;
                }
              }
            }
          }
        }
      }
    }
    let tabs = await TabsFiscalRankings.find({}).sort({"displayPriority":1}).populate({
      path:"feedback",
      model:"FeedbackFiscalRanking",
      match:condition
    }).select("-_id").lean()
    let modifiedTabs = getModifiedTabsFiscalRanking(tabs,viewOne,fyDynemic)
    return res.status(200).json({ status: false, message: "Success fetched data!", "data": viewOne, fyDynemic,tabs:modifiedTabs });
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
    let ulbFyData = data.length ? data.filter(
      (el)=>{
        return code.includes(el.code) && el.year_id.toString() === year.toString()

      }
    ) : []
    var sum = ulbFyData.length > 0 ? ulbFyData.reduce((pv, cv) => pv + cv.totalAmount, 0) : '';
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
        { $unwind: "$years",
        },
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
            code: { $in: ["110", "130", "140", "150", "180", "200", "210", "220", "230", "240", "410", "412", "11001", "11002", "11003"] },
            year: { $in: ['2017-18', '2018-19', '2019-20', '2020-21', "2021-22"] }
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
            _id: "$years._id",
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
    if (!ulb && !design_year && !type && !actionTakenByRole && !status) {
      return res.status(400).json({ status: false, message: "Required fields!", "keys": ['ulb', 'design_year', 'type', 'actionTakenByRole', 'status'] });
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
/**
 * if lookup query is simple then use this
 * @param {*} from 
 * @param {*} localField 
 * @param {*} foreignField 
 * @param {*} as 
 * @returns an object which with the lookup queries
 */
function getCommonLookupObj(from,localField,foreignField,as){
  let obj = {}
  try{
    obj = {
      "$lookup":{
        "from": from,
        "localField": localField,
        "foreignField": foreignField,
        "as": as
     }
    }
    return obj
  }
  catch(err){
    console.log("error in get CommonLookup obj")
    return obj
  }
}
/**
 * function that returns condition for UA_ID
 */
function getUA_id(){
  try{
    let obj = {
      $cond: {
        if: { $eq: ["$isUA", "Yes"] },
        then: "$UA._id",
        else: "NA",
      },
    }
    return obj
  }
  catch(err){
    console.log("error while getting UA_id ::: ",err.message)
  }
}
/**
 * function that returns condition of UA
 */
function getUAcondition(){
  try{
    let obj = {
      $cond: {
        if: { $eq: ["$isUA", "Yes"] },
        then: "$UA.name",
        else: "NA",
      }
    }
    return obj
  }
  catch(err){
    console.log("error in getUAcondtion ::: ",err.message)
  }
}
/**
 * function that returns condition for census code
 */
function getCensusCodeCondition(){
  try{
    let obj ={
      $cond: {
        if: {
          $or: [
            { $eq: ["$censusCode", ""] },
            { $eq: ["$censusCode", null] },
          ]
        },
        then: "$sbCode",
        else: "$censusCode"
      }
    }
    return obj
  }
  catch(err){
    console.log("error in getCensusCodeCondition")
  }
}

/**
 * function that returns condition for population type
 * 
 */
function getPopulationCondition(){
  try{
    let obj = {
      $cond: {
        if: { $eq: ["$isMillionPlus", "Yes"] },
        then: "Million Plus",
        else: "Non Million",
      },
    }
    return obj
  }
  catch(err){
    console.log("getPopulationCondition ::: ",err.message)
  }
}




/**
 * it is a projection query that returs total for the facet pagination
 * @returns json object
 */
function getTotalProjectionQueryForPagination(){
  try{
    let total = {
      "$let": {
          "vars": {
              "totalObj": { 
                  "$arrayElemAt": ['$metaData', 0]           
              }
          },
      "in": '$$totalObj.total'
      }
    }
    return total
  }
  catch(err){
    console.log("error")
  }
}

/**
 * function that returns projection query for ulbs only
 * @param {Array} queryArr
 */
function getProjectionQueries(queryArr,collectionName,skip,limit,newFilter){
  try{
  //   let removeEmptyForms = {
  //     "$match": {
  //         "formData":{"$exists":true, $not: {$size: 0}}
  //     }
  // }
    //projection query for conditions
    let projectionQueryWithConditions = {
      "$project":{
        "ulbName":"$name",
        "ulbId": "$_id",
        "ulbCode": "$code",
        "censusCode":getCensusCodeCondition(),
        "UA":getUAcondition(),
        "UA_ID":getUA_id(),
        "ulbType": "$ulbType.name",
        "ulbType_id": "$ulbType._id",
        "population": "$population",
        "state_id": "$state._id",
        "stateName": "$state.name",
        "populationType":getPopulationCondition(),
        "formData": { $ifNull: [`$${collectionName}`, ""] },
      }
    }
    let showFields = {
      "filled":{
        $cond: { if: { $or: [{ $eq: ["$formData", ""] }, { $eq: ["$formData.isDraft", true] }] }, then: "No", else: "Yes" }
      },
    }
    
    queryArr.push(projectionQueryWithConditions)
    let main = projectionQueryWithConditions["$project"]
    let projectedKeys =  Object.keys(main)
    for(var projectedKey of projectedKeys){
      showFields[projectedKey] = 1
    }
    queryArr.push({"$project":showFields})
    if(newFilter && Object.keys(newFilter).length > 0){
      if(newFilter.sbCode){
        newFilter['censusCode'] = newFilter.sbCode
        delete newFilter.sbCode
      }
      // Object.assign(removeEmptyForms["$match"],newFilter)
      queryArr.push({"$match":newFilter})
    }
    getFacetQueryForPagination(queryArr,skip,limit)
    //projection query that decides which cols to show
    let projectionQueryThatDecidesCols = {
      $project: {
        formData: 1,
        records:1,
        total:getTotalProjectionQueryForPagination()
      }
    }
    
    queryArr.push(projectionQueryThatDecidesCols)
  }
  catch(err){
    console.log("error in getProjectionQueries ::: ",err)
  }
}


/**
 * function for unwind
 * @param {string} key
 */
function getUnwindObj(key,preserveNullAndEmptyArrays=false){
  try{
    var obj = {
      "$unwind":key
    }
    if(preserveNullAndEmptyArrays){
      obj = {"$unwind":{}}
      obj["$unwind"]['path'] = key
      obj["$unwind"]["preserveNullAndEmptyArrays"] = true
    }
    return obj
  }
  catch(err){
    console.log("error in getUnwindObj ::: ",err)
  }
}

/**
 * Get lookup query for accounts
 * @param {Array} queryArr
 * @param {String} Array
 */
function getFormQuery(queryArr,collectionName,design_year){
  try{
    let obj = {
      "$lookup":{
        from:collectionName,
        let :{
          year : ObjectId(design_year),
          ulb_id : "$_id"
        },
        pipeline:[
          {"$match":{
            "$expr":{
              "$and":[
                {"$eq":["$design_year","$$year"]},
                {"$eq":["$ulb","$$ulb_id"]}
              ]
            }
          }},
        ]
      }
    }
    obj["$lookup"]["pipeline"].push(getCommonLookupObj("years","design_year","_id","design_year"))
    obj["$lookup"]["pipeline"].push(getUnwindObj("$design_year"))
    obj["$lookup"]["as"] = collectionName
    obj["$lookup"]["pipeline"].push({
      "$project":{
        "_id":1,
        "status":1,
        "actionTakenByRole":1,
         "isDraft":1
      }
    })   
    queryArr.push(obj)
  }
  catch(err){
    console.log("error in getFormQuery ::: ",err.message)
    return
  }
}


/**
 * pipe line array stage 1 for the state
 * @param {Array} queryArr 
 * @param {string} stateId 
 */
function get_state_query(queryArr,stateId=false){
  try{

    //stage1 lookup to get all states with id 
    let lookUpStage = getCommonLookupObj("states","state","_id","state")
    queryArr.push(lookUpStage)
    queryArr.push(getUnwindObj("$state",true))
    let matchObj = {
      "$match":{
        "state.accessToXVFC" : true
      }
    }
    
    // stage 2 match
    queryArr.push(matchObj)
  }
  catch(err){
    console.log("error while getting state query :: ",err)
    return
  }
}

/**
 * function facet query that to get the totalCount
 * @param {Number} skip
 * @param {Number} limit
 * @param {Arr} queryArr
*/
function getFacetQueryForPagination(queryArr,skip,limit){
  let facetObj = {}
  try{
    facetObj = {
      "$facet":{
        "metaData":[{"$count":'total'}],
        "records":[
          {"$skip":parseInt(skip)},
          {"$limit":parseInt(limit)},
        ]
      }
    }
    queryArr.push(facetObj)
  }
  catch(err){
    console.log("error while getFacetQueryForPagination::",err.message)
  }
}

/**
 * function that get aggregate queries according to stages
 * @param {*} collectionName:String
 * @param {*} path :String
 */
function getAggregateQuery(collectionName,path,year,skip,limit,newFilter,stateId=null){
  let query = []
  try{
    //stage one get Matching ulbs 
    let match_ulb_with_access = {
      "$match":{"access_2223":true}
    }
    // if state id is provided then it will search ulb with state
    if(stateId !== null && stateId !== undefined){
      match_ulb_with_access["$match"]["state"] = ObjectId(stateId)
    }
    query.push(match_ulb_with_access)
    // stage 2 get all states realted to ulb
    get_state_query(query,stateId)

    // stage 3 get form data which is filled in this case fiscalranking form
    getFormQuery(query,collectionName,year)
    query.push(getUnwindObj(`$${collectionName}`,true))
    // stage 4 get all UA realted to tthis ulb and unwind all ua,s
    query.push(getCommonLookupObj("uas","UA","_id","UA"))
    query.push(getUnwindObj("$UA",true))
    // stage 5 get all ULBS realted the ulb and unwind it
    query.push(getCommonLookupObj("ulbtypes","ulbType","_id","ulbType"))
    query.push(getUnwindObj("$ulbType",true))
    
    // stage 6 modify the cols ,handle pagination and search queries 
    getProjectionQueries(query,collectionName,skip,limit,newFilter)
    // stage 7 sort by formData
    query.push({"$sort":{"formData":-1}})
    
  }
  catch(err){
    console.log("error in getAggregateQuery :::: ",err)
  }
  return query
}


/**
 * return filters with search params if any
 * @param {*} req :Object
 * @returns javascript object
 */
function searchQueries(req){
  let filter = {}
  try{
    filter['ulbName'] = req.query.ulbName != 'null' ? req.query.ulbName : ""
    filter['censusCode'] = req.query.censusCode != 'null' ? req.query.censusCode : ""
    filter['populationType'] = req.query.populationType != 'null' ? req.query.populationType : ""
    filter['ulbType'] = req.query.ulbType != 'null' ? req.query.ulbType : ""
    filter['UA'] = req.query.UA != 'null' ? req.query.UA : ""
    filter['status'] = req.query.status != 'null' ? req.query.status : ""
    filter['filled_audited'] = req.query.filled1 != 'null' ? req.query.filled1 : ""
    filter['filled_provisional'] = req.query.filled2 != 'null' ? req.query.filled2 : ""
  }
  catch(err){
    console.log("error in Search Queries function")
  }
  return filter
}


/**
 * Function that returns dynamic column name for tables in the frontend
 * @returns a javascript object with column names
 */
function getColumns(){
  return {
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
}

/**
 * check by the role if requested parameter is valid or not
 * * @param {*} formId:String
 * @param {*} mohuaId:String
 * @param {*} stateId:String
 * @param {*} role:String
 * @returns a json object with message and validation
 */
function checkValidRequest(formId,stateId,role){
  let validation = {
    valid :false,
    message:"",
  }
  try{
    if((formId === undefined) || (formId === "")){
      validation.valid = false
      validation.message = "Form id is required"
    }
    if(role === userTypes.state){
      
      if((stateId === "") || (stateId === undefined)){
        validation.valid = false
        validation.message = "stateId is required"
      }
      else{
        validation.valid = true
      }
    }
    if((role === userTypes.mohua)){
      validation.valid = true
    }

  }
  catch(err){
    validation.valid = false
    validation.message = err.message
    console.log("error in checkValidRequest ::: ",err.message)
  }
  return validation
}

/**
 * updates take action and form status field
 */
function updateActions(data,role,formType){
  let modifiedData = [...data]
  try{
    modifiedData = data.map(el => {
      if (!el.formData) {
        el['formStatus'] = "Not Started";
        el['cantakeAction'] = false;
      } else {
        el['formStatus'] = calculateStatusForFiscalRankingForms(el.formData.status, el.formData.actionTakenByRole, el.formData.isDraft, formType);
        el['cantakeAction'] = (role === "ADMIN" || role === userTypes.state) ? false : canTakeActionOrViewOnly(el, role,true)
      }
      return el
    })
  }
  catch(err){
    console.log("error in updateActions ::: ",err.message)
    return data
  }
  return modifiedData
}

/**
 * if role is state get state id
 * @param {role} String
 * @returns 
 */
function checkForRoleAndgetStateId(req,role){
  try{
    if(role === userTypes.state){
      return req.decoded.state
    }
  }
  catch(err){
    console.log("error in checkForRoleAndgetStateId :: ",err.message)
  }
  return null
}
/**
 * An Api that get FR forms ulb according to state or mohua
 * @param {*} req:Object
 * @param {*} res:Object
 * @returns json response 
 */
module.exports.getFRforms = catchAsync(async(req,res)=>{
  let response = {
    success : false,
    message : "Some server error occured",
  }
  try{
    let cols = getColumns()
    let total = 0
    let aggregateQuery = {}
    let skip =  req.query.skip ||  0
    let limit = req.query.limit || 10
    let {design_year:year,state:stateId,formId,getQuery} = req.query
    let {role} = req.decoded
    console.log("role ::::: ",role)
    if(stateId === undefined || stateId === "null"){
      stateId = checkForRoleAndgetStateId(req,role)
    }
    let searchFilters = {}
    if(role === undefined || role === ""){
      response.message =  "User role not found"
      return res.status(500).json(response)
    }
    if(year === undefined){
      response.message =  "Year parameter is required"
      return res.status(500).json(response)
    }
    let validation = checkValidRequest(formId,stateId,role)
    if(!validation.valid){
      response.message = validation.message
      return res.status(500).json(response)
    }
    searchFilters = searchQueries(req)
    let keys = calculateKeys(searchFilters['status'], role);
    Object.assign(searchFilters, keys)
    let newFilter = await Service.mapFilterNew(searchFilters)
    // Code that will get the dynamic names when sidemenu is implemented
    //let formTab = await Sidemenu.findOne({ _id: ObjectId(formId) }).lean();
    // get dynamic path and collection name
    //let {path,collectionName} = formTab
    let path = "FiscalRanking"
    let collectionName = "fiscalrankings"
    let formType = "ULB"
    aggregateQuery = getAggregateQuery(collectionName,path,year,skip,limit,newFilter,stateId)
    let queryResult = await Ulb.aggregate(aggregateQuery).allowDiskUse(true)
    let data = queryResult[0]
    total = data['total']
    data = updateActions(data['records'],role,formType)
    if(getQuery == 'true') return res.status(200).json({
      query:aggregateQuery
    })
    response.success = true
    response.columnNames = cols
    response.data = data
    response.total = total
    response.title = 'Review Fiscal Ranking  Application'
    response.message = "Fetched successfully"
    return res.status(200).json(response)
  }
  catch(err){
    response.success = false
    response.message = err.message
    console.log("error in getFrForms",err)
  return res.status(500).json(response)
  }
})