const recentSearchKeywords = require("../../models/recentSearchKeywords");
const ulb = require("../../models/Ulb");
const state = require("../../models/State");
const searchKeyword = require("../../models/searchKeywords");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;

/**
 * Dynamic Financial Years are  those years which are contain any Financial Data.
 * The list changes based upon the datas present in collection UlbFinancialData.
 *  */
async function addKeyword(req, res) {
  try {
    const { ulb, state, searchKeyword } = req.body;
    const searchObj = ulb || state || searchKeyword;

    if (!searchObj)
      return Response.BadRequest(req, null, "No searchKeyword given");

    let query = { isActive: true };
    if (ulb) {
      Object.assign(query, { ulb: ObjectId(ulb) });
    } else if (state) {
      Object.assign(query, { state: ObjectId(state) });
    } else {
      Object.assign(query, { searchKeyword: ObjectId(searchKeyword) });
    }

    let previousSearch = await recentSearchKeywords.findOne(query).lean();

    if (previousSearch) previousSearch.count++;
    else previousSearch = req.body;

    const savedData = await recentSearchKeywords.findOneAndUpdate(
      query,
      { $set: previousSearch },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
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
    const { limit = 5 } = req.query;
    const data = await recentSearchKeywords
      .find({ isActive: true })
      .sort({ count: -1 })
      .limit(limit)
      .lean();
    if (data.length == 0) {
      return Response.BadRequest(res, null, "No Data");
    }
    return Response.OK(res, data);
  } catch (error) {
    return Response.InternalError(res, error);
  }
}

async function search(req, res) {
  try {
    const { matchingWord } = req.body;
    if (!matchingWord)
      return Response.BadRequest(res, null, "Provide word to match");
    let query = { name: { $regex: matchingWord, $options: "im" } };
    let ulbPromise = ulb
      .find(query)
      .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let statePromise = state
      .find(query)
      .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let searchKeywordPromise = searchKeyword
      .find(query)
      .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let data = await Promise.all([
      ulbPromise,
      statePromise,
      searchKeywordPromise,
    ]);
    data = [
      ...data[0].map((value) => {
        value.type = "ulb";
        return value;
      }),
      ...data[1].map((value) => {
        value.type = "state";
        return value;
      }),
      ...data[2].map((value) => {
        value.type = "keyWord";
        return value;
      }),
    ];
    return Response.OK(res, data);
  } catch (error) {
    return Response.InternalError(res, error);
  }
}
module.exports = {
  addKeyword,
  getAllKeyword,
  search,
};
