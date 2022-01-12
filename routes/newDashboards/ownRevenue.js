const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const Sate = require("../../models/State");
const Response = require("../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../service/redis");

const revenueList = ["11001", "130", "140", "150", "180", "110"];
const ObjectIdOfRevenueList = [
  "5dd10c2485c951b54ec1d74b",
  "5dd10c2285c951b54ec1d737",
  "5dd10c2685c951b54ec1d762",
  "5dd10c2485c951b54ec1d74a",
  "5dd10c2885c951b54ec1d77e",
  "5dd10c2385c951b54ec1d748",
];

const dataAvailability = async (req, res) => {
  try {
    const { financialYear, propertyTax, getQuery } = req.body;

    if (!Array.isArray(financialYear)) {
      return Response.BadRequest(
        res,
        null,
        "financialYear must be array with value"
      );
    }

    let matchQuery = {
      financialYear: { $in: financialYear },
    };

    if (propertyTax) {
      Object.assign(matchQuery, {
        lineItem: ObjectId("5dd10c2285c951b54ec1d737"),
      });
    }

    if (getQuery) return Response.OK(res, matchQuery);

    let data = UlbLedger.distinct("ulb", matchQuery).count();
    let ulbCount = Ulb.find().count();

    let temp = await Promise.all([data, ulbCount]);
    data = temp[0];
    ulbCount = temp[1];

    data = ((ulbCount - data) / ulbCount) * 100;

    return Response.OK(res, { percent: data });
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

const chartData = async (req, res) => {
  try {
    const { getQuery, financialYear, stateIds, ulbIds, ulbTypeIds } = req.body;

    if (!financialYear || !Array.isArray(financialYear))
      return Response.BadRequest(res, null, "financialYear as array required");

    let query = {
      financialYear: { $in: financialYear },
    };

    if (ulbIds) {
      if (!Array.isArray(ulbIds)) ulbIds = [ulbIds];
      Object.assign(query, { ulb: { $in: ulbIds } });
    }

    let ulbMatch = getUlbMatchQuery(stateIds, ulbTypeIds);
    let lineItemMatch = { code: { $in: revenueList } };

    let data;

    let temp = {
      ...query,
      ...ulbMatch,
      ...lineItemMatch,
    };
    if (getQuery) return Response.OK(res, temp);

    let redisKey = JSON.stringify(temp) + "OwnRevenue";

    data = await Redis.getDataPromise(redisKey);
    if (!data) {
      data = await UlbLedger.find(query)
        .populate({
          path: "ulb",
          match: ulbMatch,
        })
        .populate({ path: "lineItem", match: lineItemMatch })
        .lean();
      data = data.filter((value) => value.lineItem && value.ulb);
      data = parseData(data);
      Redis.set(redisKey, JSON.stringify(data));
    } else {
      data = JSON.parse(data);
    }

    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

function parseData(data) {
  let ulbCategory = data.reduce(
    (ulbCategoryMap, value) => {
      if (value.ulb.population < 100000) {
        ulbCategoryMap["<100K"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["<100K"].count += 1;
      } else if (100000 < value.ulb.population < 500000) {
        ulbCategoryMap["100K-500K"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["100K-500K"].count += 1;
      } else if (500000 < value.ulb.population < 1000000) {
        ulbCategoryMap["500K-1M"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["500K-1M"].count += 1;
      } else if (1000000 < value.ulb.population < 4000000) {
        ulbCategoryMap["1M-4M"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["1M-4M"].count += 1;
      } else {
        ulbCategoryMap["4M+"].amount += value.amount;
        if (!ulbCategoryMap.temp[value.ulb._id])
          ulbCategoryMap["4M+"].count += 1;
      }
      ulbCategoryMap.temp[value.ulb._id] = 1;

      return ulbCategoryMap;
    },
    {
      ["4M+"]: { amount: 0, count: 0 },
      ["1M-4M"]: { amount: 0, count: 0 },
      ["500K-1M"]: { amount: 0, count: 0 },
      ["100K-500K"]: { amount: 0, count: 0 },
      ["<100K"]: { amount: 0, count: 0 },
      temp: {},
    }
  );
  delete ulbCategory.temp;

  let chartData = data.reduce((financialYearMap, value) => {
    let valueInMap = financialYearMap[value.financialYear];
    if (valueInMap) {
      let lineItemInMap = valueInMap[value.lineItem.name];
      valueInMap.total += value.amount;
      if (lineItemInMap) {
        lineItemInMap += value.amount;
      } else {
        Object.assign(valueInMap, {
          [value.lineItem.name]: value.amount,
        });
      }
    } else {
      Object.assign(financialYearMap, {
        [value.financialYear]: {
          [value.lineItem.name]: value.amount,
          total: value.amount,
        },
      });
    }
    return financialYearMap;
  }, {});

  let population = data.reduce(
    (ulbMap, value) => {
      if (!ulbMap[value.ulb._id]) {
        ulbMap.total += value.ulb.population;
      }
      return ulbMap;
    },
    { total: 0 }
  );

  return { ...chartData, population, ulbCategory };
}

function getUlbMatchQuery(stateIds, ulbTypeIds) {
  ulbMatch = {};
  if (stateIds) {
    if (!Array.isArray(stateIds)) stateIds = [stateIds];
    Object.assign(ulbMatch, {
      state: { $in: stateIds.map((value) => ObjectId(value)) },
    });
  }
  if (ulbTypeIds) {
    if (!Array.isArray(ulbTypeIds)) ulbTypeIds = [ulbTypeIds];
    Object.assign(ulbMatch, {
      ulbType: { $in: ulbIds.map((value) => ObjectId(value)) },
    });
  }
  return ulbMatch;
}

const topPerForming = async (req, res) => {
  try {
    const { revenueId, stateIds, getQuery } = req.body;

    if (!revenueId || !stateIds || !Array.isArray(stateIds))
      return Response.BadRequest(res, null, "wrong revenueIds or stateIds");

    let query = [
      {
        $match: {
          lineItem: ObjectId(revenueId),
        },
      },
      {
        $lookup: {
          from: "ulbs",
          localField: "ulb",
          foreignField: "_id",
          as: "ulb",
        },
      },
      {
        $unwind: "$ulb",
      },
      {
        $match: {
          $expr: {
            $in: ["$ulb.state", stateIds.map((value) => ObjectId(value))],
          },
        },
      },
      {
        $group: {
          _id: "$ulb.state",
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 10 },
    ];

    if (getQuery) return Response.OK(res, query);

    let data = await UlbLedger.aggregate(query);
    if (data.length == 0)
      return Response.BadRequest(res, null, "No data Found");

    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports = {
  dataAvailability,
  chartData,
  topPerForming,
};
