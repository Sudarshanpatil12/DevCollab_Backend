const mongoose = require("mongoose");

let connectPromise = null;
let warnedInvalidUri = false;
let lastDbError = "";

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "";

  if (
    !uri ||
    uri.includes("YOUR_") ||
    (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))
  ) {
    if (!warnedInvalidUri) {
      warnedInvalidUri = true;
      console.warn(
        "⚠️  MONGO_URI/MONGODB_URI missing or invalid. Set it in environment variables."
      );
    }
    lastDbError = "MONGO_URI/MONGODB_URI missing or invalid";
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && connectPromise) {
    return connectPromise;
  }

  if (connectPromise) {
    return connectPromise;
  }

  try {
    connectPromise = mongoose
      .connect(uri)
      .then((conn) => {
        lastDbError = "";
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn.connection;
      })
      .catch((error) => {
        lastDbError = error.message || "MongoDB connection failed";
        console.error(`Error connecting to MongoDB: ${error.message}`);
        return null;
      })
      .finally(() => {
        connectPromise = null;
      });

    return await connectPromise;
  } catch {
    lastDbError = "MongoDB connection failed";
    return null;
  }
};

connectDB.getLastError = () => lastDbError;

module.exports = connectDB;
