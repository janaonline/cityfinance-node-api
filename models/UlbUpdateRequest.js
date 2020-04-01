require('./dbConnect');
const UlbUpdateRequestSchema = new Schema({
    ulb:{ type: Schema.Types.ObjectId, ref: 'Ulb' ,required : true},
    name: { type: String, required: true },
    regionalName: { type: String, default : "" },
    code: { type: String, required: true, index: { unique: true } },
    state : { type: Schema.Types.ObjectId, ref: 'State' ,required : true},
    ulbType : { type: Schema.Types.ObjectId, ref: 'UlbType' ,required : true},
    natureOfUlb : { type : String, default : null},
    wards : { type : Number, default : 0},
    area : { type : Number, default : 0},
    population : { type : Number, default : 0},
    location:{
        type:{
            lat:{type:String },
            lng:{type:String },
        },
        default:{
            lat:"0.0",
            lng:"0.0"
        }
    },
    amrut : { type : String ,  default : ""},
    status:{type:String, enum:["PENDING","APPROVED","REJECTED"]},
    actionTakenBy:{ type: Schema.Types.ObjectId, ref: 'User' ,required : true},
    history:{type:Array, default:[]},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model('UlbUpdateRequest', UlbUpdateRequestSchema);