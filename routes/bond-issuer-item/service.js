const BondIssuerItem = require('../../models/BondIssuerItem');
const BondIssuerJson = require('../../models/bondIssuer');
const service = require('../../service');
const ObjectId = require("mongoose").Types.ObjectId;
module.exports.get = async function(req, res) {
    let query = { isActive: true};
    if(req.query.state){
        let state = req.query.state; 
        query = Object.assign(query,{"state":ObjectId(state)})    
    }

    if (req.query.ulb) {
      query["ulb"] = req.query.ulb;
    }
    // if (req.method == 'GET') {
    //   query['isActive'] = true;
    //   // Get any line item based on code or overall
    //   // BondIssuerItem is model name
    //   if (req.params && req.params.ulb) {
    //     query['ulb'] = req.params.ulb;
    //   }
    // }
    if (req.method == 'POST') {
        query = {
            $or: [
                { ulb: { $in: req.body['ulb'] } },
                { yearOfBondIssued: { $in: req.body['year'] } }
            ]
        };
    }
    service.find(query, BondIssuerItem, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};
module.exports.put = async function(req, res) {
    req.body['modifiedAt'] = new Date();
    // Edit any Line item
    // BondIssuerItem is model name
    let condition = {
        _id: req.params._id
    };
    service.put(condition, req.body, BondIssuerItem, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};
module.exports.post = async function(req, res) {
    // Create any financial parameter
    // BondIssuerItem is model name

    let reqBody = {
        ...req.body,
        yearOfBondIssued: getYear(req.body.dateOfIssue)
    };
    console.log(reqBody.yearOfBondIssued);
    service.post(BondIssuerItem, reqBody, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};
module.exports.delete = async function(req, res) {
    // Delete any line item based on uniqueId
    // BondIssuerItem is model name
    let condition = {
            _id: req.params._id
        },
        update = {
            isActive: false
        };
    service.put(condition, update, BondIssuerItem, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};

module.exports.getJson = async function(req, res) {
    if (!BondIssuerJson) {
        return res.status(404).send();
    }
    res.send(BondIssuerJson);
};

module.exports.BondUlbs = function(req, res) {
    let arr = [
        {
            $group: {
                _id: '$ulb',
                years: { $addToSet: '$yearOfBondIssued' },
                state:{"$first":"$state"}

            }
        },
        {
            "$lookup":{
            "from":"states",
            "localField":"state",
            "foreignField":"_id",
            "as":"state"
            }
        },
        {$unwind:{"path":"$state","preserveNullAndEmptyArrays":true}},
        {
            $project: {
                _id: 0,
                name: '$_id',
                years: '$years',
                state: "$state._id",
                stateName: "$state.name" 
            }
        }
    ];
    service.aggregate(arr, BondIssuerItem, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};

module.exports.issueSizeAmount = function(req, res) {

    let match = {$match:{isActive: true}}
    if(req.query.state){
        match["$match"] = Object.assign({isActive: true},{state:ObjectId(req.query.state)})
    }
    let arr = [
      match,
      {
        "$project":{  
          "issueSizeAmount":{  
          $convert:
          {
             input: "$issueSizeAmount",
             to: "double",
             onError: 0,  // Optional.
             onNull: 0    // Optional.
          }
        }
        }
      },
      { $group:
        { _id : null, sum : { $sum: "$issueSizeAmount" } }
      },
      { $project: {"_id" :0,"totalAmount":"$sum"}}
    ];
    service.aggregate(arr, BondIssuerItem, function(response, value) {
        return res.status(response ? 200 : 400).send(value);
    });
};

function getYear(str) {
    if (str.includes('-')) return str.split('-').slice(-1)[0];
    return str;
}