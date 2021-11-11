const DownloadLog = require('../../models/DownloadLog');
const fs = require('fs');
const pdf = require('html-pdf');
var Blob = require('blob');
const axios = require('axios')
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


module.exports.HtmlToPdf = async function (req, res){
    if (!req.body.html){
        res.status(400).json({success:false, message:"html Missing"});
        return;
    }
    // let tt = await axios.get("https://staging-dhwani.s3.ap-south-1.amazonaws.com/GILAC_Non_CSR_-_Progress_Tracker_-_COVID-19__Utilisation_Certificate/pdf_2021-11-10%2018-06-15.html");
    let temp = fs.createWriteStream("test.html").write(req.body.html);
    var html = fs.readFileSync('routes/download-log/test.html', 'utf8');

    pdf.create(html,options).toStream(function(err, stream) {
        if(err){
            return res.status(400).json({success:false, message:"Something went wrong"})
        }else {
            stream.pipe(res);
        }

    });

}