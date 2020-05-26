require("./dbConnect");
const ResourceSchema = mongoose.Schema({

	url:{type:String,},
	name:{type:String}

});
module.exports = mongoose.model('Resource',ResourceSchema);
