// server/routes/verifyImage.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { decryptData } = require('../services/encryption');
const router = express.Router();

router.post('/verify/image', async (req, res) => {
  try {
    const { key, descriptor } = req.body || {};
    if (!key || !descriptor) {
      return res.status(400).json({ error: 'Key and descriptor required' });
    }

    // Ensure descriptor is parsed into an array
    const newDescriptor = Array.isArray(descriptor) ? descriptor : JSON.parse(descriptor);

    const users = await User.find({ faceDescriptor: { $exists: true } });

    for (const u of users) {
      let storedDescriptor;
      try {
        storedDescriptor = decryptData(u.faceDescriptor);
      } catch (err) {
        console.warn(`Failed to decrypt descriptor for user ${u._id}:`, err);
        continue;
      }

      const distance = euclideanDistance(newDescriptor, storedDescriptor);
      const threshold = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;

      if (distance < threshold) {
        const validKey = await bcrypt.compare(key, u.secretKey);
        if (validKey) {
          // Optional: log match attempt
          u.matchHistory.push({ result: 'verified', source: 'verify-image', createdAt: new Date() });
          await u.save();

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
