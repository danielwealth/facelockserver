const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

// --- Signup (user only) ---
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const newUser = new User({ email, password, role: 'user' });
    await newUser.save();

    req.session.authenticated = true;
    req.session.user = { id: newUser._id, email: newUser.email, role: newUser.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'Signed up successfully', user: newUser.email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

// --- User Login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role !== 'user') {
      return res.status(403).json({ error: 'Not authorized as user' });
    }

    req.session.authenticated = true;
    req.session.user = { id: user._id, email: user.email, role: user.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'User logged in successfully', user: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// --- Admin Login ---
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await admin.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    req.session.authenticated = true;
    req.session.user = { id: admin._id, email: admin.email, role: admin.role };
    req.session.key = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, message: 'Admin logged in successfully', user: admin.email });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Failed to log in as admin' });
  }
});

module.exports = router;
