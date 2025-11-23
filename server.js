const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');   // 👈 add this

const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const matchRoutes = require('./routes/matchRoutes');
const unlockRoutes = require('./routes/unlockImage');

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// ✅ Helmet with custom CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],   // 👈 allow images
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https:"],
    },
  },
}));

// ✅ Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ✅ Routes
app.use('/auth', authRoutes);
app.use('/image', imageRoutes);
app.use('/biometric', biometricRoutes);
app.use('/match', matchRoutes);
app.use('/unlock', unlockRoutes);

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
