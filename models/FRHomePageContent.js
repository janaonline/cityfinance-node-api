require("./dbConnect");
const FRHomePageContentSchema = new Schema(
  {
    imageurl: { type: String },
    url: { type: String },
    title: { type: String, required: true },
    text: { type: String },
    seq: { type: Number, required: true },
    section: { type: String, enum:['Objective','Assessment Parameters',"Salient Features","Ranking Categories","Banner Icon"], required: true },
    modifiedAt: { type: Date, default: Date.now},
    createdAt: { type: Date, default: Date.now},
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("FRHomePageContent", FRHomePageContentSchema);
