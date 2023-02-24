require("./dbConnect");
const CategoryFileUpload = new Schema(
    {
        categoryId: { type: Schema.Types.ObjectId, ref: "MainCategory", required: true },
        subCategoryId: { type: Schema.Types.ObjectId, ref: "SubCategory", required: true },
        title: { type: String, required: true },
        file: {
            url: { type: String, require: true },
            name: { type: String, require: true }
        },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("CategoryFileUpload", CategoryFileUpload);