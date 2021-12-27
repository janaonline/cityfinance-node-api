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
        mainContent: [
          {
            about: {
              type: String,
            },
            btnLabels: [{ type: String }],
            aggregateInfo: { type: String },
            static: {
              indicators: [
                {
                  name: { type: String },
                  desc: [
                    {
                      text: { type: String },
                      links: [
                        { label: { type: String }, url: { type: String } },
                      ],
                    },
                  ],
                },
              ],
            },
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
