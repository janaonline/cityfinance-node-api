const nodemailer = require('nodemailer');
const { email } = require('./check-unique');
function isValid(date, h1, m1, h2, m2) {
    var h = date.getHours();
    var m = date.getMinutes();
    return (h1 <= h || h1 == h && m1 <= m) && (h <= h2 || h == h2 && m <= m2);
}  

module.exports = function(mailOptions, cb){

    let mail1 = isValid(new Date(),08,01,11,59);
    let mail2 = isValid(new Date(),12,00,15,59);
    let mail3 = isValid(new Date(),04,00,08,00);

    let mail = null
    let password = null 
    if(mail1){
        mail= process.env.EMAIL // cityfinance1@dhwaniris.com
        password = process.env.PASS
    }else if(mail2){
        mail= process.env.EMAIL //cityfinance2@dhwaniris.com
        password = process.env.PASS
    }
    else if(mail3){   
        mail= process.env.EMAIL // reachus
        password = process.env.PASS
    }
    else{
        mail= process.env.EMAIL // reachus
        password = process.env.PASS
    }
    const smtpConnectionString = process.env.EMAILSERVICE == 'gmail' ?
        `smtps://${encodeURIComponent(mail)}:${encodeURIComponent(password)}@smtp.gmail.com`: {
            host: 'smtp.office365.com',
            port: '587',
            auth: {
                user: mail,
                pass: password
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