const { check } = require("express-validator");

exports.planCreateValidator = [
  check("designYear").not().isEmpty().withMessage("designYear is required"),
  check("plans.water.url")
    .not()
    .isEmpty()
    .withMessage("water Plan is required")
    .isURL()
    .withMessage("Water Plan is required as URL"),
  check("plans.sanitation.url")
    .not()
    .isEmpty()
    .withMessage("Sanitation plan is required")
    .isURL()
    .withMessage("Sanitation Plan is required as URL"),
];
