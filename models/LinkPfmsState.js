require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const LinkPfmsStateSchema = new Schema(
  {
    state: { type: Schema.Types.ObjectId, ref: "state", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    excel: { url: { type: String }, name: { type: String } },
    history: { type: Array, default: [] },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isDraft: { type: Boolean, default: true },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

module.exports = mongoose.model("LinkPfmsState", LinkPfmsStateSchema);
