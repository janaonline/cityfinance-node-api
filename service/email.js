const nodemailer = require('nodemailer');
const CONFIG = require('routes/config');
module.exports.send = function(mailOptions){
    console.log("EMAIL",CONFIG.email);
    let transporter = nodemailer.createTransport(process.env.EMAIL);
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        return info.messageId;
    });
    // setup email data with unicode symbols
    /*let mailOptions = {
        to: emails, // list of receivers
        subject: subject, // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };*/
}