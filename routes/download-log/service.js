const DownloadLog = require('../../models/DownloadLog');
const fs = require('fs');
const pdf = require('html-pdf');
const options = {
    format: 'A4',
    orientation: 'portrait',
    border: {
        top: '.1in',
        right: '.1in',
        bottom: '.2in',
        left: '.1in'
    },
    quality: '100'
};

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


module.exports.HtmlToPdf = function(req, res){

    if (!req.body.html){
        res.status(400).json({success:false, message:"html Missing"});
        return;
    }
    pdf.create(req.body.html,options).toStream(function(err, stream) {
        if(err){
            return res.status(400).json({success:false, message:"Something went wrong"})
        }else {
            stream.pipe(res);
        }
    });

}