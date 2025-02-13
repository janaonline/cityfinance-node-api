const searchKeyword = require("../../models/searchKeywords");
const Response = require("../../service").response;

/**
 * Dynamic Financial Years are  those years which are contain any Financial Data.
 * The list changes based upon the datas present in collection UlbFinancialData.
 *  */
async function addKeyword(req, res) {
  try {
    const { name } = req.body;
    const savedData = await searchKeyword.findOneAndUpdate(
      { name, isActive: true },
      { $set: req.body },
      {
        upsert: true,
        new: true,
      }
    );
    if (!savedData) {
      return Response.BadRequest(res, null, "Not Saved");
    }
    return Response.OK(res, savedData);
  } catch (error) {
    return Response.DbError(res, error, "Internal Server Error");
  }
}

async function getAllKeyword(req, res) {
  try {
    let data = await searchKeyword.find({ isActive: true }).lean();
    if (data.length == 0) {
      return Response.BadRequest(res, null, "No Data");
    }
    return Response.OK(res, data);
  } catch (error) {
    return Response.InternalError(res, error);
  }
}
module.exports = {
  addKeyword,
  getAllKeyword,
};
