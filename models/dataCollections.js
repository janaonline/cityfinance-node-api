const mongoose = require("mongoose");
const { Schema } = mongoose;

const dataCollectionSchema = new Schema(
  {
    ulbId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Ulb",
    },
    yearId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Year",
    },
    lineItems: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // auto adds createdAt, updatedAt
  }
);

dataCollectionSchema.index({ ulbId: 1, yearId: 1 }, { unique: true });

module.exports = mongoose.model("DataCollection", dataCollectionSchema);