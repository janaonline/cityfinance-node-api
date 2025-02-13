require("../dbConnect");
const VideoSchema = new Schema(
    {
        link: { type: String, required: true },
        description: { type: String, required: true },
        modifiedAt: { type: Date, default: Date.now() },
        createdAt: { type: Date, default: Date.now() },
        isActive: { type: Boolean, default: 1 },
    },
    { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } }
);
module.exports = mongoose.model("Video", VideoSchema);