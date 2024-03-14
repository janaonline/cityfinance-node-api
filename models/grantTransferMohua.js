require("./dbConnect");

const stateSchema = () => {
  return {
    name: { type: String },
    year: { type: Schema.Types.ObjectId, ref: "Year" },
    installment: {
      type: Number,
      enum: {
        values: [1, 2],
      },
    },
    GrantType: {
      type: Schema.Types.ObjectId,
      ref: "granttypes",
    },
    noOfUlb: {
      type: Number,
    },
    submissionDate: {
      type: Date,
      default: null,
    },
    recommendationDate: {
      type: Date,
      default: null,
    },
    releaseDate: {
      type: Date,
      default: null,
    },
    amountReleased: {
      type: Number,
      default: null,
    },
    amountAssigned: {
      type: Number,
      default: null,
    },
    _id: false,
  };
};

const grantTransferMohuaSchema = mongoose.Schema({
  design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  stateData: [stateSchema()],
  actionTakenBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  state: {
    type: Schema.Types.ObjectId,
    ref: "State",
    index: true,
    required: true,
  },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});

grantTransferMohuaSchema.index(
  {
    design_year: 1,
    state: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("grantTransferMohua", grantTransferMohuaSchema);
