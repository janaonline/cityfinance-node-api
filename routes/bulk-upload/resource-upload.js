const UlbType = require("../../models/Resources");

module.exports = async function(req,res){

	if(req.file){

		var reqFile = req.file;
		if (reqFile.originalname.split('.')[reqFile.originalname.split('.').length - 1] === 'pdf') {

			var fullUrl = req.protocol + '://' + req.get('host')

			console.log(req.filepath);return;


		}

	}	
}