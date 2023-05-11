require("./dbConnect");

const {modelSchema} = require('./constants')

const statusSchema = ()=>{
    return {
        type: String,
        default: "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED",null],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
        
    }
}
const enumYesNo = {
    value: {
        type: String,
        enum: {
            values: ["Yes", "No", null],
            message: "ERROR: STATUS BE EITHER 'Yes'/ 'No'",
        },
        default:null,
    },
    status: {
        type: String,
        default: "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
    },
}

const fiscalRankingSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        population11: {
            value: { type: Number},
            status: statusSchema(),
            dataSource:modelSchema(),
            rejectReason:{type:String,default:""}
        },
        populationFr: {
            value: { type: Number, default: null},
            status: statusSchema(),
            dataSource:modelSchema(),
            rejectReason:{type:String,default:""}
        },
        webLink: {
            value : { type: String, default: null},
            status: statusSchema(),
            rejectReason:{type:String,default:""}
        },
        nameCmsnr: {
            value : {type:String,default:null},
            status:statusSchema(),
            rejectReason:{type:String,default:""}
        },
        nameOfNodalOfficer: {
            value:{ type: String, default: null },
            status:statusSchema(),
            rejectReason:{type:String,default:""}
        },
        designationOftNodalOfficer: {
            value: { type: String, default: null },
            status:statusSchema(),
            rejectReason:{type:String,default:""}
        },
        auditorName:{
            status:statusSchema(),
            value: { type: String, default: null },
            rejectReason:{type:String,default:""}
        },
        caMembershipNo:{
            status:statusSchema(),
            value: { type: String, default: null },
            rejectReason:{type:String,default:""}
        },
        email: {
            status:statusSchema(),
            value:{
                type: String,
                trim: true,
                lowercase: true
            },
            rejectReason:{type:String,default:""}
        },
        mobile: {
            status:statusSchema(),
            value:{ type: String, default: null },
            rejectReason:{type:String,default:""}
        },
        auditorName:{
            status:statusSchema(),
            value:{ type: String},
            rejectReason:{type:String,default:""}
        },
        caMembershipNo:{
            status:statusSchema(),
            value:{type:String},
            rejectReason:{type:String,default:""}
        },
        webUrlAnnual: {
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            year: { type: Schema.Types.ObjectId, ref: "Year", default: null },
            value: { type: String, default: null },
            rejectReason:{type:String,default:""}
        },
        ownRevDetails: {
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            year: { type: Schema.Types.ObjectId, ref: "Year", default: null },
            value: { type: String, default: null },
            rejectReason:{type:String,default:""}
        },
        waterSupply: enumYesNo,
        sanitationService: enumYesNo,
        propertyWaterTax: enumYesNo,
        propertySanitationTax: enumYesNo,
        // digitalRegtr: enumYesNo,
        registerGis: enumYesNo,
        accountStwre: enumYesNo,
        fy_21_22_cash: {
            type: {
                type: String,
                enum: {
                    values: ["Cash", "Cheque", "DD", null],
                    message: "ERROR: STATUS BE EITHER 'Cash'/ 'Cheque'/ 'DD'",
                },
            },
            value: { type: Number, default: null },
            status: {
                default: "PENDING",
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            year: { type: Schema.Types.ObjectId, ref: "Year", default: null },
            rejectReason:{type:String,default:""}
        },
        fy_21_22_online: {
            type: {
                type: String,
                enum: {
                    values: ["UPI", "Netbanking", "Credit Card", "Debit Card", "Others"],
                    message: "ERROR: STATUS BE EITHER 'UPI'/ 'Netbanking'/ 'Credit Card'/ 'Debit Card'/ 'Others'",
                },
                
            },
            value: { type: Number, default: null},
            status: {
                type: String,
                default: "PENDING",
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            rejectReason:{type:String,default:""},
            year: { type: Schema.Types.ObjectId, ref: "Year", default: null },
        },
        // totalOwnRevenueArea: numberOfQuestion1,
        // property_tax_register: numberOfQuestion,
        // paying_property_tax: numberOfQuestion,
        // paid_property_tax: numberOfQuestion,
        signedCopyOfFile: {
            name: { type: String },
            url: { type: String },
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            rejectReason:{type:String,default:""}
        },
        otherUpload:{
            name: { type: String },
            url: { type: String },
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            rejectReason:{type:String,default:""}
        },
        status: {
            type: String,
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        
        actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default: null ,required:true},
        actionTakenByRole: { type: String, default: null,required:true },
        rejectReason: { type: String, default: null },
        // createdAt: { type: Date, default: Date.now },
        // modifiedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: 1 },
        isDraft: { type: Boolean, default: false, required: true },
        submittedDate :  { type: Date, default:null },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
fiscalRankingSchema.index(
    { ulb: 1, design_year: 1 },
    { unique: true }
);
module.exports = mongoose.model("FiscalRanking", fiscalRankingSchema);