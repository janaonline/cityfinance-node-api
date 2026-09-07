require("./dbConnect");
const ResourceSchema = mongoose.Schema({

	name:{type:String,unique:true},
	downloadUrl:{type:String,unique:true},
	imageUrl:{type:String,default:""},
	// When true, downloadUrl/imageUrl are HOSTNAME-relative keys (e.g. "/assets/docs/x.pdf")
	renderedFromUI: { type: Boolean, default: false },
	isActive : {type:Boolean,default:1},
	modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
},
{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model('Resource',ResourceSchema);
