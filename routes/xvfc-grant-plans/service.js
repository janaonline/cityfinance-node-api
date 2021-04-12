const Plans = require("../../models/XVFcGrantPlans");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");

exports.savePlans = async (req, res) => {
  let { ulb, designYear, isDraft } = req.body;
  try {
    await Plans.findOneAndUpdate({ ulb }, req.body, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    if (!isDraft) UpdateMasterSubmitForm(req.body, "plans");
    return res.status(200).json({ msg: "Plans Submitted!" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.getPlans = async (req, res) => {
  const { ulb, designYear } = req.body;
  try {
    const plan = await Plans.findOne({
      ulb,
      designYear,
      isActive: true,
    }).select({ history: 0 });
    if (!plan) {
      return res.status(404).json({ msg: "No Plan found" });
    }
    return res.status(200).json(plan);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
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
    return res.status(500).json({ msg: "server error" });
  }
};

exports.action = async (req, res) => {
  let { ulb, designYear, isDraft } = req.body;
  try {
    let currentPlan = await Plans.findOne({ ulb }).select({
      history: 0,
    });

    const newPlan = await Plans.findOneAndUpdate(
      { ulb },
      { $set: req.body, $push: { currentPlan } }
    );

    if (!newPlan) {
      return res.status(404).json({ msg: "no plan found" });
    }

    if (!isDraft) {
      req.body.remarks = {
        water: req?.body?.plans?.water?.remarks,
        sanitation: req?.body?.plans?.sanitation?.remarks,
      };
      UpdateMasterSubmitForm(req.body, "plans");
    }

    return res.status(200).json({ msg: "Action Submitted!" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};
