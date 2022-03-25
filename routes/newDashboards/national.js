const ULBLedger = require("../../models/UlbLedger");
const Ulb = require("../../models/Ulb");
const UlbLedger = require("../../models/UlbLedger");

exports.dataAvailabilityState = async (req, res) => {
  try {
    const { financialYear, stateId, population, ulbType } = req.query;
    if (!financialYear) throw { message: "financial year is missing." };
    let filterCondition = {},
      ulbLedgers;
    if (stateId) filterCondition["state"] = stateId;
    let ulbs = await Ulb.find(filterCondition)
      .populate("ulbType", "name")
      .select("_id population ulbType");
    filterCondition = {
      ulb: ulbs.map((ech) => ech._id),
    };
    if (financialYear) filterCondition["financialYear"] = financialYear;
    ulbLedgers = await UlbLedger.distinct("ulb", filterCondition);

    let responsePayload = {
      data: null,
    };
    if (population) {
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
        totalUlbs = await Ulb.countDocuments(),
        sumOfNoOfUlbs = 0,
        sumOfUlbsWithData = 0,
        sumOfDataAvailPercentage = 0,
        sumOfUrbanPopulPercentage = 0;
      for (each of rows) {
        if (each != "Average") {
          const arrr = populationMap[each]["Number Of ULBs"];
          let matched = 0;
          for (every of arrr) {
            if (ulbLedgers.indexOf(every._id) > -1) {
              ++matched;
            }
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
      responsePayload.data = populationMap;
    }
    res.status(200).json({ success: true, ...responsePayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
