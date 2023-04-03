require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
  return {
    type: String,
    enum: {
      values: ["PENDING", "APPROVED", "REJECTED","N/A", null],
      message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
    },
  };
};

const pdfSchema = ()=>{
  return {
    url: { type: String},
    name: { type: String}
  }
}

const ContentSchema = new Schema({
  pdf: { url: { type: String }, name: { type: String } },
  excel: { url: { type: String }, name: { type: String } },
  status: statusType(),
  rejectReason: { type: String, default:"" },
  responseFile: pdfSchema(),
  rejectReason_state: {type: String, default: ""},
  rejectReason_mohua: {type: String, default: ""},
  responseFile_state: pdfSchema(),
  responseFile_mohua: pdfSchema(),
  _id: false,
});

const ContentPDFSchema = new Schema({
  pdf: { url: { type: String }, name: { type: String } },
  status: statusType(),
  rejectReason: { type: String, default:"" },
  responseFile: pdfSchema(),
  rejectReason_state: {type: String, default: ""},
  rejectReason_mohua: {type: String, default: ""},
  responseFile_state: pdfSchema(),
  responseFile_mohua: pdfSchema(),
  _id: false,
});

const provisionalDataSchema = new Schema({
  bal_sheet: { type: ContentSchema },
  assets: {type: Number},
  f_assets: {type: Number},
  s_grant: {type: Number},
  c_grant: {type: Number},
  bal_sheet_schedules: { type: ContentSchema },
  inc_exp: { type: ContentSchema },
  revenue: {type: Number},
  expense: {type: Number},
  inc_exp_schedules: { type: ContentSchema },
  cash_flow: { type: ContentSchema },
  auditor_report: { type: ContentPDFSchema },
  _id: false,
});

const standardizedDataSchema = new Schema({
  excel: { url: { type: String }, name: { type: String } },
  declaration: { type: Boolean, default: null },
  _id: false,
});

const formDataSchema = new Schema({
  provisional_data: { type: provisionalDataSchema },
  standardized_data: { type: standardizedDataSchema },
  status:{
    type:String,
    enum:{
      values:["APPROVED", "REJECTED", "PENDING"],
      message: "ERROR: STATUS CAN BE EITHER 'APPROVED', 'REJECTED', 'PENDING'  ",
    }
  },
  rejectReason: { type: String, default:"" },
  responseFile: pdfSchema(),
  rejectReason_state: {type: String, default: ""},
  rejectReason_mohua: {type: String, default: ""},
  responseFile_state: pdfSchema(),
  responseFile_mohua: pdfSchema(),
  audit_status: {
    type: String,
    enum: {
      values: ["Audited", "Unaudited"],
      message: "ERROR: AUDIT STATUS CAN BE EITHER 'Audited' or 'Unaudited' ",
    },
  },
  submit_annual_accounts: { type: Boolean, default: null },
  submit_standardized_data: { type: Boolean, default: null },
  year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
  _id: false,
});

const AnnualAccountDataSchema = new Schema(
  {
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED", "N/A", ""],
        message: "ERROR: STATUS BE EITHER 'PENDING'/ 'APPROVED' / 'REJECTED'",
      },
    },
    isDraft: { type: Boolean, default: false, required: true },
    history: { type: Array, default: [] },
    audited: { type: formDataSchema },
    unAudited: { type: formDataSchema },
    modifiedAt: { type: Date, default: Date.now() },
    ulbSubmit: {type: Date},
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
    actionTakenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actionTakenByRole: {
      type: String,
      default: null,
    },
    currentFormStatus: {
      type: Number,
    }
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
AnnualAccountDataSchema.index(
  { ulb: 1, design_year: 1},
  { unique: true }
);
module.exports = mongoose.model("AnnualAccountData", AnnualAccountDataSchema);
