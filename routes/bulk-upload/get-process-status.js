const User = require('../../models/User');
const RequestLog = require("../../models/RequestLog");
const Service = require('../../service');
const moment = require("moment");
const SendEmail = require("../../service").sendEmail;
const ObjectId = require("mongoose").Types.ObjectId;
module.exports = function (req, res) {
    // Get request log, whether it is in process or completed
    RequestLog.findOne({_id : ObjectId(req.params._id)}).exec(async(err, data)=>{
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

            // if(data.completed){

            //     let user = req.decoded;
            //     if(user["role"]=="ULB"){
            //         let partner = await User.find({isActive:true,"role" : "PARTNER"}).exec()
            //         for(p of partner){
            //             let template = Service.emailTemplate.ulbBulkUpload(user.name,p.name);
            //             let mailOptions = {
            //                 to: p.email,
            //                 subject: template.subject,
            //                 html: template.body
            //             };
            //             Service.sendEmail(mailOptions);
            //         }
            //     }    
            // }

            return res.status(200).json({
                timestamp : moment().unix(),
                success:true,
                message:"Data",
                data: data
            });
        }
    })
}
