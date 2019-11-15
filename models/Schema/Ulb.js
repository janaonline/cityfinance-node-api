require('./dbConnect');
var Ulb = new Schema({
    name: { type: String, required: true },
    regionalName: { type: String, default : "" },
    code: { type: String, required: true, index: { unique: true } },
    state : { type: Schema.Types.ObjectId, ref: 'State' },
    ulbType : { type: Schema.Types.ObjectId, ref: 'UlbType' },
    natureOfUlb : { type : String, default : null},
    wards : { type : Number, default : 0},
    area : { type : Number, default : 0},
    population : { type : Number, default : 0},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model("Ulb", Ulb);
