const nodemailer = require('nodemailer');

function isValid(date, h1, m1, h2, m2) {
    var h = date.getHours();
    var m = date.getMinutes();
    return (h1 < h || h1 == h && m1 <= m) && (h < h2 || h == h2 && m <= m2);
}  
let mail1 = isValid(new Date(),08,01,12,00);
let mail2 = isValid(new Date(),16,01,20,00);
//let mail3 = isValid(new Date(),04,01,08,00);
let mail = null
let password = null 
if(mail1){
    mail= process.env.EMAIL1 // cityfinance1@dhwaniris.com
    password = process.env.PASS1
}else if(mail2){
    mail= process.env.EMAIL2 //cityfinance2@dhwaniris.com
    password = process.env.PASS2
}
// else if(mail3){   
//     mail= process.env.EMAIL // reachus
//     password = process.env.PASS
// }

console.log('MAIL',mail,password)
module.exports = function(mailOptions, cb){
    const smtpConnectionString = process.env.EMAILSERVICE == 'gmail' ?
        `smtps://${encodeURIComponent(mail)}:${encodeURIComponent(password)}@smtp.gmail.com`: {
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