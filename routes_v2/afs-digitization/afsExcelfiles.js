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

    // docType handling
    const docType = Array.isArray(req.body.docTypes)
      ? null
      : req.body.docType;

    let parentDoc;
    if (docType) {
      parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
      if (!parentDoc) {
        parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType, files: [] });
      }
    }

    //  Reset files array each time (replace old with new)
    parentDoc.files = [];

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
        parentDoc.files = []; // reset for safety
      }

      // Upload to S3
      const { s3Key, fileUrl } = await uploadAFSEXCELFileToS3({
        ulbId,
        financialYear,
        auditType,
        docType: currentDocType,
        file,
      });

      // uploadedBy logic
      let uploadedBy = "ULB";
      if (req.files.length === 2 && index === 1) {
        uploadedBy = "AFS";
      }

      parentDoc.files.push({
        s3Key,
        fileUrl,
        uploadedAt: new Date(),
        uploadedBy,
      });
    }

    await parentDoc.save();

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
