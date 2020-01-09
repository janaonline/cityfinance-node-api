const fs = require('fs');
const dirArr = ['public','uploads'];
module.exports = function(){
	for(dir of dirArr){
		if (!fs.existsSync(dir)){
		    fs.mkdirSync(dir);
		    console.log("Created  Dir",dir);
		}else{
			console.log("Exists dir",dir);
		}
	}
}
