const AnnualAccountData = require("../../models/AnnualAccounts");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");

exports.createUpdate = async (req, res) => {
  let { design_year, isDraft } = req.body;
  req.body.actionTakenBy = req?.decoded._id;
  req.body.ulb = req?.decoded.ulb;
  const ulb = req?.decoded.ulb;
  try {
    let annualAccountData = await AnnualAccountData.findOneAndUpdate(
      { ulb: ObjectId(ulb), design_year: ObjectId(design_year) },
      req.body,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateMasterSubmitForm(req, "annualAccounts");
    return res.status(200).json({
      msg: "AnnualAccountData Submitted!",
      isCompleted: !annualAccountData.isDraft,
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getAccounts = async (req, res) => {
  try {
    let { design_year, ulb } = req.query;
    if (req.decoded.role == "ULB") ulb = req?.decoded.ulb;
    const annualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year,
      isActive: true,
    }).select({ history: 0 });
    if (!annualAccountData) {
      return res.status(404).json({ msg: "No AnnualAccountData found" });
    }
    return res.status(200).json(annualAccountData);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  let { ulb, design_year, isDraft } = req.body;
  try {
    let currentAnnualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });
    const newAnnualAccountData = await AnnualAccountData.findOneAndUpdate(
      { ulb: ObjectId(ulb), isActive: true },
      { $set: req.body, $push: { history: currentAnnualAccountData } }
    );
    if (!newAnnualAccountData) {
      return res.status(404).json({ msg: "no AnnualAccountData found" });
    }
    await UpdateMasterSubmitForm(req, "annualAccounts");
    return res.status(200).json({ msg: "Action Submitted!" });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
