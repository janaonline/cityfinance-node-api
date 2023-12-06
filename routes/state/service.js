const service = require("../../service");
const Response = require("../../service").response;
const moment = require("moment");
const UlbLedger = require("../../models/UlbLedger");
const User = require("../../models/User");
const Ulb = require("../../models/Ulb");
const XVFcForms = require("../../models/XVFinanceComissionReForms");
const OverallUlb = require("../../models/OverallUlb");
const State = require("../../models/State");
const LineItem = require("../../models/LineItem");
const ObjectId = require("mongoose").Types.ObjectId;
const UA = require('../../models/UA')
module.exports.get = async function (req, res) {

    let query = {};
    let query1 = {};
    query["isActive"] = true;
    if (req.params && req.params._code) {
        query["code"] = req.params._code
    }
    if (req.query.type == "filter") {
        query1["questionnaireType"] = "state"
        let stateId = await XVFcForms.find(query1, { _id: 0, state: 1 }).exec();
        let stateArray = stateId.map((s) => { return ObjectId(s.state) })
        query["_id"] = { $nin: stateArray };
    }
    // Get any state
    // State is model name

    let stateList = await State.aggregate([
        {
            $match: query
        },
        {
            "$lookup": {
                "from": "uas",
                "localField": "_id",
                "foreignField": "state",
                "as": "uas"
            }
        },
        {
            $addFields: {
                "isUaWise": {
                    $cond: {
                        if: { $eq: [{ $size: "$uas" }, 0] },
                        then: false,
                        else: true
                    }
                }
            }
        },
        {
            $project: {
                "uas": 0
            }
        }
    ])
    let responseObj = {
        timestamp: moment().unix(),
        success: true,
        message: 'Successfully fetched',
        data: stateList
    };
    return res.status(200).json(responseObj);

}
module.exports.put = async function (req, res) {
    req.body['modifiedAt'] = new Date();
    let condition = {
        _id: req.params._id
    };
    // Edit any state
    // State is model name
    service.put(condition, req.body, State, function (response, value) {
        return res.status(response ? 200 : 400).send(value);
    });

}
module.exports.post = async function (req, res) {
    // Create any state
    // State is model name
    service.post(State, req.body, function (response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.delete = async function (req, res) {
    // Delete any State based on uniqueId
    // State is model name
    let condition = {
        _id: req.params._id
    }, update = {
        isActive: false
    };
    service.put(condition, update, State, function (response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
}
module.exports.getStateListWithCoveredUlb = async (req, res) => {
    try {
        let arr = []
        let {accessToXVFC} = req.query
        let cond = {
            isActive: true
        };
        if(accessToXVFC){
            cond['accessToXVFC'] = Boolean(accessToXVFC)
        }
        let financialYear = req.body.year && req.body.year.length ? req.body.year : null;
        let states = await State.find(cond).lean();
        const stateResponses = await getData(states, financialYear); 
        let index = 0;  
        for (let el of states) {
            let data = stateResponses[index];
            data = data.value
            await calculateStateData(el, data, arr);
            index++;
        }
        //let coveredUlbs = await UlbLedger.distinct("ulb",cond).exec();
        return res.status(200).json({ message: "State list with ulb covered percentage.", success: true, data: arr })
    } catch (e) {
        console.log("Exception", e);
        return res.status(400).json({ message: "", errMessage: e.message, success: false });
    }
}

module.exports.form = async function (req, res) {

    let user = req.decoded
    actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'STATE'];
    if (req.method == "GET") {

        if (actionAllowed.indexOf(user.role) > -1) {
            let query = {}
            if (req.query.state) {
                query["state"] = ObjectId(req.query.state);
                let cond = [
                    { $match: { state: query["state"], questionnaireType: 'state' } },
                    {
                        $lookup: {
                            from: "states",
                            localField: "state",
                            foreignField: "_id",
                            as: "state"
                        }
                    },
                    { $unwind: "$state" },
                    {
                        $project: {
                            isCompleted: 1,
                            createdAt: 1,
                            modifiedAt: 1,
                            stateName: "$state.name",
                            state: "$state._id",
                            documents: "$documents",
                            propertyTax: "$propertyTax",
                            userCharges: "$userCharges"
                        }
                    }
                ]

                service.aggregate(cond, XVFcForms, function (response, value) {


                    if (value.data.length == 0) {

                        let cond = [{ $match: { _id: query["state"] } }, { $project: { state: "$_id", stateName: "$name" } }]
                        service.aggregate(cond, State, function (resp, stateData) {
                            return res.status(resp ? 200 : 400).send(stateData);
                        })
                    }
                    else {
                        return res.status(response ? 200 : 400).send(value);
                    }
                })
            }
            else {
                return res.status(400).send({ success: false, message: 'No State provided.' });
            }
        }
        else {
            Response.BadRequest(res, {}, `Action not allowed for the role:${user.role}`);
        }
    }

    if (req.method == "POST") {

        if (actionAllowed.indexOf(user.role) > -1) {
            req.body["state"] = req.body["state"] ? req.body["state"] : user.state;
            req.body["createdBy"] = user._id;
            req.body["questionnaireType"] = "state";

            let query = {}
            query["state"] = ObjectId(req.body["state"]);
            let stData = await XVFcForms.findOne({ state: query["state"] });

            if (stData) {
                if (stData.isCompleted) {
                    return Response.BadRequest(res, {}, `Form is already submitted`);
                }
            }
            service.put(query, req.body, XVFcForms, async function (response, value) {

                if (response) {
                    if (req.body["isCompleted"]) {
                        let state = await User.findOne({ "state": ObjectId(req.body["state"]), isActive: true, "role": "STATE" }).exec();
                        let mohua = await User.find({ isActive: true, "role": "MoHUA" }).exec();

                        if (user.role == "STATE") {
                            if (state) {
                                let template = service.emailTemplate.stateFormSubmission(state.name, null, 'STATE');
                                // let mailOptions = {
                                //     to: state.email,
                                //     subject: template.subject,
                                //     html: template.body
                                // };
                                let mailOptions =     {
                                    Destination: {
                                      /* required */
                                      ToAddresses: [user.email]
                                    },
                                    Message: {
                                      /* required */
                                      Body: {
                                        /* required */
                                        Html: {
                                          Charset: "UTF-8",
                                          Data:  template.body
                                        },
                                      },
                                      Subject: {
                                        Charset: 'UTF-8',
                                        Data:template.subject
                                      }
                                    },
                                    Source: process.env.EMAIL,
                                    /* required */
                                    ReplyToAddresses: [process.env.EMAIL],
                                  }
                                service.sendEmail(mailOptions);
                                let c = 0;
                                if (mohua.length > 0) {

                                    for (mo of mohua) {

                                        let template = service.emailTemplate.stateFormSubmission(mo.name, state.name, 'MoHUA');
                                        // let mailOptions = {
                                        //     to: mo.email,
                                        //     subject: template.subject,
                                        //     html: template.body
                                        // };
                                        let mailOptions =     {
                                            Destination: {
                                              /* required */
                                              ToAddresses: [mo.email]
                                            },
                                            Message: {
                                              /* required */
                                              Body: {
                                                /* required */
                                                Html: {
                                                  Charset: "UTF-8",
                                                  Data:  template.body
                                                },
                                              },
                                              Subject: {
                                                Charset: 'UTF-8',
                                                Data:template.subject
                                              }
                                            },
                                            Source: process.env.EMAIL,
                                            /* required */
                                            ReplyToAddresses: [process.env.EMAIL],
                                          }
                                        service.sendEmail(mailOptions);
                                        c++;
                                        console.log(c)
                                    }
                                }
                            }
                        }
                    }
                }
                return res.status(response ? 200 : 400).send(value);
            });
        }
        else {
            Response.BadRequest(res, {}, `Action not allowed for the role:${user.role}`);
        }
    }
}

module.exports.ulbForm = async function (req, res) {

    const actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER', 'ULB'];
    let user = req.decoded
    if (req.method == "GET") {

        if (actionAllowed.indexOf(user.role) > -1) {
            let query = {}
            if (req.query.ulb) {
                query["ulb"] = ObjectId(req.query.ulb);
                let cond = [
                    { $match: { ulb: query["ulb"] } },
                    {
                        $lookup: {
                            from: "ulbs",
                            localField: "ulb",
                            foreignField: "_id",
                            as: "ulbs"
                        }
                    },
                    { $unwind: "$ulbs" },
                    {
                        $project: {
                            isCompleted: 1,
                            createdAt: 1,
                            modifiedAt: 1,
                            ulbName: "$ulbs.name",
                            ulb: "$ulbs._id",
                            documents: "$documents",
                            userCharges: "$userCharges"
                        }
                    }
                ]

                service.aggregate(cond, XVFcForms, function (response, value) {

                    if (value.data.length == 0) {

                        let cond = [{ $match: { _id: query["state"] } }, { $project: { state: "$_id", stateName: "$name" } }]
                        service.aggregate(cond, State, function (resp, stateData) {
                            return res.status(resp ? 200 : 400).send(stateData);
                        })
                    }
                    else {
                        return res.status(response ? 200 : 400).send(value);
                    }
                })
            }
            else {
                return res.status(400).send({ success: false, message: 'No State provided.' });
            }
        }
        else {
            Response.BadRequest(res, {}, `Action not allowed for the role:${user.role}`);
        }
    }

    if (req.method == "POST") {

        if (user.role == "ULB") {

            let ulb = req.body["ulb"] ? req.body["ulb"] : user.ulb;
            let ulbObj = await Ulb.findOne({ "_id": ObjectId(ulb) }, { state: 1 });
            req.body["state"] = ulbObj.state;
            req.body["createdBy"] = user._id;
            req.body["questionnaireType"] = "ulb";
            let query = {}
            query["ulb"] = ObjectId(ulb);
            let ulbData = await XVFcForms.findOne({ ulb: query["ulb"] });
            if (ulbData) {
                if (ulbData.isCompleted) {
                    return Response.BadRequest(res, {}, `Form is already submitted`);
                }
            }
            service.put(query, req.body, XVFcForms, async function (response, value) {
                return res.status(response ? 200 : 400).send(value);
            });
        }
        else {
            Response.BadRequest(res, {}, `Action not allowed for the role:${user.role}`);
        }
    }

}


module.exports.updateXvForm = function (req, res) {

    if (req.decoded["role"] == "STATE") {
        let query = {}
        if (req.params.state) {
            query["state"] = ObjectId(req.params.state);
            service.put(query, req.body, XVFcForms, function (response, value) {
                return res.status(response ? 200 : 400).send(value);
            });
        }
    }

}

module.exports.getAllForms = async function (req, res) {

    let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER'];

    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            let query = { "questionnaireType": "state" }
            let newFilter = await service.mapFilter(filter);
            let q = [

                { $match: { "questionnaireType": "state" } },
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                { $unwind: { path: "$state", preserveNullAndEmptyArrays: true } },
                { $project: { "isCompleted": 1, "state": "$state._id", "stateName": "$state.name", "createdAt": 1, "modifiedAt": 1 } }

            ];
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }

            if (Object.keys(sort).length) {
                q.push({ $sort: sort });
            }
            q.push({ $skip: skip });
            q.push({ $limit: limit });
            if (!skip) {
                let nQ = Object.assign({}, query);
                Object.assign(nQ, newFilter);
                var total = await XVFcForms.count(nQ);
            }
            let forms = await XVFcForms.aggregate(q).exec();
            return res.status(200).json({
                timestamp: moment().unix(),
                success: true,
                message: "list",
                total: total,
                data: forms
            });
        } catch (e) {
            console.log(e);
            return Response.DbError(res, e, e.message);
        }
    }
    else {
        Response.BadRequest(res, req.body, `Action not allowed for the role:${user.role}`);
    }
}

module.exports.getAllUlbForms = async function (req, res) {

    let user = req.decoded,
        filter = req.query.filter ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {}),
        sort = req.query.sort ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {}),
        skip = req.query.skip ? parseInt(req.query.skip) : 0,
        limit = req.query.limit ? parseInt(req.query.limit) : 50,
        actionAllowed = ['ADMIN', 'MoHUA', 'PARTNER'];

    if (actionAllowed.indexOf(user.role) > -1) {
        try {
            let query = { "questionnaireType": "ulb" };
            let newFilter = await service.mapFilter(filter);
            let q = [

                { $match: { "questionnaireType": "ulb" } },

                {
                    $lookup: {
                        from: "ulbs",
                        localField: "ulb",
                        foreignField: "_id",
                        as: "ulb"
                    }
                },
                { $unwind: { path: "$ulb", preserveNullAndEmptyArrays: true } },
                { $project: { "isCompleted": 1, "ulb": "$ulb._id", "ulbName": "$ulb.name", "createdAt": 1, "modifiedAt": 1 } }

            ];
            if (newFilter && Object.keys(newFilter).length) {
                q.push({ $match: newFilter });
            }
            if (Object.keys(sort).length) {
                q.push({ $sort: sort });
            }
            q.push({ $skip: skip });
            q.push({ $limit: limit });
            if (!skip) {
                let nQ = Object.assign({}, query);
                Object.assign(nQ, newFilter);
                var total = await XVFcForms.count(nQ);
            }
            let forms = await XVFcForms.aggregate(q).exec();
            return res.status(200).json({
                timestamp: moment().unix(),
                success: true,
                message: "list",
                total: total,
                data: forms
            });
        } catch (e) {
            console.log(e);
            return Response.DbError(res, e, e.message);
        }
    }
    else {
        Response.BadRequest(res, req.body, `Action not allowed for the role:${user.role}`);
    }
}

