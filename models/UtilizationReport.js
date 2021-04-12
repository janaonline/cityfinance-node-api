require("./dbConnect");
const moment = require("moment");

const UtilizationReportProjectSchema = new Schema({
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  name: { type: String },
  description: { type: String },
  capacity: { type: String },
  photographs: [
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
    name: { type: String, required: true },
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    grantType: { type: String, required: true },
    grantPosition: {
      utilizedPrevInstallments: { type: Number },
      receivedDuringYear: { type: Number },
      expenditureIncurredDuringYear: {
        type: Number,
      },
      closingBalanceEndYear: { type: String },
    },
    projects: { type: [UtilizationReportProjectSchema], default: [] },
    // asked year from ulb
    financialYear: { type: String, required: true },
    // on going year
    currentFinancialYear: {
      type: String,
      required: true,
      default: () => {
        return `${moment().format("YYYY")}-${moment()
          .add(1, "y")
          .format("YYYY")}`;
      },
    },
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
  { ulb: 1, financialYear: 1, currentFinancialYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("UtilizationReport", UtilizationReportSchema);
