const State = require("../../models/State");
const Ulb = require("../../models/Ulb");
const UlbType = require("../../models/UlbType");
const UlbLedger = require("../../models/UlbLedger");
const LineItem = require("../../models/LineItem");
const OverallUlb = require("../../models/OverallUlb");
const XVFcForms = require("../../models/XVFinanceComissionReForms");
const service = require("../../service");
const Response = require("../../service").response;
const moment = require("moment");
const mongoose = require("mongoose");
const ObjectId = require("mongoose").Types.ObjectId;
const axios = require("axios");
const Redis = require("../../service/redis");
const ExcelJS = require("exceljs");
const { GSDP_OPT, DULY_ELECTED_OPT } = require("../../util/FormNames");
const { checkForUndefinedVaribales } = require("../CommonActionAPI/service");
const { ERROR_CODE} = require('../../util/Error_Constants')
module.exports.getFilteredUlb = async function (req, res) {
  let query = {};
  let query1 = {};
  query["isActive"] = true;

  try {
    if (req.query.state) {
      query["state"] = ObjectId(req.query.state);
      let ulbIds = await Ulb.distinct("_id", query).exec();
      query1["ulb"] = { $in: ulbIds };
      query1["questionnaireType"] = "ulb";
      let ulbId = await XVFcForms.find(query1, { _id: 0, ulb: 1 }).exec();
      let ulbArray = ulbId.map((s) => {
        return ObjectId(s.ulb);
      });
      query["_id"] = { $in: ulbIds, $nin: ulbArray };
    }

    try {
      service.find(query, Ulb, function (response, value) {
        return res.status(response ? 200 : 400).send(value);
      });
    } catch (e) {
      Response.DbError(res, e, `Something went wrong.`);
    }
  } catch (e) {
    return Response.InternalError(res, e.message, `Something went wrong`);
  }
};

