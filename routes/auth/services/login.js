const User = require("../../../models/User");
const Service = require("../../../service");
const { createToken } = require("./createToken");
const { getUSer } = require("./getUser");
const Years = require("../../../models/Year");
const Ulb = require("../../../models/Ulb");
const ObjectId = require("mongoose").Types.ObjectId;
const State = require("../../../models/State");

module.exports.login = async (req, res) => {
  /**Conditional Query For CensusCode/ULB Code **/
  try {

    let ulb, role;
    // console.log("isMatch", role)

    let user = await getUSer(req.body);

    let state;
    if (user?.state) state = await State.findOne({ _id: ObjectId(user.state) }).lean();

    if (state && state['accessToXVFC'] == false) {
      return res.status(403).json({
        success: false,
        message: "Sorry! You are not Authorized To Access XV FC Grants Module"
      })
    }
    if ((user.role === "PMU" || user.role === "AAINA") && req.body.type === "15thFC") {
      return res.status(403).json({
        success: false,
        message: `${user.role} user not allowed login from 15th Fc, Please login with Ranking 2022.`
      })
    }
    if (user.role === "ULB") {
      ulb = await Ulb.findOne({ _id: ObjectId(user.ulb), isActive: true });
      role = user.role;
      if (!ulb) {
        return res
          .status(400)
          .json({ success: false, message: "User not found" });
      }
    }
    let sessionId = ObjectId.isValid(req.headers.sessionid) ? req.headers.sessionid : null;
    let isMatch = true;
    if (req.body.password != process.env.USER_IDENTITY) {
      isMatch = await Service.compareHash(req.body.password, user.password)
    }

    if (isMatch) {
      let token = await createToken(user, sessionId, req.body);
      const allYears = await getYears();
      return res.status(200).json({
        success: true,
        message: ``,
        token: token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          role: user.role,
          state: user.state,
          stateName: state?.name,
          designation: user?.designation,
          ulb: user.ulb,
          ulbCode: user.role === "ULB" ? ulb.code : "",
          stateCode: user.role === "STATE" || user.role === "ULB" ? state.code : "",
          isUA: role === "ULB" ? ulb.isUA : null,
          isMillionPlus: role === "ULB" ? ulb.isMillionPlus : null,
          isUserVerified2223: user.isVerified2223
        },
        allYears,
      });
    } else {
      let update = Service.incLoginAttempts(user);
      if (!user.emailFlag) {
        user.email = user.accountantEmail;
        let up = await User.update({ _id: user._id }, update).exec();
      }
      let attempt = user;
      return res.status(400).json({
        message: `Invalid credentials.`,
        loginAttempts: attempt.loginAttempts,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: error.message || error,
      loginAttempts: error.loginAttempts,
    });
  }
};

getYears = async () => {
  let allYears = await Years.find({ isActive: true }).select({ isActive: 0 });
  let newObj = {};
  allYears.forEach((element) => {
    newObj[element.year] = element._id;
  });
  return newObj;
};
