require("../dbConnect");
const SubCategorySchema = new Schema(
    {
        name: { type: String, required: true },
        categoryId: { type: Schema.Types.ObjectId, ref: "MainCategory", required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("SubCategory", SubCategorySchema);