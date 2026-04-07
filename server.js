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

const app = express();
// server/app.js (or wherever you configure middleware)
const express = require('express');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { logEvent } = require('./services/audit'); // optional

const app = express();

// create limiter with defaults or override
const limiter = createRateLimiter({
  ipLimit: 100,
  ipWindowSec: 60,
  userLimit: 40,
  userWindowSec: 60,
  failureThreshold: 5,
  lockoutSec: 900
});

// attach a small wrapper to expose audit logging to req
app.use((req, res, next) => {
  req.logEvent = async (payload) => {
    try { await logEvent(payload); } catch (e) { /* ignore */ }
  };
  next();
});

// apply globally or to specific routes
app.use(limiter);

// Example: protect sensitive endpoint with extra checks
app.post('/verify-identity', limiter, async (req, res) => {
  // inside your route, on a failed verification attempt:
  // await req.rateLimiter.recordFailure('invalid_key');
});


// ✅ Trust proxy (needed for secure cookies on Render/Heroku)
app.set('trust proxy', 1);

// ✅ Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Middleware order matters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS FIRST (before routes)
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // allow cookies/sessions
}));

// ✅ Security headers
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

// ✅ Sessions with Mongo store
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // 14 days
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,
    sameSite: 'none',
  },
}));

// ✅ Static file serving with CORP header
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

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
