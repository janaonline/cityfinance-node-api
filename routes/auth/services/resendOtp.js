//not being used. sending new OTP on resend request


// const OTP = require('../../../models/Otp')
// const Service = require('../../../service');
// const ObjectId = require('mongoose').Types.ObjectId;
// const SendOtp = require('sendotp');
// const sendEmail = Service.sendEmail;
// const catchAsync = require('../../../util/catchAsync')
// let countryCode = "91", Subject = "Authentication Mail";
// const { getUSer } = require('./getUser')

// module.exports.resendOtp = catchAsync(async (req, res, next) => {

//     let { email, requestId } = req.body
//     let user = await getUSer({ email });
//     const otpobject = await OTP.findOne({ _id: ObjectId(requestId) })
//     if (!user) {
//         res.status(400).json({
//             success: false,
//             message: "User Does Not EXIST IN DB"
//         })
//     }
//     let sendOtp = new SendOtp(process.env.MSG91_AUTH_KEY);

//     sendOtp.retry(`${countryCode}${user.mobile}`, false, function (error, data) {
//         // console.log(error);//error handler
//         sendEmail({ to: user.email, html: `Your OTP is -${otpobject.otp}`, subject: Subject })
//         if (data.type == 'success') {
//             res.status(200).json({ success: true, message: data.message })
//         }
//         else if (data.type == 'error') {
//             res.status(401).send({ success: false, message: data.message });
//         }
//     });
// })