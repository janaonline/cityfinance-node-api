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

