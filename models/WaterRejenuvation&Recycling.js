require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "PENDING", ""],
    default: "PENDING",
  };
};

const projectDetails = () => {
  return {
    name: {
      type: String,
    },
    area: {
      type: Number,
    },
    nameOfBody: {
      type: String,
    },
    lat: {
      type: String,
    },
    long: {
      type: String,
    },
    photos: [
      {
        url: {
          type: String,
        },
        name: {
          type: String,
        },
        _id: false,
      },
    ],
    bod: {
      type: Number,
    },
    cod: {
      type: Number,
    },
    do: {
      type: Number,
    },
    tds: {
      type: Number,
    },
    turbidity: {
      type: Number,
    },
    bod_expected: {
      type: Number,
    },
    cod_expected: {
      type: Number,
    },
    do_expected: {
      type: Number,
    },
    tds_expected: {
      type: Number,
    },
    turbidity_expected: {
      type: Number,
    },
    details: {
      type: String,
    },
    _id: false,
    dprCompletion:{
      type: String,
      enum: ["Yes", "No","",null]
    },
    dprPreparation:{
      type: String,
      enum: ["Yes", "No","",null]
    },
    workCompletion: {
      type: Number
    },
    isDisable:{
      type: Boolean
    },
  };
};

const pdfSchema = ()=>{
  return {
    url: { type: String},
    name: { type: String}
  }
}
const projectDetails2 = () => {
  return {
    name: {
      type: String,
    },
    treatmentPlant: {
      type: Number,
    },
    lat: {
      type: String,
    },
    long: {
      type: String,
    },
    stp: {
      type: Number,
    },
    targetCust: {
      type: String,
    },
    _id: false,
    dprCompletion:{
      type: String,
      enum: ["Yes", "No","",null]
    },
    dprPreparation:{
      type: String,
      enum: ["Yes", "No","",null]
    },
    workCompletion: {
      type: Number
    },
    isDisable:{
      type: Boolean
    }
  };
};
const projectDetails3 = () => {

  return {
    name: {
      type: String,
    },
    component: {
      type: String,
    },
    indicator: {
      type: String,
    },
    existing: {
      type: Number,
    },
    after: {
      type: Number,
    },
    cost: {
      type: Number,
    },
    _id: false,
    dprCompletion:{
      type: String,
      enum: ["Yes", "No","", null]
    },
    dprPreparation:{
      type: String,
      enum: ["Yes", "No","", null]
    },
    workCompletion: {
      type: Number,
      max: [100, "Max % can be 100"]
    },
    isDisable:{
      type: Boolean
    },
    bypassValidation:{
      type: Boolean
    }
  };
};

const WaterRejenuvationRecyclingPlansSchema = mongoose.Schema({
  state: {
    type: Schema.Types.ObjectId,
    ref: "State",
    index: true,
    required: true,
  },
  design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  uaData: [
    {
      ua: { type: Schema.Types.ObjectId, ref: "UA", required: true },
      waterBodies: [projectDetails()],
      reuseWater: [projectDetails2()],
      serviceLevelIndicators: [projectDetails3()],
      rejectReason: {
        type: String,
      },
      status: statusType(),
      _id: false,
      responseFile: pdfSchema(),

    },
  ],
  status: statusType(),
  isDraft: { type: Boolean, default: 0 },
  history: { type: Array, default: [] },
  actionTakenBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
  declaration: {
    url: { type: String },
    name: { type: String },
  },
  actionTakenByRole: {
    type: String,
    enum: ["ULB", "MoHUA", "STATE"],
    required: true,
  },
  currentFormStatus: {
    type: Number
  }
});

WaterRejenuvationRecyclingPlansSchema.index(
  {
    design_year: 1,
    state: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model(
  "WaterRejenuvationRecycling",
  WaterRejenuvationRecyclingPlansSchema
);
