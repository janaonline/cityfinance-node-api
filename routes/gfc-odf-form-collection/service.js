  const GfcFormCollection = require("../../models/GfcFormCollection");
  const OdfFormCollection = require("../../models/OdfFormCollection");
  const ObjectId = require("mongoose").Types.ObjectId;
  const moment = require("moment");
  const { response } = require("../../util/response");
  const Response = require("../../service").response;
  // const mongoose = require('mongoose');
  const { canTakenAction , canTakenActionMaster, isYearWithinRange} = require("../CommonActionAPI/service");
  const Service = require("../../service");
  const { years } = require("../../service/years");
  const { FormNames, YEAR_CONSTANTS , MASTER_STATUS, FORMIDs, FORM_LEVEL} = require("../../util/FormNames");
  const User = require("../../models/User");
  const doRequest = require("../../util/doRequest");
  // const FormHistory = require("../../models/FormHistory");
  const CurrentStatus = require("../../models/CurrentStatus");
  // const StatusHistory = require("../../models/StatusHistory");
  const {saveCurrentStatus, saveFormHistory, saveStatusHistory} = require('../../util/masterFunctions');

function dateFormatter(input) {
  const t = new Date(input);
  const date = ("0" + t.getDate()).slice(-2);
  const month = ("0" + (t.getMonth() + 1)).slice(-2);
  const year = t.getFullYear();
  return `${year}-${month}-${date}`;
}

