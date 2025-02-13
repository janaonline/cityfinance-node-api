require("./dbConnect");
const { Schema } = mongoose;

const IndicatorsSchema = new Schema(
  {
    ulb: { type: Schema.Types.ObjectId, ref: "ulbs" },
    indicatorLineItem: {
      type: Schema.Types.ObjectId,
      ref: "indicatorLineItem",
    },
    year: { type: String },
    unitType: {
      type: String,
    },
    value: {
      type: Number,
    },
    benchMarkValue: { type: Number },
    ulbName: { type: String },
    censusCode: { type: String },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("Indicator", IndicatorsSchema);
