const UtilizationReport = require("../../models/UtilizationReport");
const Ulb = require("../../models/Ulb");
const User = require("../../models/User");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const {
  emailTemplate: { utilizationRequestAction },
  sendEmail,
} = require("../../service");

module.exports.createOrUpdate = async (req, res) => {
  try {
    const { financialYear, isDraft, designYear } = req.body;
    const ulb = req.decoded?.ulb;
    req.body.ulb = ulb;
    req.body.actionTakenBy = req.decoded?._id;
    req.body.modifiedAt = new Date();

    let currentSavedUtilRep;
    if (req.body?.status == "REJECTED") {
      req.body.status = "PENDING";
      req.body.rejectReason = null;
      currentSavedUtilRep = await UtilizationReport.findOne(
        { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
        { history: 0 }
      );
    }

    let savedData;
    if (currentSavedUtilRep) {
      savedData = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
        { $set: req.body, $push: { history: currentSavedUtilRep } }
      );
    } else {
      savedData = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(ulb), financialYear, designYear },
        { $set: req.body },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    if (savedData) {
      await UpdateMasterSubmitForm(req, "utilReport");
      return res.status(200).json({
        msg: "Utilization Report Submitted Successfully!",
        isCompleted: savedData.isDraft ? !savedData.isDraft : true,
      });
    } else {
      return res.status(400).json({
        msg: "Failed to Submit Data",
      });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
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
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.readById = async (req, res) => {
  const { financialYear, designYear, ulb_id } = req.params;
  let ulb = req.decoded?.ulb;
  if (req.decoded?.role != "ULB" && ulb_id) {
    ulb = ulb_id;
  }
  try {
    const report = await UtilizationReport.findOne({
      ulb,
      financialYear,
      designYear,
      isActive: true,
    }).select({ history: 0 });
    if (!report) {
      return res.status(400).json({ msg: "No UtilizationReport Found" });
    }
    return res.json(report);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.update = async (req, res) => {
  const { financialYear } = req.params;
  const ulb = req.decoded?._id;
  try {
    const report = await UtilizationReport.findOneAndUpdate(
      { ulb, financialYear, isActive: true },
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
    return res.status(400).json({ msg: err.message });
  }
};

exports.remove = async (req, res) => {
  const { financialYear } = req.params;
  const ulb = req.decoded?._id;
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
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    const data = req.body,
      user = req.decoded;
    const { financialYear, designYear } = req.body;
    req.body.actionTakenBy = req.decoded._id;

    let currentState = await UtilizationReport.findOne(
      { ulb: ObjectId(data.ulb), isActive: true },
      { history: 0 }
    );
    // let ulb = currentState
    //   ? await Ulb.findById({ _id: ObjectId(currentState.ulb), isActive: true })
    //   : null;
    // if (ulb === null) {
    //   return res.status(400).json({ msg: "ulb not found" });
    // }
    // if (user?.role === "STATE" && ulb?.state?.toString() !== user?.state) {
    //   return res.status(400).json({ msg: "State not matching" });
    // }
    let updateData = {
      status: data?.status,
      actionTakenBy: user?._id,
      rejectReason: data?.rejectReason,
      modifiedAt: new Date(),
    };
    if (!currentState) {
      return res.status(400).json({ msg: "Requested record not found." });
    } else {
      let updatedRecord = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(data.ulb), isActive: true, financialYear, designYear },
        { $set: updateData, $push: { history: currentState } }
      );
      if (!updatedRecord) {
        return res.status(400).json({ msg: "No Record Found" });
      }

      await UpdateMasterSubmitForm(req, "utilReport");

      return res.status(200).json({ msg: "Action successful" });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
