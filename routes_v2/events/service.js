const ExcelJS = require('exceljs');
const axios = require('axios');
const FormsJson = require("../../models/FormsJson");
const EventRegistration = require("../../models/EventRegistration");
const formJsonService = require('../../service/formJsonService');
const { generateExcel } = require('../utils/downloadService');
const { sendEmailFn } = require('./helper');

// Fetch json.
module.exports.getForm = async (req, res) => {
  try {
    const formJson = await FormsJson.findOne({ formId: 22 });
    return res.status(200).json({
      status: true,
      message: 'Successfully fetched data!',
      data: formJson,
    });
  } catch (error) {
    console.error('Error in getForm(): ', error);
    return res.status(400).json({
      status: false,
      message: error.message,
      data: '',
    });
  }
}

// Insert data to DB.
module.exports.postData = async (req, res) => {
  try {
    const reqBody = req.body;
    if (JSON.stringify(reqBody) === '{}') {
      return res.status(400).json({
        status: false,
        message: 'Request body is empty!',
        data: [],
      });
    }

    const formJson = await FormsJson.findOne({ formId: 22 });
    const validations = formJsonService.getValidations(formJson.data);
    const failedValidations = formJsonService.getFailedValidations(
      reqBody,
      validations
    );

    // If there are no failed validations, proceed with updating the record.
    if (failedValidations.length === 0) {
      const newUser = new EventRegistration(req.body);
      const updateResult = await newUser.save();

      if (!updateResult?._id) throw new Error('Failed to save data.');

      // send email to user.
      sendEmailFn([req.body.email], updateResult?._id);

      return res.status(200).json({
        status: true,
        message: 'Successfully updated data!',
        data: failedValidations,
      });
    } else
      return res.status(400).json({
        status: false,
        message: 'Validation failed!',
        data: failedValidations,
      });
  } catch (error) {
    console.error('Error in postData(): ', error);
    return res.status(400).json({
      status: false,
      message: error.message,
      data: '',
    });
  }
};

// Download dump.
module.exports.getDump = async (req, res) => {
  const sheetName = 'UserInfo';
  const headers = [
    { key: 'eventId', label: 'Event Id' },
    { key: 'userName', label: 'Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone no.' },
    { key: 'preSubmitQuestion', label: 'Pre-submit a question for the event (optional)' },
    { key: 'createdAt', label: 'Created At' },
  ]
  const rowsData = await EventRegistration.find({}).lean();

  try {
    const buffer = await generateExcel(headers, rowsData, sheetName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Revenue-Dashboard-Webinar.xlsx"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Error generating Excel:', err);
    res.status(500).json({ message: 'Failed to generate Excel file.' });
  }
};

// Read email ids from excel and send email.
module.exports.readExcelAndSendMail = async (req, res) => {
  try {
    const { file_alias, file_url } = req.body;
    const workbook = new ExcelJS.Workbook();

    // Download file as a stream or buffer
    const response = await axios.get(file_url, {
      responseType: 'arraybuffer',
    });

    // Load from buffer
    await workbook.xlsx.load(response.data);

    const worksheet = workbook.getWorksheet(1);
    const registrations = [];

    worksheet.eachRow(async (row, rowNumber) => {
      // Skip header.
      if (rowNumber === 1) return;

      // ExcelJS rows are 1-indexed
      // Order in excel file matters.
      const [eventCode, userName, designation, email, phoneNumber, preSubmitQuestion] = row.values.slice(1);
      registrations.push({ eventCode, userName, designation, email, phoneNumber, preSubmitQuestion });
      
    });

    const dbRes = await EventRegistration.insertMany(registrations, { ordered: false });

    return res.status(200).json({
      status: true,
      message: 'Successfully sent mail!',
      data: dbRes,
    });
  } catch (error) {
    console.error('Error in readExcelAndSendMail(): ', error);
    return res.status(400).json({
      status: false,
      message: error.message,
      data: '',
    });
  }
}