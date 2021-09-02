const WaterRejenuvation = require("../../models/WaterRejenuvation&Recycling");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const User = require('../../models/User')
exports.saveWaterRejenuvation = async (req, res) => {
  try {
    let { state, _id } = req.decoded;
    let data = req.body;
    req.body.actionTakenBy = _id;
    req.body.modifiedAt = new Date();

    await WaterRejenuvation.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateStateMasterForm(req, "waterRejuventation");
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getWaterRejenuvation = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  try {
    const waterRej = await WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 }).lean();
    let userData;
    if (!waterRej) {
      return Response.BadRequest(res, null, "No WaterRejenuvation found");
    }
    userData = await User.findOne({ _id: ObjectId(waterRej['actionTakenBy']) });
    waterRej['actionTakenByRole'] = userData['role'];

    return Response.OK(res, waterRej, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { design_year, state } = req.body;
    req.body.modifiedAt = new Date();
    req.body['actionTakenBy'] = req.decoded._id
    let currentWaterRejenuvation = await WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });

    let finalStatus = "APPROVED",
      allRejectReasons = [];
    req.body.uaData.forEach((element) => {
      let obj = {};
      obj[element.ua] = element.rejectReason;
      allRejectReasons.push(obj);
    });
    req.body.uaData.forEach((element) => {
      if (element.status === "REJECTED") {
        finalStatus = "REJECTED";
      }
      if (element.status === "PENDING") {
        finalStatus = "PENDING";
        return;
      }
    });
    req.body.status = finalStatus;

    const newWaterRejenuvation = await WaterRejenuvation.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentWaterRejenuvation } }
    );
    await UpdateStateMasterForm(req, "waterRejuventation");
    return Response.OK(res, newWaterRejenuvation, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
