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
const ObjectId = require("mongoose").Types.ObjectId;
const axios = require("axios");
const Redis = require("../../service/redis");
const ExcelJS = require("exceljs");

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
    let d = [
      {
        "name": "Harnaut Nagar Panchayat",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.25,
        "wards": 19,
        "population": 30725,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951001,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Sarmera",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11.93,
        "wards": 10,
        "population": 12551,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951002,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Rahui",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6,
        "wards": 10,
        "population": 12703,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951003,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Asthawan",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.61,
        "wards": 11,
        "population": 12551,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951004,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Parwalpur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 20,
        "wards": 11,
        "population": 13432,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951005,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Ekangarsarai",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 25,
        "wards": 16,
        "population": 23010,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951006,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nalanda",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 35.5,
        "wards": 17,
        "population": 26484,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951007,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Pawapuri",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 20.59,
        "wards": 11,
        "population": 13241,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951008,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Chandi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 0,
        "wards": 11,
        "population": 14235,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951009,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Giriyak",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 4,
        "wards": 12,
        "population": 15825,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951010,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Garhani",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9.5,
        "wards": 12,
        "population": 15198,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951011,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Chausa",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 10.62,
        "wards": 14,
        "population": 21004,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951012,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Brahampur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9.075,
        "wards": 13,
        "population": 17057,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951013,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Hata",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9.0243,
        "wards": 11,
        "population": 14915,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951014,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kudra",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.0491,
        "wards": 15,
        "population": 21808,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951015,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Ramgarh",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 7.9,
        "wards": 13,
        "population": 18152,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951016,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Karakat",
        "ulbType": "5dd24adcbff7a9226a3231ae",
        "area": 11.57,
        "wards": 12,
        "population": 15774,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951017,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Rohtas",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.45,
        "wards": 13,
        "population": 18787,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951018,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Chenari",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9.29,
        "wards": 14,
        "population": 19596,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951019,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Dinara",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 5.88,
        "wards": 12,
        "population": 14579,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951020,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Minapur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 16.47,
        "wards": 18,
        "population": 27382,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951021,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Saraiya",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 10.72,
        "wards": 12,
        "population": 16336,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951022,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Sakra",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.5,
        "wards": 18,
        "population": 14071,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951023,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Madhopur Susta",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15,
        "wards": 15,
        "population": 12827,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951024,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Baruraj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 19.17,
        "wards": 18,
        "population": 27064,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951025,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Turki Kurhani",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 25,
        "wards": 11,
        "population": 13544,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951026,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Muraul",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8,
        "wards": 10,
        "population": 12685,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951027,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Louria",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 14,
        "wards": 14,
        "population": 20489,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951028,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Machhargawan",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18,
        "wards": 15,
        "population": 22580,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951029,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Jandaha",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6.42,
        "wards": 14,
        "population": 19488,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951030,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Goraul",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9.5,
        "wards": 14,
        "population": 20267,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951031,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Patepur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11.64,
        "wards": 14,
        "population": 20058,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951032,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Tarapur Munger",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 2.2,
        "wards": 17,
        "population": 18673,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951033,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Surajgarha",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 16.7,
        "wards": 26,
        "population": 43108,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951034,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Suryagarha",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 16.7,
        "wards": 26,
        "population": 43108,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951035,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Shekhopur Sarai",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.11,
        "wards": 15,
        "population": 22748,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951036,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Chewara",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 14.14,
        "wards": 10,
        "population": 12303,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951037,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Sikandra",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.0087,
        "wards": 12,
        "population": 16879,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951038,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Alauli",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 5.31,
        "wards": 12,
        "population": 15525,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951039,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Mansi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 7.02,
        "wards": 18,
        "population": 15525,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951040,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Parbatta",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 24,
        "wards": 21,
        "population": 32575,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951041,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Beldaur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.88,
        "wards": 14,
        "population": 20703,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951042,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Khizarsarai Nagar Panchayat",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 12,
        "wards": 13,
        "population": 18008,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951043,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Dobhi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 7.93,
        "wards": 11,
        "population": 14427,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951044,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Immamganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 0,
        "wards": 15,
        "population": 22421,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951045,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Fatehpur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 0,
        "wards": 11,
        "population": 13658,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951046,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Wazirganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 3.5,
        "wards": 15,
        "population": 22197,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951047,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Deo",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 10.64,
        "wards": 11,
        "population": 13162,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951048,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Barun",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 13.84,
        "wards": 11,
        "population": 13852,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951049,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Rajauli",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 10.7,
        "wards": 14,
        "population": 20336,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951050,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Ghoshi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 22.3,
        "wards": 20,
        "population": 31395,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951051,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kako",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 0,
        "wards": 16,
        "population": 23037,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951052,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kurtha",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18,
        "wards": 10,
        "population": 12805,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951053,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Baisi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.62,
        "wards": 10,
        "population": 12974,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951054,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Amour",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 17.41,
        "wards": 12,
        "population": 15310,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951055,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Jankinagar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 24,
        "wards": 15,
        "population": 21883,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951056,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Dhamdaha",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11.38,
        "wards": 23,
        "population": 37987,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951057,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Mirganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 45.13,
        "wards": 17,
        "population": 26095,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951058,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Bhawanipur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6.3,
        "wards": 16,
        "population": 29012,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951059,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Rupauli",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.3,
        "wards": 16,
        "population": 23454,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951060,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Champanagr",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 17.76,
        "wards": 13,
        "population": 17605,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951061,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Balrampur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 42,
        "wards": 10,
        "population": 12164,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951062,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kursela",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 26.3002,
        "wards": 13,
        "population": 17208,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951063,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Korha",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 20,
        "wards": 11,
        "population": 14113,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951064,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Barari (Katihar)",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 5.3742,
        "wards": 11,
        "population": 14986,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951065,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Amdabad",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.9768,
        "wards": 16,
        "population": 24655,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951066,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Narpatganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18,
        "wards": 20,
        "population": 32941,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951067,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Jokihat",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6.6732,
        "wards": 12,
        "population": 15790,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951068,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Raniganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 0,
        "wards": 18,
        "population": 28620,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951069,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Pauakhali",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 40,
        "wards": 11,
        "population": 13350,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951070,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Guthani",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6.23,
        "wards": 15,
        "population": 23565,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951071,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Andar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 4.86,
        "wards": 11,
        "population": 14824,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951072,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Gopalpur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 4.31,
        "wards": 10,
        "population": 12766,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951073,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Hasanpura",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.187,
        "wards": 19,
        "population": 30304,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951074,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Barharia",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.59,
        "wards": 13,
        "population": 18665,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951075,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Basantpur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 4.52,
        "wards": 11,
        "population": 13293,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951076,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Manjhi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15,
        "wards": 15,
        "population": 21081,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951077,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kopa",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 13,
        "wards": 13,
        "population": 18779,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951078,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Mashrakh",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 14.5,
        "wards": 16,
        "population": 24197,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951079,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Harthua",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11.44,
        "wards": 22,
        "population": 35906,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951080,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Kueshwar Asthan Purbi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.1,
        "wards": 13,
        "population": 17258,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951081,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Baheri",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 15.92,
        "wards": 15,
        "population": 21872,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951082,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Hayaghat NP",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11.94,
        "wards": 17,
        "population": 26767,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951083,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Ghanshyampur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 5.1489,
        "wards": 14,
        "population": 20005,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951084,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Jale Nagar Parishad",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 23.26,
        "wards": 25,
        "population": 41444,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951085,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Biraul",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 6.1559,
        "wards": 11,
        "population": 27599,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951086,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Bharwara NP",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 19.83,
        "wards": 48,
        "population": 296039,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951087,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Singhwara NP",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 3.46,
        "wards": 21,
        "population": 12059,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951088,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Kamtaul Abhiyan Nagar Panchayat",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 13.41,
        "wards": 11,
        "population": 13953,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951089,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Benipatti",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18,
        "wards": 22,
        "population": 35674,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951090,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Phulparas",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 25,
        "wards": 15,
        "population": 22833,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951091,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Musrigharari",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 33.3616,
        "wards": 20,
        "population": 32046,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951092,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Singhiya",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18.2,
        "wards": 20,
        "population": 31952,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951093,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Sarairanjan",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18.65,
        "wards": 23,
        "population": 37768,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951094,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Shapur patori",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 13.8479,
        "wards": 26,
        "population": 45858,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951095,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Tajpur",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 6.45,
        "wards": 27,
        "population": 47503,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951096,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Barauni",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 24,
        "wards": 31,
        "population": 71660,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951097,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Habibpur",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9,
        "wards": 10,
        "population": 12063,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951098,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Akbarnagar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9,
        "wards": 11,
        "population": 13326,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951099,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Pirpainti",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 5,
        "wards": 11,
        "population": 14550,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951100,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Sabour",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 3.72,
        "wards": 10,
        "population": 12575,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951101,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Bounsi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 16.2,
        "wards": 21,
        "population": 34803,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951102,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Katoria",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 23.4,
        "wards": 15,
        "population": 18161,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951103,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Sour Bazar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 18.85,
        "wards": 12,
        "population": 15737,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951104,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Bangaon Nagar Panchayat",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 22.59,
        "wards": 19,
        "population": 30061,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951105,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nawhatta",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 16.98,
        "wards": 18,
        "population": 27386,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951106,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Sonbarsha",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 9,
        "wards": 16,
        "population": 17839,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951107,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Triveniganj",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 43.25,
        "wards": 27,
        "population": 50053,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951108,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Pipra",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 10.96,
        "wards": 11,
        "population": 13537,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951109,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Simrahi",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 13,
        "wards": 17,
        "population": 25671,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951110,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Alamnagar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 20.63,
        "wards": 21,
        "population": 34702,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951111,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Udakishungan",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 31.53,
        "wards": 26,
        "population": 46861,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951112,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Singheshwar",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 3.455,
        "wards": 12,
        "population": 15138,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951113,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Bihariganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 8.2837,
        "wards": 14,
        "population": 20922,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951114,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Bihta",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 25.22,
        "wards": 27,
        "population": 47549,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951115,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Panchayat Punpun",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 12,
        "wards": 11,
        "population": 13067,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951116,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Nagar Parishad Sampatchak",
        "ulbType": "5dcfa64e43263a0e75c71695",
        "area": 33.2734,
        "wards": 31,
        "population": 69079,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Parishad",
        "amrut": "No",
        "sbCode": 951117,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      },
      {
        "name": "Paliganj",
        "ulbType": "5dcfa66b43263a0e75c71696",
        "area": 11,
        "wards": 20,
        "population": 32046,
        "state": "5dcf9d7216a06aed41c748e0",
        "natureOfUlb": "Nagar Panchayat",
        "amrut": "No",
        "sbCode": 951118,
        "isMillionPlus": "No",
        "isUA": "No",
        "access_2021": true,
        "access_2122": true,
        "access_2223": true,
        "access_2324": true,
        "access_2425": true,
        "censusCode": "",
        "UA": ""
      }
    ];
    let i = 1;
    d.map(e => {
      e['UA'] = null
      e['code'] = 'BR' + (144 + (i++))
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
    "ULB Name, City Finance Code,Census Code, Swatcha Bharat Code, ULB Type, Ulb Active ,State Name, State Code, Nature of ULB, Area, Ward, Population, AMRUT, Latitude,Longitude,isMillionPlus, UA, UA_code, Created On, Modified On \r\n"
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
        isActive:1,
        location: 1,
        createdAt: 1,
        modifiedAt: 1,
        isMillionPlus: 1,
        censusCode: 1,
        sbCode: 1,
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
            el.state.name +
            "," +
            el.state.code +
            "," +
            el.natureOfUlb +
            "," +
            el.area +
            "," +
            el.wards +
            "," +
            el.population +
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
module.exports.getUlbsWithAuditStatus = async (req, res) => {
  try {
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
    ]);
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

module.exports.truncateSbCode = async (req, res)=>{
  const query = {
    createdAt:{
    $gt: new Date("2022-11-17")
    },

  };
  let updatedUlbs=[]
  let ulbs = await Ulb.find(query).lean();
  for(let ulb of ulbs){
  // ulbs.forEach(async (ulb)=>{
    let sbCode = Number(ulb.sbCode).toFixed();
    let x = await Ulb.findOneAndUpdate({
      _id: ulb._id
    },{
      $set:{
        sbCode: sbCode
      }
    }).lean()

    updatedUlbs.push(JSON.stringify(JSON.parse(x.sbCode)));

  }

  return res.status(200).json({
    updatedUlbs,
    length:updatedUlbs.length
  })
}