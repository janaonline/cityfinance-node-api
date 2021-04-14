const ObjectId = require("mongoose").Types.ObjectId;
const ULB = require("../../models/Ulb");
const Response = require("../../service").response;
const Service = require("../../service");

exports.getTemplate = async (req, res) => {
  let { state } = req.params;
  try {
    const ulbs = await ULB.find({
      state: ObjectId(state),
      isActive: true,
    }).select({ code: 1, name: 1 });
    let field = {
      code: "ULB Census Code/ULB Code",
      name: "ULB Name",
      amount: "Grant Amount",
      error: "Errors",
    };
    let xlsData = await Service.dataFormating(ulbs, field);
    return res.xls("grant_template.xlsx", xlsData);
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};

exports.uploadTemplate = async (req, res) => {
  let { state } = req.params;
  try {
    const ulbs = await ULB.find({
      state: ObjectId(state),
      isActive: true,
    }).select({ code: 1, name: 1 });
    let field = {
      code: "ULB Census Code/ULB Code",
      name: "ULB Name",
      amount: "Grant Amount",
      error: "Errors",
    };
    let xlsData = await Service.dataFormating(ulbs, field);
    return res.xls("grant_template.xlsx", xlsData);
  } catch (err) {
    console.error(err.message);
    return Response.DbError(res, err.message, "server error");
  }
};
