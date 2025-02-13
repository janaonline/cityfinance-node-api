require("./dbConnect");
const AmrutProjectsSchema = new Schema({
  name: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  cost: { type: Number, default: 0 },
  code: { type: String },
  ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
  designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  stateShare: { type: Number, default: 0 },
  capitalExpenditureState: { type: Number, default: 0 },
  capitalExpenditureUlb: { type: Number, default: 0 },
  capitalExpenditureCentralAssist: { type: Number, default: 0 },
  CentralAssistCost: { type: Number, default: 0 },
  omExpensesState: { type: Number, default: 0 },
  omExpensesUlb: { type: Number, default: 0 },
  omExpensesCentralAssist: { type: Number, default: 0 },
  ulbShare: { type: Number, default: 0 },
  location: {
    lat: { type: String, default: "" },
    lng: { type: String, default: "" },
  },
  startDate: { type: Date },
  endDate: { type: Date, },
  dprPrepared: {
    type: String,
    enum: {
      values: ["Yes", "No"],
      message: "ERROR: Is DPR prepared CAN BE EITHER 'Yes' or 'No' ",
    },
  },
  dprPrepDate: { type: Date },
  dprDocument: {
    type: {
      name: { type: String },
      url: { type: String }
    }
  },
  isActive: { type: Boolean, default: 1 },
},
  { timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
);

module.exports = mongoose.model("Amrutproject", AmrutProjectsSchema);