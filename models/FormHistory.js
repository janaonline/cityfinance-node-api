require("./dbConnect");
const { Schema } = mongoose;

const FormHistorySchema = new Schema(
  {
    formId: { type: Number },
    recordId: {
        type: Schema.Types.ObjectId,
    },
    data:{
        type: Array,
        default: []
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamp: { createdAt: "createdAt" } }
);
FormHistorySchema.index({recordId:1})
module.exports = mongoose.model("FormHistory", FormHistorySchema);
