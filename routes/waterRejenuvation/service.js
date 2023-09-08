const WaterRejenuvation = require("../../models/WaterRejenuvation&Recycling");
const {
  UpdateStateMasterForm,
} = require("../../service/updateStateMasterForm");
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require("../../service").response;
const User = require('../../models/User');
const Year = require('../../models/Year');
const {BackendHeaderHost, FrontendHeaderHost} = require('../../util/envUrl')
const {canTakenAction,canTakenActionMaster, filterStatusResponseState} = require('../CommonActionAPI/service');
const StateMasterForm = require('../../models/StateMasterForm')
const { YEAR_CONSTANTS, MASTER_STATUS, MASTER_STATUS_ID, USER_ROLE } = require("../../util/FormNames");
const IndicatorLineItem = require('../../models/indicatorLineItems');
const { ModelNames } = require("../../util/15thFCstatus");
const {createAndUpdateFormMasterState, addActionKeys, createObjectFromArray} =  require('../../routes/CommonFormSubmissionState/service');
const CurrentStatus = require("../../models/CurrentStatus");
const UA = require('../../models/UA')
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
    if(req.body.design_year === "606aaf854dff55e6c075d219"){
      let { state, _id } = req.decoded;
      let data = req.body;  
      req.body.actionTakenBy = _id;
      req.body.modifiedAt = new Date();
      await WaterRejenuvation.findOneAndUpdate(
        { state: ObjectId(state), design_year: ObjectId(data.design_year) },
        data,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      await UpdateStateMasterForm(req, "waterRejuventation");
      return Response.OK(res, null, "Submitted!");
    }
    let { state, _id } = req.decoded;
    let data = req.body;
    const user = req.decoded;
    let formData = {};
    formData = {...data};
    let indicatorCondition = {type: "water supply"};
    let lineItems = await IndicatorLineItem.find(indicatorCondition).lean();
    let currentMasterFormStatus = req.body['status']

    let uaData = JSON.parse(JSON.stringify(formData['uaData']));
    const slbIndicatorObj = {};
    for(let lineItem of lineItems){
      let [min, max] =  lineItem['range'].split('-');
      slbIndicatorObj[lineItem['lineItemId']] = {
        min: Number(min),
        max: Number(max)
      }
    }
    if(req.body.design_year === YEAR_CONSTANTS['23_24']){
      for(let ua of uaData){
        let serviceLevelIndicatorsOfUA = ua['serviceLevelIndicators'];
        for(let indicator of serviceLevelIndicatorsOfUA){
          if(indicator['bypassValidation'] || req.body.isDraft){
            continue;
          }
          if(
            !(slbIndicatorObj[indicator['indicator']]['min'] <= indicator['existing']) ||
            !(slbIndicatorObj[indicator['indicator']]['max'] >= indicator['existing']) ||
            !(slbIndicatorObj[indicator['indicator']]['min'] <= indicator['after']) ||
            !(slbIndicatorObj[indicator['indicator']]['max'] >= indicator['after']) 
            ){
              return res.status(400).json({
                status: false,
                message: `Validation failed for ${indicator['name']}` ,
              });
          }
        }
      }
    }
    const {_id: actionTakenBy, role: actionTakenByRole, } = user;

    formData["actionTakenBy"] = ObjectId(actionTakenBy);
    formData["actionTakenByRole"] = actionTakenByRole;
    if (!req.body.entry_type == "bulkupload") {
      formData["uaData"].forEach(entity=>{
        entity.status = "PENDING"
      })
      formData.status = "APPROVED"
    }else{
      formData["uaData"].forEach(entity=>{
        entity.status = "APPROVED"
      })
      formData.status = "APPROVED"
    }
    if (formData.state) {
      formData["state"] = ObjectId(formData.state);
    }
    if (formData.design_year) {
      formData["design_year"] = ObjectId(formData.design_year);
    }

    const condition = {};
    condition["design_year"] = data.design_year;
    condition["state"] = data.state;

    if(data.state && data.design_year === YEAR_CONSTANTS['23_24'] ){
      formData.status = currentMasterFormStatus
      let params = {
        modelName: ModelNames['waterRej'],
        formData,
        res,
        actionTakenByRole,
        actionTakenBy
      };
      return await createAndUpdateFormMasterState(params);
      
    }
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
      design_year: ObjectId(YEAR_CONSTANTS['22_23']),
    }).lean();
    const data2324Query = WaterRejenuvation.findOne({
      state: ObjectId(state),
      design_year: ObjectId(YEAR_CONSTANTS['23_24']),
    }).lean();

    const stateMasterFormDataQuery = StateMasterForm.findOne({
      state,
      design_year: ObjectId(year2122Id._id)
    }).lean()
    const [ data2122, data2223, data2324,stateMasterFormData] = await Promise.all([
      data2122Query,
      data2223Query,
      data2324Query,
      stateMasterFormDataQuery
    ]);
    let uaArray;
    if (design_year === YEAR_CONSTANTS["23_24"]) {
      if (data2324) {
        let params = {
          status: data2324['currentFormStatus'],
          formType:"STATE",
          loggedInUser: role,
        };
        Object.assign(data2324, {
          canTakeAction: canTakenActionMaster(params),
          statusId: data2324['currentFormStatus'],
          status: MASTER_STATUS_ID[data2324['currentFormStatus']]
        });
        let currentStatusData =  await CurrentStatus.find({
          recordId: data2324._id,
        }).lean()
        currentStatusData = filterStatusResponseState(currentStatusData, data2324.currentFormStatus)
        let uaCode =  await UA.find({state},{UACode:1}).lean();
        uaCode = createObjectFromArray(uaCode);
        addActionKeys(data2324,uaCode, currentStatusData, role);

        return Response.OK(res, data2324, "Success");
      }
      if (data2223) {
        uaArray = getDisabledProjects(uaArray, data2223);
      } else {
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/dashboard target="_blank">Click here</a> in order to submit form`,
        });
      }
    }
    if (data2223) {
    if (![YEAR_CONSTANTS["21_22"], YEAR_CONSTANTS["22_23"]].includes(design_year)) {
      data2223['canTakeAction'] = false
    } else {
      Object.assign(data2223, {
        canTakeAction: canTakenAction(
          data2223["status"],
          data2223["actionTakenByRole"],
          data2223["isDraft"],
          "STATE",
          role
        ),
        //statusId: MASTER_STATUS["Not Started"],
        //status: MASTER_STATUS_ID[MASTER_STATUS["Not Started"]],
        //isDraft: null
      });
    }
      return Response.OK(res, data2223, "Success");
    }
    if (stateMasterFormData) {
      if(stateMasterFormData.isSubmit === true){

        uaArray = data2122.uaData;
        for (let i = 0; i < uaArray.length; i++) {

            let ua = uaArray[i];
            //an entry of ua
            for (let category in ua) {
              //category in ua
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
  
      }
      }else if(stateMasterFormData.isSubmit === false){
         //no final submit
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/dashboard target="_blank">Click here</a> in order to submit form`,
        })
      }
      
    }else{
      if(!stateMasterFormData){//Not found
        return res.status(400).json({
          status: true,
          message: `Your Previous Year's form status is - Not Submitted. Kindly submit form for previous year at - <a href =https://${host}/stateform/dashboard target="_blank">Click here</a> in order to submit form`,
        })
      }
      
    }
  
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
    }).lean();
    let formData = req.body;

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

    if(design_year === YEAR_CONSTANTS['22_23']){

      formData.actionTakenByRole = req.decoded.role;
      formData.actionTakenBy ? formData.actionTakenBy = ObjectId(formData.actionTakenBy): ""
      formData.state ? formData.state = ObjectId(formData.state): ""
      formData.design_year ? formData.design_year = ObjectId(formData.design_year): ""
      formData.createdAt =  currentWaterRejenuvation.createdAt
      formData.actionTakenBy ? formData.actionTakenBy = ObjectId(formData.actionTakenBy): ""

      delete formData.canTakeAction;

      const updatedForm = await WaterRejenuvation.findOneAndUpdate(
        {
          state: ObjectId(state),
          design_year: ObjectId(design_year),
        },
        { $set: req.body, $push: { history: formData } }
      ).lean();

      if(!updatedForm){
        return Response.BadRequest(res, {}, "Action not Submitted");  
      }
      return Response.OK(res, updatedForm, "Action Submitted!");

    }
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


