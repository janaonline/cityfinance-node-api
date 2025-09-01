const multer = require("multer");
const AFSFile = require("../../models/afsFileupload");
const { uploadAFSFileToS3, getAFSFileStream } = require("../../service/s3-services");

const upload = multer(); // memory storage

// Upload or overwrite file
module.exports.uploadAFSFile = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType , docType } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    // Upload to S3
    const { s3Key, fileUrl } = await uploadAFSFileToS3({ ulbId, financialYear, auditType, docType, file: req.file });

    // Save metadata (overwrite if exists)
    const doc = await AFSFile.findOneAndUpdate(
      { ulbId, financialYear, auditType ,docType},
      { s3Key, fileUrl, uploadedAt: new Date() },
      { new: true, upsert: true }
    );

    return res.json({ success: true, file: doc });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports.getAFSFile = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType ,docType } = req.query;

    if (!ulbId || !financialYear || !auditType || !docType) {
      return res.status(400).json({ success: false, message: "Missing query params" });
    }

    const doc = await AFSFile.findOne({ ulbId, financialYear, auditType ,docType });
    if (!doc) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // 👇 Only return metadata + URL
    return res.json({
      success: true,
      file: {
        ulbId: doc.ulbId,
        financialYear: doc.financialYear,
        auditType: doc.auditType,
        docType: doc.docType,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
      },
    });
  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports.uploadMiddleware = upload.single("file");
