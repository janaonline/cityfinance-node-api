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
    designYear: {
      type: mongoose.Types.ObjectId,
      ref: "Year",
      required: [true, "design year is required"]
    },
    rating: { type: Number, trim: true, required: true, index: true },
    benifitFromCf: { type: String, trim: true, required: true, },
    improveCf: { type: String, trim: true, required: true, },
    currentFormStatus: { type: Number, required: true, default: -1 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UlbFeedback', UlbFeedbackSchema);