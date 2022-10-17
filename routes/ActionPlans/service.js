const ActionPlans = require("../../models/ActionPlans");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const ExcelJS = require("exceljs");
const User = require('../../models/User')
const Year = require('../../models/Year');
const {canTakenAction} = require('../CommonActionAPI/service');
const {BackendHeaderHost, FrontendHeaderHost} = require('../../util/envUrl')


function response(form, res, successMsg ,errMsg){
  if(form){
      return res.status(200).json({
          status: true,
          message: successMsg,
          data: form,
      });
  }else{
      return res.status(400).json({
          status: false,
          message: errMsg
      });
 }
}

exports.saveActionPlans = async (req, res) => {
  try {
    // let { state, _id } = req.decoded;
    // let data = req.body;
    // req.body.actionTakenBy = _id;
    // req.body.modifiedAt = new Date();
    const data = req.body;
    const user = req.decoded;
    let formData = {};
    formData = {...data};   
    const {_id: actionTakenBy, role: actionTakenByRole } = user;
  
    formData["actionTakenBy"] = ObjectId(actionTakenBy);
    formData["actionTakenByRole"] = actionTakenByRole;
    formData["uaData"].forEach(entity=>{
      entity.status = "PENDING"
    })
    formData.status = "PENDING"
    if (formData.state) {
      formData["state"] = ObjectId(formData.state);
    }
    if (formData.design_year) {
      formData["design_year"] = ObjectId(formData.design_year);
    }

    const condition = {};
    condition["design_year"] = data.design_year;
    condition["state"] = data.state;

    if(data.state && data.design_year){
      const submittedForm = await ActionPlans.findOne(condition);
      if (
        submittedForm &&
        submittedForm.isDraft === false &&
        submittedForm.actionTakenByRole === "STATE"
      ) {
        //Form already submitted
        return res.status(200).json({
          status: true,
          message: "Form already submitted.",
        });
        //if actionTakenByRole !== STATE && isDraft=== false && status !== "APPROVED"
      } else {
        if (!submittedForm && formData.isDraft === false) {
          // final submit in first attempt
          const form = await ActionPlans.create(formData);
          formData.createdAt = form.createdAt;
          formData.modifiedAt = form.modifiedAt;
          if (form) {
            const addedHistory = await ActionPlans.findOneAndUpdate(
              condition,
              { $push: { history: formData } },
              { new: true, runValidators: true }
            );
            // if (addedHistory) {
            //   //email trigger after form submission
            //   Service.sendEmail(mailOptions);
            // }
            if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
              await UpdateStateMasterForm(req, "actionPlans");
            }
            return response(
              addedHistory,
              res,
              "Form created.",
              "Form not created"
            );
          } else {
            return res.status(400).json({
              status: false,
              message: "Form not created.",
            });
          }
        } else {
          if (!submittedForm && formData.isDraft === true) {
            // create as draft
            const form = await ActionPlans.create(formData);
            if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
              await UpdateStateMasterForm(req, "actionPlans");
            }
            return response(form, res, "Form created", "Form not created");
          }
        }
      }
      if ( submittedForm && submittedForm.status !== "APPROVED") {
          if(formData.isDraft === true){
              const updatedForm = await ActionPlans.findOneAndUpdate(
                  condition,
                  {$set: formData},
                  {new: true, runValidators: true}
              );
              if (data.design_year === "606aaf854dff55e6c075d219") {
                //check for year 2021-22
                await UpdateStateMasterForm(req, "actionPlans");
              }
              return response(
                updatedForm,
                res,
                "Form updated.",
                "Form not updated"
              );
          } else {
              formData.createdAt = submittedForm.createdAt;
              formData.modifiedAt = new Date();
              formData.modifiedAt.toISOString();
              const updatedForm = await ActionPlans.findOneAndUpdate(
                  condition,
                  {
                      $push:{"history":formData},
                      $set: formData
                  },
                  {new: true, runValidators: true}
              );
              // if(updatedForm){
              //   //email trigger after form submission
              //   Service.sendEmail(mailOptions);
              // }
              if (data.design_year === "606aaf854dff55e6c075d219") {
                //check for year 2021-22
                await UpdateStateMasterForm(req, "actionPlans");
              }
              return response(
                updatedForm,
                res,
                "Form updated.",
                "Form not updated."
              );
          }
      }
      if(submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "STATE" 
          && submittedForm.isDraft === false){
              return res.status(200).json({
                  status: true,
                  message: "Form already submitted"
              })
      }
  }

    // await ActionPlans.findOneAndUpdate(
    //   { state: ObjectId(state), design_year: ObjectId(data.design_year) },
    //   data,
    //   {
    //     upsert: true,
    //     new: true,
    //     setDefaultsOnInsert: true,
    //   }
    // );
    // if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
    //   await UpdateStateMasterForm(req, "actionPlans");
    // }
    // return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getActionPlans = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  let role = req.decoded.role;
  let condition = {};
  condition.state = state;
  condition.design_year = design_year;
  let host = "";
  host = req.headers.host;
  if ((req.headers.host === BackendHeaderHost.Demo)) {
    host = FrontendHeaderHost.Demo;
  }
  try {
    let userData = ""
    if(design_year === "606aaf854dff55e6c075d219"){
      const actionPlan = await ActionPlans.findOne({
          state: ObjectId(state),
          design_year,
        }).select({ history: 0 }).lean();
        if (!actionPlan) {
          return Response.BadRequest(res, null, "No ActionPlans found");
        }
        userData = await User.findOne({ _id: ObjectId(actionPlan['actionTakenBy']) });
        actionPlan['actionTakenByRole'] = userData['role'];;
        Object.assign(actionPlan, {canTakeAction: canTakenAction(actionPlan['status'], actionPlan['actionTakenByRole'], actionPlan['isDraft'], "STATE",role ) })
        return Response.OK(res, actionPlan, "Success");
    }

    const year2122Id = await Year.findOne({ year: "2021-22" })
      .select({
        _id: 1,
      })
      .lean();
    let data2122Query;
    if(year2122Id){
      data2122Query = ActionPlans.findOne({
        state: ObjectId(state),
        design_year: ObjectId(year2122Id._id),
      }).lean();
    }
    const data2223Query = ActionPlans.findOne({
      state: ObjectId(state),
      design_year,
    }).lean();

    const [ data2122, data2223] = await Promise.all([
      data2122Query,
      data2223Query,
    ]);

    if(data2223){
      Object.assign(data2223, {canTakeAction: canTakenAction(data2223['status'], data2223['actionTakenByRole'], data2223['isDraft'], "STATE",role ) })
      return Response.OK(res, data2223, "Success");

    }
    let uaArray;
    let uaArray2223;
    let ua2122projectExecute, ua2122sourceFund, ua2122yearOutlay;
    if (data2122) {
      if(data2122.isDraft === false){

        uaArray = data2122.uaData;
        //Number of UAs
        for (let i = 0; i < uaArray.length; i++) {
          //an entry of ua
          // for (let ua of uaArray) {
            let ua = uaArray[i];
            //category in ua
            for (let category in ua) {
              // if (category === "projectExecute")
              //   ua2122projectExecute = uaArray[i].projectExecute;
              // if (category === "sourceFund")
              //   ua2122sourceFund = uaArray[i].sourceFund;
              // if (category === "yearOutlay")
              //   ua2122yearOutlay = uaArray[i].yearOutlay;
              if (
                category === "projectExecute" ||
                category === "sourceFund" ||
                category === "yearOutlay"
              ) {
                for (let project of ua[category]) {
                  //set project isDisable key = true
                  if (project) {
                    Object.assign(project, {isDisable:true})
                  }
                }
              }
            }
       
          // }
  
          // if (data2223) {
          //   uaArray2223 = data2223.uaData;
          //   //Number of UAs
          //   let ua = uaArray2223[i];
          //   // for (let i = 0; i < uaArray2223.length; i++) {
          //     // for (let ua of uaArray2223) {
          //       //category in ua
          //       for (let category in ua) {
          //         if (category === "projectExecute") {
          //           ua2122projectExecute.push(...uaArray2223[i].projectExecute);
          //         } else if (category === "sourceFund") {
          //           ua2122sourceFund.push(...uaArray2223[i].sourceFund);
          //         } else if (category === "yearOutlay") {
          //           ua2122yearOutlay.push(...uaArray2223[i].yearOutlay);
          //         }
          //       }
          //     // }
          //   // }
          // }
        }
        
      }else{//previous year form not final submitted
        
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/action-plan target="_blank">Click here</a> in order to submit form`,
        })
      }
    }else{
      //previous year form not found 
      if(!data2122){
        
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/action-plan target="_blank">Click here</a> in order to submit form`,
        })
      }
    }
    // if(data2122 && data2223){
    //   data2223.uaData = data2122.uaData;
    //   Object.assign(data2223, {canTakeAction: canTakenAction(data2223['status'], data2223['actionTakenByRole'], data2223['isDraft'], "STATE",role ) })
    //   return res.status(200).json({
    //     status: true,
    //     message: "Data found And Appended in 22-23",
    //     data: data2223
    //   })
    // }else 
    if(data2122){
      data2122.status = null;
      data2122.isDraft = null;
      return res.status(200).json({
        status: true,
        message: "Data for 21-22",
        data: data2122
      })
 
    }else{
      return res.status(400).json({
        status: false,
        message: "Not found"
      })
    }
    // const actionPlan = await ActionPlans.findOne({
    //   state: ObjectId(state),
    //   design_year,
    //   isActive: true,
    // }).select({ history: 0 }).lean();
    // if (!actionPlan) {
    //   return Response.BadRequest(res, null, "No ActionPlans found");
    // }
    // let userData = await User.findOne({ _id: ObjectId(actionPlan['actionTakenBy']) });
    // actionPlan['actionTakenByRole'] = userData['role'];;
    // Object.assign(actionPlan, {canTakeAction: canTakenAction(actionPlan['status'], actionPlan['actionTakenByRole'], actionPlan['isDraft'], "STATE",role ) })
    // return Response.OK(res, actionPlan, "Success");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.action = async (req, res) => {
  try {
    let { design_year, state } = req.body;
    req.body.modifiedAt = new Date();
    req.body['actionTakenBy'] = req.decoded._id
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

  worksheet.getCell("A1").value = "List of Projects to be Executed with 15th FC Grants*";
  let col = "",
    colIndex = 0,
    rowIndex = 2;
  for (const key in uaData.projectExecute[0]) {
    const element = uaData.projectExecute[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    switch (key) {
      case 'Cost':
        worksheet.getCell(col + 2).value = 'Project_Cost'
        break;
      case 'Details':
        worksheet.getCell(col + 2).value = 'Project_Details'
        break;
      case 'Type':
        worksheet.getCell(col + 2).value = 'Project_Type'
        break;
      default:
        worksheet.getCell(col + 2).value = key;
        break;

    }

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
  worksheet.getCell("A" + rowIndex++).value = "Project List and Source of Funds* ( Amount in INR Lakhs)";
  for (const key in uaData.sourceFund[0]) {
    const element = uaData.sourceFund[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    switch (key) {
      case 'Cost':
        worksheet.getCell(col + rowIndex).value = 'Project_Cost'
        break;
      default:
        worksheet.getCell(col + rowIndex).value = key;
        break;

    }

  }
  uaData.sourceFund.forEach((object) => {
    (col = ""), (colIndex = 0), rowIndex++;

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
  worksheet.getCell("A" + rowIndex++).value = "Year-wise Outlay for 15th FC Grants* (Amount in INR Lakhs)";

  for (const key in uaData.yearOutlay[0]) {
    const element = uaData.yearOutlay[0][key];
    col = String.fromCharCode(colIndex++ + 65);
    switch (key) {
      case 'Cost':
        worksheet.getCell(col + rowIndex).value = 'Project_Cost'
        break;
      default:
        worksheet.getCell(col + rowIndex).value = key;
        break;
    }
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
