const Plans = require("../../models/XVFcGrantPlans");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

exports.savePlans = async (req, res) => {
  try {
    let { designYear, isDraft } = req.body;
    req.body.actionTakenBy = req?.decoded._id;
    req.body.ulb = req?.decoded.ulb;
    req.body.modifiedAt = new Date();
    let ulb = req.body.ulb;
    let currentSavedPlan;
    if (req.body?.status == "REJECTED") {
      req.body.status = "PENDING";
      req.body.rejectReason = null;

      currentSavedPlan = await Plans.findOne({
        ulb: ObjectId(ulb),
        designYear: ObjectId(designYear),
        isActive: true,
      }).select({
        history: 0,
      });
      if (!currentSavedPlan) {
        return Response.BadRequest(res, currentSavedPlan, "No Previous Plans");
      }
    }

    let plans;
    if (currentSavedPlan) {
      plans = await Plans.findOneAndUpdate(
        {
          ulb: ObjectId(ulb),
          designYear: ObjectId(designYear),
          isActive: true,
        },
        { $set: req.body, $push: { history: currentSavedPlan } }
      );
    } else {
      plans = await Plans.findOneAndUpdate(
        { ulb: ObjectId(ulb), designYear: ObjectId(designYear) },
        req.body,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    await UpdateMasterSubmitForm(req, "plans");

    return res.status(200).json({
      msg: "Plans Submitted!",
      isCompleted: !plans.isDraft,
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getPlans = async (req, res) => {
  try {
    const { designYear } = req.params;
    let ulb = req?.decoded.ulb ? req?.decoded.ulb : req?.query.ulb;

    const plan = await Plans.findOne({
      ulb: ObjectId(ulb),
      designYear,
      isActive: true,
    }).select({ history: 0 });

    if (!plan) {
      return res.status(400).json({ msg: "No Plan found" });
    }

    if (
      req.decoded.role === "MoHUA" &&
      plan.actionTakenByRole === "STATE" &&
      plan.status == "APPROVED"
    ) {
      plan.status = "PENDING";
      plan.rejectReason = null;
    }

    return res.status(200).json(plan);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { ulb, designYear, isDraft } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    req.body.actionTakenByRole = req.decoded.role;
    req.body.modifiedAt = new Date();

    let currentSavedPlan = await Plans.findOne({
      ulb: ObjectId(ulb),
      designYear: ObjectId(designYear),
      isActive: true,
    }).select({
      history: 0,
    });

    const newPlan = await Plans.findOneAndUpdate(
      { ulb: ObjectId(ulb), designYear: ObjectId(designYear), isActive: true },
      { $set: req.body, $push: { history: currentSavedPlan } }
    );

    if (!newPlan) {
      return res.status(400).json({ msg: "no plan found" });
    }

    await UpdateMasterSubmitForm(req, "plans");
    newPlan.history = null;
    return res
      .status(200)
      .json({ msg: "Action Submitted!", newPlan: { status: req.body.status } });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.removePlans = async (req, res) => {
  const { ulb, designYear } = req.body;
  try {
    const plan = await Plans.findOneAndUpdate(
      { ulb: ObjectId(ulb), designYear },
      { isActive: false }
    );
    if (!plan) {
      return res.status(404).json({ msg: "No Plan Found" });
    }
    return res.status(200).json({ msg: "Plans Removed" });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
