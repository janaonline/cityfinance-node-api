const FormsJson = require("../../models/FormsJson");
const Events = require("../../models/Event");
const formJsonService = require('../../service/formJsonService');
const { generateExcel } = require('../utils/downloadService');

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
    console.error('Error: ', error);
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
      const newUser = new Events(req.body);
      const updateResult = await newUser.save();

      if (!updateResult?._id) throw new Error('Failed to save data.');

      // send email to user.
      sendEmail(req.body.email);

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
    console.error('Error: ', error);
    return res.status(400).json({
      status: false,
      message: error.message,
      data: '',
    });
  }
};

const sendEmail = (email) => {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const result = pattern.test(email);
  if (!result) return;


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
  const rowsData = await Events.find({}).lean();

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