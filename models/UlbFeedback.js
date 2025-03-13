require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UlbFeedbackSchema = new Schema(
  {
    ulb: {
      type: mongoose.Types.ObjectId,
      ref: 'Ulb',
      required: [true, "ulb is required"],
      index: true
    },
    design_year: {
      type: mongoose.Types.ObjectId,
      ref: "Year",
      required: [true, "design year is required"]

    },
    rating: { type: Number, trim: true, required: true, index: true },
    answerBenifit: { type: String, trim: true, required: true, },
    answerImprove: { type: String, trim: true, required: true, },

  },
  { timestamps: true }
);

module.exports = mongoose.model('UlbFeedback', UlbFeedbackSchema);
