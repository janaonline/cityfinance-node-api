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
        }
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

const numberOfQuestion1 = {
    value: { type: String },
    status: {
        type: String,
        default: "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
    },
}
const numberOfQuestion = {
    value: { type: Number },
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
            value: { type: Number, default: null },
            status: statusSchema(),
            dataSource:modelSchema()
        },
        populationFr: {
            value: { type: Number, default: null },
            status: statusSchema(),
            dataSource:modelSchema()
        },
        webLink: {
            value : { type: String, default: null },
            status: statusSchema()
        },
        nameCmsnr: {
            value : {type:String,default:null},
            status:statusSchema()
        },
        nameOfNodalOfficer: {
            value:{ type: String, default: null },
            status:statusSchema()
        },
        designationOftNodalOfficer: {
            value: { type: String, default: null },
            status:statusSchema()
        },
        auditorName:{
            status:statusSchema(),
            value: { type: String, default: null },
        },
        caMembershipNo:{
            status:statusSchema(),
            value: { type: String, default: null },
        },
        email: {
            status:statusSchema(),
            value:{
                type: String,
                trim: true,
                lowercase: true
            },
        },
        mobile: {
            status:statusSchema(),
            value:{ type: String, default: null }
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
            value: { type: String, default: null }
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
            value: { type: String, default: null }
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
        },
        fy_21_22_online: {
            type: {
                type: String,
                enum: {
                    values: ["UPI", "Netbanking", "Credit Card", "Debit Card", "Others"],
                    message: "ERROR: STATUS BE EITHER 'UPI'/ 'Netbanking'/ 'Credit Card'/ 'Debit Card'/ 'Others'",
                },
            },
            value: { type: Number, default: null },
            status: {
                type: String,
                default: "PENDING",
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            year: { type: Schema.Types.ObjectId, ref: "Year", default: null },
        },
        totalOwnRevenueArea: numberOfQuestion1,
        property_tax_register: numberOfQuestion,
        paying_property_tax: numberOfQuestion,
        paid_property_tax: numberOfQuestion,
        signedCopyOfFile: {
            name: { type: String },
            url: { type: String },
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            }
        },
        status: {
            type: String,
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        actionTakenByRole: { type: String, default: null },
        rejectReason: { type: String, default: null },
        history: { type: Array, default: [] },
        createdAt: { type: Date, default: Date.now() },
        modifiedAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
        isDraft: { type: Boolean, default: false, required: true },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
fiscalRankingSchema.index(
    { ulb: 1, design_year: 1 },
    { unique: true }
);
module.exports = mongoose.model("FiscalRanking", fiscalRankingSchema);