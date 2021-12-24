require("./dbConnect");
var recentSearchKeyword = new Schema(
  {
    ulb: { type: Schema.Types.ObjectId, ref: "Ulb" },
    type: {
      type: String,
      enum: {
        values: ["STATE", "ULB", "SEARCHKEYWORD"],
      },
    },
    name: { type: String },
    state: { type: Schema.Types.ObjectId, ref: "state" },
    searchKeyword: { type: Schema.Types.ObjectId, ref: "searchKeyword" },
    count: { type: Number, required: true, default: 1 },
    modifiedAt: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
    isActive: { type: Boolean, default: 1 },
  },
  { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

recentSearchKeyword.index(
  {
    ulb: 1,
    state: 1,
    searchKeyword: 1,
    isActive: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("recentSearchKeyword", recentSearchKeyword);
