const mongoose = require("mongoose");
const { Schema } = mongoose;

const LineItemLegendSchema = new Schema(
  {
    majorCode: {
      type: Number,
      required: true,
    },
    subCode: {
      type: Number,
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

LineItemLegendSchema.index({ majorCode: 1, subCode: 1 }, { unique: true });

module.exports = mongoose.model("LineItemLegend", LineItemLegendSchema);