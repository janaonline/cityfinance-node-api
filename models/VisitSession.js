require('./dbConnect');
const VisitSessionSchema = new Schema({
    routes:{type:Array,default: []},
    isActive:{type:Boolean, default:true},
    modifiedAt:{ type: Date, default:Date.now() },
    createdAt : { type: Date, default:Date.now()}
},{timestamp : {createdAt : "createdAt"}});
module.exports = mongoose.model('VisitSession', VisitSessionSchema);