// const dateFormatter = require('../../util/dateformatter')
module.exports.createOrUpdateForm = async (req, res) => {
  try {
      const data = req.body;
      const user = req.decoded;
      let formData = {};
      formData = { ...data };
      const isGfc = data.isGfc;  // flag to check which collection to use 
      let collection = isGfc ? GfcFormCollection : OdfFormCollection;
      const formName = isGfc ? FormNames["gfc"] : FormNames["odf"];
      const masterFormId = isGfc  ? FORMIDs['GFC'] :  FORMIDs['ODF'];
      const { _id: actionTakenBy, role: actionTakenByRole, name: ulbName } = user;
      formData['actionTakenBy'] = ObjectId(actionTakenBy);
      formData['actionTakenByRole'] = actionTakenByRole;
      if (formData.rating === "") {
          formData.rating = null;
      }
      if (formData.rating) {
          formData.rating = ObjectId(formData.rating);
      }
      if (formData.certDate) {
          
          formData.certDate = new Date(formData.certDate);
          formData.certDate.toISOString();
      }
      if (formData.ulb) {
          formData.ulb = ObjectId(formData.ulb);
      }
      if (formData.design_year) {
          formData.design_year = ObjectId(formData.design_year);
      }

      formData['actionTakenByRole'] = actionTakenByRole;
      formData['actionTakenBy'] = ObjectId(actionTakenBy);
      formData['ulbSubmit'] = "";

      let condition = {}; // condition to find a document using ulb and design_year
      condition['ulb'] = ObjectId(data.ulb);
      condition['design_year'] = ObjectId(data.design_year);

      let userData = await User.find({
          $or: [
              { isDeleted: false, ulb: ObjectId(data.ulb), role: 'ULB' },
              { isDeleted: false, state: ObjectId(user.state), role: 'STATE', isNodalOfficer: true },
          ]
      }
      ).lean();

      let emailAddress = [];
      let ulbUserData = {},
      stateUserData = {};
      for (let i = 0; i < userData.length; i++) {//getting email address from the data
          if (userData[i]) {
              if (userData[i].role === "ULB") {
                  ulbUserData = userData[i];
              } else if (userData[i].role === "STATE") {
                  stateUserData = userData[i];
              }
          }
          if (ulbUserData && ulbUserData.commissionerEmail) {
              emailAddress.push(ulbUserData.commissionerEmail);
          }
          if (stateUserData && stateUserData.email) {
              emailAddress.push(stateUserData.email);
          }
      }
      //unique email address
      emailAddress = Array.from(new Set(emailAddress))
      //importing email template
      let ulbTemplate = Service.emailTemplate.ulbFormSubmitted(
          ulbName,
          formName
      );
      let mailOptions = {
          Destination: {
              /* required */
              ToAddresses: emailAddress,
          },
          Message: {
              /* required */
              Body: {
                  /* required */
                  Html: {
                      Charset: "UTF-8",
                      Data: ulbTemplate.body,
                  },
              },
              Subject: {
                  Charset: "UTF-8",
                  Data: ulbTemplate.subject,
              },
          },
          Source: process.env.EMAIL,
          /* required */
          ReplyToAddresses: [process.env.EMAIL],
      };
      let savedBody = new collection(formData);

      if (isYearWithinRange(data.design_year) && data.ulb) {

        // const session = await mongoose.startSession();
        // await session.startTransaction();

        try {
          const formBodyStatus = formData.status;
          savedBody.status = formData.status = "";
          savedBody.currentFormStatus = formData.currentFormStatus = formBodyStatus;
          let formData2324 = await collection
            .findOne({ ulb: data.ulb, design_year: data.design_year })
            .lean();
          let formCurrentStatus;
          if (!formData2324) {
            formCurrentStatus = {
              status: MASTER_STATUS["Not Started"],
            };
          } else {
            formCurrentStatus = await CurrentStatus.findOne({
              recordId: formData2324._id,
            }).lean();
          }

          if (formCurrentStatus &&
            [
              MASTER_STATUS["Not Started"],
              MASTER_STATUS["In Progress"],
              MASTER_STATUS["Returned By State"],
              MASTER_STATUS["Returned By MoHUA"],
            ].includes(formCurrentStatus.status)
          ) {
            let formSubmit;

            savedBody["ulbSubmit"] =
              formBodyStatus === MASTER_STATUS["Under Review By State"]
                ? new Date()
                : "";
            formData["ulbSubmit"] = savedBody["ulbSubmit"];
            if (formData2324) {
              formSubmit = await collection.findOneAndUpdate(
                {
                  _id: formData2324._id,
                },
                {
                  $set: formData,
                },
                {
                  new: true,
                  // session: session
                }
              );
            } else {
              formSubmit = await collection.create(savedBody,
                // { session }
                );
            }

            if (formBodyStatus === MASTER_STATUS["In Progress"]) {
              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["In Progress"],
                level: FORM_LEVEL["form"],
                shortKey: "form_level",
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({ body: currentStatusData, 
                // session
               });

              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            } else if (
              formBodyStatus === MASTER_STATUS["Under Review By State"]
            ) {
              let bodyData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                data: formSubmit,
              };
              /* Saving the form history of the user. */
              await saveFormHistory({ body: bodyData , 
                // session
              });

              let currentStatusData = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                status: MASTER_STATUS["Under Review By State"],
                level: FORM_LEVEL["form"],
                shortKey: "form_level",
                rejectReason: "",
                responseFile: "",
                actionTakenByRole: actionTakenByRole,
                actionTakenBy: ObjectId(actionTakenBy),
              };
              await saveCurrentStatus({ body: currentStatusData , 
                // session
              });

              let statusHistory = {
                formId: masterFormId,
                recordId: ObjectId(formSubmit._id),
                shortKey: "form_level",
                data: currentStatusData,
              };
              await saveStatusHistory({ body: statusHistory ,
                //  session 
                });
              //email trigger after form submission
              Service.sendEmail(mailOptions);
              // await session.commitTransaction();
              return Response.OK(res, {}, "Form Submitted");
            }
          } else if (
            ![
              MASTER_STATUS["Submission Acknowledged By MoHUA"],
              MASTER_STATUS["Under Review By MoHUA"],
              MASTER_STATUS["Under Review By State"],
            ].includes(formCurrentStatus.status)
          ) {
            return res.status(200).json({
              status: true,
              message: "Form already submitted.",
            });
          }
        } catch (error) {
          // await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
        // await session.endSession();
      }
      if (data.ulb && data.design_year) {
          const submittedForm = await collection.findOne(condition);
          if ((submittedForm) && submittedForm.isDraft === false &&
              submittedForm.actionTakenByRole === "ULB") {//Form already submitted
              return res.status(200).json({
                  status: true,
                  message: "Form already submitted."
              })
          } else {
              if ((!submittedForm) && !formData.isDraft) { // final submit in first attempt   
                  savedBody["ulbSubmit"] = new Date();
                  const formSubmit = await collection.create(savedBody);
                  formData['createdAt'] = formSubmit.createdAt;
                  formData['modifiedAt'] = formSubmit.modifiedAt;
                  formData['certDate'] = formSubmit.certDate;
                  formData['ulbSubmit'] = savedBody['ulbSubmit'];
                  if (formSubmit) {//add history
                      let updateData = await collection.findOneAndUpdate(condition,
                          {
                              $push: { history: formData },
                              $set: formData,
                          },
                          { new: true });
                      //email trigger after form submission
                      Service.sendEmail(mailOptions);

                      return res.status(200).json({
                          success: true,
                          message: "Data saved.",
                          data: updateData
                      });
                  } else {
                      return res.status(400).send({
                          success: false,
                          message: "Data not saved.",
                      });
                  }
              } else {
                  if ((!submittedForm) && formData.isDraft === true) { // create as draft
                      const form = await collection.create(savedBody);
                      return response(form, res, "Form created", "Form not created");
                  }
              }
          }
          if (submittedForm && submittedForm.status !== "APPROVED") {
              if (formData.isDraft === true) {
                  const updateForm = await collection.findOneAndUpdate(condition,
                      formData,
                      { new: true });
                  if (updateForm) {
                      return res.status(201).json({
                          success: true,
                          message: "Form updated",
                          data: updateForm
                      })
                  }
              } else {
                  const formSubmit = await collection.findOne(condition);
                  formData['createdAt'] = formSubmit.createdAt;
                  formData['modifiedAt'] = new Date();
                  formData['ulbSubmit'] = new Date();
                  
                  if (formData['certDate'] === "") {
                      formData['certDate'] = null;
                  }
                  let updateData = await collection.findOneAndUpdate(condition,
                      { $push: { history: formData }, $set: formData },//todo
                      { returnDocument: "after" });

                  //email trigger after form submission
                  Service.sendEmail(mailOptions);
                  
                  return res.status(201).json({
                      success: true,
                      message: "Form saved",
                      data: updateData
                  });
              }
          }
          if (submittedForm.status === "APPROVED" && submittedForm.actionTakenByRole !== "ULB"
              && submittedForm.isDraft === false) {
              return res.status(200).json({
                  status: true,
                  message: "Form already submitted"
              })
          }
      }
      return res.status(400).json({
          success:false,
          message : "Some server error occured"
      })
  } catch (error) {
      return res.status(400).json({
          success: false,
          message: error.message
      });
  }
}

