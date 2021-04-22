const Plans = require("../../models/XVFcGrantPlans");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;

exports.savePlans = async (req, res) => {
  let { ulb, designYear, isDraft } = req.body;
  req.body.actionTakenBy = req?.decoded?._id;
  try {
    await Plans.findOneAndUpdate({ ulb: ObjectId(ulb), designYear }, req.body, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    if (!isDraft) await UpdateMasterSubmitForm(req, "plans");
    return res.status(200).json({ msg: "Plans Submitted!" });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res,{},err.message);
  }
};

exports.getPlans = async (req, res) => {
  const { ulb, designYear } = req.body;
  try {
    const plan = await Plans.findOne({
      ulb: ObjectId(ulb),
      designYear,
      isActive: true,
    }).select({ history: 0 });
    if (!plan) {
      return res.status(404).json({ msg: "No Plan found" });
    }
    return res.status(200).json(plan);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res,{},err.message);  }
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
    return Response.BadRequest(res,{},err.message);
  }
};

exports.action = async (req, res) => {
  let { ulb, designYear, isDraft } = req.body;
  try {
    let currentPlan = await Plans.findOne({
      ulb: ObjectId(ulb),
      designYear: ObjectId(designYear),
      isActive: true,
    }).select({
      history: 0,
    });

    const newPlan = await Plans.findOneAndUpdate(
      { ulb: ObjectId(ulb), isActive: true },
      { $set: req.body, $push: { history: currentPlan } }
    );

    if (!newPlan) {
      return res.status(404).json({ msg: "no plan found" });
    }

    if (!isDraft) {
      req.body.remarks = {
        water: req?.body?.plans?.water?.remarks,
        sanitation: req?.body?.plans?.sanitation?.remarks,
      };
      await UpdateMasterSubmitForm(req, "plans");
    }

    return res.status(200).json({ msg: "Action Submitted!" });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res,{},err.message);
  }
};
