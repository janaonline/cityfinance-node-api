

module.exports.generateOTP = () => {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

module.exports.ValidateEmail = mail => {
    if (mail && /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(mail)) {
        return true
    }
    return false
}

module.exports.validatePhoneNumber = (inputtxt) => {
    var phoneno = /^\d{10}$/;
    if (inputtxt && inputtxt.match(phoneno)) {
        return true;
    }
    else {

        return false;
    }
}

module.exports.validateUserOtp = (inputtxt) => {
    var userOtp = /^\d{4}$/;
    if (inputtxt.match(userOtp)) {
        return true;
    }
    else {

        return false;
    }
}

