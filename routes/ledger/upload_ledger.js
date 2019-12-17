const UlbLedger = require("../../models/Schema/UlbLedger");
const Ulb = require("../../models/Schema/Ulb");
const csv = require("csvtojson");
module.exports = async (req, res)=>{
    console.log("Files", req.files, req.file)
    try {
        const jsonArray = await csv().fromFile(req.file.path);
        return res.status(200).json({success:true, data:jsonArray});
    }catch (e) {
        console.log("Exception:",e);
        return res.status(500).json({message:e.message, success:false})
    }
};

