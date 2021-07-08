const ActionPlans = require("../../models/ActionPlans");
const { UpdateStateMasterForm } = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

exports.saveActionPlans = async (req, res) => {
  let { state, _id } = req.decoded;
  let data = req.body;
  req.body.actionTakenBy = _id;
  try {
    console.log(data);
    await ActionPlans.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateStateMasterForm(req, 'actionPlans')
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getActionPlans = async (req, res) => {
  const { design_year } = req.params;
  const state = req.query.state_id;
  try {
    const actionPlan = await ActionPlans.findOne({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 });
    if (!actionPlan) {
      return Response.BadRequest(res, null, "No ActionPlans found");
    }
    return Response.OK(res, actionPlan, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  let { design_year, isDraft } = req.body;
  let { state } = req.decoded;
  try {
    let currentActionPlans = await ActionPlans.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });
    const newActionPlans = await ActionPlans.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentActionPlans } }
    );
    if (!newActionPlans) {
      return Response.BadRequest(res, null, "No ActionPlans found");
    }
    return Response.OK(res, newActionPlans, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
