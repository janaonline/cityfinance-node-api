const DownloadLog = require('../../models/DownloadLog');
module.exports.get = function(req, res){
    let condition = req.query;
    DownloadLog.find(condition, (err, data)=>{
        if(err){
            return res.status(400).json({success:false, message:"Db Error Occurred."})
        }else {
            return res.status(200).json({success: true, message: "data fetched", data:data})
        }
    });
}
module.exports.post = function(req, res){
    let newDownloadLog = new DownloadLog(req.body);
    newDownloadLog.save((err, data)=>{
        if(err){
            return res.status(400).json({success:false, message:"Db Error Occurred."})
        }else {
            return res.status(200).json({success: true, message: "data fetched", data:data})
        }
    });
}