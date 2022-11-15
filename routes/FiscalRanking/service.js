const mongoose = require('mongoose');
const ObjectId = require("mongoose").Types.ObjectId;
const FiscalRanking = require('../../models/FiscalRanking');
const FiscalRankingMapper = require('../../models/FiscalRankingMapper');

exports.CreateorUpdate = async (req, res, next) => {
  try {
    let id = req?.body?.id;
    let fsData = await FiscalRanking.findOne({ _id: ObjectId(id) }).lean();
    if (fsData) {
      let fsMapper = await FiscalRankingMapper.find({ fiscal_ranking: ObjectId(id) });
      let obj = { ...fsData, fsMapper };
      delete obj.history;
      let history = fsData.history;
      history.push(obj);
      req.body['history'] = history;
      await FiscalRankingMapper.deleteMany({ fiscal_ranking: ObjectId(id) });
      await FiscalRanking.update({ _id: ObjectId(id) }, req.body);
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
            "as": "fiscalrankingmappers"
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
            "fiscalrankingmappers": 1
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
