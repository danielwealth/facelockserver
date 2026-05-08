// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');

// Route modules
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/imageRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const matchRoutes = require('./routes/matchRoutes');
const unlockRoutes = require('./routes/unlockImage');
const userRoutes = require('./routes/user');
const imageLockRoutes = require('./routes/imageLock');
const s3UploadRoutes = require('./routes/s3Upload');
const saveProfileImageRoutes = require('./routes/saveProfileImage');
const faceRoutes = require('./routes/faceDescriptors');

// ✅ Unified verification router
const verificationRoutes = require('./routes/verification');

const app = express();

// ✅ Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: [
        "'self'",
        "https:",
        "http://localhost:3000",
        process.env.FRONTEND_ORIGIN
      ],
    },
  },
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60,
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'none',
  },
}));

// ✅ Static file serving
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use('/unlocked', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'unlocked')));

// ✅ Routes
app.use('/auth', authRoutes);
app.use('/images', imageRoutes);
app.use('/biometric', biometricRoutes);
app.use('/match', matchRoutes);
app.use('/unlock', unlockRoutes);
app.use('/user', userRoutes);
app.use('/images', imageLockRoutes);
app.use('/s3', s3UploadRoutes);
app.use('/auth', saveProfileImageRoutes);
app.use('/verify', verificationRoutes);   // unified verification endpoints
app.use('/face', faceRoutes);

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
