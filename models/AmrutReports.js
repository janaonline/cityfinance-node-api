require("./dbConnect");
const AmrutProjectsSchema = new Schema({
    name: { type: String },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    cost: { type: Number, default: 0 },
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    stateShare:{type:Number,default:0},
    capitalExpenditureState:{type:Number,default:0},
    capitalExpenditureUlb:{type:Number,default:0},
    omExpensesState:{type:Number,default:0},
    omExpensesUlb:{type:Number,default:0},
    startDate: { type: Date},
    endDate: { type: Date, },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
  );
  module.exports = mongoose.model("Amrutproject", AmrutProjectsSchema);
  