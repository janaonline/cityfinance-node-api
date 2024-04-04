require('./dbConnect');
var LineItemSchema = new Schema({
    name: { type: String, required: true },
    code: { type: String, required: true },
    colour: { type: String, },
    headOfAccount: { type: String, enum : ["Revenue","Expense","Liability","Asset", "Debt","Tax","Other"], required: true ,index:true},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});

LineItemSchema.index(
    { 
        code : 1,
        isActive: 1
    },
    { 
        unique: true 
    }
)
module.exports = mongoose.model('LineItem', LineItemSchema);
