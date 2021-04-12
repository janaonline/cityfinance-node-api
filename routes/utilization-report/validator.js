const { check } = require("express-validator");

exports.reportCreateValidator = [
  check("name")
    .not()
    .isEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name is required as string"),
  check("ulb")
    .not()
    .isEmpty()
    .withMessage("Image is required")
    .isString()
    .withMessage("Image is required as string"),
  check("grantType")
    .not()
    .isEmpty()
    .withMessage("grantType is required")
    .isString()
    .withMessage("grantType is required as string"),
  check("grantPosition.utilizedPrevInstallments")
    .not()
    .isEmpty()
    .withMessage("utilizedPrevInstallments is required")
    .isNumeric()
    .withMessage("utilizedPrevInstallments is required as number"),
  check("grantPosition.receivedDuringYear")
    .not()
    .isEmpty()
    .withMessage("receivedDuringYear is required")
    .isNumeric()
    .withMessage("receivedDuringYear is required as number"),
  check("grantPosition.expenditureIncurredDuringYear")
    .not()
    .isEmpty()
    .withMessage("expenditureIncurredDuringYear is required")
    .isNumeric()
    .withMessage("expenditureIncurredDuringYear is required as number"),
  check("grantPosition.closingBalanceEndYear")
    .not()
    .isEmpty()
    .withMessage("closingBalanceEndYear is required")
    .isNumeric()
    .withMessage("closingBalanceEndYear is required as number"),
  check("projects")
    .not()
    .isEmpty()
    .withMessage("projects are required")
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
  check("projects.*.description")
    .not()
    .isEmpty()
    .withMessage("projects description required "),
  check("projects.*.photographs")
    .not()
    .isEmpty()
    .isArray({ min: 1, max: 5 })
    .withMessage("photographs  are required as array max 5"),
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
