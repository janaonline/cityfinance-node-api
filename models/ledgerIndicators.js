require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ledgerIndicatorsSchema = new Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true },
    lineItems: [
      { type: String, required: false }, 
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("LedgerIndicators", ledgerIndicatorsSchema);
