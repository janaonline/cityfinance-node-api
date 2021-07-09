require("./dbConnect");

const GrantDistributionSchema = new Schema(
  {
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },
    answer: { type: Boolean, default: 0 },
    isDraft: { type: Boolean, default: 0 },
    url: { type: String, default: "" },
    fileName: { type: String, default: "" },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
GrantDistributionSchema.index(
  {
    state: 1,
    design_year: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("GrantDistribution", GrantDistributionSchema);
