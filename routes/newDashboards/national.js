const Ulb = require("../../models/Ulb");
const UlbType = require("../../models/UlbType");
const UlbLedger = require("../../models/UlbLedger");
const LineItem = require("../../models/LineItem");
const State = require("../../models/State");
const mongoose = require("mongoose");
const Indicators = require('../../models/indicators')
const { response, common } = require("../../service");
const {
  sendProfileUpdateStatusEmail,
} = require("../../service/email-template");
const ObjectId = mongoose.Types.ObjectId;
const ExcelJS = require("exceljs");
const { relativeTimeRounding } = require("moment");
const fs = require("fs");
const Redis = require("../../service/redis");
const { query } = require("express");

exports.dataAvailabilityState = async (req, res) => {
  try {
    const { financialYear, stateId, population, ulbType, csv, value } = req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    let filterCondition = {},
      ulbLedgers;
    filterCondition['isActive'] = true
    if (stateId) {filterCondition["state"] = stateId};

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
      ulb: { $in: ulbs.map((ech) => ObjectId(ech._id)) },
    };
    if(value == 'slb'){
      Object.assign(filterCondition, {year: financialYear})
      ulbLedgers = await Indicators.distinct("ulb", filterCondition).lean();
    }else{
      Object.assign(filterCondition, {financialYear: financialYear})
        ulbLedgers = await UlbLedger.distinct("ulb", filterCondition).lean();
    }
  



    let responsePayload = {
      data: null,
    };

    if (population)
      responsePayload.data = await createPopulationData(
        JSON.parse(JSON.stringify(ulbs)),
        totalUlbs,
        JSON.parse(JSON.stringify(ulbLedgers))
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
    responsePayload.dataAvailability = Math.round(dataAvailResponse.percent);
    if (csv) {
      return getExcel(req, res, responsePayload.data);
    }
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
        numberOfULBs: 0,
        ulbsWithData: 0,
        DataAvailPercentage: 0,
        urbanPopulationPercentage: 0,
      },
    };
    ulbTypes.forEach((item) => {
      ulbTypeMap[item._id] = {
        numberOfULBs: [],
        ulbsWithData: [],
        DataAvailPercentage: [],
        urbanPopulationPercentage: [],
      };
    });
    for (let x = 0; x < totalUlbs; ++x) {
      const specific = ulbs[x];
      if (
        specific &&
        specific.ulbType &&
        specific.ulbType._id &&
        ulbTypeMap[specific.ulbType._id]
      ) {
        ulbTypeMap[specific.ulbType._id]["numberOfULBs"].push(specific);
      }
    }
    let sumOfNoOfUlbs = 0,
      sumOfUlbsWithData = 0,
      sumOfDataAvailPercentage = 0,
      sumOfUrbanPopulPercentage = 0;
    for (each in ulbTypeMap) {
      if (each != "Average") {
        const arrr = ulbTypeMap[each]["numberOfULBs"];
        let matched = 0;
        for (elem of arrr) {
          if (ulbLedgers.indexOf(elem._id) > -1) {
            ++matched;
          }
        }
        ulbTypeMap[each]["numberOfULBs"] = arrr.length;
        ulbTypeMap[each]["ulbsWithData"] = matched;
        const multiply = matched * 100;
        ulbTypeMap[each]["DataAvailPercentage"] =
          arrr.length == 0 ? 0 : multiply / arrr.length;
        sumOfNoOfUlbs += arrr.length;
        sumOfUlbsWithData += matched;
        sumOfDataAvailPercentage += ulbTypeMap[each]["DataAvailPercentage"];
      }
    }
    for (each in ulbTypeMap) {
      if (each == "Average") {
        ulbTypeMap["Average"]["numberOfULBs"] = sumOfNoOfUlbs / 5;
        ulbTypeMap["Average"]["ulbsWithData"] = sumOfUlbsWithData / 5;
        ulbTypeMap["Average"]["DataAvailPercentage"] =
          sumOfDataAvailPercentage / 5;
      } else {
        const multiply = ulbTypeMap[each]["numberOfULBs"] * 100;
        ulbTypeMap[each]["urbanPopulationPercentage"] =
          totalUlbs == 0 ? 0 : multiply / totalUlbs;
        sumOfUrbanPopulPercentage +=
          ulbTypeMap[each]["urbanPopulationPercentage"];
      }
    }
    ulbTypeMap["Average"]["urbanPopulationPercentage"] =
      sumOfUrbanPopulPercentage / 5;
    ulbTypes.map((each) => {
      if (ulbTypeMap[each._id]) {
        ulbTypeMap[each.name] = ulbTypeMap[each._id];
        delete ulbTypeMap[each._id];
      }
    });
    let displayNameMapper = {
        numberOfULBs: "Number Of ULBs",
        ulbsWithData: "ULBs With Data",
        DataAvailPercentage: "Data Availability Percentage",
        urbanPopulationPercentage: "Urban Population Percentage",
      },
      columns = [
        { key: "ulbType", display_name: "ULB Type" },
        ...Object.keys(ulbTypeMap.Average).map((each) => {
          return { key: each, display_name: displayNameMapper[each] };
        }),
      ],
      rows = Object.keys(ulbTypeMap).map((each) => {
        let output = { ulbType: each };
        for (key in ulbTypeMap[each]) {
          output[key] = Math.round(ulbTypeMap[each][key]);
          if (key.includes("Percentage")) {
            output[key] += " %";
          }
        }
        return output;
      });
    return { rows, columns };
  } catch (err) {
    throw err;
  }
}

