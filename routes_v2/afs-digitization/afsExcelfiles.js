// controllers/afsExcelFileController.js
const multer = require("multer");
const AFSExcelFile = require("../../models/afsExcelfile");
const { uploadAFSEXCELFileToS3 } = require("../../service/s3-services");

const upload = multer(); // memory storage

// Upload one or multiple Excel files
module.exports.uploadAFSExcelFiles = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Find or create the parent doc (per ulbId, financialYear, auditType, docType)
    const docType = Array.isArray(req.body.docTypes)
      ? null // handled per-file below
      : req.body.docType;

    let parentDoc;
    if (docType) {
      parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
      if (!parentDoc) {
        parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType, files: [] });
      }
    }

    // Upload each file
    for (const [index, file] of req.files.entries()) {
      const currentDocType = Array.isArray(req.body.docTypes)
        ? req.body.docTypes[index]
        : docType;

      if (!currentDocType) {
        return res.status(400).json({ success: false, message: "Missing docType for one file" });
      }

      // Ensure parentDoc exists for this docType
      if (!parentDoc || parentDoc.docType !== currentDocType) {
        parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType: currentDocType });
        if (!parentDoc) {
          parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType: currentDocType, files: [] });
        }
      }

      // Upload to S3
      const { s3Key, fileUrl } = await uploadAFSEXCELFileToS3({
        ulbId,
        financialYear,
        auditType,
        docType: currentDocType,
        file,
      });

      // Push file metadata
      parentDoc.files.push({ s3Key, fileUrl, uploadedAt: new Date() });
      await parentDoc.save();
    }

    return res.json({ success: true, fileGroup: parentDoc });
  } catch (err) {
    console.error("Excel Upload error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Fetch Excel file metadata (all files by docType)
module.exports.getAFSExcelFile = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType, docType } = req.query;

    if (!ulbId || !financialYear || !auditType || !docType) {
      return res.status(400).json({ success: false, message: "Missing query params" });
    }

    const doc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
    if (!doc) {
      return res.status(404).json({ success: false, message: "Files not found" });
    }

    return res.json({ success: true, fileGroup: doc });
  } catch (err) {
    console.error("Excel Fetch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Multer middleware for multiple uploads
module.exports.uploadExcelMiddleware = upload.array("files", 10);
