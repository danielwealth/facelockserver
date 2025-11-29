// server/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const User = require('../models/user');
const faceDescriptor= require('../models/faceDescriptor');

const router = express.Router();

// Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.send('Logged out successfully');
  });
});

// Register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hash });
  await user.save();
  req.session.userId = user._id;
  res.send('Registered successfully');
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid credentials');
  }
  req.session.userId = user._id;
  res.send('Logged in successfully');
});

// Current user
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).send('Not logged in');
  res.send({ userId: req.session.userId });
});

// Request password reset
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).send('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const transporter = nodemailer.createTransport({ /* SMTP config */ });
  const resetLink = `process.env.REACT_APP_API_URI/reset-password/${token}`;
  await transporter.sendMail({
    to: email,
    subject: 'Password Reset',
    text: `Click to reset: ${resetLink}`,
  });

  res.send('Reset link sent');
});

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).send('User not found');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = Date.now() + 300000; // 5 minutes
  await user.save();

  await client.messages.create({
    body: `Your OTP is ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER, // set in env
    to: phone,
  });

  res.send('OTP sent');
});

module.exports = router;
