const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);



// server/routes/authRoutes.js
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.clearCookie('connect.sid');
    res.send('Logged out successfully');
  });
});


// server/routes/authRoutes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hash });
  await user.save();
  req.session.userId = user._id;
  res.send('Registered successfully');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).send('Invalid credentials');
  }
  req.session.userId = user._id;
  res.send('Logged in successfully');
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).send('Not logged in');
  res.send({ userId: req.session.userId });
});

// server/routes/authRoutes.js
const crypto = require('crypto');
const nodemailer = require('nodemailer');

router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).send('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const transporter = nodemailer.createTransport({ /* SMTP config */ });
  const resetLink = `http://localhost:3000/reset-password/${token}`;
  await transporter.sendMail({
    to: email,
    subject: 'Password Reset',
    text: `Click to reset: ${resetLink}`,
  });

  res.send('Reset link sent');
});
// server/routes/authRoutes.js


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
    from: 'your_twilio_number',
    to: phone,
  });

  res.send('OTP sent');
});


module.exports = router;