async function createPopulationData(ulbs, totalUlbs, ulbLedgers) {
  let populationMap = {
    Average: {
      numberOfULBs: 0,
      ulbsWithData: 0,
      DataAvailPercentage: 0,
      urbanPopulationPercentage: 0,
    },
    "4 Million+": {
      numberOfULBs: [],
      ulbsWithData: [],
      DataAvailPercentage: [],
      urbanPopulationPercentage: [],
    },
    "1 Million - 4 Million": {
      numberOfULBs: [],
      ulbsWithData: [],
      DataAvailPercentage: [],
      urbanPopulationPercentage: [],
    },
    "500 Thousand - 1 Million": {
      numberOfULBs: [],
      ulbsWithData: [],
      DataAvailPercentage: [],
      urbanPopulationPercentage: [],
    },
    "100 Thousand - 500 Thousand": {
      numberOfULBs: [],
      ulbsWithData: [],
      DataAvailPercentage: [],
      urbanPopulationPercentage: [],
    },
    "< 100 Thousand": {
      numberOfULBs: [],
      ulbsWithData: [],
      DataAvailPercentage: [],
      urbanPopulationPercentage: [],
    },
  };
  const lengthOfUlbs = ulbs.length;
  let aa = 0;
  for (let x = 0; x < lengthOfUlbs; ++x) {
    const specific = ulbs[x];
    if (specific.population < 1e5 && specific.population != null) {
      populationMap["< 100 Thousand"]["numberOfULBs"].push(specific._id);
    } else if (
      specific.population >= 1e5 &&
      specific.population <= 5e5 &&
      specific.population != null
    ) {
      populationMap["100 Thousand - 500 Thousand"]["numberOfULBs"].push(
        specific
      );
    } else if (
      specific.population >= 5e5 &&
      specific.population <= 1e6 &&
      specific.population != null
    ) {
      populationMap["500 Thousand - 1 Million"]["numberOfULBs"].push(specific);
    } else if (
      specific.population >= 1e6 &&
      specific.population <= 4e6 &&
      specific.population != null
    ) {
      populationMap["1 Million - 4 Million"]["numberOfULBs"].push(specific);
    } else if (specific.population > 4e6 && specific.population != null) {
      populationMap["4 Million+"]["numberOfULBs"].push(specific);
    }
  }

  let rows = Object.keys(populationMap),
    sumOfNoOfUlbs = 0,
    sumOfUlbsWithData = 0,
    sumOfDataAvailPercentage = 0,
    sumOfUrbanPopulPercentage = 0;
  for (each of rows) {
    if (each != "Average") {
      const arrr = populationMap[each]["numberOfULBs"];
      let matched = 0 ;
      for (elem of arrr) {
        if (ulbLedgers.indexOf(elem._id) > -1) {
          ++matched;
        }
      }
      // (
      //   await UlbLedger.distinct("ulb", {
      //     financialYear,
      //     ulb: { $in: populationMap[each].numberOfULBs },
      //   }).lean()
      // ).length;
      populationMap[each]["numberOfULBs"] = arrr.length;
      populationMap[each]["ulbsWithData"] = matched;
      const multiply = matched * 100;
      populationMap[each]["DataAvailPercentage"] =
        arrr.length == 0 ? 0 : multiply / arrr.length;
      //for average calculation -Begin
      sumOfNoOfUlbs += arrr.length;
      sumOfUlbsWithData += matched;
      sumOfDataAvailPercentage += populationMap[each]["DataAvailPercentage"];
      //for average calculation -End
    }
  }

  for (each of rows) {
    if (each == "Average") {
      populationMap["Average"]["numberOfULBs"] = sumOfNoOfUlbs / 5;
      populationMap["Average"]["ulbsWithData"] = sumOfUlbsWithData / 5;
      populationMap["Average"]["DataAvailPercentage"] =
        sumOfDataAvailPercentage / 5;
    } else {
      const multiply = populationMap[each]["numberOfULBs"] * 100;
      populationMap[each]["urbanPopulationPercentage"] =
        totalUlbs == 0 ? 0 : multiply / totalUlbs;
      //for average calculation -Begin
      sumOfUrbanPopulPercentage +=
        populationMap[each]["urbanPopulationPercentage"];
      //for average calculation -End
    }
  }
  populationMap["Average"]["urbanPopulationPercentage"] =
    sumOfUrbanPopulPercentage / 5;
  let displayNameMapper = {
      numberOfULBs: "Number Of ULBs",
      ulbsWithData: "ULBs With Data",
      DataAvailPercentage: "Data Availability Percentage",
      urbanPopulationPercentage: "Urban Population Percentage",
    },
    columns = [
      { key: "ulbType", display_name: "Population Category" },
      ...Object.keys(populationMap.Average).map((each) => {
        return { key: each, display_name: displayNameMapper[each] };
      }),
    ],
    theRows = Object.keys(populationMap).map((each) => {
      let output = { ulbType: each };
      for (key in populationMap[each]) {
        output[key] = Math.round(populationMap[each][key]);
        if (key.includes("Percentage")) {
          output[key] += " %";
        }
      }
      return output;
    });
  return { columns, rows: theRows };
}

