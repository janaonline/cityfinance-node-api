const mongoose = require("mongoose")
const ObjectId = mongoose.Types.ObjectId;
const Response = require("../../service").response;
const ExcelJS = require("exceljs");
const Indicator = require("../../models/indicators");
const IndicatorLineItems = require("../../models/indicatorLineItems");
const ULB = require("../../models/Ulb");

const unitBenchmark = {
  "6284d6f65da0fa64b423b53a": { benchMark: 100, unit: "Percent" },
  "6284d6f65da0fa64b423b53c": {
    benchMark: 135,
    unit: "litres per capita per day (lpcd)",
  },
  "6284d6f65da0fa64b423b53e": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b540": { benchMark: 20, unit: "Percent" },
  "6284d6f65da0fa64b423b542": { benchMark: 24, unit: "Hours per day" },
  "6284d6f65da0fa64b423b544": {
    benchMark: 80,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b546": { benchMark: 100, unit: "Percent" },
  "6284d6f65da0fa64b423b548": { benchMark: 100, unit: "Percent" },
  "6284d6f65da0fa64b423b54a": {
    benchMark: 90,
    unit: "Percent",
  },

  "6284d6f65da0fa64b423b528": { benchMark: 100, unit: "Percent" },
  "6284d6f65da0fa64b423b52a": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b52c": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b52e": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b530": { benchMark: 100, unit: "Percent" },
  "6284d6f65da0fa64b423b532": {
    benchMark: 20,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b534": {
    benchMark: 80,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b536": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b538": {
    benchMark: 90,
    unit: "Percent",
  },

  "6284d6f65da0fa64b423b518": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b51a": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b51c": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b51e": {
    benchMark: 80,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b520": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b522": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b524": {
    benchMark: 80,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b526": {
    benchMark: 90,
    unit: "Percent",
  },

  "6284d6f65da0fa64b423b514": {
    benchMark: 100,
    unit: "Percent",
  },
  "6284d6f65da0fa64b423b516": {
    benchMark: 0,
    unit: "Nos. per year",
  },
};

exports.fileUpload = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    let file = await workbook.xlsx.readFile(req.file.path);
    let worksheet = file.getWorksheet(1);
    let bulkUploadData = [];
    let code = await ULB.find({}).select({ _id: 1, code: 1, name: 1 }).lean();
    code = code.reduce((map, val) => {
      if (!map.hasOwnProperty(val.code)) {
        map[val.code] = [val._id, val.name];
      }
      return map;
    }, {});

    // use this map to get benchmark and unit from IndicatorLineItems
    // let lineItem = await IndicatorLineItems.find().lean();
    // let lineMap = lineItem.reduce((map, val) => {
    //   map[val._id] = val;
    //   return map;
    // }, {});

    let tempMap = {}; // map the keys of the first row
    let row1 = worksheet.getRow(1);
    row1.values.forEach((element, i) => {
      tempMap[i] = element;
    });

    worksheet.eachRow(function (row, rowNumber) {
      if (rowNumber == 1) return;
      row = row.values;
      let indicator = {
        indicatorLineItem: "",
        value: 0,
        ulbName: code[row[2]][1],
        ulb: code[row[2]][0],
        year: row[1],
        unitType: "",
        benchMarkValue: "",
      };
      row.forEach((val, index) => {
        if (index == 1 || index == 2) return;
        indicator.indicatorLineItem = tempMap[index];
        indicator.value = Number(val);
        indicator.unitType = unitBenchmark[tempMap[index]].unit;
        indicator.benchMarkValue = unitBenchmark[tempMap[index]].benchMark;
        bulkUploadData.push(JSON.parse(JSON.stringify(indicator)));
      });
    });
    // return Response.OK(res, bulkUploadData, "Submitted!");

    Indicator.insertMany(bulkUploadData).then((newData) => {
      return Response.OK(res, newData, "Submitted!");
    });
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.indicatorsYears = async (req, res) => {
  try {
    let {
      ulb,
      type,
      indicatorName
    } = req.query;

    let indicatorMatch = {};
    if (type) {
      indicatorMatch['type'] = { $regex: type.toLowerCase() };
    }
    if (indicatorName) {
      indicatorMatch['name'] = { $regex: indicatorName.toLowerCase() };
    }

    const indicatorLineItemIds = await IndicatorLineItems.find(indicatorMatch)
      .select({ _id: 1 })
      .lean();

    let query = {};
    if (ulb) {
      query['ulb'] = ObjectId(ulb);
    }
    query['indicatorLineItem'] = indicatorLineItemIds.map((val) => val._id);
    const data = await Indicator.distinct('year', query)

    return Response.OK(res, data, "Success");
  } catch (error) {
    return Response.DbError(res, error.message);
  }
};
exports.getIndicatorData = async (req, res) => {
  try {
    let {
      benchMarkValue = 50,
      compUlb,
      ulb,
      type,
      indicatorName,
      year,
      getQuery,
    } = req.query;
    type = type?.toLowerCase();
    let query = {};
    if (ulb) {
      Object.assign(query, { ulb: ObjectId(ulb) });
    }
    let indicatorLineItemIds;
    let indicatorMatch = {};
    if (type) {
      Object.assign(indicatorMatch, { type: { $regex: type } });
    }
    if (indicatorName) {
      indicatorName = indicatorName.toLowerCase();
      Object.assign(indicatorMatch, { name: { $regex: indicatorName } });
    }

    indicatorLineItemIds = await IndicatorLineItems.find(indicatorMatch)
      .select({ _id: 1 })
      .lean();
    indicatorLineItemIds = indicatorLineItemIds.map((val) => val._id);

    if (year) {
      Object.assign(query, { year });
    }

    if (getQuery) {
      return Response.OK(res, query);
    }
    let promises = [];
    let data = Indicator.aggregate([
      {
        $match: { ...query, indicatorLineItem: { $in: indicatorLineItemIds } },
      },
      {
        $lookup: {
          from: "indicatorlineitems",
          localField: "indicatorLineItem",
          foreignField: "_id",
          as: "indicatorLineItem",
        },
      },
      { $unwind: "$indicatorLineItem" },
      {
        $project: {
          _id: 1,
          name: "$indicatorLineItem.name",
          type: "$indicatorLineItem.type",
          value: 1,
          ulbName: 1,
          year: 1,
          unitType: 1,
          benchMarkValue: 1,
        },
      },
    ]);
    let nationalAvg = Indicator.aggregate([
      {
        $match: {
          year: {
            $in: [year],
          },
        },
      },
      {
        $lookup: {
          from: "indicatorlineitems",
          localField: "indicatorLineItem",
          foreignField: "_id",
          as: "indicatorLineItem",
        },
      },
      { $unwind: "$indicatorLineItem" },
      {
        $group: {
          _id: "$indicatorLineItem.name",
          value: { $avg: "$value" },
        },
      },
    ]);
    promises.push(data);
    promises.push(nationalAvg);
    let compData;
    if (compUlb) {
      if (query.ulb) {
        query.ulb = ObjectId(compUlb);
      }
      compData = Indicator.aggregate([
        {
          $match: {
            ...query,
            indicatorLineItem: { $in: indicatorLineItemIds },
          },
        },
        {
          $lookup: {
            from: "indicatorlineitems",
            localField: "indicatorLineItem",
            foreignField: "_id",
            as: "indicatorLineItem",
          },
        },
        { $unwind: "$indicatorLineItem" },
        {
          $project: {
            _id: 1,
            name: "$indicatorLineItem.name",
            type: "$indicatorLineItem.type",
            value: 1,
            ulbName: 1,
            year: 1,
            unitType: 1,
            benchMarkValue: 1,
          },
        },
      ]);
      promises.push(compData);
    }
    let allData = await Promise.all(promises);
    data = allData[0];
    nationalAvg = allData[1];
    compData = allData[2];

    data = data.map((value, index) => {
      if (compUlb) {
        let compUlbData = compData.find(
          (innerVal) => innerVal.name === value.name
        )?.value;
        Object.assign(value, { compPercentage: compUlbData });
      }
      let nationalValue = nationalAvg.find(
        (innerVal) => innerVal._id === value.name
      )?.value;
      Object.assign(value, { nationalValue });
      return value;
    });
    return Response.OK(res, data, "Success");
  } catch (error) {
    return Response.DbError(res, error.message);
  }
};

exports.deleteALlData = async (req, res) => {
  try {
    let data = await Indicator.remove();
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

