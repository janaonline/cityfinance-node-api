const jwt = require("jsonwebtoken");
const User = require("../../../models/User");
const LoginHistory = require("../../../models/LoginHistory");
const Config = require("../../../config/app_config");
const Helper = require("../../../_helper/constants");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;

module.exports.verifyToken = (req, res, next) => {
  let token =
    req.body.token ||
    req.query.token ||
    req.params.token ||
    req.headers["x-access-token"];

  if (token) {
    let decodedPayload = jwt.decode(token);
    // verifies secret and checks exp
    jwt.verify(token, Config.JWT.SECRET, async function (err, decoded) {
      if (err) {
        let decodedPayload = jwt.decode(token);
        if (
          decodedPayload?.forgotPassword ||
          decodedPayload?.purpose == "EMAILVERFICATION"
        ) {
          let msg = "Link is already expired";
          let pageRoute = decodedPayload.url
            ? "password/request"
            : "account-reactivate";
          let user = await User.findOne({ _id: decodedPayload._id });
          if (!user.isEmailVerified) {
            pageRoute = "account-reactivate";
          }
          let queryStr = `email=${decodedPayload.email}&message=${msg}.`;
          let url = `${process.env.HOSTNAME}/${pageRoute}?${queryStr}`;
          return res.redirect(url);
        }

        console.error("verify-token jwt.verify : ", err.message);
        return Response.UnAuthorized(res, {}, `Session expired. Kindly log in again to proceed.`);
      } else {
        if (decoded.purpose === "REFRESH") {
          return Response.UnAuthorized(
            res,
            {},
            `Invalid token type. Please use an access token.`
          );
        }
        req.decoded = decoded;

        // Fetch user details and attach to request
        try {
          const user = await User.findOne({ _id: decoded._id }, { role: 1, ulb: 1, state: 1, isActive: 1, isDeleted: 1 });
          if (!user) {
            return Response.UnAuthorized(res, {}, `User not found.`);
          }
          req.user = user;
          req.decoded = { ...decoded, ...user.toObject() };
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
        if (req.decoded.sessionId || req.decoded.lh_id) {
          const userId = ObjectId(req.decoded._id);
          let query = {
            user: ObjectId(userId),
          };
          if (req.decoded.lh_id && ObjectId.isValid(req.decoded.lh_id)) {
            query._id = ObjectId(req.decoded.lh_id);
          }
          if (req.decoded.sessionId && ObjectId.isValid(req.decoded.sessionId)) {
            query.visitSession = ObjectId(req.decoded.sessionId);
          }
          let login = await LoginHistory.findOne(query)
            .sort({ _id: -1 })
            .exec();
          if (login) {
            if (login.isActive === false || login.loggedOutAt) {
              return Response.UnAuthorized(
                res,
                {},
                `Session expired. Kindly log in again to proceed.`
              );
            }
            if (Date.now() >= login.inactiveSessionTime) {
              return Response.UnAuthorized(
                res,
                {},
                `The client's session has expired and must log in again.`,
                440
              );
            }
            let inactiveTime = Date.now() + Helper.INACTIVETIME.TIME;
            let u = LoginHistory.update(
              { _id: ObjectId(login._id) },
              { $set: { inactiveSessionTime: inactiveTime } }
            ).exec();
          } else {
            return Response.UnAuthorized(
              res,
              {},
              `LoginHistory Not found`,
              400
            );
          }
        } else {
          //    return Response.UnAuthorized(res, {},`No sessionId provided`);
        }

        next();
      }
    });
  } else {
    // if there is no token
    // return an error
    return Response.UnAuthorized(res, { sessionExpired: true }, `Session Expired!`);
  }
};
