
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


const app = express();

app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Behind a proxy (Render), enable trust proxy so secure cookies work
app.set('trust proxy', 1);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend origin (Netlify/Vercel/localhost) with credentials
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https:", "http://localhost:3000", process.env.FRONTEND_ORIGIN],
    },
  },
}));

// Sessions with Mongo store
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
// Serve static files from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// ✅ Routes (these match client calls like /auth/signup)
app.use('/auth', authRoutes);          // signup, login, logout
app.use('/images', imageRoutes);       // image upload/view
app.use('/biometric', biometricRoutes);// biometric unlock/settings
app.use('/match', matchRoutes);        // match history
app.use('/unlock', unlockRoutes);      // unlock images
app.use('/unlocked', express.static(path.join(__dirname, 'unlocked')));
app.use('/user', userRoutes);
app.use('/images', imageLockRoutes); // image lock/verify


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
