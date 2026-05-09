 // server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');

// Route modules
const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/imageRoutes');
const matchRoutes = require('./routes/matchRoutes');
const userRoutes = require('./routes/user');
const s3UploadRoutes = require('./routes/s3Upload');
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
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// ✅ Static file serving removed

// ✅ Routes
app.use('/auth', authRoutes);
app.use('/images', imageRoutes);
app.use('/match', matchRoutes);
app.use('/user', userRoutes);
app.use('/s3', s3UploadRoutes);
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
