const resource = require("../../models/Resources");
const service = require("../../service");
const Response = require("../../service/response");

module.exports = async function(req,res){

	if(req.file){

		let reqBody ={};
		var reqFile = req.file;


		if (reqFile.originalname.split('.')[reqFile.originalname.split('.').length - 1] === 'pdf') {

			let dir = reqFile.destination.split('/')[reqFile.destination.split('/').length - 1];
			let downloadUrl = req.currentUrl+"/"+dir+"/"+reqFile.filename;
			reqBody["downloadUrl"] = downloadUrl;
			reqBody["name"] = req.name;
			let d = await resource.findOne({"downloadUrl":downloadUrl}).exec();
			if(d){
				return Response.OK(res,[],"update successfully");
			}
			else{
				service.post(resource, reqBody, function(response, value) {
        			return res.status(response ? 200 : 400).send(value);
    			});
			}
		}
	}	
}