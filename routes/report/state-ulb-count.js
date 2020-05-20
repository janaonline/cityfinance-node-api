const UlbLedger= require("../../models/UlbLedger");
const Ulb =require("../../models/Ulb");
const OverallUlb= require("../../models/OverallUlb");
const State= require("../../models/State");
const LineItem= require("../../models/LineItem");
module.exports.getStateListWithCoveredUlb = async (req, res)=>{
    try{
        let query = [
            {
                $lookup:{
                    from:"ulbs",
                    localField:"_id",
                    foreignField:"state",
                    as:"ulbs"
                }
            },
            {
                $lookup:{
                    from:"overallulbs",
                    localField:"_id",
                    foreignField:"state",
                    as:"overallulbs"
                }
            },
            //OverallUlb
            {
                $project:{
                    _id:1,
                    name:1,
                    code:1,
                    totalUlbs:{$size: "$overallulbs"},
                    coveredUlbCount:{$size:"$ulbs"},
                    coveredUlbPercentage:{
                        $cond : {
                            if : {
                                $or:[{$gte:[{$size:"$ulbs"},{$size: "$overallulbs"}]},{$eq:[{$size:"$ulbs"},0]},{$eq:[{$size: "$overallulbs"},0]}]
                            },
                            then:{$toInt:"0"},
                            else: { $multiply:[{ $divide:[{$size:"$ulbs"},{$size: "$overallulbs"}]}, 100]}
                        }
                    }
                }
            }
        ];
        let arr = []
        let financialYear = req.body.year && req.body.year.length ? req.body.year : null;
        let states = await State.find({ isActive:true }).exec();
        let lineItem = await LineItem.findOne({code:"1001"}).exec();
        for(var el of states){
            let obj = {}
            let ulbs = await Ulb.distinct("_id" , { state : el._id }).exec();

            let condition = { ulb : { $in : ulbs }};
            financialYear ? condition["financialYear"] = {$in: financialYear } : null;
            //let coveredUlbs = await UlbLedger.distinct("ulb",cond).exec(); 

            let overAllUlbs = await OverallUlb.distinct("_id",{ state : el._id }).exec();

            let data =  await UlbLedger.aggregate([
                {$match : condition},
                {$group:{
                        _id: {
                                ulb : "$ulb",
                            },
                            lineItem : {$addToSet : { _id : "$lineItem" ,amount:"$amount" } }
                    }
                },
                {$project:{
                       ulb : "$_id.ulb",
                       lineItem :  {
                          $filter: {
                             input: "$lineItem",
                             as: "lineItem",
                             cond: { $and: [
                                { $eq: [ "$$lineItem._id",lineItem._id] },
                              ] }
                          }
                        }
                    }
                },
                {$project:{
                        "ulb" : 1,
                        "lineItem" : { $arrayElemAt  :  [ "$lineItem",0]},
                    }
                },
                {$project:{
                        "ulb" : 1,
                        amount  : "$lineItem.amount",
                    }
                },
                {$project:{
                        "ulb" : 1,
                        auditStatus  : {
                           $switch: {
                              branches: [
                                 { case: { $eq: [ "$amount", 0 ] }, then:"unaudited"},
                                 { case: { $gt: [ "$amount", 0 ] }, then: "audited" }
                              ],
                              default:"auditNA"
                           }
                        },
                    }
                }
            ])
            obj["code"] = el.code
            obj["name"] = el.name
            obj["_id"] = el._id
            obj["totalUlbs"] = overAllUlbs.length
            obj["coveredUlbCount"] = 0
            obj["audited"] = 0
            obj["unaudited"] = 0
            obj["auditNA"] = 0
            data.map(m=> { 
                obj["coveredUlbCount"]++;
                if(m.auditStatus=="audited"){
                    obj["audited"]++;
                }else if(m.auditStatus=="unaudited"){
                    obj["unaudited"]++;
                }else{
                    obj["auditNA"]++; 
                }
            });
            obj["coveredUlbPercentage"] = (obj["coveredUlbCount"]/obj["totalUlbs"])*100 ?  ((obj["coveredUlbCount"]/obj["totalUlbs"])*100).toFixed(2) : 0
            arr.push(obj);
        }
        return res.status(200).json({message: "State list with ulb covered percentage.", success: true, data:arr})
    }catch (e) {
        console.log("Exception",e);
        return res.status(400).json({message:"", errMessage: e.message,success:false});
    }
}