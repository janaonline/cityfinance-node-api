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
      code: { type: String },
      name: { type: String },
      details: { type: String },
      cost: { type: Number },
      exAgency: { type: String },
      paraAgency: { type: String },
      sector: { type: String },
      type: { type: String },
      esOutcome: { type: String },
    },
  ],
  sourceFund: [
    {
      code: { type: String },
      name: { type: String },
      cost: { type: Number },
      fc: { type: Number },
      jjm: { type: Number },
      sbm: { type: Number },
      centalScheme: { type: Number },
      stateScheme: { type: Number },
      stateGrant: { type: Number },
      ulb: { type: Number },
      other: { type: Number },
      total: { type: Number },
      targetYears: {
        "2021-22": { type: Number },
        "2022-23": { type: Number },
        "2023-24": { type: Number },
        "2024-25": { type: Number },
        "2025-26": { type: Number },
      },
    },
  ],
  yearOutlay: [
    {
      code: { type: String },
      name: { type: String },
      cost: { type: Number },
      funding: { type: Number },
      amount: { type: Number },
      targetYears: {
        "2021-22": { type: Number },
        "2022-23": { type: Number },
        "2023-24": { type: Number },
        "2024-25": { type: Number },
        "2025-26": { type: Number },
      },
    },
  ],
  rejectReason: {
    type: String,
  },
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
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
ActionPlansSchema.index({ ulb: 1, design_year: 1 }, { unique: true });
module.exports = mongoose.model("ActionPlans", ActionPlansSchema);
