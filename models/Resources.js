require("./dbConnect");
const ResourceSchema = mongoose.Schema({

	name:{type:String,unique:true},
	downloadUrl:{type:String,unique:true},
	viewUrl:{type:String,unique:true},
	isActive : {type:Boolean,default:1}
});
module.exports = mongoose.model('Resource',ResourceSchema);
