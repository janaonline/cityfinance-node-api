const { check } = require("express-validator");

exports.reportCreateValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name is required as string"),
  check("grantType")
    .not()
    .isEmpty()
    .withMessage("grantType is required")
    .isString()
    .withMessage("grantType is required as string"),
  check("grantPosition.unUtilizedPrevYr")
    .not()
    .isEmpty()
    .withMessage("unUtilizedPrevYr is required")
    .isNumeric()
    .withMessage("unUtilizedPrevYr is required as number"),
  check("grantPosition.receivedDuringYr")
    .not()
    .isEmpty()
    .withMessage("receivedDuringYr is required")
    .isNumeric()
    .withMessage("receivedDuringYr is required as number"),
  check("grantPosition.expDuringYr")
    .not()
    .isEmpty()
    .withMessage("expDuringYr is required")
    .isNumeric()
    .withMessage("expDuringYr is required as number"),
  check("grantPosition.closingBal")
    .not()
    .isEmpty()
    .withMessage("closingBal is required")
    .isNumeric()
    .withMessage("closingBal is required as number"),
  check("projects")
    .isArray()
    .withMessage("projects are required as array max 10"),
  check("projects.*.name")
    .not()
    .isEmpty()
    .withMessage("project name is required"),
  check("projects.*.category")
    .not()
    .isEmpty()
    .withMessage("category is required "),
  // check("projects.*.engineerName")
  //   .not()
  //   .isEmpty()
  //   .withMessage("Engineer Name is required "),
  // check("projects.*.engineerContact")
  //   .not()
  //   .isEmpty()
  //   .withMessage("Engineer COntact Number is required "),
  // check("projects.*.description")
  //   .not()
  //   .isEmpty()
  //   .withMessage("projects description required "),
  // check("projects.*.photos")
  //   .not()
  //   .isEmpty()
  //   .isArray({ min: 1, max: 5 })
  //   .withMessage("photos  are required as array max 5"),
  check("projects.*.location")
    .not()
    .isEmpty()
    .withMessage("projects location is required "),
  check("projects.*.cost")
    .not()
    .isEmpty()
    .withMessage("projects cost is required "),
  check("projects.*.expenditure")
    .not()
    .isEmpty()
    .withMessage("projects expenditure is required "),
];
