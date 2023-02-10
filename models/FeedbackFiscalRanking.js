require("./dbConnect");
const mongoose = require("mongoose");
const { Schema } = mongoose;

const statusType = () => {
    return {
        type: String,
        enum: ["APPROVED", "REJECTED",null,"NA"],
        default: null,
    };
  };

const feedbackSchema = new Schema({
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb", required: true },
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    fiscal_ranking: { type: Schema.Types.ObjectId, ref: "FiscalRanking", required: true },
    status : statusType(),
    tab :{
        type:Schema.Types.ObjectId,
        ref:"tabsFiscalRankings"
    },
    comment:{type:String,default:""}
})

module.exports = mongoose.model("FeedbackFiscalRanking",feedbackSchema)