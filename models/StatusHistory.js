require("./dbConnect");
const { Schema } = mongoose;

const StatusHistorySchema = new Schema(
  {
    formId: { type: Number },
    recordId: {
        type: Schema.Types.ObjectId,
    },
    shortKey: {type: String},
    data:{
        type: Array,
        default: []
    },
    modifiedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
// StatusHistorySchema.index({recordId:1}, {unique: true})
module.exports = mongoose.model("StatusHistory", StatusHistorySchema);
