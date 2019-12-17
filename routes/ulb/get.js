const moment =require("moment");
const Ulb = require("../../models/Schema/Ulb");
module.exports.get = async(req,res, next)=>{
    try{
        let data = await Ulb.find({},"_id name code state ulbType").populate("state","_id name").populate("ulbType","_id name").exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb list",
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
module.exports.getById = async(req,res, next)=>{
    try{
        let data = await Ulb.find({_id : req.params.id}, "_id name code state ulbType").populate("state","_id name").populate("ulbType","_id name").exec();
        return res.status(200).json({
            timestamp:moment().unix(),
            success:true,
            message:"Ulb list",
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
