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
    currentFormStatus:{type:Number},
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    type:{
      type: String,
      enum: {
        values: ["nonmillion_tied", "million_tied", "nonmillion_untied",""],
      },
    },
    installment:{
      type: Number,
    },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    year: { type: Schema.Types.ObjectId, ref: "Year" },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

GrantDistributionSchema.index(
  {
    state: 1,
    design_year: 1,
    type:1,
    installment:1,
    year:1
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("GrantDistribution", GrantDistributionSchema);