module.exports.eligibleStateForms = async function (req, res) {
    let user = req.decoded;
    let { state_id } = req.query;
    let state = user.state ?? state_id;
    if (!state) {
        return res.status(400).json({
            success: false,
            message: "STATE ID NOT FOUND"
        })
    }
    let stateData = await State.findOne({ _id: ObjectId(state) })
    let UAData = await UA.findOne({ state: ObjectId(state) })
    console.log(UAData)
    let output = {
        "pfms": 0,
        "gtc": 1,
        "slbWaterSupplySanitation": UAData ? 1 : 0,
        "waterRejuvenation": UAData ? 1 : 0,
        "ActionPlan": UAData ? 1 : 0,
        "grantAllocation": 1
    }

    return res.status(200).json({
        success: true,
        data: output
    })
}
module.exports.isMillionState = async (req, res) => {
    let user = req.decoded;
    let {state_id} = req.query;
    let state = user.state ?? state_id;
    let output = false;
    let data = await Ulb.find({ state: ObjectId(state), isMillionPlus: "Yes" })
    console.log(data)
    if (data.length > 0) {
        output = true
    } else if (data.length == 0) {
        output = false
    }
    res.status(200).json({
        success: true,
        data: output //true  means state has atleast one million plus city and false means the state has no million plus city
    })
}
const getBackYears = (num = 3, before = '') => {
    let yr = before ? `${before}-01-01` : moment().format("YYYY-MM-DD");
    let years = [];
    for (let i = 0; i < num; i++) {
        let defaultYear = moment(yr).subtract('year', i);
        let currentYear = moment(defaultYear).format("YY").toString();
        let previousYear = moment(defaultYear).subtract('year', 1).format('YYYY').toString();
        years.push(`${previousYear}-${currentYear}`);
    }
    return years;
}
const getUlbs = (state, yrs) => {
    return new Promise(async (resolve, reject) => {
        let years = yrs ? yrs.sort() : [];
        let ulbs = [];
        try {
            let stateUlbs = await Ulb.distinct("_id", { state: state });
            if (years.length) {
                for (let i = 0; i < years.length; i++) {
                    let year = years[i];
                    let query = { financialYear: year, ulb: { $in: stateUlbs } };
                    if (i > 0) {
                        query["ulb"] = { $in: ulbs };
                    }
                    ulbs = await UlbLedger.distinct("ulb", query).exec();
                }
            } else {
                ulbs = await UlbLedger.distinct("ulb", { ulb: { $in: stateUlbs } }).exec();
            }
            resolve(ulbs);
        } catch (e) {
            console.log(e);
            reject(e);
        }
    });

}
/**
 * The function calculates various data points for each state and adds them to an array.
 * @param el - The parameter `el` is an object that represents a state. It has properties like `code`,
 * `name`, and `_id`.
 * @param data - The `data` parameter is an array of objects. Each object represents a ULB (Urban Local
 * Body) and has properties such as `auditStatus` which can have values like "audited", "unaudited", or
 * others.
 * @param arr - The `arr` parameter is an array where the calculated state data objects will be pushed
 * into.
 */
