require("./dbConnect")
const LedgerSchema = mongoose.Schema({
    ulb : { type: Schema.Types.ObjectId, ref: 'Ulb',index:true},
    lineItem : { type: Schema.Types.ObjectId, ref: 'LineItem' },
    financialYear : { type : String, required : true,index:true, enum:[ "2015-16","2016-17","2017-18"]},
    amount : { type : Number, required : true},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
});


LedgerSchema.index(
    { 
        ulb : 1,
        financialYear: 1,
        lineItem: 1,
    },
    { 
        unique: true 
    }
);
module.exports = mongoose.model('ULBLedger', LedgerSchema);
