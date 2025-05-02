const moment = require('moment');
const xlstojson = require('xls-to-json-lc');
const xlsxtojson = require('xlsx-to-json-lc');
const xlsx = require('xlsx');
const ObjectId = require('mongoose').Types.ObjectId;
const Redis = require('../../service/redis');
const downloadFileToDisk = require('../file-upload/service').downloadFileToDisk;
const CONSTANTS = require('../../_helper/constants');
const RequestLog = require('../../models/RequestLog');
const State = require('../../models/State');
const Ulb = require('../../models/Ulb');
const LineItem = require('../../models/LineItem');
const UlbLedger = require('../../models/UlbLedger');
const LedgerLog = require('../../models/LedgerLog');
const { clearCacheByType } = require('../../service/cacheService');

const overViewSheet = {
  'State Code': 'state_code',
  'Name of the state': 'state',
  'ULB Code': 'ulb_code',
  'Name of the ULB': 'ulb',
  'Financial Year': 'year',
  'Audit Status': 'audit_status',
  'Audit Firm Name': 'audit_firm',
  'Audit Date': 'audit_date',
  'Name of the Partner': 'partner_name',
  'ICAI Membership Number': 'icai_membership_number',
  'Document source': 'doc_source',
  'Date of Entry': 'created_at',
  'Entered by': 'created_by',
  'Date of verification': 'verified_at',
  'Verified by': 'verified_by',
  'Date of Re-verification': 'reverified_at',
  'Re-verified by': 'reverified_by',
  'Can the raw file be standardised?': 'isStandardizable',
  'Comments on File Completeness': 'isStandardizableComment',
  'Count of Data Flags failed': 'dataFlag',
  'General comment': 'dataFlagComment',
};
const inputHeader = ['Head of Account', 'Code', 'Line Item', 'Amount in INR'];
const overviewHeader = ['Basic Details', 'Value'];
const balanceSheet = {
  liabilityAdd: [
    '310',
    '311',
    '312',
    '320',
    '330',
    '331',
    '340',
    '341',
    '350',
    '360',
    '300',
  ],
  assetsAdd: [
    '410',
    '411',
    '412',
    '420',
    '421',
    '430',
    '431',
    '432',
    '440',
    '450',
    '460',
    '461',
    '470',
    '480',
    '400',
  ],
};

module.exports = async function (req, res) {
  try {
    const user = req.decoded;
    const data = req.body;
    const financialYear = req.body.financialYear;

    if (!user) throw new Error('User Not Found!');
    else if (!financialYear) throw new Error('Financial Year is required!');
    else {
      downloadFileToDisk(req.body.alias, async (err, file) => {
        if (err) throw new Error(err.message);
        else if (!file) throw new Error('File not available');
        else {
          let design_year;
          let query = { url: req.body.alias, financialYear: financialYear };

          if (
            data.design_year &&
            data.design_year != '' &&
            user.role === 'ULB'
          ) {
            design_year = data.design_year;
            Object.assign(query, {
              design_year: ObjectId(design_year),
              ulb: ObjectId(user.ulb),
            });
          }

          const reqLog = await RequestLog.findOne(query);

          if (!reqLog) {
            let requestLog = new RequestLog({
              user: req.decoded ? ObjectId(req.decoded._id) : null,
              url: req.body.alias,
              message: 'Data Processing',
              financialYear: financialYear,
              design_year:
                data.design_year && user.role === 'ULB'
                  ? ObjectId(design_year)
                  : undefined,
              ulb: user.role === 'ULB' ? ObjectId(user.ulb) : undefined,
            });
            requestLog.save(async (err, data) => {
              if (err) throw new Error(err.message);
              else {
                await processData(
                  req.body.alias,
                  file,
                  financialYear,
                  data._id,
                  design_year,
                  user
                );
                return res.status(200).json({
                  timestamp: moment().unix(),
                  success: true,
                  message: `Request recieved.`,
                  data: data,
                });
              }
            });
          } else {
            return res.status(400).json({
              timestamp: moment().unix(),
              success: false,
              message: reqLog.completed
                ? `Already processed.`
                : `Already in process.`,
              data: reqLog,
            });
          }
        }
      });
    }
  } catch (e) {
    return res.json({
      timestamp: moment().unix(),
      success: false,
      message: e.message,
    });
  }
};

