const catchAsync = require("../../../util/catchAsync");
const StateGTCertificate = require("../../../models/StateGTCertificate");
const ObjectId = require("mongoose").Types.ObjectId;
const {
  UpdateStateMasterForm,
} = require("../../../service/updateStateMasterForm");
const Response = require("../../../service").response;

module.exports.get = catchAsync(async (req, res) => {
  let user = req.decoded;
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  let { design_year } = req.params;
  if (!design_year) {
    return res.status(400).json({
      success: false,
      message: "Design Year Not Found",
    });
  }
  let query = {
    design_year: ObjectId(design_year),
    state: ObjectId(state),
  };
  let fetchedData = await StateGTCertificate.findOne(query, "-history");
  if (fetchedData) {
    return res.status(200).json({
      success: true,
      message: "Data Found Successfully",
      data: fetchedData,
    });
  } else {
    return res.status(404).json({
      success: false,
      message: "Not Data Found",
    });
  }
});

module.exports.create = catchAsync(async (req, res) => {
  let user = req.decoded;
  let data = req.body;
  let design_year = data?.design_year;
  data["actionTakenBy"] = user._id;
  data["state"] = user.state;
  if (user.role === "STATE") {
    let query = {
      state: ObjectId(user.state),
      design_year: ObjectId(design_year),
    };
    let existingData = await StateGTCertificate.findOne(query);
    if (existingData) {
      data["history"] = [...existingData.history];
      existingData.history = undefined;
      data["history"].push(existingData);
    }

    let updatedData = await StateGTCertificate.findOneAndUpdate(query, data, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    if (updatedData) {
      await UpdateStateMasterForm(req, "GTCertificate");
      return res.status(200).json({
        success: true,
        message: "Data Updated Successfully!",
        data: updatedData,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Failed to Submit Data",
      });
    }
  } else {
    return res.status(403).json({
      success: false,
      message: user.role + " is Not Authenticated to Perform this Action",
    });
  }
});

exports.action = async (req, res) => {
  try {
    const data = req.body,
      user = req.decoded;
    const { design_year } = req.body;
    data["actionTakenBy"] = user._id;
    let currentState = await StateGTCertificate.findOne(
      {
        state: ObjectId(data.state),
        design_year: ObjectId(design_year),
      },
      { history: 0 }
    );

    let finalStatus = "APPROVED";
    if (
      req.body.million_tied.status == "REJECTED" ||
      req.body.nonmillion_tied.status == "REJECTED" ||
      req.body.nonmillion_untied.status == "REJECTED"
    ) {
      finalStatus = "REJECTED";
    }
    if (
      req.body.million_tied.status == "PENDING" ||
      req.body.nonmillion_tied.status == "PENDING" ||
      req.body.nonmillion_untied.status == "PENDING"
    ) {
      finalStatus = "PENDING";
    }

    let allRejectReason = [
      { million_tied: req.body.million_tied.rejectReason },
      { nonmillion_tied: req.body.nonmillion_tied.rejectReason },
      { nonmillion_untied: req.body.nonmillion_untied.rejectReason },
    ];

    req.body.status = finalStatus;
    req.body.actionTakenBy = user?._id;
    req.body.modifiedAt = new Date();
    
    if (!currentState) {
      return res.status(400).json({ msg: "Requested record not found." });
    } else {
      let updatedRecord = await StateGTCertificate.findOneAndUpdate(
        {
          state: ObjectId(data.state),
          design_year: ObjectId(design_year),
        },
        { $set: req.body, $push: { history: currentState } }
      );
      await UpdateStateMasterForm(req, "GTCertificate");

      return res.status(200).json({ msg: "Action successful" });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
