const catchAsync = require("../../../util/catchAsync");
const StateGTCertificate = require("../../../models/StateGTCertificate");
const Ulb = require('../../../models/Ulb')
const State = require('../../../models/State')
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require('../../../service')
const Year = require('../../../models/Year')
const User = require('../../../models/User')
const {
  UpdateStateMasterForm,
} = require("../../../service/updateStateMasterForm");
const Response = require("../../../service").response;

module.exports.get = catchAsync(async (req, res) => {
  let user = req.decoded;
  const { state_id } = req.query;
  const {installment} = req.query
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
    installment:installment
  };
  let fetchedData = await StateGTCertificate.find(query, "-history").lean();
  // let userData = await User.findOne({ _id: ObjectId(fetchedData['actionTakenBy']) });
  // fetchedData['actionTakenByRole'] = userData['role']
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
    let stateData = await State.findOne({_id: ObjectId(user.state)}).lean()
    let yearData = await Year.findOne({_id: ObjectId(design_year)})
    let query = {
      state: ObjectId(user.state),
      design_year: ObjectId(design_year),
      installment: req.body.installment
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
      let template = Service.emailTemplate.gtcSubmission(stateData.name, yearData.year, user.name, req.body.installment )
      let mailOptions =     {
        Destination: {
          /* required */
          // ToAddresses: ["ansh.mittal@janaagraha.org", "pankaj.mittal@janaagraha.org", user.email]
            ToAddresses: ["vishu.gupta@dhwaniris.com"]
        },
        Message: {
          /* required */
          Body: {
            /* required */
            Html: {
              Charset: "UTF-8",
              Data:  template.body
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data:template.subject
          }
        },
        Source: process.env.EMAIL,
        /* required */
        ReplyToAddresses: [process.env.EMAIL],
      }
    Service.sendEmail(mailOptions);
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

module.exports.showGTCform = catchAsync(async (req, res) => {
  let user = req.decoded;
  let { state_id } = req.query;
  let state = user.state ?? state_id
  let query = [
    {

      $match: {
        state: ObjectId(state),

      },
    },

    {
      $group: {
        _id: "$isMillionPlus",
        count: { $sum: 1 }
      }
    }



  ]

  let output = {
    showQ1: false,
    showQ2: false,
    showQ3: false
  }
  let data = await Ulb.aggregate(query)
  data.forEach(el => {
    if (el._id == 'Yes' && el.count >= 1) {
      output.showQ1 = true
    } else if (
      el._id == 'No' && el.count >= 1
    ) {
      output.showQ2 = true
      output.showQ3 = true
    }
  })

  return res.status(200).json({
    success: true,
    data: output
  })

})

exports.action = async (req, res) => {
  try {
    const data = req.body,
      user = req.decoded;
    const { design_year } = req.body;
    data["actionTakenBy"] = user._id;
    let { state_id } = req.query;
    let state = data.state ?? state_id
    let currentState = await StateGTCertificate.findOne(
      {
        state: ObjectId(state),
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
          state: ObjectId(state),
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
