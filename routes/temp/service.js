const Indicators = require('../../models/indicators');


async function test(req,res){
    try {
        
        const distincUlbs = await Indicators.distinct("ulb")
        const pipeline = [
            {
                $group:
                    {
                        _id: "$ulb",
                    },       
            },
            
            {
                $lookup:{
                    from: "ulbs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "ulbData"
                },
            },
            {
                $group:{
                _id: "$ulbData.ulbType",
                count:{$sum:1}
                }
            },
            {
                $project:{
                    ulbType:"$_id",
                    count:1
                }
            }
        ]
        const data = await Indicators.aggregate(pipeline);
        if(data){
            return res.status(200).json({
                nHits: data.length,
                status: true,
                data
            })
        }
        return res.status(400).json({
            status: false,
            msg: "not found"        
        })
    } catch (error) {
        return res.status(400).json({
            status: false,
            msg: "failed."        
        })
    }
}

module.exports = {test};