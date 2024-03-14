require('./dbConnect');
const UlbUpdateRequestSchema = new Schema({
    ulb:{ type: Schema.Types.ObjectId, ref: 'Ulb' ,required : true},
    ulbType : { type: Schema.Types.ObjectId, ref: 'UlbType' ,default:null},
    natureOfUlb : { type : String, default : null},
    name: { type: String, default:null },
    regionalName: { type: String, default:null },
    code: { type: String, default:null },
    state : { type: Schema.Types.ObjectId, ref: 'State' , default:null},
    wards : { type : Number, default:null},
    area : { type : Number, default:null},
    population : { type : Number, default:null},
    location:{
        type:{
            lat:{type:String },
            lng:{type:String },
        },
        default:null
    },
    amrut : { type : String ,  default:null},
    commissionerName:{type:String, default:null},
    commissionerEmail:{type:String, default:null},
    commissionerConatactNumber:{type:String, default:null},
    accountantName:{type:String, default:null},
    accountantEmail:{type:String, default:null},
    accountantConatactNumber:{type:String, default:null},
    status:{type:String, enum:["PENDING","APPROVED","REJECTED","CANCELLED"], default:"PENDING"},
    actionTakenBy:{ type: Schema.Types.ObjectId, ref: 'User' ,required : true},
    history:{type:Array, default:[]},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model('UlbUpdateRequest', UlbUpdateRequestSchema);
