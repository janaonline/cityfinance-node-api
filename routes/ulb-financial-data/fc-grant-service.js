const Ulb = require('../../models/Ulb');
const UlbFinancialData = require('../../models/UlbFinancialData');
const LoginHistory = require('../../models/LoginHistory');
const User = require('../../models/User');
const State = require('../../models/State');
const Response = require('../../service').response;
const Service = require('../../service');
const ObjectId = require('mongoose').Types.ObjectId;


module.exports = (req,res)=>{

    let cond = {
        $match:{"isActive" : true}
    }
    let cond1 = {
        $match:{"isDeleted" : false,role:"ULB"}
    }
    let cond2 = {
        $lookup: {
            from: 'ulbs',
            localField: 'ulb',
            foreignField: '_id',
            as: 'ulb'
        }
    }

    let cond3 = {$unwind:"$ulb"}
    let query = [
        cond,
        {
            $lookup: {
                from: 'ulbtypes',
                localField: 'ulbType',
                foreignField: '_id',
                as: 'ulbtype'
            }
        },
        {
            $unwind: {
                path: '$ulbtype',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group:{  
                "_id":"$ulbtype.name", 
                "count":{$sum:1}
            }
        },
        {$project:
            { 
              "name":"$_id",  
              "count":"$count",
              _id:0  
            }
        }
    ]

    let totalULB = new Promise(async(rslv,rjct)=>{
        try{
            let count = await Ulb.aggregate(query).exec();
            rslv(count)
        }
        catch(err){
            rjct(err);
        }
    })

    let registeredUlb = new Promise(async(rslv,rjct)=>{
        try{
            let query = [
                cond1,
                cond2,
                cond3,
                {
                    $lookup: {
                        from: 'ulbtypes',
                        localField: 'ulb.ulbType',
                        foreignField: '_id',
                        as: 'ulbtype'
                    }
                },
                {
                    $unwind: {
                        path: '$ulbtype',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group:{  
                        "_id":"$ulbtype.name", 
                        "count":{$sum:1}
                    }
                },
                {$project:
                    { 
                        "name":"$_id",  
                        "count":"$count",
                        _id:0  
                    }
                }
            ]
            let count = await User.aggregate(query).exec();
            rslv(count)
        }
        catch(err){
            rjct(err);
        }
    })

    Promise.all([totalULB,registeredUlb]).then((values)=>{

        let data = {
            totalULB : values[0],
            registeredUlb:values[1]
        };
        //Redis.set(req.redisKey,JSON.stringify(data))
        return res.status(200).json({success : true, message : "Data fetched", data : data});

        },(rejectError)=>{

        console.log(rejectError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Rejected Error", err : rejectError });

        }).catch((caughtError)=>{

        console.log("final caughtError",caughtError);
        return  res.status(400).json({ timestamp : moment().unix(), success : false, message : "Caught Error", err : caughtError });
    })


}