const express = require("express");
const router = express.Router();
const { sendOtp } = require("./services/sendOtp");
const { verifyOtp } = require("./services/verifyOtp");
const { resendOtp } = require("./services/resendOtp");
const { register } = require("./services/register");
const { login } = require("./services/login");
const { verifyToken } = require("./services/verifyToken");
const { refreshToken } = require("./services/refreshToken");
const { logout } = require("./services/logout");
const { authLimiter } = require("./services/authRateLimit");
const {
  resendAccountVerificationLink,
} = require("./services/resendAccountVerificationLink");
const { getDecryptedPassword } = require("../../middlewares/encryption")
const { emailVerification } = require("./services/emailVerification");
const { forgotPassword, gettingHash } = require("./services/forgotPassword");
const { resetPassword } = require("./services/resetPassword");
const { captcha } = require("./services/captcha");
const { totalVisit } = require("./services/totalVisit");
const { startSession } = require("./services/startSession");
const { endSession } = require("./services/endSession");
const { changePassword } = require("./services/changePassword");
const { sendMail } = require('./services/sendTestMail')
router.get("/start_session", startSession);
router.post("/getHash", gettingHash);
router.get("/end_session/:_id", endSession);
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, captcha, login);
router.post("/refresh", authLimiter, refreshToken);
router.post("/refresh_token", authLimiter, refreshToken);
router.post("/logout", authLimiter, logout);
router.post("/verifyOtp", authLimiter, verifyOtp);
router.post("/sendOtp", authLimiter, captcha, sendOtp);
router.post("/resendOtp", authLimiter, captcha, sendOtp);
router.get("/email_verification", verifyToken, emailVerification);
router.post("/forgot_password", authLimiter, forgotPassword);
router.post("/resend_verification_link", authLimiter, resendAccountVerificationLink);
router.post("/reset_password", verifyToken, resetPassword);
router.post("/captcha_validate", captcha);
router.get("/visit_count", totalVisit);
router.get("/change_password", verifyToken, changePassword);

router.get('/sendTestMail', sendMail)
module.exports = router;
