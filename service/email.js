const nodemailer = require('nodemailer');
module.exports = function(mailOptions, cb){
    const smtpConnectionString = process.env.EMAILSERVICE == 'gmail' ?
        `smtps://${encodeURIComponent(process.env.EMAIL)}:${encodeURIComponent(process.env.PASS)}@smtp.gmail.com`: {
            host: 'smtp.office365.com',
            port: '587',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS
            },
            secureConnection: false,
            tls: {
                ciphers: 'SSLv3'
            }
        };
    let transporter = nodemailer.createTransport(smtpConnectionString);
    transporter.sendMail(mailOptions, cb ? cb : (error, info) => {
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