require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const RequestDemoUserInfoSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
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
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    usingCfFor: {
      type: String,
      required: true,
      trim: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RequestDemoUserInfo', RequestDemoUserInfoSchema);
