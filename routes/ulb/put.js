const moment =require("moment");
const Ulb = require("../../models/Schema/Ulb");
module.exports = async(req,res, next)=>{
    try{
        let data = await Ulb.update({_id : req.params._id},{$set : req.body});
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb updated",
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
