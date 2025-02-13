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
    lat: { type: String ,default:""},
    long: { type: String ,default:""},
  },
  cost: { type: Number, default: 0 },
  expenditure: { type: Number, default: 0 },
  stateShare:{type:Number,default:0},
  capitalExpenditureState:{type:Number,default:0},
  capitalExpenditureUlb:{type:Number,default:0},
  omExpensesState:{type:Number,default:0},
  omExpensesUlb:{type:Number,default:0},
  startDate:{type:Date, default: Date.now},
  completionDate:{type:Date, default: Date.now},
  dpr_status: { 
    type: Schema.Types.ObjectId,
    ref: "Option"
  },
  // engineerName: { type: String },
  // engineerContact: { type: String },
  modifiedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: 1 },
});
const CategoryWiseDataSchema = new Schema({
  category_name: { type: String, default:'' },
  grantUtilised: { type: Number , default: null},
  numberOfProjects: { type: Number, default: null },
  totalProjectCost: { type: Number, default: null }
});

const UtilizationReportSchema = new Schema(
  {
    name: { type: String },
    designation: { type: String },
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    grantType: { type: String, default:"Tied" ,required: true, enum: ["Tied", "Untied"] },
    grantPosition: {
      unUtilizedPrevYr: { type: Number, default: null },
      receivedDuringYr: { type: Number, default: null },
      expDuringYr: {
        type: Number, default: null
      },
      closingBal: { type: Number, default:0 },
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
      enum: ["PENDING", "APPROVED", "REJECTED",""],
      default: "PENDING",
    },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    ulbSubmit: { type: Date},
    actionTakenByRole: {
      type: String,
      default: null,
    },
    rejectReason: { type: String, default: "" },
    responseFile_state:pdfSchema(),
    responseFile_mohua:pdfSchema(),
    rejectReason_state:{ type: String, default: "" },
    rejectReason_mohua: { type: String, default: "" },
    responseFile: pdfSchema(),
    history: { type: Array, default: [] },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    isDraft: { type: Boolean, default: true },
    declaration:{ type: Boolean, default: 0 },
    currentFormStatus:{
      type: Number,
      required: false
    }
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

UtilizationReportSchema.index(
  { ulb: 1, financialYear: 1, designYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("UtilizationReport", UtilizationReportSchema);
