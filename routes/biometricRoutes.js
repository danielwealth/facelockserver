// server/routes/webauthnRoutes.js
const express = require('express');
const router = express.Router();
const { verifyAuthenticationResponse } = require('@simplewebauthn/server');
const User = require('../models/User'); // ✅ assuming you store credentials in MongoDB

/**
 * POST /webauthn/verify-authentication
 * Verify a WebAuthn authentication response
 */
router.post('/verify-authentication', async (req, res) => {
  try {
    const response = req.body;
    if (!response) {
      return res.status(400).json({ success: false, error: 'Missing authentication response' });
    }

    // Lookup user by session or identifier
    if (!req.session?.user) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user || !user.webauthnCredential || !user.webauthnChallenge) {
      return res.status(404).json({ success: false, error: 'WebAuthn data not found for user' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.webauthnChallenge,
      expectedOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      expectedRPID: process.env.RP_ID || 'localhost',
      authenticator: user.webauthnCredential,
    });

    if (verification.verified) {
      req.session.authenticated = true;
      req.session.user.isWebAuthnVerified = true;

      // Clear challenge after successful verification
      user.webauthnChallenge = undefined;
      await user.save();

      return res.json({ success: true, message: 'WebAuthn authentication verified' });
    }

    return res.status(401).json({ success: false, error: 'Authentication failed' });
  } catch (err) {
    console.error('WebAuthn verification error:', err);
    return res.status(500).json({ success: false, error: 'Server error during authentication' });
  }
});

module.exports = router;
