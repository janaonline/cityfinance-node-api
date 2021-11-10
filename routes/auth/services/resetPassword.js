const User = require("../../../models/User");
const Response = require("../../../service").response;
const ObjectId = require("mongoose").Types.ObjectId;
const Service = require("../../../service/index");
const Helper = require("../../../_helper/constants");
module.exports.resetPassword = async (req, res) => {
  try {
    if (req.body.password) {
      if (req.body.password.length < 8) {
        return Response.BadRequest(
          res,
          "",
          `password contain at least 8 characters`
        );
      }
      if (!checkPassword(req.body.password)) {
        return Response.BadRequest(
          res,
          "",
          `Password should be alphanumeric with at least one Uppercase/Lowercase and special character`
        );
      }

      let user = await User.findOne({
        _id: ObjectId(req.decoded._id),
      }).exec();

      if (user) {
        let passwordHash = await Service.getHash(req.body.password);
        if (user.passwordHistory.length > 0) {
          for (password of user.passwordHistory) {
            let isMatch = await Service.compareHash(
              req.body.password,
              password
            );
            if (isMatch) {
              return Response.BadRequest(
                res,
                "",
                `You cannot set last 3 used password`
              );
            }
          }
        }

        let passwordExpires = Date.now() + Helper.PASSWORDEXPIRETIME.TIME; // 1 hour
        let passwordHistory = setPasswordHistory(user, passwordHash);
        let update = {
          $set: {
            passwordHistory: passwordHistory,
            password: passwordHash,
            passwordExpires: passwordExpires,
            isEmailVerified: true,
            isPasswordResetInProgress: true,
          },
        };
        let du = await User.update({ _id: ObjectId(user._id) }, update);
        return Response.OK(res, {}, "Password reset");
      } else {
        return Response.BadRequest(res, {}, `user not found.`);
      }
    } else {
      return Response.BadRequest(res, {}, `Password is required field.`);
    }
  } catch (e) {
    return Response.BadRequest(res, {}, `Exception:${e.message}`);
  }
};

function checkPassword(str) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
}
function setPasswordHistory(user, passwordHash) {
  if (Array.isArray(user.passwordHistory) && user.passwordHistory.length < 3) {
    user.passwordHistory.push(passwordHash);
  } else {
    user.passwordHistory.shift();
    user.passwordHistory.push(passwordHash);
  }
  return user.passwordHistory;
}
