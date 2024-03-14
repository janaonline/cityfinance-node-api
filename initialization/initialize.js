const fs = require('fs');
const dirArr = ['public','uploads'];
const subDir = "resource";
module.exports = function(){
	for(dir of dirArr){
		if (!fs.existsSync(dir)){
		    fs.mkdirSync(dir);
		    console.log("Created  Dir",dir);
		}
		if(dir=="uploads"){
			dir+="/"
			if (!fs.existsSync(dir+subDir)){
	        	fs.mkdirSync(dir+subDir);
	        	console.log("Created subDir",dir+subDir);
	    	}
	    	else{
	    		console.log("Exists subDir",subDir);
	    	}
    	}
		else{
			console.log("Exists dir",dir);
		}
	}
   
}