exports.nationalDashRevenue = async (req, res) => {
  try {
    let { financialYear, type, stateId, formType, visualType, getQuery, csv } =
      req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalRevenue";
    formType = formType ? formType : "populationCategory";
    visualType = visualType ? visualType : "table";
    const { nationalDashRevenuePipeline } = require("../../util/aggregation");
    let responsePayload = { data: null };
    const HashTable = new Map();
    let ulbs = Ulb.find(stateId ? { state: stateId } : {}).select({
      _id: 1,
      population: 1,
      ulbType: 1,
    });
    let lineItems = LineItem.find({ headOfAccount: "Revenue" }).select("_id");
    let promiseData = await Promise.all([ulbs, lineItems]);
    ulbs = promiseData[0];
    lineItems = promiseData[1];
    ulbs = ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
      setPopCatValInHash(HashTable, each);
      return each._id;
    });
    lineItems = lineItems.map((each) => each._id);
    let query = nationalDashRevenuePipeline(
      financialYear,
      stateId,
      ulbs,
      lineItems,
      type,
      formType
    );
    if (getQuery) return res.status(200).json(query);

    let redisKey = JSON.stringify(query);
    let redisData = await Redis.getDataPromise(redisKey);
    let ulbLeds;
    if (!redisData) {
      ulbLeds = await UlbLedger.aggregate(query);
      Redis.set(redisKey, JSON.stringify(ulbLeds));
    } else {
      ulbLeds = JSON.parse(redisData);
    }

    let populationMap = {
      Average: {
        revenue: 0,
        revenuePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "< 100 Thousand": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "100 Thousand - 500 Thousand": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },

      "500 Thousand - 1 Million": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "1 Million - 4 Million": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "4 Million+": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let ulbTypeMap = {
      Average: {
        revenue: 0,
        revenuePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "Municipal Corporation": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      Municipality: {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "Town Panchayat": {
        revenue: 0,
        revenuePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let sumOfRevenue = 0,
      sumOfRevPerCapita = 0,
      sumOfDataAval = 0;
    if (type == "totalRevenue") {
      if (ulbLeds.length) {
        const keys = Object.keys(ulbLeds[0]);
        for (key of keys) {
          //O(5) time complexity
          let seenUlbs = 0,
            obj = ulbLeds[0][key];
          if (formType == "ulbType") {
            ulbTypeMap[key] = obj;
          } else if (formType == "populationCategory") {
            populationMap[key] = obj;
          }
          for (each of obj["set"]) {
            if (HashTable.get(each.toString())) ++seenUlbs;
          }
          sumOfRevenue += obj["revenue"];
          sumOfRevPerCapita += obj["revenuePerCapita"];
          delete obj["set"];
          obj["DataAvailPercentage"] = (seenUlbs / HashTable[key]) * 100;
          sumOfDataAval += obj["DataAvailPercentage"];
        }
      }
      if (formType == "ulbType") {
        ulbTypeMap["Average"]["revenue"] = sumOfRevenue / 5;
        ulbTypeMap["Average"]["revenuePerCapita"] = sumOfRevPerCapita / 5;
        ulbTypeMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = ulbTypeMap;
      } else if (formType == "populationCategory") {
        populationMap["Average"]["revenue"] = sumOfRevenue / 5;
        populationMap["Average"]["revenuePerCapita"] = sumOfRevPerCapita / 5;
        populationMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = populationMap;
      }
      let displayNameMapper = {
          revenue: "Revenue (in Cr)",
          revenuePerCapita: "Revenue Per Capita (in Rs.)",
          DataAvailPercentage: "Data Availability Percentage",
        },
        columns = [
          {
            key: "ulb_pop_category",
            display_name:
              formType == "populationCategory"
                ? "ULB Population Category"
                : "ULB Type",
          },
          ...Object.keys(populationMap["Average"]).map((each) => {
            return { key: each, display_name: displayNameMapper[each] };
          }),
        ],
        rows = [
          ...Object.keys(responsePayload.data).map((each) => {
            let output = { ulb_pop_category: each };
            for (x in responsePayload.data[each]) {
              output[x] = Math.round(responsePayload.data[each][x]);
              if (x.includes("Percentage")) {
                output[x] += " %";
              }
            }
            return output;
          }),
        ];
      responsePayload.data = { rows, columns };
    } else if (type == "revenueMix") {
      let f1 = true,
        f2 = true;
      let colourArray = ulbLeds[0].national
        .map((val) => {
          if (ownRevenueLineItems.includes(val.lineName)) {
            if (f1) {
              f1 = false;
              return { colour: "#25c7ce", lineitem: "Own Revenue" };
            } else return f1;
          } else if (otherReceiptsLineItem.includes(val.lineName)) {
            if (f2) {
              f2 = false;
              return { colour: "#00ff80", lineitem: "Other Receipts" };
            } else {
              return f2;
            }
          }
          return { colour: val.colour, lineitem: val.lineName };
        })
        .filter(Boolean);
      if (formType == "ulbType") {
        responsePayload.data = ulbLeds[0];
        let nationalArr = responsePayload.data.national,
          individualArr = responsePayload.data.individual,
           stateArr = responsePayload.data?.state;
        let lineItemMap = new Map(),
          ulbTypeMap = new Map();
        const lineItems = await LineItem.find().lean();
        const UlbTypes = await UlbType.find().lean();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        UlbTypes.map((each) => {
          ulbTypeMap.set(each._id.toString(), each.name);
          return each;
        });
        let national_Format = {}, state_Format = {}
          individual_Format = {
            Municipality: {},
            "Municipal Corporation": {},
            "Town Panchayat": {},
          };
        nationalArr.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (ownRevenueLineItems.includes(lineName)) {
            lineName = "Own Revenue";
          }
          if (otherReceiptsLineItem.includes(lineName)) {
            lineName = "Other Receipts";
          }
          if (national_Format[lineName] > 1) {
            national_Format[lineName] += each.amount;
          } else national_Format[lineName] = each.amount;
          return each;
        });
        stateArr.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (ownRevenueLineItems.includes(lineName)) {
            lineName = "Own Revenue";
          }
          if (otherReceiptsLineItem.includes(lineName)) {
            lineName = "Other Receipts";
          }
          if (state_Format[lineName] > 1) {
            state_Format[lineName] += each.amount;
          } else state_Format[lineName] = each.amount;
          return each;
        });
        individualArr.map((each, idx) => {
          const ulbTypeName = ulbTypeMap.get(each._id.toString());
          each.data.map((ev) => {
            let lineName = lineItemMap.get(ev.lineItem.toString());
            if (ownRevenueLineItems.includes(lineName)) {
              lineName = "Own Revenue";
            }
            if (otherReceiptsLineItem.includes(lineName)) {
              lineName = "Other Receipts";
            }
            if (individual_Format[ulbTypeName][lineName] > 1)
              individual_Format[ulbTypeName][lineName] += ev.amount;
            else individual_Format[ulbTypeName][lineName] = ev.amount;
          });
        });
        responsePayload.data.national = national_Format;
        responsePayload.data.individual = individual_Format;
        responsePayload.data.state = state_Format;
      } else {
        let lineItemMap = new Map();
        const lineItems = await LineItem.find();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        let populKeys = ["<100K", "100K-500K", "500K-1M", "1M-4M", "4M+"];
        responsePayload.data = ulbLeds[0];
        let dataMapper = {
          "<100K": {},
          "100K-500K": {},
          "500K-1M": {},
          "1M-4M": {},
          "4M+": {},
        };
        responsePayload.data.individual.map((each) => {
          let currLineItem = lineItemMap.get(each._id.lineItem.toString());
          if (ownRevenueLineItems.includes(currLineItem)) {
            currLineItem = "Own Revenue";
          }
          if (otherReceiptsLineItem.includes(currLineItem)) {
            currLineItem = "Other Receipts";
          }
          populKeys.map((key) => {
            if (!dataMapper[key][currLineItem])
              dataMapper[key][currLineItem] = 0;
            dataMapper[key][currLineItem] += each[key];
          });
        });
        responsePayload.data.individual = dataMapper;
        let national_Format = {};
        responsePayload.data.national.map((each) => {
          let currLineItem = lineItemMap.get(each._id.lineItem.toString());
          if (ownRevenueLineItems.includes(currLineItem)) {
            currLineItem = "Own Revenue";
          }
          if (otherReceiptsLineItem.includes(currLineItem)) {
            currLineItem = "Other Receipts";
          }
          if (national_Format[currLineItem] > 1) {
            national_Format[currLineItem] += each.amount;
          } else {
            national_Format[currLineItem] = each.amount;
          }
          return each;
        });
        responsePayload.data.national = national_Format;
        let state_Format = {};
        responsePayload.data.state.map((each) => {
          let currLineItem = lineItemMap.get(each._id.lineItem.toString());
          if (ownRevenueLineItems.includes(currLineItem)) {
            currLineItem = "Own Revenue";
          }
          if (otherReceiptsLineItem.includes(currLineItem)) {
            currLineItem = "Other Receipts";
          }
          if (state_Format[currLineItem] > 1) {
            state_Format[currLineItem] += each.amount;
          } else {
            state_Format[currLineItem] = each.amount;
          }
          return each;
        });
        responsePayload.data.state = state_Format;
      }
      if (csv)
        await specifiedRowColumn(
          req.query.formType ? req.query.formType : "INR Cr.",
          responsePayload.data
        );
      responsePayload.data.colourArray = colourArray;
    }
    if (csv) {
      return getExcel(req, res, responsePayload.data);
    }
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: true, message: err.message });
  }
};