async function calculateStateData(el, data, arr) {
    let overAllUlbs = await OverallUlb.distinct("_id", { state: el._id }).exec();
    let obj = {};
    obj["code"] = el.code;
    obj["name"] = el.name;
    obj["_id"] = el._id;
    obj["totalUlbs"] = overAllUlbs.length;
    obj["coveredUlbCount"] = 0;
    obj["audited"] = 0;
    obj["unaudited"] = 0;
    obj["auditNA"] = 0;
    data.map(m => {
        obj["coveredUlbCount"]++;
        if (m.auditStatus == "audited") {
            obj["audited"]++;
        } else if (m.auditStatus == "unaudited") {
            obj["unaudited"]++;
        } else {
            obj["auditNA"]++;
        }
    });
    obj["coveredUlbPercentage"] = (obj["coveredUlbCount"] / obj["totalUlbs"]) * 100 ? ((obj["coveredUlbCount"] / obj["totalUlbs"]) * 100).toFixed(2) : 0;
    arr.push(obj);
}

/**
 * The function `getData` retrieves state data for a given set of states, financial year, line item,
 * and state data promises.
 * @param states - An array of objects representing different states.
 * @param financialYear - The `financialYear` parameter is used to filter the data based on a specific
 * financial year. It is an array of financial year values.
 * @param lineItem - The lineItem parameter is a string that represents the specific item or category
 * of data that you want to retrieve from the state ledger. It could be something like "revenue",
 * "expenditure", "taxes", etc.
 * @param stateDataPromises - An array of promises that will resolve to the state data for each state.
 * @returns the stateResponses, which is an array of promises that represent the results of the
 * stateDataPromises.
 */
