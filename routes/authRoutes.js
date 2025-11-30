const express = require('express');
const router = express.Router();

// POST /auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Replace with real user validation (DB lookup, hashing, etc.)
  if (username === 'daniel' && password === 'secret') {
    // Mark session as authenticated
    req.session.authenticated = true;

    // Generate or assign encryption key (for demo, static string)
    req.session.key = 'myEncryptionKey';

    return res.json({ success: true, message: 'Logged in successfully' });
  }

  // If credentials are wrong → 401 Unauthorized
  res.status(401).json({ error: 'Invalid credentials' });
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out' });
    }
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
