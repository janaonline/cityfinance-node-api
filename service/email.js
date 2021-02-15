const AWS = require('aws-sdk');
const SES_CONFIG = {
    accessKeyId: process.env["SES_ACCESS_KEYID"],
    secretAccessKey: process.env["SES_SECRET_ACCESS_KEY"],
    region: process.env["SES_REGION"],
};
const AWS_SES = new AWS.SES(SES_CONFIG);

/**
 * @param {string} to
 * @param {string} html
 * @param {string} subject
 */
module.exports = (mailOptions) => {
    let recipientEmail = mailOptions["to"].split(",");
    let params = {
      Source: 'support@cityfinance.in',
      Destination: {
        ToAddresses:recipientEmail
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: mailOptions["html"],
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: mailOptions["subject"],
        }
      },
    };
    let res = AWS_SES.sendEmail(params).promise();
    // Handle promise's fulfilled/rejected states
    res.then(
        function(data) {
        console.log(data.MessageId);
        }).catch(
        function(err) {
        console.error(err, err.stack);
        });
};
