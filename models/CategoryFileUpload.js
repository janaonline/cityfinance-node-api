const mongoose = require("mongoose");
const SubCategory = require("./Master/SubCategory");
const { Schema } = mongoose;
const ObjectId = require("mongoose").Types.ObjectId;

require("./dbConnect");
const CategoryFileUpload = new Schema(
    {
        categoryId: { type: Schema.Types.ObjectId, ref: "MainCategory", required: true },
        subCategoryId: {
            type: Schema.Types.ObjectId,
            ref: "SubCategory", required: true,
        },
        title: { type: String, required: true },
        file: {
            url: { type: String, require: true },
            name: { type: String, require: true }
        },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
        module: {
            required: true,
            type: String,
            enum: ['municipal_bond_repository', 'state_resource']
        },
        relatedIds: {
            type: [mongoose.Schema.Types.ObjectId],
            default: []
        }
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);

CategoryFileUpload.pre('updateOne', { document: true, query: true }, async function(next) {
    try {
        const { subCategoryId, relatedIds } = this._update;

        const category = await SubCategory.findById(subCategoryId);
        const maxUploads = category?.maxUploads;

        if (!maxUploads) {
            return next(); // Proceed to the next middleware
        }

        const currentCount = await mongoose.model('CategoryFileUpload').countDocuments({
            subCategoryId: ObjectId(subCategoryId),
            relatedIds: { $in: relatedIds.map(item => ObjectId(item?._id)) }
        });

        if (currentCount >= maxUploads * relatedIds?.length) {
            return next(new Error('Maximum upload limit exceeded for this subcategory.'));
        }

        next(); // Proceed to the next middleware
    } catch (error) {
        next(error); // Pass any errors to the next middleware
    }
});


module.exports = mongoose.model("CategoryFileUpload", CategoryFileUpload);