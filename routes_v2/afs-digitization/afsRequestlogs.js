const mongoose = require("mongoose");

// Direct Secondary DB Connection

const MONGODB_CONNECTION_STRING = process.env.CONNECTION_STRING_2;
const MONGODB_DATABASE_NAME = process.env.DATABASE_NAME;
const MONGODB_COLLECTION_NAME = process.env.COLLECTION_NAME;

// Create second DB connection explicitly
const secondDB = mongoose.createConnection(MONGODB_CONNECTION_STRING, {
  dbName: MONGODB_DATABASE_NAME,
});

// Flexible schema (accept all fields)
const RequestLogSchema = new mongoose.Schema({}, { strict: false });

// Model for request logs in second DB
const RequestLog = secondDB.model(
  MONGODB_COLLECTION_NAME, // model name
  RequestLogSchema,
  MONGODB_COLLECTION_NAME // collection name
);

module.exports.fetchRequestLogs = async (req, res) => {
  try {
    // Support requestId from body (POST) or params (GET)
    // const requestId = req.body.requestId || req.params.requestId;
    const requestId = req.body.requestId || req.params.requestId || req.query.requestId;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Missing parameter: requestId is required",
      });
    }

    // Fetch logs by RequestId
    const logs = await RequestLog.find({ RequestId: requestId }).lean();

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No logs found for RequestId: ${requestId}`,
      });
    }

    return res.json({
      success: true,
      requestId,
      logCount: logs.length,
      logs,
    });
  } catch (err) {
    console.error("Fetch Logs Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
