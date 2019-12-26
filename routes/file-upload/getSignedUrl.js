const generateSignedUrl = require("./service").generateSignedUrl;
module.exports = async (req, res)=>{
    console.log("req.get",req.get);
    try{
        if(req.body && Array.isArray(req.body)){
            let finalArray = [];
            for(let single of req.body){
                single["host"] = req.protocol + '://' + req.get('host');
                let data = await generateSignedUrl(single);
                finalArray.push(data);
            }
            return res.status(200).json({success: true, message:"success", data: finalArray});
        }else{
            return res.status(400).json({success: false, message:"Data is not in supported format.", data: req.body});
        }
    }catch (e) {
        console.log("Exception",e);
        return res.status(400).json({success: false, message:e.message, data: req.body});
    }
}

