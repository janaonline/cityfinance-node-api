require('./dbConnect');


const uaFileListSchema = new Schema({
    name:{type:String},
    url:{type:String},
    isActive:{type:Boolean,default:true},
    UA: { type: Schema.Types.ObjectId, ref: 'UA' },
},{ timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } })

module.exports = mongoose.model("UaFileList",uaFileListSchema)