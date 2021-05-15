require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "PENDING", "NA"],
    default: "NA",
  };
};

const MasterFormSchema = new Schema(
  {
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year" },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    steps: {
      utilReport: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: null,
        },

      },
      plans: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: null,
        },

      },
      pfmsAccount: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: null,
        },

      },
      slbForWaterSupplyAndSanitation: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: null,
        },

      },
      annualAccounts: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: null,
        },

      },
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

MasterFormSchema.index(
  {
    ulb: 1, design_year: 1
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("MasterForm", MasterFormSchema);
