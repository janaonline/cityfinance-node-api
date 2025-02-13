require("./dbConnect");
const ResourceSchema = mongoose.Schema({

	name:{type:String,unique:true},
	downloadUrl:{type:String,unique:true},
	imageUrl:{type:String,default:""},
	isActive : {type:Boolean,default:1},
	modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
},
{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('Resource',ResourceSchema);
