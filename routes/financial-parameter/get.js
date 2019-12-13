const moment =require("moment");
const FinancialParameter = require("../../models/Schema/FinancialParameter");
module.exports.get = async(req,res, next)=>{
    try{
        let data = await FinancialParameter.find({}).exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter list",
            data:data
        });
    }catch (e) {
        console.log("Caught Exception:",e);
        return res.status(500).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter Exception:"+e.message
        });
    }
};
module.exports.getById = async(req,res, next)=>{
    try{
        let data = await FinancialParameter.find({_id : req.params.id}).exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter list",
            data:data
        });
    }catch (e) {
        console.log("Caught Exception:",e);
        return res.status(500).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter Exception:"+e.message
        });
    }
};
