const express = require("express");
const router = express.Router();
const { sendOtp } = require("./services/sendOtp");
const { verifyOtp } = require("./services/verifyOtp");
const { resendOtp } = require("./services/resendOtp");
const { register } = require("./services/register");
const { login } = require("./services/login");
const { verifyToken } = require("./services/verifyToken");
const {
  resendAccountVerificationLink,
} = require("./services/resendAccountVerificationLink");
const {getDecryptedPassword} = require("../../middlewares/encryption")
const { emailVerification } = require("./services/emailVerification");
const { forgotPassword, gettingHash } = require("./services/forgotPassword");
const { resetPassword } = require("./services/resetPassword");
const { captcha } = require("./services/captcha");
const { totalVisit } = require("./services/totalVisit");
const { startSession } = require("./services/startSession");
const { endSession } = require("./services/endSession");
const { changePassword } = require("./services/changePassword");
const {sendMail} = require('./services/sendTestMail')
router.get("/start_session", startSession);
router.post("/getHash", gettingHash);
router.get("/end_session/:_id", endSession);
router.post("/register" ,register);
router.post("/login",login);
router.post("/verifyOtp", verifyOtp);
router.post("/sendOtp", sendOtp);
router.post("/resendOtp", sendOtp);
router.get("/email_verification", verifyToken, emailVerification);
router.post("/forgot_password" ,forgotPassword);
router.post("/resend_verification_link", resendAccountVerificationLink);
router.post("/reset_password" ,verifyToken ,resetPassword);
router.post("/captcha_validate", captcha);
router.get("/visit_count", totalVisit);
router.get("/change_password", verifyToken,changePassword);

router.get('/sendTestMail', sendMail)
module.exports = router;
