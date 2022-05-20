const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ResourceLineItem = require("../../models/ResourceLineItem");
const ULB = require("../../models/Ulb");
const STATE = require("../../models/State");
const resource = require("../../models/Resources");
const ExcelJS = require("exceljs");

module.exports.get = async function (req, res) {
  try {
    let {
      header,
      subHeader,
      ulb,
      state,
      type,
      toolKitVisible,
      getQuery,
      globalName,
      year,
    } = req.query;
    if (!header && !toolKitVisible)
      return Response.BadRequest(res, null, "header  is required");
    let query = { header };
    if (subHeader) {
      Object.assign(query, { subHeader });
    }
    if (type) {
      Object.assign(query, { type });
    }
    if (ulb) {
      Object.assign(query, { ulb });
    } else if (state) {
      Object.assign(query, { state });
    }
    if (year) {
      Object.assign(query, { publishedYear: year });
    }
    if (globalName) {
      Object.assign(query, { name: { $regex: globalName, $options: "si" } });
    }
    if (toolKitVisible) {
      toolKitVisible = formateName(toolKitVisible);
      query = { toolKitVisible };
    }
    if (getQuery) return res.status(200).json(query);
    let data = await ResourceLineItem.find(query).lean();
    if (data.length < 1) throw Error("No Resource Found");
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports.getYears = async function (req, res) {
  try {
    let data = await ResourceLineItem.distinct("publishedYear").lean();
    data.sort((a, b) => {
      a = Number(a.split("-")[0]);
      b = Number(b.split("-")[0]);
      return b - a;
    });
    return Response.OK(res, data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports.post = async function (req, res) {
  try {
    const { name, downloadUrl } = req.body;
    if (!name || !downloadUrl)
      return Response.BadRequest(res, null, "name and downloadUrl is required");
    let data = new ResourceLineItem(req.body);
    await data.save();
    return Response.OK(res.data);
  } catch (error) {
    console.log(error);
    return Response.DbError(res, error, error.message);
  }
};

module.exports.bulkPost = async function (req, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    let file = await workbook.xlsx.readFile(req.file.path);
    let worksheet = file.getWorksheet(1);
    let rowData = [];
    worksheet.eachRow(function (row) {
      rowData.push(row);
    });
    let ulbData = [],
      allPromises = [];
    let allowedHeaders = [
      "Tab",
      "Sub Tab",
      "State Code",
      "ULB Code",
      "Year (Published In)",
      "File Name",
      "File Type",
      "File URL",
      "Toolkit Tab Visible",
    ];
    let errorHeads = [];
    rowData[0].values.forEach((val, index) => {
      if (val != allowedHeaders[index - 1]) {
        errorHeads.push(
          `${val} should be equal to ${allowedHeaders[index - 1]}`
        );
      }
    });
    if (errorHeads.length > 0) {
      return Response.BadRequest(res, errorHeads);
    }

    for (let index = 0; index < rowData.length; index++) {
      const ele = rowData[index];
      if (index == 0) continue;
      let value = ele.values;
      let ulb = value[4]
          ? (await ULB.findOne({ code: value[4] }).select("_id").lean())["_id"]
          : null,
        state = value[3]
          ? (await STATE.findOne({ code: value[3] }).select("_id").lean())[
              "_id"
            ]
          : null;
      let temObj = {
        name: value[6],
        downloadUrl: value[8]?.text,
        header: formateName(value[1]),
        type: value[7],
        publishedYear: value[5],
        ulb,
        state,
      };
      if (value[2]) {
        Object.assign(temObj, { subHeader: formateName(value[2]) });
      }
      if (value[9]) {
        Object.assign(temObj, { toolKitVisible: formateName(value[9]) });
      }
      ulbData.push(temObj);
      let data = new ResourceLineItem(temObj);
      allPromises.push(data.save());
    }

    let result = await Promise.all(allPromises);
    return res.status(200).json({ msg: "success", ulbData, result });
  } catch (error) {
    return Response.InternalError(res, error?.message || error);
  }
};

/* A search function. */
module.exports.search = async function (req, res) {
  try {
    if (!req.query.name) throw new Error("Empty search !");

    const searchGlobal = req.query.name;
    const fromModelData = {
      learningCenter: 0,
      dataSet: 0,
      reportsAndPublication: 0,
    };
    let query = { name: new RegExp(searchGlobal, "i") };

    fromModelData.dataSet = await ULB.count(query);
    fromModelData.reportsAndPublication = await resource.count(query);
    fromModelData.learningCenter = await ResourceLineItem.count(query);

    return Response.OK(res, fromModelData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

function formateName(name) {
  let newName = name.toLowerCase().split(" ").join("_");
  return newName;
}
