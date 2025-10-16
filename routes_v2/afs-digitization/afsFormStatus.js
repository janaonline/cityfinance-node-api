const mongoose = require("mongoose");
const AnnualAccountData = require("../../models/AnnualAccounts");
const { MASTER_STATUS } = require("../../util/FormNames");

const years = {
  "2017-18": "63735a4bd44534713673bfbf",
  "2018-19": "63735a5bd44534713673c1ca",
  "2019-20": "607697074dff55e6c0be33ba",
  "2020-21": "606aadac4dff55e6c075c507",
  "2021-22": "606aaf854dff55e6c075d219",
  "2022-23": "606aafb14dff55e6c075d3ae",
  "2023-24": "606aafc14dff55e6c075d3ec",
  "2024-25": "606aafcf4dff55e6c075d424",
  "2025-26": "606aafda4dff55e6c075d48f",
  "2026-27": "67d7d136d3d038946a5239e9",
};

function toUpperWithSpaces(str) {
  if (!str) return "";
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2") // add space before capital letters (if any camelCase)
    .replace(/[^a-zA-Z0-9]+/g, " ")      // replace non-alphanumeric with space
    .trim()
    .toUpperCase();
}


module.exports.getAFSFormStatusByULB = async (req, res) => {
  try {
    const { ulbId } = req.params;
    const { financialYear, auditType } = req.query;

    // Validate ULB
    if (!mongoose.Types.ObjectId.isValid(ulbId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ULB ID format",
      });
    }

    // Validate financialYear
    if (!years[financialYear]) {
      return res.status(400).json({
        success: false,
        message: `Invalid financialYear: ${financialYear}`,
      });
    }

    // Validate auditType
    if (!["audited", "unAudited"].includes(auditType)) {
      return res.status(400).json({
        success: false,
        message: "auditType must be either 'audited' or 'unAudited'",
      });
    }

    const yearId = new mongoose.Types.ObjectId(years[financialYear]);

    // query dynamically based on auditType
    const query = {
      ulb: ulbId,
      [`${auditType}.year`]: yearId,
    };

    const record = await AnnualAccountData.findOne(query, {
      currentFormStatus: 1,
      status: 1,
      actionTakenByRole: 1,
      createdAt: 1,
      modifiedAt: 1,
      ulbSubmit :1,
    }).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "No record found for given ULB, year, and audit type",
      });
    }

    let statusCode, statusText;

    if (record.status && typeof record.status === "string" && record.status.trim() !== "") {
      // case: status stored as text (Approved, Rejected, etc.)
      statusCode = null;

      // capitalize first letter properly
      const baseStatus = record.status.charAt(0).toUpperCase() + record.status.slice(1).toLowerCase();

      if (record.actionTakenByRole) {
        statusText = `${baseStatus} by ${record.actionTakenByRole}`;
      } else {
        statusText = baseStatus;
      }

    } else if (typeof record.currentFormStatus === "number") {
      // case: status stored as code
      statusCode = record.currentFormStatus;
      statusText =
        Object.keys(MASTER_STATUS).find(
          (key) => MASTER_STATUS[key] === statusCode
        ) || "Unknown Status";
    } else {
      statusCode = MASTER_STATUS["No Status"];
      statusText = "No Status";
    }

    statusText = toUpperWithSpaces(statusText);


    return res.status(200).json({
      success: true,
      data: {
        year: financialYear,
        auditType,
        statusCode,
        statusText,
        actionTakenByRole: record.actionTakenByRole || null,
        createdAt: record.createdAt || null,
        modifiedAt: record.modifiedAt || null,
        ulbSubmit: record.ulbSubmit || null,
      },
    });
  } catch (error) {
    console.error("AFS Form Status Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch form status",
    });
  }
};








module.exports.getAFSFormStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    const record = await AnnualAccountData.findById(id, {
      currentFormStatus: 1,
      status: 1,
    }).lean();

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Record not found",
      });
    }

    let statusCode, statusText;

    // 1. If status is a string like APPROVED/PENDING etc., use it directly
    if (record.status && typeof record.status === "string") {
      statusText = record.status;
      statusCode = null; // no numeric mapping needed
    } 
    // 2. Else, use currentFormStatus numeric mapping
    else if (typeof record.currentFormStatus === "number") {
      statusCode = record.currentFormStatus;
      statusText =
        Object.keys(MASTER_STATUS).find(
          (key) => MASTER_STATUS[key] === statusCode
        ) || "Unknown Status";
    } 
    // 3. Fallback
    else {
      statusCode = MASTER_STATUS["No Status"];
      statusText = "No Status";
    }

    return res.status(200).json({
      success: true,
      data: {
        statusCode,
        statusText,
      },
    });
  } catch (error) {
    console.error("AFS Form Status Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch form status",
    });
  }
};