module.exports.updateIndicatorId = async(  req, res)=>{
  try {
    const forms = await WaterRejenuvation.find({
      "design_year" : ObjectId("606aaf854dff55e6c075d219"),
    }).lean();
    
    let lineItems = await IndicatorLineItem.find({type: "water supply"}).lean();

    // let uaData = JSON.parse(JSON.stringify(forms['uaData']));
    const slbIndicatorObj = { };
    for(let lineItem of lineItems){
      slbIndicatorObj[lineItem['name'].toLowerCase()] = lineItem['_id']
    }

    let slbIndicatorObj2 = {
      "Per Capita Supply of Water": ObjectId("6284d6f65da0fa64b423b53c") ,
      "Coverage of Water Supply connections": ObjectId("6284d6f65da0fa64b423b53a"),
      "Continuity of Water supplied": ObjectId("6284d6f65da0fa64b423b542"),
      "Extent of Non-revenue WaterSanitationComponent": ObjectId("6284d6f65da0fa64b423b540"),
      "Quality of Water Supplied": ObjectId("6284d6f65da0fa64b423b546"),
      "Cost Recovery": ObjectId('6284d6f65da0fa64b423b548'),
      "Extent of Metering": ObjectId("6284d6f65da0fa64b423b53e")
    }
    let outputArray = [];

    for(let form of forms){
      delete form['history']
      let uaData = form['uaData'];
      for(let ua of uaData){
        let indicators = ua['serviceLevelIndicators'];
        for(let obj of indicators ){

          if(obj['indicator'] 
          && 
          typeof(obj['indicator']) === "string"
          ){
            let flag1= true;
            if(
              slbIndicatorObj.hasOwnProperty([obj['indicator'].toLowerCase()]) 
            ){
              flag1 = false;
              obj['indicator'] = ObjectId(slbIndicatorObj[obj['indicator'].toLowerCase()]) ;
            }
            if(          
               flag1
              &&
              slbIndicatorObj2.hasOwnProperty([obj['indicator']]) 
            ){
              obj['indicator'] =  ObjectId(slbIndicatorObj2[obj['indicator']]) 
            }
            // outputArray.push(obj['indicator']);
          }
            // outputArray.push(obj.indicator)
        }
      }
      // if (
      //   ![
      //     "6177be3700610849afca6e83",
      //     "6175321e57edc55c1536d56c",
      //     "62179aca323b779b9f30a0b8",
      //   ].includes(form._id.toString())
      // ) {
        const updatedForm = await WaterRejenuvation.findOneAndUpdate(
          {
            _id: form._id,
          },
          {
            $set: {
              uaData: form.uaData,
            },
          }
        );
      // }

    }

    // outputArray =  Array.from(new Set(outputArray))

    return res.status(200).json({
      success: true,
      data: forms
    })

  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}
function getDisabledProjects(uaArray, data2223) {
  uaArray = data2223.uaData;
  for (let i = 0; i < uaArray.length; i++) {
    let ua = uaArray[i];
    //an entry of ua
    for (let category in ua) {
      //category in ua
      if (category === "waterBodies" ||
        category === "reuseWater" ||
        category === "serviceLevelIndicators") {
        for (let project of ua[category]) {
          //set project isDisable key = true
          if (project) {
            Object.assign(project, { isDisable: true ,dprCompletion:"", dprPreparation:"", workCompletion:""});
            if(category === "serviceLevelIndicators"){
              Object.assign(project, {bypassValidation: true});
            }
          }
        }
      }
    }
  }
  return uaArray;
}

