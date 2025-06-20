require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

// File schema for clarity and reuse
const fileSchema = new Schema(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    source: { type: String, required: [true, "Source is required"] },
  },
  { _id: false }
);

// Main budget documents schema
const budgetDocumentsSchema = new Schema(
  {
    ulb: {
      type: mongoose.Types.ObjectId,
      ref: "Ulb",
      required: [true, "ULB ID is required"],
      index: true,
      unique: true,
    },
    yearsData: [
      {
        designYearId: {
          type: mongoose.Types.ObjectId,
          ref: "Year",
          required: [true, "Design year is required"],
        },
        designYear: {
          type: String,
          required: true,
        },
        sequence: {
          type: Number,
          required: true,
        },
        currentFormStatus: {
          type: Number,
          required: true,
          default: 1,
        },
        files: [fileSchema],

        uploadedBy: {
          type: mongoose.Types.ObjectId,
          ref: "user",
          default: null,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("BudgetDocument", budgetDocumentsSchema);
