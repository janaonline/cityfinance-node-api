const putDataService = require("./service").putData;
module.exports = async (req, res)=>{
    //console.log("Called");exit;
    try{
        let data = await putDataService(req.params.path, req);
        return  res.status(200).json({success:true, message:data});
    }catch (e) {
        console.log("Exception",e);
        return res.status(500).json({success: false, message: e.message})
    }
}
