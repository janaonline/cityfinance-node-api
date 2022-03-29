const ULBLedger = require("../../models/UlbLedger");
const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");
const LineItem = require("../../models/LineItem");
const State = require("../../models/State");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

exports.dataAvailabilityState = async (req, res) => {
  try {
    const { financialYear, stateId, population, ulbType } = req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    let filterCondition = {},
      ulbLedgers;
    if (stateId) filterCondition["state"] = stateId;
    let ulbs = Ulb.find(filterCondition)
      .populate("ulbType", "name")
      .select("_id population ulbType")
      .lean();
    let totalUlbs = Ulb.countDocuments();
    if (financialYear) filterCondition["financialYear"] = financialYear;

    let temp = await Promise.all([ulbs, totalUlbs]);
    ulbs = temp[0];
    totalUlbs = temp[1];
    filterCondition = {
      ulb: ulbs.map((ech) => ObjectId(ech._id)),
    };
    ulbLedgers = await UlbLedger.distinct("ulb", filterCondition);
    // console.log("ulbLedgers", ulbLedgers);

    let responsePayload = {
      data: null,
    };
    if (population)
      responsePayload.data = await createPopulationData(
        JSON.parse(JSON.stringify(ulbs)),
        JSON.parse(JSON.stringify(ulbLedgers)),
        totalUlbs
      );
    else if (ulbType)
      responsePayload.data = await createdUlbTypeData(
        JSON.parse(JSON.stringify(ulbs)),
        JSON.parse(JSON.stringify(ulbLedgers)),
        totalUlbs
      );
    else throw { message: "invalid option passed." };
    req.body.financialYear = financialYear;
    if (stateId) req.body.stateId = stateId;
    const dataAvailResponse = await require("./ownRevenue").dataAvailability(
      req,
      null,
      "nationalDashboard"
    );
    responsePayload.dataAvailability = dataAvailResponse.percent;
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

async function createdUlbTypeData(ulbs, ulbLedgers, totalUlbs) {
  try {
    const ULBType = require("../../models/UlbType");
    let ulbTypes = await ULBType.find({ isActive: true }).select("name");
    let ulbTypeMap = {
      Average: {
        "Number Of ULBs": 0,
        "ULBs With Data": 0,
        "Data Availability Percentage": 0,
        "Urban population percentage": 0,
      },
    };
    // console.log("LEO", ulbTypes);
    ulbTypes.forEach((item) => {
      ulbTypeMap[item._id] = {
        "Number Of ULBs": [],
        "ULBs With Data": [],
        "Data Availability Percentage": [],
        "Urban population percentage": [],
      };
    });
    // console.log(Object.keys(ulbTypeMap));
    for (let x = 0; x < totalUlbs; ++x) {
      const specific = ulbs[x];
      if (
        specific &&
        specific.ulbType &&
        specific.ulbType._id &&
        ulbTypeMap[specific.ulbType._id]
      ) {
        ulbTypeMap[specific.ulbType._id]["Number Of ULBs"].push(specific);
      }
    }
    let sumOfNoOfUlbs = 0,
      sumOfUlbsWithData = 0,
      sumOfDataAvailPercentage = 0,
      sumOfUrbanPopulPercentage = 0;
    for (each in ulbTypeMap) {
      if (each != "Average") {
        const arrr = ulbTypeMap[each]["Number Of ULBs"];
        let matched = 0;
        for (elem of arrr) {
          // console.log("elemId", elem._id, typeof elem._id);
          if (ulbLedgers.indexOf(elem._id) > -1) {
            ++matched;
          }
        }
        ulbTypeMap[each]["Number Of ULBs"] = arrr.length;
        ulbTypeMap[each]["ULBs With Data"] = matched;
        const multiply = matched * 100;
        ulbTypeMap[each]["Data Availability Percentage"] =
          arrr.length == 0 ? 0 : multiply / arrr.length;
        //for average calculation -Begin
        sumOfNoOfUlbs += arrr.length;
        sumOfUlbsWithData += matched;
        sumOfDataAvailPercentage +=
          ulbTypeMap[each]["Data Availability Percentage"];
        //for average calculation -End
      }
    }
    for (each in ulbTypeMap) {
      // console.log("Each", each);
      if (each == "Average") {
        ulbTypeMap["Average"]["Number Of ULBs"] = sumOfNoOfUlbs / 5;
        ulbTypeMap["Average"]["ULBs With Data"] = sumOfUlbsWithData / 5;
        ulbTypeMap["Average"]["Data Availability Percentage"] =
          sumOfDataAvailPercentage / 5;
      } else {
        const multiply = ulbTypeMap[each]["Number Of ULBs"] * 100;
        ulbTypeMap[each]["Urban population percentage"] =
          totalUlbs == 0 ? 0 : multiply / totalUlbs;
        //for average calculation -Begin
        sumOfUrbanPopulPercentage +=
          ulbTypeMap[each]["Urban population percentage"];
        //for average calculation -End
      }
    }
    ulbTypeMap["Average"]["Urban population percentage"] =
      sumOfUrbanPopulPercentage / 5;
    ulbTypes.map((each) => {
      if (ulbTypeMap[each._id]) {
        ulbTypeMap[each.name] = ulbTypeMap[each._id];
        delete ulbTypeMap[each._id];
      }
    });
    let columns = [
        { key: "ULB Type", display_name: "ULB Type" },
        ...Object.keys(ulbTypeMap.Average).map((each) => {
          return mongoose.isValidObjectId(each)
            ? {}
            : { key: each, display_name: each };
        }),
      ],
      rows = Object.keys(ulbTypeMap).map((each) => {
        return { "ULB Type": each, ...ulbTypeMap[each] };
      });
    // console.log(columns);
    return { rows, columns };
  } catch (err) {
    // console.log(err);
    throw err;
  }
}

async function createPopulationData(ulbs, ulbLedgers, totalUlbs) {
  let populationMap = {
    Average: {
      "Number Of ULBs": 0,
      "ULBs With Data": 0,
      "Data Availability Percentage": 0,
      "Urban population percentage": 0,
    },
    "4M+": {
      "Number Of ULBs": [],
      "ULBs With Data": [],
      "Data Availability Percentage": [],
      "Urban population percentage": [],
    },
    "1M-4M": {
      "Number Of ULBs": [],
      "ULBs With Data": [],
      "Data Availability Percentage": [],
      "Urban population percentage": [],
    },
    "500K-1M": {
      "Number Of ULBs": [],
      "ULBs With Data": [],
      "Data Availability Percentage": [],
      "Urban population percentage": [],
    },
    "100K-500K": {
      "Number Of ULBs": [],
      "ULBs With Data": [],
      "Data Availability Percentage": [],
      "Urban population percentage": [],
    },
    "<100K": {
      "Number Of ULBs": [],
      "ULBs With Data": [],
      "Data Availability Percentage": [],
      "Urban population percentage": [],
    },
  };
  const lengthOfUlbs = ulbs.length;
  for (let x = 0; x < lengthOfUlbs; ++x) {
    const specific = ulbs[x];
    if (specific.population < 1e5) {
      populationMap["<100K"]["Number Of ULBs"].push(specific);
    } else if (specific.population >= 1e5 && specific.population <= 5e5) {
      populationMap["100K-500K"]["Number Of ULBs"].push(specific);
    } else if (specific.population >= 5e5 && specific.population <= 1e6) {
      populationMap["500K-1M"]["Number Of ULBs"].push(specific);
    } else if (specific.population >= 1e6 && specific.population <= 4e6) {
      populationMap["1M-4M"]["Number Of ULBs"].push(specific);
    } else if (specific.population > 4e6) {
      populationMap["4M+"]["Number Of ULBs"].push(specific);
    }
  }
  let rows = Object.keys(populationMap),
    sumOfNoOfUlbs = 0,
    sumOfUlbsWithData = 0,
    sumOfDataAvailPercentage = 0,
    sumOfUrbanPopulPercentage = 0;
  for (each of rows) {
    if (each != "Average") {
      const arrr = populationMap[each]["Number Of ULBs"];
      let matched = 0;
      for (elem of arrr)
        if (ulbLedgers.indexOf(elem._id) > -1) {
          ++matched;
        }
      populationMap[each]["Number Of ULBs"] = arrr.length;
      populationMap[each]["ULBs With Data"] = matched;
      const multiply = matched * 100;
      populationMap[each]["Data Availability Percentage"] =
        arrr.length == 0 ? 0 : multiply / arrr.length;
      //for average calculation -Begin
      sumOfNoOfUlbs += arrr.length;
      sumOfUlbsWithData += matched;
      sumOfDataAvailPercentage +=
        populationMap[each]["Data Availability Percentage"];
      //for average calculation -End
    }
  }

  for (each of rows) {
    if (each == "Average") {
      populationMap["Average"]["Number Of ULBs"] = sumOfNoOfUlbs / 5;
      populationMap["Average"]["ULBs With Data"] = sumOfUlbsWithData / 5;
      populationMap["Average"]["Data Availability Percentage"] =
        sumOfDataAvailPercentage / 5;
    } else {
      const multiply = populationMap[each]["Number Of ULBs"] * 100;
      populationMap[each]["Urban population percentage"] =
        totalUlbs == 0 ? 0 : multiply / totalUlbs;
      //for average calculation -Begin
      sumOfUrbanPopulPercentage +=
        populationMap[each]["Urban population percentage"];
      //for average calculation -End
    }
  }
  populationMap["Average"]["Urban population percentage"] =
    sumOfUrbanPopulPercentage / 5;
  let columns = [
      { key: "ULB Type", display_name: "ULB Type" },
      ...Object.keys(populationMap.Average).map((each) => {
        return mongoose.isValidObjectId(each)
          ? {}
          : { key: each, display_name: each };
      }),
    ],
    theRows = Object.keys(populationMap).map((each) => {
      return { "ULB Type": each, ...populationMap[each] };
    });
  return { columns, rows: theRows };
}
exports.nationalDashRevenue = async (req, res) => {
  try {
    let { financialYear, type, stateId, formType, visualType, getQuery } =
      req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalRevenue";
    formType = formType ? formType : "populationCategory";
    visualType = visualType ? visualType : "table";
    const { nationalDashRevenuePipeline } = require("../../util/aggregation");
    let responsePayload = { data: null };
    let ulbs = await Ulb.find(stateId ? { state: stateId } : {}).select("_id");
    let lineItems = await LineItem.find({ headOfAccount: "Revenue" }).select(
      "_id"
    );
    ulbs = ulbs.map((each) => each._id);
    lineItems = lineItems.map((each) => each._id);
    if (getQuery)
      return res
        .status(200)
        .json(
          nationalDashRevenuePipeline(
            financialYear,
            stateId,
            ulbs,
            lineItems,
            type,
            formType
          )
        );
    const ulbLeds = await UlbLedger.aggregate(
      nationalDashRevenuePipeline(
        financialYear,
        stateId,
        ulbs,
        lineItems,
        type,
        formType
      )
    );
    responsePayload.data = ulbLeds;
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: true, message: err.message });
  }
};
