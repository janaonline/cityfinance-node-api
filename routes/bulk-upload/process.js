const moment = require("moment");
const RequestLog = require("../../models/Schema/RequestLog")
const awsService = require("../../service/s3-services");
const xlstojson = require("xls-to-json-lc");
const xlsxtojson = require("xlsx-to-json-lc");
module.exports = function (req, res) {
    awsService.downloadFileToDisk(req.body.alias, async(err, file)=> {
        if(err){
            return res.status(400).json({
                timestamp : moment().unix(),
                success:false,
                message:"Error Occurred",
                error: err.message
            });
        }else if(!file){
            return res.status(400).json({
                timestamp : moment().unix(),
                success:false,
                message:"File not available"
            });
        }else {
            //return res.status(200).json({file:file});
            try{
                let reqLog = await RequestLog.findOne({url:req.body.alias, financialYear:req.body.financialYear});
                if(!reqLog){
                    let requestLog = new RequestLog({
                        user:req.decoded ? req.decoded.id : null,
                        url:req.body.alias,
                        message:"Data Processing",
                        financialYear:req.body.financialYear
                    });
                    requestLog.save((err, data)=> {
                       if(err){
                           return res.status(400).json({
                               timestamp:moment().unix(),
                               success:false,
                               message:err.message,
                               data:err
                           })
                       } else {
                           return res.status(200).json({
                               timestamp:moment().unix(),
                               success:true,
                               message:`Request recieved.`,
                               data:data
                           })
                       }
                    });
                }else {
                    return res.status(400).json({
                        timestamp:moment().unix(),
                        success:false,
                        message:reqLog.completed ? `Already processed.` : `Already in process.`,
                        data:reqLog
                    })
                }
            }catch (e) {
                return res.status(400).json({
                    timestamp:moment().unix(),
                    success:false,
                    message: `Caught Error:${e.message}`
                })
            }
        }
    })
}
