require('./dbConnect');
var UlbTypeSchema = new Schema({
    name: { type: String, required: true },
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});


UlbTypeSchema.index(
    { 
        name : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
);
module.exports = mongoose.model('UlbType', UlbTypeSchema);
