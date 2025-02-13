const catchAsync = require("../../../util/catchAsync");
const StateGTCertificate = require("../../../models/StateGTCertificate");
const Ulb = require('../../../models/Ulb')
const State = require('../../../models/State')
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require('../../../service')
const Year = require('../../../models/Year')
const User = require('../../../models/User')
const STATUS_LIST = require('../../../util/newStatusList')
const {
  UpdateStateMasterForm,
} = require("../../../service/updateStateMasterForm");
const { concatenateUrls } = require("../../../service/common");
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
     if(req.headers.host == `${process.env.PROD_HOST}`){
      let template = Service.emailTemplate.gtcSubmission(stateData.name, yearData.year, user.name, req.body.installment )
      let mailOptions =     {
        Destination: {
          /* required */
          ToAddresses: ["ansh.mittal@janaagraha.org", "pankaj.mittal@janaagraha.org", user.email, "vishu.gupta@dhwaniris.com"]
            
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
     }

  
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

const calculateStatus = (data) => {
  data.map((el)=> {
   el.date = (new Date(el.date)).toDateString();

    if(el.million_tied_status == 'PENDING' && el.million_tied_isDraft ){
      el.million_tied_status = STATUS_LIST.In_Progress
    }else if(el.million_tied_status == 'PENDING' && !el.million_tied_isDraft ){
      el.million_tied_status = STATUS_LIST.Under_Review_By_MoHUA
    }else if(el.million_tied_status == 'APPROVED'){
      el.million_tied_status = STATUS_LIST.Approved_By_MoHUA
    }else if(el.million_tied_status == 'REJECTED'){
      el.million_tied_status = STATUS_LIST.Rejected_By_MoHUA
    }

    if(el.nonMillion_tied_status == 'PENDING' && el.nonMillion_tied_isDraft ){
      el.nonMillion_tied_status = STATUS_LIST.In_Progress
    }else if(el.nonMillion_tied_status == 'PENDING' && !el.nonMillion_tied_isDraft ){
      el.nonMillion_tied_status = STATUS_LIST.Under_Review_By_MoHUA
    }else if(el.nonMillion_tied_status == 'APPROVED'){
      el.nonMillion_tied_status = STATUS_LIST.Approved_By_MoHUA
    }else if(el.nonMillion_tied_status == 'REJECTED'){
      el.nonMillion_tied_status = STATUS_LIST.Rejected_By_MoHUA
    }

    if(el.nonMillion_untied_status == 'PENDING' && el.nonMillion_untied_isDraft ){
      el.nonMillion_untied_status = STATUS_LIST.In_Progress
    }else if(el.nonMillion_untied_status == 'PENDING' && !el.nonMillion_untied_isDraft ){
      el.nonMillion_untied_status = STATUS_LIST.Under_Review_By_MoHUA
    }else if(el.nonMillion_untied_status == 'APPROVED'){
      el.nonMillion_untied_status = STATUS_LIST.Approved_By_MoHUA
    }else if(el.nonMillion_untied_status == 'REJECTED'){
      el.nonMillion_untied_status = STATUS_LIST.Rejected_By_MoHUA
    }
  })
  return data;
} 

module.exports.report = async (req,res) => {

let query = [
  {
    $lookup: {
      from:"years",
      localField:"design_year",
      foreignField:"_id",
      as:"design_year"
    }
  },
  {
    $unwind:"$design_year"
  },
  {
    $lookup: {
      from:"states",
      localField:"state",
      foreignField:"_id",
      as:"state"
    }
  },
  {
    $unwind:"$state"
  },
  {
    $lookup: {
      from:"users",
      localField:"actionTakenBy",
      foreignField:"_id",
      as:"user"
    }
  },
  {
    $unwind:"$user"
  },
  {
    $project: {
      state:"$state.name",
      installment:1,
      year:"$design_year.year",
      date:"$createdAt",
      million_tied:{$ifNull: ["$million_tied.pdfUrl","Not Submitted"]},
      million_tied_status:  {
        $cond: {
          if: { $ne: ["$million_tied.pdfUrl", ""] },
          then: "$million_tied.status",
          else: "Not Submitted",
        },
      },
      million_tied_isDraft:"$million_tied.isDraft",
      nonMillion_tied:{$ifNull: ["$nonmillion_tied.pdfUrl","Not Submitted"]},
      nonMillion_tied_status: {
        $cond: {
          if: { $ne: ["$nonmillion_tied.pdfUrl", ""] },
          then: "$nonmillion_tied.status",
          else: "Not Submitted",
        },
      },
      nonMillion_tied_isDraft:"$nonmillion_tied.isDraft",
      nonMillion_untied:{$ifNull: ["$nonmillion_untied.pdfUrl","Not Submitted"]},
      nonMillion_untied_status: {
        $cond: {
          if: { $ne: ["$nonmillion_untied.pdfUrl", ""] },
          then:  "$nonmillion_untied.status",
          else: "Not Submitted",
        },
      },
      nonMillion_untied_isDraft:"$nonmillion_untied.isDraft",

    }
  }

]
let data = await StateGTCertificate.aggregate(query);
data = calculateStatus(data);
let filename = "GTC_REPORT.csv";
res.setHeader("Content-disposition", "attachment; filename=" + filename);
res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
res.write(
  "State, Year, Date Updated, Installment , Million Tied URL, Million Tied Status, Non-Million Tied URL, Non-Million Tied Status , Non-Million Untied URL,  Non-Million Untied Status   \r\n"
);
// Flush the headers before we start pushing the CSV content
res.flushHeaders();

for (el of data) {
  el = JSON.parse(JSON.stringify(el));
  let urlParams = {
    nonMillion_tied: "nonMillion_tied",
    nonMillion_untied: "nonMillion_untied",
    million_tied: 'million_tied'
  };
  el = concatenateUrls(el, urlParams);
  res.write(
    el.state +
    "," +
    el.year +
    "," +
    el.date +
    "," +
    el.installment +
    "," +
    el.million_tied +
    "," +
    el.million_tied_status +
    "," +
    el.nonMillion_tied +
    "," +
    el.nonMillion_tied_status +
    "," +
    el.nonMillion_untied +
    "," +
    el.nonMillion_untied_status +
    "," +
    "\r\n"
  );
}
res.end();

}