// Process the data from the excel file.
async function processData(
  url,
  reqFile,
  financialYear,
  reqId,
  design_year,
  user
) {
  try {
    let fullFileName = url
      ? url.split('/').length
        ? url.split('/')[url.split('/').length - 1]
        : url.split('/')[0]
      : null;
    let fileName = fullFileName.split('_');
    fileName.pop();
    fileName = fileName.join('_');

    // Extract the overviewSheet and dataSheet
    let { overviewSheet, dataSheet } = await readXlsxFile(
      reqFile,
      design_year,
      user.role
    );

    // Validate overview sheet
    let objOfSheet = {};
    if (overviewSheet != null) {
      objOfSheet = await validateOverview(
        overviewSheet,
        financialYear,
        fileName
      );
    } else if (overviewSheet == null) {
      objOfSheet = {
        ulb_id: ObjectId(user.ulb),
        financialYear: financialYear,
        design_year: ObjectId(design_year),
      };
    }

    let query;
    let du = {};
    if (user.role != 'ULB' && !design_year) {
      delete objOfSheet['state'];
      objOfSheet['state'] = objOfSheet.state_name;
      query = { ulb_code_year: objOfSheet.ulb_code_year };

      du = {};
      du = {
        query,
        update: Object.assign({ lastModifiedAt: new Date() }, objOfSheet),
        options: {
          upsert: true,
          setDefaultsOnInsert: true,
          new: true,
          runValidators: true,
        },
      };
      delete du.update._id;
      delete du.update.__v;
    } else if (user.role === 'ULB' && design_year) {
      query = {
        ulb_id: ObjectId(user.ulb),
        financialYear: financialYear,
        design_year: ObjectId(design_year),
      };
    }

    // Check Input sheet only if "isStandardizable === Yes" or if ULB is filling the standardized excel.
    if (objOfSheet.isStandardizable === 'Yes' || user.role === 'ULB') {
      // validate the input sheet data, like validating balance sheet, removing empty line items, removing comma seprations, converting negative values etc.
      let inputDataArr = await validateData(
        dataSheet,
        objOfSheet,
        design_year,
        user,
        financialYear
      ); //  return line item data array
      let inputDataArrSuccessCounter = 0;
      let inputDataBulkWriteArr = [];
      let aborted = false;

      for (let el of inputDataArr) {
        try {
          if (user.role != 'ULB' && !design_year) {
            let obj = {};
            obj = {
              updateOne: {
                filter: el.query,
                update: { $set: el.update },
                upsert: true,
              },
            };
            inputDataBulkWriteArr.push(obj);

            // Update in the request log collection, the current status of file
            inputDataArrSuccessCounter += 1;
            await updateLog(reqId, {
              message: `Status: (${inputDataArrSuccessCounter}/${inputDataArr.length}) processed`,
              completed: 0,
            });
          }
        } catch (e) {
          // Update in the request log collection, the current status of file.
          aborted = true;
          await updateLog(reqId, {
            message: e.message,
            completed: 0,
            status: 'FAILED',
          });
          console.error('Exception', e);
          break;
        }
      }

      if (!aborted) {
        // Function call to update "overview" & "input sheet" data only if input data is valid.
        if (user.role !== 'ULB') {
          await uploadOverviewDataInDb(du);
          await uploadInputDataInDb(inputDataBulkWriteArr); //bulkWrite.
        }
        await updateLog(reqId, {
          message: `Completed`,
          completed: 1,
          status: 'SUCCESS',
        });
        clearLedgerCache();
        Redis.resetDashboard();
      }
    } else {
      // console.info("isStandardizable is 'No'");

      // Update overview data in collection and delete input sheet data (if any).
      if (user.role !== 'ULB') {
        await uploadOverviewDataInDb(du);
        await deleteInputDataFromDB(du);
      }

      await updateLog(reqId, {
        message: `Completed (isStandardized is No)`,
        completed: 1,
        status: 'SUCCESS',
      });
      Redis.resetDashboard();
    }
  } catch (e) {
    console.error('processData: Caught Exception', e.message);
    await updateLog(reqId, {
      message: e.message,
      completed: 0,
      status: 'FAILED',
    });
  }
}

