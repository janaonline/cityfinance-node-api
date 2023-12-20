require("../models/dbConnect");
const StateResourceSchema = new Schema(
    {
        name: { type: String, required: true },
        type: { type: String, required: true },
        file: {
            name: { type: String, required: true }, 
            url: { type: String, required: true }
        },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("StateResource", StateResourceSchema);