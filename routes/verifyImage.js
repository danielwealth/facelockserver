// server/routes/verifyImage.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { decryptData } = require('../services/encryption');
const router = express.Router();

router.post('/verify-image', async (req, res) => {
  try {
    const { key, descriptor } = req.body || {};
    if (!key || !descriptor) return res.status(400).json({ error: 'Key and descriptor required' });

    const users = await User.find({ faceDescriptor: { $exists: true } });

    for (const u of users) {
      const storedDescriptor = decryptData(u.faceDescriptor);
      const distance = euclideanDistance(descriptor, storedDescriptor);

      if (distance < 0.6) {
        const validKey = await bcrypt.compare(key, u.secretKey);
        if (validKey) {
          return res.json({ status: 'authorized', userId: u._id });
        }
      }
    }

    res.status(401).json({ status: 'unauthorized', reason: 'No match found' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to verify image' });
  }
});

function euclideanDistance(d1, d2) {
  if (!Array.isArray(d1) || !Array.isArray(d2) || d1.length !== d2.length) return Infinity;
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

module.exports = router;
