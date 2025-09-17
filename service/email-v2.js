const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const SES_CONFIG = {
    credentials: {
        accessKeyId: process.env.NEWSLETTER_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEWSLETTER_AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.NEWSLETTER_SES_REGION
}

module.exports.sendEmail = function (mailOptions) {
    const sesClient = new SESClient(SES_CONFIG);
    const sendEmailCommand = new SendEmailCommand(mailOptions);
    return sesClient.send(sendEmailCommand);
}