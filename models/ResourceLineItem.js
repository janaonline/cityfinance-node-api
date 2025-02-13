require("./dbConnect");
var ResourceLineItemSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String },
    downloadUrl: { type: String },
    imageUrl: { type: String, default: "" },
    header: {
      type: String,
      enum: ["learning_center", "datasets", "reports_&_publications"],
      required: true,
      index: true,
    },
    type: { type: String },
    description: { type: String },
    tags: [{type:String}],
    subHeader: {
      type: String,
      enum: [
        "toolkit",
        "blog",
        "best_practices",
        "videos",
        "e-learning_modules",
        "podcasts",
      ],
    },
    toolKitVisible: {
      type: String,
      enum: [
        "assessment",
        "billing_and_collection",
        "enumeration",
        "reporting",
      ],
    },
    publishedYear: { type: String },
    ulb: { type: Schema.Types.ObjectId, ref: "ulb", default: null },
    state: { type: Schema.Types.ObjectId, ref: "state", default: null },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

ResourceLineItemSchema.index({
  name: 1,
  header: 1,
  subHeader: 1,
  toolKitVisible: 1,
  isActive: 1,
});
module.exports = mongoose.model("ResourceLineItem", ResourceLineItemSchema);
