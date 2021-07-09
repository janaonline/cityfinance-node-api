const ActionPlans = require("../../models/ActionPlans");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

exports.saveActionPlans = async (req, res) => {
  try {
    let { state, _id } = req.decoded;
    let data = req.body;
    req.body.actionTakenBy = _id;
    req.body.modifiedAt = new Date();

    await ActionPlans.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateStateMasterForm(req, "actionPlans");
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getActionPlans = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
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
  try {
    let { design_year, state } = req.body;
    req.body.modifiedAt = new Date();

    let currentActionPlans = await ActionPlans.findOne({
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
      if (element.status == "REJECTED") {
        finalStatus = "REJECTED";
      }
      if (element.status == "PENDING") {
        finalStatus = "PENDING";
        return;
      }
    });
    req.body.status = finalStatus;

    const newActionPlans = await ActionPlans.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentActionPlans } }
    );

    await UpdateStateMasterForm(req, "actionPlans");
    return Response.OK(res, newActionPlans, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
