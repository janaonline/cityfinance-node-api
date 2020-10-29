const { Schema } = require('mongoose');

require('./dbConnect');
const audited = function () {
    return this.audited;
}
const statusType = ()=>{
    return {type:String, enum: ["PENDING","APPROVED","REJECTED","NA"], default:"NA"};
}
const overallStatusType = ()=>{
    return {type:String, enum: ["PENDING","APPROVED","REJECTED"], default:"PENDING"};
}
const ContentSchema = new Schema({
    pdfUrl:{type:String},
    excelUrl:{type:String},
    completeness:statusType(),
    correctness:statusType(),
    message:{type:String, default:""}
});

const waterManagementSchema = new Schema({
    serviceLevel:
    {
        baseline:{2021:{type:String,required:true}},
        target:{
            2122:{type:Number,required:true},
            2223:{type:Number,required:true}, 
            2324:{type:Number,required:true},  
            2425:{type:Number,required:true} 
        },
        status:statusType(),
        rejectRegion:{type:String,default:""}
    },
    houseHoldCoveredPipedSupply:
    {
        baseline:{2021:{type:String,required:true}},
        target:{
            2122:{type:Number,required:true},
            2223:{type:Number,required:true}, 
            2324:{type:Number,required:true},  
            2425:{type:Number,required:true} 
        },
        status:statusType(),
        rejectRegion:{type:String,default:""}
    },
    waterSuppliedPerDay:
    {
        baseline:{2021:{type:String,required:true}},
        target:{
            2122:{type:Number,required:true},
            2223:{type:Number,required:true}, 
            2324:{type:Number,required:true},  
            2425:{type:Number,required:true} 
        },
        status:statusType(),
        rejectRegion:{type:String,default:""}  
    },
    reduction:
    {
        baseline:{2021:{type:String,required:true}},
        target:{
            2122:{type:Number,required:true},
            2223:{type:Number,required:true}, 
            2324:{type:Number,required:true},  
            2425:{type:Number,required:true} 
        },
        status:statusType(),
        rejectRegion:{type:String,default:""}  
    },
    houseHoldCoveredWithSewerage:
    {
        baseline:{2021:{type:String,required:true}},
        target:{
            2122:{type:Number,required:true},
            2223:{type:Number,required:true}, 
            2324:{type:Number,required:true},  
            2425:{type:Number,required:true} 
        },
        status:statusType()  ,
        rejectRegion:{type:String,default:""}    
    },

    documents:{
        wasteWaterPlan:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}    
                }
            ],
            default:null,
            required:true
        }
    }
});

const solidWasteManagementSchema = new Schema({

    documents:{
        garbageFreeCities:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        },
        waterSupplyCoverage:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        }
    }

})

const millionPlusCitiesSchema = new Schema({

    documents:{
        cityPlan:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        },
        waterBalancePlan:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        },
        serviceLevelPlan:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        },
        solidWastePlan:{
            type:[
                {
                    url : { type: String, required: true},
                    name : { type: String, required: true},
                    status:statusType(),
                    rejectRegion:{type:String,default:""}
                }
            ],
            default:null,
            required:true
        }
    }

})

const UlbFinancialDataSchema = new Schema({
    //referenceCode:{type:String, default:""},
    ulb:{ type: Schema.Types.ObjectId, ref: 'Ulb' ,required : true},
    // financialYear:{ type: String,required : true},
    // audited:{type:Boolean, default:false},
    // balanceSheet: { type:ContentSchema, required:true},
    // schedulesToBalanceSheet: { type:ContentSchema, required:true},
    // incomeAndExpenditure: { type:ContentSchema, required:true},
    // schedulesToIncomeAndExpenditure: { type:ContentSchema, required:true},
    // trialBalance: { type:ContentSchema, required:true},
    // auditReport: { type:ContentSchema, required:audited},
    overallReport: { type:ContentSchema, default:null},
    // completeness:overallStatusType(),
    // correctness:overallStatusType(),
    status:overallStatusType(),
    actionTakenBy:{ type: Schema.Types.ObjectId, ref: 'User' ,required : true},
    history:{type:Array, default:[]},
    modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },
    isActive : { type  : Boolean, default : 1 },
    waterManagement:{type:waterManagementSchema,default:null},
    solidWasteManagement:{type:solidWasteManagementSchema,default:null},
    millionPlusCities:{type:millionPlusCitiesSchema,default:null},
    isCompleted:{type:Boolean,default:0}

    
},{timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}});
UlbFinancialDataSchema.index({ulb:1, financialYear:1,audited:1},{unique:true});
module.exports = mongoose.model('UlbFinancialData', UlbFinancialDataSchema);