require('./dbConnect');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const FileDownloadLogSchema = new Schema(
  {
    userName: {
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
    module: {
      type: String,
      required: true,
      enum: {
        values: ['cfr', 'resources'],
        message: '{VALUE} is not Supported.',
      },
      index: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    fileDownloaded: [{
      fileName: {
        type: String,
        required: true,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now
      }
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('FileDownloadLog', FileDownloadLogSchema);
