const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Replace with real validation (DB lookup, hashing, etc.)
  if (username === 'ohimaidaniel_db_user' && password === 'english3924') {
    req.session.authenticated = true;

    // Generate a secure random 32-byte key for AES-256
    const key = crypto.randomBytes(32).toString('hex');
    req.session.key = key;

    return res.json({ success: true, message: 'Logged in successfully' });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Failed to log out' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /auth/status
router.get('/status', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true });
  }
  res.status(403).json({ authenticated: false, error: 'Unauthorized' });
});

module.exports = router;
