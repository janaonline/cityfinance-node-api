require('./dbConnect');
var LineItem = new Schema({
    name: { type: String, required: true },
    headOfAccount: { type: String, enum : [""], required: true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model("LineItem", LineItem);