exports.nationalDashExpenditure = async (req, res) => {
  try {
    let responsePayload = { data: null };
    let { financialYear, type, formType, visualType, getQuery, stateId, csv } =
      req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalExpenditure";
    formType = formType ? formType : "populationCategory";
    const { nationalDashExpensePipeline } = require("../../util/aggregation");
    const HashTable = new Map();
    let ulbs = Ulb.find(stateId ? { state: stateId } : {}).select({
      _id: 1,
      population: 1,
      ulbType: 1,
    });
    let lineItemsExp = LineItem.find(
      type == "deficitOrSurplus"
        ? { headOfAccount: { $in: ["Expense", "Revenue"] } }
        : { headOfAccount: "Expense" }
    ).select("_id");
    let promiseData = await Promise.all([ulbs, lineItemsExp]);
    ulbs = promiseData[0];
    lineItemsExp = promiseData[1];
    ulbs = ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
      setPopCatValInHash(HashTable, each);
      return each._id;
    });
    lineItemsExp = lineItemsExp.map((each) => each._id);
    const query = nationalDashExpensePipeline(
      financialYear,
      stateId,
      type,
      formType,
      lineItemsExp,
      ulbs
    );
    if (getQuery) return res.status(200).json(query);
    let redisKey = JSON.stringify(query);
    let redisData = await Redis.getDataPromise(redisKey);
    let ulbLeds;
    if (!redisData) {
      ulbLeds = await UlbLedger.aggregate(query);
      Redis.set(redisKey, JSON.stringify(ulbLeds));
    } else {
      ulbLeds = JSON.parse(redisData);
    }
    // return res.json(ulbLeds);
    let populationMap = {
      Average: {
        expenditure: 0,
        expenditurePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "< 100 Thousand": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
      "100 Thousand - 500 Thousand": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },

      "500 Thousand - 1 Million": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
      "1 Million - 4 Million": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
      "4 Million+": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let ulbTypeMap = {
      Average: {
        expenditure: 0,
        expenditurePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "Municipal Corporation": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
      Municipality: {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
      "Town Panchayat": {
        expenditure: 0,
        expenditurePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let sumOfExp = 0,
      sumOfExpPerCapita = 0,
      sumOfDataAval = 0;
    if (type == "totalExpenditure") {
      if (ulbLeds.length) {
        const keys = Object.keys(ulbLeds[0]);
        for (key of keys) {
          //O(5) time complexity
          let seenUlbs = 0,
            obj = ulbLeds[0][key];
          if (formType == "ulbType") {
            ulbTypeMap[key] = obj;
          } else if (formType == "populationCategory") {
            populationMap[key] = obj;
          }
          for (each of obj["set"]) {
            if (HashTable.get(each.toString())) ++seenUlbs;
          }
          sumOfExp += obj["expenditure"];
          sumOfExpPerCapita += obj["expenditurePerCapita"];
          delete obj["set"];
          obj["DataAvailPercentage"] = (seenUlbs / HashTable[key]) * 100;
          sumOfDataAval += obj["DataAvailPercentage"];
        }
      }
      if (formType == "ulbType") {
        ulbTypeMap["Average"]["expenditure"] = sumOfExp / 5;
        ulbTypeMap["Average"]["expenditurePerCapita"] = sumOfExpPerCapita / 5;
        ulbTypeMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = ulbTypeMap;
      } else if (formType == "populationCategory") {
        populationMap["Average"]["expenditure"] = sumOfExp / 5;
        populationMap["Average"]["expenditurePerCapita"] =
          sumOfExpPerCapita / 5;
        populationMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = populationMap;
      }
      let displayNameMapper = {
          expenditure: "Expenditure (in Cr)",
          expenditurePerCapita: "Expenditure Per Capita (in Rs.)",
          DataAvailPercentage: "Data Availability Percentage",
        },
        columns = [
          {
            key: "ulb_pop_category",
            display_name:
              formType == "populationCategory"
                ? "ULB Population Category"
                : "ULB Type",
          },
          ...Object.keys(populationMap["Average"]).map((each) => {
            return { key: each, display_name: displayNameMapper[each] };
          }),
        ],
        rows = [
          ...Object.keys(responsePayload.data).map((each) => {
            let output = { ulb_pop_category: each };
            for (x in responsePayload.data[each]) {
              output[x] = Math.round(responsePayload.data[each][x]);
              if (x.includes("Percentage")) {
                output[x] += " %";
              }
            }
            return output;
          }),
        ];
      responsePayload.data = { rows, columns };
    } else if (type == "expenditureMix") {
      let flag = false;
      let colourArray = ulbLeds[0].national
        .map((val) => {
          let lineName = val.lineName;
          if (!includeInExpenditure.includes(lineName)) {
            if (!flag) {
              flag = true;
              return { colour: "#0FA386", lineitem: "Other Expenditure" };
            } else {
              return false;
            }
          }
          return { colour: val.colour, lineitem: lineName };
        })
        .filter(Boolean);
      if (formType == "ulbType") {
        responsePayload.data = ulbLeds[0];
        let nationalArr = responsePayload.data.national,
          individualArr = responsePayload.data.individual,
          stateArr = responsePayload.data?.state ;
        let lineItemMap = new Map(),
          ulbTypeMap = new Map();
        const lineItems = await LineItem.find().lean();
        const UlbTypes = await UlbType.find().lean();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        UlbTypes.map((each) => {
          ulbTypeMap.set(each._id.toString(), each.name);
          return each;
        });
        let national_Format = {},  state_Format = {},
          individual_Format = {
            "Municipality": {},
            "Municipal Corporation": {},
            "Town Panchayat": {},
          };
        nationalArr.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (!includeInExpenditure.includes(lineName)) {
            lineName = "Other Expenditure";
          }
          if (national_Format[lineName] > 1) {
            national_Format[lineName] += each.amount;
          } else national_Format[lineName] = each.amount;
          return each;
        });

        stateArr.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (!includeInExpenditure.includes(lineName)) {
            lineName = "Other Expenditure";
          }
          if (state_Format[lineName] > 1) {
            state_Format[lineName] += each.amount;
          } else state_Format[lineName] = each.amount;
          return each;
        });
        individualArr.map((each, idx) => {
          const ulbTypeName = ulbTypeMap.get(each._id.toString());
          each.data.forEach((ev) => {
            let lineName = lineItemMap.get(ev.lineItem.toString());
            if (!includeInExpenditure.includes(lineName)) {
              lineName = "Other Expenditure";
            }
            if (individual_Format[ulbTypeName][lineName] > 1)
              individual_Format[ulbTypeName][lineName] += ev.amount;
            else individual_Format[ulbTypeName][lineName] = ev.amount;
          });
        });
        responsePayload.data.national = national_Format;
        responsePayload.data.individual = individual_Format;
        responsePayload.data.state = state_Format;
      } else {
        let lineItemMap = new Map();
        const lineItems = await LineItem.find().lean();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        let populKeys = ["<100K", "100K-500K", "500K-1M", "1M-4M", "4M+"];
        responsePayload.data = ulbLeds[0];
        let dataMapper = {
          "<100K": {},
          "100K-500K": {},
          "500K-1M": {},
          "1M-4M": {},
          "4M+": {},
        };
        responsePayload.data.individual.map((each) => {
          let currLineItem = lineItemMap.get(each._id.lineItem.toString());
          if (!includeInExpenditure.includes(currLineItem)) {
            currLineItem = "Other Expenditure";
          }
          populKeys.map((key) => {
            if (!dataMapper[key][currLineItem])
              dataMapper[key][currLineItem] = 0;
            dataMapper[key][currLineItem] += each[key];
          });
        });
        responsePayload.data.individual = dataMapper;
        let national_Format = {}, state_Format = {}, otherAmount = 0;
        responsePayload.data.national.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (!includeInExpenditure.includes(lineName)) {
            lineName = "Other Expenditure";
            otherAmount += each.amount
            national_Format[lineName] = otherAmount ;
          }
          if(lineName != "Other Expenditure" )
          national_Format[lineName] = each.amount;
          return each;
        });
        responsePayload.data.national = national_Format;
        responsePayload.data.state.map((each) => {
          let lineName = lineItemMap.get(each._id.lineItem.toString());
          if (!includeInExpenditure.includes(lineName)) {
            lineName = "Other Expenditure";
            otherAmount += each.amount
            state_Format[lineName] = otherAmount ;
          }
          if(lineName != "Other Expenditure" )
          state_Format[lineName] = each.amount;
          return each;
        });
        responsePayload.data.state = state_Format;
      }
      if (csv)
        await specifiedRowColumn(
          req.query.formType ? req.query.formType : "INR Cr.",
          responsePayload.data
        );
      responsePayload.data.colourArray = colourArray;
    } else {
      //deficitOrSurplus
      responsePayload.data = await createTableData(
        formType,
        ulbLeds[0],
        ulbs.length
      );
      // for Mix Data
      // if (formType == "ulbType") {
      //   responsePayload.data = ulbLeds[0];
      //   const national_Format = {
      //     revenue: ulbLeds[0].national.revenue.toFixed(2),
      //     expense: ulbLeds[0].national.expense.toFixed(2),
      //     deficitOrSurplus: ulbLeds[0].national.deficitOrSurplus.toFixed(2),
      //   };
      //   responsePayload.data.national = national_Format;
      //   let individualArr = responsePayload.data.individual;
      //   let ulbTypeMap = new Map();
      //   const UlbTypes = await UlbType.find();
      //   UlbTypes.map((each) => {
      //     ulbTypeMap.set(each._id.toString(), each.name);
      //     return each;
      //   });
      //   let individual_Format = {
      //     Municipality: {},
      //     "Municipal Corporation": {},
      //     "Town Panchayat": {},
      //   };
      //   individualArr.map((each) => {
      //     individual_Format[ulbTypeMap.get(each._id.toString())] = {
      //       revenue: each.revenue.toFixed(2),
      //       expense: each.expense.toFixed(2),
      //       deficitOrSurplus: each.deficitOrSurplus.toFixed(2),
      //       _id: undefined,
      //     };
      //   });
      //   responsePayload.data.individual = individual_Format;
      // } else {
      //   responsePayload.data = ulbLeds[0];
      //   const national_Format = {
      //     revenue: ulbLeds[0].national.revenue.toFixed(2),
      //     expense: ulbLeds[0].national.expense.toFixed(2),
      //     deficitOrSurplus: ulbLeds[0].national.deficitOrSurplus.toFixed(2),
      //   };
      //   responsePayload.data.national = national_Format;
      //   responsePayload.data.individual = responsePayload.data.individual[0];
      //   let rows = Object.keys(responsePayload.data.individual).filter(
      //     (each) => each != "_id"
      //   );
      //   const cols = ["revenue", "expense", "deficitOrSurplus"];
      //   let individual_Format = {};
      //   for (row of rows) {
      //     const newRow = row;
      //     for (col of cols) {
      //       const val = responsePayload.data.individual[row][col];
      //       if (!individual_Format[newRow]) individual_Format[newRow] = {};
      //       individual_Format[newRow][col] = val.toFixed(2);
      //     }
      //   }
      //   responsePayload.data.individual = individual_Format;
      // }
    }
    if (csv) {
      return getExcel(req, res, responsePayload.data);
    }
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: true, message: err.message });
  }
};

