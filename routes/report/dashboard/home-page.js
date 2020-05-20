const UlbLedger = require('../../../models/UlbLedger');
const OverallUlb = require('../../../models/OverallUlb');
const BondIssuerItem = require('../../../models/BondIssuerItem');
const ObjectId = require("mongoose").Types.ObjectId;
const Redis = require("../../../service/redis");
module.exports =  (req,res)=>{

    let query = {};
    if(req.query.state){
        let state = req.query.state; 
        query = {"state":ObjectId(state)}    
    }
     
    let totalULB = new Promise(async(rslv,rjct)=>{

        try{
            let count = await OverallUlb.count(query).exec();
            rslv(count)
        }
        catch(err){
            rjct(err);
        }
            
    })

    let financialStatement = new Promise(async(rslv,rjct)=>{
               
        let query = [ 
            {$group:{"_id":{"financialYear":"$financialYear","ulb":"$ulb"}}},
            {$count:"count"}
        ];  
        if(req.query.state){
        
            query = [ 
                {$group:{"_id":{"financialYear":"$financialYear","ulb":"$ulb._id"}}},
                {
                    "$lookup":{
                    "from":"ulbs",
                    "localField":"_id.ulb",
                    "foreignField":"_id",
                    "as":"ulb"
                    }
                },
                {$match:{"ulb.state":ObjectId(req.query.state)}},
                {$count:"count"} 
            ]
        }  

        try{
            let count = await UlbLedger.aggregate(query).exec();
            rslv(count)
        }
        catch(err){
            rjct(err);
        }            
    })

    let munciapalBond = new Promise(async(rslv,rjct)=>{
        try{
            let count = await BondIssuerItem.count(query).exec();
            rslv(count)
        }
        catch(err){
            rjct(err);
        }
            
    })

    Promise.all([totalULB,munciapalBond,financialStatement]).then((values)=>{
        let data = {
            totalULB : values[0],
            financialStatements: values[2].length>0 ? values[2][0].count : 0,
            totalMunicipalBonds : values[1]

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
