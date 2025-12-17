// server/routes/webauthnRoutes.js
const express = require('express');
const router = express.Router();
const { verifyAuthenticationResponse } = require('@simplewebauthn/server');

// Assume you have access to userDB with stored challenge + credential for the current user

router.post('/verify-authentication', async (req, res) => {
  try {
    const response = req.body;
    if (!response) {
      return res.status(400).json({ success: false, error: 'Missing authentication response' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: userDB.challenge,
      expectedOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      authenticator: userDB.credential,
    });

    if (verification.verified) {
      // Mark session as authenticated
      req.session.authenticated = true;
      if (req.session.user) {
        req.session.user.isWebAuthnVerified = true;
      }
      return res.json({ success: true });
    }

    return res.status(401).json({ success: false, error: 'Authentication failed' });
  } catch (err) {
    console.error('Error verifying authentication:', err);
    return res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

module.exports = router;
