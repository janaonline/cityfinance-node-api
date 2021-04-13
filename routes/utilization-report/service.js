const UtilizationReport = require("../../models/UtilizationReport");
const Ulb = require("../../models/Ulb");
const User = require("../../models/User");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const {
  emailTemplate: { utilizationRequestAction },
  sendEmail,
} = require("../../service");

module.exports.createOrUpdate = async (req, res) => {
  const { ulb, financialYear, isDraft } = req.body;
  try {
    req.body.actionTakenBy = req.decoded?.user?.id;
    await UtilizationReport.updateOne(
      { ulb: ObjectId(ulb), financialYear },
      { $set: req.body },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!isDraft) {
      UpdateMasterSubmitForm(req.body, "utilReport");
    }

    return res.status(200).json({ msg: "UtilizationReport Submitted!" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.read = async (req, res) => {
  try {
    const reports = await UtilizationReport.find(
      { isActive: true },
      { history: 0 }
    );
    return res.status(200).json(reports);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.readById = async (req, res) => {
  const { ulb, financialYear } = req.params;
  try {
    const report = await UtilizationReport.findOne({
      ulb,
      financialYear,
      isActive: true,
    }).select({ history: 0 });
    if (!report) {
      return res.status(404).json({ msg: "No UtilizationReport Found" });
    }
    return res.json(report);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.update = async (req, res) => {
  const { ulb, financialYear } = req.params;
  try {
    const report = await UtilizationReport.findOneAndUpdate(
      { _id: ulb, financialYear, isActive: true },
      req.body,
      {
        returnOriginal: false,
      }
    );

    if (!report)
      return res.json({ msg: `No UtilizationReport with that id of ${id}` });

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.remove = async (req, res) => {
  const { ulb, financialYear } = req.params;
  try {
    const report = await UtilizationReport.findOneAndUpdate(
      { ulb, financialYear, isActive: true },
      {
        isActive: false,
      }
    );

    if (!report) {
      return res.status(400).json({ msg: "No UtilizationReport found" });
    }

    res.status(200).json({ msg: "UtilizationReport Deleted" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};

exports.action = async (req, res) => {
  const data = req.body,
    user = req.decoded?.user;
  try {
    let currentState = await UtilizationReport.findOne(
      { ulb: ObjectId(data.ulb) },
      { history: 0 }
    );
    let ulb = currentState
      ? await Ulb.findById({ _id: ObjectId(currentState.ulb) })
      : null;
    if (ulb === null) {
      return res.status(400).json({ msg: "ulb not found" });
    }
    if (user?.role === "STATE" && ulb?.state?.id?.toString() !== user?.state) {
      return res.status(402).json({ msg: "State not matching" });
    } else if (user?.role === "ULB") {
      if (ulb?.id?.toString() !== user?.ulb)
        return res.status(402).json({ msg: "Ulb not matching" });
      else if (data.status !== "CANCELED")
        return res
          .status(401)
          .json({ msg: `Requested status(${data.status}) is not allowed.` });
    }
    try {
      let updateData = {
        status: data?.status,
        actionTakenBy: user?.id,
        remarks: data?.remarks,
        modifiedAt: new Date(),
      };
      if (!currentState) {
        return res.status(404).json({ msg: "Requested record not found." });
      } else if (
        currentState.status === "APPROVED" &&
        updateData.status === "APPROVED"
      ) {
        return res.status(402).json({ msg: "The record is already approved." });
      } else if (
        currentState.status === "CANCELLED" &&
        updateData.status === "CANCELLED"
      ) {
        return res
          .status(402)
          .json({ msg: "The record is already cancelled." });
      } else {
        let updatedRecord = await UtilizationReport.findOneAndUpdate(
          { ulb: ObjectId(data.ulb) },
          updateData,
          { $push: { history: currentState } }
        );
        if (!updatedRecord) {
          return res.status(404).json({ msg: "No Record Found" });
        }

        // update master form collection
        if (!data.isDraft) {
          UpdateMasterSubmitForm(data, "utilReport");
        }

        return res.status(200).json({ msg: "Action successful" });
      }
    } catch (e) {
      console.error(e.message);
      return res.status(500).json({ msg: "server error" });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "server error" });
  }
};
