const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function requireDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        "Database not connected. Set MONGO_URI or MONGODB_URI in backend environment variables.",
    });
  }
  next();
}

module.exports = { requireDB };
