const resource = require("../../models/Resources");
const service = require("../../service");
const Response = require("../../service/response");
const baseDir = "uploads/";
const fs = require("fs");

module.exports = async function(req,res){

	if(req.files){

		let reqBody ={};
		reqBody["name"] = req.body.name;

		var reqFile = req.files;
		if(reqFile.pdf){
			for(e of reqFile.pdf){
				if (e.originalname.split('.')[e.originalname.split('.').length - 1] === 'pdf') {
					let dir = e.destination.split('/')[e.destination.split('/').length - 1];
					let downloadUrl = req.currentUrl+"/"+dir+"/"+e.filename;
					reqBody["downloadUrl"] = downloadUrl;
				}
			}
		}

		if(reqFile.image){
			
			for(i of reqFile.image){
			
				let type = i.originalname.split('.')[i.originalname.split('.').length - 1]	
				if (type =='png' || type =='jpg') {
					let dir = i.destination.split('/')[i.destination.split('/').length - 1];
					let image = req.currentUrl+"/"+dir+"/"+i.filename;
					reqBody["imageUrl"] = image;					
				}
			}
		}

		let d = await resource.findOne({"downloadUrl":reqBody["downloadUrl"],imageUrl:reqBody["imageUrl"]}).exec();
		if(d){
			let update = {$set:{imageUrl:reqBody["imageUrl"],downloadUrl:reqBody["downloadUrl"]}}
			let ud = await resource.update({"downloadUrl":reqBody["downloadUrl"]},)
			return Response.OK(res,ud,"update successfully");
		}
		else{
			service.post(resource, reqBody, function(response, value) {
    			return res.status(response ? 200 : 400).send(value);
			});
		}

	}	
}