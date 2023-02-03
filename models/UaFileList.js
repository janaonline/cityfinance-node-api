require('./dbConnect');


const uaFileListSchema = new Schema({
    name:{type:String},
    url:{type:String},
    isActive:{type:Boolean,default:true},
    description:{type:String,default:""},
    Year : {type:Schema.Types.ObjectId,ref:"Year"},
    UA: { type: Schema.Types.ObjectId, ref: 'UA' },
},{ timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } })

module.exports = mongoose.model("UaFileList",uaFileListSchema)