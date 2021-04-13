require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "NA"],
    default: "NA",
  };
};

const XVFcGrantPlansSchema = mongoose.Schema({
  ulb: { type: Schema.Types.ObjectId, ref: "Ulb", index: true, required: true },
  designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  plans: {
    water: {
      url: {
        type: String,
        default: null,
      },
      remarks: {
        type: String,
        default: null,
      },
      status: statusType(),
    },
    sanitation: {
      url: {
        type: String,
        default: null,
      },
      remarks: {
        type: String,
        default: null,
      },
      status: statusType(),
    },
  },
  status: statusType(),
  isDraft: { type: Boolean, default: 0 },
  history: { type: Array, default: [] },
  actionTakenBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});

XVFcGrantPlansSchema.index(
  {
    ulb: 1,
    designYear: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("XVFcGrantPlans", XVFcGrantPlansSchema);
