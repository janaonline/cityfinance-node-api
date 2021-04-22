const OTP = require('../../../models/Otp')
const catchAsync = require('../../../util/catchAsync')
const OtpMethods = require('../../../util/otp_generator')
const { getUSer } = require('./getUser')
const { createToken } = require('./createToken')
const ObjectId = require('mongoose').Types.ObjectId;

module.exports.verifyOtp = catchAsync(async (req, res, next) => {
    let { otp, requestId } = req.body;
    if (!otp) {
        res.status(400).json({
            success: false,
            message: 'Please Enter OTP'
        })

    }
    if (!OtpMethods.validateUserOtp(otp)) {
        res.status(400).json({
            success: false,
            message: 'OTP must be 4 digit number'
        })

    }



    const verification = await OTP.findOne({ _id: ObjectId(requestId) });
    if (!verification) {
        return res.status(400).json({
            success: false,
            message: "DB ERROR"
        })
    } else if (verification.isVerified) {
        return res.status(400).json({
            success: false,
            message: "OTP ALREADY VERIFIED"
        })
    }
    else {
        let email;
        if (verification.role === 'ULB') {
            email = verification.censusCode;
        } else {
            email = verification.emailId;
        }

        let user = await getUSer({ email });
        let expirytime = verification.expireAt.getTime()
        let currentTime = Date.now();
        if (currentTime < expirytime) {
            if (otp == verification.otp) {
                await OTP.findByIdAndUpdate(verification._id, { $set: { isVerified: true } });
                let sessionId = req.headers.sessionid;
                let token = await createToken(user, sessionId);
                let UserData = {};
                if (user.role === 'ULB') {
                    UserData = {
                        name: user.name,
                        email: user.email,
                        isActive: user.isActive,
                        role: user.role,
                        state: user.state,
                        ulb: user.ulb,
                    }
                }
                else if (user.role === 'ADMIN' || 'MoHUA' || 'PARTNER' || 'STATE') {
                    UserData = {
                        name: user.name,
                        email: user.email,
                        isActive: user.isActive,
                        role: user.role,
                    }
                }

                return res.status(200).json({
                    token: token,
                    success: true,
                    message: 'OTP VERIFIED',
                    user: UserData

                })
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'OTP NOT VERIFIED'
                })
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'TIME EXCEEDED. REQUEST A NEW OTP'
            })
        }
    }
});