require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
  return {
    type: String,
    enum: {
      values: ["PENDING", "APPROVED", "REJECTED"]
    },
    default: "PENDING",
  };
};

const pdfSchema = ()=>{
  return {
    url: { type: String},
    name: { type: String}
  }
}
const uas = new Schema({
  ua: { type: Schema.Types.ObjectId, ref: "uas", required: true },
  projectExecute: [
    {
      Project_Code: { type: String, default: "" },
      Project_Name: { type: String, default: "" },
      Details: { type: String, default: "" },
      Cost: { type: Number, default: "" },
      Executing_Agency: { type: String, default: "" },
      Parastatal_Agency: { type: String, default: "" },
      Sector: { type: String, default: "" },
      Type: { type: String, default: "" },
      Estimated_Outcome: { type: String, default: "" },
      _id: false,
      isDisable: {type: Boolean}
    },
  ],
  sourceFund: [
    {
      Project_Code: { type: String, default: "" },
      Project_Name: { type: String, default: "" },
      Cost: { type: Number, default: "" },
      XV_FC: { type: Number, default: "" },

      Other: { type: Number, default: "" },
      Total: { type: Number, default: "" },
      "2021-22": { type: Number, default: "" },
      "2022-23": { type: Number, default: "" },
      "2023-24": { type: Number, default: "" },
      "2024-25": { type: Number, default: "" },
      "2025-26": { type: Number, default: "" },
      _id: false,
      isDisable: {type: Boolean}

    },
  ],
  yearOutlay: [
    {
      Project_Code: { type: String, default: "" },
      Project_Name: { type: String, default: "" },
      Cost: { type: Number, default: "" },
      Funding: { type: Number, default: "" },
      Amount: { type: Number, default: "" },
      "2021-22": { type: Number, default: "" },
      "2022-23": { type: Number, default: "" },
      "2023-24": { type: Number, default: "" },
      "2024-25": { type: Number, default: "" },
      "2025-26": { type: Number, default: "" },
      _id: false,
      isDisable: {type: Boolean}
    },
  ],
  rejectReason: {
    type: String,
    default: "",
  },
  responseFile: pdfSchema(),
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
        values: ["PENDING", "APPROVED", "REJECTED",""],
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
    actionTakenByRole: {
      type: String,
      enum: ["ULB", "MoHUA", "STATE"],
      required: true,
    },
    currentFormStatus: {
      type: Number
    }
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
ActionPlansSchema.index({ state: 1, design_year: 1 }, { unique: true });
module.exports = mongoose.model("ActionPlans", ActionPlansSchema);
