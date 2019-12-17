const moment =require("moment");
const Ulb = require("../../models/Schema/Ulb");
module.exports = async(req,res, next)=>{
    try{
        let ulb = new Ulb(req.body);
        let data = await ulb.save();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb saved",
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
