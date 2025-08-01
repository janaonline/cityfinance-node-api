const FormsJson = require("../../models/FormsJson");
const BudgetDocument = require("../../models/budgetDocument");
const FiscalRanking = require("../../models/FiscalRanking");
const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const ExcelJS = require("exceljs");
const moment = require("moment");
const { getDesiredYear } = require('../../service/years');
const { MASTER_STATUS_ID } = require('../../util/FormNames');
const { getPopulationCategory } = require('../common/common');
const SEQUENCE = {
  '2020-21': 6,
  '2021-22': 7,
  '2022-23': 8,
  '2023-24': 9,
  '2024-25': 10,
  '2025-26': 11,
}

module.exports.getYearsData = async (req, res) => {
  try {
    const ulbId = req.query.ulb;
    // console.log("Ulb ID:", ulbId);
    if (!ulbId) {
      return res.status(400).json({
        status: false,
        message: "ulbId is required.",
        data: "",
      });
    }
    const formjson = await FormsJson.findOne({ formId: 21 }).lean();
    if (!formjson) {
      return res.status(404).json({
        status: false,
        message: "No data found for the specified formId",
        data: "",
      });
    }
    const budgetDocument = await BudgetDocument.findOne({
      ulb: ObjectId(ulbId),
    });
    // console.log("Budget Document:", budgetDocument);
    const budgetYearsMap = {};
    if (budgetDocument?.yearsData?.length) {
      for (const yearEntry of budgetDocument.yearsData) {
        budgetYearsMap[yearEntry.designYear] = yearEntry;
      }
    }

    // Replace matching years in formjson with enriched budget data
    const mergedYearsData = formjson.yearsData.map((year) => {
      const match = budgetYearsMap[year.designYear];
      return match ? match : year;
    });

    formjson.yearsData = mergedYearsData;

    return res.status(200).json({
      status: true,
      message: "Years status data",
      data: formjson.yearsData,
    });
  } catch (error) {
    console.error("Error: ", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};

module.exports.updatePdfs = async (req, res) => {
  try {
    const ulbId = req.query.ulb;
    const incomingYearsData = req.body.yearsData;

    if (!ulbId || !Array.isArray(incomingYearsData)) {
      return res.status(400).json({
        status: false,
        message: "ulbId and valid yearsData[] are required.",
      });
    }

    let budgetDoc = await BudgetDocument.findOne({ ulb: ObjectId(ulbId) });

    if (!budgetDoc) {
      budgetDoc = new BudgetDocument({
        ulb: ObjectId(ulbId),
        yearsData: incomingYearsData,
      });
    } else {
      for (const incomingYear of incomingYearsData) {
        const index = budgetDoc.yearsData.findIndex(
          (y) => y.designYearId?.toString() === incomingYear.designYearId
        );

        if (index !== -1) {
          budgetDoc.yearsData[index].files.push(...incomingYear.files);
        } else {
          budgetDoc.yearsData.push(incomingYear);
        }
      }
    }

    // 4. Save changes
    await budgetDoc.save();

    return res.status(200).json({
      status: true,
      message: "PDFs updated successfully.",
      data: budgetDoc,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};

module.exports.convertJson = async (req, res) => {
  try {
    if (req.decoded?.role !== 'ADMIN') {
      throw new Error('Access denied. Please log in with an Admin account.');
    }

    // Delete all the CFR records from Budget collection.
    const cfrFilesRemoved = await BudgetDocument.updateMany(
      {},
      { $pull: { yearsData: { "files.source": "cfr" } } }
    );

    // Fetch Budget URLs from CFR collection.
    const query = [
      // {
      // $match: {
      // currentFormStatus: 11,
      //     ulb: ObjectId("5dd24728437ba31f7eb42e79")
      //   }
      // },
      {
        $project: {
          ulb: 1,
          design_year: 1,
          modifiedAt: 1,
          currentFormStatus: 1
        }
      },
      {
        $lookup: {
          from: "fiscalrankingmappers",
          localField: "ulb",
          foreignField: "ulb",
          as: "result"
        }
      },
      {
        $unwind: "$result"
      },
      {
        $match: {
          "result.type": "appAnnualBudget",
          "result.file.url": {
            $ne: ""
          }
        }
      },
      {
        $group: {
          _id: "$ulb",
          modifiedAt: { $first: '$modifiedAt' },
          currentFormStatus: { $first: '$currentFormStatus' },
          records: {
            $push: {
              year: "$result.year",
              file: "$result.file"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          ulb: "$_id",
          modifiedAt: "$modifiedAt",
          currentFormStatus: "$currentFormStatus",
          records: 1
        }
      }
    ];
    const data = await FiscalRanking.aggregate(query).exec();

    // Transform CFR collection data into the structure required by the Budget collection.    
    const transformed = {};
    data.forEach((entry) => {
      const ulbId = entry.ulb;
      const ulbObjectId = ObjectId(ulbId);

      if (!transformed[ulbId]) {
        transformed[ulbId] = { yearsData: {} };
      }

      entry.records.forEach((r) => {
        const desiredYear = getDesiredYear(r.year);
        const designYearId = r.year;

        transformed[ulbId].yearsData[designYearId] = {
          designYearId,
          designYear: desiredYear.yearName,
          sequence: SEQUENCE[desiredYear.yearName],
          uploadedBy: ObjectId("5feeb4866d0d5e3765284b0c"),
          files: [
            {
              currentFormStatus: entry.currentFormStatus,
              source: "cfr",
              type: "pdf",
              url: r.file.url,
              name: r.file.name || "Annual Budget",
              createdAt: new Date(entry.modifiedAt) || new Date(),
            },
          ],
        };
      });
    });

    // Loop over transformed data (CFR data) and update in Budget collection.
    const yearlyStats = {}; // { updateCount, modifiedCount }

    for (const [ulbId, data] of Object.entries(transformed)) {
      const ulbObjectId = ObjectId(ulbId);

      for (const [yearId, budgetData] of Object.entries(data.yearsData)) {
        const designYearObjectId = ObjectId(yearId);

        // Initialize stats for the year if not present
        if (!yearlyStats[yearId]) {
          yearlyStats[yearId] = {
            updateCount: 0,
            modifiedCount: 0,
          };
        }

        const searchCondition = {
          ulb: ulbObjectId,
          'yearsData.designYearId': designYearObjectId,
        };

        // Check if this year exists
        const existing = await BudgetDocument.findOne(searchCondition, { 'yearsData.$': 1 });

        let updateResult;

        if (existing && existing.yearsData?.length > 0) {
          // Update files in existing year
          updateResult = await BudgetDocument.updateOne(
            searchCondition,
            { $push: { 'yearsData.$.files': { $each: budgetData.files } } }
          );
        } else {
          // Add a new year entry
          updateResult = await BudgetDocument.updateOne(
            { ulb: ulbObjectId },
            {
              $push: {
                yearsData: {
                  ...budgetData,
                  designYearId: designYearObjectId,
                },
              },
            },
            { upsert: true }
          );
        }

        // Update stats
        yearlyStats[yearId].updateCount += 1;
        if (updateResult.modifiedCount > 0) {
          yearlyStats[yearId].modifiedCount += 1;
        }
      }
    }

    return res.status(200).json({
      status: true,
      message: "Budget data updated successfully.",
      data: yearlyStats,
      cfrFilesRemoved: cfrFilesRemoved.n,
    });


  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};

module.exports.getValidations = async (req, res) => {
  try {
    const formjson = await FormsJson.findOne({ formId: 21.1 }).lean();
    if (!formjson) {
      return res.status(404).json({
        status: false,
        message: "No data found for the specified formId",
        data: "",
      });
    }
    return res.status(200).json({
      status: true,
      message: "Validations fetched successfully.",
      data: formjson || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};

module.exports.uploadDataPDF = async (req, res) => {
  try {
    const ulbDataArray = req.body;

    if (!Array.isArray(ulbDataArray)) {
      return res.status(400).json({
        status: false,
        message: "'ulb' must be an array.",
        data: [],
      });
    }

    const responseLog = [];
    for (const ulbItem of ulbDataArray) {
      const { ulbId, yearsData } = ulbItem;
      const existingDoc = await BudgetDocument.findOne({ ulb: ulbId });

      if (existingDoc) {
        // CASE 1: BudgetDocument exists
        let modified = false;

        for (const newYear of yearsData) {
          const existingYear = existingDoc.yearsData.find(
            (y) => y.designYear === newYear.designYear
          );

          if (existingYear) {
            for (const newFile of newYear.files) {
              const preparedFile = {
                ...newFile,
                createdAt: new Date(newFile.created_at || Date.now()),
              };

              if (newFile.source === "dni") {
                const existingDniFile = existingYear.files.find(
                  (f) => f.source === "dni"
                );
                if (existingDniFile) {
                  // Update existing DNI file
                  existingDniFile.url = newFile.url;
                  existingDniFile.name = newFile.name;
                  existingDniFile.createdAt = preparedFile.createdAt;
                  modified = true;
                  continue; // skip pushing new
                }
              }

              // Push file if not DNI or no existing match
              existingYear.files.push(preparedFile);
              modified = true;
            }
          } else {
            // 🔁 Add new yearData block
            existingDoc.yearsData.push({
              ...newYear,
              files: newYear.files.map((file) => ({
                ...file,
                createdAt: new Date(file.created_at || Date.now()),
              })),
            });
            modified = true;
          }
        }

        if (modified) {
          await existingDoc.save();
          responseLog.push({ ulbId, status: "updated" });
        } else {
          responseLog.push({ ulbId, status: "no change" });
        }
      } else {
        // CASE 2: No BudgetDocument — create a new one
        const newDoc = new BudgetDocument({
          ulb: ulbId,
          yearsData: yearsData.map((yd) => ({
            ...yd,
            files: yd.files.map((file) => ({
              ...file,
              createdAt: new Date(file.created_at || Date.now()),
            })),
          })),
        });

        await newDoc.save();
        responseLog.push({ ulbId, status: "created" });
      }
    }

    return res.status(200).json({
      status: true,
      message: "ULB data processed successfully.",
      result: responseLog,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};
module.exports.getUlbList = async (req, res) => {
  try {
    const codes = Array.isArray(req.query.code)
      ? req.query.code
      : [req.query.code];
    const ulbList = await Ulb.find({ code: { $in: codes } })
      .select("_id name")
      .lean();
    if (!ulbList || ulbList.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No ULBs found.",
        data: [],
      });
    }
    return res.status(200).json({
      status: true,
      message: "ULB list fetched successfully.",
      data: ulbList,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: [],
    });
  }
};

module.exports.getYearEmptyData = async (req, res) => {
  try {
    const yearsData = req.query.yearsData;
    const formsJson = await FormsJson.findOne({ formId: 21 }).lean();
    if (!formsJson) {
      return res.status(404).json({
        status: false,
        message: "No data found for the specified formId",
        data: "",
      });
    }
    const result = formsJson.yearsData.find(
      (item) => item.designYear === yearsData
    );
    return res.status(200).json({
      status: true,
      message: "Year empty data fetched successfully.",
      data: result || [],
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
      data: "",
    });
  }
};
module.exports.downloadDump = async (req, res) => {
  try {
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ULB Budget Dump");

    // Define headers
    worksheet.columns = [
      { header: "ULB Code", key: "code", width: 15 },
      { header: "ULB Name", key: "ulbName", width: 30 },
      { header: "State", key: "state", width: 20 },
      { header: "Census Code", key: "censusCode", width: 15 },
      { header: "Population", key: "population", width: 15 },
      { header: "Population Category", key: "popCat", width: 15 },
      { header: "Budget Year", key: "budgetYear", width: 15 },
      { header: "Date of submission", key: "createdAt", width: 25 },
      { header: "Source", key: "source", width: 10 },
      { header: "Form Status", key: "currentFormStatus", width: 10 },
      { header: "File Type", key: "ftype", width: 10 },
      { header: "Budget URL", key: "url", width: 50 },
    ];

    // Get data from DB - cursor().
    const cursorInputData = await BudgetDocument.aggregate([
      {
        $lookup: {
          from: "ulbs",
          let: { ulbId: "$ulb" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$ulbId"] }, isPublish: true } },
            {
              $lookup: {
                from: "states",
                let: { stateId: "$state" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$stateId"] } } },
                  { $project: { _id: 0, name: 1 } },
                ],
                as: "stateData",
              },
            },
            {
              $project: {
                name: 1,
                population: 1,
                censusCode: 1,
                code: 1,
                sbCode: 1,
                state: { $arrayElemAt: ["$stateData.name", 0] }, // avoid $unwind
              },
            },
          ],
          as: "ulbInfo",
        },
      },
      { $unwind: "$ulbInfo" },
      {
        $unwind: {
          path: "$yearsData",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $unwind: {
          path: "$yearsData.files",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          code: "$ulbInfo.code",
          ulbName: "$ulbInfo.name",
          state: "$ulbInfo.state",
          censusCode: {
            $ifNull: ["$ulbInfo.censusCode", "$ulbInfo.sbCode"],
          },
          population: "$ulbInfo.population",
          budgetYear: "$yearsData.designYear",
          budgetSource: "$yearsData.files.source",
          budgetUrl: "$yearsData.files.url",
          currentFormStatus: "$yearsData.files.currentFormStatus",
          type: "$yearsData.files.type",
          createdAt: "$yearsData.files.createdAt",
        },
      },
    ])
      .cursor()
      .exec();

    for (
      let doc = await cursorInputData.next();
      doc != null;
      doc = await cursorInputData.next()
    ) {
      switch (doc["budgetSource"]) {
        case "cfr":
          doc["source"] = "CFR";
          break;
        case "dni":
          doc["source"] = "D&I";
          break;
        case "ulb":
          doc["source"] = "ULB";
          break;
      }

      doc["url"] =
        doc["type"] === "url"
          ? doc["budgetUrl"]
          : `${process.env.AWS_STORAGE_URL_PROD}${doc["budgetUrl"]}`;
      doc["ftype"] = doc["type"] === "url" ? "URL" : "PDF";
      doc["popCat"] = getPopulationCategory(doc["population"]);
      
      // Only for CFR take status from MASTER_STATUS_ID;
      let formStatus = 'Submitted';
      if (doc['budgetSource'] === 'cfr' && 'currentFormStatus' in doc) {
        formStatus = MASTER_STATUS_ID[doc["currentFormStatus"]];
      }

      doc["currentFormStatus"] = formStatus;

      worksheet.addRow(doc);
    }

    const filename = "ULB_Budget_Dump";
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.xlsx`
    );
    res.send(buffer);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate Excel dump",
      error: error.message,
    });
  }
};