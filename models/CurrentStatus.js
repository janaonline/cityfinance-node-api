require("./dbConnect");
const { Schema } = mongoose;

const CurrentStatusSchema = new Schema(
  {
    formId: { type: Number },
    recordId: {
      type: Schema.Types.ObjectId,
    },
    status: {
      type: Number
    },
    level: { type: Number },
    shortKey: { type: String },
    rejectReason: { type: String , },
    responseFile: {
        url: {type: String, default: null},
        name: {type: String, default: null}
    },
    actionTakenByRole:{
        type: String,
        enum:["ULB","MoHUA","STATE"],
        required: true,
    },
    actionTakenBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
CurrentStatusSchema.index({ recordId: 1, shortKey:1, actionTakenByRole:1 }, { unique: true });
module.exports = mongoose.model("CurrentStatus", CurrentStatusSchema);
