require("./dbConnect");
const moment = require("moment");

const pdfSchema = () =>{
  return {
    url:{type: String},
    name: {type: String}
  }
}

const UtilizationReportProjectSchema = new Schema({
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
  },
  name: { type: String },
  // description: { type: String },
  // capacity: { type: String },
  // photos: [
  //   {
  //     url: { type: String },
  //     remarks: { type: String },
  //   },
  // ],
  location: {
    lat: { type: String },
    long: { type: String },
  },
  cost: { type: Number, default: 0 },
  expenditure: { type: Number, default: 0 },
  // engineerName: { type: String },
  // engineerContact: { type: String },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});
const CategoryWiseDataSchema = new Schema({
  category_name: { type: String, default:'' },
  grantUtilised: { type: String , default:''},
  numberOfProjects: { type: String, default:'' },
  totalProjectCost: { type: String, default:'' }
});

const UtilizationReportSchema = new Schema(
  {
    name: { type: String },
    designation: { type: String },
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    grantType: { type: String, required: true, enum: ["Tied", "Untied"] },
    grantPosition: {
      unUtilizedPrevYr: { type: Number, default: 0 },
      receivedDuringYr: { type: Number, default: 0 },
      expDuringYr: {
        type: Number, default: 0
      },
      closingBal: { type: String, default:0 },
    },
    projects: { type: [UtilizationReportProjectSchema] },
    categoryWiseData_swm: { type: [CategoryWiseDataSchema], default: [
      {
        category_name: "Sanitation",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },
    {
        category_name: "Solid Waste Management",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },
    ] },
    categoryWiseData_wm: { type: [CategoryWiseDataSchema], default: [
      {
        category_name: "Rejuvenation of Water Bodies",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },
    {
        category_name: "Drinking Water",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },
    {
        category_name: "Rainwater Harvesting",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },
    {
        category_name: "Water Recycling",
        grantUtilised: null,
        numberOfProjects: null,
        totalProjectCost: null,
    },

    ] },
    // asked year from ulb
    financialYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    designYear: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    actionTakenByRole: {
      type: String,
      default: null,
    },
    rejectReason: { type: String, default: "" },
    responseFile: pdfSchema(),
    history: { type: Array, default: [] },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    isDraft: { type: Boolean, default: true },
    declaration:{ type: Boolean, default: 0 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

UtilizationReportSchema.index(
  { ulb: 1, financialYear: 1, designYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("UtilizationReport", UtilizationReportSchema);
