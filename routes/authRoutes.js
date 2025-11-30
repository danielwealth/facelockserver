const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// --- Session-based login/logout/status ---
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Replace with real validation (DB lookup, hashing, etc.)
  if (username === 'daniel' && password === 'secret') {
    req.session.authenticated = true;

    // Generate a secure random 32-byte encryption key per session
    req.session.key = crypto.randomBytes(32).toString('hex');

    return res.json({ success: true, message: 'Logged in successfully' });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Failed to log out' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

router.get('/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true });
  }
  res.status(403).json({ authenticated: false, error: 'Unauthorized' });
});

// --- Twilio token route ---
router.post('/twilio-token', async (req, res) => {
  try {
    // Example: generate Twilio access token
    // const token = generateTwilioToken(req.body.identity);
    // res.json({ token });

    res.json({ success: true, message: 'Twilio token endpoint placeholder' });
  } catch (err) {
    console.error('Twilio token error:', err);
    res.status(500).json({ error: 'Failed to generate Twilio token' });
  }
});

// --- Password reset route ---
router.post('/reset-password', async (req, res) => {
  try {
    const { username } = req.body;
    // Example: generate reset token, send via Twilio SMS/email
    // const resetToken = crypto.randomBytes(20).toString('hex');
    // await sendResetToken(username, resetToken);

    res.json({ success: true, message: 'Password reset endpoint placeholder' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
