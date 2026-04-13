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
    return Response.BadRequest(res, {}, "Refresh token cookie is required.");
  }

  try {
    const decoded = jwt.verify(refreshToken, Config.JWT.SECRET);

    if (decoded.purpose !== "REFRESH" || !decoded.lh_id) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "Invalid refresh token.");
    }

    const user = await User.findOne({
      _id: ObjectId(decoded._id),
      isDeleted: false,
      isActive: true,
    }).lean();

    if (!user) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "User not found or inactive.");
    }

    const loginQuery = {
      _id: ObjectId(decoded.lh_id),
      user: ObjectId(decoded._id),
    };

    if (decoded.sessionId && ObjectId.isValid(decoded.sessionId)) {
      loginQuery.visitSession = ObjectId(decoded.sessionId);
    }

    const login = await LoginHistory.findOne(loginQuery).exec();

    if (!login || login.isActive === false || login.loggedOutAt) {
      clearRefreshTokenCookie(res);
      return Response.UnAuthorized(res, {}, "Session is no longer active.");
    }

    if (
      login.inactiveSessionTime &&
      Date.now() >= login.inactiveSessionTime
    ) {
      clearRefreshTokenCookie(res);
      await LoginHistory.updateOne(
        { _id: ObjectId(login._id) },
        {
          $set: {
            isActive: false,
            loggedOutAt: new Date(),
            refreshTokenHash: null,
            currentRefreshTokenId: null,
          },
        }
      ).exec();

      return Response.UnAuthorized(
        res,
        {},
        "Session expired. Kindly log in again to proceed."
      );
    }

    const tokenMatches =
      login.refreshTokenHash &&
      (await Service.compareHash(refreshToken, login.refreshTokenHash));
    const isCurrentTokenId =
      !!decoded.jti &&
      !!login.currentRefreshTokenId &&
      decoded.jti === login.currentRefreshTokenId;

    if (!tokenMatches || !isCurrentTokenId) {
      clearRefreshTokenCookie(res);
      await LoginHistory.updateOne(
        { _id: ObjectId(login._id) },
        {
          $set: {
            isActive: false,
            loggedOutAt: new Date(),
            refreshTokenHash: null,
            currentRefreshTokenId: null,
          },
        }
      ).exec();

      return Response.UnAuthorized(
        res,
        {},
        "Refresh token reuse detected. Please log in again."
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

    const authTokens = await rotateRefreshToken(
      user,
      login,
      decoded.sessionId || null
    );

    attachRefreshTokenCookie(res, authTokens.refreshToken);

    return Response.OK(
      res,
      {
        token: authTokens.token,
      },
      "Token refreshed successfully."
    );
  } catch (error) {
    clearRefreshTokenCookie(res);
    return Response.UnAuthorized(
      res,
      {},
      "Invalid or expired refresh token."
    );
  }
};
