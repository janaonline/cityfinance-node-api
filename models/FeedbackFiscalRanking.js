require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
    return {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING",null],
        default: null,
    };
  };

const feedbackSchema = new Schema({
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    status : statusType(),
    comments:{type:String,default:""}
})

module.exports = mongoose.model("FeedbackFiscalRanking",feedbackSchema)