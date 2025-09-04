require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventsSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      match: [/.+\@.+\..+/, 'Invalid Email'],
      index: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
      trim: true,
    },
    preSubmitQuestion: {
      type: String,
      trim: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', EventsSchema);