async function createTableData(type, data, ulbsCountInIndia) {
  let columns = [
    { key: "ulbType", display_name: "" },
    { key: "revenue", display_name: "Revenue" },
    { key: "expense", display_name: "Expenditure" },
    { key: "deficitOrSurplus", display_name: "Deficit or Surplus" },
  ];
  let rows = [
    { revenue: "", ulbType: "Average", expense: "", deficitOrSurplus: "" },
  ];
  let ulbTypes;
  for (const key in rows[0]) {
    if (key == "ulbType") continue;
    let element = rows[0][key];
    element = Math.round(data.national[key] / ulbsCountInIndia);
    if (key == "deficitOrSurplus") {
      element = element > 0 ? "Surplus" : "Deficit";
    }
    Object.assign(rows[0], { [key]: element });
  }
  if (type == "ulbType") {
    columns[0].display_name = "ULB Type";
    ulbTypes = await UlbType.find().lean();
  
    for (const value of data.individual) {
       for(let elem in  value){
         if(typeof value[elem] != 'string' )
      value[elem] =  value[elem].toFixed(0)
    }
      let tempData = {
        ulbType: ulbTypes.find((val) => val._id.toString() == value._id).name,
        ...value,
      };
      if (tempData.deficitOrSurplus > 0) tempData.deficitOrSurplus = "Surplus";
      else tempData.deficitOrSurplus = "Deficit";
      rows.push(tempData);
    }
  } else {
    data = data.individual[0];
    columns[0].display_name = "ULB Population Category";
    for (const key in data) {
      if (key == "_id") continue;
      const element = data[key];
      for(let elem in  element){
        element[elem] =  element[elem].toFixed(0)
      }
      let tempData = {
        ulbType: key,
        ...element,
      };
      if (tempData.deficitOrSurplus > 0) tempData.deficitOrSurplus = "Surplus";
      else tempData.deficitOrSurplus = "Deficit";
      rows.push(tempData);
    }
  }
  return { columns, rows };
}

