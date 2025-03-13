const FormsJson = require('../../models/FormsJson');
const UlbFeedbackForm = require('../../models/UlbFeedback');
const formJsonService = require('../../service/formJsonService');

module.exports.submitFeedbackForm = async (req, res) => {
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
      rating: reqBody.rating,
      answerBenifit: reqBody.answerBenifit,
      answerImprove: reqBody.answerImprove,
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
      const updateResult = await UlbFeedbackForm.updateOne(condition, {
        $push: {
          fileDownloaded: reqBody.fileDownloaded
        },
      });

      // No documents were updated, proceed with insertOne.
      if (updateResult.nModified === 0) {
        await UlbFeedbackForm.bulkWrite([{ insertOne: { document: reqBody } }]);
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

module.exports.viewFeedbackForm = async (req, res) => {
  try {
    const formJson = await FormsJson.findOne({ formId: 18 });
    return res.status(200).json({
      status: true,
      message: 'Successfully fetched data!',
      data: formJson.data,
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
