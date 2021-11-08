exports.userAuth = (req, res, next) => {
  let role = req?.decoded?.role;
  let actionAllowed = ["MoHUA", "STATE"];
  if (actionAllowed.indexOf(role) <= -1 || role === undefined) {
    return res.status(400).json({
      msg: `This action is only not allowed by ${role}`,
    });
  }
  next();
};
