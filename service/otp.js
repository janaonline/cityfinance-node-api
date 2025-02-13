const SendOtp = require('sendotp');


const sendOtp = new SendOtp('AuthKey', 'Otp for your order is {{otp}}, please do not share it with anybody');

function generateOTP() {

    // Declare a digits variable 
    // which stores all digits
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

const otp;
sendOtp.send("919999999999", "PRIIND", otp = generateOTP(), function (error, data) {
    console.log(data);
});

sendOtp.setOtpExpiry('5'); //in minutes

sendOtp.retry("919999999999", false, function (error, data) {
    console.log(data);
});

sendOtp.verify("919999999999", otp, function (error, data) {
    console.log(data); // data object with keys 'message' and 'type'
    if (data.type == 'success') console.log('OTP verified successfully')
    if (data.type == 'error') console.log('OTP verification failed')
});