// Clear redis cache.
async function clearLedgerCache() {
  const cacheType = 'dashboard';
  await clearCacheByType(cacheType);
}

// << ----- Operation on Excel ----- >>
// Read the excel file and return overview and input sheet data.
async function readXlsxFile(file, design_year, role) {
  if (role === 'ULB' && design_year) {
    return new Promise(async (resolve, reject) => {
      let exceltojson;
      try {
        let fileInfo = file.path.split('.');
        exceltojson =
          fileInfo &&
            fileInfo.length > 0 &&
            fileInfo[fileInfo.length - 1] == 'xlsx'
            ? xlsxtojson
            : xlstojson;

        let prms2 = new Promise((rslv, rjct) => {
          exceltojson(
            {
              input: file.path,
              output: null, //since we don't need output.json
              lowerCaseHeaders: true,
              sheet: CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME,
            },
            function (err, sheet) {
              if (err) rjct({ message: 'Error: INPUT_SHEET_NAME' });
              else rslv(sheet);
            }
          );
        });
        Promise.all([prms2])
          .then(
            (sheet) => {
              let dataSheet = sheet[0];
              let overviewSheet = null;
              if (dataSheet) resolve({ overviewSheet, dataSheet });
              else reject({ message: 'Two sheet is required in the file.' });
            },
            (e) => {
              reject(e);
            }
          )
          .catch((e) => {
            reject(e);
          });
      } catch (e) {
        reject({
          message: 'Caught Exception while reading file.',
          errMessage: e.message,
        });
      }
    });
  } else {
    try {
      // Extract sheet names
      const sheetNames = getSheetNames(file.path);
      const inputSheet = sheetNames.find(
        (sheet) =>
          sheet.toLowerCase() ===
          CONSTANTS.LEDGER.BULK_ENTRY.INPUT_SHEET_NAME.toLowerCase()
      );
      const overviewSheet = sheetNames.find(
        (sheet) =>
          sheet.toLowerCase() ===
          CONSTANTS.LEDGER.BULK_ENTRY.OVERVIEW_SHEET_NAME.toLowerCase()
      );

      if (!inputSheet || !overviewSheet) {
        throw new Error('Invalid sheet name');
      }

      // Determine the correct exceltojson function based on file type
      const fileExtension = file.path.split('.').pop();
      const exceltojson = fileExtension === 'xlsx' ? xlsxtojson : xlstojson;

      // Convert excel sheets to JSON
      const overviewSheetData = await parseExcelSheet(
        exceltojson,
        file.path,
        overviewSheet
      );
      const inputSheetData = await parseExcelSheet(
        exceltojson,
        file.path,
        inputSheet
      );

      // Return data from both sheets
      return { overviewSheet: overviewSheetData, dataSheet: inputSheetData };
    } catch (error) {
      console.error('Error in reading Excel:', error.message);
      throw new Error(error.message);
    }
  }
}

// Utility function to read excel and return sheet names [].
function getSheetNames(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    return sheetNames;
  } catch (error) {
    throw new Error(`Error reading workbook: ${error.message}`);
  }
};

