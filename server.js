// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const matchRoutes = require('./routes/matchRoutes');
const unlockRoutes = require('./routes/unlockImage');

const path = require('path');


const app = express();


// Behind a proxy (Render), enable trust proxy so secure cookies work
app.set('trust proxy', 1);

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
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
      connectSrc: ["'self'", "https:"],
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
    // Set domain if you need cross-subdomain cookies
    // domain: '.yourdomain.com'
  },
}));

// Routes
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);
app.use('/biometric', biometricRoutes);
app.use('/match', matchRoutes);
app.use('/unlock', unlockRoutes);
app.use('/unlocked', express.static(path.join(__dirname, 'unlocked')));
app.use('/images', require('./routes/imageRoutes'));



// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