async function specifiedRowColumn(defaultlabel, data) {
  var result = defaultlabel.replace(/([A-Z])/g, " $1");
  var finalDefaultLabel = result.charAt(0).toUpperCase() + result.slice(1);
  data.columns = [];
  data.rows = [];
  data.columns.push({
    display_name: finalDefaultLabel,
    key: common.camelize(finalDefaultLabel),
  });
  Object.keys(data.national).map((label) => {
    data.columns.push({
      display_name: label,
      key: common.camelize(label),
    });
  });

  let newNationalObj = {
    [common.camelize(finalDefaultLabel)]: "National",
    ...data.national,
  };
  let nationaNewObj = {};
  for (let nationalInnerKey in newNationalObj) {
    let genKey = common.camelize(nationalInnerKey);
    nationaNewObj[genKey] = newNationalObj[nationalInnerKey];
  }
  data.rows.push(nationaNewObj);

  for (let innerKey in data.individual) {
    let createObj = {};
    let genKey = common.camelize(finalDefaultLabel);
    createObj[genKey] = innerKey;

    for (let finalKey in data.individual[innerKey]) {
      genKey = common.camelize(finalKey);
      createObj[genKey] = data.individual[innerKey][finalKey];
    }
    data.rows.push(createObj);
  }
}

let getExcel = async (req, res, data) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");
    const imageId2 = workbook.addImage({
      buffer: fs.readFileSync("uploads/logos/Group 1.jpeg"),
      extension: "png",
    });
    worksheet.addImage(imageId2, {
      tl: { col: 0, row: 0 },
      br: { col: 8, row: 2 }
    });
    // worksheet.addImage(imageId2, "A1:F3");
    data.columns.push({ display_name: "S.no", key: "sno" });
    worksheet.columns = data.columns.map((value) => {
      let temp = {
        header: value.display_name,
        key: value.key,
      };
      return temp;
    });
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    worksheet.insertRow(1, {});
    data.rows.map((value, i) => {
      value.sno = i + 1;
      worksheet.addRow(value);
    });
    worksheet.addRow({sno: `Can't find what you are looking for? Reach out to us at contact@${process.env.PROD_HOST}`});
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=" + "data.xlsx");
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });
  } catch (err) {
    console.error(err.message);
    return res.status(400).json(err);
  }
};

