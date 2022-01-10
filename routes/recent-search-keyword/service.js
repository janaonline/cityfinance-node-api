const recentSearchKeywords = require("../../models/recentSearchKeywords");
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const SearchKeyword = require("../../models/searchKeywords");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");

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
      Object.assign(query, { ulb: ObjectId(ulb), type: "ULB" });
    } else if (state) {
      Object.assign(query, { state: ObjectId(state), type: "STATE" });
    } else {
      Object.assign(query, {
        searchKeyword: ObjectId(searchKeyword),
        type: "SEARCHKEYWORD",
      });
    }

    let previousSearch = await recentSearchKeywords.findOne(query).lean();

    if (previousSearch) previousSearch.count++;
    else {
      let key = Object.keys(query)[1];
      let data;
      if (ulb) {
        data = await Ulb.findOne({ _id: query[key] })
          .select({ name: 1 })
          .lean();
      } else if (state) {
        data = await State.findOne({ _id: query[key] })
          .select({ name: 1 })
          .lean();
      } else {
        data = await SearchKeyword.findOne({ _id: query[key] })
          .select({ name: 1 })
          .lean();
      }

      previousSearch = req.body;
      Object.assign(previousSearch, { name: data.name });
    }

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
    let { limit = 5 } = req.query;
    limit = Number(limit);
    if (isNaN(limit)) return Response.BadRequest(res, null, "Wrong Limit");
    let data = await recentSearchKeywords
      .find({ isActive: true })
      .select({ _id: 0 })
      .sort({ count: -1 })
      .limit(limit)
      .lean();
    data = data.map((value) => {
      let keys = Object.keys(value);
      if (keys.includes("ulb")) {
        Object.assign(value, { _id: value.ulb });
        delete value.ulb;
      } else if (keys.includes("state")) {
        Object.assign(value, { _id: value.state });
        delete value.state;
      } else if (keys.includes("searchKeyword")) {
        Object.assign(value, { _id: value.searchKeyword });
        delete value.searchKeyword;
      }
      return value;
    });
    if (data.length == 0) {
      return Response.BadRequest(res, null, "No Data");
    }
    return Response.OK(res, data);
  } catch (error) {
    return Response.InternalError(res, error, error.message);
  }
}

async function search(req, res) {
  try {
    const { matchingWord, onlyUlb } = req.body;
    if (!matchingWord)
      return Response.BadRequest(res, null, "Provide word to match");
    let query = { name: { $regex: matchingWord, $options: "im" } };
    let ulbPromise = Ulb.find(query)
      .populate("state")
      .populate("ulbType")
      // .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let statePromise = State.find(query)
      // .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let searchKeywordPromise = SearchKeyword.find(query)
      // .select({ name: 1, _id: 1 })
      .limit(2)
      .lean();
    let data = await Promise.all([
      ulbPromise,
      statePromise,
      searchKeywordPromise,
    ]);
    if (onlyUlb) {
      data = [
        ...data[0].map((value) => {
          value.type = "ulb";
          return value;
        }),
      ];
    } else {
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
    }
    // if (data.length == 0) return Response.BadRequest(res, null, "No ULB Found");
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
