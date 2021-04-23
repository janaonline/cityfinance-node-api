const OTP = require('../../../models/Otp')
const SendOtp = require('sendotp');
const catchAsync = require('../../../util/catchAsync')
const OtpMethods = require('../../../util/otp_generator')
const Service = require('../../../service');
const sendEmail = Service.sendEmail;
let countryCode = "91", Subject = "Authentication Mail";
let expireTimeMS = 15 * 60000;
const { getUSer } = require('./getUser');
const User = require('../../../models/User');
const State = require('../../../models/State')
const Ulb = require('../../../models/Ulb')
const { isValidObjectId } = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.sendOtp = catchAsync(async (req, res, next) => {
    try {
        let user = await getUSer(req.body);
        let entity;
        if (user.role === 'STATE') {
            entity = await State.findOne({ _id: ObjectId(user.state) })
        } else if (user.role === 'ULB') {
            entity = await Ulb.findOne({ _id: ObjectId(user.ulb) })
        } else {
            entity = { name: user.name }
        }


        if (!process.env.MSG91_AUTH_KEY) {
            return res.status(400).json({
                success: false,
                message: 'MSG91 AUTH KEY NOT FOUND'
            })
        }
        if (!process.env.SENDER_ID) {
            return res.status(400).json({
                success: false,
                message: 'SENDER ID KEY NOT FOUND'
            })
        }
        if (!user) {
            res.status(400).json({
                success: false,
                message: "User Does Not EXIST IN DB. Please Register."
            })
        }
        let otp = OtpMethods.generateOTP();
        if (!otp) {
            if (!user) {
                res.status(500).json({
                    success: false,
                    message: "INTERNAL ERROR. OTP COULD NOT BE GENERATED"
                })
            }
        }
        let msg = `Otp for your login request is ${otp}, Please do not share it with anybody.`;
        if (OtpMethods.validatePhoneNumber(user.mobile) || OtpMethods.ValidateEmail(user.email)) {
            let sendOtp = new SendOtp(process.env.MSG91_AUTH_KEY, msg);
            let Otp = new OTP({
                censusCode: user.censusCode,
                contactNumber: user.mobile,
                emailId: user.email,
                otp: otp,
                createdAt: Date.now(),
                expireAt: Date.now() + expireTimeMS,
                isVerified: 0,
                role: user.role
            })
            await Otp.save();
            if (user.mobile) {
                sendOtp.send(`${countryCode}${user.mobile}`, process.env.SENDER_ID, otp, function (error, data) {
                    if (error) {
                        res.status(500).json({
                            success: false,
                            message: error.message
                        })
                    }
                });
            }
            if (user.email) {
                sendEmail({ to: user.email, html: msg, subject: Subject })
            }
            return res.status(200).json({
                success: true,
                message: "OTP SENT SUCCESSFULLY",
                mobile: user.mobile,
                email: user.email,
                name: entity.name,
                requestId: Otp._id
            })
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid Contact Details',
                mobile: user.mobile,
                email: user.email
            })
        }
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message ? error.message : error
        })
    }
})