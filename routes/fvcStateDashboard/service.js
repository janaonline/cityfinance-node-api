const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.dashboard = async (req, res) => {
  const { state } = req.decoded;
  try {
    let query = [
      {
        $match: {
          _id: ObjectId(state),
        },
      },
      {
        $lookup: {
          from: "uas",
          pipeline: [
            {
              $match: {
                state: ObjectId(state),
              },
            },
            {
              $project: {
                __v: 0,
                createdAt: 0,
                modifiedAt: 0,
              },
            },
          ],
          as: "uaList",
        },
      },
      {
        $lookup: {
          from: "ulbs",
          pipeline: [
            {
              $match: {
                state: ObjectId(state),
              },
            },
          ],
          as: "totalUlb",
        },
      },
      {
        $lookup: {
          from: "ulbs",
          pipeline: [
            {
              $match: {
                state: ObjectId(state),
                isMillionPlus: "No",
              },
            },
          ],
          as: "totalUlbNonMil",
        },
      },
      {
        $project: {
          totalUa: { $size: "$uaList" },
          totalUlb: { $size: "$totalUlb" },
          totalUlbNonMil: { $size: "$totalUlbNonMil" },
          uaList: "$uaList",
        },
      },
    ];

    const data = await State.aggregate(query);
    if(data[0]){
      data[0].totalUlbInUas = 0
      data[0].uaList.forEach(element => {
        data[0].totalUlbInUas += element.ulb.length
      });
    }
    return Response.OK(
      res,
      data[0] ?? null,
      data[0] ? "Success" : "Not Found",
      data[0] ? 200 : 400
    );
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
