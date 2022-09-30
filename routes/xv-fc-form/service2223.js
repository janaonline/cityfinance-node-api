
const Ulb = require("../../models/Ulb");
const UlbFinancialData = require("../../models/UlbFinancialData");
const XVFCGrantULBData = require("../../models/XVFcGrantForm");
const LoginHistory = require("../../models/LoginHistory");
const User = require("../../models/User");
const State = require("../../models/State");
const XVStateForm = require("../../models/XVStateForm");
const Response = require("../../service").response;
const Service = require("../../service");
const ObjectId = require("mongoose").Types.ObjectId;
const moment = require("moment");
const { JsonWebTokenError } = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
var AdmZip = require("adm-zip");
const { strict } = require("assert");
const { MongooseDocument } = require("mongoose");
const dir = "uploads";
const axios = require('axios')
const request = require('request')
const subDir = "/source";
const date = moment().format("DD-MMM-YY");
const catchAsync = require("../../util/catchAsync");
const Year = require("../../models/Year");
const { findOne } = require("../../models/LedgerLog");
const { UpdateMasterSubmitForm } = require("../../service/updateMasterForm");
const UA = require("../../models/UA");
const util = require("util");
const { isNull } = require("util");
const statusTypes = require('../../util/statusTypes')
const FORM_STATUS = require("../../util/newStatusList");


module.exports.get2223 = async (req,res) => {
let _id = req.query._id;
let design_year = req.query.design_year;
let condition = {
    ulb: ObjectId(_id),
    design_year: ObjectId(design_year)
}
let data = await XVFCGrantULBData.findOne(condition);
let ulbData = await Ulb.findOne({_id: ObjectId(ulb)}).lean();
  let userData = await User.findOne({isNodalOfficer: true, state:ulbData.state }).lean()
let status = data?.waterManagement?.status;
let obj = {
    action:"",
    url:""
}
{
    if(status == FORM_STATUS.Under_Review_By_MoHUA || status == FORM_STATUS.Approved_By_MoHUA ){
      obj['action'] = 'not_show';
      obj['url'] = ``;
    }else if(status == FORM_STATUS.Under_Review_By_State){
      let msg = role == "ULB" ?  `Dear User, Your previous Year's form status is - ${status}. Kindly contact your State Nodal Officer at Mobile - ${userData.mobile ?? 'Not Available'} or Email - ${userData.email ?? 'contact@cityfinance.in'}` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to mark your response once the ULB Submits this form. `
      obj['action'] = 'note';
      obj['url'] = msg;
    } else{
      let host ="";
      if(req.headers.host === BackendHeaderHost.Demo){
        host = FrontendHeaderHost.Demo;
      }
      req.headers.host = host !== "" ? host: req.headers.host;
      let msg = role == "ULB" ? `Dear User, Your previous Year's form status is - ${status ? status : 'Not Submitted'} .Kindly submit Detailed Utilization Report Form for the previous year at - <a href=https://${req.headers.host}/ulbform/slbs target="_blank">Click Here!</a> in order to submit this year's form . ` : `Dear User, The ${ulbData.name} has not yet filled this form. You will be able to mark your response once the ULB Submits this form. `
      obj['action'] = 'note'
      obj['url'] = msg ;
    }
  }
if(data){
    data = data?.waterManagement
    Object.assign(data, {msg : obj})
}

return res.status(200).json({
    success: true,
    data : data
})
}