// controllers/afsExcelFileController.js
const multer = require("multer");
const AFSExcelFile = require("../../models/afsExcelfile");
const { uploadAFSEXCELFileToS3 } = require("../../service/s3-services");
const xlsx = require("xlsx");
const upload = multer(); // memory storage



module.exports.uploadAFSExcelFiles = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType, docType, excelLinks } = req.body;

    if (!excelLinks || excelLinks.length === 0) {
      return res.status(400).json({ success: false, message: "No Excel links provided" });
    }

    const links = Array.isArray(excelLinks) ? excelLinks : [excelLinks];

    let parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });
    if (!parentDoc) {
      parentDoc = new AFSExcelFile({ ulbId, financialYear, auditType, docType, files: [] });
    }
    // parentDoc.files = [];
    if (!Array.isArray(parentDoc.files)) parentDoc.files = [];


    // keywords to detect header rows
    const headerKeywords = ["Row ID", "Source", "Confidence Score", "Accuracy"];

    for (let i = 0; i < links.length; i++) {
      //  parse link object
      let linkObj;
      try {
        linkObj = JSON.parse(links[i]);
      } catch {
        linkObj = { url: links[i], requestId: null }; // fallback if plain string
      }

      const url = linkObj.url;
      const requestId = linkObj.requestId;
      const overallConfidenceScore = linkObj.confidenceScore || null;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch Excel from ${url}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      const file = {
        originalname: `digitized_${i}.xlsx`,
        buffer,
      };
   
      // Upload to S3
     

      const { s3Key, fileUrl } = await uploadAFSEXCELFileToS3({
        ulbId,
        financialYear,
        auditType,
        docType,
        file,
      });

      let uploadedBy = "ULB";
      // if (links.length === 2 && i === 1) uploadedBy = "AFS";
      if (linkObj.source === "AFS") uploadedBy = "AFS";

      // 👇 Excel → JSON (structured rows)
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

      if (!sheetData || sheetData.length === 0) {
        return res.status(400).json({ message: "Excel file is empty or invalid." });
      }

      const maxColLength = Math.max(...sheetData.map(row => row.length));
      const normalizedData = sheetData.map(row => {
        while (row.length < maxColLength) row.push("");
        return row;
      });

      // 🔍 find header row
      let headerRowIndex = -1;
      for (let r = 0; r < normalizedData.length; r++) {
        const rowStr = normalizedData[r].join(" ");
        if (headerKeywords.some(k => rowStr.includes(k))) {
          headerRowIndex = r;
          break;
        }
      }

      if (headerRowIndex === -1) {
        return res.status(400).json({ message: "No valid header row found in Excel." });
      }

      // pick headers
      const headers = normalizedData[headerRowIndex].map((h, idx) =>
        h && h.toString().trim() !== "" ? h.toString().trim() : `Column${idx + 1}`
      );

      // build formatted data after header
      const formattedData = normalizedData.slice(headerRowIndex + 1).map(row => {
        const rowItems = headers.map((header, idx) => ({
          title: header,
          value: row[idx] !== "" ? row[idx] : null,
        }));

        // add classification + page_number
        rowItems.push({ title: "classification", value: "other" });
        rowItems.push({ title: "page_number", value: 0 });

        return { row: rowItems };
      });
      // Remove old entry for same uploader (ULB/AFS)
      
      parentDoc.files = parentDoc.files.filter(f => f.uploadedBy !== uploadedBy);
      parentDoc.files.push({
        s3Key,
        fileUrl,
        requestId,
        uploadedAt: new Date(),
        uploadedBy,
        data: formattedData,
        overallConfidenceScore,
      });
    }
    parentDoc.files.sort((a, b) => {
      const order = { ULB: 0, AFS: 1 };
      const aVal = order[a.uploadedBy?.toUpperCase()] ?? 99;
      const bVal = order[b.uploadedBy?.toUpperCase()] ?? 99;
      return aVal - bVal;
    });
   
    await parentDoc.save();
    return res.json({ success: true, fileGroup: parentDoc });
  } catch (err) {
    console.error("Excel Upload error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
// Upload one or multiple Excel files old one-1
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


module.exports.saveRequestOnly = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType, docType, requestIds, failedSource } = req.body;

    if (!requestIds || requestIds.length === 0) {
      return res.status(400).json({ success: false, message: "No requestIds provided" });
    }

    // Determine who uploaded based on failedSource or fallback to ULB
    const uploader = failedSource?.toUpperCase() === "AFS" ? "AFS" : "ULB";

    // Build new file entries
    const newFiles = requestIds.map((reqId) => ({
      requestId: reqId,
      uploadedAt: new Date(),
      uploadedBy: uploader,
      fileUrl: "https://placeholder-link.com/none",
      s3Key: "placeholder-key",
      data: [],
    }));

    // Find or create the parent document
    let parentDoc = await AFSExcelFile.findOne({ ulbId, financialYear, auditType, docType });

    if (!parentDoc) {
      parentDoc = new AFSExcelFile({
        ulbId,
        financialYear,
        auditType,
        docType,
        files: newFiles,
      });
    } else {
      // Prevent duplicates based on requestId
      parentDoc.files = parentDoc.files.filter(f => f.uploadedBy !== uploader);
      parentDoc.files.push(...newFiles);
      
    }
    parentDoc.files.sort((a, b) => {
      const order = { ULB: 0, AFS: 1 };
      const aVal = order[a.uploadedBy?.toUpperCase()] ?? 99;
      const bVal = order[b.uploadedBy?.toUpperCase()] ?? 99;
      return aVal - bVal;
    });
    await parentDoc.save();

    return res.json({
      success: true,
      message: "Request IDs saved successfully",
      fileGroup: parentDoc,
    });
  } catch (err) {
    console.error("Save Request Only error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

