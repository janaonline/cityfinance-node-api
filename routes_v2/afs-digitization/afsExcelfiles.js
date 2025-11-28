// controllers/afsExcelFileController.js
const multer = require("multer");
const AFSExcelFile = require("../../models/afsExcelfile");
const { uploadAFSEXCELFileToS3 } = require("../../service/s3-services");
const xlsx = require("xlsx");
const upload = multer(); // memory storage
const fs = require("fs");
const path = require("path");
const Ulb = require("../../models/Ulb");
const State = require("../../models/State");


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


module.exports.generateFilteredExcel = async (req, res) => {
  try {
    const { ulbId, financialYear, auditType, docType } = req.query;

    if (!ulbId || !financialYear || !auditType || !docType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing query parameters" });
    }

    // 1) Fetch AFSExcelFile document
    const parentDoc = await AFSExcelFile.findOne({
      ulbId,
      financialYear,
      auditType,
      docType,
    });

    if (!parentDoc || !parentDoc.files?.length) {
      return res
        .status(404)
        .json({ success: false, message: "No Excel data found" });
    }

    // 2) Fetch ULB & State info
    const ulb = await Ulb.findById(ulbId).populate("state", "name");
    const ulbName = ulb?.name || "Unknown ULB";
    const stateName = ulb?.state?.name || "Unknown State";
    const ulbCode = ulb?.code || "N/A";

    // 3) Input JSON data (array of { row: [ {title, value}, ... ] })
    const jsonData = parentDoc.files[0].data;

    // 4) Filter rows based on “Particulars” containing fee/charge-like keywords
    // const keywords = ["charge", "fee", "permit", "fine", "penalt", "contribution", "user", "tax", "Tax"];
    const keywords = ["Fees for Certificates and extracts",
      "charge", "fee", "permit", "fine", "penalt", "contribution", "user","Tax",
      
"Regulation/Licencing fees",
"Development charges",
"Penalties, fines, regularisation fees and others",
"User charges",
"Miscellaneous charges",
"Empanelment & Registration Charges",
"Licensing Fees",
"Fees for Grant of Permit",
"Fees for Certificate or Extract",
"Regularisation Fees",
"Penalties and Fines",
"Other Fees",
"Entry Fees",
"Service / Administrative Charges",
"Other charges",
"Less Fee Remissions and Refund",
"Empanelment & Registralion Charges",
"Notice Fee",
"Warrant Fee",
"Water Connection/Disconnection Fee",
"Water Connection charge (24*7)",
"Property Tax Name Transfer Fee",
"Building Material-Disposal Fee",
"Encroachment Charges",
"Tenament Transfer Fee",
"Road Reinstatement Charges",
"Charges-Fire Service(Outside SMC Area)",
"Administrative Charge",
"Drainage Connection Fee",
"Cheque Return Charge",
"Tower Installation Charge",
"Drains and Wells Cleaning Fee",
"Road Reinstatement Charges (RCM)",
"Administrative Charge ( Labour Cess)",
"Chrgs for reg.of illegal conn.Nal se Jal",
"Health Service Charges and Fee",
"Analysis Fee (P.H.Laboratory)",
"Inspection Fee",
"Solid-Waste Dumping Charges",
"Birth/Death Registn. Fees (Inc.Late Fee)",
"Animal-Slaughtering/Market Fee",
"Charges-Corpse Carrying Fleet/Ambulance",
"Carcass Disposal Fee",
"Fees Right to information Act-2005",
"\"Appeal\" Fees Right to inform. Act-2005",
"Licence/Permit Fee",
"Registration/Copying Fees",
"Licence Fee Mobile Tower (RCM)",
"Other Charges And Fees",
"Chargs-Fire Services (OutSMCarea)GST Appl",
"Licence/Permit Fee (GST Applicable)",
"Pandal Fee (GST Applicable)",
"Other Charges/Fees Etc. (GST Applicable)",
"LicenceFee(HordFeeonPvt.Property)GST APP",
"Student's Fees",
"Visitor's Fee",
"Hostel Fees & Charges",
"Income Of Wind Power",
"Effluent Collection Charges",
"Income of Solar Power",
"Add. Infrastructure Charges (Paid F.S.I.)",
"Nur.Home/Hos/Lab/Diag.Cen Dup.C FormCer.",
"Nur.Home/Hos/Lab/Diag.CenReg./RenewalFee",
"Nur.Home/Hos/Lab/Diag.Cen Reg. Late Fee",
"Adv.LicFee(Hord/Adv.on Pvt.Property-RCM)",
"Parking Fees",
"Parking Penalty",
"Income From Public Places Entry Fess",
"Kids City Entry Fees",
"Zoo Entry Income",
"Municipal Corporation Right Income",
"Gift Income",
"Local Fund & Irrigation Cess/Grant",
"Water Connection Fees/Charges/Supply Charges",
"Name Transfer Fees",
"Agnishamak Vehicle Charge",
"Ambulence Charge",
"Medical Service Charge & Fees",
"Licence Fees",
"Permit Fees",
"Building & Plant Scrutiny Fees",
"Slaughter House Fees",
"Sample Testing Fees",
"School & College Fee",
"Birth & Death Registration Fees",
"Other Registration Fees",
"Stand Fees",
"Rasta Kapat Fees",
"Drainage Charges & Connection Fees",
"Copy & Comparing Fees",
"Betterment Charges",
"Extra F.S.I. Fees",
"F.S.I Fees under CBD",
"Withdrawl of Garbage Fees",
"Impact Fees Otherthan Parking",
"Fire Safety Charge & N.O.C. Limit",
"Tree Plantation Fees",
"Zonal Administrative Charges",
"Building Debris Rewnel Charges & Non T.P.& Betterment Charges",
"Impact Fees Parking",
"B.U. card fee and water meter fee charges",
"Admin Charges",
"BRTS Corridor FSI Charges",
"Training Fees",
"Licence/Lease Charges",
"Door to Door Waste Collection Charges",
"Other Charges & Fees",
"Shop Establishment & Renewal Charges",
"Fees & Fines",
"Fess and Arrear Amount under licence",
"Car Parking Fees",
"Water Supply - Fees from House Connection",
"Recovery Charges for discharge of effluent",
"House Drainage plan fees",
"Regularization Fees",
"Service/ Administrative Charges",
 "Certificates", "Licencing", "Development", "Penalties", "fines", "charges", "User", "Miscellaneous", 
  "Empanelment", "Licensing", "Grant", "Permit", "Regularisation", "Other", "Entry", "Administrative", 
  "Remissions", "Refund", "Notice", "Warrant", "Water Connection", "Property Tax", "Building Material", 
  "Encroachment", "Tenament", "Reinstatement", "Fire Service", "Administrative", "Drainage", "Cheque", 
  "Tower Installation", "Drains", "Health Service", "Analysis", "Inspection", "Solid-Waste", "Birth", 
  "Death", "Slaughtering", "Market", "Corpse", "Carcass", "Right to Information", "Appeal", "Licence", 
  "Registration", "Mobile Tower", "Other Fees", "Fire Services", "Pandal", "GST", "Student", "Visitor", 
  "Hostel", "Wind Power", "Effluent", "Solar Power", "Infrastructure", "Parking", "Kids City", "Zoo", 
  "Municipal", "Gift", "Irrigation", "Name Transfer", "Agnishamak", "Ambulance", "Medical Service", "Permit", 
  "Scrutiny", "Slaughter House", "Testing", "School", "College", "Registration", "Stand", "Rasta Kapat", 
  "Drainage Charges", "Betterment", "F.S.I.", "Garbage", "Impact Fees", "Safety", "Tree Plantation", 
  "Zonal", "Building Debris", "B.U. card", "BRTS", "Training", "Waste Collection", "Shop Establishment", 
  "Fines", "Arrear", "Car Parking", "House Connection", "Recovery", "Drainage Plan", "Regularization",
];

const textHeaders = [
  "particulars",
  "description",
  "details",
  "item particulars",
  "account head",
  "account",
  "head",
  "Administrative",
  "Support Departments",
  "Administrative & Support Departments",
  

];
const filteredRows = jsonData.filter((item) => {
  // find the actual column used by this city
  const textField = item.row.find((r) => {
    const title = (r.title || "").toLowerCase();
    return textHeaders.some(h => title.includes(h.toLowerCase()));
  });

  const value = (textField?.value ?? "").toString().toLowerCase();

  return keywords.some((k) => value.includes(k.toLowerCase()));
});

    if (filteredRows.length === 0) {
      return res.status(200).json({ success: true, message: "No matching rows found" });
    }

    // --- Helpers -----

    const toTokens = (s) =>
      (s || "")
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const overlapScore = (title, candidate) => {
      const t = new Set(toTokens(title));
      const c = toTokens(candidate);
      if (c.length === 0) return 0;
      let common = 0;
      for (const w of c) if (t.has(w)) common++;
      return common / c.length;
    };

    const extractYearFromTitle = (s) => {
      if (!s) return null;
      const m4 = String(s).match(/(?:\b|on\s*)(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/i);
      if (m4) return parseInt(m4[3], 10);
      const y = String(s).match(/\b(20\d{2}|19\d{2})\b/);
      return y ? parseInt(y[1], 10) : null;
    };

    const getFyEndYear = (fy) => {
      if (!fy) return null;
      const str = String(fy);
      const m = str.match(/(20\d{2})\s*[-/–]\s*(\d{2}|\d{4})/);
      if (m) {
        const start = parseInt(m[1], 10);
        const tail = m[2].length === 2 ? 2000 + parseInt(m[2], 10) : parseInt(m[2], 10);
        return Math.max(start, tail);
      }
      const lone = str.match(/\b(20\d{2}|19\d{2})\b/);
      return lone ? parseInt(lone[1], 10) : null;
    };

    const getValueByYear = (item, year) => {
      if (!year) return "";
      for (const cell of item.row) {
        const y = extractYearFromTitle(cell.title);
        if (y === year) return cell.value ?? "";
      }
      return "";
    };

    const inferCurrentPrevByExtremes = (item) => {
      const years = [];
      for (const cell of item.row) {
        const y = extractYearFromTitle(cell.title);
        if (y) years.push(y);
      }
      const uniq = Array.from(new Set(years)).sort((a, b) => a - b);
      if (uniq.length >= 2) {
        const minY = uniq[0];
        const maxY = uniq[uniq.length - 1];
        const currentYearValue = getValueByYear(item, maxY);
        const previousYearValue = getValueByYear(item, minY);
        return { currentYearValue, previousYearValue };
      }
      return { currentYearValue: "", previousYearValue: "" };
    };

    const getByCandidates = (item, candidates, minScore = 0.5, opts = {}) => {
      let best = { score: 0, value: "" };

      for (const cell of item.row) {
        for (const cand of candidates) {
          const score = overlapScore(cell.title || "", cand);
          if (score > best.score) best = { score, value: cell.value ?? "" };
        }
      }

      if (best.score >= minScore) return best.value ?? "";

      const fyEnd = getFyEndYear(opts.financialYear);

      if (candidates === CANDIDATES.currentYear) {
        const byFy = getValueByYear(item, fyEnd);
        if (byFy !== "") return byFy;
        const inferred = inferCurrentPrevByExtremes(item);
        if (inferred.currentYearValue !== "") return inferred.currentYearValue;
      }

      if (candidates === CANDIDATES.previousYear) {
        const byFyMinus1 = getValueByYear(item, fyEnd ? fyEnd - 1 : null);
        if (byFyMinus1 !== "") return byFyMinus1;
        const inferred = inferCurrentPrevByExtremes(item);
        if (inferred.previousYearValue !== "") return inferred.previousYearValue;
      }

      if (candidates === CANDIDATES.currentYear) {
        const hit = item.row.find((r) => {
          const t = toTokens(r.title);
          return t.includes("current") && (t.includes("year") || t.includes("yr"));
        });
        if (hit) return hit.value ?? "";
      }

      if (candidates === CANDIDATES.previousYear) {
        const hit = item.row.find((r) => {
          const t = toTokens(r.title);
          return (
            (t.includes("previous") || t.includes("prior") || t.includes("prev")) &&
            (t.includes("year") || t.includes("yr"))
          );
        });
        if (hit) return hit.value ?? "";
      }

      return "";
    };

    const CANDIDATES = {
      account: [
        "account code/ schedule no/ sch no/code/code no",
        "account code",
        "schedule no",
        "sch no",
        "code",
        "code no",

      ],
      particulars: ["particulars", "description", "details", "item particulars",
       "ACCOUNT HEAD",
       "account","head"],
      currentYear: [
        "current year",
        "amount current year",
        "amount & date (current year)",
        "amount (current year)",
        "current year amount",
        "cy amount",
        "amount cy",
        "cur year amount",
        "current yr amount",
        "curr year",
        "curr yr",
      ],
      previousYear: [
        "previous year",
        "amount previous year",
        "amount & date (previous year)",
        "amount (previous year)",
        "previous year amount",
        "py amount",
        "amount py",
        "prev year amount",
        "prior year amount",
        "prev yr",
        "prior yr",
      ],
    };

    // Build Sheet 

    const TITLE = "Fees & User Charges - Income - Head Wise - 140";
    const TEMPLATE_HEADERS = [
      "ULB Code",
      "ULB Name",
      "State Name",
      "Audited Year",
      "Account code/ Schedule No/ Sch No/Code/Code No",
      "Particulars",
      "Current Year",
      "Previous Year",
    ];

    const sheetData = [];
    // Row 1: put TITLES — main title over Particulars (E1), and "Amount in rupees" over F1, G1
    sheetData.push(["", "", "", "", "", TITLE, "Amount in rupees", "Amount in rupees"]); // A1..G1

    // Row 2: headers
    sheetData.push(TEMPLATE_HEADERS);

    // Data rows
    filteredRows.forEach((item) => {
      const row = [
        ulbCode,
        ulbName,
        stateName,
        financialYear,
        getByCandidates(item, CANDIDATES.account, 0.5, { financialYear }),
        getByCandidates(item, CANDIDATES.particulars, 0.5, { financialYear }),
        getByCandidates(item, CANDIDATES.currentYear, 0.5, { financialYear }),
        getByCandidates(item, CANDIDATES.previousYear, 0.5, { financialYear }),
      ];
      sheetData.push(row);
    });

    // Create worksheet
    const ws = xlsx.utils.aoa_to_sheet(sheetData);

    // Freeze panes so row 1-2 stay visible (titles + headers)
    ws["!freeze"] = { xSplit: 0, ySplit: 2 };

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, // ULB Code
      { wch: 25 }, // ULB Name
      { wch: 20 }, // State Name
      { wch: 14 }, // Audited Year
      { wch: 38 }, // Account code/...
      { wch: 35 }, // Particulars (title sits above this)
      { wch: 18 }, // Current Year
      { wch: 18 }, // Previous Year
    ];

    // Styling
    // Many community builds ignore styles; safe to set anyway.
    const dataFontSize = 10;            // base size for data
    const headerFontSize = dataFontSize + 2;

    const range = xlsx.utils.decode_range(ws["!ref"]);

    // Bold + larger font for header row (Row 2 = index 1)
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = xlsx.utils.encode_cell({ r: 1, c });
      if (!ws[cellRef]) continue;
      ws[cellRef].s = ws[cellRef].s || {};
      ws[cellRef].s.font = { bold: true, sz: headerFontSize };
      ws[cellRef].s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
    }

    // Title row (Row 1 = index 0): bold; keep same font size as headers or a bit larger if you prefer
    const titleCells = ["E1", "F1", "G1"];
    for (const ref of titleCells) {
      if (!ws[ref]) continue;
      ws[ref].s = ws[ref].s || {};
      ws[ref].s.font = { bold: true, sz: headerFontSize };
      ws[ref].s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
    }

    // Data rows: ensure a consistent (smaller) font and left/right alignment as appropriate
    for (let r = 2; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const ref = xlsx.utils.encode_cell({ r, c });
        if (!ws[ref]) continue;
        ws[ref].s = ws[ref].s || {};
        ws[ref].s.font = { sz: dataFontSize };
        // Right align numeric columns (F,G) — basic heuristic
        const isAmountCol = c === 5 || c === 6;
        ws[ref].s.alignment = {
          vertical: "center",
          horizontal: isAmountCol ? "right" : "left",
          wrapText: true,
        };
      }
    }

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Filtered Data");

    // Write & send
    const outputDir = path.join(__dirname, "../../../tmp");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, `filtered_${ulbId}_${Date.now()}.xlsx`);
    xlsx.writeFile(wb, filePath);

    res.download(filePath, (err) => {
      if (err) {
        console.error("Download error:", err);
        return res.status(500).json({ success: false, message: "Failed to download file" });
      }
      setTimeout(() => {
        try { fs.unlinkSync(filePath); } catch { }
      }, 10000);
    });
  } catch (err) {
    console.error("Generate Excel Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
