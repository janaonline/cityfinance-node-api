require('./dbConnect');
var State = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, index: { unique: true } },
    regionalName: { type: String, required: true,default : "" },
    modifiedAt : { type: Date },
    createdAt : { type: Date },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model("State", State);
