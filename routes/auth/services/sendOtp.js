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
const axios = require('axios')
module.exports.sendOtp = catchAsync(async (req, res, next) => {
    try {
        let user = await getUSer(req.body);
        let entity, state;
        if (user.role === 'STATE') {
            entity = await State.findOne({ _id: ObjectId(user.state) })
            state = entity;
        } else if (user.role === 'ULB') {
            entity = await Ulb.findOne({ _id: ObjectId(user.ulb) })
            state = await State.findOne({ _id: ObjectId(entity.state) })
        } else {
            entity = { name: user.name }
            state = entity
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
        let msg = `Your OTP to login into CityFinance.in is ${otp}. Do not share this code. If not requested, please contact us at contact@cityfinance.in - City Finance`;
/* If the user is a state, then the mobile number is the mobile number of the state. If the user is not
a state, then the mobile number is the mobile number of the accountant. */
        let mobile = user?.role === "STATE" ? user.mobile : user.accountantConatactNumber ; 
        if (OtpMethods.validatePhoneNumber(mobile) || OtpMethods.ValidateEmail(user.email)) {
            let sendOtp = new SendOtp(process.env.MSG91_AUTH_KEY, msg);
            let Otp = new OTP({
                censusCode: user.censusCode,
                sbCode: user.sbCode,
                contactNumber: mobile,
                emailId: user.email,
                otp: otp,
                createdAt: Date.now(),
                expireAt: Date.now() + expireTimeMS,
                isVerified: 0,
                role: user.role
            })
            await Otp.save();
            if (mobile) {
                axios.get(`https://api.msg91.com/api/v5/otp?template_id=${process.env.TEMPLATE_ID}&mobile=91${mobile}&authkey=${process.env.MSG91_AUTH_KEY}&otp=${otp}`).then(function (response) {
                console.log('OTP SENT');
                
                  })
                  .catch(function (error) {
                    console.log('OTP NOT SENT');
                  })
                // sendOtp.send(`${countryCode}${mobile}`, process.env.SENDER_ID, otp, function (error, data) {
                //     if (error) {
                //         res.status(500).json({
                //             success: false,
                //             message: error.message
                //         })
                //     }
                // });
            }
            if (user.email) {
                let mailOptions =     {
                    Destination: {
                      /* required */
                      ToAddresses: [user.email]
                    },
                    Message: {
                      /* required */
                      Body: {
                        /* required */
                        Html: {
                          Charset: "UTF-8",
                          Data: msg
                        },
                      },
                      Subject: {
                        Charset: 'UTF-8',
                        Data: Subject
                      }
                    },
                    Source: process.env.EMAIL,
                    /* required */
                    ReplyToAddresses: [process.env.EMAIL],
                  }
                sendEmail(mailOptions)
            }
            return res.status(200).json({
                success: true,
                message: "OTP SENT SUCCESSFULLY",
                mobile: mobile,
                email: user.email,
                name: user.name,
                requestId: Otp._id,
                state: state.name
            })
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid Contact Details',
                mobile: mobile,
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