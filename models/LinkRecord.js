require('./dbConnect');

const LinkRecordSchema = mongoose.Schema({
    url: {type: String, required: true},
    shortKey: {type: String, required:true},
    key: {type: Number, required: true},

	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now },
	
});
module.exports = mongoose.model('LinkRecord', LinkRecordSchema);;