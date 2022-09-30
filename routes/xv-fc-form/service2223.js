
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

if(data){
    data = data?.waterManagement
}

return res.status(200).json({
    success: true,
    data : data
})
}