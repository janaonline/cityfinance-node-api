require("../dbConnect");
const MainCategorySchema = new Schema(
    {
        name: { type: String, required: true },
        typeOfCategory: {
            type: String,
            enum: {
                values: ["municipal_bond_repository"],
                message: "ERROR: type of category can be either municipal_bond_repository"
            }
        },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { strict: false, timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("MainCategory", MainCategorySchema);