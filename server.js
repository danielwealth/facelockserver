// server.js
require('dotenv').config(); // Load environment variables

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');

// Import routes
const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const matchRoutes = require('./routes/matchRoutes');
const unlockRoutes = require('./routes/unlockImage');

const app = express();

// ✅ Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS: allow frontend domain (Netlify) to talk to backend (Render)
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// ✅ Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret', // set SESSION_SECRET in .env
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // only send cookies over HTTPS in prod
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ✅ Mount routes
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);
app.use('/biometric', biometricRoutes);
app.use('/match', matchRoutes);
app.use('/unlock', unlockRoutes);

// ✅ Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
