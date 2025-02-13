require("./dbConnect");
var searchKeyword = new Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: {
        values: ["LANDING", "RESOURCE"],
      },
      default: "LANDING",
      required: true,
    },
    link: { type: String, required: true },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

searchKeyword.index(
  {
    name: 1,
    isActive: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("searchKeyword", searchKeyword);
