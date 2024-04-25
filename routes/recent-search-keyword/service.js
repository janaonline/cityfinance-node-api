const recentSearchKeywords = require("../../models/recentSearchKeywords");
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");
const SearchKeyword = require("../../models/searchKeywords");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");
const catchAsync = require('../../util/catchAsync')
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
      .sort({ createdAt: -1 })
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

const search = catchAsync(async (req, res) => {
  try {
    const { matchingWord, onlyUlb } = req.body;
    const { type, state } = req.query

    if (!matchingWord)
      return Response.BadRequest(res, null, "Provide word to match");

    if (type && type == 'state') {
      let query = { name: { $regex: `^${matchingWord[type]}`, $options: "im" } };
      let statePromise = await State.find(query)
        .limit(10)
        .lean();
      let data = []
      if (statePromise.length > 0) {
        data =
          statePromise.map((value) => {
            value.type = "state";
            return value;
          })
      }



      return Response.OK(res, data);
    } else if (type && type == 'ulb') {
      let stateData
      // let query = { name: { $regex: `^${matchingWord}`, $options: "i" } }
      let query = { 
        $or: [ {name : { $regex: `${matchingWord}`, $options: 'im' }}, { keywords: { $regex: `${matchingWord}`, $options: 'im' } } ]
      };
      if (matchingWord.hasOwnProperty("contentType")) {  // filter add chnage suresh
        query = { name: { $regex: `^${matchingWord[type]}`, $options: "i" } };
      }
      if (state) {
        if (state && ObjectId.isValid(state)) {
          Object.assign(query, { state: ObjectId(state) })
        } else {
          stateData = await State.findOne({ code: state }).lean()
          Object.assign(query, { state: ObjectId(stateData._id) })
        }
      }
      let ulbPromise = await Ulb.find(query)
        .populate("state")
        .populate("ulbType")
        .limit(10)
        .sort({ name: 1 })
        .lean();
      let data =
        ulbPromise.map((value) => {
          value.name = toTitleCase(value.name)
          value.type = "ulb";
          return value;
        })


      return Response.OK(res, data);
    }
    let query = { 
      // name: { $regex: `${matchingWord}`, $options: "im" } 
      $or: [ {name : { $regex: `${matchingWord}`, $options: 'im' }}, { keywords: { $regex: `${matchingWord}`, $options: 'im' } } ]
    };
    
    let ulbPromise = Ulb.find(query)
      .populate("state")
      .populate("ulbType")
      .limit(8)
      .sort({ name: 1 })
      .lean();

    let statePromise = State.find(query)
      // .select({ name: 1, _id: 1 })
      .limit(5)
      .sort({ name: 1 })
      .lean();
    let searchKeywordPromise = SearchKeyword.find(query)
      // .select({ name: 1, _id: 1 })
      .limit(5)
      .sort({ name: 1 })
      .lean();
    let data = await Promise.all([
      ulbPromise,
      statePromise,
      searchKeywordPromise,
    ]);
    if (onlyUlb) {
      data = [
        ...data[0].map((value) => {
          value.name = toTitleCase(value.name)
          value.type = "ulb";
          return value;
        }),
      ];
    } else {
      data = [
        ...data[0].map((value) => {
          value.name = toTitleCase(value.name)
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
})

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

module.exports = {
  addKeyword,
  getAllKeyword,
  search,
};
