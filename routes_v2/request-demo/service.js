const FormsJson = require('../../models/FormsJson');
const RequestDemoUserInfo = require('../../models/RequestDemoUserInfo');
const formJsonService = require('../../service/formJsonService');
const { generateExcel } = require('../utils/downloadService');

// Insert data to DB.
module.exports.postDemoData = async (req, res) => {
  try {
    const reqBody = req.body;
    if (JSON.stringify(reqBody) === '{}') {
      return res.status(400).json({
        status: false,
        message: 'Request body is empty!',
        data: [],
      });
    }

    const formJson = await FormsJson.findOne({ formId: 20 });
    const validations = formJsonService.getValidations(formJson.data);
    const failedValidations = formJsonService.getFailedValidations(
      reqBody,
      validations
    );

    // If there are no failed validations, proceed with updating the record.
    if (failedValidations.length === 0) {
      const newUser = new RequestDemoUserInfo(req.body);
      const updateResult = await newUser.save();

      if (!updateResult?._id) throw new Error('Failed to save data.');

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

// Get formJson.
module.exports.getDemoForm = async (req, res) => {
  try {
    const formJson = await FormsJson.findOne({ formId: 20 });
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
};

// Download dump.
module.exports.getDemoDump = async (req, res) => {
  const sheetName = 'UserInfo';
  const headers = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Business Email ID' },
    { key: 'jobTitle', label: 'Job Title' },
    { key: 'usingCfFor', label: 'What would you be using City Finance for?' },
    { key: 'createdAt', lable: 'Created At' },
  ]
  const rowsData = await RequestDemoUserInfo.find({}).lean();

  try {
    const buffer = await generateExcel(headers, rowsData, sheetName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Request_Demo.xlsx"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Error generating Excel:', err);
    res.status(500).json({ message: 'Failed to generate Excel file.' });
  }
};
