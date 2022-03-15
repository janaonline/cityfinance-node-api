require("./dbConnect");
var ResourceLineItemSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    downloadUrl: { type: String, unique: true },
    imageUrl: { type: String, default: "" },
    header: {
      type: String,
      enum: ["learning center", "datasets", "reports & publications"],
      required: true,
      index: true,
    },
    type: { type: String },
    description: { type: String },
    subHeader: {
      type: String,
      enum: [
        "toolkit",
        "blog",
        "best practices",
        "videos",
        "e-learning modules",
        "podcasts",
      ],
    },
    inType: { type: String },
    ulb: { type: Schema.Types.ObjectId, ref: "ulb", default: null },
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