// Utility function to parse an Excel sheet to JSON
function parseExcelSheet(exceltojson, filePath, sheetName) {
  return new Promise((resolve, reject) => {
    exceltojson(
      {
        input: filePath,
        output: null, // no output file needed
        lowerCaseHeaders: true,
        sheet: sheetName,
      },
      (err, sheet) => {
        if (err) {
          return reject({
            message: `Error in sheet: ${sheetName}`,
            error: err,
          });
        }
        if (!sheet) {
          return reject({
            message: `Sheet ${sheetName} is missing or incorrect`,
          });
        }
        resolve(sheet);
      }
    );
  });
};

// << ----- Validate Data ----- >>
// Validate overview sheet data.
async function validateOverview(data, financialYear, fileName) {
  try {
    // Check if overview sheet has at least two rows.
    if (data.length < 2) {
      throw new Error('Overview sheet has less than two rows!');
    }

    // Extract and filter headers from the first row
    const headers = Object.keys(data[0]).filter(Boolean);

    // Validate if headers match the expected overviewHeader (defined above) length
    if (headers.length !== overviewHeader.length) {
      throw new Error('Overview header is missing');
    }

    // Check if both headers are present
    for (const header of overviewHeader) {
      if (!headers.includes(header.toLowerCase())) {
        throw new Error('Overview header name mismatch');
      }
    }

    // Convert data rows to an object
    const objOfSheet = {};
    for (const eachRow of data) {
      if (eachRow['basic details']) {
        objOfSheet[eachRow['basic details']] = eachRow.value;
      }
    }

    // Object keys to the expected format (header: value)
    for (const key of Object.keys(objOfSheet)) {
      objOfSheet[overViewSheet[key]] = objOfSheet[key];
      delete objOfSheet[key];
    }

    // Fetch data from collections.
    const state = await State.findOne(
      { code: objOfSheet.state_code, isActive: true },
      { name: 1, code: 1, _id: 1 }
    ).exec();
    const ulb = await Ulb.findOne(
      { code: objOfSheet.ulb_code, state: state?._id },
      {
        _id: 1,
        name: 1,
        area: 1,
        code: 1,
        isActive: 1,
        population: 1,
        state: 1,
        wards: 1,
      }
    ).exec();

    // Validate overview sheet.
    if (state && ulb) {
      // Log the errors.
      let overviewErrors = [];

      // Validate file name.
      let startYear = financialYear.split('-')[0].slice(2, 4);
      let endYear = financialYear.split('-')[1];
      let correctFileName = '';
      if (['A', 'U'].includes(objOfSheet.audit_status.charAt(0))) {
        correctFileName =
          objOfSheet.ulb_code +
          '_' +
          startYear +
          endYear +
          '_' +
          objOfSheet.audit_status.charAt(0);
      } else
        overviewErrors.push('Audit status must be either "Audited" or "Unaudited"');
      if (fileName && correctFileName) {
        // if (!fileName.includes(correctFileName)) overviewErrors.push(`File name: '${correctFileName}' is expected and found '${fileName}..'`);
        if (fileName != correctFileName)
          overviewErrors.push(`File name: '${correctFileName}' is expected and found '${fileName}'`);
      }

      if (state.code != objOfSheet.state_code)
        overviewErrors.push(`State code: '${state.code}' is expected and found '${objOfSheet.state_code}'`);
      if (state.name != objOfSheet.state)
        overviewErrors.push(`State name: '${state.name}' is expected and found '${objOfSheet.state}'`);
      if (ulb.code != objOfSheet.ulb_code)
        overviewErrors.push(`ULB code: '${ulb.code}' is expected and found '${objOfSheet.ulb_code}'`);
      if (ulb.name != objOfSheet.ulb)
        overviewErrors.push(`ULB name: '${ulb.name}' is expected and found '${objOfSheet.ulb}'`);
      if (financialYear != objOfSheet.year)
        overviewErrors.push(`Financial year: '${financialYear}' is expected and found '${objOfSheet.year}'`);
      if (objOfSheet.audit_status === 'Audited') {
        const auditFirm = objOfSheet.audit_firm
          ? objOfSheet.audit_firm.trim()
          : '';
        if (auditFirm.length <= 4)
          overviewErrors.push("Audit firm: If 'Audit Status' is 'Audited' - 'Audit firm' is mandatory");
      }
      if (objOfSheet.audit_status === 'Unaudited') {
        ['audit_date', 'audit_firm'].forEach((field) => {
          if (objOfSheet[field]) {
            overviewErrors.push(`Audit Status: If 'Audit Status' is 'Unaudited' - ${field} must be blank`);
          }
        });
      }
      if (objOfSheet.isStandardizable === 'No') {
        const comment = objOfSheet.isStandardizableComment
          ? objOfSheet.isStandardizableComment.trim()
          : '';
        if (comment.length <= 4)
          overviewErrors.push("Standardization: If 'Can the raw file be standardised?' is 'No' comment is mandatory");
      }
      if (Number(objOfSheet.dataFlag) > 0) {
        const comment = objOfSheet.dataFlagComment
          ? objOfSheet.dataFlagComment.trim()
          : '';
        if (comment.length <= 4)
          overviewErrors.push("Data flag: If 'Count of Data Flags failed' > '0' comment is mandatory");
      }

      // Throw all the consolidated erros from  overviewErrors[]
      if (overviewErrors.length > 0) throw new Error(overviewErrors.join(', '));
    } else {
      throw new Error(`State code '${objOfSheet.state_code}' or ULB code '${objOfSheet.ulb_code}' not found`);
    }

    // Merge ULB data into the objOfSheet{} and add additional fields from ulbs collection.
    Object.assign(objOfSheet, JSON.parse(JSON.stringify(ulb)), {
      ulb_code_year: `${objOfSheet.ulb_code}_${objOfSheet.year}`,
      state_name: state.name,
      ulb_id: ulb._id,
    });

    // console.log("objOfSheet ----> ", objOfSheet);
    return objOfSheet;
  } catch (error) {
    console.error('Validation failed: Overview sheet ', error.message);
    throw new Error(error.message);
  }
};

