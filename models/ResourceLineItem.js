require("./dbConnect");
var ResourceLineItemSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    header: {
      type: String,
      enum: ["learning_center", "datasets", "reports&publications"],
      required: true,
      index: true,
    },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

ResourceLineItemSchema.index(
  {
    code: 1,
    isActive: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("ResourceLineItem", ResourceLineItemSchema);
