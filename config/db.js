const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI || "";

  if (
    !uri ||
    uri.includes("YOUR_") ||
    (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://"))
  ) {
    console.warn(
      "⚠️  MONGO_URI missing or invalid. Set MONGO_URI in .env (e.g. mongodb://localhost:27017/devcollab or MongoDB Atlas URI). Running without DB."
    );
    return;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;