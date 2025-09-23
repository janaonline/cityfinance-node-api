// controllers/afsExcelFileController.js
const multer = require("multer");
const AFSExcelFile = require("../../models/afsExcelfile");
const { uploadAFSEXCELFileToS3 } = require("../../service/s3-services");

const upload = multer(); // memory storage

// Upload one or multiple Excel files
// module.exports.uploadAFSExcelFiles = async (req, res) => {
//   try {
//     const { ulbId, financialYear, auditType } = req.body;

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ success: false, message: "No file uploaded" });
//     }

//     // docType handling
//     const docType = Array.isArray(req.body.docTypes)
//       ? null
//       : req.body.docType;

//     let parentDoc;
//     if (docType) {
//       parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
//       if (!parentDoc) {
//         parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType, files: [] });
//       }
//     }

//     //  Reset files array each time (replace old with new)
//     parentDoc.files = [];

//     // Upload each file
//     for (const [index, file] of req.files.entries()) {
//       const currentDocType = Array.isArray(req.body.docTypes)
//         ? req.body.docTypes[index]
//         : docType;

//       if (!currentDocType) {
//         return res.status(400).json({ success: false, message: "Missing docType for one file" });
//       }

//       // Ensure parentDoc exists for this docType
//       if (!parentDoc || parentDoc.docType !== currentDocType) {
//         parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType: currentDocType });
//         if (!parentDoc) {
//           parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType: currentDocType, files: [] });
//         }
//         parentDoc.files = []; // reset for safety
//       }

//       // Upload to S3
//       const { s3Key, fileUrl } = await uploadAFSEXCELFileToS3({
//         ulbId,
//         financialYear,
//         auditType,
//         docType: currentDocType,
//         file,
//       });

//       // uploadedBy logic
//       let uploadedBy = "ULB";
//       if (req.files.length === 2 && index === 1) {
//         uploadedBy = "AFS";
//       }

//       parentDoc.files.push({
//         s3Key,
//         fileUrl,
//         uploadedAt: new Date(),
//         uploadedBy,
//       });
//     }

//     await parentDoc.save();

//     return res.json({ success: true, fileGroup: parentDoc });
//   } catch (err) {
//     console.error("Excel Upload error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };
module.exports.uploadAFSExcelFiles = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType, docType, excelLinks } = req.body;

    if (!excelLinks || excelLinks.length === 0) {
      return res.status(400).json({ success: false, message: "No Excel links provided" });
    }

    // Normalize: ensure array
    const links = Array.isArray(excelLinks) ? excelLinks : [excelLinks];

    // find or create parentDoc
    let parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
    if (!parentDoc) {
      parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType, files: [] });
    }
    parentDoc.files = []; // reset each upload

    // loop through Excel links
    for (let i = 0; i < links.length; i++) {
      const url = links[i];

      // download Excel file from S3 link
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch Excel from ${url}, status: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      // fake a "file" object for your S3 util
      const file = {
        originalname: `digitized_${i}.xlsx`,
        buffer,
      };

      // Upload to S3 (your existing util)
      const { s3Key, fileUrl } = await uploadAFSEXCELFileToS3({
        ulbId,
        financialYear,
        auditType,
        docType,
        file,
      });

      let uploadedBy = "ULB";
      if (links.length === 2 && i === 1) {
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
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
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
