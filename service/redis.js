const Redis = require("redis");
const CONFIG = require("../config/app_config");



if(CONFIG.REDIS && CONFIG.REDIS.hasOwnProperty(process.env.ENV)){
	url = CONFIG["REDIS"][process.env.ENV];
}else{
	console.log(process.env.ENV,"Env not supported"); process.exit(process.env.ENV+" : Env not supported @redis.js");
}

let Client = Redis.createClient(url);
Client.on('connect', function() {	
    console.log(process.env.ENV + ' Redis Sever Connected');
});
Client.on('disconnect', function() {
    console.log('disconnected');
});
Client.on('error', function(err) {
    console.log('redis error',err);
});
Client.on('end', function() {
    console.log('redis end');
});

//module.exports.Client = Client;
