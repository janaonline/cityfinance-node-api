const moment =require("moment");
const Ulb = require("../../models/Schema/Ulb");
module.exports = async(req,res, next)=>{
    try{
        let data = await Ulb.remove({_id : req.params._id}).exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb removed",
            data:data
        });
    }catch (e) {
        console.log("Caught Exception:",e);
        return res.status(500).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb Exception:"+e.message
        });
    }
};