module.exports.getForm = async (req, res, next) => {
  try {
      const { isGfc, formId } = req.query;
      let role = req.decoded.role;
      const ulb = ObjectId(req.query.ulb);
      const design_year = ObjectId(req.query.design_year);
      let collection = (isGfc === 'true') ? GfcFormCollection : OdfFormCollection;
      if (ulb && design_year) {
          let form = await collection.findOne({ ulb, design_year }, { history: 0 }).lean();
          if (!form && !formId) {
              return res.status(400).json({
                  status: false,
                  message: "Form not found!"
              })
          }
          if (form) {
            if (isYearWithinRange(design_year.toString())) {
              let params = {
                status: form.currentFormStatus,
                formType: "ULB",
                loggedInUser: role,
              };
              Object.assign(form, {
                canTakeAction: canTakenActionMaster(params),
              });
            } else {
              Object.assign(form, {
                canTakeAction: canTakenAction(
                  form["status"],
                  form["actionTakenByRole"],
                  form["isDraft"],
                  "ULB",
                  role
                ),
              });
            }
            if (form.certDate !== null && form.certDate !== "") {
              form.certDate = dateFormatter(form?.certDate);
            }
            req.form = form;

            // if (!formId) {
            //     return res.status(200).json({
            //         success: true,
            //         data: form
            //     });
            // } else {
          }
          next();
      
          

          // }
      }
  } catch (error) {
      res.status(400).json({
          success: false,
          message: error.message
      });
  }
}
module.exports.getCSV = async (req, res) => {
  const { isGfc } = req.query;
  let collection = isGfc === "true" ? GfcFormCollection : OdfFormCollection;
  let filename = "All Ulbs " + moment().format("DD-MMM-YY HH:MM:SS") + ".csv";
  // Set approrpiate download headers
  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });

  res.write(
    `ULB Name,Census Code, Action Taken By Role,Rating,Cert URL,Cert Name,
    Cert Date, Design year, Status, Draft, Reject Reason, Response File Name,
    Response File URL, Created On, Modified On \r\n`
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

  let pipeline = [
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulbData",
      },
    },
    { $unwind: "$ulbData" },
  ];

  collection.aggregate(pipeline).exec((err, data) => {
    if (err) {
      res.json({
        success: false,
        msg: "Invalid Payload",
        data: err.message,
      });
    } else {
      for (let el of data) {
        // el.natureOfUlb = el.natureOfUlb ? el.natureOfUlb : "";
        // el.name = el.name ? el.name.toString().replace(/[,]/g, " | ") : "";
        // el.location = el.location ? el.location : { lat: "NA", lng: "NA" };

        res.write(
          el.ulbData.name +
            "," +
            el.ulbData.censusCode +
            "," +
            el.actionTakenByRole +
            "," +
            el.rating +
            "," +
            el.cert.url +
            "," +
            el.cert.name +
            "," +
            el.certDate +
            "," +
            el.design_year +
            "," +
            el.status +
            "," +
            el.isDraft +
            "," +
            el.rejectReason +
            "," +
            el.responseFile.name +
            "," +
            el.responseFile.url +
            "," +
            el.createdAt +
            "," +
            el.modifiedAt +
            "\r\n"
        );
      }
      res.end();
    }
  });
};

