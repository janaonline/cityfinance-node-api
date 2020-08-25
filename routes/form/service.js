const dCForm = require('../../models/DataCollectionForm');
const mongoose = require("mongoose");
const moment = require("moment");
const ObjectId = require('mongoose').Types.ObjectId
const service = require("../../service");

module.exports.post = function (req, res) {

    req.body["state"] =  ObjectId(req.body["state"])
    service.post(dCForm,req.body,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}

module.exports.get = function (req, res) {

    let query = [ 
                {
                    $lookup: {
                        from: "states",
                        localField: "state",
                        foreignField: "_id",
                        as: "state"
                    }
                },
                {
                    $lookup: {
                        from: "ulbs",
                        localField: "ulb",
                        foreignField: "_id",
                        as: "ulbs"
                    }
                },
                {$unwind:{path:"$ulbs",preserveNullAndEmptyArrays:true}},
                {$unwind:"$state"},
                {$project:{
                    "ulbName":"$ulbs.name",
                    "ulb":"$ulb",
                    "stateName":"$state.name",
                    "state":"$state._id",
                    "parastatalName":1,
                    "person":1,
                    "designation":1,
                    "email":1,
                    "bodyType":1,
                    "documents":1
                    }
                }
            ]

    service.aggregate(query,dCForm,function(response,value){
        return res.status(response ? 200 : 400).send(value);
    });

}
