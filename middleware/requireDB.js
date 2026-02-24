const mongoose = require("mongoose");

function requireDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database not connected. Set MONGO_URI in server/.env (e.g. mongodb://localhost:27017/devcollab or MongoDB Atlas).",
    });
  }
  next();
}

module.exports = { requireDB };
