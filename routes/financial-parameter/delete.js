const moment =require("moment");
const FinancialParameter = require("../../models/Schema/FinancialParameter");
module.exports = async(req,res, next)=>{
    try{
        let data = await FinancialParameter.remove({_id : req.params._id}).exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"FinancialParameter removed",
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
