const WaterRejenuvation = require("../../models/WaterRejenuvation&Recycling");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

exports.saveWaterRejenuvation = async (req, res) => {
  let { state, _id } = req.decoded;
  let data = req.body;
  req.body.actionTakenBy = _id;
  try {
    console.log(data);
    await WaterRejenuvation.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getWaterRejenuvation = async (req, res) => {
  const { design_year } = req.params;
  const state = req.decoded.state;
  try {
    const waterRej = await WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 });
    if (!waterRej) {
      return Response.BadRequest(res, null, "No WaterRejenuvation found");
    }
    return Response.OK(res, waterRej, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  let { design_year, isDraft } = req.body;
  let { state } = req.decoded;
  try {
    let currentWaterRejenuvation = await WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });
    const newWaterRejenuvation = await WaterRejenuvation.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentWaterRejenuvation } }
    );
    if (!newWaterRejenuvation) {
      return Response.BadRequest(res, null, "No WaterRejenuvation found");
    }
    return Response.OK(res, newWaterRejenuvation, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