exports.nationalDashOwnRevenue = async (req, res) => {
  try {
    let { financialYear, type, stateId, formType, visualType, getQuery, csv } =
      req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalOwnRevenue";
    formType = formType ? formType : "populationCategory";
    visualType = visualType ? visualType : "table";
    const {
      nationalDashOwnRevenuePipeline,
    } = require("../../util/aggregation");
    let responsePayload = { data: null };
    const HashTable = new Map();
    let ulbs = Ulb.find(stateId ? { state: stateId } : {}).select({
      _id: 1,
      population: 1,
      ulbType: 1,
    });
    let lineItems = LineItem.find({
      code: {
        $in: ["110", "130", "140", "150", "180"],
      },
    }).select("_id");
    let promiseData = await Promise.all([ulbs, lineItems]);
    ulbs = promiseData[0];
    lineItems = promiseData[1];
    ulbs = ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
      setPopCatValInHash(HashTable, each);
      return each._id;
    });
    lineItems = lineItems.map((each) => each._id);
    let query = nationalDashOwnRevenuePipeline(
      financialYear,
      stateId,
      ulbs,
      lineItems,
      type,
      formType
    );
    if (getQuery) return res.status(200).json(query);
    let redisKey = JSON.stringify(query);
    let redisData = await Redis.getDataPromise(redisKey);
    let ulbLeds;
    if (!redisData) {
      ulbLeds = await UlbLedger.aggregate(query);
      Redis.set(redisKey, JSON.stringify(ulbLeds));
    } else {
      ulbLeds = JSON.parse(redisData);
    }
    let populationMap = {
      Average: {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "< 100 Thousand": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "100 Thousand - 500 Thousand": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },

      "500 Thousand - 1 Million": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "1 Million - 4 Million": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "4 Million+": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let ulbTypeMap = {
      Average: {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        DataAvailPercentage: 0,
      },
      "Municipal Corporation": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      Municipality: {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
      "Town Panchayat": {
        Ownrevenue: 0,
        OwnrevenuePerCapita: 0,
        dataAvailPercent: 0,
      },
    };
    let sumOfOwnRevenue = 0,
      sumOfOwnRevPerCapita = 0,
      sumOfDataAval = 0;
    if (type == "totalOwnRevenue") {
      if (ulbLeds.length) {
        const keys = Object.keys(ulbLeds[0]);
        for (key of keys) {
          //O(5) time complexity
          let seenUlbs = 0,
            obj = ulbLeds[0][key];
          if (formType == "ulbType") {
            ulbTypeMap[key] = obj;
          } else if (formType == "populationCategory") {
            populationMap[key] = obj;
          }
          for (each of obj["set"]) {
            if (HashTable.get(each.toString())) ++seenUlbs;
          }
          sumOfOwnRevenue += obj["Ownrevenue"];
          sumOfOwnRevPerCapita += obj["OwnrevenuePerCapita"];
          delete obj["set"];
          obj["DataAvailPercentage"] = (seenUlbs / HashTable[key]) * 100;
          sumOfDataAval += obj["DataAvailPercentage"];
        }
      }
      if (formType == "ulbType") {
        ulbTypeMap["Average"]["Ownrevenue"] = sumOfOwnRevenue / 5;
        ulbTypeMap["Average"]["OwnrevenuePerCapita"] = sumOfOwnRevPerCapita / 5;
        ulbTypeMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = ulbTypeMap;
      } else if (formType == "populationCategory") {
        populationMap["Average"]["Ownrevenue"] = sumOfOwnRevenue / 5;
        populationMap["Average"]["OwnrevenuePerCapita"] =
          sumOfOwnRevPerCapita / 5;
        populationMap["Average"]["DataAvailPercentage"] = sumOfDataAval / 5;
        responsePayload.data = populationMap;
      }
      let displayNameMapper = {
          Ownrevenue: "Own Revenue (in Cr)",
          OwnrevenuePerCapita: "Own Revenue Per Capita (in Rs.)",
          DataAvailPercentage: "Data Availability Percentage",
        },
        columns = [
          {
            key: "ulb_pop_category",
            display_name:
              formType == "populationCategory"
                ? "ULB Population Category"
                : "ULB Type",
          },
          ...Object.keys(populationMap["Average"]).map((each) => {
            return { key: each, display_name: displayNameMapper[each] };
          }),
        ],
        rows = [
          ...Object.keys(responsePayload.data).map((each) => {
            let output = { ulb_pop_category: each };
            for (x in responsePayload.data[each]) {
              output[x] = Math.round(responsePayload.data[each][x]);
              if (x.toLowerCase().includes("percentage")) {
                output[x] += "%";
              }
            }
            return output;
          }),
        ];
      responsePayload.data = { rows, columns };
    } else if (type == "OwnrevenueMix") {
      let colourArray = ulbLeds[0].national.map((val) => {
        return { colour: val.colour, lineitem: val.lineName };
      });
      if (formType == "ulbType") {
        responsePayload.data = ulbLeds[0];
        let nationalArr = responsePayload.data.national,
          individualArr = responsePayload.data.individual,
           stateArr = responsePayload.data?.state;
        let lineItemMap = new Map(),
          ulbTypeMap = new Map();
        const lineItems = await LineItem.find().lean();
        const UlbTypes = await UlbType.find().lean();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        UlbTypes.map((each) => {
          ulbTypeMap.set(each._id.toString(), each.name);
          return each;
        });
        let national_Format = {},state_Format = {},
          individual_Format = {
            Municipality: {},
            "Municipal Corporation": {},
            "Town Panchayat": {},
          };
        nationalArr.map((each) => {
          national_Format[lineItemMap.get(each._id.lineItem.toString())] =
            each.amount;
          return each;
        });
        stateArr.map((each) => {
          state_Format[lineItemMap.get(each._id.lineItem.toString())] =
            each.amount;
          return each;
        });
        individualArr.map((each, idx) => {
          const ulbTypeName = ulbTypeMap.get(each._id.toString());
          each.data.map((ev) => {
            individual_Format[ulbTypeName][
              lineItemMap.get(ev.lineItem.toString())
            ] = ev.amount;
          });
        });
        responsePayload.data.national = national_Format;
        responsePayload.data.individual = individual_Format;
        responsePayload.data.state = state_Format;
      } else {
        let lineItemMap = new Map();
        const lineItems = await LineItem.find().lean();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        let populKeys = ["<100K", "100K-500K", "500K-1M", "1M-4M", "4M+"];
        responsePayload.data = ulbLeds[0];
        let dataMapper = {
          "<100K": {},
          "100K-500K": {},
          "500K-1M": {},
          "1M-4M": {},
          "4M+": {},
        };
        responsePayload.data.individual.map((each) => {
          const currLineItem = lineItemMap.get(each._id.lineItem.toString());
          populKeys.map((key) => {
            if (!dataMapper[key][currLineItem])
              dataMapper[key][currLineItem] = 0;
            dataMapper[key][currLineItem] += each[key];
          });
        });
        responsePayload.data.individual = dataMapper;
        let national_Format = {};
        responsePayload.data.national.map((each) => {
          national_Format[lineItemMap.get(each._id.lineItem.toString())] =
            each.amount;
          return each;
        });
        let state_Format = {};
        responsePayload.data.state.map((each) => {
          state_Format[lineItemMap.get(each._id.lineItem.toString())] =
            each.amount;
          return each;
        });
        responsePayload.data.national = national_Format;
        responsePayload.data.state = state_Format;
      }
      if (csv)
        await specifiedRowColumn(
          req.query.formType ? req.query.formType : "INR Cr.",
          responsePayload.data
        );
      responsePayload.data.colourArray = colourArray;
    }
    if (csv) {
      return getExcel(req, res, responsePayload.data);
    }
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: true, message: err.message });
  }
};

