const jwt = require("jsonwebtoken");
const User = require("../../../models/User");
const LoginHistory = require("../../../models/LoginHistory");
const Config = require("../../../config/app_config");
const Helper = require("../../../_helper/constants");
const Service = require("../../../service");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const { rotateRefreshToken } = require("./createToken");
const {
  REFRESH_COOKIE_NAME,
  attachRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("./authCookie");

module.exports.refreshToken = async (req, res) => {
  const refreshToken =
    req.cookies?.[REFRESH_COOKIE_NAME] ||
    req.body.refreshToken ||
    req.query.refreshToken ||
    req.headers["x-refresh-token"];

  if (!refreshToken) {
    clearRefreshTokenCookie(res);
    return Response.BadRequest(res, {}, "Refresh token is required.");
  }

  try {
    const decoded = jwt.verify(refreshToken, Config.JWT.REFRESH_SECRET);
    const userId = decoded.sub;

    if (!userId) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "Invalid refresh token.");
    }

    const user = await User.findOne({
      _id: ObjectId(userId),
      isDeleted: false,
      isActive: true,
    }).select("+refreshTokenHash");

    if (!user) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "User not found or inactive.");
    }

    if (!user.refreshTokenHash) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "Session expired.");
    }

    const tokenMatches = await Service.compareHash(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      // Null out hash immediately on reuse detection (NestJS security pattern)
      await User.findByIdAndUpdate(userId, { refreshTokenHash: null }).exec();
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(
        res,
        {},
        "Refresh token reuse detected. Please log in again."
      );
    }

    const login = await LoginHistory.findOne({
      user: ObjectId(userId),
      isActive: { $ne: false },
      loggedOutAt: null,
    })
      .sort({ _id: -1 })
      .exec();

    if (!login || login.isActive === false || login.loggedOutAt) {
      clearRefreshTokenCookie(res);
      await User.findByIdAndUpdate(userId, { refreshTokenHash: null }).exec();
      return Response.UnAuthorized(res, {}, "Session is no longer active.");
    }

    if (login.inactiveSessionTime && Date.now() >= login.inactiveSessionTime) {
      clearRefreshTokenCookie(res);
      await LoginHistory.updateOne(
        { _id: ObjectId(login._id) },
        { $set: { isActive: false, loggedOutAt: new Date() } }
      ).exec();
      await User.findByIdAndUpdate(userId, { refreshTokenHash: null }).exec();
      return Response.UnAuthorized(
        res,
        {},
        "Session expired. Kindly log in again to proceed.",
        440
      );
    }

    const inactiveTime = Date.now() + Helper.INACTIVETIME.TIME;
    await LoginHistory.updateOne(
      { _id: ObjectId(login._id) },
      {
        $set: {
          inactiveSessionTime: inactiveTime,
          refreshTokenLastUsedAt: new Date(),
        },
      }
    ).exec();

    const authTokens = await rotateRefreshToken(user, login);
    attachRefreshTokenCookie(res, authTokens.refreshToken);

    return Response.OK(
      res,
      { token: authTokens.token },
      "Token refreshed successfully."
    );
  } catch (error) {
    clearRefreshTokenCookie(res);
    return Response.UnAuthorized(
      res,
      {},
      "Your session has expired. Please log in again."
    );
  }
};
