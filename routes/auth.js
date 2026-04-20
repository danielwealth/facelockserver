// routes/auth.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const User = require('../models/User');

// Configure S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Utility: create session
function createSession(req, user) {
  req.session.authenticated = true;
  req.session.user = { id: user._id, email: user.email, role: user.role };
  req.session.key = crypto.randomBytes(32).toString('hex');
}

// --- Signup ---
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const newUser = new User({ email, password, role: 'user' });
    await newUser.save();

    createSession(req, newUser);
    res.json({ success: true, message: 'Signed up successfully', user: newUser.email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// --- Login (User/Admin) ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    createSession(req, user);
    res.json({ success: true, message: `${user.role} logged in successfully`, user: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// --- Logout ---
// --- Logout ---
router.post('/logout', (req, res) => {
  if (!req.session) return res.json({ success: true, message: 'No active session' });

  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      // best-effort: clear cookie if present
      try {
        res.clearCookie?.('connect.sid');
      } catch (e) { /* ignore */ }
      return res.status(500).json({ success: false, error: 'Failed to destroy session' });
    }

    // Optionally clear cookie and respond
    try {
      res.clearCookie?.('connect.sid');
    } catch (e) { /* ignore */ }

    return res.json({ success: true, message: 'Logged out' });
  });
});

module.exports = router;
