const mongoose = require("mongoose");

const MONGODB_CONNECTION_STRING = process.env.CONNECTION_STRING_2;
const MONGODB_DATABASE_NAME = process.env.DATABASE_NAME;
const MONGODB_COLLECTION_NAME = process.env.COLLECTION_NAME;

let secondDB;
let RequestLog;

function getRequestLogModel() {
  if (!MONGODB_CONNECTION_STRING || !MONGODB_DATABASE_NAME || !MONGODB_COLLECTION_NAME) {
    return null;
  }

  if (RequestLog) {
    return RequestLog;
  }

  secondDB = mongoose.createConnection(MONGODB_CONNECTION_STRING, {
    dbName: MONGODB_DATABASE_NAME,
  });

  const RequestLogSchema = new mongoose.Schema({}, { strict: false });

  RequestLog = secondDB.model(
    MONGODB_COLLECTION_NAME,
    RequestLogSchema,
    MONGODB_COLLECTION_NAME
  );

  return RequestLog;
}

module.exports.fetchRequestLogs = async (req, res) => {
  try {
    const requestLogModel = getRequestLogModel();

    if (!requestLogModel) {
      return res.status(500).json({
        success: false,
        message:
          "AFS request log database is not configured. Set CONNECTION_STRING_2, DATABASE_NAME, and COLLECTION_NAME.",
      });
    }

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
    const logs = await requestLogModel.find({ RequestId: requestId }).lean();

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
