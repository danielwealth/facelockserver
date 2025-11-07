router.post('/verify-authentication', async (req, res) => {
  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: userDB.challenge,
    expectedOrigin: 'http://localhost:3000',
    expectedRPID: 'localhost',
    authenticator: userDB.credential,
  });

  if (verification.verified) {
    req.session.authenticated = true;
  }

  res.json({ success: verification.verified });
});
module.exports = router;
