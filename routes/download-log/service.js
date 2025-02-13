const DownloadLog = require('../../models/DownloadLog');
const fs = require('fs');
const pdf = require('html-pdf');
// const puppeteer = require('puppeteer');
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
    quality: '100',
    encoding: 'utf-8'
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

// module.exports.HtmlToPdf = async function(req, res) {
//     try {
//         let { url, html, option } = req.body;

//         if (url) {
//             let tempData = await axios.get(url);
//             html = tempData.data;
//         }

//         if (!html) {
//             return res.status(400).json({ success: false, message: "html Missing" });
//         }

//         const pdfOutputPath = 'output.pdf';

//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();

//         // Set viewport to emulate screen media type
//         await page.setViewport({ width: 1920, height: 1080 }); // Adjust dimensions as needed

//         // Navigate to a blank page to apply styles from external resources
//         await page.goto('about:blank');

//         // Wait for network idle to ensure all resources are loaded
//         await page.waitForSelector('body');

//         // Apply your HTML content
//         await page.setContent(html);

//         // Wait for network idle again after applying content
//         await page.waitForSelector('body');

//         const pdfOptions = {
//             path: pdfOutputPath,
//             format: options.format,
//             landscape: options.orientation === 'landscape',
//             margin: {
//                 top: options.border.top,
//                 right: options.border.right,
//                 bottom: options.border.bottom,
//                 left: options.border.left
//             },
//             printBackground: true,
//             quality: options.quality
//         };

//         // Generate PDF with specified options
//         await page.pdf(pdfOptions);

//         await browser.close();

//         // Set headers to trigger download
//         res.setHeader('Content-Disposition', 'attachment; filename="output.pdf"');
//         res.setHeader('Content-Type', 'application/pdf');

//         // Stream the PDF file to the response
//         const pdfStream = fs.createReadStream(pdfOutputPath);
//         pdfStream.pipe(res);

//         // Remove the generated PDF file
//         fs.unlinkSync(pdfOutputPath);

//     } catch (error) {
//         return res.status(400).json({ success: false, message: error.message });
//     }
// }


module.exports.HtmlToPdf = async function(req, res){
  try{
    let {url,html,option} = req.body;
    if(url){
        let tempData = await axios.get(`${url}`);
        html = tempData.data
    }

    //if html not present than it will give the error message.
    if (!html){
        res.status(400).json({success:false, message:"html Missing"});
        return;
    }
    pdf.create(html,options).toStream(function(err, stream) {
        if(err){
            return res.status(400).json({success:false, message:"Something went wrong"})
        }else {
            stream.pipe(res);
        }
    });
  }catch(error){
      return res.status(400).json({msg:error.message})
  }
}
