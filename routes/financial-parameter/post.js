const moment =require("moment");
const FinancialParameter = require("../../models/Schema/FinancialParameter");
module.exports = async(req,res, next)=>{
    try{
        let financialParameter = new FinancialParameter(req.body);
        let data = await financialParameter.save();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter saved",
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
