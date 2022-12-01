require("./dbConnect");
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
        default : "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
    },
    actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default:null },
    actionTakenByRole: { type: String, default: null },
}

const numberOfQuestion1 = {
    value: { type: String },
    status: {
        type: String,
        default : "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
    },
    actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default:null },
    actionTakenByRole: { type: String, default: null },
}
const numberOfQuestion = {
    value: { type: Number},
    status: {
        type: String,
        default : "PENDING",
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
        },
    },
    actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default:null },
    actionTakenByRole: { type: String, default: null },
}

const fiscalRankingSchema = new Schema(
    {
        ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
        design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        population11: { type: Number, default: 0 },
        populationFr: { type: Number, default: 0 },
        webLink: { type: String, default: null },
        nameCmsnr: { type: String, default: null },
        nameOfNodalOfficer: { type: String, default: null },
        designationOftNodalOfficer: { type: String, default: null },
        email: {
            type: String,
            trim: true,
            lowercase: true
        },
        mobile: { type: String, default: null },
        webUrlAnnual: {
            status: {
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            },
            value: { type: String, default: null }
        },
        digitalRegtr: enumYesNo,
        registerGis: enumYesNo,
        accountStwre: enumYesNo,
        fy_19_20_cash: {
            type: {
                type: String,
                enum: {
                    values: ["Cash", "Cheque", "DD", null],
                    message: "ERROR: STATUS BE EITHER 'Cash'/ 'Cheque'/ 'DD'",
                },
            },
            amount: { type: Number, default: 0 },
            status: {
                default : "PENDING",
                type: String,
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            }
        },
        fy_19_20_online: {
            type: {
                type: String,
                enum: {
                    values: ["UPI", "Netbanking", "Credit Card", "Debit Card", "Others"],
                    message: "ERROR: STATUS BE EITHER 'UPI'/ 'Netbanking'/ 'Credit Card'/ 'Debit Card'/ 'Others'",
                },
            },
            amount: { type: Number, default: 0. },
            status: {
                type: String,
                default : "PENDING",
                enum: {
                    values: ["PENDING", "APPROVED", "REJECTED"],
                    message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
                },
            }
        },
        totalOwnRevenueArea: numberOfQuestion1,
        property_tax_register: numberOfQuestion,
        paying_property_tax: numberOfQuestion,
        paid_property_tax: numberOfQuestion,
        status: {
            type: String,
            enum: {
                values: ["PENDING", "APPROVED", "REJECTED"],
                message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
            },
        },
        actionTakenBy: { type: Schema.Types.ObjectId, ref: "User", default:null },
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
