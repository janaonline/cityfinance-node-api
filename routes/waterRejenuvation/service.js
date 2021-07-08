const WaterRejenuvation = require("../../models/WaterRejenuvation&Recycling");
const { UpdateStateMasterForm } = require("../../service/updateStateMasterForm");
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
    await UpdateStateMasterForm(req, 'waterRejuventation')
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
  let { design_year, state } = req.body;
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
