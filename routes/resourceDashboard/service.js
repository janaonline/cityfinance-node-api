const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ResourceLineItem = require("../../models/ResourceLineItem");
const ULB = require("../../models/Ulb");
const resource = require("../../models/Resources");

module.exports.get = async function (req, res) {
  try {
    const { header, subheader, ulb, state, type } = req.query;
    if (!header || !subheader)
      return Response.BadRequest(res, null, "header and subheader is required");
    let query = { header, subheader };
    if (type) {
      Object.assign(query, { type });
    }
    let ulbs;
    if (ulb) {
      Object.assign(query, { ulb });
    } else if (state) {
      ulbs = await ULB.find({ state }, { _id: 1 }).lean();
      ulbs = ulbs.map((value) => value._id);
      Object.assign(query, { ulb: { $in: ulbs } });
    }
    let data = await Resource.find(query);
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports.post = async function (req, res) {
  try {
    const { name, downloadUrl } = req.body;
    if (!name || !downloadUrl)
      return Response.BadRequest(res, null, "name and downloadUrl is required");
    let data = new ResourceLineItem(req.body);
    await data.save();
    return Response.OK(res.data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};


/* A search function. */
module.exports.search = async function (req, res) {
  try {
    if(!req.query.name) throw new Error("Empty search !");

    const searchGlobal = req.query.name;
    const fromModelData = { learningCenter : 0, dataSet : 0, repostAndPublication : 0 };
    let query = { name : new RegExp(searchGlobal, "i") };

    fromModelData.dataSet = await ULB.count(query);
    fromModelData.repostAndPublication = await resource.count(query);

    return Response.OK(res, fromModelData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};
