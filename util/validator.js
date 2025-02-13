const { validationResult } = require("express-validator");

exports.runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }
  next();
};

exports.draftChecker = (req, res, next) => {
  if (req?.body?.isDraft === false) {
    return this.runValidation(req, res, next);
  }
  next();
};
