require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const pdfSchema = () => {
    return {
        name: { type: String },
        url: { type: String }
    }
}
const sfcSchema = new Schema({
    state: {
        type: Schema.Types.ObjectId,
        ref: "State"
    },
    design_year: {
        type: Schema.Types.ObjectId,
        ref: "Year"
    },
    isDraft: { type: Boolean, default: true },
    status: {
        type: String,
        enum: {
            values: ["PENDING", "APPROVED", "REJECTED"],
            message: "ERROR: status can be either PENDING/APPROVED/REJECTED"
        }
    },

    data: [
        {
            key: String,
            value: Schema.Types.Mixed,
            date: Date,
            file: pdfSchema(),
            formFieldType: String
        }

    ],

    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    responseFile_state: pdfSchema(),
    responseFile_mohua: pdfSchema(),
    rejectReason_state: { type: String, default: "" },
    rejectReason_mohua: { type: String, default: "" },
    actionTakenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    stateSubmit: { type: Date },
    actionTakenByRole: {
        type: String,
        enum: ["STATE", "MoHUA"],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    modifiedAt: {
        type: Date,
        default: Date.now
    },
    currentFormStatus: {
        type: Number,
    },
    history: {
        type: Array,
        default: []
    }
}, {
    timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" }
})

sfcSchema.index({ state: 1, design_year: 1, year: 1, installment: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('StateFinanceCommissionForm', sfcSchema);