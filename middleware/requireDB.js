const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function requireDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  if (mongoose.connection.readyState !== 1) {
    const reason =
      typeof connectDB.getLastError === "function" ? connectDB.getLastError() : "";
    return res.status(503).json({
      message:
        "Database not connected. Set MONGO_URI or MONGODB_URI in backend environment variables.",
      reason: reason || "Connection unavailable",
    });
  }
  next();
}

module.exports = { requireDB };
