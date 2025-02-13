require("./dbConnect");
const { Schema } = mongoose;

const HeadersSchema = new Schema(
  {
    name: { type: String, required: true },
    dashboard: {
      type: Schema.Types.ObjectId,
      ref: "DashboardMaster",
      required: true,
    },
    description:{type:String,default:""},
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
                  total_revenue: [
                    {
                      code: { type: String },
                      text: { type: String },
                      links: [
                        { label: { type: String }, url: { type: String } },
                      ],
                    },
                  ],
                  revenue_per_capita: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  revenue_mix: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  total_own_revenue: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  own_revenue_per_capita: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  "total_surplus/deficit": [
                    { code: { type: String }, text: { type: String } },
                  ],
                  expenditure_mix: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  revenue_expenditure_mix: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  revenue_expenditure: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  capital_expenditure: [
                    { code: { type: String }, text: { type: String } },
                  ],
                  capital_expenditure_per_capita: [
                    { code: { type: String }, text: { type: String } },
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
