const express = require('express');
const router = express.Router();
router.post('/verify-authentication', async (req, res) => {
  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: userDB.challenge,
    expectedOrigin: 'process.env.API_URI',
    expectedRPID: 'process.env.FRONTEND_ORIGIN',
    authenticator: userDB.credential,
  });

  if (verification.verified) {
    req.session.authenticated = true;
  }

  res.json({ success: verification.verified });
});
module.exports = router;