exports.nationalDashCapexpense = async (req, res) => {
  try {
    let { financialYear, type, stateId, formType, visualType, getQuery, csv } =
      req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalCapexpense";
    formType = formType ? formType : "populationCategory";
    visualType = visualType ? visualType : "table";
    const {
      nationalDashCapexpensePipeline,
    } = require("../../util/aggregation");
    let responsePayload = { data: null };
    const HashTable = new Map();
    let stateCondition =  {isActive:true}
    if(stateId){
      stateCondition['state']=stateId
    }
    let ulbs = Ulb.find()
      .select({
        _id: 1,
        population: 1,
        ulbType: 1,
      })
      .lean();
    let lineItems = LineItem.find({
      code: {
        $in: ["410", "412"],
      },
    })
      .select("_id")
      .lean();
    let promiseData = await Promise.all([ulbs, lineItems]);
    ulbs = promiseData[0];
    lineItems = promiseData[1];
    ulbs = ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
      setPopCatValInHash(HashTable, each);
      return each._id;
    });
    lineItems = lineItems.map((each) => each._id);
    let query = await nationalDashCapexpensePipeline(
      financialYear,
      stateId,
      ulbs,
      lineItems,
      type,
      formType
    );
    if (getQuery) return res.status(200).json(query);
    let redisKey = JSON.stringify(query);
    let redisData;
    // = await Redis.getDataPromise(redisKey);
    let ulbLeds;
    if (!redisData) {
      ulbLeds = await UlbLedger.aggregate(query);
      Redis.set(redisKey, JSON.stringify(ulbLeds));
    } else {
      ulbLeds = JSON.parse(redisData);
    }
    ulbLeds = ulbLeds.reduce((newVal, val) => {
      if (newVal[val._id.financialYear]) {
        newVal[val._id.financialYear].push(val);
      } else {
        newVal[val._id.financialYear] = [val];
      }
      return newVal;
    }, {});
    let row = [],
      columns = [];
    if (formType == "ulbType") {
      columns = [
        {
          key: "ulbType",
          display_name: "ULB Type",
        },
        {
          key: "amount",
          display_name: "Capital Expenditure (in Cr)",
        },
        {
          key: "perCapita",
          display_name: "Capital Expenditure Per Capita (in Rs.)",
        },
        {
          key: "percentage",
          display_name: "Data Availability Percentage",
        },
      ];

      rows = ulbLeds[financialYear].map((val) => {
        let oldYear = financialYear.split("-");
        oldYear = `${oldYear[0] - 1}-${oldYear[1] - 1}`;
        let newData = {
          ulbType: val.ulbType,
          amount: 0,
          perCapita: 0,
          percentage: 0,
        };
        let oldYearValues = ulbLeds[oldYear].find(
          (value) => value.ulbType == val.ulbType
        );
        newData.amount = Math.round(
          (val.amount_410 -
            oldYearValues.amount_410 +
            (val.amount_412 - oldYearValues.amount_412)
        )/1e7);
        newData.perCapita = Math.round(newData.amount *1e7 / val.population);
        newData.percentage =
          Math.round((val.noOfUlbs / HashTable[val.ulbType]) * 100) + "%";
        return newData;
      });

    }
    if (formType == "populationCategory") {
      columns = [
        {
          key: "ulb_pop_category",
          display_name: "ULB Population Category",
        },
        {
          key: "amount",
          display_name: "Capital Expenditure (in Cr)",
        },
        {
          key: "perCapita",
          display_name: "Capital Expenditure Per Capita (in Rs.)",
        },
        {
          key: "percentage",
          display_name: "Data Availability Percentage",
        },
      ];
      let calVal = {};
      row = ulbLeds[financialYear][0];
      for (const key in row) {
        const element = row[key];
        if (key == "_id") continue;
        let popCat = key.split("_");
        if (key.includes("410") || key.includes("412")) {
          let oldYear = financialYear.split("-");
          oldYear = `${oldYear[0] - 1}-${oldYear[1] - 1}`;
          if (!calVal[popCat[0]]) {
            calVal[popCat[0]] = {};
          }
          calVal[popCat[0]][popCat[1]] = element - ulbLeds[oldYear][0][key];
        } else {
          calVal[popCat[0]][popCat[1]] = element;
        }
      }
      rows = [];
      for (let key in calVal) {
        const element = calVal[key];
        switch (key) {
          case "<100K":
            key = "< 100 Thousand";
            break;
          case "100K-500K":
            key = "100 Thousand - 500 Thousand";

            break;
          case "500K-1M":
            key = "500 Thousand - 1 Million";

            break;
          case "1M-4M":
            key = "1 Million - 4 Million";

            break;
          case "4M+":
            key = "4 Million+";

            break;
        }
        let newData = {
          ulb_pop_category: key,
          amount: Math.round((element["410"] + element["412"])/1e7),
          perCapita: Math.round(
            (element["410"] + element["412"]) / element["pop"]
          ),
          percentage:
            Math.round((element["noOfUlbs"] / HashTable[key]) * 100) + "%",
        };
        rows.push(newData);
      }
    }
rows.unshift({
  "amount":0,
  "perCapita":0,
  "percentage": "0%",
  "ulb_pop_category": "Average"})
  let temp = rows[2];
  rows[2] = rows[3];
  rows[3] = temp ;
    responsePayload.data = { rows, columns, keys: ["amount", "perCapita"] };

    if (csv) {
      return getExcel(req, res, responsePayload.data);
    }
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: true, message: err.message });
  }
};

exports.getStatewiseDataAvail = async (req, res) => {
  try {
    const { financialYear, getQuery } = req.query;
    if (!financialYear) throw { message: "Financial Year is missing" };
    let response = { success: true, data: null };
    let ulbsStateWise = Ulb.aggregate([
      {
        $match:{
          "isActive":true
        }
      },
      {
        $group: {
          _id: "$state",
          count: {
            $sum: 1,
          },
        },
      },
    ]);
    const { getStateWiseDataAvailPipeline } = require("../../util/aggregation");
    const query = getStateWiseDataAvailPipeline(financialYear);
    if (getQuery) return res.status(200).json(query);
    response.data = UlbLedger.aggregate(query);
    let promiseData = await Promise.all([ulbsStateWise, response.data]);
    ulbsStateWise = promiseData[0];
    response.data = promiseData[1];
    response.data.map((each) => {
      for (value of ulbsStateWise) {
        if (each.stateId.toString() == value._id.toString()) {
          each.percentage = Math.round((each.count * 100) / value.count);
          delete each.count;
        }
      }
      return each;
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: true, message: error.message });
  }
};

function setPopCatValInHash(HashTable, each) {
  if (each.ulbType.toString() == "5dcfa66b43263a0e75c71696") {
    if (HashTable["Town Panchayat"]) HashTable["Town Panchayat"] += 1;
    else {
      HashTable["Town Panchayat"] = 1;
    }
  } else if (each.ulbType.toString() == "5dcfa64e43263a0e75c71695") {
    if (HashTable["Municipality"]) HashTable["Municipality"] += 1;
    else {
      HashTable["Municipality"] = 1;
    }
  } else if (each.ulbType.toString() == "5dcfa67543263a0e75c71697") {
    if (HashTable["Municipal Corporation"])
      HashTable["Municipal Corporation"] += 1;
    else {
      HashTable["Municipal Corporation"] = 1;
    }
  }

  if (each.population < 1e5) {
    if (HashTable["< 100 Thousand"]) HashTable["< 100 Thousand"] += 1;
    else {
      HashTable["< 100 Thousand"] = 1;
    }
  } else if (each.population >= 1e5 && each.population < 5e5) {
    if (HashTable["100 Thousand - 500 Thousand"])
      HashTable["100 Thousand - 500 Thousand"] += 1;
    else {
      HashTable["100 Thousand - 500 Thousand"] = 1;
    }
  } else if (each.population >= 5e5 && each.population < 1e6) {
    if (HashTable["500 Thousand - 1 Million"])
      HashTable["500 Thousand - 1 Million"] += 1;
    else {
      HashTable["500 Thousand - 1 Million"] = 1;
    }
  } else if (each.population >= 1e6 && each.population < 4e6) {
    if (HashTable["1 Million - 4 Million"])
      HashTable["1 Million - 4 Million"] += 1;
    else {
      HashTable["1 Million - 4 Million"] = 1;
    }
  } else if (each.population > 4e6) {
    if (HashTable["4 Million+"]) HashTable["4 Million+"] += 1;
    else {
      HashTable["4 Million+"] = 1;
    }
  }
}

const includeInExpenditure = [
  "Others",
  "Establishment Expenses",
  "Interest & Finance Charges",
  "Administrative Expenses",
  "Operation & Maintenance",
];

const ownRevenueLineItems = [
  "Tax Revenue",
  "Rental Income from Municipal Properties",
  "Fee & User Charges",
  "Sale & Hire charges",
  "Other Income",
];
const otherReceiptsLineItem = ["Others", "Income from Investment"];
