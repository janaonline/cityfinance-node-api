const AnnualAccountData = require("../../models/AnnualAccounts");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");

exports.createUpdate = async (req, res) => {
  try {
    let { design_year, isDraft } = req.body;
    req.body.actionTakenBy = req?.decoded._id;
    req.body.ulb = req?.decoded.ulb;
    const ulb = req?.decoded.ulb;
    req.body.modifiedAt = new Date();

    let currentAnnualAccounts;
    if (req.body?.status == "REJECTED") {
      if (req.body.unAudited.submit_annual_accounts) {
        let proData = req.body.unAudited.provisional_data;
        for (const key in proData) {
          if (key == "auditor_report") continue;
          if (proData[key]?.status == "REJECTED") {
            proData[key].status = "PENDING";
            proData[key].rejectReason = null;
          }
        }
      }
      if (req.body.audited.submit_annual_accounts) {
        let proData = req.body.audited.provisional_data;
        for (const key in proData) {
          if (proData[key]?.status == "REJECTED") {
            proData[key].status = "PENDING";
            proData[key].rejectReason = null;
          }
        }
      }
      req.body.status = "PENDING";
      currentAnnualAccounts = await AnnualAccountData.findOne({
        ulb: ObjectId(ulb),
        design_year: ObjectId(design_year),
        isActive: true,
      }).select({
        history: 0,
      });
    }

    let annualAccountData;
    if (currentAnnualAccounts) {
      annualAccountData = await AnnualAccountData.findOneAndUpdate(
        { ulb: ObjectId(ulb), isActive: true },
        { $set: req.body, $push: { history: currentAnnualAccounts } }
      );
    } else {
      annualAccountData = await AnnualAccountData.findOneAndUpdate(
        { ulb: ObjectId(ulb), design_year: ObjectId(design_year) },
        req.body,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }
    if (
      !req.body.unAudited.submit_annual_accounts &&
      !req.body.audited.submit_annual_accounts
    ) {
      req.body.status = "N/A";
    }
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
      return res.status(400).json({ msg: "No AnnualAccountData found" });
    }
    return res.status(200).json(annualAccountData);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { ulb, design_year, isDraft } = req.body;
    req.body.actionTakenBy = req.decoded._id;
    req.body.modifiedAt = new Date();

    let currentAnnualAccountData = await AnnualAccountData.findOne({
      ulb: ObjectId(ulb),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });

    let allReasons = [];
    let finalStatus = "APPROVED";
    if (req.body.unAudited.submit_annual_accounts) {
      let unAudited = {};
      let proData = req.body.unAudited.provisional_data;
      for (const key in proData) {
        if (key == "auditor_report") continue;
        unAudited[key] = proData[key]?.rejectReason;
        if (proData[key]?.status == "REJECTED") {
          finalStatus = "REJECTED";
        }
      }
      allReasons.push(unAudited);
    }
    if (req.body.audited.submit_annual_accounts) {
      let audited = {};
      let proData = req.body.audited.provisional_data;
      for (const key in proData) {
        audited[key] = proData[key]?.rejectReason;
        if (proData[key]?.status == "REJECTED") {
          finalStatus = "REJECTED";
        }
      }
      allReasons.push(audited);
    }
    req.body.status = finalStatus;
    req.body.rejectReason = allReasons;

    const newAnnualAccountData = await AnnualAccountData.findOneAndUpdate(
      { ulb: ObjectId(ulb), isActive: true },
      { $set: req.body, $push: { history: currentAnnualAccountData } }
    );

    if (!newAnnualAccountData) {
      return res.status(400).json({
        msg: "no AnnualAccountData found",
      });
    }

    await UpdateMasterSubmitForm(req, "annualAccounts");

    return res.status(200).json({
      msg: "Action Submitted!",
      newAnnualAccountData: { status: req.body.status },
    });
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
