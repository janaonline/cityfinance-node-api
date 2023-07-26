const catchAsync = require('../../util/catchAsync');
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require('../../service').response;
const { calculateStatus } = require('../../routes/CommonActionAPI/service');
const { CollectionNames } = require('../../util/15thFCstatus');
const FormHistory = require('../../models/FormHistory');
const StatusHistory = require('../../models/StatusHistory');
const { MASTER_STATUS_ID, YEAR_CONSTANTS, FORM_LEVEL_SHORTKEY } = require('../../util/FormNames');


module.exports.getHistory = catchAsync(async (req, res) => {

  try {
    let user = req.decoded;
    let { formId, ulbId, stateId, design_year } = req.query;

    let condition = { formId };
    if ([YEAR_CONSTANTS['20_21'], YEAR_CONSTANTS['21_22'], YEAR_CONSTANTS['22_23']].includes(design_year)) condition = { _id: ObjectId(formId) }

    console.log("condition",condition)
    /* Checking if formId is present or not. If not present then it will return error. */
    if ((!ulbId && !stateId) || !design_year || !formId) return Response.BadRequest(res, {}, "Required fields missing");

    const formTabData = await Sidemenu.findOne(condition).lean()
    if (user.role != "ULB" && formTabData) {
      let query = {}
      if (formTabData.role === "ULB") {
        query = {
          ulb: ObjectId(ulbId),
          design_year: ObjectId(design_year)
        };
        if (formTabData.dbCollectionName == CollectionNames['dur']) {
          query['designYear'] = ObjectId(design_year)
          delete query['design_year'];
        }
      } else if (formTabData.role === "STATE") {
        query = {
          state: ObjectId(stateId),
          design_year: ObjectId(design_year)
        };
      } else {
        return Response.BadRequest(res, {}, "Wrong Form Id");
      }
      let path = formTabData?.path;
      const model = require(`../../models/${path}`);
      let outputArr = [];
      if ([YEAR_CONSTANTS['20_21'], YEAR_CONSTANTS['21_22'], YEAR_CONSTANTS['22_23']].includes(design_year)) {
        let getData = await model.findOne(query, { history: 1 }).lean();
        //if (!getData) throw new Error(`${user.role} + " Not Authorized to Access this Data"`)
        if(getData){
          for (let el of getData['history']) {
            let output = {};
            output.status = calculateStatus(el.status, el.actionTakenByRole, el.isDraft, formTabData.role)
            output['time'] = el.modifiedAt;
            if (Object.keys(output).length > 0) {
              outputArr.push(output);
            }
          }
        }
      } else {
        let getData = await model.findOne(query, { _id: 1 }).lean();
        // if (!getData) throw new Error(`${user.role} + " Not Authorized to Access this Data"`)
        if(getData) outputArr = await getHistoryNew({ getData, formTabData });
      }
      return res.status(200).json({ success: true, message: "Data Fetched Successfully!", data: outputArr });
    } else {
      return res.status(400).json({ success: false, message: "No Data Found" });
    }
  } catch (error) {
    console.log("error", error)
    return res.status(400).json({ success: false, message: error.message });
  }
});

const getHistoryNew = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { getData, formTabData } = params
      let historyQuery = { recordId: { $in: ObjectId(getData._id) }, formId: formTabData?.formId, shortKey: FORM_LEVEL_SHORTKEY["form"], };
      let history = await StatusHistory.find(historyQuery, { "data": 1, createdAt: 1 }).lean();
      let outputArr = [];
      if (history.length) {
        for (let el of history) {
          const historyObj = el?.data ? el?.data[0] : {}
          let output = {};
          output.status = MASTER_STATUS_ID[historyObj?.status]
          output['time'] = el.createdAt
          if (Object.keys(output).length > 0) {
            outputArr.push(output);
          }
        }
      }
      resolve(outputArr);
    } catch (error) {
      console.log("Catch Error ", error);
      reject(error)
    }
  })
}