async function getData(states, financialYear) {
   try {
    let lineItem = await LineItem.findOne({ code: "1001" }).lean();
    let stateDataPromises = [];
    for(let el of states){
        let stateUlbs = await getUlbs(el._id, financialYear);
        let condition = { ulb: { $in: stateUlbs } };
        if (financialYear) {
            condition["financialYear"] = { $in: financialYear };
        }
        let prms = getStateLedgerQuery(condition, lineItem);
        stateDataPromises.push(prms);
    }
    const stateResponses = await Promise.allSettled(stateDataPromises);
    return stateResponses;
   } catch (error) {
     throw {message: `getData: ${error.message}`}
   }
}

async function getStateLedgerQuery(condition, lineItem) {
  return new Promise((resolve, reject) => {
    try {
      const output = UlbLedger.aggregate([
        { $match: condition },
        {
          $group: {
            _id: {
              ulb: "$ulb",
            },
            lineItem: { $addToSet: { _id: "$lineItem", amount: "$amount" } },
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
                  $and: [{ $eq: ["$$lineItem._id", lineItem._id] }],
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
                  { case: { $eq: ["$amount", 0] }, then: "unaudited" },
                  { case: { $gt: ["$amount", 0] }, then: "audited" },
                ],
                default: "auditNA",
              },
            },
          },
        },
      ]);
      resolve(output);
    } catch (error) {
      reject(error);
    }
  });
} 

