const RequestLog = require("../../models/Schema/RequestLog")
const moment = require("moment");
const ObjectId = require("mongoose").Types.ObjectId;
module.exports = function (req, res) {
    // Get request log, whether it is in process or completed
    RequestLog.findOne({_id : ObjectId(req.params._id)}).exec((err, data)=>{
        if(err){
            return res.status(400).json({
                timestamp : moment().unix(),
                success:false,
                message:"Error occured",
                error: err.message
            });
        }else if(!data){
            return res.status(400).json({
                timestamp : moment().unix(),
                success:false,
                message:"Data not available"
            });
        }else {
            return res.status(200).json({
                timestamp : moment().unix(),
                success:true,
                message:"Data",
                data: data
            });
        }
    })
}
