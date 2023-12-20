require('./dbConnect');
const OverallUlbSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, index: { unique: true } },
    state : { type: Schema.Types.ObjectId, ref: 'State' ,required : true},
    population : { type : Number, default : 0},    
    populationCategory : { type: String, required: true, index:true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
module.exports = mongoose.model('OverallUlb', OverallUlbSchema);


