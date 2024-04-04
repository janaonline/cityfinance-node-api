require("./dbConnect");
const mongoose = require('mongoose');
const { Schema } = mongoose;

const OptionSchema = new Schema(
  {
    name: { type: String, required: true },
    type: {type: String, required: true},
    value: {type: Number},
    isActive: { type: Boolean, default: 1 },
    modifiedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("Option", OptionSchema);
