require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "NA"],
    default: "NA",
  };
};

const MasterFormSchema = new Schema(
  {
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
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
          default: false,
        },
      },
      plans: {
        remarks: {},
        // individual status of sub form
        status: statusType(),
        isSubmit: {
          type: Boolean,
          default: false,
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
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

MasterFormSchema.index(
  {
    ulb: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("MasterForm", MasterFormSchema);
