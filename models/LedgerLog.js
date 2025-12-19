const mongoose = require("mongoose");
const { Schema } = mongoose;

const MarketReadinessScoreSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      default: "v1",
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
    sectionScores: [
      {
        section: String,
        score: Number,
        maxScore: Number,
      },
    ],
    overallScore: {
      type: Number,
    },
    overallMaxScore: {
      type: Number,
    },
    marketReadinessBand: {
      type: String,
    },
  },
  { _id: false } // 👈 prevents extra _id
);
const LedgerLogSchema = mongoose.Schema({
  state_code: {
    type: String,
    required: [true, '"State code" is required'],
  },
  state: {
    type: String,
    required: true,
  },
  ulb: {
    type: String,
    required: true,
  },
  // data for ulb_id, financialYear and design_year is never updated in DB.
  ulb_id: {
    type: Schema.Types.ObjectId,
    ref: "Ulb",
    default: null,
    required: true,
  },
  financialYear: {
    type: String,
    default: null,
  },
  design_year: {
    type: Schema.Types.ObjectId,
    ref: "Year",
    default: null,
  },
  ulb_code: {
    type: String,
    required: true,
  },
  ulb_code_year: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  // wards, population, area is not needed in LedgerLog? Taken from ulbs collection
  wards: {
    type: Number,
  },
  population: {
    type: Number,
    required: true,
  },
  area: {
    type: Number,
  },
  audit_status: {
    type: String,
    enum: {
      values: ["Audited", "Unaudited"],
      message: 'Audit status must be either "Audited" or "Unaudited"',
    },
    required: [true, "Audit status is required"],
  },
  audit_firm: {
    type: String,
  },
  audit_date: {
    type: Date,
  },
  partner_name: {
    type: String,
  },
  icai_membership_number: {
    type: String,
  },
  doc_source: {
    type: String,
    enum: {
      values: ["XV FC", "XVI FC", "Other"],
      message: 'Document source must be either "XV FC" or "XVI FC" or "Other"',
    },
    required: [true, "Document source is required"],
  },
  created_at: {
    type: String,
    required: [true, '"Date of Entry" is required'],
  },
  created_by: {
    type: String,
    required: [true, '"Entered by" is required'],
  },
  verified_at: {
    type: String,
    required: [true, '"Date of verification" is required'],
  },
  verified_by: {
    type: String,
    required: [true, '"Verified by" is required'],
  },
  // reverified_at and reverified_by to be removed.
  reverified_at: {
    type: String,
    required: [true, '"Date of Re-verification" is required'],
  },
  reverified_by: {
    type: String,
    required: [true, '"Re-verified by" is required'],
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now(),
  },
  isStandardizable: {
    type: String,
    enum: { values: ["Yes", "No"], message: 'Enter "Yes" or "No"' },
    required: [true, '"Can the file be standardised?" is required'],
  },
  isStandardizableComment: {
    type: String,
  },
  dataFlag: {
    type: String,
    required: [true, '"Count of Data Flags failed" cannot be empty'],
  },
  dataFlagComment: {
    type: String,
  },
  tracker: [
    {
      audit_status: {
        type: String,
        enum: {
          values: ["Audited", "Unaudited"],
          message: 'Audit status must be either "Audited" or "Unaudited"',
        },
        required: [true, "Tracker - Audit status is required"],
      },
      lastModifiedAt: {
        type: Date,
        default: Date.now(),
      },
      isStandardizable: {
        type: String,
        enum: { values: ["Yes", "No"], message: 'Enter "Yes" or "No"' },
        required: [
          true,
          'Tracker - "Can the file be standardised?" is required',
        ],
      },
      isStandardizableComment: {
        type: String,
      },
      dataFlag: {
        type: String,
      },
      doc_source: {
        type: String,
        enum: {
          values: ["XV FC", "XVI FC", "Other"],
          message:
            'Document source must be either "XV FC" or "XVI FC" or "Other"',
        },
        required: [true, "Document source is required"],
      },
    },
  ],
  lineItems: {
    type: Map,
    of: Number,
  },
  indicators: {
    type: Map,
    of: Schema.Types.Mixed, // Allows any type of value
  },
  marketReadinessScore: {
    type: MarketReadinessScoreSchema,
    default: null,
  },
});

LedgerLogSchema.index(
  {
    ulb_id: 1,
    year: 1,
    isStandardizable: 1,
    lineItems: 1,
    ulb_code_year: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("LedgerLog", LedgerLogSchema);
