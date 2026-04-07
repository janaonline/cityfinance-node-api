const OTP = require('../../../models/Otp')
const catchAsync = require('../../../util/catchAsync')
const OtpMethods = require('../../../util/otp_generator')
const { getUSer } = require('./getUser')
const { createToken } = require('./createToken')
const ObjectId = require('mongoose').Types.ObjectId;
const State = require("../../../models/State");
const Ulb = require("../../../models/Ulb");
const Years = require("../../../models/Year");
const {
    checkVerifyRateLimit,
    clearVerifyState,
    DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS,
    formatDuration,
    getLockStatus,
    getUserIdentifier,
    recordFailedVerifyAttempt,
} = require("./otpRateLimit");

module.exports.verifyOtp = catchAsync(async (req, res, next) => {
    let { otp, requestId } = req.body;
    if (!otp) {
        return res.status(400).json({
            success: false,
            message: 'Please Enter OTP'
        })

    }
    if (!OtpMethods.validateUserOtp(otp)) {
        return res.status(400).json({
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
        const userIdentifier = getUserIdentifier(user);

        const lockStatus = await getLockStatus(userIdentifier);
        if (lockStatus.isLocked) {
            return res.status(429).json({
                success: false,
                message: `Maximum OTP attempt limit exhausted. Please try after ${formatDuration(lockStatus.ttl)}`,
            });
        }

        const verifyRateLimit = await checkVerifyRateLimit(userIdentifier);
        if (verifyRateLimit.limited) {
            return res.status(429).json({
                success: false,
                message: `Too many OTP verification attempts. Please try after ${formatDuration(verifyRateLimit.ttl)}`,
            });
        }

        let state;
        if (user?.state) state = await State.findOne({ _id: ObjectId(user.state) });
        if (state && state['accessToXVFC'] == false) {
            return res.status(403).json({
                success: false,
                message: "Sorry! You are not Authorized To Access XV FC Grants Module"
            })
        }
        let role = ''
        let ulb;
        if (user.role === "ULB") {
            ulb = await Ulb.findOne({ _id: ObjectId(user.ulb) });
            role = user.role;
        }
        let expirytime = verification.expireAt.getTime()
        let currentTime = Date.now();
        if (currentTime < expirytime) {
            if (otp == verification.otp) {
                await OTP.findByIdAndUpdate(verification._id, { $set: { isVerified: true } });
                await clearVerifyState(userIdentifier);
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
                await OTP.updateOne(
                    { _id: ObjectId(verification._id) },
                    {
                        $inc: { verificationAttempts: 1 },
                    }
                ).exec();

                const failedAttempt = await recordFailedVerifyAttempt(userIdentifier);
                if (failedAttempt.locked) {
                    return res.status(429).json({
                        success: false,
                        message: `Maximum OTP attempt limit exhausted. Please try after ${formatDuration(failedAttempt.ttl)}`,
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: `OTP NOT VERIFIED. ${Math.max(0, DEFAULT_FAILED_VERIFY_MAX_ATTEMPTS - failedAttempt.count)} attempt(s) remaining before lock`
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
    let newObj = {}
    allYears.forEach(element => {
        newObj[element.year] = element._id
    });
    return newObj
}
