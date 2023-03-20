
const {payloadParser} = require("../CommonActionAPI/service");
module.exports.changePayload = async(req,res,next)=>{
    try{
        let { design_year,data, isDraft } = req.body
        // console.log("data ::::::",data)
        let payload = await payloadParser(data,req)
        console.log("payload ::: ",payload)
    }
    catch(err){

    }
}