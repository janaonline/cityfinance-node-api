const mongoose = require('mongoose');
const {Schema} = mongoose;

const FormsMasterCategorySchema = new Schema({
    name: { type: String, required: true },
    modifiedAt: { type: Date, },
    createdAt: { type: Date,  },
    isActive: { type: Boolean, default: true },
},
{ timestamps: {createdAt: "createdAt", updatedAt: "modifiedAt"}}
);

module.exports = mongoose.model('FormsMasterCategory', FormsMasterCategorySchema);