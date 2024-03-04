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
        return Response.UnAuthorized(res, {}, `Failed to authenticate token.`);
      } else {
        req.decoded = decoded;
        console.log(req.decoded)
        if (req.decoded.sessionId) {
          userId = ObjectId(req.decoded._id);
          let query = {
            user: ObjectId(userId),
            visitSession: ObjectId(req.decoded.sessionId),
          };
          let login = await LoginHistory.findOne(query)
            .sort({ _id: -1 })
            .exec();
          if (login) {
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
    return res
      .status(403)
      .send({ success: false, message: "No token provided." });
  }
};
