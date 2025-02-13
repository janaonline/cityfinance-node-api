require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const gtcGratntedSchema = new Schema(
  {
    year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    state: { type: Schema.Types.ObjectId, ref: "State", required: true },

    type: { type: String, enum: ["MPC", "NMPC-Tied", "NMPC-Untied"] },

    installment: {
      type: Number,
      enum: [1, 2],
    },
    url: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
      modifiedAt : { type: Date, default : Date.now() },
    createdAt : { type: Date, default : Date.now() },

  },
   

  {timestamp : {createdAt : "createdAt", updatedAt : "modifiedAt"}}
);

module.exports = mongoose.model("gtcGranted", gtcGratntedSchema);