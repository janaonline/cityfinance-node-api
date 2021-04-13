require("./dbConnect");
const moment = require("moment");

const UtilizationReportProjectSchema = new Schema({
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  name: { type: String },
  description: { type: String },
  capacity: { type: Number },
  photos: [
    {
      url: { type: String },
      remarks: { type: String },
    },
  ],
  location: {
    lat: { type: String },
    long: { type: String },
  },
  cost: { type: String },
  expenditure: { type: String },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});

const UtilizationReportSchema = new Schema(
  {
    stateName: { type: String, required: true },
    name: { type: String },
    designation: { type: String },
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    grantType: { type: String, required: true },
    grantPosition: {
      unUtilizedPrevYr: { type: Number },
      receivedDuringYr: { type: Number },
      expDuringYr: {
        type: Number,
      },
      closingBal: { type: String },
    },
    projects: { type: [UtilizationReportProjectSchema], default: [] },
    // asked year from ulb
    financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    status: {
      type: String,
      enum: ["APPROVED", "REJECTED", "CANCELLED"],
      default: "NA",
    },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    remarks: { type: String },
    history: { type: Array, default: [] },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    isDraft: { type: Boolean, default: 0 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

UtilizationReportSchema.index(
  { ulb: 1, financialYear: 1, designYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("UtilizationReport", UtilizationReportSchema);
