require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const StatusSchema = new Schema({
    submittedOn: { type: Date, default: null },
    approvedOn: { type: Date, default: null },
    returnedOn: { type: Date, default: null }
})

const DataSchema = new Schema({
    installment: { type: String, default: null },
    submitStatus: { type: Boolean, default: false },
    actionTakenBy: {
        type: String,
        enum: ["STATE", "MoHUA"],
        default: null,
    },
    applicationStatus: {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING"],
        default: null,
    },
    amountClaimed: { type: String, default: null },
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    dates: { type: StatusSchema }
})

const ClaimDataSchema = new Schema({
    data: { type: [DataSchema] }
});

const GrantClaimSchema = new Schema(
    {
        financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        state: { type: Schema.Types.ObjectId, ref: "State", required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        nmpc_tied: { type: ClaimDataSchema },
        nmpc_untied: { type: ClaimDataSchema },
        mpc: { type: ClaimDataSchema },


    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

module.exports = mongoose.model('GrantClaim', GrantClaimSchema);
