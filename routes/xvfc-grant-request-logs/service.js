const requestLogs = require("../../models/XVFcGrantRequestLogs");
const ObjectId = require("mongoose").Types.ObjectId;
const plans = require("../../models/XVFcGrantPlans");
const annual = require("../../models/AnnualAccounts");
const slb = require("../../models/XVFcGrantForm");
const util = require("../../models/UtilizationReport");
const pfms = require("../../models/LinkPFMS");
const master = require("../../models/MasterForm");

exports.saveLogs = async (req, res) => {
  const { ulb } = req?.decoded?._id;
  try {
    await requestLogs.findOneAndUpdate(
      { ulb: ObjectId(ulb), financialYear: req.body?.financialYear },
      {
        ulb,
        financialYear: req.body?.financialYear,
        $push: { logs: req.body },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    return res.status(200).json({ msg: "requestLogs Submitted!" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.getLogs = async (req, res) => {
  const { financialYear } = req.body;
  const ulb = req?.decoded?._id;
  try {
    const logs = await requestLogs.find({ ulb: ObjectId(ulb), financialYear });
    return res.status(200).json({ msg: "Success", logs });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.allForms = async (req, res) => {
  const { financialYear, designYear, ulb } = req.body;
  let design_year = designYear;
  try {
    await plans.deleteOne({ designYear, ulb });
    await pfms.deleteOne({ design_year, ulb });
    await annual.deleteOne({ design_year, ulb });
    await slb.deleteOne({ design_year, ulb });
    await util.deleteOne({ designYear, ulb, financialYear });
    await master.deleteOne({ design_year, ulb });
    return res.status(200).json({ msg: "Success"});
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};
