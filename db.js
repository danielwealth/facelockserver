// server/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI not set in environment variables');
    }

    console.log("📡 Attempting to connect to MongoDB...");

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);

    // Extra logging for connection events
    mongoose.connection.on('connected', () => {
      console.log("🔗 Mongoose connection is open");
    });

    mongoose.connection.on('error', (err) => {
      console.error("⚠️ Mongoose connection error:", err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log("🔌 Mongoose connection disconnected");
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log("🛑 Mongoose connection closed due to app termination");
      process.exit(0);
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
