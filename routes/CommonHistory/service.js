const catchAsync = require('../../util/catchAsync');
const Sidemenu = require('../../models/Sidemenu');
const ObjectId = require("mongoose").Types.ObjectId;
const Response = require('../../service').response;
const {calculateStatus} = require('../../routes/CommonActionAPI/service');
const { CollectionNames } = require('../../util/15thFCstatus')

module.exports.getHistory = catchAsync(async (req, res) => {
    let user = req.decoded;
    let { formId , ulbId, stateId, design_year } = req.query;

    /* Checking if formId is present or not. If not present then it will return error. */
    if((!ulbId && !stateId) || !design_year || !formId) return Response.BadRequest(res, {}, "Required fields missing");

    const formTabData = await Sidemenu.findOne({_id: ObjectId(formId)}).lean()
    if (user.role != "ULB" && formTabData) {
      let query = {}
      if(formTabData.role ==="ULB"){
       query =  {
            ulb: ObjectId(ulbId),
            design_year: ObjectId(design_year)
        };
        if(formTabData.dbCollectionName ==  CollectionNames['dur']){
            query['designYear'] = ObjectId(design_year)
            delete query['design_year'];
        }
      }else if(formTabData.role === "STATE"){
        query =  {
            state: ObjectId(stateId),
            design_year: ObjectId(design_year)
          };
      }else {
        return Response.BadRequest(res, {}, "Wrong Form Id");
      }
      let path = formTabData?.path;
      const model = require(`../../models/${path}`);
      let getData = await model.findOne(query, { history: 1 }).lean();
      let outputArr = [];
      if (getData) {
        for(let el of getData['history']){
        // getData["history"].forEach((el) => {
          let output = {};

            output.status =  calculateStatus(el.status, el.actionTakenByRole, el.isDraft, formTabData.role )
            output['time'] = el.modifiedAt;
            if(Object.keys(output).length> 0){
                outputArr.push(output);
            }
        };
        return res.status(200).json({
          success: true,
          message: "Data Fetched Successfully!",
          data: outputArr,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "No Data Found",
        });
      }
    } else {
      return res.status("403").json({
        success: false,
        message: user.role + " Not Authorized to Access this Data",
      });
    }
  });

