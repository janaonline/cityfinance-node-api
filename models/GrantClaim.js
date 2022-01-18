require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const StatusSchema = new Schema({
    submittedOn: { type: Date },
    approvedOn: { type: Date},
    returnedOn: { type: Date},
    releasedOn: { type: Date}
})



const ClaimDataSchema = new Schema({
    installment: { type: String},
    submitStatus: { type: Boolean},
    releaseStatus:{type: Boolean},
    actionTakenBy: {
        type: String,
        enum: ["STATE", "MoHUA"],
      
    },
    applicationStatus: {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING"],
      
    },
    amountClaimed: { type: String },
    dates: { type: StatusSchema }
});

const GrantClaimSchema = new Schema(
    {
        financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
        state: { type: Schema.Types.ObjectId, ref: "State", required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        nmpc_tied: { type: [ClaimDataSchema]  },
        nmpc_untied: { type: [ClaimDataSchema]},
        mpc: { type: [ClaimDataSchema]},


    },
    { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

module.exports = mongoose.model('GrantClaim', GrantClaimSchema);
