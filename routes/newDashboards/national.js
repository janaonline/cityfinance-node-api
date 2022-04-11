const ULBLedger = require("../../models/UlbLedger");
const Ulb = require("../../models/Ulb");
const UlbType = require("../../models/UlbType");
const UlbLedger = require("../../models/UlbLedger");
const LineItem = require("../../models/LineItem");
const State = require("../../models/State");
const mongoose = require("mongoose");
const { response } = require("../../service");
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
        numberOfULBs: 0,
        ulbsWithData: 0,
        DataAvailPercentage: 0,
        urbanPopulationPercentage: 0,
      },
    };
    // console.log("LEO", ulbTypes);
    ulbTypes.forEach((item) => {
      ulbTypeMap[item._id] = {
        numberOfULBs: [],
        ulbsWithData: [],
        DataAvailPercentage: [],
        urbanPopulationPercentage: [],
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
          // console.log("elemId", elem._id, typeof elem._id);
          if (ulbLedgers.indexOf(elem._id) > -1) {
            ++matched;
          }
        }
        ulbTypeMap[each]["numberOfULBs"] = arrr.length;
        ulbTypeMap[each]["ulbsWithData"] = matched;
        const multiply = matched * 100;
        ulbTypeMap[each]["DataAvailPercentage"] =
          arrr.length == 0 ? 0 : multiply / arrr.length;
        //for average calculation -Begin
        sumOfNoOfUlbs += arrr.length;
        sumOfUlbsWithData += matched;
        sumOfDataAvailPercentage += ulbTypeMap[each]["DataAvailPercentage"];
        //for average calculation -End
      }
    }
    for (each in ulbTypeMap) {
      // console.log("Each", each);
      if (each == "Average") {
        ulbTypeMap["Average"]["numberOfULBs"] = sumOfNoOfUlbs / 5;
        ulbTypeMap["Average"]["ulbsWithData"] = sumOfUlbsWithData / 5;
        ulbTypeMap["Average"]["DataAvailPercentage"] =
          sumOfDataAvailPercentage / 5;
      } else {
        const multiply = ulbTypeMap[each]["numberOfULBs"] * 100;
        ulbTypeMap[each]["urbanPopulationPercentage"] =
          totalUlbs == 0 ? 0 : multiply / totalUlbs;
        //for average calculation -Begin
        sumOfUrbanPopulPercentage +=
          ulbTypeMap[each]["urbanPopulationPercentage"];
        //for average calculation -End
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
        urbanPopulationPercentage: "Urban population percentage",
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
          output[key] = ulbTypeMap[each][key].toFixed(2);
        }
        return output;
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
  for (let x = 0; x < lengthOfUlbs; ++x) {
    const specific = ulbs[x];
    if (specific.population < 1e5) {
      populationMap["< 100 Thousand"]["numberOfULBs"].push(specific);
    } else if (specific.population >= 1e5 && specific.population <= 5e5) {
      populationMap["100 Thousand - 500 Thousand"]["numberOfULBs"].push(
        specific
      );
    } else if (specific.population >= 5e5 && specific.population <= 1e6) {
      populationMap["500 Thousand - 1 Million"]["numberOfULBs"].push(specific);
    } else if (specific.population >= 1e6 && specific.population <= 4e6) {
      populationMap["1 Million - 4 Million"]["numberOfULBs"].push(specific);
    } else if (specific.population > 4e6) {
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
      let matched = 0;
      for (elem of arrr)
        if (ulbLedgers.indexOf(elem._id) > -1) {
          ++matched;
        }
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
      urbanPopulationPercentage: "Urban population percentage",
    },
    columns = [
      { key: "ulbType", display_name: "ULB Type" },
      ...Object.keys(populationMap.Average).map((each) => {
        return { key: each, display_name: displayNameMapper[each] };
      }),
    ],
    theRows = Object.keys(populationMap).map((each) => {
      let output = { ulbType: each };
      for (key in populationMap[each]) {
        output[key] = populationMap[each][key].toFixed(2);
      }
      return output;
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
    const HashTable = new Map();
    let ulbs = await Ulb.find(stateId ? { state: stateId } : {}).select("_id");
    let lineItems = await LineItem.find({ headOfAccount: "Revenue" }).select(
      "_id"
    );
    ulbs = ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
      return each._id;
    });
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
          obj["DataAvailPercentage"] = (seenUlbs * 100) / ulbs.length;
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
            display_name: "ULB Population Category",
          },
          ...Object.keys(populationMap["Average"]).map((each) => {
            return { key: each, display_name: displayNameMapper[each] };
          }),
        ],
        rows = [
          ...Object.keys(responsePayload.data).map((each) => {
            let output = { ulb_pop_category: each };
            for (x in responsePayload.data[each]) {
              output[x] = responsePayload.data[each][x].toFixed(2);
            }
            return output;
          }),
        ];
      responsePayload.data = { rows, columns };
    } else if (type == "revenueMix") {
      if (formType == "ulbType") {
        responsePayload.data = ulbLeds[0];
        let nationalArr = responsePayload.data.national,
          individualArr = responsePayload.data.individual;
        let lineItemMap = new Map(),
          ulbTypeMap = new Map();
        const lineItems = await LineItem.find();
        const UlbTypes = await UlbType.find();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        UlbTypes.map((each) => {
          ulbTypeMap.set(each._id.toString(), each.name);
          return each;
        });
        let national_Format = {},
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
        responsePayload.data.national = national_Format;
      }
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
    let { financialYear, type, formType, visualType, getQuery } = req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    type = type ? type : "totalExpenditure";
    formType = formType ? formType : "populationCategory";
    const { nationalDashExpensePipeline } = require("../../util/aggregation");
    const HashTable = new Map();
    let ulbs = await Ulb.find().select("_id");
    let lineItemsExp = await LineItem.find({ headOfAccount: "Expense" }).select(
      "_id"
    );
    ulbs.map((each) => {
      HashTable.set(each._id.toString(), true);
    });
    lineItemsExp = lineItemsExp.map((each) => each._id);
    const query = nationalDashExpensePipeline(
      financialYear,
      type,
      formType,
      lineItemsExp
    );
    if (getQuery) return res.status(200).json(query);
    const ulbLeds = await UlbLedger.aggregate(query);
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
          obj["DataAvailPercentage"] = (seenUlbs * 100) / ulbs.length;
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
            display_name: "ULB Population Category",
          },
          ...Object.keys(populationMap["Average"]).map((each) => {
            return { key: each, display_name: displayNameMapper[each] };
          }),
        ],
        rows = [
          ...Object.keys(responsePayload.data).map((each) => {
            let output = { ulb_pop_category: each };
            for (x in responsePayload.data[each]) {
              output[x] = responsePayload.data[each][x].toFixed(2);
            }
            return output;
          }),
        ];
      responsePayload.data = { rows, columns };
    } else if (type == "expenditureMix") {
      if (formType == "ulbType") {
        responsePayload.data = ulbLeds[0];
        let nationalArr = responsePayload.data.national,
          individualArr = responsePayload.data.individual;
        let lineItemMap = new Map(),
          ulbTypeMap = new Map();
        const lineItems = await LineItem.find();
        const UlbTypes = await UlbType.find();
        lineItems.map((each) => {
          lineItemMap.set(each._id.toString(), each.name);
          return each;
        });
        UlbTypes.map((each) => {
          ulbTypeMap.set(each._id.toString(), each.name);
          return each;
        });
        let national_Format = {},
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
        responsePayload.data.national = national_Format;
      }
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
    const ulbsStateWise = await Ulb.aggregate([
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
    response.data = await UlbLedger.aggregate(query);
    response.data.map((each) => {
      for (value of ulbsStateWise) {
        if (each.stateId.toString() == value._id.toString()) {
          each.percentage = ((each.count * 100) / value.count).toFixed(2);
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
