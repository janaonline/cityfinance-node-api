const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ResourceLineItem = require("../../models/ResourceLineItem");
const ULB = require("../../models/Ulb");
const STATE = require("../../models/State");
const resource = require("../../models/Resources");
const ExcelJS = require("exceljs");
const DataCollection = require("../../models/DataCollectionForm");
const AnnualAccountData = require("../../models/AnnualAccounts");

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
    if (year && year != 'All Years') {
      Object.assign(query, { publishedYear: year });
    }
    if (globalName) {
      Object.assign(query, {$or : [{ name: { $regex: globalName, $options: "si" } },{ tags: { $regex: globalName, $options: "si" } }]} );
    }
    if (toolKitVisible) {
      toolKitVisible = formateName(toolKitVisible);
      query = { toolKitVisible };
    }
    if (getQuery) return res.status(200).json(query);
    let data = await ResourceLineItem.find(query).sort({modifiedAt:-1});
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
    return Response.OK(res,data);
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
    let query = { $or: [{name: new RegExp(searchGlobal, "i")},{tags: new RegExp(searchGlobal, "i")}] };

    fromModelData.dataSet = getDataSetCount(searchGlobal);
    fromModelData.reportsAndPublication = ResourceLineItem.find({
      header: "reports_&_publications",
      ...query,
    }).count();
    fromModelData.learningCenter = ResourceLineItem.find({
      header: "learning_center",
      ...query,
    }).count();
    let allData = await Promise.all([
      fromModelData.dataSet,
      fromModelData.reportsAndPublication,
      fromModelData.learningCenter,
    ]);
    fromModelData.dataSet = allData[0];
    fromModelData.reportsAndPublication = allData[1];
    fromModelData.learningCenter = allData[2];
    return Response.OK(res, fromModelData);
  } catch (error) {
    return Response.DbError(res, error, error.message);
  }
};

function formateName(name) {
  let newName = name.toLowerCase().split(" ").join("_");
  return newName;
}

async function getDataSetCount(globalName) {
  try {
    let totalCount = 0;
    let queries = [];
    let query_dataCollection = [
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
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
    ];
    query_extn = [
      {
        $project: {
          ulbId: "$ulb._id",
          state: "$state.name",
          ulbName: "$ulb.name",
          modifiedAt: "$modifiedAt",
          "2015-16_income_pdf": "$documents.financial_year_2015_16.pdf",
          "2015-16_income_excel": "$documents.financial_year_2015_16.excel",
          "2015-16_balance_pdf": "$documents.financial_year_2015_16.pdf",
          "2015-16_balance_excel": "$documents.financial_year_2015_16.excel",
          "2016-17_income_pdf": "$documents.financial_year_2016_17.pdf",
          "2016-17_income_excel": "$documents.financial_year_2016_17.excel",
          "2016-17_balance_pdf": "$documents.financial_year_2016_17.pdf",
          "2016-17_balance_excel": "$documents.financial_year_2016_17.excel",
          "2017-18_income_pdf": "$documents.financial_year_2017_18.pdf",
          "2017-18_income_excel": "$documents.financial_year_2017_18.excel",
          "2017-18_balance_pdf": "$documents.financial_year_2017_18.pdf",
          "2017-18_balance_excel": "$documents.financial_year_2017_18.excel",
          "2018-19_income_pdf": "$documents.financial_year_2018_19.pdf",
          "2018-19_income_excel": "$documents.financial_year_2018_19.excel",
          "2018-19_balance_pdf": "$documents.financial_year_2018_19.pdf",
          "2018-19_balance_excel": "$documents.financial_year_2018_19.excel",
        },
      },
      {
        $project: {
          ulbId: 1,
          ulbName: 1,
          state: 1,
          modifiedAt: 1,
          file: 1,
        },
      },
    ];

    query_dataCollection.push(...query_extn);
    queries.push(query_dataCollection);

    let query = [
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
        $lookup: {
          from: "states",
          localField: "ulb.state",
          foreignField: "_id",
          as: "state",
        },
      },
      {
        $unwind: "$state",
      },
    ];
    query_extn = [
      {
        $project: {
          ulbId: "$ulb._id",
          ulbName: "$ulb.name",
          state: "$state.name",
          modifiedAt: "$modifiedAt",
          "2019-20_balance_pdf": "$audited.provisional_data.bal_sheet.pdf.url",
          "2019-20_balance_excel":
            "$audited.provisional_data.bal_sheet.excel.url",
          "2019-20_income_pdf": "$audited.provisional_data.inc_exp.pdf.url",
          "2019-20_income_excel": "$audited.provisional_data.inc_exp.excel.url",
          "2020-21_balance_pdf":
            "$unAudited.provisional_data.bal_sheet.pdf.url",
          "2020-21_balance_excel":
            "$unAudited.provisional_data.bal_sheet.excel.url",
          "2020-21_income_pdf": "$unAudited.provisional_data.inc_exp.pdf.url",
          "2020-21_income_excel":
            "$unAudited.provisional_data.inc_exp.excel.url",
        },
      },
      {
        $project: {
          ulbId: 1,
          ulbName: 1,
          state: 1,
          modifiedAt: 1,
          file: 1,
        },
      },
    ];
    query.push(...query_extn);
    queries.push(query);
    let fileData = await Promise.all([
      DataCollection.aggregate(query_dataCollection),
      AnnualAccountData.aggregate(query),
    ]);
    fileData = [...fileData[0], ...fileData[1]];

    fileData.forEach((el) => {
      let fileName = `${el?.state}_${el?.ulbName}`;
      if (fileName.toLowerCase().includes(globalName.toLowerCase())) {
        totalCount++;
      }
    });
    return totalCount;
  } catch (error) {
    console.log(error, "in count dataset");
  }
}