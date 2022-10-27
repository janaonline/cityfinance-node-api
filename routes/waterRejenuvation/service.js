const WaterRejenuvation = require("../../models/WaterRejenuvation&Recycling");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const User = require('../../models/User');
const Year = require('../../models/Year');
const {BackendHeaderHost, FrontendHeaderHost} = require('../../util/envUrl')
const {canTakenAction} = require('../CommonActionAPI/service');
const StateMasterForm = require('../../models/StateMasterForm')


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

exports.saveWaterRejenuvation = async (req, res) => {
  try {
    let { state, _id } = req.decoded;
    let data = req.body;
    const user = req.decoded;
    let formData = {};
    formData = {...data};

    const {_id: actionTakenBy, role: actionTakenByRole, } = user;

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

    if (data.state && data.design_year) {
      const submittedForm = await WaterRejenuvation.findOne(condition);
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
        //if actionTakenByRole !== state && isDraft=== false && status !== "APPROVED"
      } else {
        if (!submittedForm && formData.isDraft === false) {
          // final submit in first attempt
          // formData["stateSubmit"] = new Date();
          const form = await WaterRejenuvation.create(formData);
          formData.createdAt = form.createdAt;
          formData.modifiedAt = form.modifiedAt;
          if (form) {
            const addedHistory = await WaterRejenuvation.findOneAndUpdate(
              condition,
              { $push: { history: formData } },
              { new: true, runValidators: true }
            );
            if (addedHistory) {
              //email trigger after form submission
              // Service.sendEmail(mailOptions);
            }
            if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
                await UpdateStateMasterForm(req, "waterRejuventation");
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
            const form = await WaterRejenuvation.create(formData);
            if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
              await UpdateStateMasterForm(req, "waterRejuventation");
            }
            return response(form, res, "Form created", "Form not created");
          }
        }
      }
      if (submittedForm && submittedForm.status !== "APPROVED") {
        if (formData.isDraft === true) {
          const updatedForm = await WaterRejenuvation.findOneAndUpdate(
            condition,
            { $set: formData },
            { new: true, runValidators: true }
          );
          if (data.design_year === "606aaf854dff55e6c075d219") {
            //check for year 2021-22
            await UpdateStateMasterForm(req, "waterRejuventation");
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
          // formData["stateSubmit"] = new Date();
          const updatedForm = await WaterRejenuvation.findOneAndUpdate(
            condition,
            {
              $push: { history: formData },
              $set: formData,
            },
            { new: true, runValidators: true }
          );
          if(data.design_year === "606aaf854dff55e6c075d219"){//check for year 2021-22
            await UpdateStateMasterForm(req, "waterRejuventation");
          }
          if (updatedForm) {
            //email trigger after form submission
            // Service.sendEmail(mailOptions);
          }
          return response(
            updatedForm,
            res,
            "Form updated.",
            "Form not updated."
          );
        }
      }
      if (
        submittedForm.status === "APPROVED" &&
        submittedForm.actionTakenByRole !== "STATE" &&
        submittedForm.isDraft === false
      ) {
        return res.status(200).json({
          status: true,
          message: "Form already submitted",
        });
      }
    }

    // req.body.actionTakenBy = _id;
    // req.body.modifiedAt = new Date();
    // await WaterRejenuvation.findOneAndUpdate(
    //   { state: ObjectId(state), design_year: ObjectId(data.design_year) },
    //   data,
    //   {
    //     upsert: true,
    //     new: true,
    //     setDefaultsOnInsert: true,
    //   }
    // );
    // await UpdateStateMasterForm(req, "waterRejuventation");
    // return Response.OK(res, null, "Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};

exports.getWaterRejenuvation = async (req, res) => {
  const { state_id } = req.query;
  let state = req.decoded.state ?? state_id;
  const { design_year } = req.params;
  let role = req.decoded.role;
  const user = req.decoded;

  const {_id: actionTakenBy, role: actionTakenByRole, } = user;
  let condition = {};
  condition.state = state;
  condition.design_year = design_year;
  let host = "";
  host = req.headers.host;
  if (req.headers.host === BackendHeaderHost.Demo) {
    host = FrontendHeaderHost.Demo;
  }
  try {
    let userData = ""
    if(design_year === "606aaf854dff55e6c075d219"){
      const waterRej = await WaterRejenuvation.findOne({
        state: ObjectId(state),
        design_year,
      }).select({ history: 0 }).lean();
      if (!waterRej) {
        return Response.BadRequest(res, null, "No WaterRejenuvation found");
      }
      userData = await User.findOne({ _id: ObjectId(waterRej['actionTakenBy']) });
      waterRej['actionTakenByRole'] = userData['role'];;
      Object.assign(waterRej, {canTakeAction: canTakenAction(waterRej['status'], waterRej['actionTakenByRole'], waterRej['isDraft'], "STATE",role ) })
       return Response.OK(res, waterRej, "Success");
    
    }
    const year2122Id = await Year.findOne({year: "2021-22"}).lean();
    let data2122Query;
    if(year2122Id){
      data2122Query = WaterRejenuvation.findOne({
        state: ObjectId(state),
        design_year: ObjectId(year2122Id._id),
      }).lean();
    }
    const data2223Query = WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year,
    }).lean();

    const stateMasterFormDataQuery = StateMasterForm.findOne({
      state,
      design_year
    }).lean()
    const [ data2122, data2223, stateMasterFormData] = await Promise.all([
      data2122Query,
      data2223Query,
      stateMasterFormDataQuery
    ]);

    if(data2223){
      Object.assign(data2223, {canTakeAction: canTakenAction(data2223['status'], data2223['actionTakenByRole'], data2223['isDraft'], "STATE",role ) })
      return Response.OK(res, data2223, "Success");

    }
    let uaArray;
    // let uaArray2223;
    // let ua2122WaterBodies, ua2122ReuseWater, ua2122ServiceLevelIndicators;
    if (data2122) {
      if(data2122.isDraft === false){

        uaArray = data2122.uaData;
        for (let i = 0; i < uaArray.length; i++) {
          //Number of UAs
          // for (let ua of uaArray) {
            let ua = uaArray[i];
            //an entry of ua
            for (let category in ua) {
              //category in ua
              // if (category === "waterBodies")
              //   ua2122WaterBodies = uaArray[i].waterBodies;
              // if (category === "reuseWater")
              //   ua2122ReuseWater = uaArray[i].reuseWater;
              // if (category === "serviceLevelIndicators")
              //   ua2122ServiceLevelIndicators =
              //     uaArray[i].serviceLevelIndicators;
              if (
                category === "waterBodies" ||
                category === "reuseWater" ||
                category === "serviceLevelIndicators"
              ) {
                for (let project of ua[category]) {
                  //set project isDisable key = true
                  if (project) {
                    Object.assign(project, {isDisable:true})
                  }
                }
              }
            }
  
            // if (data2223) {
            //   uaArray2223 = data2223.uaData;
            //   //Number of UAs
            //   // for (let i = 0; i < uaArray2223.length; i++) {
            //   let ua = uaArray2223[i];
            //   // for (let ua of uaArray2223) {
            //   //category in ua
            //   for (let category in ua) {
            //     if (category === "waterBodies") {
            //       ua2122WaterBodies.push(...uaArray2223[i].waterBodies);
            //     } else if (category === "reuseWater") {
            //       ua2122ReuseWater.push(...uaArray2223[i].reuseWater);
            //     } else if (category === "serviceLevelIndicators") {
            //       ua2122ServiceLevelIndicators.push(
            //         ...uaArray2223[i].serviceLevelIndicators
            //       );
            //     }
            //   }
            //   // }
            //   // }
            // }
      }
        // }
        // if(data2223 && data2122){
        //   data2122.declaration = data2223.declaration
        // }
      }else if(data2122.isDraft === true){
         //no final submit
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/water-rejenuvation target="_blank">Click here</a> in order to submit form`,
        })
      }
      
    }else{
      if(!data2122){//Not found
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/water-rejenuvation target="_blank">Click here</a> in order to submit form`,
        })
      }
      // if(data2223){
      //   return res.status(200).json({
      //     status: true,
      //     message: "Data 2223",
      //     data: data2223
      //   })
      // }
    }
  
    // if(data2122 && data2223){
    //   data2223.uaData = data2122.uaData;
    //   return res.status(200).json({
    //     status: true,
    //     message: "Data found And Appended for 22-23 ",
    //     data: data2223
    //   })
    // }else
     if(data2122){
      data2122.status = null
      data2122.isDraft = null
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
    // const waterRej = await WaterRejenuvation.findOne({
    //   state: ObjectId(state),
    //   design_year,
    //   isActive: true,
    // }).select({ history: 0 }).lean();
    // let userData;
    // if (!waterRej) {
    //   return Response.BadRequest(res, null, "No WaterRejenuvation found");
    // }
    // userData = await User.findOne({ _id: ObjectId(waterRej['actionTakenBy']) });
    // waterRej['actionTakenByRole'] = userData['role'];

    // return Response.OK(res, waterRej, "Success");
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
    let currentWaterRejenuvation = await WaterRejenuvation.findOne({
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
      if (element.status === "REJECTED") {
        finalStatus = "REJECTED";
      }
      if (element.status === "PENDING") {
        finalStatus = "PENDING";
        return;
      }
    });
    req.body.status = finalStatus;

    const newWaterRejenuvation = await WaterRejenuvation.findOneAndUpdate(
      {
        state: ObjectId(state),
        design_year: ObjectId(design_year),
        isActive: true,
      },
      { $set: req.body, $push: { history: currentWaterRejenuvation } }
    );
    await UpdateStateMasterForm(req, "waterRejuventation");
    return Response.OK(res, newWaterRejenuvation, "Action Submitted!");
  } catch (err) {
    console.error(err.message);
    return Response.BadRequest(res, {}, err.message);
  }
};
