require("./dbConnect");
const { Schema } = mongoose;

const HeadersSchema = new Schema(
  {
    name: { type: String, required: true },
    dashboard: {
      type: Schema.Types.ObjectId,
      ref: "DashboardMaster",
      required: true,
      unique: true,
    },
    subHeaders: [
      {
        name: { type: String },
        static: {
          aboutIndicator: { type: {}, min: 20, max: 2000000 },
          calculation: { type: {}, min: 20, max: 2000000 },
          performance: { type: {}, min: 20, max: 2000000 },
          analysis: { type: {}, min: 20, max: 2000000 },
          nextStep: { type: {}, min: 20, max: 2000000 },
        },
        filter: [
          {
            name: { type: String },
          },
        ],
      },
    ],
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("Headers", HeadersSchema);
