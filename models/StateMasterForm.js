require("./dbConnect");

const statusType = () => {
    return {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING"],
        default: "PENDING",
    };
};

const StateMasterFormSchema = new Schema(
    {
        design_year: { type: Schema.Types.ObjectId, ref: "Year" },
        actionTakenBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        actionTakenByRole: {
            type: String,
            default: null
        },
        steps: {
            linkPFMS: {
                rejectReason: {
                    type: String,
                    default: null
                },
                status: statusType(),
                isSubmit: {
                    type: Boolean,
                    default: null,
                },

            },
            GTCertificate: {
                rejectReason: {
                    type: Array,
                    default: []
                },
                status: statusType(),
                isSubmit: {
                    type: Boolean,
                    default: null,
                },

            },
            waterRejuventation: {
                status: statusType(),
                rejectReason: {
                    type: Array,
                    default: []
                },
                isSubmit: {
                    type: Boolean,
                    default: null,
                }
            },
            actionPlans: {
                status: statusType(),
                rejectReason: {
                    type: Array,
                    default: []
                },
                isSubmit: {
                    type: Boolean,
                    default: null,
                }

            },
            grantAllocation: {
                isSubmit: {
                    type: Boolean,
                    default: null,
                }
            }

        },
        //over all status of form
        status: statusType(),
        //over all submit of form
        isSubmit: {
            type: Boolean,
            default: false,
        },
        history: { type: Array, default: [] },
        modifiedAt: { type: Date, default: Date.now() },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
        },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

StateMasterFormSchema.index(
    {
        state: 1, design_year: 1
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model("StateMasterForm", StateMasterFormSchema);
