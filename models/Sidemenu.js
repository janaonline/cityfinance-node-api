require('./dbConnect');
const { Schema } = mongoose;
const SidemenuSchema = new Schema({
    name: { type: String, required: true  },
    category: { type: String, enum: ["Entry Level Conditions", "Million Plus City Challenge Fund", "Performance Conditions", ""]  },
    code: { type: String, required: true },
    url:  { type: String, required: true },
    isActive: {type: Boolean, default: true},
    role: {type: String, enum: ["ULB", "STATE", "MoHUA"], required: true},
    modifiedAt : { type: Date, default: Date.now() },
    createdAt : { type: Date, default: Date.now() },
    position: {type: Number},
    icon: {type: String },
    collectionName: {type: String},
    path: {type: String},
    optional: {type: Boolean},
    color:{
        color_1: {type:String},
        color_2: {type:String}, 
    },
    prevUrl: {type: String},
    nextUrl: {type: String},
    cardSequence: {type: Number},
    sequence:{type: Number},
    folderName: {type: String},
    groupSequence: {type: Number},
    formId :{type:Number,default:null},
    year: {type : Schema.Types.ObjectId, ref: "Year", required: true },
    isUAApplicable: {type: Boolean, default: null}
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


module.exports = mongoose.model('Sidemenu', SidemenuSchema);
