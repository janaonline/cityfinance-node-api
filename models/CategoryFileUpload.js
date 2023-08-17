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
            validate: {
                async validator(id) {
                    console.log('id', id);
                    const category = await SubCategory.findById(id);
                    const maxUploads = category?.maxUploads;
                    if(!maxUploads) return true;
                    const currentCount = await mongoose.model('CategoryFileUpload').countDocuments({ subCategoryId: ObjectId(id)});
                    return currentCount < maxUploads;
                },
                message: 'Exceeding maximum limit'
            }
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
module.exports = mongoose.model("CategoryFileUpload", CategoryFileUpload);