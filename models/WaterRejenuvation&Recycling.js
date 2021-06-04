require("./dbConnect");

const statusType = () => {
  return {
    type: String,
    enum: ["APPROVED", "REJECTED", "NA"],
    default: "NA",
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
    location: {
      lat: {
        type: String,
      },
      long: {
        type: String,
      },
    },
    photos: [
      {
        url: {
          type: String,
        },
        name: {
          type: String,
        },
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
    details: {
      type: String,
    },
  };
};

const projectDetails2 = () => {
  return {
    name: {
      type: String,
    },
    treatmentPlant: {
      type: String,
    },
    location: {
      lat: {
        type: String,
      },
      long: {
        type: String,
      },
    },
    stp: {
      type: Number,
    },
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
      rejectReason: {
        type: String,
      },
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
});

WaterRejenuvationRecyclingPlansSchema.index(
  {
    designYear: 1,
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
