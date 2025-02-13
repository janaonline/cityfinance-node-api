const moment = require('moment');
const UlbLedger = require('../../../models/UlbLedger');
const State = require('../../../models/State');
const Redis = require('../../../service/redis');
module.exports = async (req, res, next)=>{
    try{
       let totalUlbQuery = [
           {
               $group:{
                   _id:null,
                   count:{$sum:"$totalUlbs"}
               }
           }
        ];
        let ulbCount = await State.aggregate(totalUlbQuery);
        let totalUlb = ulbCount.length ? ulbCount[0].count : 0;
        let coveredUlbCountQuery = [
           {
               $group:{
                   _id:"$financialYear",
                   coveredUlbs:{$addToSet:"$ulb"}
               }
           },
           {
               $addFields:{totalUlb:totalUlb}
           },
           {
               $project:{
                   _id:0,
                   year:"$_id",
                   totalUlb:1,
                   coveredUlbs:{$size:"$coveredUlbs"}
               }
           }
        ];
        let data = await UlbLedger.aggregate(coveredUlbCountQuery).exec();
        Redis.set(req.redisKey,JSON.stringify(data))
        return res.status(200).json({
            timestamp: moment().unix(),
            success: true,
            message: "",
            data: data
        });
    }catch (e) {
        console.log("Exception:",e);
        return res.status(400).json({
            timestamp: moment().unix(),
            success:false,
            message: "Caught Exception!",
            errorMessage:e.message
        });
    }
}