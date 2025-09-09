const FormsJson = require('../../models/FormsJson');
const FileDownloadLog = require('../../models/FileDownloadLog');
const formJsonService = require('../../service/formJsonService');
const { generateExcel } = require('../utils/downloadService');

module.exports.userInfo = async (req, res) => {
  try {
    const reqBody = req.body;
    if (JSON.stringify(reqBody) === '{}') {
      return res.status(400).json({
        status: false,
        message: 'Request body is empty!',
        data: [],
      });
    }
    const condition = {
      userName: reqBody.userName,
      email: reqBody.email,
      module: reqBody.module,
      organization: reqBody.organization,
      designation: reqBody.designation,
    };
    const formJson = await FormsJson.findOne({ formId: 18 });
    const validations = formJsonService.getValidations(formJson.data);
    const failedValidations = formJsonService.getFailedValidations(
      reqBody,
      validations
    );

    // If there are no failed validations, proceed with updating the record.
    if (failedValidations.length === 0) {
      // If record already exists, update the "fileDownloaded" array else insert new record.
      const updateResult = await FileDownloadLog.updateOne(condition, {
        $push: {
          fileDownloaded: reqBody.fileDownloaded
        },
      });

      // No documents were updated, proceed with insertOne.
      if (updateResult.nModified === 0) {
        await FileDownloadLog.bulkWrite([{ insertOne: { document: reqBody } }]);
      }

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

module.exports.getUserInfo = async (req, res) => {
  try {
    const formJson = await FormsJson.findOne({ formId: 18 });
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

// Download User Download History Excel
module.exports.exportUserDownloadExcel = async (req, res) => {
  try {
    const sheetName = 'User_Download_History';
    const headers = [
      { key: 'userName', label: 'User Name' },
      { key: 'email', label: 'Email' },
      { key: 'organization', label: 'Organization' },
      { key: 'designation', label: 'Designation' },
      { key: 'module', label: 'Module' },
      { key: 'fileName', label: 'File Name' },
      { key: 'fileDownloadDate', label: 'Download Date' },
    ];

    // Using aggregation + unwind to flatten the fileDownloaded array.
    const rows = await FileDownloadLog.aggregate([
      { $unwind: "$fileDownloaded" },
      {
        $project: {
          _id: 0,
          userName: 1,
          email: 1,
          organization: 1,
          designation: 1,
          module: 1,
          fileName: "$fileDownloaded.fileName",
          fileDownloadDate: {
            $dateToString: {
              format: "%d-%b-%Y",
              date: "$fileDownloaded.date"
            }
          }
        }
      }
    ]);

    const buffer = await generateExcel(headers, rows, sheetName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName}.xlsx"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Error generating data-set log:', err);
    res.status(500).json({ message: 'Failed to generate User Download file.' });
  }
};