// Validate input sheet data.
async function validateData(
  data,
  objOfSheet,
  design_year,
  user,
  financialYear
) {
  try {
    // Check if input sheet has at least two rows.
    if (data.length < 2) {
      throw new Error('Input sheet has less than two rows.');
    }

    // Extract and filter headers from the first row
    const headers = Object.keys(data[0]).filter(Boolean);

    // Check if headers match the expected input sheet header (inputHeader) length
    if (headers.length !== inputHeader.length) {
      throw new Error('Input sheet header is missing');
    }

    // Check for header name mismatches
    for (const header of inputHeader) {
      if (!headers.includes(header.toLowerCase())) {
        throw new Error('Input sheet header name mismatch');
      }
    }

    let inputSheetObj = {};
    let errors = [];
    let fieldsWithCode = 0;
    let fieldsWithNoAmount = 0;

    for (const eachRow of data) {
      // Validate data only if line item code is present.
      if (eachRow['code']) {
        fieldsWithCode++;
        if (!eachRow['amount in inr']) fieldsWithNoAmount++;

        // Replace "-" with "0" | remove commas | remove brackets | remove ₹ from values.
        let amount = eachRow['amount in inr'] || '';
        amount =
          amount === '-'
            ? '0'
            : amount
              .replace(/,/g, '')
              .replace(/₹/g, '')
              .replace(/[()]/g, (match) => (match === '(' ? '-' : ''));

        let code = eachRow['code'].trim();
        if (amount.includes('.')) {
          errors.push(`Line item code ${code} cannot be decimal ${amount}`);
        }
        inputSheetObj[code] = amount ? Number(amount) : null;
        if (isNaN(inputSheetObj[code])) {
          errors.push(`Line item code ${code} value is not applicable ${inputSheetObj[code]}`);
        }
      }
    }

    if (fieldsWithCode === fieldsWithNoAmount) {
      throw new Error('File cannot be blank');
    }

    // Validate balance sheet - check if assets == liability
    let message = await validateBalanceSheet(inputSheetObj);
    if (message) throw new Error(message);

    // Validate each line item code
    let lineItemCodes = Object.keys(inputSheetObj);
    let validLineItems = await LineItem.find({
      code: { $in: lineItemCodes },
      isActive: true,
    }).exec();
    let validCodes = validLineItems.map((item) => item.code);
    for (let code of lineItemCodes) {
      if (!validCodes.includes(code)) {
        errors.push(`Invalid Item code ${code} found in the sheet`);
      } else {
        let item = validLineItems.find((item) => item.code === code);
        inputSheetObj[item._id] = inputSheetObj[code];
        delete inputSheetObj[code];
      }
    }

    if (errors.length) {
      throw new Error(errors.join(', '));
    }

    // Assign ledger to objOfSheet
    Object.assign(objOfSheet, {
      ledger: JSON.parse(JSON.stringify(inputSheetObj)),
    });

    // Prepare data for bulk update
    let dataArr = Object.keys(objOfSheet.ledger).map((el) => ({
      query: {
        ulb: objOfSheet._id,
        lineItem: el,
        financialYear: financialYear,
        ...(design_year &&
          user.role === 'ULB' && { design_year: ObjectId(design_year) }),
      },
      update: {
        amount: objOfSheet.ledger[el],
        audit_status: objOfSheet.audit_status,
      },
      options: {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
        runValidators: true,
      },
    }));

    return dataArr;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Validate balance sheet data.
async function validateBalanceSheet(inputSheetObj) {
  let message = '';
  let liabilitySum = 0;
  let assetSum = 0;

  for (let key of Object.keys(inputSheetObj)) {
    if (balanceSheet['liabilityAdd'].includes(key))
      liabilitySum += inputSheetObj[key];

    else if (balanceSheet['assetsAdd'].includes(key))
      assetSum += inputSheetObj[key];
  }

  // Check if liabilities and assets are valid number
  if (isNaN(liabilitySum) || isNaN(assetSum)) {
    message = 'Please enter valid amount in Balance Sheet';
    return message;
  }
  // Check if assests == liability
  else if (liabilitySum != assetSum) {
    message =
      'Balance sheet has liability: ' +
      liabilitySum +
      ' while assets :' +
      assetSum;
  }

  return message;
};

// << ----- DB operations ----- >>
// Update the status of the request log.
async function updateLog(reqId, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let d = await RequestLog.update({ _id: reqId }, { $set: data });
      resolve(d);
    } catch (e) {
      reject({
        message: 'Exception while updating the status.',
        err: e.message,
      });
    }
  });
}

