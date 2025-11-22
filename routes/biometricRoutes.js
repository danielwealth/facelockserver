const express = require('express');
const router = express.Router();
const { verifyAuthenticationResponse } = require('@simplewebauthn/server'); // make sure this is imported
// Assume userDB is available in scope with challenge + credential

router.post('/verify-authentication', async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({ success: false, error: 'Missing request body' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: userDB.challenge,
      expectedOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      authenticator: userDB.credential,
    });

    if (verification.verified) {
      req.session.authenticated = true;
      return res.json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: 'Authentication failed' });
    }
  } catch (err) {
    console.error('Error verifying authentication:', err);
    return res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

module.exports = router;
