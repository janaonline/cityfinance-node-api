require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "PENDING"],
    default: "PENDING",
  };
};

const LinkPfmsStateSchema = new Schema(
  {
    state: { type: Schema.Types.ObjectId, ref: "state", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    excel: { url: { type: String }, name: { type: String } },
    history: { type: Array, default: [] },
    modifiedAt: { type: Date, default: Date.now() },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now() },
    isDraft: { type: Boolean, default: true },
    status: statusType(),
    rejectReason: {
      type: String,
      default: null,
    },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

LinkPfmsStateSchema.index(
  {
    designYear: 1,
    state: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("LinkPfmsState", LinkPfmsStateSchema);