module.exports.defunct = async (req, res) => {
  let query = [
    {
      $lookup: {
        from: "years",
        localField: "design_year",
        foreignField: "_id",
        as: "design_year",
      },
    },
    {
      $unwind: "$design_year",
    },
    {
      $lookup: {
        from: "ulbs",
        localField: "ulb",
        foreignField: "_id",
        as: "ulb",
      },
    },
    {
      $unwind: "$ulb",
    },
    {
      $group: {
        _id: {
          ulb: "$ulb._id",
          year: "$design_year.year",
        },
        ulbName: { $first: "$ulb.name" },
        ulbcode: { $first: "$ulb.code" },
        Certificate_pdf: { $first: "$cert.url" },
      },
    },
  ];
  let data = await GfcFormCollection.aggregate(query);
  let odfData = await OdfFormCollection.aggregate(query);

  data.push(...odfData);
  let documnetcounter = 1;
  working = 0;
  notWorking = 0;
  let arr = [];
  let target = data.length;
  console.log(target);
  let skip = 0;
  let batch = 150;
  while (skip <= target) {
    const slice = data.slice(parseInt(skip), parseInt(skip) + batch);
    await Promise.all(
      slice.map(async (el) => {
        for (let key in el) {
          if (key != "_id" && key != "ulbName" && key != "ulbcode" && el[key]) {
            documnetcounter++;
            let url = el[key];
            // let url = `https://${process.env.PROD_HOST}/objects/31e1883d-7eef-4b2f-9e29-18d598056a5d.pdf`
            try {
              let response = await doRequest(url);

              let obj = {
                ulbName: "",
                ulbCame: "",
                key: "",
                url: "",
                year: "",
              };
              obj.ulbName = el.ulbName;
              obj.ulbCode = el.ulbcode;
              obj.key = key;
              obj.url = response;
              obj.year = el["_id"]["year"];
              // console.log(obj)
              arr.push(obj);
            } catch (error) {
              //console.log('working', error)
              // `error` will be whatever you passed to `reject()` at the top
            }
          }
        }
      })
    );
    //for(let el of data){

    ///}
    console.log(skip);
    skip += batch;
  }
  return res.send({
    data: arr,
    number: arr.length,
    total: documnetcounter,
  });
};
