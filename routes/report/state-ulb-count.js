const UlbLedger= require("../../models/Schema/UlbLedger");
const Ulb =require("../../models/Schema/Ulb");
const OverallUlb= require("../../models/Schema/OverallUlb");
const State= require("../../models/Schema/State");
const LineItem= require("../../models/Schema/LineItem");
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

            let cond = { ulb : { $in : ulbs }};
            financialYear ? cond["financialYear"] = {$in: financialYear } : null;
            let coveredUlbs = await UlbLedger.distinct("ulb",cond).exec(); 
            let overAllUlbs = await OverallUlb.distinct("_id",{ state : el._id }).exec();

            cond["lineItem"] =  lineItem._id
            let conditionForAudited = cond
            conditionForAudited["amount"] = {$gt:0};
            let audited = await UlbLedger.distinct("ulb",conditionForAudited).exec();

            let conditionForNonAudited = cond
            conditionForNonAudited["amount"] = {$eq:0};
            let nonaudited = await UlbLedger.distinct("ulb",conditionForNonAudited).exec();

            // let conditionForAuditNA = cond
            // let AuditNA  = await UlbLedger.distinct("ulb",conditionForAuditNA).exec();
            obj["code"] = el.code
            obj["name"] = el.name
            obj["_id"] = el._id
            obj["totalUlbs"] = overAllUlbs.length
            obj["coveredUlbCount"] = coveredUlbs.length
            obj["coveredUlbPercentage"] = (obj["coveredUlbCount"]/obj["totalUlbs"])*100 ?  ((obj["coveredUlbCount"]/obj["totalUlbs"])*100).toFixed(2) : 0
            obj["audited"] = audited.length ;
            obj["unaudited"] = nonaudited.length ;
            obj["auditNA"] = 0 ;
            arr.push(obj);
        }
        return res.status(200).json({message: "State list with ulb covered percentage.", success: true, data:arr})
    }catch (e) {
        console.log("Exception",e);
        return res.status(400).json({message:"", errMessage: e.message,success:false});
    }
}