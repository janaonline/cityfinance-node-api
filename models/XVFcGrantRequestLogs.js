require("./dbConnect");
const XVFcGrantRequestLogsSchema = mongoose.Schema({
  ulb: { type: Schema.Types.ObjectId, ref: "Ulb", index: true, required: true },
  financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  logs: { type: Array, default: [] },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});

XVFcGrantRequestLogsSchema.index(
  {
    ulb: 1,
    financialYear: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model(
  "XVFcGrantRequestLogs",
  XVFcGrantRequestLogsSchema
);