module.exports.getUlbById = function (req, res) {
  if (!req.params._id || req.params._id == "undefined") {
    res.status(400).json({
      timestamp: moment().unix(),
      status: false,
      message: "'_id' param can't be blank",
    });
  }

  let match = { $match: {} };
  if (req.params._id) {
    match["$match"] = Object.assign({}, { _id: ObjectId(req.params._id) });
  }

  let arr = [
    match,
    {
      $lookup: {
        from: "states",
        localField: "state",
        foreignField: "_id",
        as: "state",
      },
    },
    { $unwind: "$state" },
    {
      $project: {
        state: "$state",
        isMillionPlus: {
          $cond: {
            if: { $eq: ["$isMillionPlus", "Yes"] },
            then: true,
            else: false,
          },
        },
      },
    },
  ];
  service.aggregate(arr, Ulb, function (response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};

module.exports.getName = async (req, res) => {
  let data = req.body;
  let ulbName = null;
  let ulbData = await Ulb.findOne({ censusCode: data?.code });
  if (ulbData) {
    ulbName = ulbData.name;
  } else {
    ulbData = await Ulb.findOne({ sbCode: data?.code });
    if (ulbData) ulbName = ulbData.name;
  }

  return res.status(200).json({
    name: ulbName,
  });
};

module.exports.get = async function (req, res) {
  let query = {};
  query["isActive"] = true;
  try {
    let keys = [];
    if (req.query.keys) {
      keys = JSON.parse(req.query.keys);
    }
    if (req.params && req.params._code) {
      query["code"] = req.params._code;
    }
    for (key in req.query) {
      if (key !== "keys") {
        if (req.query[key] && ObjectId.isValid(req.query[key])) {
          query[key] = ObjectId(req.query[key]);
        } else if (req.query[key]) {
          query[key] = req.query[key];
        }
      }
    }
    try {
      let ulbs = await Ulb.find(query, keys.join(" "))
        .populate([{ path: "ulbType", select: "name" }])
        .exec();
      Response.OK(res, ulbs, `ulb list.`);
    } catch (e) {
      Response.DbError(res, e, `Something went wrong.`);
    }
  } catch (e) {
    return Response.InternalError(res, e.message, `Something went wrong`);
  }
};
module.exports.put = async function (req, res) {
  try {
    let user = req.decoded,
      _id = ObjectId(req.params._id),
      obj = req.body;
    let actionAllowed = ["ADMIN", "MoHUA", "PARTNER", "STATE"];
    if (actionAllowed.indexOf(user.role) > -1) {
      let condition = { _id: _id };
      obj["modifiedAt"] = new Date();
      try {
        let du = await Ulb.update(condition, { $set: obj });

        return Response.OK(res, du, `updated successfully.`);
      } catch (err) {
        console.log("Error caught", err);
        return Response.BadRequest(res, e);
      }
    } else {
    }
  } catch (e) {
    return Response.BadRequest(res, e);
  }
};
module.exports.renameUlb = async function (req, res) {
  let censusCode = [
    801086, 800981, 800889, 800954, 801118, 801109, 801127, 800700, 800941,
    800953, 801110, 801170, 800649, 800662, 800994,

    800679, 800891, 900491, 800886, 801135, 800727, 900441, 800924, 800933,
    801171, 800824, 801077, 800799, 801227, 801117, 800871, 800939, 801137,
    800917, 801036, 801085, 801192, 800884, 800837, 801220, 800974, 801203,
    801154, 800692, 801113, 801146, 900446,
  ];
  let newNames = [
    "Prayagraj Municipal Corporation",
    "Etawah Municipality",
    "Shahjahanpur Municipal Corporation",
    "Amethi (Lucknow) Town Panchayat",
    "Amethi (Amethi) Town Panchayat",
    "Ayodhya Municipal Corporation",
    "Bhinga Municipality",
    "Gajraula Municipality",
    "Gangaghat Municipality",
    "Gosainganj (Ayodhya) Town Panchayat",
    "Gosainganj (Lucknow) Town Panchayat",
    "Hata Municipality",
    "Jalalabad (Shamli) Town Panchayat",
    "Jalalabad (Bijnor) Town Panchayat",
    "Jhinjhak Municipality",
    "Kanth (Moradabad) Town Panchayat",
    "Kanth (Shahjahanpur) Town Panchayat",
    "Kasba Sangrampur Town Panchayat",
    "Katra (Shahjahanpur) Town Panchayat",
    "Katra (Gonda) Town Panchayat",
    "Khekra Municipality",
    "Khoda Makanpur Municipality",
    "Kursath (Hardoi) Town Panchayat",
    "Kursath (Unnao) Town Panchayat",
    "Kushinagar Municipality",
    "Mainpuri Municipality",
    "Manjhanpur Municipality",
    "Mathura-Vrindavan Municipal Corporation",
    "Pt. Deen Dayal Upadhyaya Municipality",
    "Musafirkhana Town Panchayat",
    "Nawabganj (Gonda) Municipality",
    "Nawabganj (Unnao) Town Panchayat",
    "Nawabganj (Bareilly) Municipality",
    "Pali (Hardoi) Town Panchayat",
    "Pali (Lalitpur) Town Panchayat",
    "Phulpur (Prayagraj) Town Panchayat",
    "Phulpur (Azamgarh) Town Panchayat",
    "Powayan Municipality",
    "Saidpur (Budaun) Town Panchayat",
    "Saidpur (Ghazipur) Town Panchayat",
    "Sikanderpur (Kannauj) Town Panchayat",
    "Sikanderpur (Ballia) Town Panchayat",
    "Siswa Bazar Municipality",
    "Tanda (Rampur) Municipality",
    "Tanda (Ambedkar Nagar) Municipality",
    "Babhnan Bazar Town Panchayat",
    "Shahjahanpur_M Town Panchayat",
  ];
  let i = 0;
  for (let el of censusCode) {
    var digit = el.toString()[0];
    if (digit == "8") {
      await Ulb.updateOne({ censusCode: String(el) }, { name: newNames[i] });
    } else if (digit == "9") {
      await Ulb.updateOne({ sbCode: String(el) }, { name: newNames[i] });
    }

    i++;
  }

  return res.json({
    success: true,
  });
};
module.exports.post = async function (req, res) {
  let obj = req.body;
  // state and ulb type is compulsory
  if (obj.state && obj.type) {
    try {
      let message = "";
      // find state  information based on name
      let state = await State.findOne(
        { name: obj.state, isActive: true },
        { _id: 1 }
      ).exec();

      // find ulb type information based on name
      let ulbType = await UlbType.findOne(
        { name: obj.type, isActive: true },
        { _id: 1 }
      ).exec();

      state ? (obj.state = state._id) : (message += "State don't exists");
      ulbType ? (obj.ulbType = ulbType._id) : (message += " Ulb don't exists");

      if (!message) {
        service.post(Ulb, obj, function (response, value) {
          return res.status(response ? 200 : 400).send(value);
        });
      } else {
        return res.status(400).send({
          message: message,
          data: {},
        });
      }
    } catch (err) {
      console.log("Error caught", err);
      return res.status(500).send({
        message: "Error Caught",
        err: err,
      });
    }
  } else {
    return res.status(400).send({
      message: "State and Ulb type is compulsory",
      data: {},
    });
  }
};
module.exports.bulkPost = async function (req, res) {
  // state and ulb type is compulsory
  try {
       let {d, baseCode, baseSbCode, baseStateCode} = req.body
    let i = 1;
    d.map(e => {
      e['area'] = Number(e['area']);
      e['population']  = Number(e['population'])
      e['UA'] = null;
      e['sbCode'] = baseSbCode + i + "";
      e['code'] = baseStateCode + (baseCode + (i++)) 
    });
    await createData({ data: d });
    return res.status(200).send({
      message: "Success",
      err: {},
    });
  } catch (err) {
    console.log("Error caught", err);
    return res.status(500).send({
      message: "Error Caught",
      err: err,
    });
  }
};
const createData = (objData) => {
  const { data } = objData;
  return new Promise((resolve, reject) => {
    let prmsArr = [];
    for (const pf of data) {
      let pmr = new Promise(async (rjlv, rjct) => {
        try {
          let listData = await Ulb.findOne({ "sbCode": pf.sbCode }).lean();
          if (listData) {
            await Ulb.update({ "sbCode": pf.sbCode }, pf)
          } else {
            await Ulb.create(pf)
          }
          rjlv(1)
        } catch (error) {
          rjct(error);
        }
      })
      prmsArr.push(pmr);
    }
    Promise.all(prmsArr).then((values) => {
      resolve(values);
    }, (rejectErr) => {
      console.log("rejectErr", rejectErr);
      reject(rejectErr)
    }).catch((caughtErr) => {
      console.log("caughtErr", caughtErr)
      reject(caughtErr)
    })
  })
}

module.exports.multiUlbPost = async function (req, res) {
  try {
    const workbook = new ExcelJS.Workbook();
    let file = await workbook.xlsx.readFile(req.file.path);
    let worksheet = file.getWorksheet(1);
    let rowData = worksheet.getRows(1, worksheet.rowCount);
    let ulbData = [],
      allPromises = [];
    rowData.forEach((ele, index) => {
      if (index == 0) return true;
      let value = ele.values;
      let temObj = {
        name: value[2],
        code: value[3],
        censusCode: value[4],
        type: value[5],
        state: value[6],
        amrut: value[8],
        isMillionPlus: value[9],
      };
      ulbData.push(temObj);
    });
    ulbData.forEach((val) => {
      let tempPromise = axios.post(`${process.env.BASEURL}/ulb`, val, {
        headers: req.headers,
      });
      allPromises.push(tempPromise);
    });

    let result = await Promise.all(allPromises);
    return res.status(200).json({ msg: "success", ulbData, result });
  } catch (error) {
    return Response.InternalError(res, error);
  }
};
module.exports.delete = async function (req, res) {
  // Delete ulb based
  let condition = {
    _id: req.params._id,
  },
    update = {
      isActive: false,
    };
  service.put(condition, update, Ulb, function (response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};
module.exports.delete_permanent = async function (req, res) {
  // Delete ulb based
  let data = req.body;

  let viaCensusCode = data.viaCensusCode;
  let ulbCodes = data.ulbCode;
  if (viaCensusCode) {
    for (let el of ulbCodes) {
      var digit = el.toString()[0];
      if (digit == "8") {
        await Ulb.deleteOne({ censusCode: String(el) });
      } else if (digit == "9") {
        await Ulb.deleteOne({ sbCode: String(el) });
      }
      // await Ulb.deleteOne({ censusCode: el })
    }
  } else {
    await Ulb.deleteOne(ulbCodes);
  }

  return res.json({
    success: true,
  });
};

module.exports.getByState = async function (req, res) {
  try {
    // Get ulb list by state code
    let data = await Ulb.aggregate([
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $match: { "state.code": req.params.stateCode },
      },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      { $unwind: "$ulbType" },
      {
        $group: {
          _id: "$state.code",
          state: { $first: "$state.name" },
          ulbs: {
            $push: {
              _id: "$_id",
              state: "$state.name",
              code: "$code",
              name: "$name",
              natureOfUlb: "$natureOfUlb",
              type: "$ulbType.name",
              ward: "$ward",
              area: "$area",
              population: "$population",
              amrut: "$amrut",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          stateCode: "$_id",
          state: 1,
          ulbs: 1,
        },
      },
    ]).exec();

    if (data.length == 1) {
      return res
        .status(200)
        .send({ success: true, data: data[0], msg: "ULBS Found" });
    } else {
      return res.status(200).send({
        success: true,
        data: {},
        msg: "No ULBS for this state Found",
      });
    }
  } catch (e) {
    console.log("Error", e.message);
    return res
      .status(500)
      .send({ success: false, err: e.message, message: e.message });
  }
};
module.exports.getUlbInfo = async function (stateCode, ulbCode) {
  try {
    // Get ulb information using ulbCode
    let response = await Ulb.findOne({ code: ulbCode }).exec();
    if (response) {
      return response;
    } else {
      return null;
    }
  } catch (e) {
    console.log("Error", e);
    return {};
  }
};

module.exports.getUlbByCode = async function (req, res) {
  try {
    // get ulb information and other information based on ulbCode
    let ulbCode = req.query.code;
    let response = await Ulb.aggregate([
      { $match: { code: ulbCode } },
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "_id",
          as: "state",
        },
      },
      { $unwind: "$state" },
      {
        $lookup: {
          from: "ulbtypes",
          localField: "ulbType",
          foreignField: "_id",
          as: "ulbType",
        },
      },
      { $unwind: "$ulbType" },
      {
        $project: {
          _id: 1,
          stateCode: "$state.code",
          ulbs: 1,
          state: "$state.name",
          type: "$ulbType.name",
          wards: 1,
          area: 1,
          population: 1,
          natureOfUlb: 1,
          code: 1,
          name: 1,
          amrut: 1,
        },
      },
    ]).exec();
    if (response) {
      return res.status(200).json({
        success: true,
        message: "Ulb",
        data: response.length ? response[0] : null,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "Ulb",
        data: null,
      });
    }
  } catch (e) {
    console.log("Error", e);
    return res.status(400).json({
      success: true,
      message: "Db Error",
      data: null,
    });
  }
};

module.exports.getAllUlbs = async function (req, res) {
  try {
    // Get all ulbs list in older format, so that everything works fine
    let data;
    Redis.get("ulbList", async (err, value) => {
      // console.log(err, value);
      if (!value) {
        data = await Ulb.aggregate([
          {
            $lookup: {
              from: "states",
              localField: "state",
              foreignField: "_id",
              as: "state",
            },
          },
          { $unwind: "$state" },
          {
            $lookup: {
              from: "ulbtypes",
              localField: "ulbType",
              foreignField: "_id",
              as: "ulbType",
            },
          },
          { $unwind: "$ulbType" },
          {
            $group: {
              _id: "$state.code",
              state: { $first: "$state.name" },
              state_id: { $first: "$state._id" },
              ulbs: {
                $push: {
                  _id: "$_id",
                  state: "$state.name",
                  code: "$code",
                  name: "$name",
                  natureOfUlb: "$natureOfUlb",
                  type: "$ulbType.name",
                  ward: "$ward",
                  area: "$area",
                  population: "$population",
                  amrut: "$amrut",
                  location: "$location",
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              stateCode: "$_id",
              ulbs: 1,
              state: 1,
              state_id: 1,
            },
          },
        ]).exec();
        Redis.set("ulbList", JSON.stringify(data));
      } else {
        data = JSON.parse(value);
      }
      if (data.length) {
        let obj = {};
        for (let el of data) {
          obj[el.stateCode] = {
            state: el.state,
            ulbs: el.ulbs,
            _id: el.state_id,
          };
        }
        return res
          .status(200)
          .send({ success: true, data: obj, msg: "ULBS Found" });
      } else {
        return res
          .status(200)
          .send({ success: true, data: {}, msg: "No ULBS Found" });
      }
    });
  } catch (e) {
    console.log("Erro", e);
    return {};
  }
};

// Get all ledgers present in database in CSV Format
module.exports.getAllULBSCSV = function (req, res) {
  let filename = "All Ulbs " + moment().format("DD-MMM-YY HH:MM:SS") + ".csv";

  // Set approrpiate download headers
  res.setHeader("Content-disposition", "attachment; filename=" + filename);
  res.writeHead(200, { "Content-Type": "text/csv;charset=utf-8,%EF%BB%BF" });

  res.write(
    "ULB Name, City Finance Code,Census Code, Swatcha Bharat Code, ULB Type, Ulb Active, CFR Activity (Yes/No), State Name, State Code, District Name, Nature of ULB, Area, Ward, Population, Status of ULBs (Duly elected/ Not elected), Elected Date, Property Tax GSDP Eligibility (Eligible/ Not Eligible), AMRUT, Latitude,Longitude,isMillionPlus, UA, UA_code, Created On, Modified On \r\n"
  );
  // Flush the headers before we start pushing the CSV content
  res.flushHeaders();

  Ulb.aggregate([
    {
      $lookup: {
        from: "states",
        as: "states",
        foreignField: "_id",
        localField: "state",
      },
    },
    {
      $lookup: {
        from: "ulbtypes",
        as: "ulbtypes",
        foreignField: "_id",
        localField: "ulbType",
      },
    },
    {
      $lookup: {
        from: "uas",
        as: "UA_Data",
        foreignField: "_id",
        localField: "UA",
      },
    },

    {
      $project: {
        ulbs: { $arrayElemAt: ["$ulbs", 0] },
        states: { $arrayElemAt: ["$states", 0] },
        ulbtypes: { $arrayElemAt: ["$ulbtypes", 0] },
        UA: { $arrayElemAt: ["$UA_Data", 0] },
        natureOfUlb: 1,
        lineitems: { $arrayElemAt: ["$lineitems", 0] },
        financialYear: "$financialYear",
        area: 1,
        population: 1,
        amrut: 1,
        name: 1,
        code: 1,
        wards: 1,
        isActive: 1,
        location: 1,
        createdAt: 1,
        modifiedAt: 1,
        isMillionPlus: 1,
        censusCode: 1,
        sbCode: 1,
        isGsdpEligible : 1,
        isDulyElected : 1,
        electedDate:{$dateToString:{ format: "%d/%m/%Y", date: "$electedDate" }  }
      },
    },
    {
      $project: {
        _id: 0,
        ulb: { $cond: ["$ulbs", "$ulbs", "NA"] },
        state: { $cond: ["$states", "$states", "NA"] },
        ulbtypes: { $cond: ["$ulbtypes", "$ulbtypes", "NA"] },
        financialYear: 1,
        natureOfUlb: 1,
        area: 1,
        population: 1,
        amrut: 1,
        name: 1,
        code: 1,
        wards: 1,
        location: 1,
        isActive: 1,
        isMillionPlus: 1,
        createdAt: 1,
        modifiedAt: 1,
        censusCode: { $cond: ["$censusCode", "$censusCode", "NA"] },
        sbCode: { $cond: ["$sbCode", "$sbCode", "NA"] },
        UA: { $cond: ["$UA", "$UA.name", "NA"] },
        UA_Code: { $cond: ["$UA", "$UA.UACode", "NA"] },
        isGsdpEligible :  { 
          $cond: [
            { $eq: [{ $ifNull: ["$isGsdpEligible", false] }, true] },
            GSDP_OPT['ELIGIBLE'],
            GSDP_OPT['NOT_ELIGIBLE'],
          ]},
        isDulyElected :{
          $cond: [
            { $eq: [{ $ifNull: ["$isDulyElected", false] }, true] },
            DULY_ELECTED_OPT['DULY_ELECTED'],
            DULY_ELECTED_OPT['NOT_ELECTED']
          ]},
        electedDate:{ $cond: ["$electedDate", "$electedDate", ""] }
      },
    },
  ]).exec((err, data) => {
    if (err) {
      res.json({
        success: false,
        msg: "Invalid Payload",
        data: err.toString(),
      });
    } else {
      for (let el of data) {
        el.natureOfUlb = el.natureOfUlb ? el.natureOfUlb : "";
        el.name = el.name ? el.name.toString().replace(/[,]/g, " | ") : "";
        el.location = el.location ? el.location : { lat: "NA", lng: "NA" };
        res.write(
          el.name +
          "," +
          el.code +
          "," +
          el.censusCode +
          "," +
          el.sbCode +
          "," +
          el.ulbtypes.name +
          "," +
          el.isActive +
          "," +
          ","+
          el.state.name +
          "," +
          el.state.code +
          "," +
          ","+
          el.natureOfUlb +
          "," +
          el.area +
          "," +
          el.wards +
          "," +
          el.population +
          "," +
          el.isDulyElected +
          "," +
          el.electedDate +
          "," +
          el.isGsdpEligible +
          "," +
          el.amrut +
          "," +
          el.location.lat +
          "," +
          el.location.lng +
          "," +
          el.isMillionPlus +
          "," +
          el.UA +
          "," +
          el.UA_Code +
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

module.exports.getPopulate = async (req, res, next) => {
  try {
    let data = await Ulb.find({}, "_id name code state ulbType")
      .populate("state", "_id name")
      .populate("ulbType", "_id name")
      .exec();
    return res.status(200).json({
      timestamp: moment().unix(),
      success: true,
      message: "Ulb list",
      data: data,
    });
  } catch (e) {
    console.log("Caught Exception:", e);
    return res.status(500).json({
      timestamp: moment().unix(),
      success: true,
      message: "Ulb Exception:" + e.message,
    });
  }
};
module.exports.getUlbs = async (req, res) => {
  try {
    let query = {};
    if (req.query.state) {
      query["state"] = Schema.Types.ObjectId(req.query.state);
    }
    let selectiveUlbs = await UlbLedger.distinct("ulb", {
      isActive: true,
    }).exec();
    query["_id"] = { $in: selectiveUlbs };
    let ulbs = await Ulb.find(query, {
      _id: 1,
      name: 1,
      code: 1,
      state: 1,
      location: 1,
      population: 1,
      area: 1,
    }).exec();
    return res.status(200).json({
      message: "Ulb list with population and coordinates and population.",
      success: true,
      data: ulbs,
    });
  } catch (e) {
    console.log("Exception", e);
    return res
      .status(400)
      .json({ message: "", errMessage: e.message, success: false });
  }
};
// TODO: check and optimize
async function getOldQueryData(req) {
  let query = {};
    if (req.query.state) {
      query["state"] = Schema.Types.ObjectId(req.query.state);
    }
    let condition = { isActive: true };
    let financialYear =
      req.body.year && req.body.year.length ? req.body.year : null;
    financialYear
      ? (condition["financialYear"] = { $in: financialYear })
      : null;

    let auditLineItem = await LineItem.findOne({ code: "1001" }).exec();
    if (financialYear && financialYear.length) {
      let commonUlbs = await getUlbs(financialYear);
      condition["ulb"] = { $in: commonUlbs };
    }
    // if(auditLineItem){
    //   condition["lineItem"] = auditLineItem._id;
    // }
    let ulbs = await UlbLedger.aggregate([
      { $match: condition },
      {
        $group: {
          _id: {
            ulb: "$ulb",
          },
          lineItem: {
            $addToSet: { _id: "$lineItem", amount: "$amount" },
          },
        },
      },
      {
        $project: {
          ulb: "$_id.ulb",
          lineItem: {
            $filter: {
              input: "$lineItem",
              as: "lineItem",
              cond: {
                $and: [
                  {
                    $eq: ["$$lineItem._id", auditLineItem._id],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          ulb: 1,
          lineItem: { $arrayElemAt: ["$lineItem", 0] },
        },
      },
      {
        $project: {
          ulb: 1,
          amount: "$lineItem.amount",
        },
      },
      {
        $project: {
          ulb: 1,
          auditStatus: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$amount", 0] },
                  then: "unaudited",
                },
                {
                  case: { $gt: ["$amount", 0] },
                  then: "audited",
                },
              ],
              default: "auditNA",
            },
          },
        },
      },
      {
        $lookup: {
          from: "ulbs",
          as: "ulb",
          foreignField: "_id",
          localField: "ulb",
        },
      },
      { $unwind: "$ulb" },
      {
        $project: {
          state: "$ulb.state",
          code: "$ulb.code",
          name: "$ulb.name",
          _id: "$ulb._id",
          area: "$ulb.area",
          population: "$ulb.population",
          auditStatus: 1,
          location: "$ulb.location",
        },
      },
    ]).allowDiskUse(true);
    return ulbs;
}
module.exports.getUlbsWithAuditStatus = async (req, res) => {
  // mongoose.set('debug', true);
  try {
    let ulbs = [];
    if (req.body.newQuery1) {
      let query = { isActive: true };
      if (req.query.state) {
        query["state"] = ObjectId(req.query.state);
      }
      ulbs = await Ulb.aggregate([{
        '$match': query
      }, {
        '$lookup': {
          from: 'ulbledgers',
          as: 'ulbLedger',
          foreignField: 'ulb',
          localField: '_id'
        }
      }, {
        $match: {
          "ulbLedger": {
            $ne: []
          }
        }
      }, {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
          state: 1,
          ulbType: 1,
          location: 1,
          population: 1,
          area: 1
        }
      }]).exec();
      // ulbs = await Ulb.find(query, "_id name code state ulbType area population location")
      //   .exec();
    } else {
      ulbs = await getOldQueryData(req);
    }
    
    return res.status(200).json({
      message: "Ulb list with population and coordinates and population.",
      success: true,
      data: ulbs,
    });
  } catch (e) {
    console.log("Exception", e);
    return res
      .status(400)
      .json({ message: "", errMessage: e.message, success: false });
  }
};
module.exports.getOverallUlb = async function (req, res) {
  let query = {};
  query["isActive"] = true;
  if (req.params && req.params._code) {
    query["code"] = req.params._code;
  }
  // Get any ulb
  // Ulb is model name
  service.find(query, OverallUlb, function (response, value) {
    return res.status(response ? 200 : 400).send(value);
  });
};
const getUlbs = (yrs) => {
  return new Promise(async (resolve, reject) => {
    let years = yrs ? yrs.sort() : [];
    let ulbs = [];
    try {
      for (let i = 0; i < years.length; i++) {
        let year = years[i];
        let query = { financialYear: year };
        if (i > 0) {
          query["ulb"] = { $in: ulbs };
        }
        ulbs = await UlbLedger.distinct("ulb", query).exec();
      }
      resolve(ulbs);
    } catch (e) {
      console.log(e);
      reject(e);
    }
  });
};

module.exports.getUlbInUas = async function (req, res) {
  try {
    let { state_id } = req.query;
    let state = req.decoded.state ?? state_id;
    let response = await Ulb.find({ state: ObjectId(state) }).select({
      name: 1,
      _id: 1,
    });
    let newRes = {};
    response.forEach((element) => {
      newRes[element._id] = element.name;
      newRes[element.name] = element._id;
    });
    if (response) {
      return res.status(200).json({
        success: true,
        message: "Ulb",
        data: newRes,
      });
    } else {
      return res.status(400).json({
        success: true,
        message: "No Ulb Found",
        data: null,
      });
    }
  } catch (e) {
    console.log("Error", e);
    return res.status(400).json({
      success: true,
      message: "Db Error",
      data: null,
    });
  }
};
module.exports.getUlbDatafromGeoUrban = async (req, res) => {
  const params = new URLSearchParams();
  params.append("UserName", "SBM");
  params.append("Password", "123456");
  params.append("StateCode", "0");

  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  axios
    .post(
      "http://swachhbharaturban.gov.in/sbmgis/api/CensusULBCode",
      params,
      config
    )
    .then(async (result) => {
      console.log(result.data.length);

      let field = csvTableData();

      let xlsData = await service.dataFormating(result.data, field);
      let filename = "ULB List.xlsx";
      return res.xls(filename, xlsData);
      // Do somthing
    })
    .catch((err) => {
      console.log(err.message);
    });
};
function csvTableData() {
  return (field = {
    UlbName: "ULB Name",
    UlbCode: "ULB Code",
    Lat: "Latitude",
    Lng: "Longitude",
    StateName: "State",
  });
}
module.exports.eligibleULBForms = async function (req, res) {
  let user = req.decoded;
  let { ulb_id } = req.query;
  let ulb = user.ulb ?? ulb_id;
  if (!ulb) {
    return res.status(400).json({
      success: false,
      message: "ULB ID NOT FOUND",
    });
  }
  let ulbData = await Ulb.findOne({ _id: ObjectId(ulb) });

  let output = {
    pfms: 0,
    gtc: 1,
    utilReport: 1,
    annualAccounts: 1,
    slbs: 1,
    slbWaterSupplySanitation: 1,
    plansWaterSupplySanitation: 0,
  };

  return res.status(200).json({
    success: true,
    data: output,
  });
};

module.exports.truncateSbCode = async (req, res) => {
  const query = {
    createdAt: {
      $gt: new Date("2022-11-17")
    },

  };
  let updatedUlbs = []
  let ulbs = await Ulb.find(query).lean();
  for (let ulb of ulbs) {
    // ulbs.forEach(async (ulb)=>{
    let sbCode = Number(ulb.sbCode).toFixed();
    let x = await Ulb.findOneAndUpdate({
      _id: ulb._id
    }, {
      $set: {
        sbCode: sbCode
      }
    }).lean()

    updatedUlbs.push(JSON.stringify(JSON.parse(x.sbCode)));

  }

  return res.status(200).json({
    updatedUlbs,
    length: updatedUlbs.length
  })
}

/*It is an asynchronous function that handles a request to update fields in a database. */
module.exports.updateFields = async (req, res)=>{
  try{
    const { data, modelPath, filter, filterOperator} = req.body;
    let validObj = Object.keys(req.body).length && checkForUndefinedVaribales(req.body);
    if(!validObj.valid){
      throw Error(`${validObj.message ?? 'Fields missing'}`)
    }
    // const Model =  require(`../../models/${modelPath}`);
    let query = getQuery(filter, data, filterOperator);
    let output = await Ulb.bulkWrite(query);
    return Response.OK(res,output);
  }catch(error){
    if(Object.keys(ERROR_CODE).includes(error.code)){
      return Response.BadRequest(res, {}, ERROR_CODE[error.code]);
    }
    return Response.BadRequest(res, {},error.message);
  }
}

/**
 * The function `getQuery` takes in a filter, data, and filterOperator, and returns a query that can be
 * used to update multiple documents in a database.
 * @param filter - An array of strings representing the properties to filter on.
 * @param data - The `data` parameter is an array of objects. Each object represents a data entry with
 * multiple properties.
 * @param filterOperator - The `filterOperator` parameter is a string that specifies the operator to
 * use when combining multiple filters. It is used to create the filter query for each object in the
 * `data` array.
 * @returns a query array.
 */
function getQuery(filter, data, filterOperator) {
  try {
    let query = [];
    let filterArray = filter.reduce((acc, el) => {
      acc.push({ [el]: undefined });
      return acc;
    }, []);

    data.forEach((obj) => {
      let filterQuery = filterArray.map((filter) => {
        const keyInFilter = getObjectKey(filter,0)
        if (obj[keyInFilter]) {
           filter[keyInFilter] = obj[keyInFilter];
          delete obj[keyInFilter];
          return filter;
        } 
        return;
      });
      filterQuery = filterQuery.filter((el) => el && el);
      query.push({
        updateOne: {
           filter: { [filterOperator]: JSON.parse(JSON.stringify(filterQuery)) },
           update: { $set : obj}
          }
      });
    });
    return query;
  } catch (error) {
    throw Error({message: `getQuery : ${error.message}`})
  }
}


/**
 * The function `getObjectKey` returns the key at a specified index in an object.
 * @param obj - The `obj` parameter is an object from which we want to retrieve a key.
 * @param idx - The `idx` parameter is the index of the key you want to retrieve from the `obj` object.
 * @returns the key at the specified index in the object.
 */
function getObjectKey(obj, idx){
  try {
    return Object.keys(obj)[idx];
  } catch (error) {
    throw Error({message: `${error.message}`})
  }
}