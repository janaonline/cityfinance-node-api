const FormsJson = require("../../models/FormsJson");
const EventRegistration = require("../../models/EventRegistration");
const formJsonService = require('../../service/formJsonService');
const { generateExcel } = require('../utils/downloadService');
const { sendEmail } = require('../../service');

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
    console.error('Error: ', error);
    return res.status(400).json({
      status: false,
      message: error.message,
      data: '',
    });
  }
};

const sendEmailFn = (emailId, documentId) => {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const result = pattern.test(emailId);
  // TODO ADD in db
  if (!result) return;

  const email = getEmailContent();
  const mailOptions = {
    Destination: { ToAddresses: emailId },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: email.body,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: email.subject,
      },
    },
    Source: process.env.EMAIL,
    ReplyToAddresses: [process.env.EMAIL],
  };

  // returns SES.Types.SendEmailResponse || AWSError
  const response = sendEmail(mailOptions);
  // TODO stringify and add in DB??
};

const getEmailContent = () => {
  return {
    subject: `Success! You're registered for Understanding Revenue Data`,
    body:
      `
      <div style="background-color: '#f4fbf7'; padding: 2rem 3rem">
        <p style="text-align: center;">
            <span style="color: '#0dcaf0'; font-weight: 'bold'; font-size: 1.75rem;">city</span>
            <span style="color: '#183367'; font-weight: 'bold'; font-size: 1.75rem;">finance.in</span>
        </p>

        <div style="margin-top: 1rem; background-color: '#ffffff'; padding: 2rem 3rem; border-radius: 5px">

            <p style="font-size: 1.5rem;">You're now registered for:</p>
            <p style="font-size: 1.5rem;font-weight: bold;">Understanding Revenue Data</p>
            <p style="margin: 0; padding: 0">When: Thursday, SEP 11, 11:00 AM - 12:00 PM</p>
            <p style="margin: 0; padding: 0">Where: Google Meet
                <a href="https://meet.google.com/wax-hfgv-cwf">https://meet.google.com/wax-hfgv-cwf</a>
            </p>

            <hr />
            <p>You'll receive a reminder 24 hours and 15 minutes before the session.</p>

            <br>Regards,<br>
            <p>City Finance Team</p>

        </div>
      </div>
    `,
  };
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