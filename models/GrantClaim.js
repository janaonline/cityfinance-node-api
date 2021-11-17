require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const StatusSchema = new Schema({
    submittedOn: { type: Date, default: null },
    approvedOn: { type: Date, default: null },
    returnedOn: { type: Date, default: null }
})

const FileSchema = new Schema({
    fileName: { type: String, default: null },
    url: { type: String, default: null }
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
    file: { type: FileSchema },
    dates: { type: StatusSchema }
})

const ClaimDataSchema = new Schema({
    data: { type: [DataSchema], default: [] }
});

const GrantClaimSchema = new Schema(
    {
        financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        state: { type: Schema.Types.ObjectId, ref: "State", required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        nmpc_tied: { type: ClaimDataSchema, default: null },
        nmpc_untied: { type: ClaimDataSchema, default: null },
        mpc: { type: ClaimDataSchema, default: null },


    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

module.exports = mongoose.model('GrantClaim', GrantClaimSchema);
