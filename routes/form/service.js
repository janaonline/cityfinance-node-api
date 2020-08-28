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

module.exports.get = async function (req, res) {
    actionAllowed = ['ADMIN','MoHUA','PARTNER','STATE'];
    filter = req.query.filter && !req.query.filter != 'null' ? JSON.parse(req.query.filter) : (req.body.filter ? req.body.filter : {})
    sort = req.query.sort  && !req.query.sort != 'null' ? JSON.parse(req.query.sort) : (req.body.sort ? req.body.sort : {})
    skip   = req.query.skip ? parseInt(req.query.skip) : 0
    limit  = req.query.limit ? parseInt(req.query.limit) : 10
    let matchfilter =  await service.mapFilter(filter);
    let user = req.decoded
    if(actionAllowed.indexOf(user.role) > -1){
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

        if(matchfilter && Object.keys(matchfilter).length){
           query.unshift({$match:matchfilter}) 
        }
        if(Object.keys(sort).length){
            query.push({$sort:sort});
        }

        //res.json(query);return;
        let total = await dCForm.aggregate(query);
        query.push({$skip:skip})
        query.push({$limit:limit})
        let arr =  await dCForm.aggregate(query).exec();
        return res.json({"timestamp":moment,success:true,message:"Successfully fetched",total:total.length,data:arr})
    }

    else{
        Response.BadRequest(res,{},`Action not allowed for the role:${user.role}`);
    }

}
