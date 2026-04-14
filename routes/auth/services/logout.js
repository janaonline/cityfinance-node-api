const jwt = require("jsonwebtoken");
const LoginHistory = require("../../../models/LoginHistory");
const Config = require("../../../config/app_config");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const {
  REFRESH_COOKIE_NAME,
  clearRefreshTokenCookie,
} = require("./authCookie");

module.exports.logout = async (req, res) => {
  const refreshToken =
    req.cookies?.[REFRESH_COOKIE_NAME] ||
    req.body.refreshToken ||
    req.headers["x-refresh-token"];

  clearRefreshTokenCookie(res);

  if (!refreshToken) {
    return Response.OK(res, {}, "Logged out successfully.");
  }

  try {
    const decoded = jwt.verify(refreshToken, Config.JWT.SECRET);

    if (decoded?.lh_id && ObjectId.isValid(decoded.lh_id)) {
      await LoginHistory.updateOne(
        { _id: ObjectId(decoded.lh_id) },
        {
          $set: {
            isActive: false,
            loggedOutAt: new Date(),
            refreshTokenHash: null,
            currentRefreshTokenId: null,
          },
        }
      ).exec();
    }
  } catch (error) {
    // Cookie is cleared even when the token is already expired or invalid.
  }

  return Response.OK(res, {}, "Logged out successfully.");
};
