const FormsJson = require('../../models/FormsJson');
const UlbFeedback = require('../../models/UlbFeedback');
const formJsonService = require('../../service/formJsonService');
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.submitFeedbackForm = async (req, res) => {
  try {
    const user = req.decoded;
    if (!user || user.role !== 'ULB')
      throw new Error('User role must be ULB.');

    const designYear = req.query.designYear;
    const ulbId = user.ulb;
    if (!ulbId || !designYear)
      throw new Error(`submitFeedbackForm(): Missing ${!ulbId ? 'ulbId' : ''}${!ulbId && !designYear ? ' and ' : ''}${!designYear ? 'designYear' : ''}`);

    const reqBody = req.body;
    if (JSON.stringify(reqBody) === '{}')
      throw new Error('Request body is empty!');

    const formJson = await FormsJson.findOne({ formId: 19, design_year: ObjectId(designYear) }).lean();
    if (!formJson?.data)
      throw new Error(`viewFeedbackForm(): Data not found with the given formId and designYear`);

    const validations = formJsonService.getValidations(formJson.data);
    const failedValidations = formJsonService.getFailedValidations(reqBody, validations);

    // If there are no failed validations, proceed with updating the record.
    if (failedValidations.length === 0) {
      const response = await UlbFeedback.updateOne(
        { ulb: ObjectId(ulbId), designYear: ObjectId(designYear) },
        { $set: { ...req.body, currentFormStatus: 3 } },
        { upsert: true }
      );

      if (!response.n && !response.nModified) throw new Error('Failed to update data in the DB.');

      return res.status(200).json({
        status: true,
        message: 'Successfully updated data!',
        data: failedValidations, // will be empty [];
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
    const { ulbId, designYear } = req.query;
    if (!ulbId || !designYear)
      throw new Error(`viewFeedbackForm(): Missing ${!ulbId ? 'ulbId' : ''}${!ulbId && !designYear ? ' and ' : ''}${!designYear ? 'designYear' : ''}`);

    const formJson = await FormsJson.findOne({ formId: 19, design_year: ObjectId(designYear) }).lean();
    if (!formJson?.data)
      throw new Error(`viewFeedbackForm(): Data not found with the given formId and designYear`);

    // If ulbData is available add values in the formJson obj.
    const ulbData = await UlbFeedback.findOne({ ulb: ObjectId(ulbId), designYear: ObjectId(designYear) }).lean() || {};
    if (Object.keys(ulbData).length) {
      for (const question of formJson['data']) {
        // Set value.
        question['value'] = ulbData[question['key']];

        // Set readonly.
        if (true) question['readonly'] = true;
      }

      // Set formStatus;
      formJson['currentFormStatus'] = 3;
    }

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
