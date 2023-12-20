require("./dbConnect");
const { Schema } = mongoose;

const IndicatorsSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    unit: { type: String },
    benchMark: { type: String },
    type: {
      type: String,
      enum: {
        values: ["water supply", "sanitation", "solid waste", "storm water"],
      },
      required: true,
    },
    sequence:{ type: Number},
    range:{
      type: String
    },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    mapperKey: {type: String, default:""},
    lineItemId: {type: Number}
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("indicatorLineItem", IndicatorsSchema);
