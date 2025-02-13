require('./dbConnect');
const LoggerSchema = new Schema({
    url: { type: String, required: [true, "Url is required"] },
    statusCode: { type: Number, required: true },
    userRole: { type: String },
    reqMethod: { type: String },
    currentUrl: { type: String, required: true },
    token: { type: String, default: null },
    completed: { type: Boolean, default: null },
    respTime: { type: Number, default: null },
    reqBody: {
        body: {},
        params: {},
        query: {},
        _id: false,
    },
    responseSent: {
        body: {},
        _id: false,
    },
    modifiedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
}, { timestamp: { createdAt: "createdAt", updatedAt: "modifiedAt" } });
module.exports = mongoose.model("RequestLogger", LoggerSchema);
