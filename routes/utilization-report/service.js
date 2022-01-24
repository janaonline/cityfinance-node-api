const UtilizationReport = require("../../models/UtilizationReport");
const Ulb = require("../../models/Ulb");
const User = require("../../models/User");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Category = require('../../models/Category')
const {
  emailTemplate: { utilizationRequestAction },
  sendEmail,
} = require("../../service");
const { ElasticBeanstalk } = require("aws-sdk");
const time = () => {
  var dt = new Date();
  dt.setHours(dt.getHours() + 5);
  dt.setMinutes(dt.getMinutes() + 30);
  return dt;
};
module.exports.createOrUpdate = async (req, res) => {
  try {
    const { financialYear, isDraft, designYear } = req.body;
    const ulb = req.decoded?.ulb;
    req.body.ulb = ulb;
    req.body.actionTakenBy = req.decoded?._id;
    req.body.actionTakenByRole = req.decoded?.role;
    req.body.modifiedAt = new Date();
    // 
    let currentSavedUtilRep;
    if (req.body?.status == "REJECTED") {
      
      req.body.rejectReason = null;
      currentSavedUtilRep = await UtilizationReport.findOne(
        { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
        { history: 0 }
      );
    }
    req.body.status = "PENDING";
    let savedData;
    if (currentSavedUtilRep) {
      let update =   { $set: req.body}
      if(currentSavedUtilRep['actionTakenByRole'] != req.body.actionTakenByRole ){
        Object.assign(update,{$push: { history: currentSavedUtilRep } })
      }
      savedData = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(ulb), isActive: true, financialYear, designYear },
      update
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
  let query = [
    {
      $match: {
        ulb: ObjectId(ulb),
        designYear: ObjectId(designYear),
        financialYear: ObjectId(financialYear)
      }
    },
    {
      $unwind: "$projects"
    },
    {
      $group: {
        _id: "$projects.category",
        count: { "$sum": 1 },
        amount: { "$sum": { "$toDouble": "$projects.expenditure" } },
        totalProjectCost: { "$sum": { "$toDouble": "$projects.cost" } }
      }
    }
  ]
  let arr = await UtilizationReport.aggregate(query)

  let catData = await Category.find().lean().exec()
  let flag = 0;
  let filteredCat = [];


  for (let el of catData) {
    for (let el2 of arr) {

      if (el2['_id'] != null && (String(el['_id']) === String(el2['_id']))) {
        // console.log(ObjectId(el._id), ObjectId(el2._id))
        flag = 1;
        break;
      }
    }
    if (!flag) {
      filteredCat.push(el)
    } else {
      flag = 0;
    }
  }

  console.log(filteredCat)
  filteredCat.forEach(el => {

    arr.push({
      _id: el._id,
      count: 0,
      amount: 0,
      totalProjectCost: 0

    })


  })

  let arrNew = arr.filter(el => el['_id'] != null)

  try {
    let report = await UtilizationReport.findOne({
      ulb,
      financialYear,
      designYear,
      isActive: true,
    }).select({ history: 0 }).lean();

    if (report == null) {
      report = {
        categoryWiseData_wm: [],
        categoryWiseData_swm: []
      }
      const swm_category = [
        'Sanitation',
        'Solid Waste Management'
      ]
      const wm_category = [
        'Rejuvenation of Water Bodies',
        'Drinking Water',
        'Rainwater Harvesting',
        'Water Recycling'
      ]
      let i = 0;
      for (let el of wm_category) {
        report['categoryWiseData_wm'].push({
          category_name: el,
          grantUtilised: null,
          numberOfProjects: null,
          totalProjectCost: null
        })
        i++;
      }
      i = 0;
      for (let el of swm_category) {
        report['categoryWiseData_swm'].push({
          category_name: el,
          grantUtilised: null,
          numberOfProjects: null,
          totalProjectCost: null
        })
        i++;
      }
    }

    report['analytics'] = (arrNew)
    if (
      req.decoded.role === "MoHUA" &&
      report?.actionTakenByRole === "STATE" &&
      report?.status == "APPROVED"
    ) {
      report.status = "PENDING";
      report.rejectReason = null;
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
      { ulb: ObjectId(data.ulb), designYear, isActive: true },
      { history: 0 }
    );
    let updateData = {
      status: data?.status,
      actionTakenBy: user?._id,
      rejectReason: data?.rejectReason,
      modifiedAt: new Date(),
      actionTakenByRole: user.role,
    };
    if (!currentState) {
      return res.status(400).json({ msg: "Requested record not found." });
    } else {
      let update =   { $set: updateData}
      if(currentState['actionTakenByRole'] != user.role ){
        Object.assign(update,{ $push: { history: currentState } })
      }
      let updatedRecord = await UtilizationReport.findOneAndUpdate(
        { ulb: ObjectId(data.ulb), isActive: true, financialYear, designYear },
      update
      );
      if (!updatedRecord) {
        return res.status(400).json({ msg: "No Record Found" });
      }

      await UpdateMasterSubmitForm(req, "utilReport");
      let newUtil = {
        status: data?.status,
      };
      return res.status(200).json({ msg: "Action successful", newUtil });
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.report = async(req,res) =>{
  let filename = "Detailed-Utilization-Report.csv";


  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });
  res.write(
    "ULB name, ULB Code,STATE , Unutilised Tied Grants from previous installment (INR in lakhs), 15th F.C. Tied grant received during the year (1st & 2nd installment taken together) (INR in lakhs), Expenditure incurred during the year i.e. as on 31st March 2021 from Tied grant (INR in lakhs) \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();
  let query = [
    {
        $lookup:{
            from:"ulbs",
            localField:"ulb",
            foreignField:"_id",
            as:"ulb"
            }
        },{
            $unwind:"$ulb"
            },
            {
                  $lookup:{
            from:"states",
            localField:"ulb.state",
            foreignField:"_id",
            as:"state"
            }
                
                },{
                    $unwind:"$state"
                    },
                   { 
                  $project:  {
                        ulbName: "$ulb.name",
                        ulbCode:"$ulb.code",
                        stateName:"$state.name",
                        unutilisedTiedGrants:"$grantPosition.unUtilizedPrevYr",
                        grantReceived:"$grantPosition.receivedDuringYr",
                        expenditureIncurred:"$grantPosition.expDuringYr",
                        closingBalance: "$grantPosition.closingBal"
                        }
                    }
    ]

 let data =    await UtilizationReport.aggregate(query)

 if(data){
  for (el of data) {
    res.write(
      el.ulbName +
      "," +
      el.ulbCode +
      "," +
      el.stateName +
      "," +
      el.unutilisedTiedGrants +
      "," +
      el.grantReceived +
      "," +
      el.expenditureIncurred +
      "," +
      el.closingBalance +
      "," +
      "\r\n"
    );
  }
  res.end();

 }
}
