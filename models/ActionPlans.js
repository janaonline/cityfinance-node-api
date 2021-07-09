require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
  return {
    type: String,
    enum: {
      values: ["PENDING", "APPROVED", "REJECTED"],
      message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
    },
    default: "PENDING",
  };
};

const uas = new Schema({
  ua: { type: Schema.Types.ObjectId, ref: "uas", required: true },
  projectExecute: [
    {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
      details: { type: String, default: "" },
      cost: { type: Number, default: "" },
      exAgency: { type: String, default: "" },
      paraAgency: { type: String, default: "" },
      sector: { type: String, default: "" },
      type: { type: String, default: "" },
      esOutcome: { type: String, default: "" },
      _id: false,
    },
  ],
  sourceFund: [
    {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
      cost: { type: Number, default: "" },
      fc: { type: Number, default: "" },
      jjm: { type: Number, default: "" },
      sbm: { type: Number, default: "" },
      centalScheme: { type: Number, default: "" },
      stateScheme: { type: Number, default: "" },
      stateGrant: { type: Number, default: "" },
      ulb: { type: Number, default: "" },
      other: { type: Number, default: "" },
      total: { type: Number, default: "" },
      "2021-22": { type: Number, default: "" },
      "2022-23": { type: Number, default: "" },
      "2023-24": { type: Number, default: "" },
      "2024-25": { type: Number, default: "" },
      "2025-26": { type: Number, default: "" },
      _id: false,
    },
  ],
  yearOutlay: [
    {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
      cost: { type: Number, default: "" },
      funding: { type: Number, default: "" },
      amount: { type: Number, default: "" },
      "2021-22": { type: Number, default: "" },
      "2022-23": { type: Number, default: "" },
      "2023-24": { type: Number, default: "" },
      "2024-25": { type: Number, default: "" },
      "2025-26": { type: Number, default: "" },
      _id: false,
    },
  ],
  rejectReason: {
    type: String,
    default: "",
  },
  status: statusType(),
  _id: false,
});

const ActionPlansSchema = new Schema(
  {
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED"],
        message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
      },
      default: "PENDING",
    },
    isDraft: { type: Boolean, default: false, required: true },
    history: { type: Array, default: [] },
    uaData: [uas],
    status: statusType(),
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
ActionPlansSchema.index({ state: 1, design_year: 1 }, { unique: true });
module.exports = mongoose.model("ActionPlans", ActionPlansSchema);
