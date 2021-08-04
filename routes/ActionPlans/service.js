const ActionPlans = require("../../models/ActionPlans");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ExcelJS = require("exceljs");
const User = require('../../models/User')
exports.saveActionPlans = async (req, res) => {
  try {
    let { state, _id } = req.decoded;
    let data = req.body;
    req.body.actionTakenBy = _id;
    req.body.modifiedAt = new Date();

    await ActionPlans.findOneAndUpdate(
      { state: ObjectId(state), design_year: ObjectId(data.design_year) },
      data,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    await UpdateStateMasterForm(req, "actionPlans");
    return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getActionPlans = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  try {
    const actionPlan = await ActionPlans.findOne({
      state: ObjectId(state),
      design_year,
      isActive: true,
    }).select({ history: 0 }).lean();
    let userData = await User.findOne({ _id: ObjectId(actionPlan['actionTakenBy']) });
    actionPlan['actionTakenByRole'] = userData['role'];;
    if (!actionPlan) {
      return Response.BadRequest(res, null, "No ActionPlans found");
    }
    return Response.OK(res, actionPlan, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { design_year, state } = req.body;
    req.body.modifiedAt = new Date();

    let currentActionPlans = await ActionPlans.findOne({
      state: ObjectId(state),
      design_year: ObjectId(design_year),
      isActive: true,
    }).select({
      history: 0,
    });

    let finalStatus = "APPROVED",
      allRejectReasons = [];
    req.body.uaData.forEach((element) => {
      let obj = {};
      obj[element.ua] = element.rejectReason;
      allRejectReasons.push(obj);
    });
    req.body.uaData.forEach((element) => {
      if (element.status == "REJECTED") {
        finalStatus = "REJECTED";
      }
      if (element.status == "PENDING") {
        finalStatus = "PENDING";
        return;
      }
    });
    req.body.status = finalStatus;

    const newActionPlans = await ActionPlans.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentActionPlans } }
    );

    await UpdateStateMasterForm(req, "actionPlans");
    return Response.OK(res, newActionPlans, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const { uaData, uaName } = req.body;
    uaData.forEach((element) => {
      createSheetForUa(workbook, element, uaName[element.ua].name);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "ActionPlanData.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });;
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

let createSheetForUa = (workbook, uaData, sheetName) => {
  workbook.addWorksheet(sheetName);
  const worksheet = workbook.getWorksheet(sheetName);

  worksheet.getCell("A1").value = "Projects";
  let col = "",
    colIndex = 0,
    rowIndex = 2;
  for (const key in uaData.projectExecute[0]) {
    const element = uaData.projectExecute[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    worksheet.getCell(col + 2).value = key;
  }

  uaData.projectExecute.forEach((object) => {
    (col = ""), (colIndex = 0), (rowIndex++);
    for (const key in object) {
      const element = object[key];
      col = String.fromCharCode(colIndex++ + 65);
      worksheet.getCell(col + rowIndex).value = element;
    }
  });

  (col = ""), (colIndex = 0), (rowIndex += 4);
  worksheet.getCell("A" + rowIndex++).value = "Source Funds";
  for (const key in uaData.sourceFund[0]) {
    const element = uaData.sourceFund[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    worksheet.getCell(col + rowIndex).value = key;
  }
  uaData.sourceFund.forEach((object) => {
    (col = ""), (colIndex = 0), rowIndex++;
    console.log(uaData);
    for (const key in object) {
      if (key == "ulb") {
        console.log("Ss");
      }
      const element = object[key];
      col = String.fromCharCode(colIndex++ + 65);
      worksheet.getCell(col + rowIndex).value = element;
    }
  });

  (col = ""), (colIndex = 0), (rowIndex += 4);
  worksheet.getCell("A" + rowIndex++).value = "Years Outlay";

  for (const key in uaData.yearOutlay[0]) {
    const element = uaData.yearOutlay[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    worksheet.getCell(col + rowIndex).value = key;
  }
  uaData.yearOutlay.forEach((object) => {
    (col = ""), (colIndex = 0), rowIndex++;
    for (const key in object) {
      const element = object[key];
      col = String.fromCharCode(colIndex++ + 65);
      worksheet.getCell(col + rowIndex).value = element;
    }
  });
};
