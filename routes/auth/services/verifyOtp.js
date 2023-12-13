const OTP = require('../../../models/Otp')
const User = require("../../../models/User");
const catchAsync = require('../../../util/catchAsync')
const OtpMethods = require('../../../util/otp_generator')
const { getUSer } = require('./getUser')
const { createToken } = require('./createToken')
const ObjectId = require('mongoose').Types.ObjectId;
const State = require("../../../models/State");
const Ulb = require("../../../models/Ulb");

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
        if (verification.role === 'ULB' && verification.censusCode) {
            email = verification.censusCode;
        } else if (verification.role === 'ULB' && verification.sbCode) {
            email = verification.sbCode;
        } else {
            email = verification.emailId;
        }

        let user = await getUSer({ email });

        if (process.env.ENV == "staging") {
            const otpBlockedUntil = user.otpBlockedUntil ? new Date(
                user.otpBlockedUntil + 24 * 60 * 60 * 1000
            ) : 0;

            if (otpBlockedUntil >= new Date(Date.now()) || verification.verificationAttempts >= 3) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum OTP attempt limit exhausted. Please try after 24 hours",
                });
            }
        }
        //reset otp attempt
        await User.updateOne(
            { _id: ObjectId(user._id) },
            { $unset: { otpAttempts: "", otpBlockedUntil: "" } }
        ).exec();
        let state;
        if (user?.state) state = await State.findOne({ _id: ObjectId(user.state) });
        if (state && state['accessToXVFC'] == false) {
            return res.status(403).json({
                success: false,
                message: "Sorry! You are not Authorized To Access XV FC Grants Module"
            })
        }
        let role = ''
        if (user.role === "ULB") {
            ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
            role = user.role;
        }
        let expirytime = verification.expireAt.getTime()
        let currentTime = Date.now();
        if (currentTime < expirytime) {
            if (otp == verification.otp) {
                await OTP.findByIdAndUpdate(verification._id, { $set: { isVerified: true } });
                let sessionId = req.headers.sessionid;
                let token = await createToken(user, sessionId, req.body);
                const allYears = await getYears()
                return res.status(200).json({
                    token: token,
                    success: true,
                    message: 'OTP VERIFIED',
                    user: {
                        name: user.name,
                        email: user.email,
                        isActive: user.isActive,
                        role: user.role,
                        state: user.state,
                        ulb: user.ulb,
                        stateName: state?.name,
                        designation: user?.designation,
                        isUA: role === "ULB" ? ulb.isUA : null,
                        isMillionPlus: role === "ULB" ? ulb.isMillionPlus : null,
                    },
                    allYears
                })
            } else {
                if (process.env.ENV == "staging") {
                    await OTP.updateOne(
                        { _id: ObjectId(verification._id) },
                        {
                            $inc: { verificationAttempts: 1 },
                        }
                    ).exec();
                    if (verification.verificationAttempts >= 2) {
                        await User.updateOne(
                            { _id: ObjectId(user._id) },
                            {
                                $set: { otpBlockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), },
                            }
                        ).exec();
                    }
                }
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

getYears = async () => {
    let allYears = await Years.find({ isActive: true }).select({ isActive: 0 })
    newObj = {}
    allYears.forEach(element => {
        newObj[element.year] = element._id
    });
    return newObj
}