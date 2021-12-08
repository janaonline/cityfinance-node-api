const Ulb = require("../../../models/Ulb");
const Sate = require("../../../models/State");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const State = require("../../../models/State");

const peopleInformation = async (req, res) => {
  try {
    const type = (req.query.type || req.headers.type).toLowerCase();
    if (!type) return Response.BadRequest(res, {}, "No Type Provided");
    let data;
    switch (type) {
      case "ulb":
        data = await Ulb.findOne({ _id: ObjectId(req.query.ulb) || null })
          .select({ area: 1, population: 1, wards: 1 })
          .lean();
        if (!data) return Response.BadRequest(res, null, "No Data Found");
        Object.assign(data, {
          density: parseFloat((data.population / data.area).toFixed(2)),
        });
        return Response.OK(res, data);
        break;
      case "state":
        data = await Ulb.aggregate([
          { $match: { state: ObjectId(req.query.state) || null } },
          {
            $lookup: {
              from: "ulbtypes",
              localField: "ulbType",
              foreignField: "_id",
              as: "ulbType",
            },
          },
          { $unwind: "$ulbType" },
          {
            $group: {
              _id: "$state",
              population: { $sum: "$population" },
              wards: { $sum: "$wards" },
              area: { $sum: "$area" },
              ulbs: { $sum: 1 },
              uas: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$isUA", "Yes"] },
                    then: 1,
                    else: 0,
                  },
                },
              },
            },
          },
        ]);
        if (!data) return Response.BadRequest(res, null, "No Data Found");
        Object.assign(data, {
          density: parseFloat((data.population / data.area).toFixed(2)),
        });
        return Response.OK(res, data);
        break;
    }
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

const moneyInformation = async (req, res) => {
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

module.exports = {
  peopleInformation,
  moneyInformation,
};
