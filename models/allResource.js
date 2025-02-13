require("./dbConnect");
const resourceSchema = mongoose.Schema({
  ulb: { type: Schema.Types.ObjectId, ref: "Ulb", index: true },
  state: { type: Schema.Types.ObjectId, ref: "State", index: true },
  resourceLineItem: {
    type: Schema.Types.ObjectId,
    ref: "ResourceLineItem",
    index: true,
  },
  name: { type: String, require: true },
  url: { type: String, require: true },
  linkedWith: { type: String, require: true },
  desc: { type: String },
  modifiedAt: { type: Date, default: Date.now() },
  createdAt: { type: Date, default: Date.now() },
  isActive: { type: Boolean, default: 1 },
});

resourceSchema.index(
  {
    ulb: 1,
    state: 1,
    resourceLineItem: 1,
  },
  {
    unique: true,
  }
);
module.exports = mongoose.model("allResource", resourceSchema);
