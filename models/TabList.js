require("./dbConnect");
const TabsSchema = new Schema({
    design_year: { type: Schema.Types.ObjectId, ref: "Year", required: true },
    mohuaUrl:{type:String,default:""},
    stateUrl:{type:String,default:""},
    ulbUrl:{type:String,default:""},
    profileUrl:{type:String,default:""}
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'modifiedAt' } }
  );
  TabsSchema.index(
    { design_year: 1 },
    { unique: true }
);
  module.exports = mongoose.model("tabslist", TabsSchema);
  