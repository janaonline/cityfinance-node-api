const FormsJson = require("../../models/FormsJson");
const BudgetDocument = require("../../models/budgetDocument");
const FiscalRanking = require("../../models/FiscalRankingMapper");
const Ulb = require("../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.getYearsData = async (req, res) => {
  try {
    const ulbId = req.query.ulb;
    console.log("Ulb ID:", ulbId);
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
    })
    console.log("Budget Document:", budgetDocument);
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
          budgetDoc.yearsData[index].files = incomingYear.files;
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
    // const data = await FiscalRanking.find({"type":"appAnnualBudget"}).select("ulb","year","file").lean();
    const data = await FiscalRanking.aggregate([
      {
        $match: {
          currentFormStatus: 11,
        },
      },
      {
        $project: {
          ulb: 1,
          design_year: 1,
        },
      },
      {
        $lookup: {
          from: "fiscalrankingmappers",
          localField: "ulb",
          foreignField: "ulb",
          as: "result",
        },
      },
      {
        $unwind: "$result",
      },
      {
        $match: {
          "result.type": "appAnnualBudget",
          "result.file.url": { $ne: "" },
        },
      },
      {
        $group: {
          _id: "$ulb",
          records: {
            $push: {
              year: "$design_year",
              file: "$result.file",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          ulb: "$_id",
          records: 1,
        },
      },
      {
        $count: "string",
      },
    ]);
    console.log("Data fetched:", data[0], "records");
    const transformed = data.map((entry) => ({
      ulb: ObjectId(entry._id),
      yearsData: entry.records.map((r) => ({
        source: "cfr",
        designYearId: r.year, // assuming year is an ObjectId or string ID
        designYear: r.year, // same as above; update if different
        currentFormStatus: 1,
        uploadedBy: ObjectId("5feeb4866d0d5e3765284b0c"),
        files: [
          {
            type: "pdf",
            value: r.file.url,
            name: r.file.name || "Annual Budget",
            createdAt: r.file.created_at || new Date(),
          },
        ],
      })),
    }));
    // console.log("Transformed Data:", transformed[0]);
    return res.status(200).json({
      status: true,
      message: "ULB list fetched successfully.",
      data: transformed,
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
    const formjson = await FormsJson.findOne({ formId:21.1 }).lean();
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
}
