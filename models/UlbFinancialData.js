require('./dbConnect');
const audited = function () {
    return this.audited;
}

const ContentSchema = new Schema({
    pdfUrl:{type:String},
    excelUrl:{type:String},
    completeness:{type:String, enum: ["PENDING","APPROVED","REJECTED"], default:"PENDING"},
    correctness:{type:String, enum: ["PENDING","APPROVED","REJECTED"], default:"PENDING"}
});
const UlbFinancialDataSchema = new Schema({
    ulb:{ type: Schema.Types.ObjectId, ref: 'Ulb' ,required : true},
    financialYear:{ type: String,required : true},
    audited:{type:Boolean, default:false},
    balanceSheet: { type:ContentSchema, required:true},
    schedulesToBalanceSheet: { type:ContentSchema, required:true},
    incomeAndExpenditure: { type:ContentSchema, required:true},
    schedulesToIncomeAndExpenditure: { type:ContentSchema, required:true},
    trialBalance: { type:ContentSchema, required:true},
    auditReport: { type:ContentSchema, required:audited},
    completeness:{type:String, enum:["PENDING","APPROVED","REJECTED"], default:"PENDING"},
    correctness:{type:String, enum:["PENDING","APPROVED","REJECTED"], default:"PENDING"},
    actionTakenBy:{ type: Schema.Types.ObjectId, ref: 'User' ,required : true},
    history:{type:Array, default:[]},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 }
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
UlbFinancialDataSchema.index({ulb:1, financialYear:1},{unique:true});
module.exports = mongoose.model('UlbFinancialData', UlbFinancialDataSchema);