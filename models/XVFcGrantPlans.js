require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "PENDING"],
    default: "PENDING",
  };
};

const projectDetails = () => {
  return {
    name: {
      type: String,
    },
    component: {
      type: String,
    },
    serviceLevel: {
      indicator: {
        type: String,
      },
      existing: {
        type: Number,
      },
      after: {
        type: Number,
      },
    },
    cost: {
      type: Number,
    },
  };
};

const XVFcGrantPlansSchema = mongoose.Schema({
  ulb: { type: Schema.Types.ObjectId, ref: "Ulb", index: true, required: true },
  designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  plans: {
    water: projectDetails(),
    sanitation: projectDetails(),
  },
  status: statusType(),
  isDraft: { type: Boolean, default: 0 },
  history: { type: Array, default: [] },
  actionTakenBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  actionTakenByRole: {
    type: String,
    default: null,
  },
  rejectReason: {
    type: String,
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
