const Ulb = require("../../../models/Ulb");
const UlbLedger = require("../../../models/UlbLedger");
const Sate = require("../../../models/State");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const State = require("../../../models/State");

let filterType = [
  "Town Panchayat",
  "Municipal Council",
  "Municipal Corporation",
];

const peopleInformation = async (req, res) => {
  try {
    const type = (req.query.type || req.headers.type).toLowerCase();
    if (!type) return Response.BadRequest(res, {}, "No Type Provided");
    let data;
    switch (type) {
      case "ulb":
        data = await Ulb.findOne({
          _id: ObjectId(req.query.ulb) || null,
        })
          .populate("ulbType")
          .populate("state")
          .lean();
        let ledgerData =  await UlbLedger.aggregate([
            {
              $match: {
                ulb: ObjectId(req.query.ulb)
              }
            },
            {
              $group:{
                _id : "$financialYear"
              }
            }
          ])
          if(ledgerData.length>0){
            data['dataAvailable'] = ledgerData.length
          }else{
            data['dataAvailable'] = 0
          }
        if (!data) return Response.BadRequest(res, null, "No Data Found");
        Object.assign(data, {
          density: parseFloat((data.population / data.area).toFixed(2)),
        });
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
            $lookup: {
              from: "states",
              localField: "state",
              foreignField: "_id",
              as: "state",
            },
          },
          { $unwind: "$state" },
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
              Town_Panchayat: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$ulbType.name", filterType[0]] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              Municipal_Council: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$ulbType.name", filterType[1]] },
                    then: 1,
                    else: 0,
                  },
                },
              },
              Municipal_Corporation: {
                $sum: {
                  $cond: {
                    if: { $eq: ["$ulbType.name", filterType[2]] },
                    then: 1,
                    else: 0,
                  },
                },
              },
            },
          },
        ]);
        if (data.length == 0)
          return Response.BadRequest(res, null, "No Data Found");
        Object.assign(data[0], {
          density: parseFloat((data[0].population / data[0].area).toFixed(2)),
        });
        break;
    }
    return Response.OK(res, data || data[0]);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

const moneyInformation = async (req, res) => {
  try {
    const type = (req.query.type || req.headers.type).toLowerCase();
    if (!type) return Response.BadRequest(res, {}, "No Type Provided");
    let data, ulbId;
    switch (type) {
      case "ulb":
        ulbId = [ObjectId(req.query.ulb)];
        break;
      case "state":
        ulbId = await Ulb.find({ state: ObjectId(req.query.state) })
          .select({ _id: 1 })
          .lean();
        ulbId = ulbId.map((value) => value._id);
        break;
      default:
        return Response.BadRequest(res, null, "wrong type selected");
    }
    data = await UlbLedger.aggregate([
      { $match: { ulb: { $in: ulbId } } },
      {
        $lookup: {
          from: "lineitems",
          localField: "lineItem",
          foreignField: "_id",
          as: "lineitems",
        },
      },
      { $unwind: "$lineitems" },
      {
        $group: {
          _id: "$lineitems.headOfAccount",
          amount: { $sum: "$amount" },
          totalGrant: {
            $sum: {
              $cond: {
                if: { $eq: ["$lineitems.code", "160"] },
                then: "$amount",
                else: 0,
              },
            },
          },
        },
      },
    ]);
    if (!data || data.length == 0)
      return Response.BadRequest(res, null, "No Data Found");
    return Response.OK(res, data);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

const getLatestData = async (req, res) => {
  try {
    const { ulb } = req.query;

    if (!ulb) return Response.BadRequest(res, null, "no ulb found");
    let year = await UlbLedger.find({ ulb: req.query.ulb })
      .sort({ financialYear: -1 })
      .limit(1)
      .lean();
    if (!year[0]) return Response.BadRequest(res, null, "no year data found");
    return Response.OK(res, year[0]);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

module.exports = {
  peopleInformation,
  moneyInformation,
  getLatestData,
};
