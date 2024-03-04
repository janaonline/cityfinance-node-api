const Ulb = require("../../../models/Ulb");
const UlbLedger = require("../../../models/UlbLedger");
const Sate = require("../../../models/State");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const State = require("../../../models/State");
const OwnRevenueObjectIDs = [
   ObjectId("5dd10c2485c951b54ec1d74b"),
ObjectId("5dd10c2685c951b54ec1d762"),
ObjectId("5dd10c2485c951b54ec1d74a"),
ObjectId("5dd10c2885c951b54ec1d77e"),
ObjectId("5dd10c2385c951b54ec1d748"),
]
let filterType = ["Town Panchayat", "Municipality", "Municipal Corporation"];

const peopleInformation = async (req, res) => {
  try {
    let message = ""
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
          .populate("UA")
          .lean();
          message = data.isActive ? "" :"This ULB has been denotified"
        let ledgerData = await UlbLedger.aggregate([
          {
            $match: {
              ulb: ObjectId(req.query.ulb),
            },
          },
          {
            $group: {
              _id: "$financialYear",
            },
          },
        ]);
        if (ledgerData.length > 0) {
          data["dataAvailable"] = ledgerData.length;
        } else {
          data["dataAvailable"] = 0;
        }
        if (!data) return Response.BadRequest(res, null, "No Data Found");
        Object.assign(data, {
          density: parseFloat((data.population / data.area).toFixed(2)),
        });
        break;
      case "state":
        data = await Ulb.aggregate([
          { $match: { state: ObjectId(req.query.state) || null,
            isActive:true
          } },
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
    return Response.OK(res, data || data[0],message);
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

const moneyInformation = async (req, res) => {
  try {
    let type = (req.query.type || req.headers.type);
    let message = ""
    if (!type) return Response.BadRequest(res, {}, "No Type Provided");
    type = type.toLowerCase();
    let data, ulbId;
    switch (type) {
      case "ulb":
        ulbId = [ObjectId(req.query.ulb)];
        let ulbResponse = await Ulb.findOne({_id:ulbId},{isActive:1})
        message = ulbResponse.isActive ? "" :"This ULB has been denotified"
        break;
      case "state":
        ulbId = await Ulb.find({ state: ObjectId(req.query.state),isActive:true })
          .select({ _id: 1 })
          .lean();
        ulbId = ulbId.map((value) => value._id);
        break;
      case "national":
        ulbId = await Ulb.find({isActive:true}).select({ _id: 1 }).lean();
        ulbId = ulbId.map((value) => value._id);
        break;
      default:
        return Response.BadRequest(res, null, "wrong type selected");
    }
    data = await UlbLedger.aggregate([
      { $match: { ulb: { $in: ulbId }, financialYear: req.query.year } },
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
  let ownRevenue =  await UlbLedger.aggregate([
      { $match: { ulb: { $in: ulbId }, 
      financialYear: req.query.year,
    lineItem: {
        $in: OwnRevenueObjectIDs

    }
    } },
    {
      $group: {
        _id: null,
        ownRevenue: { $sum: "$amount" },
      }
    },
    {
      $project:{
        _id: "OwnRevenue",
        amount:"$ownRevenue"
      }
    }

    ])
    let revenue = data.find(el => el._id == 'Revenue') ;
    let assets = data.find(el => el._id == 'Asset') ;
    
    let taxRevenueObj = {
      _id: 'TaxRevenue',
      amount: revenue?.amount - ownRevenue[0]?.amount
    }
    let grantObj = {
      _id: 'Grant',
      amount: revenue?.totalGrant
    }
    let balanceSheet = {
      _id: 'BalanceSheetSize',
      amount: assets?.amount
    }
  
data.push(ownRevenue[0],taxRevenueObj, grantObj, balanceSheet )

    return Response.OK(res, data,message);
  } catch (err) {
    console.log(err)
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

const getYearList = async (req, res) => {
  try {
    const { ulb } = req.query;
    let matchObj = {};
    if (ulb) {
      matchObj = { ulb };
    }
    let year = await UlbLedger.distinct("financialYear", matchObj);
    return Response.OK(res, year);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

module.exports = {
  peopleInformation,
  moneyInformation,
  getLatestData,
  getYearList,
};
