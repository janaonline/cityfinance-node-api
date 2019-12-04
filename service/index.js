const moment = require("moment");
const find = function(condition = {},schema,callback){
	schema.find(condition).exec((err,data)=>{
		if (err) {
            console.log("error occurred in get",schema,err);
            let obj = {
                timestamp: moment().unix(),
				success: false,
                message: "DB Error Occured",
                err: err
            }
			return callback(null,obj);
		} else {
            let obj = {
                timestamp: moment().unix(),
				success: true,
                message: "Successfully fetched",
                data: data
            }
			return callback(true,obj);
		}
	});
};

const post = function(schema,body,callback){
	schema.create(body,function(err,data){
		if (err) {
            console.log("error occurred in post",schema,err);
            let obj = {
                timestamp: moment().unix(),
				success: false,
                message: "DB Error Occured",
                err: err
            }
			return callback(null,obj);
		} else {
            let obj = {
                timestamp: moment().unix(),
				success: true,
                message: "Successfully updated",
                data: data
            }
			return callback(true,obj);
		}
	});
};

const put = function(condition = {},update,schema,callback){
    console.log(condition,update);
	schema.updateOne(condition,update,{ upsert:true,new : true , setDefaultsOnInsert:true }).exec((err,data)=>{
		if (err) {
            console.log("error occurred in put",schema,err);
            let obj = {
                timestamp: moment().unix(),
				success: false,
                message: "DB Error Occured",
                err: err
            }
			return callback(null,obj);
		} else {
            let obj = {
                timestamp: moment().unix(),
				success: true,
                message: "Successfully updated",
                data: data
            }
			return callback(true,obj);
		}
	});
};
module.exports = {
    find : find,
    put : put,
    post :post
}