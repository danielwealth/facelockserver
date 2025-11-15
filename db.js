const mongoose = require('mongoose');

const mongoURI = process.env.MONGO_URI || 'mongodb+srv://ohimaidaniel_db_user:1PKzgt1cp5iUVF4j@cluster0.1snxrtd.mongodb.net/?appName=Cluster0';

console.log("📡 Attempting to connect to MongoDB...");

mongoose.connect(mongoURI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err.message);
    // Optional: exit process if connection fails
    process.exit(1);
  });

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

module.exports = mongoose;
