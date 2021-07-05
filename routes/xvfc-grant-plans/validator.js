const { check } = require("express-validator");

exports.planCreateValidator = [
  check("designYear").not().isEmpty().withMessage("designYear is required"),
  check("plans.water.url")
    .not()
    .isEmpty()
    .isURL()
    .withMessage("water Plan is required")
    .withMessage("Water Plan is required as URL"),
  check("plans.sanitation.url")
    .not()
    .isEmpty()
    .isURL()
    .withMessage("Sanitation plan is required")
    .withMessage("Sanitation Plan is required as URL"),
];
