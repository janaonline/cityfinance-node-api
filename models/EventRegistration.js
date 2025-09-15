require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventRegistrationssSchema = new Schema(
  {
    eventCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // TODO: uncomment once events collection is added.
    // eventId: {
    //   type: Schema.Types.ObjectId,
    //   ref: 'EventForm',
    //   required: true,
    //   index: true,
    // },
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
    },
    hasAttended: {
      type: Boolean,
      index: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EventRegistration', EventRegistrationssSchema);