// Upload overview sheet data.
async function uploadOverviewDataInDb(du) {
  const update = {
    $push: {
      tracker: {
        audit_status: du.update.audit_status,
        lastModifiedAt: new Date(),
        isStandardizable: du.update.isStandardizable,
        isStandardizableComment: du.update.isStandardizableComment,
        dataFlag: du.update.dataFlag,
        doc_source: du.update.doc_source,
      }
    },
    $set: du.update
  }

  // Push data to collection.
  await LedgerLog.findOneAndUpdate(du.query, update, du.options);
}

// Delete input sheet data if "isStandardized == No".
async function deleteInputDataFromDB(du) {
  if (du.update.ulb_id && du.update.year) {
    const totLineItems = await LineItem.countDocuments();
    const deleteCount = await UlbLedger.countDocuments({
      ulb: ObjectId(du.update.ulb_id),
      financialYear: du.update.year,
    });

    // Delete only if count is less that total no. of lineitems.
    if (deleteCount <= totLineItems)
      await UlbLedger.deleteMany({
        ulb: ObjectId(du.update.ulb_id),
        financialYear: du.update.year,
      });
    else throw new Error('Delete count limit reached.');
  } else throw new Error('_id and year is mandatory.');
}

// Bulk write to UlbLedger - input sheet data.
async function uploadInputDataInDb(inputDataBulkWriteArr) {
  await UlbLedger.bulkWrite(inputDataBulkWriteArr);
}
